import { browserAPI } from '@shared/utils/browser-api';
import { getI18n } from '@shared/utils/i18n';

document.addEventListener('DOMContentLoaded', async () => {
  const i18n = getI18n();

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

  // Apply localized labels dynamically based on detected browser language
  if (statLabelTurns) statLabelTurns.textContent = i18n.statTurns;
  if (statLabelSessions) statLabelSessions.textContent = i18n.statSessions;
  if (labelEndpoint) labelEndpoint.textContent = i18n.labelEndpoint;
  if (labelAuth) labelAuth.textContent = i18n.labelAuthToken;
  if (labelPauseSync) labelPauseSync.textContent = i18n.labelPauseSync;
  if (btnSave) btnSave.textContent = i18n.btnSave;
  if (btnSyncNow) btnSyncNow.textContent = i18n.btnSyncNow;

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
    }
  } catch (err) {
    console.error('Failed to load Liya AI status:', err);
  }

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
