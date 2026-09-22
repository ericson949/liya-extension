import { describe, it, expect, vi } from 'vitest';
import { RawTurnDTO } from '@features/capture/domain/raw-turn.dto';
import { SanitizeTurnUseCase } from '@features/sanitization/application/sanitize-turn.usecase';
import { ChromeStorageAdapter } from '@features/sync/infrastructure/chrome-storage.adapter';
import { ChromeAlarmsAdapter } from '@features/sync/infrastructure/chrome-alarms.adapter';
import { DebounceSessionUseCase } from '@features/sync/application/debounce-session.usecase';
import { SyncSessionUseCase } from '@features/sync/application/sync-session.usecase';
import { IngestionHttpPort } from '@features/sync/ports/ingestion-http.port';
import { SessionPayload } from '@features/sync/domain/session-payload.dto';
import { Result } from '@shared/domain/result';
import { SessionId } from '@features/sync/domain/session-id.vo';

describe('Synapse Capture Engine — End-to-End Pipeline Integration', () => {
  it('processes raw turn through sanitization, session aggregation, debouncing, and HTTP sync', async () => {
    // 1. Arrange infrastructure and application services
    const storageAdapter = new ChromeStorageAdapter();
    const schedulerAdapter = new ChromeAlarmsAdapter();
    const sanitizeUseCase = new SanitizeTurnUseCase();
    const debounceUseCase = new DebounceSessionUseCase(storageAdapter, schedulerAdapter);

    let sentPayload: SessionPayload | null = null;
    const mockHttpPort: IngestionHttpPort = {
      syncSession: vi.fn().mockImplementation((payload: SessionPayload) => {
        sentPayload = payload;
        return Promise.resolve(Result.ok(undefined));
      }),
    };

    const syncUseCase = new SyncSessionUseCase(storageAdapter, mockHttpPort, schedulerAdapter);

    // 2. Incoming Raw Turn with sensitive information (AWS key + credit card)
    const rawTurn: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: 'Here is my AWS key AKIAIOSFODNN7EXAMPLE and card 4532-1488-1234-5678 to test payment.',
      response: 'Processing payment with card 4532-1488-1234-5678. Transaction authorized successfully.',
      timestamp: Date.now(),
    };

    // 3. Step: Sanitize
    const sanitizeResult = await sanitizeUseCase.execute(rawTurn);
    expect(sanitizeResult.isSuccess()).toBe(true);

    const sanitizedTurn = sanitizeResult.getValue();
    // Invariant: raw secrets must NEVER leave the sanitization layer
    expect(sanitizedTurn.prompt).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(sanitizedTurn.prompt).not.toContain('4532-1488-1234-5678');
    expect(sanitizedTurn.response).not.toContain('4532-1488-1234-5678');
    expect(sanitizedTurn.prompt).toContain('[REDACTED_AWS_ACCESS_KEY]');
    expect(sanitizedTurn.prompt).toContain('[REDACTED_CREDIT_CARD]');

    // 4. Step: Debounce & Aggregate into Session
    const debounceResult = await debounceUseCase.execute(sanitizedTurn, { delayMinutes: 2 });
    expect(debounceResult.isSuccess()).toBe(true);

    const sessionIdStr = debounceResult.getValue();
    const sessionId = SessionId.create(sessionIdStr).getValue();

    // Verify stored session
    const storedSession = await storageAdapter.findById(sessionId);
    expect(storedSession).not.toBeNull();
    expect(storedSession?.status).toBe('DEBOUNCING');
    expect(storedSession?.turnsCount).toBe(1);

    // 5. Step: Remote Ingestion Sync (simulating alarm trigger)
    const syncResult = await syncUseCase.execute({
      sessionId,
      endpointUrl: 'https://api.synapse.internal/v1/sessions',
      authToken: 'synapse_bearer_token_abc',
    });

    expect(syncResult.isSuccess()).toBe(true);
    expect(mockHttpPort.syncSession).toHaveBeenCalledTimes(1);

    // 6. Verify wire payload sent to backend
    expect(sentPayload).not.toBeNull();
    const payload = sentPayload as unknown as SessionPayload;
    expect(payload.sessionId).toBe(sessionIdStr);
    expect(payload.platform).toBe('CHATGPT');
    expect(payload.totalTurns).toBe(1);
    expect(payload.turns[0]?.prompt).toContain('[REDACTED_AWS_ACCESS_KEY]');
    expect(payload.turns[0]?.response).toContain('[REDACTED_CREDIT_CARD]');

    // 7. Verify session final state in storage
    const finalizedSession = await storageAdapter.findById(sessionId);
    expect(finalizedSession?.status).toBe('SYNCED');
  });
});
