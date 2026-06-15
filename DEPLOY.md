# 🚀 Guia de Deploy — App `cpf_br` v1.0.0 (Com Correções)

**Versão:** cpf_br v0.0.1 + Correções Críticas v1.0.0  
**Data de Release:** 2026-06-15  
**Status:** ✅ Pronto para Produção

---

## 📋 Pré-requisitos

- ERPNext v16
- Frappe Framework v16
- Python 3.10+
- Bench CLI
- (Opcional) App LMS se usar integração de CPF em matrículas

---

## 1️⃣ Instalação em Nova Instância

```bash
# Preparar bench
cd /home/frappe/frappe-bench

# Baixar app
bench get-app cpf_br https://github.com/glsoltec/cpf_br --branch version-16

# Instalar dependências
bench pip install portalocker>=2.7.0

# Instalar app no site
bench install-app cpf_br --site [seu-site]

# Executar migrate (ativa file locking)
bench migrate --site [seu-site]

# Verificar logs
bench log -n 20 | grep "cpf_br"
```

**Saída Esperada:**
```
cpf_br: Custom Field User.cpf_br verificado/criado.
cpf_br: Custom Field LMS Course Enrollment.cpf_br verificado/criado.
cpf_br: ✅ Script CPF injetado com sucesso em _lms.html (portalocker).
[CPF-BR] v5 inicializado. Modal usa v-if (childList observer ativo).
```

---

## 2️⃣ Atualização em Instância Existente

```bash
# Backup IMPORTANTE
bench backup

# Pull latest version
cd /home/frappe/frappe-bench/apps/cpf_br
git pull origin version-16

# Voltar para bench
cd /home/frappe/frappe-bench

# Instalar dependências adicionadas
bench pip install portalocker>=2.7.0

# Migrate (ativa novo código)
bench migrate --site [seu-site]

# Reiniciar workers (IMPORTANTE)
bench restart
```

---


---

## 3️⃣ Validação Pós-Deploy

### A. Verificar Instalação

```bash
# Check field User.cpf_br existe
bench --site [seu-site] execute "
import frappe
field = frappe.get_doc('Custom Field', 'User-cpf_br')
print('✅ User.cpf_br instalado:', field.name)
"

# Check field LMS (se instalado)
bench --site [seu-site] execute "
import frappe
if frappe.db.exists('DocType', 'LMS Course Enrollment'):
    field = frappe.get_doc('Custom Field', 'LMS Course Enrollment-cpf_br')
    print('✅ LMS Course Enrollment.cpf_br instalado:', field.name)
else:
    print('⚠️ LMS não instalado (campo será criado depois)')
"
```

### B. Testar Validação de CPF

```bash
# Rodar testes unitários
bench --site [seu-site] execute cpf_br.tests.test_validators

# Ou com pytest (se instalado)
cd /home/frappe/frappe-bench
python -m pytest apps/cpf_br/cpf_br/tests/test_validators.py -v
```

**Saída Esperada:**
```
test_cpf_formato_valid (__main__.TestCPFValidation) ... ok
test_cpf_invalido_sequence (__main__.TestCPFValidation) ... ok
test_cpf_valido_with_formatting (__main__.TestCPFValidation) ... ok
test_cpf_valido_without_formatting (__main__.TestCPFValidation) ... ok
...
Ran 14 tests in 0.002s

OK
```

### C. Testar em Desktop (Desk)

1. Abrir Frappe Desk: `https://[seu-site]/app/user`
2. Criar novo usuário ou editar existente
3. Preencher campo CPF com: `111.444.777-35`
4. Campo deve validar e formatar automaticamente
5. Salvar e recarregar — valor deve persistir

### D. Testar em LMS (se instalado)

1. Ir para LMS Course Enrollment: `https://[seu-site]/lms/courses`
2. Criar/editar matrícula
3. Selecionar usuário em "Member"
4. Campo CPF deve auto-popular a partir do perfil do usuário
5. Salvar matrícula

### E. Testar Modal Edit Profile (LMS Web)

1. Logar na web como usuário do LMS: `https://[seu-site]/lms`
2. Ir para perfil (avatar no canto superior direito)
3. Clicar em "Edit Profile"
4. Modal deve ter campo CPF
5. Preencher CPF: `111.444.777-35`
6. Clicar Save
7. Recarregar página — CPF deve persistir

### F. Verificar File Locking (CRIT-1)

```bash
# Simular 2 migrations simultâneas
# Terminal 1:
bench migrate --site [seu-site]

# Terminal 2 (logo após):
bench migrate --site [seu-site]

# Ambas devem completar sem erro "lock timeout"
# Logs devem mostrar:
# "cpf_br: ✅ Script CPF injetado com sucesso em _lms.html (portalocker)."
```

### G. Verificar Bundle Size

```bash
# Comparar antes/depois da refatoração [IMP-1]
# Script consolidado deve ser ~2KB menor que antes

ls -lh /home/frappe/frappe-bench/public/assets/cpf_br/js/
# cpf_utils.js: ~2KB
# user_cpf.js: ~1KB (antes: ~2.5KB)
# lms_profile_cpf.js: ~6KB (antes: ~7KB)
# Total: ~9KB (antes: ~11.5KB)
```

