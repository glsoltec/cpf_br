# 🆘 Troubleshooting — LMS Frappe CPF BR

---

## 📋 Problema #1: Campo CPF Não Aparece em Edit Profile

### ❌ Sintomas
- Modal "Edit Profile" abre, mas campo CPF não aparece
- DevTools Console mostra: `[CPF-BR] ❌ Campo CPF não injetado` ou nada
- Campo não valida ao digitar

### 🔍 Diagnóstico

```bash
# 1. Verificar se app está instalado
bench list-apps | grep lms_frappe_cpf_br

# 2. Verificar se custom field existe
bench sql "SELECT * FROM \`tabCustom Field\` WHERE name = 'User-cpf_br';"

# 3. Verificar se scripts foram injetados em _lms.html
grep -c "cpf_utils\|lms_profile_cpf" ../apps/lms/www/_lms.html

# 4. Verificar se arquivos JS existem
ls -la ../apps/lms_frappe_cpf_br/lms_frappe_cpf_br/public/js/

# 5. Ver logs
bench log -n 50 | grep cpf
```

### ✅ Soluções (Por Ordem de Probabilidade)

**Solução 1: Reinjete scripts (Mais Comum)**
```bash
bench migrate
bench clear-cache --site [seu-site]
bench restart

# Verificar resultado
grep "cpf_utils" ../apps/lms/www/_lms.html && echo "✅ Injetado"
```

**Solução 2: Rebuild do LMS (Se bench build foi executado)**
```bash
bench build --app lms
bench migrate
bench clear-cache --site [seu-site]
bench restart
```

**Solução 3: Limpar e reinstalar (Última opção)**
```bash
# Remove app
bench uninstall-app lms_frappe_cpf_br
bench remove-app lms_frappe_cpf_br

# Reinstala
bench get-app . lms_frappe_cpf_br
bench install-app lms_frappe_cpf_br
bench migrate
bench restart
```

---

## 📋 Problema #2: CPF Valida, mas Não Salva

### ❌ Sintomas
- Campo aparece e valida
- Ao clicar "Save", nada acontece
- Console mostra validação OK, mas sem save log
- Valor desaparece após reload

### 🔍 Diagnóstico

```bash
# 1. Verificar console do browser
# DevTools → Console
# Procurar: [CPF-BR] ✅ cpf_br → update_profile

# 2. Verificar chamada HTTP
# DevTools → Network
# Procurar: POST /api/method/lms.lms.api.update_profile
# Verificar body contém cpf_br

# 3. Verificar logs do servidor
bench log -n 100 | grep -A 5 "update_profile"

# 4. Verificar permissão do usuário
bench sql "SELECT email, modified FROM \`tabUser\` WHERE email='[seu-email]' LIMIT 1;"
```

### ✅ Soluções

**Solução 1: Verificar assinatura de update_profile**
```bash
# Verificar se lms_api.py está correto
grep -A 5 "def update_profile" lms_frappe_cpf_br/lms_api.py

# Deve ter: @frappe.whitelist() decorator
```

**Solução 2: Verificar permissão de usuário**
```bash
# No browser console:
frappe.call({
    method: 'frappe.client.get_value',
    args: {doctype: 'User', filters: {email: frappe.session.user}},
    callback: (r) => console.log(r.message)
});

# Deve retornar dados do usuário (sem erro 403)
```

**Solução 3: Debug via console**
```javascript
// No console do browser:
frappe.call({
    method: 'lms.lms.api.update_profile',
    args: {cpf_br: '111.444.777-35'},
    callback: (r) => {
        console.log('Response:', r);
        if (r.message) console.log('CPF Salvo:', r.message.cpf_br);
    },
    error: (r) => console.error('Erro:', r)
});

// Se retornar erro 404, override não está registrado
```

---

## 📋 Problema #3: Erro de Validação (CPF Inválido)

### ❌ Sintomas
- Digita CPF e recebe "CPF inválido"
- Validação errada mesmo com CPF correto
- Erro: "CPF inválido: 111.444.777-35"

### 🔍 Diagnóstico

```bash
# 1. Testar validação Python
bench execute "
from lms_frappe_cpf_br.validators import _cpf_valido, _formatar_cpf
print('Valido:', _cpf_valido('11144477735'))
print('Formatado:', _formatar_cpf('11144477735'))
"

# Esperado: Valido: True, Formatado: 111.444.777-35
```

