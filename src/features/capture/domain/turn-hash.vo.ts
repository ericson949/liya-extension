import { sha256Hash } from '@shared/utils/crypto';
import { ValueObject } from '@shared/domain/value-object';

interface TurnHashProps {
  value: string;
}

export class TurnHash extends ValueObject<TurnHashProps> {
  private constructor(value: string) {
    super({ value });
  }

  public static async create(prompt: string, response: string): Promise<TurnHash> {
    const raw = `${prompt.trim()}||${response.trim()}`;
    const hash = await sha256Hash(raw);
    return new TurnHash(hash);
  }

  public static fromHash(hash: string): TurnHash {
    return new TurnHash(hash);
  }

  public getValue(): string {
    return this.props.value;
  }

  public override equals(other?: TurnHash | null): boolean {
    if (!other || !(other instanceof TurnHash)) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
