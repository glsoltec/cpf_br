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
				_cpfCache = inp.value; // Atualiza o cache ao sair do campo
				console.log("[CPF-BR] ✅ CPF válido no blur:", inp.value);
			}
		});

		/* [IMP-2 FIX] Preenche com cache, ou busca, mas NÃO sobrescreve se já tem valor */
		if (_cpfCache) {
			inp.value = _cpfCache;
		} else {
			buscarCPF(cpf => {
				// Só preenche se input ainda está vazio
				const inp = document.getElementById(INPUT_ID);
				if (inp && !inp.value && cpf) {
					inp.value = cpf;
					_cpfCache = cpf; // Atualiza o cache com a busca inicial
				}
			});
		}

		console.log("[CPF-BR] ✅ Campo CPF injetado. Âncora:", anchor.id);
	}

	/* ── Intercept fetch: injeta cpf_br no update_profile e set_value ── */
	function instalarFetchIntercept() {
		console.log("[CPF-BR] instalarFetchIntercept() chamada. __cpfBrFetchOk =", window.__cpfBrFetchOk);

		// [CRIT-3 FIX] Guard previne múltiplas camadas de interceptor em SPA com hot reload
		if (window.__cpfBrFetchOk) {
			console.log("[CPF-BR] Fetch interceptor já ativo — ignorando reload.");
			return;
		}
		window.__cpfBrFetchOk = true;
		console.log("[CPF-BR] ⚙️ Instalando fetch interceptor...");

		/* Respeita patch já existente (ex: lms_portal_lock.js) */
		const _prev = window.fetch;
		console.log("[CPF-BR] Fetch original capturado:", typeof _prev);

		window.fetch = async function (input, init) {
			const url = (typeof input === "string" ? input : input?.url) || "";

			// [DEBUG] Log TODAS as requisições para descobrir qual URL o LMS usa
			if (url.includes("api") || url.includes("method")) {
				console.log("[CPF-BR] Fetch interceptado:", url);
			}

			/* Intercept get_profile_details: captura cpf_br da resposta */
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

			/* Intercept update_profile ou set_value: injeta cpf_br no payload */
			if (url.includes("update_profile") || url.includes("frappe.client.set_value")) {
				const cpf = lerInputCPF() || _cpfCache;
				console.log("[CPF-BR] Request detectado no fetch:", url, "CPF lido:", cpf || "(vazio)");
				if (cpf && init) {
					if (init.body) {
						try {
							if (typeof init.body === "string") {
								if (init.body.trim().startsWith("{")) {
									const bodyObj = JSON.parse(init.body);
									bodyObj.cpf_br = cpf;
									if (url.includes("frappe.client.set_value")) {
										if (bodyObj.update_dict) {
											const dict = JSON.parse(bodyObj.update_dict);
											dict.cpf_br = cpf;
											bodyObj.update_dict = JSON.stringify(dict);
										} else {
											bodyObj.fieldname = bodyObj.fieldname || {};
											if (typeof bodyObj.fieldname === "string") {
												const fnObj = JSON.parse(bodyObj.fieldname);
												fnObj.cpf_br = cpf;
												bodyObj.fieldname = JSON.stringify(fnObj);
											} else {
												bodyObj.fieldname.cpf_br = cpf;
											}
										}
									}
									init.body = JSON.stringify(bodyObj);
									console.log("[CPF-BR] CPF injetado no body JSON do fetch.");
								} else {
									const params = new URLSearchParams(init.body);
									params.set("cpf_br", cpf);
									if (url.includes("frappe.client.set_value")) {
										let dictStr = params.get("update_dict");
										if (dictStr) {
											const dict = JSON.parse(dictStr);
											dict.cpf_br = cpf;
											params.set("update_dict", JSON.stringify(dict));
										} else {
											params.set("fieldname", JSON.stringify({ cpf_br: cpf }));
										}
									}
									init.body = params.toString();
									console.log("[CPF-BR] CPF injetado no body URL-encoded do fetch.");
								}
							} else if (init.body instanceof URLSearchParams) {
								init.body.set("cpf_br", cpf);
								if (url.includes("frappe.client.set_value")) {
									let dictStr = init.body.get("update_dict");
									if (dictStr) {
										const dict = JSON.parse(dictStr);
										dict.cpf_br = cpf;
										init.body.set("update_dict", JSON.stringify(dict));
									} else {
										init.body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
									}
								}
								console.log("[CPF-BR] CPF injetado no body URLSearchParams do fetch.");
							} else if (init.body instanceof FormData) {
								init.body.set("cpf_br", cpf);
								if (url.includes("frappe.client.set_value")) {
									let dictStr = init.body.get("update_dict");
									if (dictStr) {
										const dict = JSON.parse(dictStr);
										dict.cpf_br = cpf;
										init.body.set("update_dict", JSON.stringify(dict));
									} else {
										init.body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
									}
								}
								console.log("[CPF-BR] CPF injetado no body FormData do fetch.");
							}
						} catch (err) {
							console.warn("[CPF-BR] Erro ao injetar CPF no body do fetch:", err);
						}
					} else {
						const params = new URLSearchParams({ cpf_br: cpf });
						if (url.includes("frappe.client.set_value")) {
							params.set("doctype", "User");
							params.set("name", frappe.session?.user || "administrator");
							params.set("update_dict", JSON.stringify({ cpf_br: cpf }));
						}
						init.body = params.toString();
						init.headers = {
							...(init.headers || {}),
							"Content-Type": "application/x-www-form-urlencoded"
						};
						console.log("[CPF-BR] Criado body com CPF para request (fetch).");
					}
				}
			}

			return _prev.call(this, input, init);
		};
	}

	/* ── Intercept XHR: injeta cpf_br no update_profile e set_value ── */
	function instalarXhrIntercept() {
		console.log("[CPF-BR] instalarXhrIntercept() chamada. __cpfBrXhrOk =", window.__cpfBrXhrOk);

		if (window.__cpfBrXhrOk) {
			console.log("[CPF-BR] XHR interceptor já ativo — ignorando.");
			return;
		}
		window.__cpfBrXhrOk = true;
		console.log("[CPF-BR] ⚙️ Instalando XHR interceptor...");

		const originalOpen = XMLHttpRequest.prototype.open;
		const originalSend = XMLHttpRequest.prototype.send;

		XMLHttpRequest.prototype.open = function (method, url) {
			this._url = url;
			this._method = method;
			return originalOpen.apply(this, arguments);
		};

		XMLHttpRequest.prototype.send = function (body) {
			const url = this._url || "";
			if (url.includes("update_profile") || url.includes("frappe.client.set_value")) {
				const cpf = lerInputCPF() || _cpfCache;
				console.log("[CPF-BR] Request detectado no XHR:", url, "CPF lido:", cpf || "(vazio)");
				if (cpf) {
					try {
						if (typeof body === "string") {
							if (body.trim().startsWith("{")) {
								const obj = JSON.parse(body);
								obj.cpf_br = cpf;
								if (url.includes("frappe.client.set_value")) {
									if (obj.update_dict) {
										const dict = JSON.parse(obj.update_dict);
										dict.cpf_br = cpf;
										obj.update_dict = JSON.stringify(dict);
									} else {
										obj.fieldname = obj.fieldname || {};
										if (typeof obj.fieldname === "string") {
											const fnObj = JSON.parse(obj.fieldname);
											fnObj.cpf_br = cpf;
											obj.fieldname = JSON.stringify(fnObj);
										} else {
											obj.fieldname.cpf_br = cpf;
										}
									}
								}
								body = JSON.stringify(obj);
								console.log("[CPF-BR] CPF injetado no body JSON do XHR.");
							} else {
								const params = new URLSearchParams(body);
								params.set("cpf_br", cpf);
								if (url.includes("frappe.client.set_value")) {
									let dictStr = params.get("update_dict");
									if (dictStr) {
										const dict = JSON.parse(dictStr);
										dict.cpf_br = cpf;
										params.set("update_dict", JSON.stringify(dict));
									} else {
										params.set("fieldname", JSON.stringify({ cpf_br: cpf }));
									}
								}
								body = params.toString();
								console.log("[CPF-BR] CPF injetado no body URL-encoded do XHR.");
							}
						} else if (body instanceof URLSearchParams) {
							body.set("cpf_br", cpf);
							if (url.includes("frappe.client.set_value")) {
								let dictStr = body.get("update_dict");
								if (dictStr) {
									const dict = JSON.parse(dictStr);
									dict.cpf_br = cpf;
									body.set("update_dict", JSON.stringify(dict));
								} else {
									body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
								}
							}
							console.log("[CPF-BR] CPF injetado no body URLSearchParams do XHR.");
						} else if (body instanceof FormData) {
							body.set("cpf_br", cpf);
							if (url.includes("frappe.client.set_value")) {
								let dictStr = body.get("update_dict");
								if (dictStr) {
									const dict = JSON.parse(dictStr);
									dict.cpf_br = cpf;
									body.set("update_dict", JSON.stringify(dict));
								} else {
									body.set("fieldname", JSON.stringify({ cpf_br: cpf }));
								}
							}
							console.log("[CPF-BR] CPF injetado no body FormData do XHR.");
						}
					} catch (e) {
						console.warn("[CPF-BR] Erro ao injetar CPF no XHR body:", e);
					}
				}
			}
			return originalSend.apply(this, [body]);
		};
	}

	/* ── MutationObserver: detecta modal adicionado ao DOM (v-if) ── */
	function setupObserver() {
		const obs = new MutationObserver(muts => {
			for (const m of muts) {
				if (m.type !== "childList") continue;
				for (const node of m.addedNodes) {
					if (isEditProfileModal(node)) {
						console.log("[CPF-BR] Modal Edit Profile adicionado ao DOM.");
						/* Pequeno delay para Vue terminar de renderizar os inputs */
						setTimeout(() => injetar(node), 100);
					}
				}
			}
		});

		/* Observa apenas filhos diretos do body (onde Teleport insere o modal) */
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
						console.log("[CPF-BR] Clique Edit Profile detectado — aguardando modal...");
						/* Polling de fallback caso MutationObserver não dispare */
						let tries = 0;
						const poll = setInterval(() => {
							tries++;
							const modal = [...document.body.children].find(isEditProfileModal);
							if (modal) {
								clearInterval(poll);
								injetar(modal);
							} else if (tries > 20) {
								clearInterval(poll);
								console.warn("[CPF-BR] Modal não encontrado após 4s.");
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
		console.log("[CPF-BR] Inicializado. Interceptadores Fetch e XHR ativos.");
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

})();
