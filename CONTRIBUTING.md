# 🤝 Contribuindo para LMS Frappe CPF BR

Obrigado por querer contribuir! Este documento descreve como configurar seu ambiente de desenvolvimento.

---

## 🛠️ Setup de Desenvolvimento

### Pré-requisitos

- Frappe Framework v16.0+
- ERPNext v16.0+  
- Python 3.10+
- Git
- Bench CLI

### Clonar e Instalar

```bash
# Clone o repositório
git clone https://github.com/glsoltec/lms_frappe_cpf_br.git
cd lms_frappe_cpf_br

# Instale em seu bench (seu ERPNext local)
# (Copie o repositório para a pasta local apps/lms_frappe_cpf_br)
bench setup requirements --app lms_frappe_cpf_br
bench --site [seu-site] install-app lms_frappe_cpf_br

# Execute migração
bench --site [seu-site] migrate

# Limpe cache
bench clear-cache --site [seu-site]
```

### Configurar Pre-commit (Opcional mas Recomendado)

O projeto usa `pre-commit` para validar código antes de commits.

```bash
# Instale pre-commit
pip install pre-commit

# Ative no repositório
pre-commit install

# Execute manualmente (toda vez que commitar)
pre-commit run --all-files
```

---

## 🧪 Testes

### Rodar Testes Unitários

```bash
# Testes de validação de CPF
bench --site [seu-site] execute lms_frappe_cpf_br.tests.test_validators

# Ou com pytest (se instalado)
pytest lms_frappe_cpf_br/tests/ -v

# Com cobertura
pytest lms_frappe_cpf_br/tests/ --cov=lms_frappe_cpf_br
```

### Verificar Estilo de Código

```bash
# Verificar com ruff
ruff check lms_frappe_cpf_br/

# Formatar automaticamente
ruff format lms_frappe_cpf_br/

# Type checking (se mypy instalado)
mypy lms_frappe_cpf_br/ --ignore-missing-imports
```

---

## 📋 Processo de Contribuição

1. **Fork o repositório**
   ```bash
   # Via GitHub UI
   ```

2. **Crie uma branch**
   ```bash
   git checkout -b feature/sua-feature
   # ou
   git checkout -b fix/seu-bugfix
   ```

3. **Faça suas mudanças**
   - Siga PEP-8 para Python
   - Adicione type hints
   - Adicione docstrings
   - Adicione/atualize testes

4. **Commit com mensagem descritiva**
   ```bash
   git commit -m "feat: Adicionar nova funcionalidade X"
   # ou
   git commit -m "fix: Corrigir problema Y"
   ```

5. **Push para sua branch**
   ```bash
   git push origin feature/sua-feature
   ```

6. **Abra um Pull Request no GitHub**
   - Descreva o que foi mudado
   - Referencie issues relacionadas (#123)
   - Certifique-se que testes passaram

---

## 📝 Guia de Estilo

### Python

- Seguir [PEP-8](https://pep8.org/)
- Usar type hints em 100% das funções
- Docstrings em formato Google
- Máximo 110 caracteres por linha (configurado em ruff)

```python
def funcao_exemplo(param1: str, param2: int) -> bool:
    """
    Descrição breve da função.
    
    Descrição mais longa se necessário.
    
    Args:
        param1: Descrição do param1
        param2: Descrição do param2
    
    Returns:
        Descrição do retorno
    
    Raises:
        ValueError: Se algo der errado
    
    Example:
        >>> resultado = funcao_exemplo("test", 42)
        >>> print(resultado)
        True
    """
```

### Git Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição breve>

<descrição detalhada opcional>

<footer opcional>
```

Tipos:
- `feat` — Nova feature
- `fix` — Correção de bug
- `docs` — Documentação
- `style` — Formatação (sem lógica)
- `refactor` — Refatoração
- `perf` — Performance
- `test` — Testes
- `chore` — Build, deps, etc

Exemplo:
```
feat(validators): Adicionar validação de CNPJ

- Implementar função _cnpj_valido()
- Implementar função _formatar_cnpj()
- Adicionar testes unitários
- Atualizar documentação

Closes #123
```

---

## 🐛 Reportando Bugs

Use a [issue template](https://github.com/glsoltec/lms_frappe_cpf_br/issues/new) para relatar bugs com:

- Versão do Frappe/ERPNext
- Python version
- Passos para reproduzir
- Comportamento esperado vs real
- Logs relevantes

---

## 📖 Recursos

- [Frappe Framework Documentation](https://frappeframework.com)
- [ERPNext Development Guide](https://docs.erpnext.com)
- [PEP-8 Style Guide](https://pep8.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📞 Dúvidas?

Abra uma [discussion](https://github.com/glsoltec/lms_frappe_cpf_br/discussions) ou uma [issue](https://github.com/glsoltec/lms_frappe_cpf_br/issues).

**Obrigado por contribuir!** ❤️
