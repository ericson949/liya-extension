import { ValueObject } from '@shared/domain/value-object';
import { Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/errors';

interface ResponseProps {
  value: string;
}

export class Response extends ValueObject<ResponseProps> {
  public static readonly MIN_LENGTH = 10;

  private constructor(props: ResponseProps) {
    super(props);
  }

  public static create(raw: string): Result<Response, ValidationError> {
    if (typeof raw !== 'string') {
      return Result.err(new ValidationError('response', 'Response must be a string'));
    }

    const trimmed = raw.trim();
    if (trimmed.length < Response.MIN_LENGTH) {
      return Result.err(
        new ValidationError('response', `Response must be at least ${Response.MIN_LENGTH} characters long (got ${trimmed.length}).`)
      );
    }

    return Result.ok(new Response({ value: trimmed }));
  }

  public get value(): string {
    return this.props.value;
  }
}
