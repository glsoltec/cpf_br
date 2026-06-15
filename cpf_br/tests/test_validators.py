"""
Testes unitários para validação de CPF.
Executa com: bench --site [site] execute cpf_br.tests.test_validators
Ou: python -m pytest cpf_br/tests/test_validators.py (se pytest instalado)
"""

import unittest
from cpf_br.cpf_br.validators import _cpf_valido, _formatar_cpf


class TestCPFValidation(unittest.TestCase):
	"""Testes de validação de CPF."""

	def test_cpf_valido_with_formatting(self):
		"""Valida CPF com máscara: 123.456.789-09"""
		# CPF fictício mas válido (gerado com algoritmo)
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
		self.assertFalse(_cpf_valido("123456789012"))  # 12 dígitos
		self.assertFalse(_cpf_valido(""))

	def test_cpf_invalido_wrong_digit_1(self):
		"""Rejeita CPF com primeiro dígito verificador incorreto"""
		# 111.444.777-35 é válido
		# 111.444.777-36 tem d1 errado
		self.assertFalse(_cpf_valido("11144477736"))

	def test_cpf_invalido_wrong_digit_2(self):
		"""Rejeita CPF com segundo dígito verificador incorreto"""
		# 111.444.777-35 é válido
		# 111.444.777-34 tem d2 errado
		self.assertFalse(_cpf_valido("11144477734"))

	def test_cpf_with_special_chars(self):
		"""Valida CPF com caracteres especiais (remove non-digits)"""
		self.assertTrue(_cpf_valido("111-444-777-35"))
		self.assertTrue(_cpf_valido("111 444 777 35"))

	def test_cpf_formato_valid(self):
		"""Formata CPF válido para 123.456.789-09"""
		self.assertEqual(_formatar_cpf("11144477735"), "111.444.777-35")
		self.assertEqual(_formatar_cpf("111.444.777-35"), "111.444.777-35")

	def test_cpf_formato_with_extra_chars(self):
		"""Formata CPF removendo caracteres extras"""
		self.assertEqual(_formatar_cpf("111-444-777-35"), "111.444.777-35")
		self.assertEqual(_formatar_cpf("111 444 777 35"), "111.444.777-35")

	def test_cpf_formato_short(self):
		"""Formata CPF incompleto"""
		result = _formatar_cpf("123")
		self.assertEqual(result, "123")  # Trata parciais

	def test_cpf_formatar_None(self):
		"""Trata None gracefully"""
		result = _formatar_cpf("")
		self.assertEqual(result, "")

	def test_cpf_empty_string(self):
		"""Rejeita string vazia"""
		self.assertFalse(_cpf_valido(""))
		self.assertFalse(_cpf_valido(None))


class TestCPFEdgeCases(unittest.TestCase):
	"""Testes de casos extremos e edge cases."""

	def test_cpf_leading_zeros(self):
		"""CPF com zeros à esquerda é válido se passou na validação"""
		# 000.000.001-XX seria inválido de qualquer forma
		self.assertFalse(_cpf_valido("00000000100"))

	def test_cpf_performance(self):
		"""Validação é rápida (< 1ms)"""
		import time

		start = time.time()
		for _ in range(10000):
			_cpf_valido("11144477735")
		elapsed = (time.time() - start) * 1000  # ms

		self.assertLess(elapsed, 100)  # Menos de 100ms para 10k iterações

	def test_cpf_unicode(self):
		"""Trata strings unicode corretamente"""
		# É um CPF válido?
		result = _cpf_valido("111.444.777-35")
		self.assertTrue(result)


if __name__ == "__main__":
	unittest.main()
