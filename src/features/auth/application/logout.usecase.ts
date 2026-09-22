import { AuthPort } from '../ports/auth.port';
import { Result } from '@shared/domain/result';

export class LogoutUseCase {
  constructor(private readonly authPort: AuthPort) {}

  public async execute(): Promise<Result<void, Error>> {
    try {
      await this.authPort.logout();
      return Result.ok(undefined);
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
