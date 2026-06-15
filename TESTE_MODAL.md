# 🧪 Teste Modal "Edit Profile" — CPF BR

**Guia para testar se o Modal Edit Profile está salvando CPF corretamente.**

---

## 🎯 Pré-requisitos

- ✅ App cpf_br instalado
- ✅ App frappe-lms instalado
- ✅ Usuário logado na plataforma LMS
- ✅ Chrome/Firefox com DevTools (F12)

---

## 📋 Passo a Passo

### 1️⃣ Preparar Ambiente

```bash
# Terminal — Verificar que ambas as apps estão instaladas
bench list-apps | grep -E "cpf_br|lms"

# Output esperado:
# cpf_br
# lms
```

### 2️⃣ Ir para Portal LMS

1. Abrir navegador: `https://seu-site/lms`
2. Logar com usuário de teste
3. Clicar no **avatar** (canto superior direito)
4. Clicar em **"Edit Profile"** ou **"Editar Perfil"**

### 3️⃣ Abrir DevTools

Pressionar **F12** para abrir Developer Tools:
- Ir para aba **Console**
- Limpar logs anteriores

### 4️⃣ Verificar se Campo CPF Aparece

No modal Edit Profile, deve aparecer:
- 📝 Campo **"CPF"** depois do campo Twitter ID
- 📋 Label "CPF"
- 📌 Placeholder "000.000.000-00"

### 5️⃣ Testar Preenchimento

**Console esperado:**
```
[CPF-BR] Modal Edit Profile adicionado ao DOM.
[CPF-BR] ✅ Campo CPF injetado. Âncora: (id do Twitter input)
```

Se **NÃO** aparecer, copiar os logs para troubleshooting.

### 6️⃣ Digitar CPF de Teste

```
CPF: 111.444.777-35
ou: 11144477735 (será formatado automaticamente)
```

**Console esperado durante digitação:**
```
[CPF-BR] Input digitado: 111.444.777-35
[CPF-BR] ✅ CPF válido no blur: 111.444.777-35
```

### 7️⃣ Clicar "Save" (Salvar)

Clicar no botão **Save** ou **Salvar** do modal.

**Console esperado:**
```
[CPF-BR] ✅ cpf_br → update_profile: 111.444.777-35
```

Se **NÃO** aparecer, o problema é no fetch interceptor.

### 8️⃣ Verificar Logs do Servidor

```bash
# Terminal — Ver logs do app
bench log -n 50 | grep "cpf_br"

# Esperado:
# [cpf_br] update_profile recebido: cpf_br='111.444.777-35', user=seu-usuario
# [cpf_br] ✅ CPF salvo com sucesso: 111.444.777-35 para user=seu-usuario
```

### 9️⃣ Confirmar Persistência

1. Recarregar página (F5)
2. Abrir Edit Profile novamente
3. **Esperado:** Campo CPF preenchido com `111.444.777-35`

### 🔟 Verificar no Desk

1. Ir para `https://seu-site/app/user`
2. Abrir seu usuário
3. **Esperado:** Campo CPF contem `111.444.777-35`

---

## ✅ Teste de Sucesso

Todos os passos abaixo devem passar:

- [ ] Campo CPF aparece no modal
- [ ] Pode digitar CPF
- [ ] CPF é formatado automaticamente
- [ ] Console mostra `✅ cpf_br → update_profile`
- [ ] Logs do servidor mostram `✅ CPF salvo com sucesso`
- [ ] Recarregar página mantém CPF preenchido
- [ ] Desk User mostra CPF salvo

---

## 🐛 Troubleshooting

### ❌ Campo CPF NÃO aparece no modal

```javascript
// No console, rodar:
document.getElementById("cpf_br_lms_input")

// Se retornar null, o campo não foi criado
// Se retornar HTMLElement, o campo existe
```

**Soluções:**
```bash
# 1. Limpar cache
bench clear-cache --site seu-site

# 2. Verificar se cpf_utils.js foi carregado
# (deve estar no <head> antes de lms_profile_cpf.js)

# 3. Reconstruir LMS
bench build --app lms

# 4. Reiniciar workers
bench restart
```

