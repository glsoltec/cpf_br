app_name        = "cpf_br"
app_title       = "Campo CPF"
app_publisher   = "Pascoal Freitas"
app_description = "Campo CPF"
app_email       = "pascoal.freitas@glsoltec.com.br"
app_license     = "mit"

# ─────────────────────────────────────────────────────────────────────────────
# Criação automática dos Custom Fields na instalação e em cada bench migrate
# ─────────────────────────────────────────────────────────────────────────────
after_install = "cpf_br.setup.after_install"
after_migrate = "cpf_br.setup.after_migrate"

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
                "LMS Course Enrollment-cpf_br",
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
    "LMS Course Enrollment": "public/js/lms_enrollment_cpf.js",
}

# ─────────────────────────────────────────────────────────────────────────────
# Server-side hooks — validação e normalização do CPF ao salvar
# ─────────────────────────────────────────────────────────────────────────────
doc_events = {
    "User": {
        "validate": "cpf_br.cpf_br.validators.validate_cpf_user",
    },
    "LMS Course Enrollment": {
        "validate": "cpf_br.cpf_br.validators.validate_cpf_lms",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Override das APIs do LMS — permite ler e salvar cpf_br pelo perfil web
# ─────────────────────────────────────────────────────────────────────────────
override_whitelisted_methods = {
    "lms.lms.api.update_profile":      "cpf_br.lms_api.update_profile",
    "lms.lms.api.get_profile_details": "cpf_br.lms_api.get_profile_details",
}

# ─────────────────────────────────────────────────────────────────────────────
# JS injetado nas páginas web — DUAS estratégias simultâneas
#
# 1. web_include_js — funciona se o template estender base.html (Frappe padrão)
# 2. update_website_context — adiciona programaticamente ao contexto web
#    (mesma finalidade, mas via Python; cobre casos onde hooks.py não é lido)
# 3. setup._injetar_script_lms() — injeta direto em _lms.html no after_migrate
#    (método definitivo: o template do LMS SPA não estende base.html)
# ─────────────────────────────────────────────────────────────────────────────
web_include_js = ["/assets/cpf_br/js/lms_profile_cpf.js"]

update_website_context = "cpf_br.website_utils.inject_cpf_js"
