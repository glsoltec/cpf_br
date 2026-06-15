app_name        = "lms_frappe_cpf_br"
app_title       = "LMS Frappe CPF Brasil"
app_publisher   = "Pascoal Freitas"
app_description = "LMS Frappe CPF Brasil"
app_email       = "pascoal.freitas@glsoltec.com.br"
app_license     = "mit"

# ─────────────────────────────────────────────────────────────────────────────
# Criação automática dos Custom Fields na instalação e em cada bench migrate
# ─────────────────────────────────────────────────────────────────────────────
after_install = "lms_frappe_cpf_br.setup.after_install"
after_migrate = "lms_frappe_cpf_br.setup.after_migrate"
before_uninstall = "lms_frappe_cpf_br.setup.before_uninstall"

# ─────────────────────────────────────────────────────────────────────────────
# Fixtures — garante que os Custom Fields sejam versionados e reimportados
# automaticamente a cada `bench migrate` (persiste após atualizações do ERPNext)
# ─────────────────────────────────────────────────────────────────────────────
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [
            ["name", "in", [
                "User-cpf_br",
                "LMS Enrollment-cpf_br",
            ]]
        ],
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# Client Scripts — formulários do Desk (admin)
# Valida e formata CPF em tempo real nos formulários do ERPNext
# ─────────────────────────────────────────────────────────────────────────────
doctype_js = {
    "User":                  "public/js/user_cpf.js",
    "LMS Enrollment": "public/js/lms_enrollment_cpf.js",
}

# ─────────────────────────────────────────────────────────────────────────────
# Server-side hooks — validação e normalização do CPF ao salvar
# ─────────────────────────────────────────────────────────────────────────────
doc_events = {
    "User": {
        "validate": "lms_frappe_cpf_br.validators.validate_cpf_user",
    },
    "LMS Enrollment": {
        "validate": "lms_frappe_cpf_br.validators.validate_cpf_lms",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Override das APIs do LMS — permite ler e salvar cpf_br pelo perfil web
# ─────────────────────────────────────────────────────────────────────────────
override_whitelisted_methods = {
    "lms.lms.api.update_profile":      "lms_frappe_cpf_br.lms_api.update_profile",
    "lms.lms.api.get_profile_details": "lms_frappe_cpf_br.lms_api.get_profile_details",
}

# ─────────────────────────────────────────────────────────────────────────────
# JS injetado nas páginas web — TRÊS estratégias simultâneas
#
# 1. web_include_js — funciona se o template estender base.html (Frappe padrão)
#    [IMP-1] cpf_utils.js PRIMEIRO (utilitários compartilhados)
#    Depois scripts que dependem de window.CpfUtils
#
# 2. update_website_context — adiciona programaticamente ao contexto web
#    (mesma finalidade, mas via Python; cobre casos onde hooks.py não é lido)
#
# 3. setup._injetar_script_lms() — injeta direto em _lms.html no after_migrate
#    (método definitivo: o template do LMS SPA não estende base.html)
# ─────────────────────────────────────────────────────────────────────────────
web_include_js = [
	"/assets/lms_frappe_cpf_br/js/cpf_utils.js",        # [IMP-1] 1º: utilitários compartilhados
	"/assets/lms_frappe_cpf_br/js/lms_profile_cpf.js",  # 2º: script que usa CpfUtils
]

update_website_context = "lms_frappe_cpf_br.website_utils.inject_cpf_js"
