"""
Funções executadas após instalação e migração do app cpf_br.

Garante que os Custom Fields existam independentemente dos fixtures.
O campo LMS Enrollment só é criado se o DocType existir no banco
(o app lms pode não estar instalado ou pode não ter sincronizado ainda).

Também injeta o script de CPF diretamente no template _lms.html do LMS,
pois esse template não estende base.html e portanto o hook web_include_js
do Frappe não funciona para páginas do LMS SPA (Vue 3 + Vite).

CRIT-1 FIX: File locking implementado para evitar race condition em bench migrate paralelo
"""

import os
import sys
import time

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# File locking: usar portalocker se disponível (cross-platform), senão fcntl (Unix)
try:
	import portalocker
	HAS_PORTALOCKER = True
except ImportError:
	HAS_PORTALOCKER = False
	try:
		import fcntl
		HAS_FCNTL = True
	except ImportError:
		HAS_FCNTL = False


# ─── Definição dos campos ─────────────────────────────────────────────────────

CAMPO_USER = {
    "User": [
        {
            "fieldname": "cpf_br",
            "fieldtype": "Data",
            "label": "CPF",
            "insert_after": "full_name",
            "description": "Cadastro de Pessoa Física — formato: 123.456.789-09",
            "placeholder": "000.000.000-00",
            "unique": 1,
            "in_list_view": 0,
            "in_standard_filter": 1,
            "search_index": 1,
            "allow_in_quick_entry": 1,
            "translatable": 0,
            "permlevel": 0,
        }
    ]
}

CAMPO_LMS = {
    "LMS Enrollment": [
        {
            "fieldname": "cpf_br",
            "fieldtype": "Data",
            "label": "CPF",
            "insert_after": "member_name",
            "description": "Preenchido automaticamente a partir do perfil do usuário",
            "placeholder": "000.000.000-00",
            "read_only": 0,
            "in_list_view": 1,
            "in_standard_filter": 1,
            "translatable": 0,
            "permlevel": 0,
        }
    ]
}

# Marcador único que garante idempotência (não injeta duas vezes)
_CPF_MARKER = "<!-- cpf_br:lms_profile_cpf -->"
_CPF_SCRIPT  = '''<script src="/assets/cpf_br/js/cpf_utils.js"></script>
<script src="/assets/cpf_br/js/lms_profile_cpf.js"></script>'''


# ─── Hooks ────────────────────────────────────────────────────────────────────

def after_install():
    """Executado uma vez na instalação do app."""
    _criar_campos()
    _injetar_script_lms()


def after_migrate():
    """Executado a cada `bench migrate` — garante persistência após updates."""
    _criar_campos()
    _injetar_script_lms()


# ─── Lógica interna ───────────────────────────────────────────────────────────

def _criar_campos():
    """
    Cria os Custom Fields de CPF.

    - Campo User.cpf_br → sempre criado (DocType nativo do Frappe).
    - Campo LMS Enrollment.cpf_br → só criado se o DocType existir
      no banco. Evita LinkValidationError quando o app lms ainda não
      sincronizou seus DocTypes (ex.: primeira instalação em site vazio).
    """
    # 1. Campo no User (sempre disponível)
    create_custom_fields(CAMPO_USER, ignore_validate=True)
    frappe.db.commit()
    print("cpf_br: Custom Field User.cpf_br verificado/criado.")

    # 2. Campo no LMS — só se o DocType existir
    if frappe.db.exists("DocType", "LMS Enrollment"):
        create_custom_fields(CAMPO_LMS, ignore_validate=True)
        frappe.db.commit()
        print("cpf_br: Custom Field LMS Enrollment.cpf_br verificado/criado.")
    else:
        print(
            "cpf_br: DocType 'LMS Enrollment' não encontrado — "
            "campo será criado no próximo `bench migrate` após instalar o app lms."
        )


