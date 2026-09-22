import { ValueObject } from '@shared/domain/value-object';
import { Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/errors';

interface SessionIdProps {
  value: string;
}

export class SessionId extends ValueObject<SessionIdProps> {
  private constructor(value: string) {
    super({ value });
  }

  public static generate(): SessionId {
    // Standard RFC4122 v4 UUID generator (works across environments)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return new SessionId(crypto.randomUUID());
    }
    const rnd = Math.random().toString(36).substring(2, 10);
    return new SessionId(`sess-${Date.now()}-${rnd}`);
  }

  public static create(raw: string): Result<SessionId, ValidationError> {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
      return Result.err(new ValidationError('sessionId', 'SessionId cannot be empty.'));
    }
    return Result.ok(new SessionId(raw.trim()));
  }

  public getValue(): string {
    return this.props.value;
  }
}
