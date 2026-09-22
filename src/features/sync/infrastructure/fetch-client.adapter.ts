import { IngestionHttpPort, SyncError } from '../ports/ingestion-http.port';
import { SessionPayload } from '../domain/session-payload.dto';
import { Result } from '@shared/domain/result';

export class FetchHttpClientAdapter implements IngestionHttpPort {
  public async syncSession(
    payload: SessionPayload,
    endpointUrl: string,
    authToken?: string
  ): Promise<Result<void, SyncError>> {
    if (!endpointUrl) {
      return Result.err({
        code: 'INVALID_PAYLOAD',
        message: 'No ingestion endpoint URL configured.',
        retryable: false,
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Liya-Client': 'liya-extension-v1',
      'X-Synapse-Client': 'liya-extension-v1',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return Result.ok(undefined);
      }

      if (response.status === 401 || response.status === 403) {
        return Result.err({
          code: 'UNAUTHORIZED',
          message: `Authentication failed (status ${response.status}). Check your auth token in settings.`,
          statusCode: response.status,
          retryable: false,
        });
      }

      if (response.status >= 500) {
        return Result.err({
          code: 'SERVER_ERROR',
          message: `Remote server error (status ${response.status}). Will retry.`,
          statusCode: response.status,
          retryable: true,
        });
      }

      return Result.err({
        code: 'INVALID_PAYLOAD',
        message: `Ingestion rejected by server (status ${response.status}).`,
        statusCode: response.status,
        retryable: false,
      });
    } catch (error) {
      return Result.err({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed.',
        retryable: true,
      });
    }
  }
}
