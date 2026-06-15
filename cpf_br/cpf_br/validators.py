"""
Validadores de CPF para hooks doc_events.
Chamado em User.validate e LMS Enrollment.validate.
"""

import re
import frappe
from frappe import _


def _cpf_valido(cpf: str) -> bool:
	"""
	Valida CPF usando algoritmo oficial.
	Aceita formatos: '123.456.789-09' ou '12345678909'.
	Retorna False para sequências inválidas (ex.: 111.111.111-11).

	[IMP-4 FIX] Deixa explícito o cálculo d >= 10 ? 0 : d para clareza.
	"""
	cpf = re.sub(r"\D", "", cpf or "")

	if len(cpf) != 11 or len(set(cpf)) == 1:
		return False

	# Primeiro dígito verificador
	soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
	d1 = (soma * 10) % 11
	d1 = 0 if d1 >= 10 else d1  # [IMP-4] Deixa explícito
	if d1 != int(cpf[9]):
		return False

	# Segundo dígito verificador
	soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
	d2 = (soma * 10) % 11
	d2 = 0 if d2 >= 10 else d2  # [IMP-4] Deixa explícito
	if d2 != int(cpf[10]):
		return False

	return True


def _formatar_cpf(cpf: str) -> str:
    """Retorna CPF no formato '123.456.789-09'."""
    cpf = re.sub(r"\D", "", cpf)
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"


def validate_cpf_user(doc, method=None):
    """Hook: User.validate"""
    cpf = (doc.get("cpf_br") or "").strip()
    if not cpf:
        return  # Campo opcional — não bloqueia save se vazio

    if not _cpf_valido(cpf):
        frappe.throw(_("CPF inválido: {0}").format(cpf), title=_("Validação de CPF"))

    # Normaliza o formato antes de salvar
    doc.cpf_br = _formatar_cpf(cpf)


def validate_cpf_lms(doc, method=None):
    """Hook: LMS Enrollment.validate"""
    # Obtém CPF do usuário vinculado se não preenchido na matrícula
    cpf = (doc.get("cpf_br") or "").strip()

    if not cpf:
        # Tenta buscar do perfil User
        user_cpf = frappe.db.get_value("User", doc.member, "cpf_br")
        if user_cpf:
            doc.cpf_br = user_cpf
        return

    if not _cpf_valido(cpf):
        frappe.throw(_("CPF inválido: {0}").format(cpf), title=_("Validação de CPF"))

    formatted_cpf = _formatar_cpf(cpf)
    doc.cpf_br = formatted_cpf

    # [SYNC FIX] Aviso se CPF diferente do User
    if doc.member:
        user_cpf = frappe.db.get_value("User", doc.member, "cpf_br")
        if user_cpf and user_cpf != formatted_cpf:
            frappe.logger().info(
                f"[cpf_br] CPF alterado em LMS Enrollment: {doc.name}\n"
                f"  User: {doc.member}\n"
                f"  CPF anterior (User): {user_cpf}\n"
                f"  CPF novo (Enrollment): {formatted_cpf}"
            )
            frappe.msgprint(
                _("⚠️ CPF diferente do usuário.<br>CPF do usuário: <strong>{0}</strong><br>CPF da matrícula: <strong>{1}</strong><br><br>Será sincronizado ao salvar.").format(user_cpf, formatted_cpf),
                title=_("CPF Alterado"),
                indicator="yellow"
            )