---

## 4️⃣ Troubleshooting

### ❌ Problema: "ModuleNotFoundError: No module named 'portalocker'"

**Solução:**
```bash
bench pip install portalocker>=2.7.0
bench migrate --site [seu-site]
```

### ❌ Problema: Custom Field não criado

**Solução:**
```bash
# Forçar recriação
bench --site [seu-site] execute "
from cpf_br.setup import after_install
after_install()
"

# Ou rodar migrate novamente
bench migrate --site [seu-site]
```

### ❌ Problema: "_lms.html não encontrado"

**Solução (se LMS está instalado):**
```bash
# Construir LMS primeiro
bench build --app lms

# Depois migrate
bench migrate --site [seu-site]
```

### ❌ Problema: Campo CPF não aparece em Edit Profile (LMS Web)

**Solução:**
```bash
# Verificar se script foi injetado
grep "cpf_br_lms_input" /home/frappe/frappe-bench/apps/lms/lms/www/_lms.html

# Se não estiver, rodar após_install manualmente
bench --site [seu-site] execute "
from cpf_br.setup import _injetar_script_lms
_injetar_script_lms()
"

# Limpar cache do navegador (Ctrl+Shift+Del)
```

### ❌ Problema: Validação CPF não funciona em cliente

**Solução:**
```bash
# Verificar console do navegador (F12 > Console)
# Deve haver mensagens: "[CPF-BR] v5 inicializado"

# Se não houver, recarregar página (Ctrl+F5)
# Se continuar, executar:
bench clear-cache --site [seu-site]
```

---

## 5️⃣ Rollback (Se Necessário)

```bash
# Voltar para versão anterior
cd /home/frappe/frappe-bench/apps/cpf_br
git checkout [tag-ou-hash-anterior]

# Voltar banco (restaurar backup)
bench restore /path/to/backup.sql.gz

# Migrate para estado anterior
bench migrate --site [seu-site]

# Restart
bench restart
```

---

## 6️⃣ Monitoramento Pós-Deploy

### Logs Importantes

```bash
# Ver logs de cpf_br
bench log -n 100 | grep "cpf_br"

# Ver erros de validação
bench log -n 100 | grep "CPF inválido"

# Ver performance do file locking
bench log -n 100 | grep "lock"
```

### Metricas a Monitorar

- **Taxa de erro de validação:** `Validação de CPF` errors por dia
- **Performance do migrate:** Tempo para completar com file locking
- **Cache hit rate:** `_cpfCache` em lms_profile_cpf.js (target: >70%)
- **Tamanho do bundle:** Redução esperada de ~2KB

---

## 7️⃣ Configuração em Produção (Recomendações)

### A. Habilitar HTTPS/TLS

Configure HTTPS/TLS em seu servidor web (Nginx/Apache) ou proxy reverso (Traefik).

### B. Habilitar CORS (se API externa)

```python
# Se integrar com LMS externo
# Em site_config.json:
{
    "cors_enabled": 1,
    "allowed_origins": ["https://seu-lms.com"],
    "allowed_methods": ["GET", "POST", "PUT"],
    "allowed_headers": ["X-Frappe-CSRF-Token"]
}
```

### C. Backup Automático

```bash
# Adicionar cron job (backup diário às 2 da manhã)
0 2 * * * /home/frappe/frappe-bench/bench backup >> /var/log/frappe-backup.log 2>&1
```

---

## 9️⃣ Release Notes — v1.0.0

### ✅ Novo

- [CRIT-1] File locking com portalocker (evita race condition)
- [CRIT-2] Salva CPF antes de chamar LMS (consistência)
- [CRIT-3] Guard fetch interceptor (previne memory leak em SPA)
- [IMP-1] Módulo cpf_utils.js centralizado
- [IMP-2] Não sobrescreve input ao buscar de API
- [IMP-3] Seletores CSS com fallbacks
- [IMP-4] Validação CPF mais legível
- Testes unitários completos (`test_validators.py`)

### 🔧 Melhorado

- Performance: -2KB no bundle size
- Manutenção: -110 linhas de código duplicado
- Resiliência: File locking evita conteúdo corrompido
- Debuggabilidade: Logging detalhado de operações críticas

### 🐛 Corrigido

- Race condition em `bench migrate` paralelo
- Inconsistência CPF/LMS em update_profile
- Memory leak em reload de SPA
- Acoplamento CSS em seletores

---

## 8️⃣ Suporte e Contato

**Mantedor:** Pascoal Freitas  
**Email:** pascoal.freitas@glsoltec.com.br  
**GitHub:** https://github.com/glsoltec/cpf_br

Para reportar bugs ou solicitar features:
1. Abrir issue no GitHub
2. Incluir version ERPNext/Frappe
3. Incluir logs relevantes
4. Descrever passos para reproduzir

---

**Status:** ✅ Pronto para Deploy em Produção

Última atualização: 2026-06-15
