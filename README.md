# 🇧🇷 CPF BR — App Frappe/ERPNext para LMS

**Integração completa de validação e gestão de CPF (Cadastro de Pessoa Física) para Frappe Framework v16 e ERPNext v16 — **Versão para uso em Plataforma LMS (Learning Management System)**

[![GitHub Release](https://img.shields.io/github/v/release/glsoltec/lms_frappe_cpf_br?include_prereleases)](https://github.com/glsoltec/lms_frappe_cpf_br/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Frappe v16](https://img.shields.io/badge/Frappe-v16-4B8BBE.svg)](https://github.com/frappe/frappe)
[![LMS Ready](https://img.shields.io/badge/LMS-Ready-brightgreen.svg)](#)

---

## 🎓 Versão para LMS (Learning Management System)

> **Este app é especificamente desenvolvido para funcionar com a plataforma LMS (Frappe LMS).**
> 
> Oferece validação, formatação e sincronização de CPF em matrículas de cursos, com integração completa na plataforma de educação.

### 🎯 Cenários de Uso no LMS

- **Matrículas em Cursos** — CPF obrigatório/opcional ao se matricular
- **Gestão de Alunos** — Rastrear CPF de cada aluno matriculado
- **Conformidade LGPD** — Logging automático de alterações de dados pessoais
- **Relatórios Educacionais** — Filtrar turmas por CPF do aluno
- **Integração com Sistemas** — Sincronizar CPF para sistemas externos via API

---

## 📋 Características

✅ **Validação de CPF** — Algoritmo oficial (dígitos verificadores)  
✅ **Máscara Automática** — Formata para `123.456.789-09`  
✅ **Campo Customizado** — Integrado em `User` e `LMS Enrollment`  
✅ **Sincronização** — CPF em LMS Enrollment sincroniza com User  
✅ **Avisos Inteligentes** — Notifica quando CPF é alterado  
✅ **Testes Unitários** — 14 testes, 85% cobertura  
✅ **Cross-Platform** — Windows, Linux, macOS  
✅ **Production Ready** — File locking, logging, tratamento de erros  

---

## 🎯 Casos de Uso

### 🎓 **Plataforma LMS (Primário)**

- **Matrículas em Cursos** — Registrar CPF de aluno ao se matricular
- **Portal do Aluno** — CPF no perfil de usuário do LMS
- **Modal "Edit Profile"** — Permitir aluno editar seu próprio CPF
- **Sincronização User ↔ Enrollment** — CPF sincroniza entre User e Matrícula
- **Validação em Tempo Real** — Máscaras e validação no frontend

### 🏢 **ERPNext/Frappe (Suplementar)**

- **Gestão de Usuários** — Validar e armazenar CPF em perfis
- **Conformidade LGPD** — Rastrear alterações de CPF com logging
- **Integrações** — API para validar CPF antes de operações
- **Relatórios** — Filtrar usuários/matrículas por CPF

---

## 📦 Pré-requisitos

| Componente | Versão |
|-----------|--------|
| **Frappe Framework** | v16.0+ |
| **ERPNext** | v16.0+ |
| **Frappe LMS** | v16.0+ (recomendado*) |
| **Python** | 3.10+ |

**\* Nota:** O app funciona sem LMS (campo CPF estará disponível em User), mas as funcionalidades de matrículas e integração com o portal LMS exigem o app `frappe-lms` instalado.

### Compatibilidade

```
lms_frappe_cpf_br v1.0.0
├─ Frappe Framework v16.0+
├─ ERPNext v16.0+
├─ Frappe LMS v16.0+ (opcional, recomendado)
└─ Python 3.10+
```

---

## 📖 Uso

### Validar CPF em Python

```python
from lms_frappe_cpf_br.validators import _cpf_valido, _formatar_cpf

# Validar
if _cpf_valido("111.444.777-35"):
    print("✅ CPF válido")

# Formatar
cpf_formatado = _formatar_cpf("11144477735")
# Resultado: "111.444.777-35"
```

### Validar CPF em JavaScript

```javascript
// Validar
if (window.CpfUtils.valido("11144477735")) {
    console.log("✅ CPF válido");
}

// Formatar
const formatted = window.CpfUtils.formatar("11144477735");
// Resultado: "111.444.777-35"

// Mascarar (preenchimento incremental)
const masked = window.CpfUtils.mascarar("111444777");
// Resultado: "111.444.777"
```

### Usar Campo em User

```python
import frappe

# Criar usuário com CPF
user = frappe.get_doc({
    "doctype": "User",
    "email": "joao@empresa.com",
    "first_name": "João",
    "cpf_br": "111.444.777-35"  # CPF será validado automaticamente
})
user.save()
```

### Usar Campo em LMS Enrollment

```python
# Criar matrícula com CPF
enrollment = frappe.get_doc({
    "doctype": "LMS Enrollment",
    "member": "joao@empresa.com",
    "course": "Python 101",
    "cpf_br": "123.456.789-09"  # CPF sincroniza para User automaticamente
})
enrollment.save()
```

---

## 🔐 Segurança

- **Validação em Dois Níveis** — Cliente (JS) + Servidor (Python)
- **Proteção contra Race Condition** — File locking automático
- **Logging de Alterações** — Todas as mudanças são registradas
- **LGPD Compliant** — Rastreabilidade de dados pessoais
- **Sem Dependências Maliciosas** — Apenas `portalocker` (library confiável)

---

## 📚 Documentação

- [**CONTRIBUTING.md**](CONTRIBUTING.md) — Guia para contribuir
- [**DEPLOY.md**](DEPLOY.md) — Instalação e deployment
- [**CHANGELOG.md**](CHANGELOG.md) — Histórico de versões
- [**ANALISE_CODIGO.md**](ANALISE_CODIGO.md) — Análise técnica
- [**PROXIMOS_PASSOS.md**](PROXIMOS_PASSOS.md) — Roadmap v1.1.0+

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como:
- Configurar ambiente de desenvolvimento
- Rodar testes
- Seguir guia de estilo
- Submeter pull requests

---

## 📜 Licença

MIT License — veja [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

- [Abrir issue](https://github.com/glsoltec/lms_frappe_cpf_br/issues) — Reportar bugs
- [Discussões](https://github.com/glsoltec/lms_frappe_cpf_br/discussions) — Dúvidas e ideias
- **Email:** dev@glsoltec.com.br

---

**Desenvolvido pela [GL Soltec](https://www.glsoltec.com.br)**
