import Anthropic from '@anthropic-ai/sdk';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ChatSession,
  ChatSessionDocument,
} from './schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageDocument,
  MessageRole,
} from './schemas/chat-message.schema';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

const MAX_CONTEXT_MESSAGES = 20;
const LLM_MODEL = 'claude-sonnet-4-6';
const MAX_RESPONSE_TOKENS = 1024;
const SYSTEM_PROMPT =
  'Você é um assistente de agendamento médico da plataforma Medicano. ' +
  'Ajude os usuários a agendar, verificar e gerenciar consultas médicas de forma clara e eficiente.';

@Injectable()
export class ChatService {
  private readonly anthropicClient: Anthropic;

  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    configService: ConfigService,
  ) {
    this.anthropicClient = new Anthropic({
      apiKey: configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async createSession(
    dto: CreateChatSessionDto & { userId: string },
  ): Promise<ChatSessionDocument> {
    return this.sessionModel.create({
      userId: new Types.ObjectId(dto.userId),
      clinicId: dto.clinicId ? new Types.ObjectId(dto.clinicId) : undefined,
    });
  }

  async listSessions(userId: string): Promise<ChatSessionDocument[]> {
    return this.sessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 });
  }

  async sendMessage(
    sessionId: string,
    dto: CreateChatMessageDto,
  ): Promise<ChatMessageDocument> {
    const session = await this.findSessionById(sessionId);

    await this.messageModel.create({
      sessionId: session._id,
      role: MessageRole.USER,
      content: dto.content,
    });

    const allMessages = await this.messageModel
      .find({ sessionId: session._id })
      .sort({ createdAt: 1 });
    const history = allMessages.slice(-MAX_CONTEXT_MESSAGES);

    const response = await this.anthropicClient.messages.create({
      model: LLM_MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system: SYSTEM_PROMPT,
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const assistantMessage = await this.messageModel.create({
      sessionId: session._id,
      role: MessageRole.ASSISTANT,
      content: assistantText,
    });

    await this.sessionModel.findByIdAndUpdate(sessionId, {
      updatedAt: new Date(),
    });

    return assistantMessage;
  }

  async listMessages(sessionId: string): Promise<ChatMessageDocument[]> {
    const session = await this.findSessionById(sessionId);
    return this.messageModel
      .find({ sessionId: session._id })
      .sort({ createdAt: 1 });
  }

  private async findSessionById(
    sessionId: string,
  ): Promise<ChatSessionDocument> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException(`Invalid session ID: ${sessionId}`);
    }
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }
    return session;
  }
}
