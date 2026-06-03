"""
Funções executadas após instalação e migração do app cpf_br.

Garante que os Custom Fields existam independentemente dos fixtures.
O campo LMS Course Enrollment só é criado se o DocType existir no banco
(o app lms pode não estar instalado ou pode não ter sincronizado ainda).
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


# ─── Definição dos campos ─────────────────────────────────────────────────────

CAMPO_USER = {
    "User": [
        {
            "fieldname": "cpf_br",
            "fieldtype": "Data",
            "label": "CPF",
            "insert_after": "full_name",
            "description": "Cadastro de Pessoa Física — formato: 123.456.789-09",
            "placeholder": "000.000.000-00",
            "unique": 1,
            "in_list_view": 0,
            "in_standard_filter": 1,
            "search_index": 1,
            "allow_in_quick_entry": 1,
            "translatable": 0,
            "permlevel": 0,
        }
    ]
}

CAMPO_LMS = {
    "LMS Course Enrollment": [
        {
            "fieldname": "cpf_br",
            "fieldtype": "Data",
            "label": "CPF",
            "insert_after": "member_name",
            "description": "Preenchido automaticamente a partir do perfil do usuário",
            "placeholder": "000.000.000-00",
            "read_only": 0,
            "in_list_view": 1,
            "in_standard_filter": 1,
            "translatable": 0,
            "permlevel": 0,
        }
    ]
}


# ─── Hooks ────────────────────────────────────────────────────────────────────

def after_install():
    """Executado uma vez na instalação do app."""
    _criar_campos()


def after_migrate():
    """Executado a cada `bench migrate` — garante persistência após updates."""
    _criar_campos()


# ─── Lógica interna ───────────────────────────────────────────────────────────

def _criar_campos():
    """
    Cria os Custom Fields de CPF.

    - Campo User.cpf_br → sempre criado (DocType nativo do Frappe).
    - Campo LMS Course Enrollment.cpf_br → só criado se o DocType existir
      no banco. Evita LinkValidationError quando o app lms ainda não
      sincronizou seus DocTypes (ex.: primeira instalação em site vazio).
    """
    # 1. Campo no User (sempre disponível)
    create_custom_fields(CAMPO_USER, ignore_validate=True)
    frappe.db.commit()
    print("cpf_br: Custom Field User.cpf_br verificado/criado.")

    # 2. Campo no LMS — só se o DocType existir
    if frappe.db.exists("DocType", "LMS Course Enrollment"):
        create_custom_fields(CAMPO_LMS, ignore_validate=True)
        frappe.db.commit()
        print("cpf_br: Custom Field LMS Course Enrollment.cpf_br verificado/criado.")
    else:
        print(
            "cpf_br: DocType 'LMS Course Enrollment' não encontrado — "
            "campo será criado no próximo `bench migrate` após instalar o app lms."
        )
