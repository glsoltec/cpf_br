/**
 * cpf_br — LMS Course Enrollment client script
 * Auto-preenche o campo CPF a partir do perfil do usuário ao selecionar o membro.
 */

frappe.ui.form.on("LMS Course Enrollment", {
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

        if (!cpf_br_enrollment_valido(raw)) {
            frappe.msgprint({
                title: __("CPF Inválido"),
                indicator: "red",
                message: __("O CPF informado não é válido."),
            });
            frm.set_value("cpf_br", "");
            return;
        }

        frm.set_value(
            "cpf_br",
            raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        );
    },
});

function cpf_br_enrollment_valido(cpf) {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let d1 = (soma * 10) % 11;
    if (d1 === 10 || d1 === 11) d1 = 0;
    if (d1 !== parseInt(cpf[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    let d2 = (soma * 10) % 11;
    if (d2 === 10 || d2 === 11) d2 = 0;
    return d2 === parseInt(cpf[10]);
}
