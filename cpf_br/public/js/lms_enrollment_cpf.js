/**
 * cpf_br — LMS Enrollment client script
 * Auto-preenche o campo CPF a partir do perfil do usuário ao selecionar o membro.
 * [IMP-1 FIX] Usa CpfUtils centralizado ao invés de lógica duplicada
 */

frappe.ui.form.on("LMS Enrollment", {
	member: function (frm) {
		if (!frm.doc.member) return;

		frappe.db.get_value("User", frm.doc.member, "cpf_br", function (data) {
			if (data && data.cpf_br) {
				frm.set_value("cpf_br", data.cpf_br);
			}
		});
	},

	cpf_br: function (frm) {
		const raw = (frm.doc.cpf_br || "").replace(/\D/g, "");
		if (!raw || raw.length !== 11) return;

		if (!window.CpfUtils.valido(raw)) {
			frappe.msgprint({
				title: __("CPF Inválido"),
				indicator: "red",
				message: __("O CPF informado não é válido."),
			});
			frm.set_value("cpf_br", "");
			return;
		}

		frm.set_value("cpf_br", window.CpfUtils.formatar(raw));
	},
});
