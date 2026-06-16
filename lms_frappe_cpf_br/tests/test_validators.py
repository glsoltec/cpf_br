"""
Testes unitários para validação de CPF, segurança de API e hooks de sincronização.
Executa com: python -m unittest lms_frappe_cpf_br.tests.test_validators
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

# ─── Mock do Frappe Framework para execução standalone ──────────────────────
try:
	import frappe
except ImportError:
	# Define exceções customizadas do Frappe
	class ValidationError(Exception):
		pass

	class PermissionError(Exception):
		pass

	frappe = MagicMock()
	frappe.ValidationError = ValidationError
	frappe.PermissionError = PermissionError
	
	def mock_throw(msg, title=None, *args, **kwargs):
		raise ValidationError(msg)
		
	frappe.throw = MagicMock(side_effect=mock_throw)
	frappe._ = lambda x, *args, **kwargs: x
	frappe.session = MagicMock(user="student@example.com")
	frappe.get_roles = MagicMock(return_value=["Student"])

	# Mock decorator whitelist
	def whitelist(*args, **kwargs):
		def decorator(fn):
			return fn
		return decorator
	frappe.whitelist = whitelist

	sys.modules["frappe"] = frappe

# Mock do app lms para evitar import errors
try:
	import lms
except ImportError:
	lms = MagicMock()
	sys.modules["lms"] = lms
	sys.modules["lms.lms"] = lms.lms
	sys.modules["lms.lms.api"] = lms.lms.api

# Agora podemos importar os módulos sob teste com segurança
from lms_frappe_cpf_br.validators import (
	_cpf_valido,
	_formatar_cpf,
	validate_cpf_user,
	validate_cpf_lms,
	sync_cpf_enrollment_to_user,
)


class TestCPFValidation(unittest.TestCase):
	"""Testes de validação de CPF."""

	def test_cpf_valido_with_formatting(self):
		"""Valida CPF com máscara: 123.456.789-09"""
		self.assertTrue(_cpf_valido("111.444.777-35"))

	def test_cpf_valido_without_formatting(self):
		"""Valida CPF sem máscara: 12345678909"""
		self.assertTrue(_cpf_valido("11144477735"))

	def test_cpf_invalido_sequence(self):
		"""Rejeita sequências inválidas: 111.111.111-11"""
		self.assertFalse(_cpf_valido("11111111111"))
		self.assertFalse(_cpf_valido("111.111.111-11"))
		self.assertFalse(_cpf_valido("22222222222"))
		self.assertFalse(_cpf_valido("00000000000"))

	def test_cpf_invalido_length(self):
		"""Rejeita CPF com tamanho inválido"""
		self.assertFalse(_cpf_valido("123"))
		self.assertFalse(_cpf_valido("12345678"))
		self.assertFalse(_cpf_valido("123456789012"))
		self.assertFalse(_cpf_valido(""))

	def test_cpf_invalido_wrong_digit_1(self):
		"""Rejeita CPF com primeiro dígito verificador incorreto"""
		self.assertFalse(_cpf_valido("11144477736"))

	def test_cpf_invalido_wrong_digit_2(self):
		"""Rejeita CPF com segundo dígito verificador incorreto"""
		self.assertFalse(_cpf_valido("11144477734"))

	def test_cpf_with_special_chars(self):
		"""Valida CPF com caracteres especiais"""
		self.assertTrue(_cpf_valido("111-444-777-35"))
		self.assertTrue(_cpf_valido("111 444 777 35"))

	def test_cpf_formato_valid(self):
		"""Formata CPF válido para 123.456.789-09"""
		self.assertEqual(_formatar_cpf("11144477735"), "111.444.777-35")
		self.assertEqual(_formatar_cpf("111.444.777-35"), "111.444.777-35")

	def test_cpf_formato_short(self):
		"""Formata CPF incompleto"""
		self.assertEqual(_formatar_cpf("123"), "123")

	def test_cpf_formatar_None(self):
		"""Trata None/vazio gracefully"""
		self.assertEqual(_formatar_cpf(""), "")
		self.assertEqual(_formatar_cpf(None), "")


class TestCPFEdgeCases(unittest.TestCase):
	"""Testes de casos extremos e edge cases."""

	def test_cpf_leading_zeros(self):
		"""CPF com zeros à esquerda inválido se não passa no dígito"""
		self.assertFalse(_cpf_valido("00000000100"))

	def test_cpf_performance(self):
		"""Validação é rápida (< 100ms para 10k)"""
		import time
		start = time.time()
		for _ in range(10000):
			_cpf_valido("11144477735")
		elapsed = (time.time() - start) * 1000
		self.assertLess(elapsed, 100)


class TestValidatorsIntegration(unittest.TestCase):
	"""Testes integrados dos hooks de validação e sincronização."""

	def setUp(self):
		# Reseta mocks
		frappe.db.get_value.reset_mock()
		frappe.db.set_value.reset_mock()
		
		# Garante que frappe.throw levanta ValidationError por padrão
		def mock_throw(msg, title=None, *args, **kwargs):
			raise ValidationError(msg)
		frappe.throw.side_effect = mock_throw

	def test_validate_cpf_user_valid(self):
		"""validate_cpf_user deve formatar CPF válido e salvar."""
		doc = MagicMock()
		doc.get.return_value = "11144477735"
		validate_cpf_user(doc)
		self.assertEqual(doc.cpf_br, "111.444.777-35")

	def test_validate_cpf_user_invalid(self):
		"""validate_cpf_user deve lançar exceção se CPF for inválido."""
		doc = MagicMock()
		doc.get.return_value = "111.111.111-11"
		with self.assertRaises(frappe.ValidationError):
			validate_cpf_user(doc)

	def test_validate_cpf_lms_syncs_from_user_if_empty(self):
		"""validate_cpf_lms deve buscar CPF do User se estiver vazio."""
		doc = MagicMock()
		doc.get.return_value = ""
		doc.member = "student@example.com"
		frappe.db.get_value.return_value = "111.444.777-35"

		validate_cpf_lms(doc)

		frappe.db.get_value.assert_called_once_with("User", "student@example.com", "cpf_br")
		self.assertEqual(doc.cpf_br, "111.444.777-35")

	def test_sync_cpf_enrollment_to_user_updates_db(self):
		"""sync_cpf_enrollment_to_user deve salvar CPF no User se for diferente."""
		doc = MagicMock()
		doc.member = "student@example.com"
		doc.cpf_br = "111.444.777-35"
		# CPF atual no User é diferente
		frappe.db.get_value.return_value = "222.222.222-22"

		sync_cpf_enrollment_to_user(doc)

		frappe.db.get_value.assert_called_once_with("User", "student@example.com", "cpf_br")
		frappe.db.set_value.assert_called_once_with("User", "student@example.com", "cpf_br", "111.444.777-35")

	def test_sync_cpf_enrollment_to_user_noop_if_equal(self):
		"""sync_cpf_enrollment_to_user não deve atualizar db se já estiver igual."""
		doc = MagicMock()
		doc.member = "student@example.com"
		doc.cpf_br = "111.444.777-35"
		frappe.db.get_value.return_value = "111.444.777-35"

		sync_cpf_enrollment_to_user(doc)

		frappe.db.set_value.assert_not_called()


class TestSecurityAPI(unittest.TestCase):
	"""Testes de segurança da API (lms_api.py)."""

	def setUp(self):
		# Importa aqui pois mock do frappe já está ativo
		global lms_api
		import lms_frappe_cpf_br.lms_api as lms_api
		frappe.session.user = "student@example.com"
		frappe.get_roles.return_value = ["Student"]
		frappe.db.get_value.reset_mock()
		
		# Define uma exceção de permissão real simulada para mock de update_profile
		def mock_throw_perm(msg, title=None, *args, **kwargs):
			raise PermissionError(msg)
		frappe.throw.side_effect = mock_throw_perm

	@patch("lms.lms.api.get_profile_details")
	def test_get_profile_details_own_profile(self, mock_original):
		"""Permite visualizar CPF se for o próprio perfil."""
		mock_original.return_value = {"username": "student_user", "name": "Student Profile"}
		
		# Simula que o user com username "student_user" tem email "student@example.com" (o usuário logado)
		frappe.db.get_value.return_value = {
			"name": "student@example.com",
			"cpf_br": "111.444.777-35"
		}

		res = lms_api.get_profile_details("student_user")

		self.assertEqual(res["cpf_br"], "111.444.777-35")
		frappe.db.get_value.assert_called_once_with(
			"User",
			{"username": "student_user"},
			["name", "cpf_br"],
			as_dict=True
		)

	@patch("lms.lms.api.get_profile_details")
	def test_get_profile_details_other_profile_student(self, mock_original):
		"""Bloqueia CPF (retorna vazio) se for outro usuário e perfil de estudante comum."""
		mock_original.return_value = {"username": "other_user", "name": "Other Profile"}
		
		# Simula outro usuário
		frappe.db.get_value.return_value = {
			"name": "other@example.com",
			"cpf_br": "111.444.777-35"
		}

		res = lms_api.get_profile_details("other_user")

		# CPF deve ser retornado vazio por motivos de privacidade/LGPD
		self.assertEqual(res["cpf_br"], "")

	@patch("lms.lms.api.get_profile_details")
	def test_get_profile_details_other_profile_admin(self, mock_original):
		"""Permite visualizar CPF de outro perfil se o solicitante for System Manager."""
		mock_original.return_value = {"username": "other_user", "name": "Other Profile"}
		frappe.session.user = "admin@example.com"
		frappe.get_roles.return_value = ["System Manager", "Student"]
		
		frappe.db.get_value.return_value = {
			"name": "other@example.com",
			"cpf_br": "111.444.777-35"
		}

		res = lms_api.get_profile_details("other_user")

		self.assertEqual(res["cpf_br"], "111.444.777-35")

	@patch("lms.lms.api.update_profile")
	def test_update_profile_other_user_raises_permission_error(self, mock_original):
		"""update_profile deve lançar erro se tentar alterar outro usuário."""
		with self.assertRaises(PermissionError):
			lms_api.update_profile(user="other@example.com", cpf_br="11144477735")


if __name__ == "__main__":
	unittest.main()
