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
def update_profile(*args, **kwargs):
	"""
	Estende lms.lms.api.update_profile salvando também o campo cpf_br
	no DocType User do usuário logado.

	[CRIT-2 FIX] Salva CPF ANTES de chamar LMS original. Se LMS falhar,
	pelo menos o CPF foi persistido. Validação de CPF feita ANTES de qualquer
	operação para fail-fast.
	"""
	from lms.lms.api import update_profile as _original

	# Extrai o cpf_br se enviado no payload
	cpf_br = kwargs.pop("cpf_br", None)

	if cpf_br is not None:
		cpf = cpf_br.strip() if isinstance(cpf_br, str) else ""

		frappe.logger().info(
			f"[cpf_br] update_profile recebido: cpf_br='{cpf}', user={frappe.session.user}"
		)

		if cpf:
			if not _cpf_valido(cpf):
				frappe.throw(
					_("CPF inválido: {0}").format(cpf),
					title=_("Validação de CPF"),
				)
			cpf = _formatar_cpf(cpf)

		# Salva no User do usuário logado
		user_doc = frappe.get_doc("User", frappe.session.user)
		user_doc.cpf_br = cpf
		user_doc.save(ignore_permissions=False)

		frappe.logger().info(
			f"[cpf_br] ✅ CPF salvo com sucesso: {cpf} para user={frappe.session.user}"
		)

	# Sempre executa a lógica original do LMS para salvar os outros campos do perfil
	try:
		res = _original(*args, **kwargs)
		# Se cpf_br foi manipulado, retorna resposta estendida
		if cpf_br is not None:
			if isinstance(res, dict):
				res["cpf_br"] = cpf
			elif res is None:
				res = {"status": "ok", "cpf_br": cpf}
		return res
	except Exception as e:
		frappe.log_error(
			title="[cpf_br] LMS update_profile falhou",
			message=f"CPF pode ter sido salvo, mas LMS profile falhou: {str(e)}"
		)
		raise
