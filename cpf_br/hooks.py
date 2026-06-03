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
        "dt": "Custom Field",
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
