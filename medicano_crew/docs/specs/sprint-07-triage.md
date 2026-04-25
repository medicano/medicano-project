# Sprint 07 — Triage Specialization (LLM Recommendation Flow)

## Objective

Transform the existing chat module from a generic scheduling assistant into a **specialty triage system** that, through guided conversation, identifies the user's symptoms and recommends one of the platform's specialties (RF03, RF04). Add the diagnostic disclaimer required by CFM Resolution 2.336/2023 (RN16) and enforce the "max one specialty per session" rule (RN17).

## Dependencies

- Sprint 05 (Chat module with Anthropic SDK integration)
- Sprint 06 (Specialty enum)

## Scope

- Add a triage-specific system prompt with structured output instructions
- Add a `recommendedSpecialty` field to `ChatSession`
- Detect when the LLM recommends a specialty and persist it
- Expose disclaimer text and structured recommendation in the API response
- Allow the frontend to read the recommendation and link to `/search?specialty=X`

## Schema Updates

### `ChatSession` — fields to ADD

| Field | Type | Rules |
|---|---|---|
| `recommendedSpecialty` | `Specialty` | optional — set once when LLM completes triage |
| `disclaimerShown` | `boolean` | default: `false` — set to true after first message |

## System Prompt — `chat/constants/triage-prompt.ts`

```typescript
export const TRIAGE_SYSTEM_PROMPT = `Você é um assistente de triagem da plataforma Medicano, uma plataforma brasileira de agendamento de saúde.

REGRAS OBRIGATÓRIAS:
1. Você NÃO é um médico. Você NÃO faz diagnósticos. Você NÃO prescreve medicamentos.
2. Sempre comece a primeira mensagem com o aviso: "⚠️ Importante: este chat não substitui avaliação médica profissional. Em emergências, ligue 192 (SAMU)."
3. Sua única função é fazer perguntas curtas e claras sobre os sintomas do usuário e, ao final da conversa, recomendar UMA das seguintes especialidades disponíveis na plataforma:
   - medicine (medicina geral / clínico geral)
   - psychology (psicologia)
   - psychiatry (psiquiatria)
   - dentistry (odontologia)
   - nutrition (nutrição)
4. Faça no máximo 4 a 6 perguntas antes de recomendar.
5. Quando estiver pronto para recomendar, responda EXATAMENTE neste formato JSON, sem texto antes ou depois:
{"recommendation": "<specialty>", "reasoning": "<breve explicação em português>"}
6. Se o caso parecer emergência (dor no peito, falta de ar grave, perda de consciência, ferimentos graves), interrompa a triagem e oriente o usuário a ligar 192 imediatamente.
7. Use linguagem acolhedora, simples e brasileira. Não use jargão médico.
8. NÃO recomende mais de uma especialidade por sessão. Se o usuário descrever múltiplos sintomas, escolha o mais urgente ou pergunte qual é o principal.

Comece a conversa pedindo ao usuário para descrever o que está sentindo.`;
```

## Service Changes

### `ChatService.sendMessage` — extend existing logic

```typescript
async sendMessage(sessionId: string, content: string, userId: string): Promise<SendMessageResponse> {
  const session = await this.findSessionById(sessionId);

  // Block sending more messages if recommendation already made (RN17)
  if (session.recommendedSpecialty) {
    throw new ConflictException(
      'This triage session has already been completed. Start a new session for a new triage.'
    );
  }

  // Save user message
  await this.messageModel.create({ sessionId, role: MessageRole.USER, content });

  // Build context with TRIAGE_SYSTEM_PROMPT
  const recentMessages = await this.messageModel
    .find({ sessionId })
    .sort({ createdAt: 1 })
    .limit(MAX_CONTEXT_MESSAGES);

  const response = await this.anthropicClient.messages.create({
    model: LLM_MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    system: TRIAGE_SYSTEM_PROMPT,
    messages: recentMessages.map(m => ({ role: m.role, content: m.content })),
  });

  const assistantText = this.extractText(response);

  // Try to parse structured recommendation
  const recommendation = this.parseRecommendation(assistantText);

  // Save assistant message
  const assistantMsg = await this.messageModel.create({
    sessionId,
    role: MessageRole.ASSISTANT,
    content: assistantText,
  });

  // If recommendation found, update session
  if (recommendation) {
    session.recommendedSpecialty = recommendation.specialty;
    await session.save();
  }

  // Update disclaimerShown flag
  if (!session.disclaimerShown) {
    session.disclaimerShown = true;
    await session.save();
  }

  return {
    message: assistantMsg,
    recommendation,
  };
}

private parseRecommendation(text: string): { specialty: Specialty; reasoning: string } | null {
  // Try to find JSON in response
  const jsonMatch = text.match(/\{[^{}]*"recommendation"[^{}]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const specialty = parsed.recommendation;

    // Validate against Specialty enum
    if (!Object.values(Specialty).includes(specialty)) return null;

    return { specialty, reasoning: parsed.reasoning ?? '' };
  } catch {
    return null;
  }
}
```

