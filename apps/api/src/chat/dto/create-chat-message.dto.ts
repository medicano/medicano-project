import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  readonly content: string;
}
