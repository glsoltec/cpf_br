# cpf_br

App Frappe/ERPNext v16 que adiciona o campo **CPF** (Cadastro de Pessoa Física) ao perfil do usuário (`User`) e ao perfil do LMS (`LMS Course Enrollment`).

---

## Funcionalidades

| Recurso | Detalhe |
|---------|---------|
| Campo `cpf_br` no `User` | Inserido após `full_name`, com índice de busca e filtro padrão |
| Campo `cpf_br` no `LMS Course Enrollment` | Auto-preenchido a partir do perfil `User` do membro |
| Validação client-side | Máscara e validação por dígitos verificadores no formulário |
| Validação server-side | Hook `validate` impede salvar CPF inválido |
| Formatação automática | Normaliza para `123.456.789-09` antes de persistir |

---

## Instalação

```bash
# No servidor com bench ativo
cd /home/frappe/frappe-bench

# 1. Obter o app
bench get-app https://github.com/glsoltec/cpf_br

# 2. Instalar no site
bench --site <seu-site> install-app cpf_br

# 3. Rodar migrações (cria os Custom Fields)
bench --site <seu-site> migrate

# 4. Rebuild assets (registra os JS)
bench build --app cpf_br
```

---

## Estrutura

```
cpf_br/
├── cpf_br/
│   ├── __init__.py          # versão do app
│   ├── hooks.py             # fixtures, doctype_js, doc_events
│   ├── patches.txt          # lista de patches
│   ├── cpf_br/
│   │   ├── __init__.py
│   │   ├── validators.py    # validação/formatação de CPF (Python)
│   │   └── custom_fields/
│   │       ├── user_cpf.json              # Custom Field no User
│   │       └── lms_enrollment_cpf.json    # Custom Field no LMS Course Enrollment
│   ├── patches/
│   │   └── create_cpf_custom_fields.py   # garante criação via migrate
│   └── public/
│       └── js/
│           ├── user_cpf.js                # validação client User
│           └── lms_enrollment_cpf.js      # validação client LMS + auto-fill
├── setup.py
├── requirements.txt
├── pyproject.toml
└── .gitignore
```

---

## Comportamento do campo LMS

Ao selecionar um **membro** no formulário `LMS Course Enrollment`, o campo CPF é preenchido automaticamente com o valor do perfil `User` correspondente. Caso o usuário não tenha CPF cadastrado, o campo permanece editável para preenchimento manual.

---

## Compatibilidade

- ERPNext v16
- Frappe Framework v16
- Python 3.11+
- Node.js 20+

---

## Licença

MIT — glsoltec.com.br
