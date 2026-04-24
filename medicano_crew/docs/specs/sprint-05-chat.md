# Sprint 05 — Chat (LLM Integration)

## Objective

Add an AI-powered scheduling assistant that allows users to interact with a clinic context via natural language, backed by the Claude API.

## Dependencies

- Sprint 02 (RBAC)
- External: `@anthropic-ai/sdk` package
- Environment variable: `ANTHROPIC_API_KEY`

## Core Entities

### `ChatSession`

| Field | Type | Rules |
|---|---|---|
| `userId` | `ObjectId` → User | required |
| `clinicId` | `ObjectId` → Clinic | optional — provides clinic context to the LLM |
| `timestamps` | — | `true` |

### `ChatMessage`

| Field | Type | Rules |
|---|---|---|
| `sessionId` | `ObjectId` → ChatSession | required |
| `role` | `MessageRole` | required (`user` or `assistant`) |
| `content` | `string` | required |
| `timestamps` | — | `{ createdAt: true, updatedAt: false }` |

### `MessageRole` enum

```typescript
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}
```

### Indexes

```typescript
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
```

## Module Structure

```
chat/
├── dto/
│   ├── create-session.dto.ts
│   └── send-message.dto.ts
├── schemas/
│   ├── chat-session.schema.ts
│   └── chat-message.schema.ts
├── tests/
│   └── chat.service.spec.ts
├── chat.controller.ts
├── chat.module.ts
└── chat.service.ts
```

## DTOs

### `CreateSessionDto`

```typescript
clinicId?: string  // @IsMongoId @IsOptional
```

### `SendMessageDto`

```typescript
content: string  // @IsString @MinLength(1)
```

## Service

### `ChatService`

```typescript
// Constants
MAX_CONTEXT_MESSAGES = 20
LLM_MODEL = 'claude-sonnet-4-6'
MAX_RESPONSE_TOKENS = 1024
SYSTEM_PROMPT = 'Você é um assistente de agendamento médico da plataforma Medicano. ...'

constructor(
  sessionModel: Model<ChatSessionDocument>,
  messageModel: Model<ChatMessageDocument>,
  configService: ConfigService,
)
// Instantiates Anthropic client with ANTHROPIC_API_KEY from ConfigService

createSession(dto: CreateSessionDto, userId: string): Promise<ChatSessionDocument>
  // Creates session with userId + optional clinicId

listSessions(userId: string): Promise<ChatSessionDocument[]>
  // Returns sessions for userId sorted by updatedAt desc

sendMessage(sessionId: string, content: string, userId: string): Promise<ChatMessageDocument>
  // 1. findSessionById(sessionId)
  // 2. Save user ChatMessage to DB
  // 3. Fetch last MAX_CONTEXT_MESSAGES from DB (sorted by createdAt asc)
  // 4. Call anthropicClient.messages.create with model, max_tokens, system, messages[]
  // 5. Extract text from response.content[0]
  // 6. Save assistant ChatMessage to DB
  // 7. Touch session updatedAt
  // 8. Return assistant ChatMessage

listMessages(sessionId: string): Promise<ChatMessageDocument[]>
  // findSessionById(sessionId)
  // Returns messages sorted by createdAt asc

private findSessionById(sessionId: string): Promise<ChatSessionDocument>
  // Validates ObjectId, throws NotFoundException if not found
```

## Controller

```typescript
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController

POST /chat/sessions                         → createSession(@Body, @CurrentUser)
GET  /chat/sessions                         → listSessions(@CurrentUser)
POST /chat/sessions/:sessionId/messages     → sendMessage(@Param, @Body, @CurrentUser)
GET  /chat/sessions/:sessionId/messages     → listMessages(@Param)
```

No `@Roles` restrictions — all authenticated users can use the chat.

## Anthropic SDK Usage

```typescript
import Anthropic from '@anthropic-ai/sdk';

const response = await this.anthropicClient.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: SYSTEM_PROMPT,
  messages: [
    { role: 'user', content: 'Quero agendar uma consulta' },
    { role: 'assistant', content: 'Claro! ...' },
    // ... last MAX_CONTEXT_MESSAGES entries
  ],
});

const assistantText = response.content[0].type === 'text'
  ? response.content[0].text
  : '';
```

## Package Installation

Add to `apps/api/package.json` dependencies:

```json
"@anthropic-ai/sdk": "^0.36.0"
```

Run: `npm install` inside `apps/api/`

## Tests — `chat.service.spec.ts`

| Test | Description |
|---|---|
| createSession — success | Creates session with userId |
| createSession — with clinicId | Creates session with optional clinicId |
| listSessions | Returns sessions for userId sorted by updatedAt |
| sendMessage — success | Saves user msg, calls LLM, saves assistant msg, returns assistant |
| sendMessage — session not found | Throws NotFoundException |
| sendMessage — invalid sessionId | Throws NotFoundException |
| listMessages — success | Returns messages in chronological order |
| listMessages — session not found | Throws NotFoundException |

Mock the `Anthropic` client in tests — never call real API in unit tests.

```typescript
const mockAnthropicClient = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Resposta do assistente' }],
    }),
  },
};
```

## Environment Variables

Add to `.env` (and document in README):

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Files to Create

| File | Action |
|---|---|
| `chat/schemas/chat-session.schema.ts` | Create |
| `chat/schemas/chat-message.schema.ts` | Create |
| `chat/dto/create-session.dto.ts` | Create |
| `chat/dto/send-message.dto.ts` | Create |
| `chat/chat.service.ts` | Create |
| `chat/chat.controller.ts` | Create |
| `chat/chat.module.ts` | Create |
| `chat/tests/chat.service.spec.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `app.module.ts` | Import `ChatModule` |
| `apps/api/package.json` | Add `@anthropic-ai/sdk` dependency |

## Definition of Done

- [ ] All 8 tests pass with mocked Anthropic client
- [ ] `sendMessage` correctly builds conversation history from DB
- [ ] `ANTHROPIC_API_KEY` is read from ConfigService (never hardcoded)
- [ ] `tsc --noEmit` passes
