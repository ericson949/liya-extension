import { ValueObject } from '@shared/domain/value-object';
import { Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/errors';

interface PromptProps {
  value: string;
}

export class Prompt extends ValueObject<PromptProps> {
  public static readonly MIN_LENGTH = 3;

  private constructor(props: PromptProps) {
    super(props);
  }

  public static create(raw: string): Result<Prompt, ValidationError> {
    if (typeof raw !== 'string') {
      return Result.err(new ValidationError('prompt', 'Prompt must be a string'));
    }

    const trimmed = raw.trim();
    if (trimmed.length < Prompt.MIN_LENGTH) {
      return Result.err(
        new ValidationError('prompt', `Prompt must be at least ${Prompt.MIN_LENGTH} characters long (got ${trimmed.length}).`)
      );
    }

    return Result.ok(new Prompt({ value: trimmed }));
  }

  public get value(): string {
    return this.props.value;
  }
}
