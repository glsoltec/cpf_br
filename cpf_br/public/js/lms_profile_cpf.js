/**
 * cpf_br — Injeta campo CPF no modal "Edit Profile" do Frappe LMS.
 *
 * Estratégia:
 *  1. Intercepta frappe.call globalmente para:
 *     - update_profile   → injeta cpf_br nos args antes de enviar ao servidor
 *     - get_profile_details → captura o retorno e preenche o input CPF
 *  2. MutationObserver detecta quando o modal abre e adiciona o campo CPF
 *     após "Twitter ID" no lado esquerdo do formulário.
 *
 * Não modifica nenhum arquivo do app LMS.
 */

(function () {
    "use strict";

    const INPUT_ID        = "cpf_br_field";
    const ERRO_ID         = "cpf_br_erro";
    const METHOD_GET      = "lms.lms.api.get_profile_details";
    const METHOD_SAVE     = "lms.lms.api.update_profile";

    /* ────────────────────────────────────────────────────────────────────
       1. Intercept frappe.call  — núcleo da integração com o Vue
    ──────────────────────────────────────────────────────────────────── */

    function instalarIntercept() {
        if (window._cpfBrInterceptInstalled) return;
        window._cpfBrInterceptInstalled = true;

        const _originalCall = frappe.call.bind(frappe);

        frappe.call = function (optsOrMethod, ...rest) {
            // Normaliza: frappe.call pode receber string ou objeto
            let opts = (typeof optsOrMethod === "string")
                ? { method: optsOrMethod, args: rest[0] || {}, callback: rest[1] }
                : Object.assign({}, optsOrMethod);

            const method = opts.method || "";

            /* ── update_profile: adiciona cpf_br nos args ── */
            if (method === METHOD_SAVE) {
                opts.args = opts.args || {};
                opts.args.cpf_br = _lerInputCPF();

                const _callbackOriginal = opts.callback;
                opts.callback = function (r) {
                    if (_callbackOriginal) _callbackOriginal(r);
                };
            }

            /* ── get_profile_details: preenche o input após retorno ── */
            if (method === METHOD_GET) {
                const _callbackOriginal = opts.callback;
                opts.callback = function (r) {
                    if (_callbackOriginal) _callbackOriginal(r);
                    if (r && r.message && r.message.cpf_br) {
                        _preencherInputCPF(r.message.cpf_br);
                    }
                };
            }

            return _originalCall(opts);
        };
    }

    /* ────────────────────────────────────────────────────────────────────
       2. Helpers de input CPF
    ──────────────────────────────────────────────────────────────────── */

    function _lerInputCPF() {
        return (document.getElementById(INPUT_ID)?.value || "").trim();
    }

    function _preencherInputCPF(valor) {
        const el = document.getElementById(INPUT_ID);
        if (el && valor) el.value = valor;
    }

    function _mascara(valor) {
        return valor
            .replace(/\D/g, "")
            .slice(0, 11)
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function _cpfValido(cpf) {
        cpf = cpf.replace(/\D/g, "");
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

        let s = 0, d;
        for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0;
        if (d !== +cpf[9]) return false;

        s = 0;
        for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0;
        return d === +cpf[10];
    }

    /* ────────────────────────────────────────────────────────────────────
       3. Criar campo CPF dentro do modal
    ──────────────────────────────────────────────────────────────────── */

    function _criarCampoCPF(modal) {
        if (modal.dataset.cpfInjected) return;
        modal.dataset.cpfInjected = "true";

        /* Localiza o campo "Twitter ID" — âncora para inserir depois */
        const twitterLabel = _encontrarLabel(modal, ["twitter", "Twitter"]);
        const refEl = twitterLabel
            ? (twitterLabel.closest(".form-group, .field-wrapper, [class*='field']") || twitterLabel.parentElement)
            : null;

        const wrapper = document.createElement("div");
        wrapper.id = "cpf_br_wrapper";
        // Copia o estilo do container irmão para consistência visual
        if (refEl) {
            wrapper.className = refEl.className;
        } else {
            wrapper.style.cssText = "margin-top:1rem;";
        }

        wrapper.innerHTML = `
            <label
                for="${INPUT_ID}"
                style="
                    display:block;
                    font-size:0.875rem;
                    font-weight:500;
                    color:#1f272b;
                    margin-bottom:0.3rem;
                ">
                CPF
            </label>
            <input
                id="${INPUT_ID}"
                type="text"
                placeholder="000.000.000-00"
                maxlength="14"
                autocomplete="off"
                style="
                    width:100%;
                    padding:0.5rem 0.75rem;
                    border:1px solid #d1d5db;
                    border-radius:0.375rem;
                    font-size:0.875rem;
                    color:#1f272b;
                    background:#fff;
                    box-sizing:border-box;
                    transition:border-color .15s;
                "
            />
            <p
                id="${ERRO_ID}"
                style="
                    display:none;
                    color:#ef4444;
                    font-size:0.75rem;
                    margin-top:0.25rem;
                    margin-bottom:0;
                ">
                CPF inválido — verifique os dígitos.
            </p>
        `;

        /* Insere após Twitter ou ao final do form */
        if (refEl) {
            refEl.after(wrapper);
        } else {
            const form = modal.querySelector("form, .form-wrapper, .edit-profile-form");
            (form || modal).appendChild(wrapper);
        }

        /* Máscara e validação visual */
        const input = document.getElementById(INPUT_ID);
        const erro  = document.getElementById(ERRO_ID);

        input.addEventListener("focus", () => {
            input.style.borderColor = "#6366f1";
            input.style.outline = "none";
        });
        input.addEventListener("blur", () => {
            input.style.borderColor = "#d1d5db";
            const raw = input.value.replace(/\D/g, "");
            if (raw && !_cpfValido(raw)) {
                erro.style.display = "block";
                input.style.borderColor = "#ef4444";
            } else {
                erro.style.display = "none";
            }
        });
        input.addEventListener("input", () => {
            input.value = _mascara(input.value);
            erro.style.display = "none";
            input.style.borderColor = "#d1d5db";
        });
    }

    function _encontrarLabel(container, termos) {
        const labels = container.querySelectorAll("label");
        for (const lbl of labels) {
            if (termos.some(t => lbl.textContent.includes(t))) return lbl;
        }
        return null;
    }

    /* ────────────────────────────────────────────────────────────────────
       4. MutationObserver — detecta abertura do modal
    ──────────────────────────────────────────────────────────────────── */

    function _ehModalEditProfile(node) {
        if (node.nodeType !== 1) return false;

        // O modal contém um heading com "Edit Profile" / "Editar Perfil"
        const headings = node.querySelectorAll?.(
            "h2, h3, h4, h5, .modal-title, [class*='title'], [class*='heading']"
        );
        if (headings) {
            for (const h of headings) {
                const txt = (h.textContent || "").toLowerCase();
                if (txt.includes("edit profile") || txt.includes("editar perfil")) {
                    return true;
                }
            }
        }

        // Fallback: tem os campos Nome + Sobrenome (inputs identificáveis)
        const hasNameFields =
            node.querySelector?.("input[name='first_name'], input[placeholder*='Nome'], input[placeholder*='First']") &&
            node.querySelector?.("input[name='last_name'],  input[placeholder*='Sobrenome'], input[placeholder*='Last']");

        return !!hasNameFields;
    }

    const observer = new MutationObserver(function (mutations) {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;

                // Nó diretamente é o modal
                if (_ehModalEditProfile(node)) {
                    _criarCampoCPF(node);
                    return;
                }

                // Nó contém o modal como filho
                const modal = node.querySelector?.(
                    "[role='dialog'], .modal, .dialog-wrapper, [class*='modal'], [class*='dialog']"
                );
                if (modal && _ehModalEditProfile(modal)) {
                    _criarCampoCPF(modal);
                    return;
                }
            }
        }
    });

    /* ────────────────────────────────────────────────────────────────────
       5. Inicialização — aguarda frappe estar disponível
    ──────────────────────────────────────────────────────────────────── */

    function init() {
        if (typeof frappe === "undefined" || typeof frappe.call !== "function") {
            setTimeout(init, 100);
            return;
        }
        instalarIntercept();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
