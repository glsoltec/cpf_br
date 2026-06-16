# Changelog — CPF BR para LMS

Todas as mudanças notáveis neste projeto (versão para Frappe LMS) serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**App:** cpf_br  
**Plataforma:** Frappe LMS v16  
**Licença:** MIT  
**Mantido por:** GL Soltec

---

## [1.0.0] — 2026-06-15 — Versão LMS

> **Versão estável para uso em Frappe LMS v16**

### ✨ Novo (Integração LMS)

- **🎓 Modal "Edit Profile"** — Campo CPF em /lms para alunos editarem próprio CPF
- **🔄 Sincronização LMS Enrollment ↔ User** — Bidirecional e automática
- **⚠️ Avisos de Alteração** — Notifica quando CPF é diferente do User
- **📝 Logging de Auditoria** — Rastreia todas as mudanças de CPF
- **🎯 Auto-preenchimento em Matrículas** — CPF vem do perfil do aluno

### ✨ Novo (Infraestrutura)

- **[CRIT-1] File Locking em migrações do bench (bench-migrate)** — Previne race condition com portalocker
- **[CRIT-2] Sincronização Fail-Fast** — CPF salvo ANTES de chamar LMS
- **[CRIT-3] Guard Fetch Interceptor** — Previne memory leak em hot reload do SPA
- **[IMP-1] Módulo cpf_utils.js** — Centraliza validação, formatação e máscara de CPF
- **[IMP-2] Validação Inteligente de Campo** — Não sobrescreve input se usuário já digitou
- **[IMP-3] Seletores CSS Robustos** — Fallbacks em cascata para compatibilidade
- **[IMP-4] Validação CPF Explícita** — Clareza no cálculo de dígitos verificadores
- **Testes Unitários Completos** — 14 testes, 85% de cobertura
- **Documentação Extensiva** — DEPLOY.md, CORREÇÕES_IMPLEMENTADAS.md, etc

### 🔧 Melhorado

- Bundle size reduzido em ~2KB (-17%)
- Eliminadas ~110 linhas de código duplicado
- Logging detalhado de operações críticas
- Performance em sincronização CPF (async non-blocking)
- Resiliência em falhas de LMS
- Debuggabilidade com console logs estruturados

### 🐛 Corrigido

- Race condition em `_injetar_script_lms()` com múltiplos workers
- Inconsistência CPF/LMS quando `update_profile()` falha
- Memory leak em fetch interceptor durante hot reload
- Acoplamento CSS em seletores de elemento
- Sobrescrita de input durante async CPF fetch

### 🔐 Segurança

- Validação em dois níveis (cliente + servidor)
- File locking cross-platform (Windows/Linux/macOS)
- Logging de todas as alterações de CPF
- Nenhuma dependência maliciosa (apenas portalocker)
- LGPD compliant — rastreabilidade de dados

---

## [0.0.1] — 2026-06-01

### ✨ Novo

- App inicial com suporte básico a CPF
- Campo `cpf_br` em User
- Validação simples de CPF
- Integração com LMS Course Enrollment
- Suporte a ERPNext v16 e Frappe v16

### 🐛 Corrigido

- Nomeação correta do DocType "LMS Enrollment" (era "LMS Course Enrollment")
- Referências consistentes em hooks.py, validators.py, patches

---

## 🎓 Compatibilidade LMS

Esta versão foi desenvolvida e testada para:

```
✅ Frappe LMS v16.0+
✅ Frappe Framework v16.0+
✅ ERPNext v16.0+
✅ Python 3.10+
```

### Funcionalidades por Componente

| Feature | Sem LMS | Com LMS |
|---------|---------|---------|
| Campo CPF em User | ✅ | ✅ |
| Validação CPF | ✅ | ✅ |
| Máscara Automática | ✅ | ✅ |
| Campo em Enrollment | ❌ | ✅ |
| Modal "Edit Profile" | ❌ | ✅ |
| Sincronização User ↔ Enrollment | ❌ | ✅ |
| Portal /lms integrado | ❌ | ✅ |

---

## Convenções de Commit

Este projeto segue [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     Nova feature
fix:      Correção de bug
docs:     Mudanças em documentação
style:    Formatação de código (sem lógica)
refactor: Refatoração (sem mudança de comportamento)
perf:     Melhoria de performance
test:     Testes
chore:    Build, deps, etc
```

Exemplo:
```
feat(lms_enrollment): Adicionar sincronização CPF bidirecional

- CPF em LMS Enrollment agora sincroniza para User
- Aviso quando CPF é diferente do original
- Logging para auditoria

Closes #42
```

---

## Versioning

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR** — Breaking changes (incompatível com versão anterior)
- **MINOR** — Novas features (compatível)
- **PATCH** — Bug fixes (compatível)

Exemplo: `1.0.0` = MAJOR.MINOR.PATCH

---

## Como Contribuir

1. Faça um fork do repositório
2. Crie uma branch (`git checkout -b feature/sua-feature`)
3. Commit com mensagens descritivas (`git commit -m 'feat: descrição'`)
4. Push para a branch (`git push origin feature/sua-feature`)
5. Abra um Pull Request

---

## Roadmap

### v1.1.0 (Próxima)

- [ ] Dashboard de CPFs únicos/duplicados
- [ ] Validação com serviço externo (Receita Federal)
- [ ] Exportação para LGPD compliance
- [ ] API REST para validação CPF

### v2.0.0 (Futuro)

- [ ] Suporte para CNPJ (PJ)
- [ ] Integração com Sistema Eleitoral
- [ ] Multi-documento de identificação
- [ ] Portal de autoatendimento para CPF

---

## Suporte

Para reportar bugs ou solicitar features:

1. [Abrir issue no GitHub](https://github.com/glsoltec/cpf_br/issues/new)
2. Incluir:
   - Versão ERPNext/Frappe
   - Python version
   - Logs relevantes
   - Passos para reproduzir

---

## Licença

MIT License — veja [LICENSE](LICENSE) para detalhes.

---

**Mantido pela [GL Soltec](https://www.glsoltec.com.br)**  
**Contato:** dev@glsoltec.com.br
