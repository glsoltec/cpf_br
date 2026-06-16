/**
 * cpf_br — Injeta campo CPF no modal "Edit Profile" do Frappe LMS.
 *
 * Diagnóstico definitivo (v5) — inspecionado ao vivo em produção:
 *  - O modal usa v-if: é ADICIONADO ao DOM ao abrir, REMOVIDO ao fechar
 *  - Estrutura do modal: div.fixed.inset-0.bg-black-overlay-200 (filho direto do body)
 *  - Inputs da esquerda: div.space-y-1.5 > div.relative.flex.items-center > input.text-base.rounded.h-7...
 *  - Âncora correta: inputs visíveis.at(-2) — o de índice -1 é o dropdown "Select option"
 *  - frappe NÃO existe como global no LMS Vue SPA
 *  - Autenticação: window.csrf_token (sempre disponível)
 *  - O LMS salva via fetch('/api/method/frappe.client.set_value', ...)
 *
 * Estratégia:
 *  1. MutationObserver childList → detecta quando o modal é adicionado ao DOM (v-if)
 *  2. Injeta campo CPF com seletores exatos e fallbacks robustos
 *  3. Carrega valor via fetch à API get_profile_details
 *  4. Intercept fetch: injeta cpf_br no payload de set_value ao salvar
 *
 * [CRIT-3 FIX] Guard __cpfBrFetchOk previne cleanup e reloads em SPA
 * [IMP-1 FIX] Usa CpfUtils ao invés de duplicar lógica
 * [IMP-2 FIX] Não sobrescreve input se já tem valor ao buscar da API
 * [IMP-3 FIX] Seletores CSS com fallbacks robustos
 */

