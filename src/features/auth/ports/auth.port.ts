export type OAuthProvider = 'google' | 'github' | 'apple';

export interface AuthUserProfile {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: OAuthProvider;
}

export interface AuthPort {
  getRedirectUri(): string;
  loginWithProvider(provider: OAuthProvider, customBaseUrl?: string): Promise<string>;
  logout(): Promise<void>;
  getStoredToken(): Promise<string | null>;
  getStoredUser(): Promise<AuthUserProfile | null>;
}
