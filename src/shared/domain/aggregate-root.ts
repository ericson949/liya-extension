import { Entity } from './entity';
import { DomainEvent } from './domain-event';

/**
 * Base abstract class for Aggregate Roots in DDD.
 * Aggregate roots encapsulate transactional consistency boundaries and collect domain events.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
