"""
Patch executado na instalação/migração do app cpf_br.
Garante que os Custom Fields sejam criados mesmo se o fixture
não rodar automaticamente (ex.: bench migrate em site existente).
"""

import json
import os
import frappe


def execute():
    fixtures_dir = os.path.join(
        os.path.dirname(__file__), "..", "custom_fields"
    )

    for filename in ("user_cpf.json", "lms_enrollment_cpf.json"):
        filepath = os.path.join(fixtures_dir, filename)
        if not os.path.exists(filepath):
            frappe.log_error(f"cpf_br patch: arquivo não encontrado — {filepath}")
            continue

        with open(filepath) as f:
            fields = json.load(f)

        for field_def in fields:
            name = field_def.get("name")
            if not frappe.db.exists("Custom Field", name):
                doc = frappe.get_doc(field_def)
                doc.insert(ignore_permissions=True)
                frappe.db.commit()
                print(f"cpf_br: Custom Field '{name}' criado.")
            else:
                print(f"cpf_br: Custom Field '{name}' já existe, ignorado.")
