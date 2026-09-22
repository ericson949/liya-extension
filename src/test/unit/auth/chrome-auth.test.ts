import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChromeAuthAdapter, AUTH_STORAGE_KEYS } from '../../../features/auth/infrastructure/chrome-auth.adapter';
import { LoginOAuthUseCase } from '../../../features/auth/application/login-oauth.usecase';
import { LogoutUseCase } from '../../../features/auth/application/logout.usecase';
import { mockChrome } from '../../setup';

describe('OAuth PKCE Authentication Module (Liya AI Extension)', () => {
  let authAdapter: ChromeAuthAdapter;

  beforeEach(() => {
    mockChrome.resetAll();
    authAdapter = new ChromeAuthAdapter('https://api.liya.internal');
  });

  describe('Redirect URI Generation', () => {
    it('generates a valid chromiumapp.org redirect URI for OAuth2', () => {
      const redirectUri = authAdapter.getRedirectUri();
      expect(redirectUri).toContain('chromiumapp.org');
      expect(mockChrome.identity.getRedirectURL).toHaveBeenCalledWith('oauth2');
    });
  });

  describe('loginWithProvider', () => {
    it('constructs correct authorization URL and completes OAuth flow for Google', async () => {
      const token = await authAdapter.loginWithProvider('google');

      expect(mockChrome.identity.launchWebAuthFlow).toHaveBeenCalledTimes(1);
      const callArgs = mockChrome.identity.launchWebAuthFlow.mock.calls[0][0];

      expect(callArgs.interactive).toBe(true);
      expect(callArgs.url).toContain('https://api.liya.internal/api/v1/auth/google/authorize?redirect_uri=');
      expect(callArgs.url).toContain(encodeURIComponent('https://test-extension-id.chromiumapp.org/oauth2'));

      // Check return token
      expect(token).toContain('eyJhbGciOi');

      // Check stored token in storage
      const storedToken = await authAdapter.getStoredToken();
      expect(storedToken).toBe(token);

      // Check stored user info decoded from JWT
      const storedUser = await authAdapter.getStoredUser();
      expect(storedUser).not.toBeNull();
      expect(storedUser?.email).toBe('test@example.com');
      expect(storedUser?.name).toBe('Test User');
      expect(storedUser?.id).toBe('user-123');
      expect(storedUser?.provider).toBe('google');
    });

    it('works with GitHub and Apple providers and custom backend URL', async () => {
      await authAdapter.loginWithProvider('github', 'https://custom-backend.ai/api/sessions');

      const callArgs = mockChrome.identity.launchWebAuthFlow.mock.calls[0][0];
      expect(callArgs.url).toContain('https://custom-backend.ai/api/v1/auth/github/authorize');

      const user = await authAdapter.getStoredUser();
      expect(user?.provider).toBe('github');
    });

    it('rejects if chrome.identity reports an error (e.g. user cancelled window)', async () => {
      mockChrome.identity.launchWebAuthFlow.mockImplementationOnce((_details, callback) => {
        (mockChrome.runtime as any).lastError = { message: 'The user cancelled the authorization flow' };
        callback(undefined);
      });

      await expect(authAdapter.loginWithProvider('google')).rejects.toThrow(
        'The user cancelled the authorization flow'
      );
    });

    it('rejects if server returns redirect URL without token parameter', async () => {
      mockChrome.identity.launchWebAuthFlow.mockImplementationOnce((_details, callback) => {
        callback('https://test-extension-id.chromiumapp.org/oauth2?error=access_denied');
      });

      await expect(authAdapter.loginWithProvider('google')).rejects.toThrow(
        "Aucun jeton d'accès retourné par le serveur."
      );
    });
  });

  describe('logout', () => {
    it('removes stored tokens and user profile', async () => {
      await authAdapter.loginWithProvider('google');
      expect(await authAdapter.getStoredToken()).not.toBeNull();

      await authAdapter.logout();
      expect(await authAdapter.getStoredToken()).toBeNull();
      expect(await authAdapter.getStoredUser()).toBeNull();
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith([
        AUTH_STORAGE_KEYS.TOKEN,
        AUTH_STORAGE_KEYS.LIYA_TOKEN,
        AUTH_STORAGE_KEYS.LEGACY_TOKEN,
        AUTH_STORAGE_KEYS.USER,
      ]);
    });
  });

  describe('Application UseCases (DDD)', () => {
    it('LoginOAuthUseCase returns Result.ok on success', async () => {
      const useCase = new LoginOAuthUseCase(authAdapter);
      const result = await useCase.execute({ provider: 'google' });

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toContain('eyJhbGciOi');
    });

    it('LoginOAuthUseCase returns Result.err when cancelled', async () => {
      mockChrome.identity.launchWebAuthFlow.mockImplementationOnce((_details, callback) => {
        (mockChrome.runtime as any).lastError = { message: 'Cancelled' };
        callback(undefined);
      });

      const useCase = new LoginOAuthUseCase(authAdapter);
      const result = await useCase.execute({ provider: 'google' });

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toBe('Cancelled');
    });

    it('LogoutUseCase returns Result.ok on success', async () => {
      const useCase = new LogoutUseCase(authAdapter);
      const result = await useCase.execute();

      expect(result.isSuccess()).toBe(true);
    });
  });
});
