"""
Funções executadas após instalação e migração do app cpf_br.
Garante que os Custom Fields existam independentemente dos fixtures.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


CUSTOM_FIELDS = {
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
    ],
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
    ],
}


def after_install():
    """Executado uma vez na instalação do app."""
    _criar_campos()


def after_migrate():
    """Executado a cada `bench migrate` — garante persistência após updates."""
    _criar_campos()


def _criar_campos():
    create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
    frappe.db.commit()
    print("cpf_br: Custom Fields verificados/criados com sucesso.")
