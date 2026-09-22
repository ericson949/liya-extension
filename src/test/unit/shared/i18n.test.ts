import { describe, it, expect, afterEach } from 'vitest';
import { detectBrowserLocale, getI18n, SupportedLocale } from '../../../shared/utils/i18n';

describe('i18n Internationalization Engine', () => {
  const supportedLocales: SupportedLocale[] = [
    'en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ru', 'ar', 'nl', 'tr', 'pl', 'hi'
  ];

  it('contains comprehensive translation keys for all 15 supported locales', () => {
    for (const locale of supportedLocales) {
      const t = getI18n(locale);
      expect(t.savedInSynapse).toBeTruthy();
      expect(t.doNotSave).toBeTruthy();
      expect(t.notSaved).toBeTruthy();
      expect(t.statusActive).toBeTruthy();
      expect(t.statusStandby).toBeTruthy();
      expect(t.statusPaused).toBeTruthy();
      expect(t.siteHintStandby).toBeTruthy();
      expect(t.statTurns).toBeTruthy();
      expect(t.statSessions).toBeTruthy();
      expect(t.labelEndpoint).toBeTruthy();
      expect(t.labelAuthToken).toBeTruthy();
      expect(t.labelPauseSync).toBeTruthy();
      expect(t.btnSave).toBeTruthy();
      expect(t.btnSyncNow).toBeTruthy();
      expect(t.btnSyncing).toBeTruthy();
      expect(t.toastSaveSuccess).toBeTruthy();
      expect(t.toastSaveError).toBeTruthy();
      expect(t.toastSyncError).toBeTruthy();
      expect(t.sidebarSyncNone).toBeTruthy();
      expect(t.sidebarSyncFull).toBeTruthy();
      expect(t.sidebarSyncPartial(1, 3)).toContain('1');

      // Test functional strings
      expect(t.secretsRedacted(1)).toBeTruthy();
      expect(t.secretsRedacted(5)).toBeTruthy();
      expect(t.statusListening('ChatGPT')).toContain('ChatGPT');
      expect(t.siteHintListening('Claude')).toContain('Claude');
      expect(t.toastSyncSuccess(3)).toContain('3');
    }
  });

  describe('detectBrowserLocale', () => {
    const originalNavigator = globalThis.navigator;
    const originalChrome = (globalThis as any).chrome;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
      (globalThis as any).chrome = originalChrome;
    });

    it('detects language from chrome.i18n.getUILanguage() when available', () => {
      (globalThis as any).chrome = {
        i18n: {
          getUILanguage: () => 'fr-FR',
        },
      };

      const locale = detectBrowserLocale();
      expect(locale).toBe('fr');
      expect(getI18n().savedInLiya).toBe('Sauvegardé dans Liya AI');
      expect(getI18n().savedInSynapse).toBe('Sauvegardé dans Liya AI');
    });

    it('detects language from navigator.language when chrome.i18n is not set', () => {
      (globalThis as any).chrome = undefined;
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'de-DE' },
        configurable: true,
        writable: true,
      });

      const locale = detectBrowserLocale();
      expect(locale).toBe('de');
      expect(getI18n().savedInLiya).toBe('In Liya AI gespeichert');
    });

    it('detects Spanish, Japanese, and Chinese locales', () => {
      (globalThis as any).chrome = undefined;

      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'es-ES' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('es');
      expect(getI18n().savedInLiya).toBe('Guardado en Liya AI');

      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'ja-JP' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('ja');
      expect(getI18n().savedInLiya).toBe('Liya AI に保存しました');

      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'zh-CN' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('zh');
      expect(getI18n().savedInLiya).toBe('已保存至 Liya AI');
    });

    it('falls back to English when locale is unsupported', () => {
      (globalThis as any).chrome = undefined;
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'xx-YY' },
        configurable: true,
        writable: true,
      });

      const locale = detectBrowserLocale();
      expect(locale).toBe('en');
      expect(getI18n().savedInLiya).toBe('Saved in Liya AI');
    });
  });
});
