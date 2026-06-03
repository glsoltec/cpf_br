"""
Overrides das APIs do LMS para incluir o campo CPF no perfil web.
Registrado em hooks.py via override_whitelisted_methods.
"""

import frappe
from frappe import _
from cpf_br.cpf_br.validators import _cpf_valido, _formatar_cpf


@frappe.whitelist()
def get_profile_details(username):
    """
    Estende lms.lms.api.get_profile_details adicionando o campo cpf_br
    ao retorno, para que o modal Edit Profile possa exibi-lo.
    """
    from lms.lms.api import get_profile_details as _original

    profile = _original(username)

    # Injeta o CPF do DocType User no retorno
    user_cpf = frappe.db.get_value(
        "User",
        {"username": username},
        "cpf_br",
    )
    profile["cpf_br"] = user_cpf or ""

    return profile


@frappe.whitelist()
def update_profile(
    first_name=None,
    last_name=None,
    username=None,
    headline=None,
    bio=None,
    location=None,
    image=None,
    linkedin=None,
    github=None,
    twitter=None,
    open_to=None,
    cpf_br=None,
):
    """
    Estende lms.lms.api.update_profile salvando também o campo cpf_br
    no DocType User do usuário logado.
    """
    from lms.lms.api import update_profile as _original

    # Repassa todos os campos originais ao LMS
    _original(
        first_name=first_name,
        last_name=last_name,
        username=username,
        headline=headline,
        bio=bio,
        location=location,
        image=image,
        linkedin=linkedin,
        github=github,
        twitter=twitter,
        open_to=open_to,
    )

    # Processa e salva o CPF separadamente
    if cpf_br is not None:
        cpf = cpf_br.strip()

        if cpf:
            if not _cpf_valido(cpf):
                frappe.throw(
                    _("CPF inválido: {0}").format(cpf),
                    title=_("Validação de CPF"),
                )
            cpf = _formatar_cpf(cpf)

        frappe.db.set_value("User", frappe.session.user, "cpf_br", cpf)
        frappe.db.commit()
