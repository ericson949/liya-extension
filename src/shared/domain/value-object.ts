/**
 * Base abstract class for Value Objects.
 * Value objects are immutable and compared by structural equality rather than reference or identity.
 */
export abstract class ValueObject<TProps> {
  protected readonly props: Readonly<TProps>;

  constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  public equals(other?: ValueObject<TProps> | null): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return this.deepEquals(this.props, other.props);
  }

  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return false;
    }
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      const valA = (a as Record<string, unknown>)[key];
      const valB = (b as Record<string, unknown>)[key];
      if (!this.deepEquals(valA, valB)) return false;
    }
    return true;
  }
}
