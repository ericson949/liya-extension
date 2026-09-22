import { SessionPayload } from '../domain/session-payload.dto';
import { Result } from '@shared/domain/result';

export interface SyncError {
  code: 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'SERVER_ERROR' | 'INVALID_PAYLOAD';
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export interface IngestionHttpPort {
  syncSession(payload: SessionPayload, endpointUrl: string, authToken?: string): Promise<Result<void, SyncError>>;
}
