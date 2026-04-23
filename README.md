# Medicano

Plataforma de gestão de clínicas e agendamentos médicos.

## Estrutura do monorepo

```
medicano-project/
├── apps/
│   ├── api/          # Backend NestJS (TypeScript + MongoDB + Redis)
│   └── web/          # Frontend React
├── packages/
│   └── types/        # Tipos TypeScript compartilhados
└── medicano_crew/    # Automação de desenvolvimento com CrewAI
```

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Backend     | NestJS · TypeScript · Mongoose    |
| Banco       | MongoDB                           |
| Sessão      | Redis (ioredis) — tokens revogáveis |
| Frontend    | React                             |
| Automação   | CrewAI + Aider                    |

---

## Automação com CrewAI (`medicano_crew/`)

O diretório `medicano_crew/` contém um flow CrewAI que recebe um pedido de implementação em linguagem natural, gera o código completo e o aplica no repositório via [Aider](https://github.com/paul-gauthier/aider).

### Como funciona

```
pedido (texto)
    │
    ▼
[Architect]  →  plano técnico (arquivos, tipos, endpoints, regras de negócio)
    │
    ▼
[Developer]  →  código completo de cada arquivo (formato Aider)
    │
    ▼
[Documenter] →  JSDoc + @ApiProperty + resumo dos endpoints
    │
    ▼
[Reviewer]   →  lista de issues (crítico / médio / baixo)
    │
    ▼
Aider aplica as alterações no repositório
```

### Agentes

| Agente      | LLM                              | Responsabilidade                              |
|-------------|----------------------------------|-----------------------------------------------|
| Architect   | openrouter/openai/o4-mini        | Plano técnico antes de qualquer linha de código |
| Developer   | openrouter/anthropic/claude-sonnet-4-5 | Implementação completa sem TODOs        |
| Documenter  | openrouter/google/gemini-2.5-flash | JSDoc, Swagger, exemplos de uso            |
| Reviewer    | openrouter/openai/o4-mini        | Segurança, tipagem, regras de negócio         |

### Configuração

```bash
cd medicano_crew

# Copie e preencha as variáveis de ambiente
cp .env.example .env   # OPENAI_API_KEY, AIDER_MODEL, etc.

# Instale as dependências (requer uv)
uv sync
```

### Executar um único pedido

```bash
# Interativo (pede o pedido no terminal)
uv run kickoff

# Via argumento direto
uv run kickoff "Criar endpoint de listagem de pacientes com paginação"
```

Os artefatos gerados ficam em:

```
medicano_crew/output/
├── prompts/      # Prompt enviado ao Aider (por run_id)
├── review.md     # Último relatório do Reviewer
└── phase_state/  # Marcadores de etapas concluídas
```

---

## Sprints — execução em lote

Cada sprint é descrita em dois arquivos dentro de `medicano_crew/docs/specs/`:

| Arquivo                    | Conteúdo                                      |
|----------------------------|-----------------------------------------------|
| `sprint-XX-<nome>.md`      | Especificação humana (entidades, regras, escopo) |
| `sprint-XX-prompts.json`   | Sequência de prompts prontos para o CrewAI    |

### Formato do JSON de prompts

```json
{
  "sprint": "sprint-01-auth",
  "description": "Descrição da sprint",
  "context": { ... },
  "prompts": [
    {
      "id": 1,
      "name": "nome-curto",
      "description": "O que este prompt implementa",
      "request": "Texto completo enviado ao CrewAI"
    }
  ]
}
```

### Script `run_sprint.py`

Executa todos os prompts de uma sprint em sequência, aplicando cada um via Aider.

```bash
cd medicano_crew

# Rodar a sprint completa (usa sprint-01-prompts.json por padrão)
python run_sprint.py

# Especificar outro arquivo de sprint
python run_sprint.py docs/specs/sprint-02-prompts.json

# Retomar a partir de um prompt específico (após erro)
python run_sprint.py --from 4

# Executar apenas um prompt
python run_sprint.py --only 6

# Pular prompts já concluídos (re-execução idempotente)
python run_sprint.py --skip-done

# Ver os prompts sem executar nada
python run_sprint.py --dry-run

# Ajustar intervalo entre prompts (padrão: 5s)
python run_sprint.py --delay 10
```

O script salva um marcador em `output/phase_state/` ao concluir cada prompt. Se uma execução falhar, basta corrigir o problema e usar `--from <id>` para retomar sem retrabalho.

---

## Sprint 01 — Authentication Foundation

**Spec:** `medicano_crew/docs/specs/sprint-01-auth.md`  
**Prompts:** `medicano_crew/docs/specs/sprint-01-prompts.json`

### Escopo

- Criação de usuário com 4 roles: `patient`, `clinic`, `professional`, `attendant`
- Login padrão (email + senha) e login de atendente (clinicId + username + senha)
- JWT com expiração de 7 dias
- Validação dupla: JWT + token armazenado no Redis (revogável no logout)
- Hash de senha com bcrypt (cost 12)

### Entidades

| Entidade           | Campos principais                                   |
|--------------------|-----------------------------------------------------|
| User               | role (imutável), email?, username?, clinicId?, passwordHash (oculto) |
| Clinic             | name, subscriptionStatus                            |
| Professional       | specialty, userId                                   |
| ClinicProfessional | clinicId + professionalId (índice único composto)   |

### Regras de negócio

- `attendant` não pode ter email; não-atendentes não podem ter username
- Índice único `(role, email)` para não-atendentes
- Índice único `(clinicId, username)` para atendentes
- Signup realiza auto-login (retorna token imediatamente)
- Logout remove o token do Redis — requisições subsequentes com o mesmo JWT são rejeitadas

### Sequência de prompts

| # | Nome                     | O que implementa                                        |
|---|--------------------------|---------------------------------------------------------|
| 1 | `shared-types`           | Interfaces e enums em `packages/types`                  |
| 2 | `user-schema`            | Schema Mongoose do User com indexes                     |
| 3 | `clinic-professional-schemas` | Schemas de Clinic, Professional, ClinicProfessional |
| 4 | `users-module`           | Repositório + Service + bcrypt (cost 12)                |
| 5 | `signup-and-login`       | Endpoints `/auth/signup` e `/auth/login` com DTOs       |
| 6 | `redis-token-service`    | RedisService com save / validate / remove token         |
| 7 | `jwt-strategy-and-guards`| JwtStrategy com validação dupla Redis + Guards + Decorators |
| 8 | `logout-endpoint`        | POST `/auth/logout` que revoga o token no Redis         |
| 9 | `auth-tests`             | Testes unitários e e2e de toda a camada de auth         |

Para executar:

```bash
cd medicano_crew
python run_sprint.py
```
