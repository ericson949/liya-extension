import { SessionId } from '../domain/session-id.vo';

export interface SchedulerPort {
  scheduleDebounce(sessionId: SessionId, delayMinutes: number): Promise<void>;
  cancelDebounce(sessionId: SessionId): Promise<void>;
}
