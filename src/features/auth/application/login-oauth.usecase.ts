import { AuthPort, OAuthProvider } from '../ports/auth.port';
import { Result } from '@shared/domain/result';

export interface LoginOAuthCommand {
  provider: OAuthProvider;
  endpointUrl?: string;
}

export class LoginOAuthUseCase {
  constructor(private readonly authPort: AuthPort) {}

  public async execute(command: LoginOAuthCommand): Promise<Result<string, Error>> {
    try {
      const token = await this.authPort.loginWithProvider(command.provider, command.endpointUrl);
      return Result.ok(token);
    } catch (err) {
      return Result.err(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
