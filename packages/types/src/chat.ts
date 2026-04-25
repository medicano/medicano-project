/* eslint-disable @typescript-eslint/naming-convention */

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * Public representation of a chat session (sent to React UI).
 */
export interface IChatSession {
  _id: string;
  userId: string;
  clinicId?: string;
  recommendedSpecialty?: string;
  disclaimerShown: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public representation of an individual chat message.
 */
export interface IChatMessage {
  _id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

/**
 * UI-level recommendation object.
 */
export interface ITriageRecommendation {
  specialty: string;
  reasoning: string;
}

/**
 * Response type for `POST /chat/sessions/:id/messages` as consumed by the web-app.
 */
export interface ISendMessageResponse {
  message: IChatMessage;
  recommendation: ITriageRecommendation | null;
}
