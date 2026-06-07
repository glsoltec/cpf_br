/**
 * cpf_br — Injeta campo CPF no modal "Edit Profile" do Frappe LMS.
 *
 * Diagnóstico (versão definitiva):
 *  - API get_profile_details retorna cpf_br ✅ (override Python)
 *  - O LMS salva via createResource({ url: 'frappe.client.set_value' })
 *    que usa fetch() diretamente, NÃO frappe.call()
 *  - O objeto reativo Vue 'profile' não inclui cpf_br → precisamos
 *    interceptar o fetch para injetar cpf_br no payload de set_value
 *  - O Dialog pode usar v-show (style) OU v-if (DOM) → observamos ambos
 *
 * Estratégia:
 *  1. MutationObserver: detecta abertura do modal por style OU por DOM
 *  2. Click listener: fallback quando o botão "Edit Profile" é clicado
 *  3. Intercept frappe.call: captura get_profile_details e update_profile
 *  4. Intercept fetch: injeta cpf_br no frappe.client.set_value (save)
 */

(function () {
    "use strict";

    const INPUT_ID = "cpf_br_lms_input";
    const WRAP_ID  = "cpf_br_wrapper";
    const ERRO_ID  = "cpf_br_erro";

    let _cpfCache  = "";   // valor carregado da API
    let _injetando = false; // guard contra dupla injeção

    /* ── Máscara e validação ─────────────────────────────────────────── */
    function mascara(v) {
        return v.replace(/\D/g, "").slice(0, 11)
            .replace(/(\d{3})(\d)/,       "$1.$2")
            .replace(/(\d{3})(\d)/,       "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function cpfValido(cpf) {
        cpf = cpf.replace(/\D/g, "");
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let s = 0, d;
        for (let i = 0; i < 9;  i++) s += +cpf[i] * (10 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0; if (d !== +cpf[9])  return false;
        s = 0;
        for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0;
        return d === +cpf[10];
    }

    function lerInputCPF() {
        return (document.getElementById(INPUT_ID)?.value || "").trim();
    }

    function preencherInput(val) {
        const el = document.getElementById(INPUT_ID);
        if (el) el.value = val;
    }

    function isVisible(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }

    function contemEditProfile(el) {
        if (!el || typeof el.textContent !== "string") return false;
        const txt = el.textContent;
        return txt.includes("Edit Profile") || txt.includes("Editar Perfil");
    }

    /* ── Localiza o modal aberto ─────────────────────────────────────── */
    function findModal() {
        // 1. Elemento <dialog open>
        for (const d of document.querySelectorAll("dialog[open]")) {
            if (contemEditProfile(d)) return d;
        }

        // 2. [role=dialog] visível
        for (const d of document.querySelectorAll('[role="dialog"]')) {
            if (isVisible(d) && contemEditProfile(d)) return d;
        }

        // 3. Filhos diretos do <body> com position:fixed (Frappe UI usa <Teleport to="body">)
        for (const child of document.body.children) {
            const cs = window.getComputedStyle(child);
            if (cs.position === "fixed" && cs.display !== "none" && contemEditProfile(child)) {
                return child;
            }
        }

        // 4. Encontra pelo título "Edit Profile" / "Editar Perfil" visível e sobe na árvore
        const allEls = document.querySelectorAll("h1,h2,h3,h4,h5,div,span,p");
        for (const el of allEls) {
            if (!isVisible(el)) continue;
            const txt = el.textContent.trim();
            if (txt !== "Edit Profile" && txt !== "Editar Perfil") continue;
            // Sobe procurando um container com múltiplos inputs
            let p = el.parentElement;
            for (let i = 0; i < 15; i++) {
                if (!p || p === document.body) break;
                if (p.querySelectorAll("input").length >= 3) return p;
                p = p.parentElement;
            }
        }

        return null;
    }

    /* ── Injeta o campo CPF no modal ─────────────────────────────────── */
    function injetar(modal) {
        modal = modal || findModal();
        if (!modal) {
            console.warn("[CPF-BR] Modal não encontrado.");
            return false;
        }

        // Já existe o campo → apenas preenche
        if (document.getElementById(INPUT_ID)) {
            preencherInput(_cpfCache);
            return true;
        }

        if (_injetando) return false;

        /* Localiza o input âncora (Twitter ID → coluna esquerda → qualquer input) */
        let anchor = modal.querySelector('input[placeholder*="Twitter" i]');

        if (!anchor || !isVisible(anchor)) {
            // Primeira coluna .space-y-4 (classe conhecida do Frappe LMS)
            const leftCol = modal.querySelector(".space-y-4");
            if (leftCol) {
                const inputs = [...leftCol.querySelectorAll("input")].filter(isVisible);
                anchor = inputs.at(-1) ?? null;
            }
        }

        if (!anchor || !isVisible(anchor)) {
            // Último input de texto visível no modal como fallback
            const inputs = [...modal.querySelectorAll(
                'input[type="text"], input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])'
            )].filter(isVisible);
            anchor = inputs.at(-1) ?? null;
        }

        if (!anchor) {
            console.warn("[CPF-BR] Nenhum input âncora encontrado — tentando novamente...");
            return false;
        }

        _injetando = true;
        console.log("[CPF-BR] Âncora:", anchor.placeholder || anchor.name || anchor.id || anchor.className);

        /* Encontra o container do campo âncora para inserir depois dele */
        const container =
            anchor.closest(".form-group, .mb-3, .mb-4, [class*='field-wrap']")
            ?? anchor.parentElement?.parentElement
            ?? anchor.parentElement;

        /* Copia a classe do irmão para manter o visual consistente */
        let wrapperClass = "";
        if (container?.parentElement) {
            const irmao = [...container.parentElement.children].find(
                c => c !== container && c.querySelector?.("input")
            );
            if (irmao) wrapperClass = irmao.className;
        }

        const wrap = document.createElement("div");
        wrap.id = WRAP_ID;
        if (wrapperClass) wrap.className = wrapperClass;
        wrap.style.cssText = "margin-top:.75rem;";

        wrap.innerHTML = `
            <label for="${INPUT_ID}"
                style="display:block;font-size:.75rem;color:#6b7280;
                       font-weight:500;margin-bottom:.25rem;letter-spacing:.025em;">
                CPF
            </label>
            <input
                id="${INPUT_ID}"
                type="text"
                placeholder="000.000.000-00"
                maxlength="14"
                autocomplete="off"
                class="${anchor.className}"
                style="display:block;width:100%;padding:.5rem .75rem;
                       border:1px solid #d1d5db;border-radius:.375rem;
                       font-size:.875rem;box-sizing:border-box;
                       background:#fff;color:inherit;outline:none;
                       transition:border-color .15s;"
            />
            <small id="${ERRO_ID}"
                style="display:none;color:#ef4444;
                       font-size:.75rem;margin-top:.25rem;"></small>`;

        container.after(wrap);

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
        inp.addEventListener("focus", () => {
            inp.style.borderColor = "#6366f1";
        });
        inp.addEventListener("blur", () => {
            inp.style.borderColor = "#d1d5db";
        });

        /* Preenche com o valor cacheado ou faz chamada à API */
        if (_cpfCache) {
            inp.value = _cpfCache;
        } else {
            const uname =
                frappe?.boot?.user_info?.username ||
                frappe?.session?.user;
            if (uname && uname !== "Guest") {
                frappe.call({
                    method: "lms.lms.api.get_profile_details",
                    args:   { username: uname },
                    callback: r => {
                        if (r?.message?.cpf_br) {
                            _cpfCache = r.message.cpf_br;
                            inp.value = _cpfCache;
                        }
                    },
                });
            }
        }

        _injetando = false;
        console.log("[CPF-BR] ✅ Campo CPF injetado com sucesso no modal.");
        return true;
    }

    /* ── Retry com backoff ───────────────────────────────────────────── */
    function tentarInjetar(tentativa) {
        tentativa = tentativa || 0;
        if (tentativa > 30) {
            console.warn("[CPF-BR] Desistindo após 30 tentativas.");
            return;
        }
        const modal = findModal();
        if (!modal || !modal.querySelector("input")) {
            setTimeout(() => tentarInjetar(tentativa + 1), 200);
            return;
        }
        if (!injetar(modal)) {
            setTimeout(() => tentarInjetar(tentativa + 1), 200);
        }
    }

    /* ── Intercept frappe.call ───────────────────────────────────────── */
    function instalarCallIntercept() {
        if (window.__cpfBrCallOk) return;
        window.__cpfBrCallOk = true;

        const _orig = frappe.call.bind(frappe);

        frappe.call = function (opts, ...rest) {
            if (typeof opts === "string")
                opts = { method: opts, args: rest[0] || {}, callback: rest[1] };
            else
                opts = { ...opts };

            const m = opts.method || "";

            /* Captura cpf_br quando get_profile_details retorna */
            if (m.includes("get_profile_details")) {
                const _cb = opts.callback;
                opts.callback = function (r) {
                    if (r?.message?.cpf_br) {
                        _cpfCache = r.message.cpf_br;
                        preencherInput(_cpfCache);
                    }
                    _cb?.(r);
                };
            }

            /* Injeta cpf_br quando set_value salva o User (frappe.call path) */
            if (m === "frappe.client.set_value" && opts.args?.doctype === "User") {
                opts.args = { ...opts.args };
                opts.args.fieldname = { ...opts.args.fieldname, cpf_br: lerInputCPF() };
            }

            /* Compatibilidade com LMS que ainda usa update_profile */
            if (m.includes("update_profile")) {
                opts.args        = opts.args || {};
                opts.args.cpf_br = lerInputCPF();
            }

            return _orig(opts);
        };
    }

    /* ── Intercept fetch (Frappe UI createResource usa fetch diretamente) ── */
    function instalarFetchIntercept() {
        if (window.__cpfBrFetchOk) return;
        window.__cpfBrFetchOk = true;

        const _origFetch = window.fetch.bind(window);

        window.fetch = async function (input, init) {
            const url = (typeof input === "string" ? input : input?.url) || "";

            /* Intercept frappe.client.set_value para User */
            if (url.includes("frappe.client.set_value")) {
                try {
                    if (init?.body) {
                        let params = null;
                        if (typeof init.body === "string") {
                            try { params = new URLSearchParams(init.body); } catch (e) { /* ignore */ }
                        } else if (init.body instanceof URLSearchParams) {
                            params = new URLSearchParams(init.body.toString());
                        } else if (init.body instanceof FormData) {
                            params = new URLSearchParams();
                            init.body.forEach((v, k) => params.set(k, v));
                        }

                        if (params && params.get("doctype") === "User") {
                            let fieldname = {};
                            try { fieldname = JSON.parse(params.get("fieldname") || "{}"); } catch (e) { /* ignore */ }
                            fieldname.cpf_br = lerInputCPF();
                            params.set("fieldname", JSON.stringify(fieldname));
                            console.log("[CPF-BR] cpf_br injetado no fetch set_value:", fieldname.cpf_br);
                            init = { ...init, body: params.toString() };
                        }
                    }
                } catch (e) {
                    console.warn("[CPF-BR] Erro no intercept fetch:", e);
                }
            }

            /* Captura cpf_br da resposta de get_profile_details */
            if (url.includes("get_profile_details")) {
                const resp = await _origFetch(input, init);
                try {
                    const clone = resp.clone();
                    clone.json().then(data => {
                        const cpf = data?.message?.cpf_br;
                        if (cpf) { _cpfCache = cpf; preencherInput(cpf); }
                    }).catch(() => { /* ignore */ });
                } catch (e) { /* ignore */ }
                return resp;
            }

            return _origFetch(input, init);
        };
    }

    /* ── MutationObserver: detecta abertura por v-show E v-if ───────── */
    function setupObserver() {
        const obs = new MutationObserver(mutations => {
            for (const m of mutations) {

                /* v-show: mudança no atributo style */
                if (m.type === "attributes" && m.attributeName === "style") {
                    const prev = m.oldValue || "";
                    const curr = m.target.getAttribute("style") || "";
                    const eraOculto  = prev.includes("display: none") || prev.includes("display:none");
                    const agoraVisel = !curr.includes("display: none") && !curr.includes("display:none");

                    if (eraOculto && agoraVisel && contemEditProfile(m.target)) {
                        console.log("[CPF-BR] Modal aberto via v-show (style).");
                        setTimeout(() => tentarInjetar(0), 150);
                    }
                }

                /* v-if: elemento adicionado ao DOM */
                if (m.type === "childList") {
                    for (const node of m.addedNodes) {
                        if (node.nodeType === 1 && contemEditProfile(node)) {
                            console.log("[CPF-BR] Modal adicionado ao DOM via v-if.");
                            setTimeout(() => tentarInjetar(0), 150);
                        }
                    }
                }
            }
        });

        obs.observe(document.body, {
            subtree:            true,
            attributes:         true,
            attributeOldValue:  true,
            attributeFilter:    ["style"],
            childList:          true,
        });
    }

    /* ── Click listener: fallback para o botão Edit Profile ─────────── */
    function setupClickListener() {
        document.addEventListener("click", function (e) {
            let el = e.target;
            for (let i = 0; i < 10; i++) {
                if (!el || el === document.body) break;
                const txt = (
                    el.textContent   ||
                    el.innerText     ||
                    el.title         ||
                    el.getAttribute?.("aria-label")  ||
                    el.getAttribute?.("data-label")  ||
                    el.getAttribute?.("data-tooltip") || ""
                ).toLowerCase().trim();

                if (txt.includes("edit profile") || txt.includes("editar perfil")) {
                    console.log("[CPF-BR] Clique em Edit Profile detectado.");
                    setTimeout(() => tentarInjetar(0), 600);
                    break;
                }
                el = el.parentElement;
            }
        }, true);
    }

    /* ── Inicialização ───────────────────────────────────────────────── */
    function init() {
        if (typeof frappe === "undefined" || typeof frappe.call !== "function") {
            setTimeout(init, 150);
            return;
        }
        instalarCallIntercept();
        instalarFetchIntercept();
        setupObserver();
        setupClickListener();
        console.log("[CPF-BR] Módulo inicializado. Versão: 2.0 (fetch intercept).");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
