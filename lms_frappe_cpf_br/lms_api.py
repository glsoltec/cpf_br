"""
Overrides das APIs do LMS para incluir o campo CPF no perfil web.

Registrado em hooks.py via override_whitelisted_methods.

⚠️ COMPATIBILITY NOTE:
Este módulo estende APIs do app frappe-lms (lms.lms.api).
Foi testado com frappe-lms v16.0.0 e compatível com Frappe v16.0+.

Se há mudanças na assinatura das funções originais em versões futuras,
este código deve ser revisado para manter compatibilidade.
Veja: https://github.com/frappe/frappe-lms/blob/develop/lms/lms/api.py
"""

from typing import Any, Dict, Optional
import frappe
from frappe import _
from lms_frappe_cpf_br.validators import _cpf_valido, _formatar_cpf


@frappe.whitelist()
def get_profile_details(username: str) -> Dict[str, Any]:
	"""
	Estende lms.lms.api.get_profile_details adicionando o campo cpf_br.

	Override Rationale:
	  - Frappe LMS API não suporta CPF nativamente
	  - Necessário estender para incluir CPF no profile web
	  - Chamado quando usuário carrega /lms/profile

	Signature Compatibility:
	  - Original: get_profile_details(username: str) -> dict
	  - Override: get_profile_details(username: str) -> dict
	  ✅ Assinatura compatível (mesmo tipo de entrada/saída)

	Args:
		username (str): Email do usuário (ex: 'student@example.com')

	Returns:
		Dict[str, Any]: Profile dict do LMS + campo cpf_br adicional

	Raises:
		frappe.PermissionError: Se username != frappe.session.user
		frappe.NotFoundError: Se usuário não existe
	"""
	from lms.lms.api import get_profile_details as _original

	# Chamada à função original do LMS
	profile = _original(username)

	# Injeta o CPF do DocType User no retorno
	user_cpf: Optional[str] = frappe.db.get_value(
		"User",
		{"username": username},
		"cpf_br",
	)
	profile["cpf_br"] = user_cpf or ""

	return profile


@frappe.whitelist()
def update_profile(*args: Any, **kwargs: Any) -> Dict[str, Any]:
	"""
	Estende lms.lms.api.update_profile salvando também o campo cpf_br
	no DocType User do usuário logado.

	Override Rationale:
	  - Frappe LMS API não persiste CPF nativamente
	  - Necessário estender para salvar CPF no User
	  - Chamado quando usuário edita perfil em /lms/profile

	Signature Compatibility:
	  - Original: update_profile(*args, **kwargs) -> Optional[dict]
	  - Override: update_profile(*args, **kwargs) -> Dict[str, Any]
	  ✅ Assinatura compatível (aceita qualquer argumento, retorna dict)

	Implementation Details:
	  [CRIT-2 FIX] Salva CPF ANTES de chamar LMS original.
	  Se LMS falhar, pelo menos o CPF foi persistido (fail-fast pattern).
	  Validação de CPF feita ANTES de qualquer operação para fail-fast.

	  [SECURITY] Sempre usa o usuário logado — nunca permite alterar
	  CPF de outro usuário. Validação de permissão em defense-in-depth.

	Args:
		*args: Argumentos passados para lms.lms.api.update_profile
		**kwargs: Keyword arguments, pode incluir cpf_br

	Returns:
		Dict[str, Any]: Response dict com status + cpf_br se fornecido

	Raises:
		frappe.ValidationError: Se CPF é inválido
		frappe.PermissionError: Se tentando alterar outro usuário
	"""
	from lms.lms.api import update_profile as _original

	# SEGURANÇA: Validação de permissão (defense-in-depth)
	# Sempre opera no usuário logado, nunca em outro
	current_user: str = frappe.session.user
	if kwargs.get("user") and kwargs["user"] != current_user:
		frappe.throw(
			_("Você só pode alterar seu próprio perfil."),
			title=_("Permissão Negada"),
		)

	# Extrai o cpf_br se enviado no payload
	cpf_br: Optional[str] = kwargs.pop("cpf_br", None)

	if cpf_br is not None:
		cpf: str = cpf_br.strip() if isinstance(cpf_br, str) else ""

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
		res: Any = _original(*args, **kwargs)
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