def _injetar_script_lms():
	"""
	Injeta o script de CPF diretamente no template _lms.html do app lms.

	O template _lms.html é gerado pelo Vite (frontend/index.html) e NÃO
	estende base.html do Frappe — portanto o hook web_include_js não é
	processado para páginas do LMS SPA. A injeção direta no template é a
	única forma confiável de carregar scripts customizados nesse contexto.

	A injeção é idempotente: o marcador _CPF_MARKER evita duplicatas.
	O template pode ser regenerado por `bench build --app lms`; nesse caso,
	basta rodar `bench migrate` novamente para re-injetar.

	[CRIT-1 FIX] Implementa file locking para evitar race condition em
	múltiplos workers executando bench migrate simultaneamente.
	"""
	try:
		lms_www = frappe.get_app_path("lms", "www")
	except Exception:
		print("cpf_br: app 'lms' não encontrado — injeção no _lms.html ignorada.")
		return

	template_path = os.path.join(lms_www, "_lms.html")

	if not os.path.exists(template_path):
		print(
			"cpf_br: _lms.html não encontrado em %s — execute "
			"`bench build --app lms` primeiro, depois `bench migrate`." % template_path
		)
		return

	lock_path = template_path + ".cpf_br.lock"

	# ─── Acquire lock ───────────────────────────────────────────────────────
	if HAS_PORTALOCKER:
		_injetar_com_portalocker(template_path, lock_path)
	elif HAS_FCNTL:
		_injetar_com_fcntl(template_path, lock_path)
	else:
		# Fallback: sem lock (risco de race condition em produção)
		print("cpf_br: ⚠️ Aviso: portalocker/fcntl não disponível. "
			  "Usando fallback sem lock (risco em bench migrate paralelo).")
		_injetar_direto(template_path)


def _injetar_com_portalocker(template_path, lock_path):
	"""
	[CRIT-1 FIX] Injeta com portalocker (cross-platform, Windows + Unix).
	"""
	import portalocker

	try:
		with portalocker.Lock(lock_path, mode="w", timeout=5) as lock_fh:
			# Relê dentro do lock (outro processo pode ter modificado)
			with open(template_path, "r", encoding="utf-8") as fh:
				content = fh.read()

			if _CPF_MARKER in content:
				print("cpf_br: Script CPF já presente em _lms.html — nenhuma alteração.")
				return

			# Injeta antes de </body>
			if "</body>" in content:
				content = content.replace(
					"</body>",
					"\n%s\n%s\n</body>" % (_CPF_MARKER, _CPF_SCRIPT),
					1,
				)
			else:
				content = content + "\n%s\n%s\n" % (_CPF_MARKER, _CPF_SCRIPT)

			with open(template_path, "w", encoding="utf-8") as fh:
				fh.write(content)

			print("cpf_br: ✅ Script CPF injetado com sucesso em _lms.html (portalocker).")
	except portalocker.LockException:
		frappe.log_error(
			title="cpf_br lock timeout",
			message=f"Não conseguiu adquirir lock em {lock_path} após 5s. "
					"Outro processo pode estar modificando _lms.html."
		)
		print("cpf_br: ❌ Lock timeout — outra instância pode estar injetando. Abortando.")


def _injetar_com_fcntl(template_path, lock_path):
	"""
	[CRIT-1 FIX] Injeta com fcntl (Unix/Linux only).
	"""
	try:
		lock_fh = open(lock_path, "w")
		fcntl.flock(lock_fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)  # Non-blocking
	except (IOError, BlockingIOError):
		# Lock em uso por outro processo — espera
		print("cpf_br: Lock em uso, aguardando...")
		lock_fh = open(lock_path, "w")
		fcntl.flock(lock_fh.fileno(), fcntl.LOCK_EX)  # Blocking

	try:
		# Relê dentro do lock
		with open(template_path, "r", encoding="utf-8") as fh:
			content = fh.read()

		if _CPF_MARKER in content:
			print("cpf_br: Script CPF já presente em _lms.html — nenhuma alteração.")
			return

		if "</body>" in content:
			content = content.replace(
				"</body>",
				"\n%s\n%s\n</body>" % (_CPF_MARKER, _CPF_SCRIPT),
				1,
			)
		else:
			content = content + "\n%s\n%s\n" % (_CPF_MARKER, _CPF_SCRIPT)

		with open(template_path, "w", encoding="utf-8") as fh:
			fh.write(content)

		print("cpf_br: ✅ Script CPF injetado com sucesso em _lms.html (fcntl).")
	finally:
		fcntl.flock(lock_fh.fileno(), fcntl.LOCK_UN)
		lock_fh.close()
		try:
			os.unlink(lock_path)
		except OSError:
			pass


def _injetar_direto(template_path):
	"""
	Injeta sem lock (fallback se portalocker/fcntl não estão disponíveis).
	⚠️ Risco de race condition em bench migrate paralelo.
	"""
	with open(template_path, "r", encoding="utf-8") as fh:
		content = fh.read()

	if _CPF_MARKER in content:
		print("cpf_br: Script CPF já presente em _lms.html — nenhuma alteração.")
		return

	if "</body>" in content:
		content = content.replace(
			"</body>",
			"\n%s\n%s\n</body>" % (_CPF_MARKER, _CPF_SCRIPT),
			1,
		)
	else:
		content = content + "\n%s\n%s\n" % (_CPF_MARKER, _CPF_SCRIPT)

	with open(template_path, "w", encoding="utf-8") as fh:
		fh.write(content)
