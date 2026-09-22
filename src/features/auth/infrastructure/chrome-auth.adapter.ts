import { AuthPort, AuthUserProfile, OAuthProvider } from '../ports/auth.port';
import { browserAPI } from '@shared/utils/browser-api';

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'authToken',
  LIYA_TOKEN: 'liya_auth_token',
  LEGACY_TOKEN: 'synapse_auth_token',
  USER: 'liya_auth_user',
};

export class ChromeAuthAdapter implements AuthPort {
  private defaultBackendUrl: string;

  constructor(defaultBackendUrl: string = 'http://localhost:3000') {
    this.defaultBackendUrl = defaultBackendUrl;
  }

  /**
   * Generates the standard Chrome extension redirect URI:
   * e.g. https://<EXTENSION_ID>.chromiumapp.org/oauth2
   */
  public getRedirectUri(): string {
    if (typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL) {
      return chrome.identity.getRedirectURL('oauth2');
    }
    if (browserAPI.identity?.getRedirectURL) {
      return browserAPI.identity.getRedirectURL('oauth2');
    }
    const extId = (typeof chrome !== 'undefined' && chrome.runtime?.id) ? chrome.runtime.id : 'liya-extension';
    return `https://${extId}.chromiumapp.org/oauth2`;
  }

  /**
   * Initiates native OAuth PKCE web flow via chrome.identity.launchWebAuthFlow
   */
  public async loginWithProvider(provider: OAuthProvider, customBaseUrl?: string): Promise<string> {
    const base = this.resolveBaseUrl(customBaseUrl);
    const redirectUri = this.getRedirectUri();
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const authUrl = `${base}/api/v1/auth/${provider}/authorize?redirect_uri=${encodedRedirectUri}`;

    const responseUrl = await this.launchFlow(authUrl);
    const token = this.extractTokenFromUrl(responseUrl);

    if (!token) {
      throw new Error("Aucun jeton d'accès retourné par le serveur.");
    }

    // Decode JWT payload to extract user info
    const payload = this.decodeJwtPayload(token);
    const userProfile: AuthUserProfile = {
      id: payload?.sub || payload?.id || payload?.user_id,
      email: payload?.email,
      name: payload?.name || payload?.full_name || payload?.given_name,
      picture: payload?.picture || payload?.avatar_url,
      provider,
    };

    // Store token and user details in storage
    await browserAPI.storage.local.set({
      [AUTH_STORAGE_KEYS.TOKEN]: token,
      [AUTH_STORAGE_KEYS.LIYA_TOKEN]: token,
      [AUTH_STORAGE_KEYS.LEGACY_TOKEN]: token,
      [AUTH_STORAGE_KEYS.USER]: userProfile,
    });

    return token;
  }

  /**
   * Clears stored tokens and user metadata.
   */
  public async logout(): Promise<void> {
    await browserAPI.storage.local.remove([
      AUTH_STORAGE_KEYS.TOKEN,
      AUTH_STORAGE_KEYS.LIYA_TOKEN,
      AUTH_STORAGE_KEYS.LEGACY_TOKEN,
      AUTH_STORAGE_KEYS.USER,
    ]);
  }

  /**
   * Retrieves the current stored auth token.
   */
  public async getStoredToken(): Promise<string | null> {
    const data = await browserAPI.storage.local.get([
      AUTH_STORAGE_KEYS.LIYA_TOKEN,
      AUTH_STORAGE_KEYS.TOKEN,
    ]);
    const token = data[AUTH_STORAGE_KEYS.LIYA_TOKEN] || data[AUTH_STORAGE_KEYS.TOKEN];
    return typeof token === 'string' && token.length > 0 ? token : null;
  }

  /**
   * Retrieves the current logged-in user profile.
   */
  public async getStoredUser(): Promise<AuthUserProfile | null> {
    const data = await browserAPI.storage.local.get(AUTH_STORAGE_KEYS.USER);
    const user = data[AUTH_STORAGE_KEYS.USER];
    return user && typeof user === 'object' ? (user as AuthUserProfile) : null;
  }

  private resolveBaseUrl(customUrl?: string): string {
    if (!customUrl || customUrl.trim().length === 0) {
      return this.defaultBackendUrl.replace(/\/+$/, '');
    }
    try {
      const url = new URL(customUrl.trim());
      return url.origin;
    } catch {
      return customUrl.trim().replace(/\/+$/, '');
    }
  }

  private launchFlow(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 1. Check native chrome.identity
      if (typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
        chrome.identity.launchWebAuthFlow(
          {
            url,
            interactive: true,
          },
          (responseUrl) => {
            if (chrome.runtime?.lastError || !responseUrl) {
              const err = chrome.runtime?.lastError?.message || 'Authentification annulée';
              return reject(new Error(err));
            }
            resolve(responseUrl);
          }
        );
        return;
      }

      // 2. Check browserAPI abstraction
      if (browserAPI.identity?.launchWebAuthFlow) {
        browserAPI.identity
          .launchWebAuthFlow({ url, interactive: true })
          .then(resolve)
          .catch(reject);
        return;
      }

      reject(new Error("L'API chrome.identity n'est pas disponible dans cet environnement."));
    });
  }

  private extractTokenFromUrl(responseUrl: string): string | null {
    try {
      const url = new URL(responseUrl);
      // Check query parameter (?token=...)
      const queryToken = url.searchParams.get('token');
      if (queryToken) return queryToken;

      // Check hash fragment (#token=...)
      if (url.hash && url.hash.includes('token=')) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const hashToken = hashParams.get('token');
        if (hashToken) return hashToken;
      }
      return null;
    } catch {
      // Fallback regex if URL parsing fails
      const match = responseUrl.match(/[?&#]token=([^&#]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    }
  }

  private decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
}
