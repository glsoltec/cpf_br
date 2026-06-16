"""
Patch executado na instalação/migração do app cpf_br.

Garante que os Custom Fields sejam criados mesmo se o fixture
não rodar automaticamente (ex.: bench migrate em site existente).

O campo LMS Enrollment é ignorado silenciosamente se o
DocType ainda não existir (app lms não instalado).
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
            frappe.log_error(
                title="lms_frappe_cpf_br patch",
                message=f"Arquivo de fixture não encontrado: {filepath}",
            )
            continue

        with open(filepath) as f: # nosemgrep
            fields = json.load(f)

        for field_def in fields:
            doctype_alvo = field_def.get("dt")
            name = field_def.get("name")

            # Pula se o DocType alvo não existir (ex.: LMS não instalado)
            if not frappe.db.exists("DocType", doctype_alvo):
                print(
                    f"lms_frappe_cpf_br patch: DocType '{doctype_alvo}' não encontrado — "
                    f"campo '{name}' ignorado."
                )
                continue

            if not frappe.db.exists("Custom Field", name):
                doc = frappe.get_doc(field_def)
                doc.insert(ignore_permissions=True)
                frappe.db.commit()
                print(f"lms_frappe_cpf_br patch: Custom Field '{name}' criado.")
            else:
                print(f"lms_frappe_cpf_br patch: Custom Field '{name}' já existe, ignorado.")
