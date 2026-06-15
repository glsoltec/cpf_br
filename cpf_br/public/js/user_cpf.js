/**
 * cpf_br — User client script
 * Valida e formata o campo CPF em tempo real no formulário de Usuário.
 * [IMP-1 FIX] Usa CpfUtils centralizado ao invés de lógica duplicada
 */

frappe.ui.form.on("User", {
	cpf_br: function (frm) {
		const raw = (frm.doc.cpf_br || "").replace(/\D/g, "");
		if (!raw) return;

		if (raw.length === 11) {
			if (!window.CpfUtils.valido(raw)) {
				frappe.msgprint({
					title: __("CPF Inválido"),
					indicator: "red",
					message: __("O CPF informado não é válido."),
				});
				frm.set_value("cpf_br", "");
				return;
			}
			// Formata automaticamente
			frm.set_value("cpf_br", window.CpfUtils.formatar(raw));
		}
	},
});
