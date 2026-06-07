/**
 * cpf_br — Injeta campo CPF no modal "Edit Profile" do Frappe LMS.
 *
 * Diagnóstico definitivo (v3):
 *  - O LMS é um Vue 3 SPA — "frappe" NÃO existe como global
 *  - APIs usam fetch() direto para /api/method/...  (Frappe UI createResource)
 *  - O LMS salva perfil via frappe.client.set_value (não update_profile)
 *  - Autenticação via window.csrf_token (disponível na página)
 *
 * Estratégia:
 *  1. Intercept fetch() para injetar cpf_br no set_value ao salvar
 *  2. Intercept fetch() para capturar cpf_br do get_profile_details
 *  3. MutationObserver: detecta abertura do modal (v-show OU v-if)
 *  4. Click listener: fallback para o botão Edit Profile
 *  5. Sem dependência de frappe.call — usa fetch direto
 */

(function () {
    "use strict";

    const INPUT_ID = "cpf_br_lms_input";
    const WRAP_ID  = "cpf_br_wrapper";
    const ERRO_ID  = "cpf_br_erro";

    let _cpfCache  = "";
    let _injetando = false;

    /* ── Máscara e validação ─────────────────────────────────────── */
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
        d = (s * 10) % 11; if (d >= 10) d = 0; if (d !== +cpf[9]) return false;
        s = 0;
        for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
        d = (s * 10) % 11; if (d >= 10) d = 0;
        return d === +cpf[10];
    }

    function lerInputCPF()       { return (document.getElementById(INPUT_ID)?.value || "").trim(); }
    function preencherInput(val) { const el = document.getElementById(INPUT_ID); if (el) el.value = val; }

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

    /* ── Fetch direto para a API (sem frappe.call) ───────────────── */
    function csrf() {
        return window.csrf_token || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || "fetch";
    }

    function apiFetch(method, params) {
        const qs = new URLSearchParams(params).toString();
        return fetch("/api/method/" + method + "?" + qs, {
            headers: {
                "X-Frappe-CSRF-Token": csrf(),
                "Accept": "application/json",
            },
        }).then(r => r.json()).then(d => d.message);
    }

    /* ── Username da URL atual ──────────────────────────────────── */
    function usernameFromURL() {
        return location.pathname.match(/\/lms\/user\/([^\/]+)/)?.[1] || null;
    }

    /* ── Localiza o modal aberto ─────────────────────────────────── */
    function findModal() {
        // 1. <dialog open>
        for (const d of document.querySelectorAll("dialog[open]")) {
            if (contemEditProfile(d)) return d;
        }
        // 2. [role=dialog] visível
        for (const d of document.querySelectorAll('[role="dialog"]')) {
            if (isVisible(d) && contemEditProfile(d)) return d;
        }
        // 3. Filhos diretos do <body> com position:fixed (Frappe UI Teleport)
        for (const child of document.body.children) {
            const cs = window.getComputedStyle(child);
            if (cs.position === "fixed" && cs.display !== "none" && contemEditProfile(child)) {
                return child;
            }
        }
        // 4. Heading exato "Edit Profile" visível → sobe até achar container com inputs
        for (const el of document.querySelectorAll("h1,h2,h3,h4,h5,div,span,p")) {
            if (!isVisible(el)) continue;
            const txt = el.textContent.trim();
            if (txt !== "Edit Profile" && txt !== "Editar Perfil") continue;
            let p = el.parentElement;
            for (let i = 0; i < 15; i++) {
                if (!p || p === document.body) break;
                if (p.querySelectorAll("input").length >= 3) return p;
                p = p.parentElement;
            }
        }
        return null;
    }

    /* ── Injeta o campo CPF ──────────────────────────────────────── */
    function injetar(modal) {
        modal = modal || findModal();
        if (!modal) { console.warn("[CPF-BR] Modal não encontrado."); return false; }
        if (document.getElementById(INPUT_ID)) { preencherInput(_cpfCache); return true; }
        if (_injetando) return false;

        /* Âncora: input com placeholder "Twitter", ou último input da coluna esquerda */
        let anchor = modal.querySelector('input[placeholder*="Twitter" i]');

        if (!anchor || !isVisible(anchor)) {
            const leftCol = modal.querySelector(".space-y-4");
            if (leftCol) {
                const inputs = [...leftCol.querySelectorAll("input")].filter(isVisible);
                anchor = inputs.at(-1) ?? null;
            }
        }
        if (!anchor || !isVisible(anchor)) {
            const inputs = [...modal.querySelectorAll(
                'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"])'
            )].filter(isVisible);
            anchor = inputs.at(-1) ?? null;
        }

        if (!anchor) {
            console.warn("[CPF-BR] Input âncora não encontrado — tentando em breve...");
            return false;
        }

        _injetando = true;
        console.log("[CPF-BR] Âncora:", anchor.placeholder || anchor.name || anchor.id);

        const container =
            anchor.closest(".form-group,.mb-3,.mb-4,[class*='field-wrap']")
            ?? anchor.parentElement?.parentElement
            ?? anchor.parentElement;

        /* Copia classe do irmão para manter o visual */
        let wrapClass = "";
        if (container?.parentElement) {
            const irmao = [...container.parentElement.children].find(
                c => c !== container && c.querySelector?.("input")
            );
            if (irmao) wrapClass = irmao.className;
        }

        const wrap = document.createElement("div");
        wrap.id = WRAP_ID;
        if (wrapClass) wrap.className = wrapClass;
        wrap.style.cssText = "margin-top:.75rem;";
        wrap.innerHTML = `
            <label for="${INPUT_ID}"
                style="display:block;font-size:.75rem;color:#6b7280;
                       font-weight:500;margin-bottom:.25rem;letter-spacing:.025em;">
                CPF
            </label>
            <input id="${INPUT_ID}" type="text" placeholder="000.000.000-00"
                maxlength="14" autocomplete="off"
                class="${anchor.className}"
                style="display:block;width:100%;padding:.5rem .75rem;
                       border:1px solid #d1d5db;border-radius:.375rem;
                       font-size:.875rem;box-sizing:border-box;
                       background:#fff;color:inherit;outline:none;" />
            <small id="${ERRO_ID}"
                style="display:none;color:#ef4444;font-size:.75rem;margin-top:.25rem;"></small>`;

        container.after(wrap);

        const inp  = document.getElementById(INPUT_ID);
        const erro = document.getElementById(ERRO_ID);

        inp.addEventListener("input", () => { inp.value = mascara(inp.value); erro.style.display = "none"; });
        inp.addEventListener("blur",  () => {
            const raw = inp.value.replace(/\D/g, "");
            if (raw && !cpfValido(raw)) { erro.textContent = "CPF inválido."; erro.style.display = "block"; }
        });
        inp.addEventListener("focus", () => { inp.style.borderColor = "#6366f1"; });
        inp.addEventListener("blur",  () => { inp.style.borderColor = "#d1d5db"; });

        /* Preenche com cache ou busca da API */
        if (_cpfCache) {
            inp.value = _cpfCache;
        } else {
            const uname = usernameFromURL();
            if (uname) {
                apiFetch("lms.lms.api.get_profile_details", { username: uname })
                    .then(data => {
                        if (data?.cpf_br) { _cpfCache = data.cpf_br; inp.value = _cpfCache; }
                    })
                    .catch(e => console.warn("[CPF-BR] Erro ao buscar CPF:", e));
            }
        }

        _injetando = false;
        console.log("[CPF-BR] ✅ Campo CPF injetado.");
        return true;
    }

    /* ── Retry com backoff ───────────────────────────────────────── */
    function tentarInjetar(n) {
        n = n || 0;
        if (n > 30) { console.warn("[CPF-BR] Desistindo após 30 tentativas."); return; }
        const modal = findModal();
        if (!modal || !modal.querySelector("input")) {
            setTimeout(() => tentarInjetar(n + 1), 200);
            return;
        }
        if (!injetar(modal)) setTimeout(() => tentarInjetar(n + 1), 200);
    }

    /* ── Intercept fetch: injeta cpf_br no set_value e captura get_profile ── */
    function instalarFetchIntercept() {
        if (window.__cpfBrFetchOk) return;
        window.__cpfBrFetchOk = true;

        /* Usa o fetch original (pode ter sido patchado por lms_portal_lock.js) */
        const _orig = window._origFetch || window.fetch.bind(window);

        /* Substitui o fetch atual (que pode ser o patchado pelo lms_lock) */
        const currentFetch = window.fetch;

        window.fetch = async function (input, init) {
            const url = (typeof input === "string" ? input : input?.url) || "";

            /* ── Salvar perfil: injeta cpf_br no fieldname ── */
            if (url.includes("frappe.client.set_value")) {
                try {
                    if (init?.body) {
                        let params = null;
                        if (typeof init.body === "string") {
                            try { params = new URLSearchParams(init.body); } catch (_) {}
                        } else if (init.body instanceof URLSearchParams) {
                            params = new URLSearchParams(init.body.toString());
                        } else if (init.body instanceof FormData) {
                            params = new URLSearchParams();
                            init.body.forEach((v, k) => params.set(k, v));
                        }
                        if (params && params.get("doctype") === "User") {
                            let fn = {};
                            try { fn = JSON.parse(params.get("fieldname") || "{}"); } catch (_) {}
                            fn.cpf_br = lerInputCPF();
                            params.set("fieldname", JSON.stringify(fn));
                            console.log("[CPF-BR] cpf_br injetado no set_value:", fn.cpf_br);
                            init = { ...init, body: params.toString() };
                        }
                    }
                } catch (e) { console.warn("[CPF-BR] Erro no intercept set_value:", e); }
            }

            /* ── Carregar perfil: captura cpf_br da resposta ── */
            if (url.includes("get_profile_details")) {
                const resp = await currentFetch.call(window, input, init);
                try {
                    resp.clone().json().then(d => {
                        const cpf = d?.message?.cpf_br;
                        if (cpf) { _cpfCache = cpf; preencherInput(cpf); }
                    }).catch(() => {});
                } catch (_) {}
                return resp;
            }

            return currentFetch.call(window, input, init);
        };
    }

    /* ── MutationObserver: v-show (style) e v-if (childList) ────── */
    function setupObserver() {
        const obs = new MutationObserver(muts => {
            for (const m of muts) {
                if (m.type === "attributes" && m.attributeName === "style") {
                    const prev = m.oldValue || "";
                    const curr = m.target.getAttribute("style") || "";
                    if (
                        (prev.includes("display: none") || prev.includes("display:none")) &&
                        !curr.includes("display: none") && !curr.includes("display:none") &&
                        contemEditProfile(m.target)
                    ) {
                        console.log("[CPF-BR] Modal aberto via v-show.");
                        setTimeout(() => tentarInjetar(0), 150);
                    }
                }
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
            subtree: true, attributes: true, attributeOldValue: true,
            attributeFilter: ["style"], childList: true,
        });
    }

    /* ── Click listener: fallback ────────────────────────────────── */
    function setupClickListener() {
        document.addEventListener("click", function (e) {
            let el = e.target;
            for (let i = 0; i < 10; i++) {
                if (!el || el === document.body) break;
                const txt = (
                    el.textContent || el.innerText ||
                    el.title || el.getAttribute?.("aria-label") ||
                    el.getAttribute?.("data-label") || ""
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

    /* ── Inicialização — sem dependência de frappe ───────────────── */
    function init() {
        instalarFetchIntercept();
        setupObserver();
        setupClickListener();
        console.log("[CPF-BR] v3 inicializado (fetch-only, sem frappe).");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
