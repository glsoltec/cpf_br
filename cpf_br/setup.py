"""
Funções executadas após instalação e migração do app cpf_br.

Garante que os Custom Fields existam independentemente dos fixtures.
O campo LMS Course Enrollment só é criado se o DocType existir no banco
(o app lms pode não estar instalado ou pode não ter sincronizado ainda).

Também injeta o script de CPF diretamente no template _lms.html do LMS,
pois esse template não estende base.html e portanto o hook web_include_js
do Frappe não funciona para páginas do LMS SPA (Vue 3 + Vite).
"""

import os

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


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
    "LMS Course Enrollment": [
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
_CPF_SCRIPT  = '<script src="/assets/cpf_br/js/lms_profile_cpf.js"></script>'


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
    - Campo LMS Course Enrollment.cpf_br → só criado se o DocType existir
      no banco. Evita LinkValidationError quando o app lms ainda não
      sincronizou seus DocTypes (ex.: primeira instalação em site vazio).
    """
    # 1. Campo no User (sempre disponível)
    create_custom_fields(CAMPO_USER, ignore_validate=True)
    frappe.db.commit()
    print("cpf_br: Custom Field User.cpf_br verificado/criado.")

    # 2. Campo no LMS — só se o DocType existir
    if frappe.db.exists("DocType", "LMS Course Enrollment"):
        create_custom_fields(CAMPO_LMS, ignore_validate=True)
        frappe.db.commit()
        print("cpf_br: Custom Field LMS Course Enrollment.cpf_br verificado/criado.")
    else:
        print(
            "cpf_br: DocType 'LMS Course Enrollment' não encontrado — "
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

    with open(template_path, "r", encoding="utf-8") as fh:
        content = fh.read()

    if _CPF_MARKER in content:
        print("cpf_br: Script CPF já presente em _lms.html — nenhuma alteração.")
        return

    # Injeta antes de </body>; se não houver </body> injeta no final
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

    print("cpf_br: ✅ Script CPF injetado com sucesso em _lms.html.")
