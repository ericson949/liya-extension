import { browserAPI } from '@shared/utils/browser-api';
import { getI18n } from '@shared/utils/i18n';
import { ChromeAuthAdapter } from '@features/auth/infrastructure/chrome-auth.adapter';
import { OAuthProvider } from '@features/auth/ports/auth.port';

document.addEventListener('DOMContentLoaded', async () => {
  const i18n = getI18n();
  const authAdapter = new ChromeAuthAdapter();

  const engineStatus = document.getElementById('engine-status') as HTMLSpanElement;
  const statTurns = document.getElementById('stat-turns') as HTMLDivElement;
  const statSessions = document.getElementById('stat-sessions') as HTMLDivElement;
  const statLabelTurns = document.getElementById('stat-label-turns') as HTMLDivElement;
  const statLabelSessions = document.getElementById('stat-label-sessions') as HTMLDivElement;
  const labelEndpoint = document.getElementById('label-endpoint') as HTMLLabelElement;
  const labelAuth = document.getElementById('label-auth') as HTMLLabelElement;
  const labelPauseSync = document.getElementById('label-pause-sync') as HTMLSpanElement;
  const endpointInput = document.getElementById('endpoint-url') as HTMLInputElement;
  const authInput = document.getElementById('auth-token') as HTMLInputElement;
  const pauseToggle = document.getElementById('sync-pause-toggle') as HTMLInputElement;
  const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
  const btnSyncNow = document.getElementById('btn-sync-now') as HTMLButtonElement;
  const toast = document.getElementById('toast') as HTMLDivElement;
  const siteHintDot = document.getElementById('site-hint-dot') as HTMLSpanElement;
  const siteHintText = document.getElementById('site-hint-text') as HTMLSpanElement;

  // Auth UI elements
  const authLoggedOut = document.getElementById('auth-logged-out') as HTMLDivElement;
  const authLoggedIn = document.getElementById('auth-logged-in') as HTMLDivElement;
  const authTitle = document.getElementById('auth-title') as HTMLSpanElement;
  const authSubtitle = document.getElementById('auth-subtitle') as HTMLSpanElement;
  const btnLoginGoogle = document.getElementById('btn-login-google') as HTMLButtonElement;
  const btnLoginGithub = document.getElementById('btn-login-github') as HTMLButtonElement;
  const btnLoginApple = document.getElementById('btn-login-apple') as HTMLButtonElement;
  const btnTextGoogle = document.getElementById('btn-text-google') as HTMLSpanElement;
  const btnTextGithub = document.getElementById('btn-text-github') as HTMLSpanElement;
  const btnTextApple = document.getElementById('btn-text-apple') as HTMLSpanElement;
  const userAvatar = document.getElementById('user-avatar') as HTMLDivElement;
  const userName = document.getElementById('user-name') as HTMLSpanElement;
  const userEmail = document.getElementById('user-email') as HTMLSpanElement;
  const userProviderBadge = document.getElementById('user-provider-badge') as HTMLSpanElement;
  const btnLogout = document.getElementById('btn-logout') as HTMLButtonElement;

  // Apply localized labels dynamically based on detected browser language
  if (statLabelTurns) statLabelTurns.textContent = i18n.statTurns;
  if (statLabelSessions) statLabelSessions.textContent = i18n.statSessions;
  if (labelEndpoint) labelEndpoint.textContent = i18n.labelEndpoint;
  if (labelAuth) labelAuth.textContent = i18n.labelAuthToken;
  if (labelPauseSync) labelPauseSync.textContent = i18n.labelPauseSync;
  if (btnSave) btnSave.textContent = i18n.btnSave;
  if (btnSyncNow) btnSyncNow.textContent = i18n.btnSyncNow;

  if (authTitle) authTitle.textContent = i18n.authTitle;
  if (authSubtitle) authSubtitle.textContent = i18n.authSubtitle;
  if (btnTextGoogle) btnTextGoogle.textContent = i18n.btnGoogle;
  if (btnTextGithub) btnTextGithub.textContent = i18n.btnGithub;
  if (btnTextApple) btnTextApple.textContent = i18n.btnApple;
  if (btnLogout) btnLogout.title = i18n.btnLogout;

  async function refreshAuthState() {
    try {
      const user = await authAdapter.getStoredUser();
      const token = await authAdapter.getStoredToken();

      if (user || token) {
        if (authLoggedOut) authLoggedOut.style.display = 'none';
        if (authLoggedIn) authLoggedIn.style.display = 'block';

        const displayName = user?.name || user?.email?.split('@')[0] || 'User';
        if (userName) userName.textContent = displayName;
        if (userEmail) userEmail.textContent = user?.email || (token ? 'JWT Session Active' : '');
        if (userProviderBadge) {
          userProviderBadge.textContent = user?.provider ? user.provider.toUpperCase() : 'TOKEN';
        }

        if (userAvatar) {
          if (user?.picture) {
            userAvatar.textContent = '';
            userAvatar.style.backgroundImage = `url(${user.picture})`;
          } else {
            userAvatar.style.backgroundImage = '';
            userAvatar.textContent = displayName.charAt(0).toUpperCase();
          }
        }

        if (token && authInput && !authInput.value) {
          authInput.value = token;
        }
      } else {
        if (authLoggedOut) authLoggedOut.style.display = 'block';
        if (authLoggedIn) authLoggedIn.style.display = 'none';
      }
    } catch {
      // Defensive
    }
  }

  async function handleOAuthLogin(provider: OAuthProvider, btn: HTMLButtonElement, btnText: HTMLSpanElement | null, defaultText: string) {
    btn.disabled = true;
    if (btnText) btnText.textContent = '...';
    try {
      const endpoint = endpointInput.value.trim() || undefined;
      const token = await authAdapter.loginWithProvider(provider, endpoint);
      authInput.value = token;
      await refreshAuthState();
      showToast(i18n.toastLoginSuccess(provider.toUpperCase()));
    } catch (err: any) {
      const msg = err?.message || i18n.toastLoginError;
      showToast(msg, true);
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = defaultText;
    }
  }

  if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', () => handleOAuthLogin('google', btnLoginGoogle, btnTextGoogle, i18n.btnGoogle));
  }
  if (btnLoginGithub) {
    btnLoginGithub.addEventListener('click', () => handleOAuthLogin('github', btnLoginGithub, btnTextGithub, i18n.btnGithub));
  }
  if (btnLoginApple) {
    btnLoginApple.addEventListener('click', () => handleOAuthLogin('apple', btnLoginApple, btnTextApple, i18n.btnApple));
  }
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await authAdapter.logout();
      authInput.value = '';
      await refreshAuthState();
      showToast(i18n.toastLogoutSuccess);
    });
  }

  function showToast(message: string, isError = false) {
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  function renderStatus(isPaused: boolean, isSupported: boolean, platformName: string | null) {
    if (isPaused) {
      engineStatus.textContent = i18n.statusPaused;
      engineStatus.className = 'status-badge paused';
      siteHintDot.className = 'site-hint-dot';
      siteHintText.textContent = i18n.siteHintPaused;
    } else if (isSupported && platformName) {
      engineStatus.textContent = i18n.statusListening(platformName);
      engineStatus.className = 'status-badge';
      siteHintDot.className = 'site-hint-dot active';
      siteHintText.textContent = i18n.siteHintListening(platformName);
    } else {
      engineStatus.textContent = i18n.statusStandby;
      engineStatus.className = 'status-badge standby';
      siteHintDot.className = 'site-hint-dot';
      siteHintText.textContent = i18n.siteHintStandby;
    }
  }

  // Load current status and settings
  let currentIsSupported = false;
  let currentPlatform: string | null = null;

  try {
    const statusResponse = await browserAPI.runtime.sendMessage<{ type: string }, any>({
      type: 'GET_STATUS',
    });

    if (statusResponse && statusResponse.success) {
      statTurns.textContent = String(statusResponse.totalTurns ?? 0);
      statSessions.textContent = String(statusResponse.totalSessions ?? 0);

      const settings = statusResponse.settings || {};
      endpointInput.value = settings.endpointUrl || '';
      authInput.value = settings.authToken || '';
      pauseToggle.checked = Boolean(settings.isSyncPaused);

      currentIsSupported = Boolean(statusResponse.isSupportedUrl);
      currentPlatform = statusResponse.currentTabPlatform || null;

      renderStatus(Boolean(settings.isSyncPaused), currentIsSupported, currentPlatform);
      await refreshAuthState();
    }
  } catch (err) {
    console.error('Failed to load Liya AI status:', err);
  }

  // Initial auth state check even if GET_STATUS had partial data
  await refreshAuthState();

  // Save Settings
  btnSave.addEventListener('click', async () => {
    try {
      const endpointUrl = endpointInput.value.trim();
      const authToken = authInput.value.trim();
      const isSyncPaused = pauseToggle.checked;

      await browserAPI.storage.local.set({
        endpointUrl,
        authToken,
        isSyncPaused,
      });

      renderStatus(isSyncPaused, currentIsSupported, currentPlatform);
      await refreshAuthState();

      showToast(i18n.toastSaveSuccess);
    } catch (err) {
      showToast(i18n.toastSaveError, true);
    }
  });

  // Sync Now
  btnSyncNow.addEventListener('click', async () => {
    btnSyncNow.disabled = true;
    btnSyncNow.textContent = i18n.btnSyncing;

    try {
      const res = await browserAPI.runtime.sendMessage<{ type: string }, any>({
        type: 'SYNC_NOW',
      });

      if (res && res.success) {
        showToast(i18n.toastSyncSuccess(res.syncedCount ?? 0));
      } else {
        showToast(res?.error || i18n.toastSyncError, true);
      }
    } catch (err) {
      showToast(i18n.toastSyncError, true);
    } finally {
      btnSyncNow.disabled = false;
      btnSyncNow.textContent = i18n.btnSyncNow;
    }
  });
});
