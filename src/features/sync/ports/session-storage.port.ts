import { ConversationSession } from '../domain/conversation-session.aggregate';
import { SessionId } from '../domain/session-id.vo';
import { PlatformType } from '@features/capture/domain/platform-type.vo';

export interface SessionStoragePort {
  save(session: ConversationSession): Promise<void>;
  findById(id: SessionId): Promise<ConversationSession | null>;
  findActiveByPlatform(platform: PlatformType): Promise<ConversationSession | null>;
  getAll(): Promise<ConversationSession[]>;
  delete(id: SessionId): Promise<void>;
}
