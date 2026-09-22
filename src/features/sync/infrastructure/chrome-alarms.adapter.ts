import { SchedulerPort } from '../ports/scheduler.port';
import { SessionId } from '../domain/session-id.vo';
import { browserAPI } from '@shared/utils/browser-api';

export const DEBOUNCE_ALARM_PREFIX = 'liya_debounce_';
export const LEGACY_DEBOUNCE_ALARM_PREFIX = 'synapse_debounce_';

export class ChromeAlarmsAdapter implements SchedulerPort {
  public async scheduleDebounce(sessionId: SessionId, delayMinutes: number): Promise<void> {
    const alarmName = `${DEBOUNCE_ALARM_PREFIX}${sessionId.getValue()}`;

    // Clear existing alarm if pending
    await this.cancelDebounce(sessionId);

    // Schedule new alarm
    browserAPI.alarms.create(alarmName, {
      delayInMinutes: delayMinutes,
    });
  }

  public async cancelDebounce(sessionId: SessionId): Promise<void> {
    const alarmName = `${DEBOUNCE_ALARM_PREFIX}${sessionId.getValue()}`;
    const legacyAlarmName = `${LEGACY_DEBOUNCE_ALARM_PREFIX}${sessionId.getValue()}`;
    await browserAPI.alarms.clear(alarmName);
    await browserAPI.alarms.clear(legacyAlarmName);
  }

  public static parseSessionIdFromAlarm(alarmName: string): string | null {
    if (alarmName.startsWith(DEBOUNCE_ALARM_PREFIX)) {
      return alarmName.slice(DEBOUNCE_ALARM_PREFIX.length);
    }
    if (alarmName.startsWith(LEGACY_DEBOUNCE_ALARM_PREFIX)) {
      return alarmName.slice(LEGACY_DEBOUNCE_ALARM_PREFIX.length);
    }
    return null;
  }
}
