import { ChatMessageDocument } from '../schemas/chat-message.schema';
import { Specialty } from '../../common/enums/specialty.enum';

export interface RecommendationDto {
  specialty: Specialty;
  reasoning: string;
}

export interface SendMessageResponse {
  message: ChatMessageDocument;
  recommendation: RecommendationDto | null;
}
