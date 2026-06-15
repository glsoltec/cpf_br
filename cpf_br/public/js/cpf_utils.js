/**
 * cpf_br — Utilitários CPF compartilhados
 * [IMP-1 FIX] Módulo centralizado para evitar duplicação de lógica CPF
 * nos arquivos user_cpf.js, lms_enrollment_cpf.js e lms_profile_cpf.js
 */

window.CpfUtils = {
	/**
	 * Valida CPF usando algoritmo oficial dos dígitos verificadores.
	 * @param {string} cpf - CPF em qualquer formato (com ou sem máscara)
	 * @returns {boolean} true se CPF é válido
	 */
	valido(cpf) {
		cpf = (cpf || "").replace(/\D/g, "");

		// Rejeita sequências iguais (111.111.111-11, etc) ou tamanho inválido
		if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
			return false;
		}

		// Primeiro dígito verificador
		let soma = 0;
		for (let i = 0; i < 9; i++) {
			soma += parseInt(cpf[i]) * (10 - i);
		}
		let d1 = (soma * 10) % 11;
		if (d1 >= 10) d1 = 0;
		if (d1 !== parseInt(cpf[9])) {
			return false;
		}

		// Segundo dígito verificador
		soma = 0;
		for (let i = 0; i < 10; i++) {
			soma += parseInt(cpf[i]) * (11 - i);
		}
		let d2 = (soma * 10) % 11;
		if (d2 >= 10) d2 = 0;
		if (d2 !== parseInt(cpf[10])) {
			return false;
		}

		return true;
	},

	/**
	 * Formata CPF para formato: 123.456.789-09
	 * @param {string} cpf - CPF em qualquer formato
	 * @returns {string} CPF formatado ou vazio se inválido
	 */
	formatar(cpf) {
		const digitos = (cpf || "").replace(/\D/g, "").slice(0, 11);

		if (digitos.length !== 11) {
			return "";
		}

		return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	},

	/**
	 * Aplica máscara incrementalmente enquanto usuário digita.
	 * Usa padrão: 123.456.789-09
	 * @param {string} cpf - Entrada do usuário (parcial ou completa)
	 * @returns {string} CPF com máscara aplicada
	 */
	mascarar(cpf) {
		const digitos = (cpf || "").replace(/\D/g, "").slice(0, 11);

		// Aplica máscara progressiva
		return digitos
			.replace(/(\d{3})(\d)/, "$1.$2")
			.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
			.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
	},
};
