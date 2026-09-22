/**
 * Domain error classes for rich error models across DDD layers.
 */

export abstract class DomainError extends Error {
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  public readonly code = 'VALIDATION_ERROR';

  constructor(public readonly field: string, message: string) {
    super(`Validation failed for '${field}': ${message}`);
  }
}

export class InvariantViolationError extends DomainError {
  public readonly code = 'INVARIANT_VIOLATION';

  constructor(message: string) {
    super(`Domain invariant violated: ${message}`);
  }
}

export class EntityNotFoundError extends DomainError {
  public readonly code = 'ENTITY_NOT_FOUND';

  constructor(entityName: string, id: string) {
    super(`${entityName} with identifier '${id}' was not found.`);
  }
}

export class ConflictError extends DomainError {
  public readonly code = 'CONFLICT_ERROR';

  constructor(message: string) {
    super(message);
  }
}
