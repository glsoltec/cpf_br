"""
Utilitários para injeção de assets nas páginas web do LMS.

O hook update_website_context garante que o script CPF seja adicionado
ao contexto web mesmo em versões do Frappe que não processam o campo
web_include_js a partir do hooks.py para templates SPA (Vue 3 / Vite).
"""

_CPF_SCRIPT = "/assets/lms_frappe_cpf_br/js/lms_profile_cpf.js"


def inject_cpf_js(context):
    """
    Chamado pelo hook update_website_context antes de cada render web.

    Adiciona o script CPF à lista web_include_js do contexto de forma
    idempotente (não duplica se já estiver presente).

    O Frappe renderiza context.web_include_js em base.html:
        {%- for link in web_include_js %} {{ include_script(link) }} {%- endfor %}

    Para páginas do LMS SPA, o template _lms.html é injetado diretamente
    via setup._injetar_script_lms() no after_migrate. Esta função serve
    como camada extra para páginas Frappe convencionais e futuras versões
    do LMS que possam adotar base.html.
    """
    # Otimização: Só injeta o script de perfil CPF se a rota atual pertencer ao LMS
    path = context.get("path") or ""
    if not path.startswith("lms") and "lms" not in path:
        return

    if not isinstance(context.get("web_include_js"), list):
        context["web_include_js"] = []

    if _CPF_SCRIPT not in context["web_include_js"]:
        context["web_include_js"].append(_CPF_SCRIPT)
