import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { GetChatMessagesQueryDto } from './dto/get-chat-messages-query.dto';

const DEFAULT_MESSAGE_LIMIT = 20;
const MAX_MESSAGE_LIMIT = 100;

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
  ) {}

  async createSession(
    userId: string,
    dto: CreateChatSessionDto,
  ): Promise<ChatSessionDocument> {
    const newSession = new this.sessionModel({
      userId: new Types.ObjectId(userId),
      clinicId: dto.clinicId ? new Types.ObjectId(dto.clinicId) : undefined,
    });
    return newSession.save();
  }

  async getSessions(userId: string): Promise<ChatSessionDocument[]> {
    return this.sessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.assertSessionOwnership(userId, sessionId);
    await this.messageModel.deleteMany({ sessionId: session._id }).exec();
    await this.sessionModel.deleteOne({ _id: session._id }).exec();
  }

  async createMessage(
    userId: string,
    sessionId: string,
    dto: CreateChatMessageDto,
  ): Promise<ChatMessageDocument[]> {
    const session = await this.assertSessionOwnership(userId, sessionId);

    const userMessage = await new this.messageModel({
      sessionId: session._id,
      role: MessageRole.USER,
      content: dto.content,
    }).save();

    const assistantReply = await this.generateAssistantReply(dto.content);

    const assistantMessage = await new this.messageModel({
      sessionId: session._id,
      role: MessageRole.ASSISTANT,
      content: assistantReply,
    }).save();

    return [userMessage, assistantMessage];
  }

  async getSessionMessages(
    userId: string,
    sessionId: string,
    query: GetChatMessagesQueryDto,
  ): Promise<ChatMessageDocument[]> {
    const session = await this.assertSessionOwnership(userId, sessionId);

    const limit = Math.min(
      query.limit ?? DEFAULT_MESSAGE_LIMIT,
      MAX_MESSAGE_LIMIT,
    );

    const filter: Record<string, unknown> = { sessionId: session._id };
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw new NotFoundException(`Invalid cursor: ${query.cursor}`);
      }
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }

    return this.messageModel
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  private async assertSessionOwnership(
    userId: string,
    sessionId: string,
  ): Promise<ChatSessionDocument> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException(`Invalid session ID: ${sessionId}`);
    }
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this chat session');
    }
    return session;
  }

  private async generateAssistantReply(userContent: string): Promise<string> {
    // Placeholder reply until LLMService is wired in.
    return `Received: ${userContent}`;
  }
}
