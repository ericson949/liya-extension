import { SessionStoragePort } from '../ports/session-storage.port';
import { SchedulerPort } from '../ports/scheduler.port';
import { SanitizedTurnDTO } from '@features/capture/domain/raw-turn.dto';
import { PlatformType } from '@features/capture/domain/platform-type.vo';
import { SessionId } from '../domain/session-id.vo';
import { ConversationSession } from '../domain/conversation-session.aggregate';
import { ConversationTurn } from '@features/capture/domain/conversation-turn.entity';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';
import { Prompt } from '@features/capture/domain/prompt.vo';
import { Response } from '@features/capture/domain/response.vo';
import { RedactedContent } from '@features/sanitization/domain/redacted-content.vo';
import { Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/errors';

export interface DebounceConfig {
  delayMinutes?: number;
}

export class DebounceSessionUseCase {
  constructor(
    private readonly storagePort: SessionStoragePort,
    private readonly schedulerPort: SchedulerPort
  ) {}

  public async execute(
    sanitizedTurn: SanitizedTurnDTO,
    config: DebounceConfig = {}
  ): Promise<Result<string, DomainError>> {
    const delayMinutes = config.delayMinutes ?? 2;
    const platformRes = PlatformType.create(sanitizedTurn.platform);
    if (platformRes.isFailure()) {
      return Result.err(platformRes.getError());
    }
    const platform = platformRes.getValue();

    // 1. Find existing active session or instantiate a new one
    let session = await this.storagePort.findActiveByPlatform(platform);
    if (!session) {
      session = ConversationSession.create(SessionId.generate(), platform);
    }

    // 2. Hydrate ConversationTurn Entity
    const turnHash = TurnHash.fromHash(sanitizedTurn.turnHash);
    const promptVo = Prompt.create(sanitizedTurn.prompt).getValue();
    const responseVo = Response.create(sanitizedTurn.response).getValue();
    const promptRedacted = RedactedContent.create(
      sanitizedTurn.prompt,
      sanitizedTurn.metadata?.originalPromptLength ?? sanitizedTurn.prompt.length,
      sanitizedTurn.metadata?.promptRedactions ?? 0
    ).getValue();
    const responseRedacted = RedactedContent.create(
      sanitizedTurn.response,
      sanitizedTurn.metadata?.originalResponseLength ?? sanitizedTurn.response.length,
      sanitizedTurn.metadata?.responseRedactions ?? 0
    ).getValue();

    const turnEntity = new ConversationTurn({
      hash: turnHash,
      platform,
      prompt: promptVo,
      response: responseVo,
      promptRedacted,
      responseRedacted,
      capturedAt: new Date(sanitizedTurn.timestamp),
      conversationId: sanitizedTurn.conversationId,
      turnIndex: sanitizedTurn.turnIndex,
    });

    // 3. Add turn to session (with deduplication)
    const addResult = session.addTurn(turnEntity);
    if (addResult.isFailure()) {
      // If duplicate, still return ok with session ID (idempotent)
      return Result.ok(session.id.getValue());
    }

    // 4. Update session status and schedule/reschedule debounce alarm
    session.markDebouncing(delayMinutes);
    await this.storagePort.save(session);
    await this.schedulerPort.scheduleDebounce(session.id, delayMinutes);

    return Result.ok(session.id.getValue());
  }
}
