import { DomainEvent } from '@shared/domain/domain-event';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';

export class TurnCapturedEvent implements DomainEvent {
  public readonly eventId = crypto.randomUUID?.() ?? `evt-${Date.now()}`;
  public readonly occurredAt = new Date();
  public readonly eventType = 'TurnCapturedEvent';

  constructor(
    public readonly aggregateId: string,
    public readonly turnHash: TurnHash
  ) {}
}

export class TurnDiscardedEvent implements DomainEvent {
  public readonly eventId = crypto.randomUUID?.() ?? `evt-${Date.now()}`;
  public readonly occurredAt = new Date();
  public readonly eventType = 'TurnDiscardedEvent';

  constructor(
    public readonly aggregateId: string,
    public readonly turnHash: TurnHash
  ) {}
}

export class SessionDebouncedEvent implements DomainEvent {
  public readonly eventId = crypto.randomUUID?.() ?? `evt-${Date.now()}`;
  public readonly occurredAt = new Date();
  public readonly eventType = 'SessionDebouncedEvent';

  constructor(
    public readonly aggregateId: string,
    public readonly delayMinutes: number
  ) {}
}

export class SessionSyncedEvent implements DomainEvent {
  public readonly eventId = crypto.randomUUID?.() ?? `evt-${Date.now()}`;
  public readonly occurredAt = new Date();
  public readonly eventType = 'SessionSyncedEvent';

  constructor(
    public readonly aggregateId: string,
    public readonly syncedTurnCount: number
  ) {}
}
