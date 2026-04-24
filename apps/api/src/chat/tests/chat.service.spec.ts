import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { ChatService } from '../chat.service';
import { ChatSession } from '../schemas/chat-session.schema';
import {
  ChatMessage,
  MessageRole,
} from '../schemas/chat-message.schema';

const mockAnthropicCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

describe('ChatService', () => {
  let service: ChatService;

  const mockSessionModel: any = {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockMessageModel: any = {
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockSessionModel,
        },
        {
          provide: getModelToken(ChatMessage.name),
          useValue: mockMessageModel,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a session with only userId', async () => {
      const userId = new Types.ObjectId().toHexString();
      const stubSession = { _id: new Types.ObjectId(), userId };

      mockSessionModel.create.mockResolvedValue(stubSession);

      const result = await service.createSession({ userId } as any);

      expect(mockSessionModel.create).toHaveBeenCalledTimes(1);
      const arg = mockSessionModel.create.mock.calls[0][0];
      expect(arg.userId.toString()).toBe(userId);
      expect(arg.clinicId).toBeUndefined();
      expect(result).toEqual(stubSession);
    });

    it('creates a session with userId and clinicId', async () => {
      const userId = new Types.ObjectId().toHexString();
      const clinicId = new Types.ObjectId().toHexString();
      const stubSession = {
        _id: new Types.ObjectId(),
        userId,
        clinicId,
      };

      mockSessionModel.create.mockResolvedValue(stubSession);

      const result = await service.createSession({
        userId,
        clinicId,
      } as any);

      expect(mockSessionModel.create).toHaveBeenCalledTimes(1);
      const arg = mockSessionModel.create.mock.calls[0][0];
      expect(arg.userId.toString()).toBe(userId);
      expect(arg.clinicId).toBeDefined();
      expect(arg.clinicId.toString()).toBe(clinicId);
      expect(result).toEqual(stubSession);
    });
  });

  describe('listSessions', () => {
    it('returns sessions for a user sorted by updatedAt desc', async () => {
      const userId = new Types.ObjectId().toHexString();
      const sessions = [
        { _id: new Types.ObjectId(), userId, updatedAt: new Date() },
        { _id: new Types.ObjectId(), userId, updatedAt: new Date() },
      ];

      const sortMock = jest.fn().mockResolvedValue(sessions);
      mockSessionModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.listSessions(userId);

      expect(mockSessionModel.find).toHaveBeenCalledTimes(1);
      const findArg = mockSessionModel.find.mock.calls[0][0];
      expect(findArg.userId.toString()).toBe(userId);
      expect(sortMock).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(result).toEqual(sessions);
    });
  });

  describe('sendMessage', () => {
    it('saves user message, calls Anthropic, saves assistant message (happy path)', async () => {
      const sessionId = new Types.ObjectId().toHexString();
      const session = {
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(),
      };

      mockSessionModel.findById.mockResolvedValue(session);

      const sortMock = jest.fn().mockResolvedValue([]);
      mockMessageModel.find.mockReturnValue({ sort: sortMock });

      const userMessage = {
        _id: new Types.ObjectId(),
        sessionId,
        role: MessageRole.USER,
        content: 'Hello',
      };
      const assistantMessage = {
        _id: new Types.ObjectId(),
        sessionId,
        role: MessageRole.ASSISTANT,
        content: 'Hi there!',
      };

      mockMessageModel.create
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(assistantMessage);

      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hi there!' }],
      });

      mockSessionModel.findByIdAndUpdate.mockResolvedValue(session);

      const result = await service.sendMessage(sessionId, {
        content: 'Hello',
      } as any);

      expect(mockSessionModel.findById).toHaveBeenCalledWith(sessionId);
      expect(mockMessageModel.create).toHaveBeenCalledTimes(2);
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
      expect(result.role).toBe(MessageRole.ASSISTANT);
      expect(result.content).toBe('Hi there!');
    });

    it('throws NotFoundException when session does not exist', async () => {
      const sessionId = new Types.ObjectId().toHexString();
      mockSessionModel.findById.mockResolvedValue(null);

      await expect(
        service.sendMessage(sessionId, { content: 'Hi' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockMessageModel.create).not.toHaveBeenCalled();
      expect(mockAnthropicCreate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when sessionId is invalid', async () => {
      await expect(
        service.sendMessage('not-an-object-id', {
          content: 'Hi',
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockSessionModel.findById).not.toHaveBeenCalled();
      expect(mockMessageModel.create).not.toHaveBeenCalled();
      expect(mockAnthropicCreate).not.toHaveBeenCalled();
    });
  });

  describe('listMessages', () => {
    it('returns messages sorted by createdAt ascending', async () => {
      const sessionId = new Types.ObjectId().toHexString();
      const session = { _id: new Types.ObjectId(sessionId) };
      const messages = [
        {
          _id: new Types.ObjectId(),
          sessionId,
          role: MessageRole.USER,
          content: 'Hi',
          createdAt: new Date('2024-01-01'),
        },
        {
          _id: new Types.ObjectId(),
          sessionId,
          role: MessageRole.ASSISTANT,
          content: 'Hello',
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockSessionModel.findById.mockResolvedValue(session);

      const sortMock = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.listMessages(sessionId, {} as any);

      expect(mockSessionModel.findById).toHaveBeenCalledWith(sessionId);
      expect(mockMessageModel.find).toHaveBeenCalledTimes(1);
      expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 });
      expect(result).toEqual(messages);
    });

    it('throws NotFoundException when session does not exist', async () => {
      const sessionId = new Types.ObjectId().toHexString();
      mockSessionModel.findById.mockResolvedValue(null);

      await expect(
        service.listMessages(sessionId, {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockMessageModel.find).not.toHaveBeenCalled();
    });
  });
});
