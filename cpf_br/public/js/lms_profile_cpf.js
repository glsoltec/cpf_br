/**
 * cpf_br — Injeta campo CPF no modal "Edit Profile" do Frappe LMS.
 *
 * Estratégias combinadas:
 *  1. Intercepta frappe.call globalmente:
 *     - update_profile   → adiciona cpf_br nos args antes de enviar
 *     - get_profile_details → preenche o input após retorno
 *  2. MutationObserver + retry com delay para aguardar Vue renderizar
 *  3. Polling periódico como fallback final
 */

(function () {
    "use strict";

    /* ── Configuração ─────────────────────────────────────────────── */
    const INPUT_ID   = "cpf_br_lms_input";
    const ERRO_ID    = "cpf_br_lms_erro";
    const METHOD_GET = "lms.lms.api.get_profile_details";
    const METHOD_UPD = "lms.lms.api.update_profile";

    /* ── Helpers CPF ─────────────────────────────────────────────── */
    function mascara(v) {
        return v.replace(/\D/g, "").slice(0, 11)
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function cpfValido(cpf) {
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

    function lerCPF() {
        return (document.getElementById(INPUT_ID)?.value || "").trim();
    }

    function preencherCPF(val) {
        const el = document.getElementById(INPUT_ID);
        if (el && val) el.value = val;
    }

    /* ── Detecção do modal ───────────────────────────────────────── */

    /**
     * Retorna true se o nó (ou seus filhos) parecer o modal Edit Profile.
     * Estratégia multi-critério para cobrir diferentes versões do LMS.
     */
    function ehModalEditProfile(node) {
        if (!node || node.nodeType !== 1) return false;

        // Critério 1: tem um heading com "Edit Profile" ou "Editar Perfil"
        const headings = node.querySelectorAll(
            "h1,h2,h3,h4,h5,h6,.modal-title,.dialog-title,[class*='title'],[class*='heading']"
        );
        for (const h of headings) {
            const txt = (h.textContent || "").toLowerCase().trim();
            if (txt === "edit profile" || txt === "editar perfil") return true;
        }

        // Critério 2: tem inputs de first_name E last_name (campos obrigatórios do modal)
        const temNome = !!(
            node.querySelector("input[name='first_name']") ||
            node.querySelector("input[id*='first_name']") ||
            node.querySelector("input[placeholder='Nome'], input[placeholder='First Name']")
        );
        const temSobrenome = !!(
            node.querySelector("input[name='last_name']") ||
            node.querySelector("input[id*='last_name']") ||
            node.querySelector("input[placeholder='Sobrenome'], input[placeholder='Last Name']")
        );
        if (temNome && temSobrenome) return true;

        // Critério 3: busca nos filhos (caso o observer capturar um wrapper)
        const filhos = node.querySelectorAll("[role='dialog'],[class*='modal'],[class*='dialog']");
        for (const filho of filhos) {
            if (ehModalEditProfile(filho)) return true;
        }

        return false;
    }

    /* ── Criação do campo CPF no modal ───────────────────────────── */
    function injetarCPF(modal) {
        // Já injetado?
        if (modal.dataset.cpfInjetado || document.getElementById(INPUT_ID)) return;
        modal.dataset.cpfInjetado = "1";

        // Encontra o último input do lado esquerdo para inserir após ele
        // Tenta Twitter primeiro, depois pega o último input disponível
        const todosInputs = Array.from(
            modal.querySelectorAll("input[type='text'], input:not([type])")
        ).filter(el => el.offsetParent !== null); // apenas visíveis

        if (todosInputs.length === 0) {
            // Vue ainda não renderizou — tenta novamente em 300ms
            setTimeout(() => {
                delete modal.dataset.cpfInjetado;
                injetarCPF(modal);
            }, 300);
            return;
        }

        // Prefere o input próximo a um label "Twitter"
        let ancora = null;
        const labels = modal.querySelectorAll("label");
        for (const lbl of labels) {
            if (/twitter/i.test(lbl.textContent)) {
                // Pega o input dentro ou após o label
                const parent = lbl.closest("div,section,li") || lbl.parentElement;
                const input = parent?.querySelector("input") || todosInputs[todosInputs.length - 1];
                ancora = parent || input?.closest("div") || input?.parentElement;
                break;
            }
        }
        // Fallback: container do último input visível
        if (!ancora) {
            const ultimo = todosInputs[todosInputs.length - 1];
            ancora = ultimo?.closest(".form-group,.mb-3,li,[class*='field'],[class*='input-wrap']")
                     || ultimo?.parentElement;
        }

        // Copia a classe do container irmão para manter o estilo
        const classeIrmao = ancora?.className || "";

        const wrapper = document.createElement("div");
        wrapper.className = classeIrmao || "mb-3";
        wrapper.style.marginTop = "0.75rem";
        wrapper.innerHTML = `
            <label
                for="${INPUT_ID}"
                style="display:block;font-size:.875rem;font-weight:500;
                       color:var(--text-color,#1f272b);margin-bottom:.25rem;">
                CPF
            </label>
            <input
                id="${INPUT_ID}"
                type="text"
                placeholder="000.000.000-00"
                maxlength="14"
                autocomplete="off"
                style="width:100%;padding:.5rem .75rem;
                       border:1px solid var(--border-color,#d1d5db);
                       border-radius:.375rem;font-size:.875rem;
                       color:var(--text-color,#1f272b);
                       background:var(--bg-color,#fff);
                       box-sizing:border-box;"
            />
            <small id="${ERRO_ID}"
                   style="display:none;color:#ef4444;font-size:.75rem;margin-top:.2rem;">
                CPF inválido — verifique os dígitos.
            </small>`;

        ancora ? ancora.after(wrapper) : modal.appendChild(wrapper);

        // Máscara + validação visual
        const inp  = document.getElementById(INPUT_ID);
        const erro = document.getElementById(ERRO_ID);

        inp.addEventListener("input",  () => { inp.value = mascara(inp.value); erro.style.display = "none"; });
        inp.addEventListener("blur",   () => {
            const raw = inp.value.replace(/\D/g, "");
            if (raw && !cpfValido(raw)) { erro.style.display = "block"; }
        });

        // Carrega CPF salvo via API
        const username = frappe?.session?.user_info?.username || frappe?.boot?.user_info?.name;
        if (username) {
            frappe.call({
                method: METHOD_GET,
                args: { username },
                callback: r => { if (r?.message?.cpf_br) preencherCPF(r.message.cpf_br); }
            });
        }
    }

    /* ── MutationObserver ────────────────────────────────────────── */
    let tentativasModal = 0;
    const MAX_TENTATIVAS = 5;

    function processarNo(node) {
        if (!node || node.nodeType !== 1) return;

        // Tenta o nó diretamente
        if (ehModalEditProfile(node)) { injetarCPF(node); return; }

        // Tenta filhos imediatos que pareçam ser dialogs/modais
        const candidatos = node.querySelectorAll?.(
            "[role='dialog'],[class*='modal-'],[class*='dialog-'],[class*='edit-profile']"
        ) || [];
        for (const c of candidatos) {
            if (ehModalEditProfile(c)) { injetarCPF(c); return; }
        }
    }

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                // Aguarda 200ms para o Vue terminar de renderizar os inputs
                setTimeout(() => processarNo(node), 200);
            }
        }
    });

    /* ── Polling fallback — garante injeção mesmo se observer falhar ── */
    function polling() {
        if (document.getElementById(INPUT_ID)) return; // já injetado

        // Procura qualquer elemento visível que pareça o modal aberto
        const candidatos = document.querySelectorAll(
            "[role='dialog'],[class*='modal-body'],[class*='dialog-body'],[class*='edit-profile']"
        );
        for (const c of candidatos) {
            if (c.offsetParent !== null && ehModalEditProfile(c)) {
                injetarCPF(c);
                tentativasModal = 0;
                return;
            }
        }

        // O modal sumiu — reseta estado para próxima abertura
        tentativasModal++;
        if (tentativasModal > MAX_TENTATIVAS) tentativasModal = 0;
    }

    /* ── Intercept frappe.call ───────────────────────────────────── */
    function instalarIntercept() {
        if (window.__cpfBrInterceptOk) return;
        window.__cpfBrInterceptOk = true;

        const _orig = frappe.call.bind(frappe);

        frappe.call = function (opts, ...resto) {
            if (typeof opts === "string") {
                opts = { method: opts, args: resto[0] || {}, callback: resto[1] };
            } else {
                opts = { ...opts };
            }

            /* update_profile → injeta cpf_br nos args */
            if ((opts.method || "").includes("update_profile")) {
                opts.args = opts.args || {};
                opts.args.cpf_br = lerCPF();
            }

            /* get_profile_details → preenche o input com o CPF retornado */
            if ((opts.method || "").includes("get_profile_details")) {
                const _cb = opts.callback;
                opts.callback = function (r) {
                    if (_cb) _cb(r);
                    if (r?.message?.cpf_br) {
                        preencherCPF(r.message.cpf_br);
                    }
                };
            }

            return _orig(opts);
        };
    }

    /* ── Inicialização ───────────────────────────────────────────── */
    function init() {
        if (typeof frappe === "undefined" || typeof frappe.call !== "function") {
            setTimeout(init, 150);
            return;
        }

        instalarIntercept();
        observer.observe(document.body, { childList: true, subtree: true });

        // Polling a cada 800ms — captura casos em que o observer não dispara
        setInterval(polling, 800);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
