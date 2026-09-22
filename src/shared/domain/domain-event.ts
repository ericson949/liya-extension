/**
 * Base contract for Domain Events in Synapse Capture Engine.
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
  readonly aggregateId: string;
}
