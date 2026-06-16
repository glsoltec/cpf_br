# 🚀 Próximos Passos — Melhorias de Código

**Status Atual:** ✅ v1.0.0 em Produção (com 3 fixes críticos aplicados)

---

## ✅ Implementado (Sprint Atual)

- ✅ **Version bump** — `__init__.py` = 1.0.0
- ✅ **Python requirements** — Corrigido para >=3.10
- ✅ **Security fix** — Validação de permissão em `update_profile()`
- ✅ **Análise de código** — ANALISE_CODIGO.md com 10 recomendações

**Commits:**
- `460a735` — chore: Version e Python requirements
- `e7a0780` — security: Permission validation
- `7da8c1a` — docs: Code analysis

---

## 📋 Sprint Próximo (v1.1.0) — High Priority

### 1. **Testes de Integração** 🎯

**Criar:** `lms_frappe_cpf_br/tests/test_hooks.py` e `test_lms_api.py`

- Testar validação de CPF inválido (rejeita)
- Testar formatação de CPF válido
- Testar permission check em update_profile
- Testar sincronização LMS Enrollment ↔ User

**Tempo:** 1-2 horas  
**Commit:** `test: Add integration tests for hooks and LMS API`

---

### 2. **Refatoração de File Locking** 🎯

**Arquivo:** `lms_frappe_cpf_br/setup.py`

Usar Strategy pattern para eliminar 100+ linhas de código duplicado:
- PortalolockerStrategy (Windows/Linux/Mac)
- FcntlStrategy (Unix/Linux)
- FallbackStrategy (sem lock)

**Benefício:** Fácil manutenção, testabilidade, extensibilidade

**Tempo:** 1-1.5 horas  
**Commit:** `refactor: Extract lock strategy pattern`

---

### 3. **Melhorar Docstrings** 🎯

**Arquivos:** `lms_api.py`, `validators.py`, `setup.py`

Adicionar:
- Exemplos de uso
- Casos de erro esperados
- Contexto de quando é chamado
- Tipos de retorno detalhados

**Tempo:** 30 minutos  
**Commit:** `docs: Improve docstrings with examples and use cases`

---

## 🟡 Médio Priority (Sprint+1)

### 4. **Exception Handling Específico**
Não capturar `Exception` genérico — ser específico sobre o erro esperado

**Tempo:** 20 minutos

---

### 5. **Retry Logic em File Operations**
Para sistemas com I/O lento, adicionar retry com backoff exponencial

**Tempo:** 30 minutos

---

### 6. **Caching de Validação de CPF**
Reduz CPU ~40% em operações bulk onde mesmo CPF é validado múltiplas vezes

**Tempo:** 30 minutos

---

## 🎯 Checklist para v1.1.0

- [ ] Testes de integração completos
- [ ] File locking refatorado
- [ ] Docstrings 100%
- [ ] Exception handling específico
- [ ] Retry logic implementado
- [ ] Caching implementado
- [ ] CHANGELOG.md atualizado
- [ ] Git tag v1.1.0 criada

---

## 📊 Métricas Esperadas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Type Hints | 60% | 100% |
| Docstrings | 70% | 100% |
| Test Coverage | 85% | 95%+ |
| Linhas duplicadas | ~150 | ~50 |

---

**Última atualização:** 2026-06-15
