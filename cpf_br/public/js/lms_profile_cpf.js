/**
 * cpf_br — Injeta campo CPF no modal "Edit Profile" do Frappe LMS.
 *
 * Diagnóstico confirmado:
 *  - API get_profile_details já retorna cpf_br ✅
 *  - O modal usa v-show (sempre no DOM, só muda CSS) → MutationObserver não dispara
 *
 * Solução:
 *  1. Intercepta frappe.call → captura cpf_br do retorno de get_profile_details
 *  2. Intercepta CLIQUE no botão "Edit Profile" → aguarda 500ms e injeta o campo
 *  3. Intercept de update_profile → envia cpf_br ao salvar
 */

(function () {
    "use strict";

    const INPUT_ID   = "cpf_br_lms_input";
    const ERRO_ID    = "cpf_br_lms_erro";
    const METHOD_UPD = "lms.lms.api.update_profile";
    const METHOD_GET = "lms.lms.api.get_profile_details";

    /* ── CPF salvo em memória quando a API retorna ────────────────── */
    let _cpfCache = "";

    /* ── Helpers ──────────────────────────────────────────────────── */
    function mascara(v) {
        return v.replace(/\D/g, "").slice(0, 11)
            .replace(/(\d{3})(\d)/,      "$1.$2")
            .replace(/(\d{3})(\d)/,      "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function cpfValido(cpf) {
        cpf = cpf.replace(/\D/g, "");
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let s = 0, d;
        for (let i = 0; i < 9; i++)  s += +cpf[i] * (10 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0;
        if (d !== +cpf[9]) return false;
        s = 0;
        for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0;
        return d === +cpf[10];
    }

    function lerInputCPF()        { return (document.getElementById(INPUT_ID)?.value || "").trim(); }
    function preencherInput(val)  { const el = document.getElementById(INPUT_ID); if (el) el.value = val; }
    function campoCriado()        { return !!document.getElementById(INPUT_ID); }

    /* ── Intercept frappe.call ────────────────────────────────────── */
    function instalarIntercept() {
        if (window.__cpfBrOk) return;
        window.__cpfBrOk = true;

        const _orig = frappe.call.bind(frappe);

        frappe.call = function (opts, ...rest) {
            if (typeof opts === "string") opts = { method: opts, args: rest[0] || {}, callback: rest[1] };
            else opts = { ...opts };

            const m = opts.method || "";

            /* get_profile_details → captura cpf_br no retorno */
            if (m.includes("get_profile_details")) {
                const _cb = opts.callback;
                opts.callback = function (r) {
                    if (r?.message?.cpf_br) {
                        _cpfCache = r.message.cpf_br;
                        preencherInput(_cpfCache);   // preenche se o input já existir
                    }
                    if (_cb) _cb(r);
                };
            }

            /* update_profile → injeta cpf_br nos args */
            if (m.includes("update_profile")) {
                opts.args        = opts.args || {};
                opts.args.cpf_br = lerInputCPF();
            }

            return _orig(opts);
        };
    }

    /* ── Criação do campo CPF ─────────────────────────────────────── */
    function criarCampoCPF() {
        if (campoCriado()) { preencherInput(_cpfCache); return; }

        /*
         * Encontra o ÚLTIMO input visível da página.
         * Funciona independente das classes CSS usadas pelo Vue.
         */
        const inputs = Array.from(
            document.querySelectorAll("input[type='text'], input:not([type='hidden']):not([type='file'])")
        ).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        });

        if (inputs.length === 0) {
            /* Vue ainda não renderizou os inputs → tenta novamente */
            setTimeout(criarCampoCPF, 250);
            return;
        }

        const ultimo    = inputs[inputs.length - 1];
        const container = ultimo.closest(".form-group, .mb-3, .mb-4, li, [class*='field'], [class*='input']")
                          || ultimo.parentElement;

        /* Cria o wrapper copiando a classe do irmão para manter o estilo */
        const wrapper = document.createElement("div");
        wrapper.className    = container.className;
        wrapper.style.cssText = "margin-top:.75rem;";
        wrapper.innerHTML = `
            <label for="${INPUT_ID}"
                style="display:block;font-size:.875rem;font-weight:500;
                       color:inherit;margin-bottom:.25rem;">
                CPF
            </label>
            <input
                id="${INPUT_ID}"
                type="text"
                placeholder="000.000.000-00"
                maxlength="14"
                autocomplete="off"
                style="width:100%;padding:.5rem .75rem;
                       border:1px solid #d1d5db;border-radius:.375rem;
                       font-size:.875rem;box-sizing:border-box;
                       background:#fff;color:inherit;"
            />
            <small id="${ERRO_ID}"
                style="display:none;color:#ef4444;font-size:.75rem;margin-top:.2rem;display:block;">
            </small>`;

        container.after(wrapper);

        /* Máscara + validação visual */
        const inp  = document.getElementById(INPUT_ID);
        const erro = document.getElementById(ERRO_ID);

        inp.addEventListener("input", () => {
            inp.value = mascara(inp.value);
            erro.style.display = "none";
        });
        inp.addEventListener("blur", () => {
            const raw = inp.value.replace(/\D/g, "");
            if (raw && !cpfValido(raw)) {
                erro.textContent  = "CPF inválido — verifique os dígitos.";
                erro.style.display = "block";
            }
        });

        /* Preenche com o valor já capturado (cache) ou faz nova chamada */
        if (_cpfCache) {
            inp.value = _cpfCache;
        } else {
            const username = frappe?.boot?.user_info?.name || frappe?.session?.user;
            if (username && username !== "Guest") {
                frappe.call({
                    method: METHOD_GET,
                    args: { username },
                    callback: r => { if (r?.message?.cpf_br) inp.value = r.message.cpf_br; }
                });
            }
        }
    }

    /* ── Listener de clique no botão "Edit Profile" ───────────────── */
    function isEditProfileBtn(el) {
        if (!el) return false;
        const txt = (el.textContent || el.innerText || el.title || el.ariaLabel || "")
            .toLowerCase().trim();
        return txt.includes("edit profile") || txt.includes("editar perfil");
    }

    function setupClickListener() {
        document.addEventListener("click", function (e) {
            /* Sobe até 5 níveis procurando o botão */
            let el = e.target;
            for (let i = 0; i < 5; i++) {
                if (!el) break;
                if (isEditProfileBtn(el)) {
                    /*
                     * Botão encontrado → aguarda Vue abrir o modal (500ms)
                     * e depois tenta injetar o campo.
                     */
                    setTimeout(criarCampoCPF, 500);
                    break;
                }
                el = el.parentElement;
            }
        }, true);
    }

    /* ── Inicialização ────────────────────────────────────────────── */
    function init() {
        if (typeof frappe === "undefined" || typeof frappe.call !== "function") {
            setTimeout(init, 150);
            return;
        }
        instalarIntercept();
        setupClickListener();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