### Response type

```typescript
export interface SendMessageResponse {
  message: ChatMessageDocument;
  recommendation: {
    specialty: Specialty;
    reasoning: string;
  } | null;
}
```

## Controller Changes

```typescript
@Post('sessions/:sessionId/messages')
async sendMessage(
  @Param('sessionId', ParseMongoIdPipe) sessionId: string,
  @Body() dto: CreateChatMessageDto,
  @CurrentUser() userId: string,
): Promise<SendMessageResponse> {
  return this.chatService.sendMessage(sessionId, dto.content, userId);
}
```

## Tests — `chat.service.spec.ts` (extend existing)

Add the following tests on top of the existing 8:

| Test | Description |
|---|---|
| sendMessage — uses TRIAGE_SYSTEM_PROMPT | Verifies the system prompt sent to Anthropic includes triage instructions |
| sendMessage — parses recommendation when present | Mocks LLM response with valid JSON, expects session.recommendedSpecialty to be set |
| sendMessage — does not parse when no JSON | Mocks LLM response without JSON, expects session.recommendedSpecialty to remain undefined |
| sendMessage — rejects unknown specialty | Mocks LLM response with `{recommendation: "cardiology"}` (not in enum), expects no save |
| sendMessage — blocks new messages after recommendation | Calls sendMessage on session that already has recommendedSpecialty, expects ConflictException |
| sendMessage — sets disclaimerShown=true after first message | First call sets flag |
| parseRecommendation — handles surrounding text | LLM response: "Aqui está minha recomendação: {recommendation: 'psychology', reasoning: '...'}. Espero ter ajudado." → extracts JSON correctly |

## Files to Create

| File | Action |
|---|---|
| `chat/constants/triage-prompt.ts` | Create — exports `TRIAGE_SYSTEM_PROMPT` |
| `chat/dto/send-message-response.dto.ts` | Create — `SendMessageResponse` interface |

## Files to Update

| File | Change |
|---|---|
| `chat/schemas/chat-session.schema.ts` | Add `recommendedSpecialty` and `disclaimerShown` fields |
| `chat/chat.service.ts` | Replace generic system prompt with `TRIAGE_SYSTEM_PROMPT`, add `parseRecommendation`, block messages after recommendation |
| `chat/chat.controller.ts` | Update `sendMessage` return type to `SendMessageResponse` |
| `chat/tests/chat.service.spec.ts` | Add 7 new tests |
| `packages/types/src/chat.ts` | Create — `IChatSession`, `IChatMessage`, `ITriageRecommendation`, `ISendMessageResponse` |
| `packages/types/src/index.ts` | Re-export from `./chat` |

## Definition of Done

- [ ] All existing chat tests still pass
- [ ] All 7 new tests pass
- [ ] Real conversation with mocked LLM produces valid recommendation that updates session
- [ ] After recommendation, further messages on same session are rejected with 409 Conflict
- [ ] Frontend can read `session.recommendedSpecialty` and link to `/search?specialty=X`
- [ ] System prompt is centralized in `chat/constants/triage-prompt.ts` (not inline in service)
- [ ] `tsc --noEmit` passes

## Out of Scope

- Streaming responses (Vercel AI SDK) — postponed to future sprint
- Multi-language support — Portuguese only for MVP
- Conversation summarization — sessions remain raw message lists
