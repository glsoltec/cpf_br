from . import __version__ as app_version

app_name = "cpf_br"
app_title = "CPF BR"
app_publisher = "glsoltec"
app_description = "Adiciona campo CPF ao perfil do usuário e ao perfil LMS no ERPNext v16"
app_email = "contato@glsoltec.com.br"
app_license = "MIT"
app_version = "0.0.1"

# ------------------------------------------------------------
# Fixtures — exportar os Custom Fields junto com o app
# ------------------------------------------------------------
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

# ------------------------------------------------------------
# JS de client-side para validação do CPF no formulário
# ------------------------------------------------------------
doctype_js = {
    "User": "public/js/user_cpf.js",
    "LMS Course Enrollment": "public/js/lms_enrollment_cpf.js",
}

# ------------------------------------------------------------
# Garante criação dos campos na instalação e em cada migrate
# ------------------------------------------------------------
after_install = "cpf_br.setup.after_install"
after_migrate = "cpf_br.setup.after_migrate"

# ------------------------------------------------------------
# Override das APIs de perfil do LMS para incluir CPF
# ------------------------------------------------------------
override_whitelisted_methods = {
    "lms.lms.api.update_profile":      "cpf_br.lms_api.update_profile",
    "lms.lms.api.get_profile_details": "cpf_br.lms_api.get_profile_details",
}

# JS injetado nas páginas web do LMS (adiciona campo CPF ao modal Edit Profile)
# Caminho resolvido após `bench build --app cpf_br`
web_include_js = ["/assets/cpf_br/js/lms_profile_cpf.js"]

# ------------------------------------------------------------
# Hooks de servidor para validação do CPF antes de salvar
# ------------------------------------------------------------
doc_events = {
    "User": {
        "validate": "cpf_br.cpf_br.validators.validate_cpf_user",
    },
    "LMS Course Enrollment": {
        "validate": "cpf_br.cpf_br.validators.validate_cpf_lms",
    },
}
