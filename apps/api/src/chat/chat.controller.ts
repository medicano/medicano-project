import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { GetChatMessagesQueryDto } from './dto/get-chat-messages-query.dto';
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
    return this.chatService.createSession(userId, dto);
  }

  @Get('sessions')
  async getSessions(
    @CurrentUser() userId: string,
  ): Promise<ChatSessionDocument[]> {
    return this.chatService.getSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(204)
  async deleteSession(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
  ): Promise<void> {
    await this.chatService.deleteSession(userId, sessionId);
  }

  @Get('sessions/:sessionId/messages')
  async getMessages(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Query() query: GetChatMessagesQueryDto,
  ): Promise<ChatMessageDocument[]> {
    return this.chatService.getSessionMessages(userId, sessionId, query);
  }

  @Post('sessions/:sessionId/messages')
  async createMessage(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Body() dto: CreateChatMessageDto,
  ): Promise<ChatMessageDocument[]> {
    return this.chatService.createMessage(userId, sessionId, dto);
  }
}