### ✅ Soluções

**Solução 1: Usar CPF válido**
```python
# CPFs de teste válidos:
# 111.444.777-35
# 123.456.789-09

# Evitar sequências inválidas:
# 111.111.111-11 ❌
# 000.000.000-00 ❌
```

**Solução 2: Verificar algoritmo de dígitos verificadores**
```bash
# Testar manualmente
bench execute "
from lms_frappe_cpf_br.validators import _cpf_valido
cpf_teste = '11144477735'
result = _cpf_valido(cpf_teste)
print(f'CPF {cpf_teste}: {result}')
"
```

---

## 📋 Problema #4: Erro de Permissão

### ❌ Sintomas
- Erro: "Você só pode alterar seu próprio perfil"
- Não consegue salvar mesmo sendo o usuário
- Session user não bate

### 🔍 Diagnóstico

```bash
# 1. Verificar usuário logado
# No console do browser:
frappe.session.user

# 2. Verificar que override está ativo
bench execute "
from lms_frappe_cpf_br import lms_api
print('Update profile override:', lms_api.update_profile)
"
```

### ✅ Soluções

**Solução 1: Fazer logout e login novamente**
```bash
# Cookies podem estar desincronizados
# Log out de todos os sites
# Clear browser cookies/localStorage
# Log in novamente
```

**Solução 2: Verificar override registration**
```bash
bench execute "
import frappe
methods = frappe.get_hooks('override_whitelisted_methods')
print('Overrides:', methods)
# Deve conter: 'lms.lms.api.update_profile': 'lms_frappe_cpf_br.lms_api.update_profile'
"
```

---

## 📋 Problema #5: Erro Após Atualização de Pacotes

### ❌ Sintomas (Após `bench update`)
- CPF desaparece do Edit Profile
- Scripts não são carregados
- LMS 2.55.0+ apresenta incompatibilidade

### ✅ Solução Rápida

```bash
# 1. Reinjete scripts
bench migrate

# 2. Se LMS foi rebuilt
bench build --app lms
bench migrate

# 3. Limpe cache
bench clear-cache --site [seu-site]
bench restart

# 4. Teste
# Acesse https://seu-site/lms e teste Edit Profile
```

### 🔗 Compatibilidade

| Versão | Status | Notas |
|--------|--------|-------|
| LMS 2.50.0 | ✅ OK | Testado |
| LMS 2.55.0 | ✅ OK | Testado |
| LMS 2.60.0+ | ? | Reportar issues |
| ERPNext 16.20 | ✅ OK | Testado |
| ERPNext 16.23 | ✅ OK | Testado |

---

## 🆘 Ainda Não Funciona?

### Coletar Informações para Suporte

```bash
# Executar este script e enviar output
echo "=== VERSÕES ===" && \
bench version && \
frappe --version && \
echo "" && \
echo "=== APPS ===" && \
bench list-apps | grep -E "lms|erpnext|frappe" && \
echo "" && \
echo "=== CUSTOM FIELD ===" && \
bench sql "SELECT * FROM \`tabCustom Field\` WHERE name='User-cpf_br' \G" && \
echo "" && \
echo "=== SCRIPTS INJETADOS ===" && \
grep -o "cpf_utils\|lms_profile_cpf" ../apps/lms/www/_lms.html | sort | uniq -c && \
echo "" && \
echo "=== LOGS CPF ===" && \
bench log -n 50 | grep -i cpf || echo "Sem logs CPF"
```

### Contato

📧 **Email:** dev@glsoltec.com.br  
🐛 **Issues:** https://github.com/glsoltec/lms_frappe_cpf_br/issues  
💬 **Discussões:** https://github.com/glsoltec/lms_frappe_cpf_br/discussions

---

## 📚 Recursos

- [DEPLOY.md](DEPLOY.md) — Guia de instalação
- [CONTRIBUTING.md](CONTRIBUTING.md) — Desenvolvimento
- [README.md](README.md) — Documentação geral
- [CHANGELOG.md](CHANGELOG.md) — Histórico de mudanças

---

**Last Updated:** 2026-06-15  
**Version:** 1.0.0
