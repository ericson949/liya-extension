import { describe, it, expect } from 'vitest';
import { ConversationSession } from '@features/sync/domain/conversation-session.aggregate';
import { SessionId } from '@features/sync/domain/session-id.vo';
import { PlatformType } from '@features/capture/domain/platform-type.vo';
import { ConversationTurn } from '@features/capture/domain/conversation-turn.entity';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';
import { Prompt } from '@features/capture/domain/prompt.vo';
import { Response } from '@features/capture/domain/response.vo';
import { RedactedContent } from '@features/sanitization/domain/redacted-content.vo';

describe('ConversationSession Aggregate Root', () => {
  const platform = PlatformType.create('CHATGPT').getValue();

  async function createTurn(promptText: string, responseText: string, platformType = platform): Promise<ConversationTurn> {
    const p = Prompt.create(promptText).getValue();
    const r = Response.create(responseText).getValue();
    const hash = await TurnHash.create(promptText, responseText);
    const pRedacted = RedactedContent.create(promptText, promptText.length, 0).getValue();
    const rRedacted = RedactedContent.create(responseText, responseText.length, 0).getValue();

    return new ConversationTurn({
      hash,
      platform: platformType,
      prompt: p,
      response: r,
      promptRedacted: pRedacted,
      responseRedacted: rRedacted,
      capturedAt: new Date(),
    });
  }

  it('creates an active session with zero turns', () => {
    const sessionId = SessionId.generate();
    const session = ConversationSession.create(sessionId, platform);

    expect(session.id.equals(sessionId)).toBe(true);
    expect(session.status).toBe('ACTIVE');
    expect(session.turnsCount).toBe(0);
    expect(session.hasSignificantContent()).toBe(false);
  });

  it('adds a valid turn and emits TurnCapturedEvent', async () => {
    const session = ConversationSession.create(SessionId.generate(), platform);
    const turn = await createTurn('How does hexagonal architecture work?', 'Hexagonal architecture isolates domain rules from ports and adapters.');

    const result = session.addTurn(turn);
    expect(result.isSuccess()).toBe(true);
    expect(session.turnsCount).toBe(1);
    expect(session.hasSignificantContent()).toBe(true);

    const events = session.domainEvents;
    expect(events.length).toBe(1);
    expect(events[0]?.eventType).toBe('TurnCapturedEvent');
  });

  it('enforces platform match invariant', async () => {
    const session = ConversationSession.create(SessionId.generate(), platform);
    const claudePlatform = PlatformType.create('CLAUDE').getValue();
    const turn = await createTurn('Question', 'Valid response with more than ten characters', claudePlatform);

    const result = session.addTurn(turn);
    expect(result.isFailure()).toBe(true);
    expect(result.getError().message).toContain("Cannot add turn from platform 'CLAUDE' to session belonging to 'CHATGPT'");
  });

  it('enforces deduplication invariant for duplicate turns', async () => {
    const session = ConversationSession.create(SessionId.generate(), platform);
    const turn1 = await createTurn('Same question', 'Same response that is long enough.');
    const turn2 = await createTurn('Same question', 'Same response that is long enough.');

    expect(session.addTurn(turn1).isSuccess()).toBe(true);
    const result2 = session.addTurn(turn2);
    expect(result2.isFailure()).toBe(true);
    expect(session.turnsCount).toBe(1);
  });

  it('discards a turn by hash and emits TurnDiscardedEvent', async () => {
    const session = ConversationSession.create(SessionId.generate(), platform);
    const turn = await createTurn('Question to delete', 'Response to delete that satisfies minimum length.');

    session.addTurn(turn);
    expect(session.turnsCount).toBe(1);

    session.discardTurn(turn.hash);
    expect(session.turnsCount).toBe(0);

    const discardedEvents = session.domainEvents.filter((e) => e.eventType === 'TurnDiscardedEvent');
    expect(discardedEvents.length).toBe(1);
  });

  it('transitions through FSM lifecycle states: ACTIVE -> DEBOUNCING -> SYNCING -> SYNCED', () => {
    const session = ConversationSession.create(SessionId.generate(), platform);
    expect(session.status).toBe('ACTIVE');

    session.markDebouncing(2);
    expect(session.status).toBe('DEBOUNCING');

    session.markSyncing();
    expect(session.status).toBe('SYNCING');

    session.markSynced();
    expect(session.status).toBe('SYNCED');

    const syncedEvents = session.domainEvents.filter((e) => e.eventType === 'SessionSyncedEvent');
    expect(syncedEvents.length).toBe(1);
  });

  it('flushes a valid wire payload', async () => {
    const session = ConversationSession.create(SessionId.generate(), platform);
    const turn = await createTurn('Test Prompt', 'Test Response with sufficient length.');
    session.addTurn(turn);

    const payload = session.flush();
    expect(payload.sessionId).toBe(session.id.getValue());
    expect(payload.platform).toBe('CHATGPT');
    expect(payload.turns.length).toBe(1);
    expect(payload.turns[0]?.prompt).toBe('Test Prompt');
    expect(payload.metadata?.significant).toBe(true);
  });
});
