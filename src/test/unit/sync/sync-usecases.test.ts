import { describe, it, expect, vi } from 'vitest';
import { DebounceSessionUseCase } from '@features/sync/application/debounce-session.usecase';
import { SyncSessionUseCase } from '@features/sync/application/sync-session.usecase';
import { ChromeStorageAdapter } from '@features/sync/infrastructure/chrome-storage.adapter';
import { ChromeAlarmsAdapter } from '@features/sync/infrastructure/chrome-alarms.adapter';
import { IngestionHttpPort } from '@features/sync/ports/ingestion-http.port';
import { SanitizedTurnDTO } from '@features/capture/domain/raw-turn.dto';
import { Result } from '@shared/domain/result';
import { SessionId } from '@features/sync/domain/session-id.vo';
import { mockChrome } from '@test/setup';

describe('Sync & Debounce Use Cases', () => {
  const storage = new ChromeStorageAdapter();
  const scheduler = new ChromeAlarmsAdapter();

  it('DebounceSessionUseCase saves turn to session and schedules alarm', async () => {
    const useCase = new DebounceSessionUseCase(storage, scheduler);

    const turn: SanitizedTurnDTO = {
      platform: 'CLAUDE',
      prompt: 'What is Test-Driven Development?',
      response: 'TDD is a software development process relying on short cycles.',
      timestamp: Date.now(),
      turnHash: 'hash-1234567890abcdef',
    };

    const result = await useCase.execute(turn, { delayMinutes: 2 });
    expect(result.isSuccess()).toBe(true);

    const sessionIdStr = result.getValue();
    expect(sessionIdStr).toBeDefined();

    // Verify session was persisted in storage
    const saved = await storage.findById(SessionId.create(sessionIdStr).getValue());
    expect(saved).not.toBeNull();
    expect(saved?.turnsCount).toBe(1);
    expect(saved?.status).toBe('DEBOUNCING');

    // Verify alarm was scheduled
    expect(mockChrome.alarms.create).toHaveBeenCalledWith(
      `liya_debounce_${sessionIdStr}`,
      { delayInMinutes: 2 }
    );
  });

  it('SyncSessionUseCase respects isPaused flag and does not sync', async () => {
    const mockHttp: IngestionHttpPort = {
      syncSession: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const syncUseCase = new SyncSessionUseCase(storage, mockHttp, scheduler);
    const debounceUseCase = new DebounceSessionUseCase(storage, scheduler);

    const turn: SanitizedTurnDTO = {
      platform: 'GEMINI',
      prompt: 'Show me an example of DDD.',
      response: 'Here is an aggregate root pattern example with invariants.',
      timestamp: Date.now(),
      turnHash: 'hash-gemini-ddd',
    };

    const debRes = await debounceUseCase.execute(turn);
    const sessionId = SessionId.create(debRes.getValue()).getValue();

    const syncRes = await syncUseCase.execute({
      sessionId,
      endpointUrl: 'http://localhost:3000/api/sessions',
      isPaused: true,
    });

    expect(syncRes.isFailure()).toBe(true);
    expect(syncRes.getError().message).toContain('Synchronization is currently paused');
    expect(mockHttp.syncSession).not.toHaveBeenCalled();
  });

  it('SyncSessionUseCase syncs significant session to HTTP port and cancels alarm', async () => {
    const mockHttp: IngestionHttpPort = {
      syncSession: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const syncUseCase = new SyncSessionUseCase(storage, mockHttp, scheduler);
    const debounceUseCase = new DebounceSessionUseCase(storage, scheduler);

    const turn: SanitizedTurnDTO = {
      platform: 'CHATGPT',
      prompt: 'Explain Ports and Adapters architecture.',
      response: 'Ports define contracts and adapters implement technical integration.',
      timestamp: Date.now(),
      turnHash: 'hash-chatgpt-ports',
    };

    const debRes = await debounceUseCase.execute(turn);
    const sessionId = SessionId.create(debRes.getValue()).getValue();

    const syncRes = await syncUseCase.execute({
      sessionId,
      endpointUrl: 'http://localhost:3000/api/sessions',
      authToken: 'test-token',
    });

    expect(syncRes.isSuccess()).toBe(true);
    expect(mockHttp.syncSession).toHaveBeenCalledTimes(1);

    const updatedSession = await storage.findById(sessionId);
    expect(updatedSession?.status).toBe('SYNCED');
    expect(mockChrome.alarms.clear).toHaveBeenCalledWith(`liya_debounce_${sessionId.getValue()}`);
  });
});
