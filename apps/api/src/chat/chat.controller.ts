import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatSessionDocument } from './schemas/chat-session.schema';
import { ChatMessageDocument } from './schemas/chat-message.schema';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  async createSession(
    @CurrentUser() userId: string,
    @Body() dto: CreateChatSessionDto,
  ): Promise<ChatSessionDocument> {
    return this.chatService.createSession({ ...dto, userId });
  }

  @Get('sessions')
  async listSessions(
    @CurrentUser() userId: string,
  ): Promise<ChatSessionDocument[]> {
    return this.chatService.listSessions(userId);
  }

  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Body() dto: CreateChatMessageDto,
  ): Promise<ChatMessageDocument> {
    return this.chatService.sendMessage(sessionId, dto);
  }

  @Get('sessions/:sessionId/messages')
  @HttpCode(200)
  async listMessages(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
  ): Promise<ChatMessageDocument[]> {
    return this.chatService.listMessages(sessionId);
  }
}