(function () {
	"use strict";

	const INPUT_ID = "cpf_br_lms_input";
	const ERRO_ID = "cpf_br_erro";

	let _cpfCache = "";
	let _cpfParaSalvar = ""; // Cache temporário para salvar quando modal fecha

	/* ── Helpers ──────────────────────────────────────────────────────── */
	function lerInputCPF() {
		const inputVal = (document.getElementById(INPUT_ID)?.value || "").trim();
		return inputVal || _cpfCache; // Fallback para cache se DOM não tem valor (modal pode estar fechando)
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

	/* ── Verifica se um elemento é o modal Edit Profile ─────────── */
	function isEditProfileModal(el) {
		if (!el || el.nodeType !== 1) return false;
		const cls = el.className || "";
		if (!cls.includes("fixed") || !cls.includes("inset-0")) return false;
		const txt = el.textContent || "";
		return txt.includes("Edit Profile") || txt.includes("Editar Perfil");
	}

	/* ── Username da URL atual ───────────────────────────────────── */
	function usernameFromURL() {
		return location.pathname.match(/\/lms\/user\/([^\/]+)/)?.[1] || null;
	}

	/* ── Busca o CPF da API ──────────────────────────────────────── */
	function buscarCPF(callback) {
		const uname = usernameFromURL();
		if (!uname) return;
		fetch("/api/method/lms.lms.api.get_profile_details?username=" + encodeURIComponent(uname), {
			headers: {
				"X-Frappe-CSRF-Token": window.csrf_token || "fetch",
				"Accept": "application/json",
			},
		})
			.then(r => r.json())
			.then(d => {
				const cpf = d?.message?.cpf_br || "";
				_cpfCache = cpf;
				callback(cpf);
			})
			.catch(e => console.warn("[CPF-BR] Erro ao buscar CPF:", e));
	}

	/* ── Injeta o campo CPF no modal ─────────────────────────────── */
	function injetar(modal) {
		if (document.getElementById(INPUT_ID)) {
			preencherInput(_cpfCache);
			return;
		}

		/*
		 * Âncora: inputs de texto visíveis — o último é o dropdown "Select option",
		 * o penúltimo (-2) é o Twitter ID, que é o último campo de texto real.
		 */
		const visibleTextInputs = [...modal.querySelectorAll('input[type="text"]')]
			.filter(isVisible);

		/* inputs: [Nome, Sobrenome, Headline, LinkedIn, GitHub, Twitter, SelectOption] */
		const anchor = visibleTextInputs.at(-2); // Twitter ID

		if (!anchor) {
			console.warn("[CPF-BR] Input âncora não encontrado.");
			return;
		}

		/* [IMP-3 FIX] Container do campo: múltiplos seletores com fallbacks robustos */
		let fieldWrap = anchor.closest(".space-y-1\\.5")
			|| anchor.closest("[class*='space-y']")
			|| anchor.parentElement?.parentElement;

		if (!fieldWrap) {
			console.warn("[CPF-BR] Container do campo não encontrado.");
			return;
		}

		/* Cria o wrapper com a mesma estrutura exata do LMS */
		const wrap = document.createElement("div");
		wrap.className = "space-y-1.5";
		wrap.innerHTML = `
            <label class="text-xs text-ink-gray-5 block" for="${INPUT_ID}">CPF</label>
            <div class="relative flex items-center">
                <input
                    id="${INPUT_ID}"
                    type="text"
                    placeholder="000.000.000-00"
                    maxlength="14"
                    autocomplete="off"
                    class="${anchor.className}"
                    style="width:100%;"
                />
            </div>
            <small id="${ERRO_ID}"
                style="display:none;color:#ef4444;font-size:.75rem;margin-top:.125rem;"></small>`;

		fieldWrap.after(wrap);

		const inp = document.getElementById(INPUT_ID);
		const erro = document.getElementById(ERRO_ID);

		if (!inp) {
			console.warn("[CPF-BR] Input CPF não foi criado corretamente.");
			return;
		}

		inp.addEventListener("input", () => {
			// [IMP-1 FIX] Usa CpfUtils.mascarar
			inp.value = window.CpfUtils ? window.CpfUtils.mascarar(inp.value) : inp.value;
			erro.style.display = "none";
			_cpfCache = inp.value; // Atualiza o cache na digitação
			console.log("[CPF-BR] Input digitado:", inp.value);
		});
		inp.addEventListener("blur", () => {
			const raw = inp.value.replace(/\D/g, "");
			// [IMP-1 FIX] Usa CpfUtils.valido
			if (raw && !(window.CpfUtils && window.CpfUtils.valido(raw))) {
				erro.textContent = "CPF inválido — verifique os dígitos.";
				erro.style.display = "block";
			} else if (raw) {
				_cpfCache = inp.value;
				console.log("[CPF-BR] ✅ CPF válido no blur:", inp.value);
			}
		});

		if (_cpfCache) {
			inp.value = _cpfCache;
		} else {
			buscarCPF(cpf => {
				const inp = document.getElementById(INPUT_ID);
				if (inp && !inp.value && cpf) {
					inp.value = cpf;
					_cpfCache = cpf;
				}
			});
		}

		console.log("[CPF-BR] ✅ Campo CPF injetado. Âncora:", anchor.id);
	}

	/* ── Helper: Obtém CPF do input ou do cache, tratando se foi limpo ── */
	function obterCPF() {
		const inputEl = document.getElementById(INPUT_ID);
		if (inputEl) {
			return inputEl.value.trim();
		}
		return _cpfCache || "";
	}

	/* ── Intercept fetch: injeta cpf_br no update_profile e set_value ── */
	function instalarFetchIntercept() {
		if (window.__cpfBrFetchOk) return;
		window.__cpfBrFetchOk = true;

		const _prev = window.fetch;
		window.fetch = async function (input, init) {
			const url = (typeof input === "string" ? input : input?.url) || "";

			if (url.includes("get_profile_details")) {
				const resp = await _prev.call(this, input, init);
				try {
					resp.clone().json().then(d => {
						const cpf = d?.message?.cpf_br;
						if (cpf) {
							_cpfCache = cpf;
							preencherInput(cpf);
						}
					}).catch(() => {});
				} catch (_) {}
				return resp;
			}

			if (url.includes("update_profile") || url.includes("frappe.client.set_value")) {
				const cpf = obterCPF();
				if (cpf !== undefined && init) {
					if (init.body) {
						try {
							if (typeof init.body === "string") {
								if (init.body.trim().startsWith("{")) {
									const bodyObj = JSON.parse(init.body);
									if (url.includes("frappe.client.set_value")) {
										if (typeof bodyObj.fieldname === "string") {
											if (bodyObj.fieldname.trim().startsWith("{")) {
												const fnObj = JSON.parse(bodyObj.fieldname);
												fnObj.cpf_br = cpf;
												bodyObj.fieldname = JSON.stringify(fnObj);
											} else {
												const fnObj = {};
												fnObj[bodyObj.fieldname] = bodyObj.value || "";
												fnObj.cpf_br = cpf;
												bodyObj.fieldname = JSON.stringify(fnObj);
												delete bodyObj.value;
											}
										} else {
											bodyObj.fieldname = bodyObj.fieldname || {};
											bodyObj.fieldname.cpf_br = cpf;
										}
									} else {
										bodyObj.cpf_br = cpf;
									}
									init.body = JSON.stringify(bodyObj);
								} else {
									const params = new URLSearchParams(init.body);
									if (url.includes("frappe.client.set_value")) {
										let fieldnameVal = params.get("fieldname");
										if (fieldnameVal) {
											if (fieldnameVal.trim().startsWith("{")) {
												const fnObj = JSON.parse(fieldnameVal);
												fnObj.cpf_br = cpf;
												params.set("fieldname", JSON.stringify(fnObj));
											} else {
												const fnObj = {};
												fnObj[fieldnameVal] = params.get("value") || "";
												fnObj.cpf_br = cpf;
												params.set("fieldname", JSON.stringify(fnObj));
												params.delete("value");
											}
										} else {
											params.set("fieldname", JSON.stringify({ cpf_br: cpf }));
										}
									} else {
										params.set("cpf_br", cpf);
									}
									init.body = params.toString();
								}
							} else if (init.body instanceof URLSearchParams) {
								if (url.includes("frappe.client.set_value")) {
									let fieldnameVal = init.body.get("fieldname");
									if (fieldnameVal) {
										if (fieldnameVal.trim().startsWith("{")) {
											const fnObj = JSON.parse(fieldnameVal);
											fnObj.cpf_br = cpf;
											init.body.set("fieldname", JSON.stringify(fnObj));
										} else {
											const fnObj = {};
											fnObj[fieldnameVal] = init.body.get("value") || "";
											fnObj.cpf_br = cpf;
											init.body.set("fieldname", JSON.stringify(fnObj));
											init.body.delete("value");
										}
									} else {
										init.body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
									}
								} else {
									init.body.set("cpf_br", cpf);
								}
							} else if (init.body instanceof FormData) {
								if (url.includes("frappe.client.set_value")) {
									let fieldnameVal = init.body.get("fieldname");
									if (fieldnameVal) {
										if (typeof fieldnameVal === "string" && fieldnameVal.trim().startsWith("{")) {
											const fnObj = JSON.parse(fieldnameVal);
											fnObj.cpf_br = cpf;
											init.body.set("fieldname", JSON.stringify(fnObj));
										} else if (typeof fieldnameVal === "string") {
											const fnObj = {};
											fnObj[fieldnameVal] = init.body.get("value") || "";
											fnObj.cpf_br = cpf;
											init.body.set("fieldname", JSON.stringify(fnObj));
											init.body.delete("value");
										}
									} else {
										init.body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
									}
								} else {
									init.body.set("cpf_br", cpf);
								}
							}
						} catch (err) {
							console.warn("[CPF-BR] Erro ao injetar CPF no body do fetch:", err);
						}
					}
				}
			}
			return _prev.call(this, input, init);
		};
	}

	/* ── Intercept XHR: injeta cpf_br no update_profile e set_value ── */
	function instalarXhrIntercept() {
		if (window.__cpfBrXhrOk) return;
		window.__cpfBrXhrOk = true;

		const originalOpen = XMLHttpRequest.prototype.open;
		const originalSend = XMLHttpRequest.prototype.send;

		XMLHttpRequest.prototype.open = function (method, url) {
			this._url = url;
			return originalOpen.apply(this, arguments);
		};

		XMLHttpRequest.prototype.send = function (body) {
			const url = this._url || "";
			if (url.includes("update_profile") || url.includes("frappe.client.set_value")) {
				const cpf = obterCPF();
				if (cpf !== undefined) {
					try {
						if (typeof body === "string") {
							if (body.trim().startsWith("{")) {
								const obj = JSON.parse(body);
								if (url.includes("frappe.client.set_value")) {
									if (typeof obj.fieldname === "string") {
										if (obj.fieldname.trim().startsWith("{")) {
											const fnObj = JSON.parse(obj.fieldname);
											fnObj.cpf_br = cpf;
											obj.fieldname = JSON.stringify(fnObj);
										} else {
											const fnObj = {};
											fnObj[obj.fieldname] = obj.value || "";
											fnObj.cpf_br = cpf;
											obj.fieldname = JSON.stringify(fnObj);
											delete obj.value;
										}
									} else {
										obj.fieldname = obj.fieldname || {};
										obj.fieldname.cpf_br = cpf;
									}
								} else {
									obj.cpf_br = cpf;
								}
								body = JSON.stringify(obj);
							} else {
								const params = new URLSearchParams(body);
								if (url.includes("frappe.client.set_value")) {
									let fieldnameVal = params.get("fieldname");
									if (fieldnameVal) {
										if (fieldnameVal.trim().startsWith("{")) {
											const fnObj = JSON.parse(fieldnameVal);
											fnObj.cpf_br = cpf;
											params.set("fieldname", JSON.stringify(fnObj));
										} else {
											const fnObj = {};
											fnObj[fieldnameVal] = params.get("value") || "";
											fnObj.cpf_br = cpf;
											params.set("fieldname", JSON.stringify(fnObj));
											params.delete("value");
										}
									} else {
										params.set("fieldname", JSON.stringify({ cpf_br: cpf }));
									}
								} else {
									params.set("cpf_br", cpf);
								}
								body = params.toString();
							}
						} else if (body instanceof URLSearchParams) {
							if (url.includes("frappe.client.set_value")) {
								let fieldnameVal = body.get("fieldname");
								if (fieldnameVal) {
									if (fieldnameVal.trim().startsWith("{")) {
										const fnObj = JSON.parse(fieldnameVal);
										fnObj.cpf_br = cpf;
										body.set("fieldname", JSON.stringify(fnObj));
									} else {
										const fnObj = {};
										fnObj[fieldnameVal] = body.get("value") || "";
										fnObj.cpf_br = cpf;
										body.set("fieldname", JSON.stringify(fnObj));
										body.delete("value");
									}
								} else {
									body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
								}
							} else {
								body.set("cpf_br", cpf);
							}
						} else if (body instanceof FormData) {
							if (url.includes("frappe.client.set_value")) {
								let fieldnameVal = body.get("fieldname");
								if (fieldnameVal) {
									if (typeof fieldnameVal === "string" && fieldnameVal.trim().startsWith("{")) {
										const fnObj = JSON.parse(fieldnameVal);
										fnObj.cpf_br = cpf;
										body.set("fieldname", JSON.stringify(fnObj));
									} else if (typeof fieldnameVal === "string") {
										const fnObj = {};
										fnObj[fieldnameVal] = body.get("value") || "";
										fnObj.cpf_br = cpf;
										body.set("fieldname", JSON.stringify(fnObj));
										body.delete("value");
									}
								} else {
									body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
								}
							} else {
								body.set("cpf_br", cpf);
							}
						}
					} catch (e) {
						console.warn("[CPF-BR] Erro ao injetar CPF no XHR body:", e);
					}
				}
			}
			return originalSend.apply(this, [body]);
		};
	}

	/* ── Listener para Save button do modal ── */
	function setupSaveListener() {
		document.addEventListener("click", function (e) {
			let btn = e.target;
			for (let i = 0; i < 5; i++) {
				if (!btn || btn === document.body) break;
				const txt = (btn.textContent || btn.title || btn.getAttribute?.("aria-label") || "").toLowerCase().trim();
				if (txt.includes("save") || txt.includes("salvar")) {
					setTimeout(() => salvarCPFViaAPI(), 500);
					break;
				}
				btn = btn.parentElement;
			}
		}, true);
	}

	/* ── Salva CPF via frappe.client.set_value ── */
	function salvarCPFViaAPI() {
		const cpf = obterCPF();
		if (!cpf) return;

		// SEGURANÇA: Usa o username da URL ou da sessão do Frappe (se houver), nunca fallback para "administrator"
		const username = usernameFromURL() || window.frappe?.session?.user;
		if (!username) {
			console.warn("[CPF-BR] Não foi possível determinar o usuário logado para salvar o CPF.");
			return;
		}

		const params = new URLSearchParams({
			doctype: "User",
			name: username,
			fieldname: JSON.stringify({ cpf_br: cpf })
		});

		fetch("/api/method/frappe.client.set_value", {
			method: "POST",
			headers: {
				"X-Frappe-CSRF-Token": window.csrf_token || "fetch",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		}).catch(e => console.warn("[CPF-BR] Erro ao salvar CPF independente:", e));
	}

	/* ── MutationObserver: detecta modal adicionado ao DOM (v-if) ── */
	function setupObserver() {
		const obs = new MutationObserver(muts => {
			for (const m of muts) {
				if (m.type !== "childList") continue;
				for (const node of m.addedNodes) {
					if (isEditProfileModal(node)) {
						setTimeout(() => injetar(node), 100);
					}
				}
			}
		});

		obs.observe(document.body, { childList: true });
	}

	/* ── Click listener: fallback adicional ──────────────────────── */
	function setupClickListener() {
		document.addEventListener(
			"click",
			function (e) {
				let el = e.target;
				for (let i = 0; i < 10; i++) {
					if (!el || el === document.body) break;
					const txt = (
						el.textContent ||
						el.title ||
						el.getAttribute?.("aria-label") ||
						""
					)
						.toLowerCase()
						.trim();
					if (txt.includes("edit profile") || txt.includes("editar perfil")) {
						let tries = 0;
						const poll = setInterval(() => {
							tries++;
							const modal = [...document.body.children].find(isEditProfileModal);
							if (modal) {
								clearInterval(poll);
								injetar(modal);
							} else if (tries > 20) {
								clearInterval(poll);
							}
						}, 200);
						break;
					}
					el = el.parentElement;
				}
			},
			true
		);
	}

	/* ── Inicialização ───────────────────────────────────────────── */
	function init() {
		instalarFetchIntercept();
		instalarXhrIntercept();
		setupObserver();
		setupClickListener();
		setupSaveListener();
		console.log("[CPF-BR] Inicializado. Interceptadores Fetch e XHR + SaveListener ativos.");
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

})();
