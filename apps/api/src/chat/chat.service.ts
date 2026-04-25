import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';

import {
  ChatSession,
  ChatSessionDocument,
} from './schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from './schemas/chat-message.schema';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { SendMessageResponse } from './dto/send-message-response.dto';
import { TRIAGE_SYSTEM_PROMPT } from './constants/triage-prompt';
import { Specialty } from '../common/enums/specialty.enum';
import { ANTHROPIC_CLIENT } from './chat.constants';

const MAX_CONTEXT_MESSAGES = 20;

interface ParsedRecommendation {
  specialty: Specialty;
  reasoning: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    @Inject(ANTHROPIC_CLIENT)
    private readonly anthropicClient: Anthropic,
  ) {}

  public async createSession(): Promise<ChatSessionDocument> {
    const session = new this.sessionModel({});
    return session.save();
  }

  public async findSessionById(
    sessionId: string,
  ): Promise<ChatSessionDocument> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }

  public async findMessagesBySession(
    sessionId: string,
  ): Promise<ChatMessageDocument[]> {
    return this.messageModel
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .exec();
  }

  public async sendMessage(
    sessionId: string,
    dto: CreateChatMessageDto,
  ): Promise<SendMessageResponse> {
    const session = await this.findSessionById(sessionId);

    if (session.recommendedSpecialty) {
      throw new ConflictException(
        'This triage session has already been completed. Start a new session for a new triage.',
      );
    }

    await this.messageModel.create({
      sessionId,
      role: 'user',
      content: dto.content,
    });

    const recentMessages = await this.messageModel
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(MAX_CONTEXT_MESSAGES)
      .exec();

    const orderedMessages = recentMessages.reverse();

    const contextMessages = orderedMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const completion = await this.anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: contextMessages,
    });

    const assistantText = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const recommendation = this.parseRecommendation(assistantText);

    const assistantMessage = await this.messageModel.create({
      sessionId,
      role: 'assistant',
      content: assistantText,
    });

    let sessionDirty = false;

    if (recommendation) {
      session.recommendedSpecialty = recommendation.specialty;
      sessionDirty = true;
    }

    if (!session.disclaimerShown) {
      session.disclaimerShown = true;
      sessionDirty = true;
    }

    if (sessionDirty) {
      await session.save();
    }

    return {
      message: assistantMessage,
      recommendation: recommendation
        ? {
            specialty: recommendation.specialty,
            reasoning: recommendation.reasoning,
          }
        : undefined,
    };
  }

  private parseRecommendation(text: string): ParsedRecommendation | null {
    const jsonMatch = text.match(/\{[^{}]*"recommendation"[^{}]*\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const specialty = parsed.recommendation as Specialty;
      if (!Object.values(Specialty).includes(specialty)) return null;
      return {
        specialty,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      };
    } catch {
      return null;
    }
  }
}
