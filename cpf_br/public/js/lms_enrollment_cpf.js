/**
 * cpf_br — LMS Enrollment client script
 * Auto-preenche o campo CPF a partir do perfil do usuário ao selecionar o membro.
 * [IMP-1 FIX] Usa CpfUtils centralizado ao invés de lógica duplicada
 * [SYNC FIX] Sincroniza mudanças de volta para User e avisa se CPF diferente
 */

let _userCpfOriginal = null;

frappe.ui.form.on("LMS Enrollment", {
	member: function (frm) {
		if (!frm.doc.member) return;

		frappe.db.get_value("User", frm.doc.member, "cpf_br", function (data) {
			_userCpfOriginal = data && data.cpf_br ? data.cpf_br : null;
			if (_userCpfOriginal) {
				frm.set_value("cpf_br", _userCpfOriginal);
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

		const formatted = window.CpfUtils.formatar(raw);
		frm.set_value("cpf_br", formatted);

		// Aviso se CPF diferente do User
		if (_userCpfOriginal && formatted !== _userCpfOriginal) {
			frappe.msgprint({
				title: __("CPF Diferente do Usuário"),
				indicator: "yellow",
				message: __("CPF alterado para <strong>{0}</strong>. Original do usuário: <strong>{1}</strong><br><br>Ao salvar, o CPF será sincronizado para o perfil do usuário.",
					[formatted, _userCpfOriginal]),
			});
		}
	},

	after_save: function (frm) {
		// Sincronizar CPF de volta para o User se foi alterado
		if (!frm.doc.member || !frm.doc.cpf_br) return;

		frappe.db.get_value("User", frm.doc.member, "cpf_br", function (data) {
			const userCpf = data && data.cpf_br ? data.cpf_br : null;
			const enrollmentCpf = frm.doc.cpf_br;

			if (userCpf !== enrollmentCpf) {
				frappe.call({
					method: "frappe.client.set_value",
					args: {
						doctype: "User",
						name: frm.doc.member,
						fieldname: { cpf_br: enrollmentCpf },
					},
					callback: function (r) {
						if (r.message) {
							frappe.msgprint({
								title: __("CPF Sincronizado"),
								indicator: "green",
								message: __("CPF atualizado no perfil do usuário: <strong>{0}</strong>", [enrollmentCpf]),
							});
						}
					},
				});
			}
		});
	},
});