### ❌ Console mostra "Fetch interceptor já ativo"

É normal em hot reload. Significa que:
- Página foi recarregada
- Script foi re-executado
- Guard `__cpfBrFetchOk` está funcionando

Não é um erro — é proteção contra memory leak.

### ❌ CPF não é formatado ao digitar

**Problema:** `window.CpfUtils` não está disponível

**Solução:**
```bash
# Verificar que cpf_utils.js foi carregado:
# Browser > DevTools > Sources > Assets > cpf_br/js > cpf_utils.js

# Deve existir e ser carregado ANTES de lms_profile_cpf.js
```

### ❌ CPF válido mas console mostra erro de validação

**Problema:** Dígitos verificadores incorretos

**Solução:**
```javascript
// No console, validar:
window.CpfUtils.valido("11144477735")

// Deve retornar true
// Se falso, o CPF é inválido
```

**CPFs de teste válidos:**
```
111.444.777-35
123.456.789-09
```

### ❌ Console mostra "Erro intercept update_profile"

**Problema:** Erro ao interceptar fetch

**Solução:**
```bash
# Ver erro completo no console
# Copiar erro e abrir issue no GitHub
```

### ❌ Logs do servidor não mostram "[cpf_br]"

**Problema:** update_profile não foi chamado ou não recebeu cpf_br

**Soluções:**
```bash
# 1. Verificar que lms_api.py foi carregado
bench execute "from cpf_br.lms_api import update_profile; print('✅ Loaded')"

# 2. Verificar que função está whitelisted
bench execute "
import frappe
methods = frappe.get_hooks('override_whitelisted_methods')
print('Methods:', methods)
"

# 3. Ativar debug de requests
# Em browser DevTools > Network, procurar:
# - POST /api/method/lms.lms.api.update_profile
# - Verificar body contem "cpf_br=..."
```

---

## 📊 Checklist de Debug

Use este checklist se algo não funcionar:

### JavaScript
- [ ] `window.CpfUtils` existe? → `console.log(window.CpfUtils)`
- [ ] `cpf_utils.js` foi carregado? → DevTools > Sources
- [ ] `lms_profile_cpf.js` foi carregado? → DevTools > Sources
- [ ] `__cpfBrFetchOk` está true? → `console.log(window.__cpfBrFetchOk)`
- [ ] Modal aparece ao clicar "Edit Profile"?
- [ ] Campo CPF foi injetado no DOM? → `document.getElementById("cpf_br_lms_input")`

### Network
- [ ] Requisição `get_profile_details` retorna `cpf_br`?
- [ ] Requisição `update_profile` envia `cpf_br`?
- [ ] Response status é 200 OK?

### Server
- [ ] Logs mostram `[cpf_br]` ao salvar?
- [ ] `frappe.session.user` é correto?
- [ ] User.cpf_br custom field existe? → `bench execute "frappe.get_doc('Custom Field', 'User-cpf_br')"`

### Database
- [ ] CPF foi persistido? → `bench sql "SELECT cpf_br FROM \`tabUser\` WHERE email='seu-usuario'"`

---

## 📞 Relatório de Bug

Se o teste falhar, coletar:

```markdown
## Ambiente
- Site: seu-site
- Frappe: [versão]
- ERPNext: [versão]
- LMS: [versão]
- cpf_br: [versão — deve ser 1.0.0]

## Console Error
[Copiar erro completo do DevTools > Console]

## Network Request
[Copiar response de update_profile]

## Server Logs
[Copiar logs: bench log -n 50 | grep cpf_br]

## Passos para Reproduzir
1. Logar em /lms
2. Clicar Edit Profile
3. ...

## Esperado
Campo CPF deve aparecer e salvar.

## Real
Descrever o que acontece diferente.
```

---

**Data do teste:** _______________  
**Resultado:** ✅ Passou / ❌ Falhou

---

Se precisar de ajuda, abra issue em:
https://github.com/glsoltec/cpf_br/issues
