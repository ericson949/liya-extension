/**
 * Base abstract class for Entities.
 * Entities have an identity (id) that runs through their lifecycle.
 */
export abstract class Entity<TId> {
  protected readonly _id: TId;

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  public equals(other?: Entity<TId> | null): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    const thisId = this._id as unknown;
    const otherId = other._id as unknown;
    if (
      thisId &&
      typeof thisId === 'object' &&
      'equals' in (thisId as { equals: (o: unknown) => boolean })
    ) {
      return (thisId as { equals: (o: unknown) => boolean }).equals(otherId);
    }
    return thisId === otherId;
  }
}
