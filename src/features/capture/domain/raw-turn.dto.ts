import { SupportedPlatform } from './platform-type.vo';

export interface RawTurnDTO {
  platform: SupportedPlatform;
  prompt: string;
  response: string;
  conversationId?: string;
  turnIndex?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SanitizedTurnDTO {
  platform: SupportedPlatform;
  prompt: string;
  response: string;
  conversationId?: string;
  turnIndex?: number;
  timestamp: number;
  turnHash: string;
  metadata?: {
    promptRedactions: number;
    responseRedactions: number;
    originalPromptLength: number;
    originalResponseLength: number;
    [key: string]: unknown;
  };
}
