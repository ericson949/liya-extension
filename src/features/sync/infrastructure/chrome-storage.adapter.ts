import { SessionStoragePort } from '../ports/session-storage.port';
import { ConversationSession } from '../domain/conversation-session.aggregate';
import { SessionId } from '../domain/session-id.vo';
import { PlatformType } from '@features/capture/domain/platform-type.vo';
import { browserAPI } from '@shared/utils/browser-api';
import { ConversationTurn } from '@features/capture/domain/conversation-turn.entity';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';
import { Prompt } from '@features/capture/domain/prompt.vo';
import { Response } from '@features/capture/domain/response.vo';
import { RedactedContent } from '@features/sanitization/domain/redacted-content.vo';

const STORAGE_PREFIX = 'liya_session_';
const LEGACY_STORAGE_PREFIX = 'synapse_session_';

export class ChromeStorageAdapter implements SessionStoragePort {
  public async save(session: ConversationSession): Promise<void> {
    const key = `${STORAGE_PREFIX}${session.id.getValue()}`;
    const payload = session.flush();

    await browserAPI.storage.local.set({
      [key]: {
        payload,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    });
  }

  public async findById(id: SessionId): Promise<ConversationSession | null> {
    const key = `${STORAGE_PREFIX}${id.getValue()}`;
    let data = await browserAPI.storage.local.get(key);
    let record = data[key] as { payload: any; createdAt: string; updatedAt: string } | undefined;

    if (!record) {
      const legacyKey = `${LEGACY_STORAGE_PREFIX}${id.getValue()}`;
      data = await browserAPI.storage.local.get(legacyKey);
      record = data[legacyKey] as { payload: any; createdAt: string; updatedAt: string } | undefined;
    }

    if (!record) return null;

    return this.deserialize(record.payload, record.createdAt, record.updatedAt);
  }

  public async findActiveByPlatform(platform: PlatformType): Promise<ConversationSession | null> {
    const all = await this.getAll();
    const active = all.find(
      (s) => s.platform.equals(platform) && (s.status === 'ACTIVE' || s.status === 'DEBOUNCING')
    );
    return active ?? null;
  }

  public async getAll(): Promise<ConversationSession[]> {
    const allData = await browserAPI.storage.local.get(null);
    const sessions: ConversationSession[] = [];
    const seenIds = new Set<string>();

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(STORAGE_PREFIX) || key.startsWith(LEGACY_STORAGE_PREFIX)) {
        const record = value as { payload: any; createdAt: string; updatedAt: string };
        const session = this.deserialize(record.payload, record.createdAt, record.updatedAt);
        if (session && !seenIds.has(session.id.getValue())) {
          seenIds.add(session.id.getValue());
          sessions.push(session);
        }
      }
    }

    return sessions;
  }

  public async delete(id: SessionId): Promise<void> {
    const key = `${STORAGE_PREFIX}${id.getValue()}`;
    const legacyKey = `${LEGACY_STORAGE_PREFIX}${id.getValue()}`;
    await browserAPI.storage.local.remove([key, legacyKey]);
  }

  private deserialize(payload: any, createdAtStr?: string, updatedAtStr?: string): ConversationSession | null {
    try {
      const sessionId = SessionId.create(payload.sessionId).getValue();
      const platform = PlatformType.create(payload.platform).getValue();

      const turns: ConversationTurn[] = [];

      if (Array.isArray(payload.turns)) {
        for (const rawTurn of payload.turns) {
          const hash = TurnHash.fromHash(rawTurn.hash);
          const prompt = Prompt.create(rawTurn.prompt).getValue();
          const response = Response.create(rawTurn.response).getValue();
          const promptRedacted = RedactedContent.create(
            rawTurn.prompt,
            rawTurn.redactionStats?.originalPromptLength ?? rawTurn.prompt.length,
            rawTurn.redactionStats?.promptRedactions ?? 0
          ).getValue();
          const responseRedacted = RedactedContent.create(
            rawTurn.response,
            rawTurn.redactionStats?.originalResponseLength ?? rawTurn.response.length,
            rawTurn.redactionStats?.responseRedactions ?? 0
          ).getValue();

          turns.push(
            new ConversationTurn({
              hash,
              platform,
              prompt,
              response,
              promptRedacted,
              responseRedacted,
              capturedAt: new Date(rawTurn.capturedAt),
              conversationId: rawTurn.conversationId,
              turnIndex: rawTurn.turnIndex,
            })
          );
        }
      }

      return ConversationSession.reconstitute({
        id: sessionId,
        platform,
        turns,
        status: payload.status,
        createdAt: createdAtStr ? new Date(createdAtStr) : new Date(payload.createdAt),
        updatedAt: updatedAtStr ? new Date(updatedAtStr) : new Date(payload.updatedAt),
      });
    } catch {
      return null;
    }
  }
}
