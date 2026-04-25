import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

import { ChatService } from '../chat.service';
import { ChatSession } from '../schemas/chat-session.schema';
import { ChatMessage } from '../schemas/chat-message.schema';
import { TRIAGE_SYSTEM_PROMPT } from '../constants/triage-prompt';
import { Specialty } from '../../common/enums/specialty.enum';

describe('ChatService', () => {
  let service: ChatService;
  let sessionModel: {
    findById: jest.Mock;
  };
  let messageModel: {
    find: jest.Mock;
    create: jest.Mock;
  };
  let anthropicClient: {
    messages: { create: jest.Mock };
  };

  const buildSession = (overrides: Partial<Record<string, unknown>> = {}) => {
    const session = {
      _id: 'session-1',
      recommendedSpecialty: undefined as Specialty | undefined,
      disclaimerShown: false,
      save: jest.fn().mockImplementation(function (this: unknown) {
        return Promise.resolve(this);
      }),
      ...overrides,
    };
    return session;
  };

  const buildMessageDoc = (
    role: 'user' | 'assistant',
    content: string,
  ) => ({ role, content, sessionId: 'session-1' });

  beforeEach(async () => {
    sessionModel = {
      findById: jest.fn(),
    };
    messageModel = {
      find: jest.fn(),
      create: jest.fn(),
    };
    anthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(ChatSession.name), useValue: sessionModel },
        { provide: getModelToken(ChatMessage.name), useValue: messageModel },
        { provide: Anthropic, useValue: anthropicClient },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('throws NotFoundException when session is missing', async () => {
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.sendMessage('missing', { content: 'hello' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sends TRIAGE_SYSTEM_PROMPT to Anthropic on every call', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({ limit: () => ({ exec: jest.fn().mockResolvedValue([]) }) }),
      });
      messageModel.create.mockImplementation(async (doc) => doc);
      anthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Tell me more about your symptoms.' }],
      });

      await service.sendMessage('session-1', { content: 'I have a headache' });

      expect(anthropicClient.messages.create).toHaveBeenCalledTimes(1);
      const args = anthropicClient.messages.create.mock.calls[0][0];
      expect(args.system).toBe(TRIAGE_SYSTEM_PROMPT);
    });

    it('parses recommendation JSON and persists recommendedSpecialty', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            exec: jest.fn().mockResolvedValue([buildMessageDoc('user', 'prior')]),
          }),
        }),
      });
      messageModel.create.mockImplementation(async (doc) => doc);
      anthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"recommendation":"psychology","reasoning":"Anxiety symptoms"}',
          },
        ],
      });

      const result = await service.sendMessage('session-1', {
        content: 'I feel anxious',
      });

      expect(result.recommendation).toEqual({
        specialty: Specialty.PSYCHOLOGY,
        reasoning: 'Anxiety symptoms',
      });
      expect(session.recommendedSpecialty).toBe(Specialty.PSYCHOLOGY);
      expect(session.save).toHaveBeenCalled();
    });

    it('returns null recommendation when LLM replies with plain text', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            exec: jest.fn().mockResolvedValue([buildMessageDoc('user', 'prior')]),
          }),
        }),
      });
      messageModel.create.mockImplementation(async (doc) => doc);
      anthropicClient.messages.create.mockResolvedValue({
        content: [
          { type: 'text', text: 'Could you describe the pain in more detail?' },
        ],
      });

      const result = await service.sendMessage('session-1', {
        content: 'It hurts',
      });

      expect(result.recommendation).toBeNull();
      expect(session.recommendedSpecialty).toBeUndefined();
    });

    it('rejects unknown specialty and returns null recommendation', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            exec: jest.fn().mockResolvedValue([buildMessageDoc('user', 'prior')]),
          }),
        }),
      });
      messageModel.create.mockImplementation(async (doc) => doc);
      anthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"recommendation":"cardiology","reasoning":"Chest pain"}',
          },
        ],
      });

      const result = await service.sendMessage('session-1', {
        content: 'My chest hurts',
      });

      expect(result.recommendation).toBeNull();
      expect(session.recommendedSpecialty).toBeUndefined();
    });

    it('throws ConflictException when session already has a recommendation', async () => {
      const session = buildSession({
        recommendedSpecialty: Specialty.NUTRITION,
      });
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });

      await expect(
        service.sendMessage('session-1', { content: 'follow-up' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(anthropicClient.messages.create).not.toHaveBeenCalled();
    });

    it('marks disclaimerShown=true on the first user message', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({ limit: () => ({ exec: jest.fn().mockResolvedValue([]) }) }),
      });
      messageModel.create.mockImplementation(async (doc) => doc);
      anthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Tell me more.' }],
      });

      await service.sendMessage('session-1', { content: 'first' });

      expect(session.disclaimerShown).toBe(true);
      expect(session.save).toHaveBeenCalled();
    });

    it('extracts JSON wrapped in surrounding text', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            exec: jest.fn().mockResolvedValue([buildMessageDoc('user', 'prior')]),
          }),
        }),
      });
      messageModel.create.mockImplementation(async (doc) => doc);
      anthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Here is my recommendation: {"recommendation":"nutrition","reasoning":"Diet related"} thanks.',
          },
        ],
      });

      const result = await service.sendMessage('session-1', {
        content: 'I want diet advice',
      });

      expect(result.recommendation).toEqual({
        specialty: Specialty.NUTRITION,
        reasoning: 'Diet related',
      });
    });

    it('returns SendMessageResponse with the persisted assistant message', async () => {
      const session = buildSession();
      sessionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });
      messageModel.find.mockReturnValue({
        sort: () => ({ limit: () => ({ exec: jest.fn().mockResolvedValue([]) }) }),
      });
      const persisted = buildMessageDoc('assistant', 'Hi there');
      messageModel.create
        .mockResolvedValueOnce(buildMessageDoc('user', 'hello'))
        .mockResolvedValueOnce(persisted);
      anthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Hi there' }],
      });

      const result = await service.sendMessage('session-1', {
        content: 'hello',
      });

      expect(result.message).toBe(persisted);
      expect(result.recommendation).toBeNull();
    });
  });

  describe('parseRecommendation', () => {
    it('returns null for empty content', () => {
      expect(service.parseRecommendation('')).toBeNull();
    });

    it('returns null for plain text without JSON', () => {
      expect(service.parseRecommendation('How long has it been?')).toBeNull();
    });

    it('returns null when JSON specialty is unknown', () => {
      const text = '{"recommendation":"cardiology","reasoning":"x"}';
      expect(service.parseRecommendation(text)).toBeNull();
    });

    it('parses valid JSON wrapped in extra text', () => {
      const text =
        'Result: {"recommendation":"medicine","reasoning":"general"} end';
      expect(service.parseRecommendation(text)).toEqual({
        specialty: Specialty.MEDICINE,
        reasoning: 'general',
      });
    });
  });
});
