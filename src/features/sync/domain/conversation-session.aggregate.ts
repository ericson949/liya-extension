import { AggregateRoot } from '@shared/domain/aggregate-root';
import { SessionId } from './session-id.vo';
import { PlatformType } from '@features/capture/domain/platform-type.vo';
import { ConversationTurn } from '@features/capture/domain/conversation-turn.entity';
import { SessionStatus } from './session-status';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';
import { Result } from '@shared/domain/result';
import { DomainError, ConflictError, InvariantViolationError } from '@shared/domain/errors';
import { SessionPayload, TurnPayload } from './session-payload.dto';
import {
  TurnCapturedEvent,
  TurnDiscardedEvent,
  SessionDebouncedEvent,
  SessionSyncedEvent,
} from './events';

export interface ConversationSessionProps {
  id: SessionId;
  platform: PlatformType;
  turns?: ConversationTurn[];
  status?: SessionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationSession extends AggregateRoot<SessionId> {
  public readonly platform: PlatformType;
  private turns: ConversationTurn[];
  private _status: SessionStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ConversationSessionProps) {
    super(props.id);
    this.platform = props.platform;
    this.turns = props.turns ? [...props.turns] : [];
    this._status = props.status ?? 'ACTIVE';
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public static create(id: SessionId, platform: PlatformType): ConversationSession {
    return new ConversationSession({
      id,
      platform,
      turns: [],
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public static reconstitute(props: ConversationSessionProps): ConversationSession {
    return new ConversationSession(props);
  }

  public get status(): SessionStatus {
    return this._status;
  }

  public get turnsCount(): number {
    return this.turns.length;
  }

  public getTurns(): ReadonlyArray<ConversationTurn> {
    return [...this.turns];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public addTurn(turn: ConversationTurn): Result<void, DomainError> {
    // Platform matching invariant
    if (!this.platform.equals(turn.platform)) {
      return Result.err(
        new InvariantViolationError(
          `Cannot add turn from platform '${turn.platform.value}' to session belonging to '${this.platform.value}'.`
        )
      );
    }

    // Deduplication invariant: check if turn with same hash already exists
    const duplicate = this.turns.some((t) => t.hash.equals(turn.hash));
    if (duplicate) {
      return Result.err(new ConflictError(`Turn with hash '${turn.hash.getValue()}' is already present in session.`));
    }

    this.turns.push(turn);
    this._status = 'ACTIVE';
    this._updatedAt = new Date();

    this.addDomainEvent(new TurnCapturedEvent(this.id.getValue(), turn.hash));
    return Result.ok(undefined);
  }

  public discardTurn(turnHash: TurnHash): void {
    const beforeCount = this.turns.length;
    this.turns = this.turns.filter((t) => !t.hash.equals(turnHash));

    if (this.turns.length < beforeCount) {
      this._updatedAt = new Date();
      this.addDomainEvent(new TurnDiscardedEvent(this.id.getValue(), turnHash));
    }
  }

  public markDebouncing(delayMinutes: number): void {
    this._status = 'DEBOUNCING';
    this._updatedAt = new Date();
    this.addDomainEvent(new SessionDebouncedEvent(this.id.getValue(), delayMinutes));
  }

  public markSyncing(): void {
    this._status = 'SYNCING';
    this._updatedAt = new Date();
  }

  public markSynced(): void {
    this._status = 'SYNCED';
    this._updatedAt = new Date();
    this.addDomainEvent(new SessionSyncedEvent(this.id.getValue(), this.turns.length));
  }

  public markFailed(): void {
    this._status = 'FAILED';
    this._updatedAt = new Date();
  }

  public hasSignificantContent(): boolean {
    if (this.turns.length === 0) return false;
    // Must have at least 1 turn with non-trivial text
    return this.turns.some((t) => t.responseRedacted.content.trim().length >= 10);
  }

  public flush(): SessionPayload {
    const serializedTurns: TurnPayload[] = this.turns.map((t) => ({
      hash: t.hash.getValue(),
      prompt: t.promptRedacted.content,
      response: t.responseRedacted.content,
      capturedAt: t.capturedAt.toISOString(),
      conversationId: t.conversationId,
      turnIndex: t.turnIndex,
      redactionStats: {
        promptRedactions: t.promptRedacted.redactionCount,
        responseRedactions: t.responseRedacted.redactionCount,
        originalPromptLength: t.promptRedacted.originalLength,
        originalResponseLength: t.responseRedacted.originalLength,
      },
    }));

    return {
      sessionId: this.id.getValue(),
      platform: this.platform.value,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      turns: serializedTurns,
      totalTurns: this.turns.length,
      metadata: {
        significant: this.hasSignificantContent(),
      },
    };
  }
}
