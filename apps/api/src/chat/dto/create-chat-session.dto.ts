import { IsMongoId, IsOptional } from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsMongoId()
  readonly clinicId?: string;
}
