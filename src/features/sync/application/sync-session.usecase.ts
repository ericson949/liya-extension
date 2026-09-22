import { SessionStoragePort } from '../ports/session-storage.port';
import { IngestionHttpPort, SyncError } from '../ports/ingestion-http.port';
import { SchedulerPort } from '../ports/scheduler.port';
import { SessionId } from '../domain/session-id.vo';
import { Result } from '@shared/domain/result';

export interface SyncSessionOptions {
  sessionId: SessionId;
  endpointUrl: string;
  authToken?: string;
  isPaused?: boolean;
}

export class SyncSessionUseCase {
  constructor(
    private readonly storagePort: SessionStoragePort,
    private readonly httpPort: IngestionHttpPort,
    private readonly schedulerPort: SchedulerPort
  ) {}

  public async execute(options: SyncSessionOptions): Promise<Result<void, SyncError>> {
    const { sessionId, endpointUrl, authToken, isPaused } = options;

    if (isPaused) {
      return Result.err({
        code: 'INVALID_PAYLOAD',
        message: 'Synchronization is currently paused in settings.',
        retryable: false,
      });
    }

    const session = await this.storagePort.findById(sessionId);
    if (!session) {
      return Result.err({
        code: 'INVALID_PAYLOAD',
        message: `Session with id '${sessionId.getValue()}' not found.`,
        retryable: false,
      });
    }

    // Only sync if session contains significant content
    if (!session.hasSignificantContent()) {
      // Nothing significant to sync, mark synced
      session.markSynced();
      await this.storagePort.save(session);
      await this.schedulerPort.cancelDebounce(sessionId);
      return Result.ok(undefined);
    }

    session.markSyncing();
    await this.storagePort.save(session);

    const payload = session.flush();
    const result = await this.httpPort.syncSession(payload, endpointUrl, authToken);

    if (result.isSuccess()) {
      session.markSynced();
      await this.storagePort.save(session);
      await this.schedulerPort.cancelDebounce(sessionId);
      return Result.ok(undefined);
    }

    const error = result.getError();
    session.markFailed();
    await this.storagePort.save(session);

    // If retryable, we could schedule an exponential backoff alarm
    if (error.retryable) {
      await this.schedulerPort.scheduleDebounce(sessionId, 5); // Retry in 5 minutes
    }

    return Result.err(error);
  }
}
