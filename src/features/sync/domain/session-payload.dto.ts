import { SupportedPlatform } from '@features/capture/domain/platform-type.vo';
import { SessionStatus } from './session-status';

export interface TurnPayload {
  hash: string;
  prompt: string;
  response: string;
  capturedAt: string;
  conversationId?: string;
  turnIndex?: number;
  redactionStats: {
    promptRedactions: number;
    responseRedactions: number;
    originalPromptLength: number;
    originalResponseLength: number;
  };
}

export interface SessionPayload {
  sessionId: string;
  platform: SupportedPlatform;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  turns: TurnPayload[];
  totalTurns: number;
  metadata?: Record<string, unknown>;
}
