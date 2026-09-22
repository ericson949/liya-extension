/**
 * Functional Result<T, E> monad for strict error handling without exceptions.
 */

export class Result<T, E> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {
    if (_isSuccess && _error !== undefined) {
      throw new Error('InvalidResult: A successful result cannot contain an error.');
    }
    if (!_isSuccess && _error === undefined) {
      throw new Error('InvalidResult: A failure result must contain an error.');
    }
  }

  public static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  public static err<T = never, E = unknown>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public isSuccess(): boolean {
    return this._isSuccess;
  }

  public isFailure(): boolean {
    return !this._isSuccess;
  }

  public getValue(): T {
    if (!this._isSuccess) {
      throw new Error(`Cannot retrieve value from a failed Result: ${JSON.stringify(this._error)}`);
    }
    return this._value as T;
  }

  public getError(): E {
    if (this._isSuccess) {
      throw new Error('Cannot retrieve error from a successful Result.');
    }
    return this._error as E;
  }

  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.ok<U, E>(fn(this._value as T));
    }
    return Result.err<U, E>(this._error as E);
  }

  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isSuccess) {
      return fn(this._value as T);
    }
    return Result.err<U, E>(this._error as E);
  }

  public getOrElse(fallback: T): T {
    return this._isSuccess ? (this._value as T) : fallback;
  }
}
