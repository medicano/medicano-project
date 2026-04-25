import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
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
import {
  SendMessageResponse,
  RecommendationDto,
} from './dto/send-message-response.dto';
import { TRIAGE_SYSTEM_PROMPT } from './constants/triage-prompt';
import { Specialty } from '../common/enums/specialty.enum';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    private readonly anthropicClient: Anthropic,
  ) {}

  async sendMessage(
    sessionId: string,
    dto: CreateChatMessageDto,
  ): Promise<SendMessageResponse> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.recommendedSpecialty) {
      throw new ConflictException(
        'A specialty has already been recommended for this session',
      );
    }

    const previousMessages = await this.messageModel
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .exec();

    const isFirstMessage = previousMessages.length === 0;

    await this.messageModel.create({
      sessionId,
      role: 'user',
      content: dto.content,
    });

    const llmMessages = [
      ...previousMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: dto.content },
    ];

    const llmResponse = await this.anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: llmMessages,
    });

    const assistantContent =
      llmResponse.content
        ?.map((block: { type: string; text?: string }) =>
          block.type === 'text' ? block.text ?? '' : '',
        )
        .join('') ?? '';

    const recommendation = this.parseRecommendation(assistantContent);

    const savedMessage = await this.messageModel.create({
      sessionId,
      role: 'assistant',
      content: assistantContent,
    });

    if (recommendation) {
      session.recommendedSpecialty = recommendation.specialty;
    }

    if (isFirstMessage) {
      session.disclaimerShown = true;
    }

    if (recommendation || isFirstMessage) {
      await session.save();
    }

    return {
      message: savedMessage,
      recommendation,
    };
  }

  parseRecommendation(content: string): RecommendationDto | null {
    if (!content) {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        recommendation?: string;
        reasoning?: string;
      };

      if (!parsed.recommendation || !parsed.reasoning) {
        return null;
      }

      const validSpecialties = Object.values(Specialty) as string[];
      if (!validSpecialties.includes(parsed.recommendation)) {
        return null;
      }

      return {
        specialty: parsed.recommendation as Specialty,
        reasoning: parsed.reasoning,
      };
    } catch (err) {
      this.logger.debug(`Failed to parse recommendation JSON: ${String(err)}`);
      return null;
    }
  }
}
