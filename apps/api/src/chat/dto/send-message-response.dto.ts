/* tslint:disable:file-name-casing */
import { ChatMessageDocument } from '../schemas/chat-message.schema';
import { Specialty } from '../../common/enums/specialty.enum';

/**
 * High-level triage recommendation returned by GPT pipeline.
 */
export interface TriageRecommendation {
  /**
   * Medical specialty recommended for the patient.
   */
  specialty: Specialty;

  /**
   * Short explanation (max 500 chars, validated in service).
   */
  reasoning: string;
}

/**
 * API response for POST /chat/sessions/:id/messages
 */
export interface SendMessageResponse {
  /**
   * Persisted chat message (Mongo document with mongoose getters applied).
   */
  message: ChatMessageDocument;

  /**
   * AI triage recommendation or `null` when no recommendation was produced.
   */
  recommendation: TriageRecommendation | null;
}
