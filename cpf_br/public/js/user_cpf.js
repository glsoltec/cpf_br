/**
 * cpf_br — User client script
 * Valida e formata o campo CPF em tempo real no formulário de Usuário.
 */

frappe.ui.form.on("User", {
    cpf_br: function (frm) {
        const raw = (frm.doc.cpf_br || "").replace(/\D/g, "");
        if (!raw) return;

        if (raw.length === 11) {
            if (!cpf_br_valido(raw)) {
                frappe.msgprint({
                    title: __("CPF Inválido"),
                    indicator: "red",
                    message: __("O CPF informado não é válido."),
                });
                frm.set_value("cpf_br", "");
                return;
            }
            // Formata automaticamente
            frm.set_value(
                "cpf_br",
                raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            );
        }
    },
});

/**
 * Valida CPF pelo algoritmo dos dígitos verificadores.
 * @param {string} cpf — somente dígitos, 11 chars
 * @returns {boolean}
 */
function cpf_br_valido(cpf) {
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
