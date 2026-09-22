/**
 * Internationalization (i18n) Engine for Synapse Capture.
 * Automatically detects the browser/system UI language and provides localized strings
 * across 15 major languages with English fallback.
 */

export type SupportedLocale =
  | 'en'
  | 'fr'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'ar'
  | 'nl'
  | 'tr'
  | 'pl'
  | 'hi';

export interface I18nTranslations {
  // Tooltip & Badge
  savedInLiya: string;
  savedInSynapse: string;
  doNotSave: string;
  notSaved: string;
  secretsRedacted: (count: number) => string;

  // Popup & Extension UI
  statusActive: string;
  statusStandby: string;
  statusPaused: string;
  statusListening: (platform: string) => string;

  siteHintStandby: string;
  siteHintListening: (platform: string) => string;
  siteHintPaused: string;

  statTurns: string;
  statSessions: string;
  labelEndpoint: string;
  labelAuthToken: string;
  labelPauseSync: string;
  btnSave: string;
  btnSyncNow: string;
  btnSyncing: string;
  toastSaveSuccess: string;
  toastSaveError: string;
  toastSyncSuccess: (count: number) => string;
  toastSyncError: string;

  // Sidebar Conversation Sync Status
  sidebarSyncNone: string;
  sidebarSyncPartial: (synced: number, total: number) => string;
  sidebarSyncFull: string;

  // OAuth Authentication
  authTitle: string;
  authSubtitle: string;
  btnGoogle: string;
  btnGithub: string;
  btnApple: string;
  loggedInAs: (user: string) => string;
  btnLogout: string;
  authConnecting: (provider: string) => string;
  toastLoginSuccess: (provider: string) => string;
  toastLogoutSuccess: string;
  toastLoginError: string;
}

export type CoreTranslations = Omit<
  I18nTranslations,
  | 'authTitle'
  | 'authSubtitle'
  | 'btnGoogle'
  | 'btnGithub'
  | 'btnApple'
  | 'loggedInAs'
  | 'btnLogout'
  | 'authConnecting'
  | 'toastLoginSuccess'
  | 'toastLogoutSuccess'
  | 'toastLoginError'
>;

const defaultAuthTranslations = {
  authTitle: 'Account & Cloud Sync',
  authSubtitle: 'Sign in to sync your discussions',
  btnGoogle: 'Google',
  btnGithub: 'GitHub',
  btnApple: 'Apple',
  loggedInAs: (u: string) => `Logged in as ${u}`,
  btnLogout: 'Sign Out',
  authConnecting: (p: string) => `Connecting to ${p}...`,
  toastLoginSuccess: (p: string) => `Successfully signed in via ${p}!`,
  toastLogoutSuccess: 'Logged out successfully.',
  toastLoginError: 'Sign-in failed or cancelled.',
};

const frAuthTranslations = {
  authTitle: 'Compte & Synchronisation',
  authSubtitle: 'Connectez-vous pour synchroniser vos discussions',
  btnGoogle: 'Google',
  btnGithub: 'GitHub',
  btnApple: 'Apple',
  loggedInAs: (u: string) => `Connecté : ${u}`,
  btnLogout: 'Se déconnecter',
  authConnecting: (p: string) => `Connexion à ${p}...`,
  toastLoginSuccess: (p: string) => `Connecté avec succès via ${p} !`,
  toastLogoutSuccess: 'Déconnecté avec succès.',
  toastLoginError: 'Connexion échouée ou annulée.',
};

const baseTranslations: Record<SupportedLocale, CoreTranslations> = {
  en: {
    savedInLiya: 'Saved in Liya AI',
    savedInSynapse: 'Saved in Liya AI',
    doNotSave: 'Do not save',
    notSaved: 'Not saved',
    secretsRedacted: (n) => (n === 1 ? '1 secret redacted locally' : `${n} secrets redacted locally`),

    statusActive: 'ACTIVE',
    statusStandby: 'STANDBY',
    statusPaused: 'PAUSED',
    statusListening: (p) => `LISTENING: ${p}`,

    siteHintStandby: 'Standby — Open ChatGPT, Claude, or Gemini',
    siteHintListening: (p) => `Actively capturing turns on ${p}`,
    siteHintPaused: 'Capture engine is paused in settings',

    statTurns: 'Captured Turns',
    statSessions: 'Active Sessions',
    labelEndpoint: 'Ingestion Endpoint',
    labelAuthToken: 'Bearer Auth Token',
    labelPauseSync: 'Pause Engine & Sync',
    btnSave: 'Save Settings',
    btnSyncNow: 'Sync Now',
    btnSyncing: 'Syncing...',
    toastSaveSuccess: 'Settings saved successfully.',
    toastSaveError: 'Failed to save settings.',
    toastSyncSuccess: (n) => `Synced ${n} session(s).`,
    toastSyncError: 'Sync request error.',

    sidebarSyncNone: 'Not synced (0 messages)',
    sidebarSyncPartial: (s, t) => `Partially synced (${s}/${t} messages)`,
    sidebarSyncFull: 'All messages synced',
  },

  fr: {
    savedInLiya: 'Sauvegardé dans Liya AI',
    savedInSynapse: 'Sauvegardé dans Liya AI',
    doNotSave: 'Ne pas enregistrer',
    notSaved: 'Non enregistré',
    secretsRedacted: (n) => (n === 1 ? '1 donnée sensible masquée' : `${n} données sensibles masquées`),

    statusActive: 'ACTIF',
    statusStandby: 'EN VEILLE',
    statusPaused: 'EN PAUSE',
    statusListening: (p) => `ÉCOUTE : ${p}`,

    siteHintStandby: 'En veille — Ouvrez ChatGPT, Claude ou Gemini',
    siteHintListening: (p) => `Capture active des échanges sur ${p}`,
    siteHintPaused: 'Le moteur de capture est en pause dans les paramètres',

    statTurns: 'Tours capturés',
    statSessions: 'Sessions actives',
    labelEndpoint: "Point de terminaison d'ingestion",
    labelAuthToken: "Jeton d'authentification Bearer",
    labelPauseSync: 'Mettre en pause la capture et la synchro',
    btnSave: 'Enregistrer les paramètres',
    btnSyncNow: 'Synchroniser maintenant',
    btnSyncing: 'Synchronisation...',
    toastSaveSuccess: 'Paramètres enregistrés avec succès.',
    toastSaveError: "Échec de l'enregistrement des paramètres.",
    toastSyncSuccess: (n) => `${n} session(s) synchronisée(s).`,
    toastSyncError: 'Erreur lors de la synchronisation.',

    sidebarSyncNone: 'Non synchronisé (0 message)',
    sidebarSyncPartial: (s, t) => `Partiellement synchronisé (${s}/${t} messages)`,
    sidebarSyncFull: 'Tous les messages sont synchronisés',
  },

  es: {
    savedInLiya: 'Guardado en Liya AI',
    savedInSynapse: 'Guardado en Liya AI',
    doNotSave: 'No guardar',
    notSaved: 'No guardado',
    secretsRedacted: (n) => (n === 1 ? '1 dato confidencial ocultado' : `${n} datos confidenciales ocultados`),

    statusActive: 'ACTIVO',
    statusStandby: 'EN ESPERA',
    statusPaused: 'EN PAUSA',
    statusListening: (p) => `ESCUCHANDO: ${p}`,

    siteHintStandby: 'En espera — Abre ChatGPT, Claude o Gemini',
    siteHintListening: (p) => `Capturando activamente en ${p}`,
    siteHintPaused: 'El motor de captura está en pausa en la configuración',

    statTurns: 'Turnos capturados',
    statSessions: 'Sesiones activas',
    labelEndpoint: 'Punto de conexión de ingesta',
    labelAuthToken: 'Token de autenticación Bearer',
    labelPauseSync: 'Pausar motor y sincronización',
    btnSave: 'Guardar configuración',
    btnSyncNow: 'Sincronizar ahora',
    btnSyncing: 'Sincronizando...',
    toastSaveSuccess: 'Configuración guardada correctamente.',
    toastSaveError: 'Error al guardar la configuración.',
    toastSyncSuccess: (n) => `${n} sesión(es) sincronizada(s).`,
    toastSyncError: 'Error en la solicitud de sincronización.',

    sidebarSyncNone: 'No sincronizado (0 mensajes)',
    sidebarSyncPartial: (s, t) => `Parcialmente sincronizado (${s}/${t} mensajes)`,
    sidebarSyncFull: 'Todos los mensajes están sincronizados',
  },

  de: {
    savedInLiya: 'In Liya AI gespeichert',
    savedInSynapse: 'In Liya AI gespeichert',
    doNotSave: 'Nicht speichern',
    notSaved: 'Nicht gespeichert',
    secretsRedacted: (n) => (n === 1 ? '1 vertrauliches Detail zensiert' : `${n} vertrauliche Details zensiert`),

    statusActive: 'AKTIV',
    statusStandby: 'BEREIT',
    statusPaused: 'PAUSIERT',
    statusListening: (p) => `AKTIV BEI: ${p}`,

    siteHintStandby: 'Bereit — Öffnen Sie ChatGPT, Claude oder Gemini',
    siteHintListening: (p) => `Erfasst Antworten auf ${p}`,
    siteHintPaused: 'Erfassung ist in den Einstellungen pausiert',

    statTurns: 'Erfasste Dialoge',
    statSessions: 'Aktive Sitzungen',
    labelEndpoint: 'Ingestion-Endpunkt',
    labelAuthToken: 'Bearer Auth-Token',
    labelPauseSync: 'Erfassung & Sync pausieren',
    btnSave: 'Einstellungen speichern',
    btnSyncNow: 'Jetzt synchronisieren',
    btnSyncing: 'Synchronisiere...',
    toastSaveSuccess: 'Einstellungen erfolgreich gespeichert.',
    toastSaveError: 'Fehler beim Speichern der Einstellungen.',
    toastSyncSuccess: (n) => `${n} Sitzung(en) synchronisiert.`,
    toastSyncError: 'Fehler bei der Synchronisierung.',

    sidebarSyncNone: 'Nicht synchronisiert (0 Nachrichten)',
    sidebarSyncPartial: (s, t) => `Teilweise synchronisiert (${s}/${t} Nachrichten)`,
    sidebarSyncFull: 'Alle Nachrichten synchronisiert',
  },

  it: {
    savedInLiya: 'Salvato in Liya AI',
    savedInSynapse: 'Salvato in Liya AI',
    doNotSave: 'Non salvare',
    notSaved: 'Non salvato',
    secretsRedacted: (n) => (n === 1 ? '1 dato sensibile oscurato' : `${n} dati sensibili oscurati`),

    statusActive: 'ATTIVO',
    statusStandby: 'STANDBY',
    statusPaused: 'IN PAUSA',
    statusListening: (p) => `IN ASCOLTO: ${p}`,

    siteHintStandby: 'In attesa — Apri ChatGPT, Claude o Gemini',
    siteHintListening: (p) => `Acquisizione attiva su ${p}`,
    siteHintPaused: 'Motore di acquisizione in pausa nelle impostazioni',

    statTurns: 'Messaggi catturati',
    statSessions: 'Sessioni attive',
    labelEndpoint: 'Endpoint di acquisizione',
    labelAuthToken: 'Token di autenticazione Bearer',
    labelPauseSync: 'Metti in pausa motore e sincronizzazione',
    btnSave: 'Salva impostazioni',
    btnSyncNow: 'Sincronizza ora',
    btnSyncing: 'Sincronizzazione...',
    toastSaveSuccess: 'Impostazioni salvate con successo.',
    toastSaveError: 'Salvataggio delle impostazioni non riuscito.',
    toastSyncSuccess: (n) => `${n} sessione/i sincronizzata/e.`,
    toastSyncError: 'Errore di sincronizzazione.',

    sidebarSyncNone: 'Non sincronizzato (0 messaggi)',
    sidebarSyncPartial: (s, t) => `Parzialmente sincronizzato (${s}/${t} messaggi)`,
    sidebarSyncFull: 'Tutti i messaggi sincronizzati',
  },

  pt: {
    savedInLiya: 'Salvo no Liya AI',
    savedInSynapse: 'Salvo no Liya AI',
    doNotSave: 'Não salvar',
    notSaved: 'Não salvo',
    secretsRedacted: (n) => (n === 1 ? '1 dado confidencial ocultado' : `${n} dados confidenciais ocultados`),

    statusActive: 'ATIVO',
    statusStandby: 'EM ESPERA',
    statusPaused: 'PAUSADO',
    statusListening: (p) => `MONITORANDO: ${p}`,

    siteHintStandby: 'Em espera — Abra ChatGPT, Claude ou Gemini',
    siteHintListening: (p) => `Capturando ativamente em ${p}`,
    siteHintPaused: 'O motor de captura está pausado nas configurações',

    statTurns: 'Turnos capturados',
    statSessions: 'Sessões ativas',
    labelEndpoint: 'Ponto de extremidade de ingestão',
    labelAuthToken: 'Token de autenticação Bearer',
    labelPauseSync: 'Pausar motor e sincronização',
    btnSave: 'Salvar configurações',
    btnSyncNow: 'Sincronizar agora',
    btnSyncing: 'Sincronizando...',
    toastSaveSuccess: 'Configurações salvas com sucesso.',
    toastSaveError: 'Falha ao salvar configurações.',
    toastSyncSuccess: (n) => `${n} sessão(ões) sincronizada(s).`,
    toastSyncError: 'Erro ao solicitar sincronização.',

    sidebarSyncNone: 'Não sincronizado (0 mensagens)',
    sidebarSyncPartial: (s, t) => `Parcialmente sincronizado (${s}/${t} mensagens)`,
    sidebarSyncFull: 'Todas as mensagens sincronizadas',
  },

  zh: {
    savedInLiya: '已保存至 Liya AI',
    savedInSynapse: '已保存至 Liya AI',
    doNotSave: '不保存',
    notSaved: '未保存',
    secretsRedacted: (n) => `已在本地脱敏 ${n} 项敏感信息`,

    statusActive: '运行中',
    statusStandby: '待命',
    statusPaused: '已暂停',
    statusListening: (p) => `正在监听: ${p}`,

    siteHintStandby: '待命 — 请打开 ChatGPT、Claude 或 Gemini',
    siteHintListening: (p) => `正在实时捕获 ${p} 的会话`,
    siteHintPaused: '捕获引擎已在设置中暂停',

    statTurns: '已捕获轮次',
    statSessions: '活动会话数',
    labelEndpoint: '同步接收端点 (Endpoint)',
    labelAuthToken: 'Bearer 鉴权令牌',
    labelPauseSync: '暂停捕获与同步',
    btnSave: '保存设置',
    btnSyncNow: '立即同步',
    btnSyncing: '同步中...',
    toastSaveSuccess: '设置已成功保存。',
    toastSaveError: '保存设置失败。',
    toastSyncSuccess: (n) => `已成功同步 ${n} 个会话。`,
    toastSyncError: '同步请求失败。',

    sidebarSyncNone: '未同步 (0 条消息)',
    sidebarSyncPartial: (s, t) => `部分同步 (${s}/${t} 条消息)`,
    sidebarSyncFull: '所有消息已完全同步',
  },

  ja: {
    savedInLiya: 'Liya AI に保存しました',
    savedInSynapse: 'Liya AI に保存しました',
    doNotSave: '保存しない',
    notSaved: '未保存',
    secretsRedacted: (n) => `ローカルで ${n} 件の機密情報を保護`,

    statusActive: '有効',
    statusStandby: '待機中',
    statusPaused: '一時停止中',
    statusListening: (p) => `監視中: ${p}`,

    siteHintStandby: '待機中 — ChatGPT、Claude、または Gemini を開いてください',
    siteHintListening: (p) => `${p} の会話をリアルタイムでキャプチャ中`,
    siteHintPaused: '設定でキャプチャ機能が停止しています',

    statTurns: '記録されたターン数',
    statSessions: 'アクティブセッション',
    labelEndpoint: '取り込みエンドポイント',
    labelAuthToken: 'Bearer 認証トークン',
    labelPauseSync: 'キャプチャと同期を停止',
    btnSave: '設定を保存',
    btnSyncNow: '今すぐ同期',
    btnSyncing: '同期中...',
    toastSaveSuccess: '設定を正常に保存しました。',
    toastSaveError: '設定の保存に失敗しました。',
    toastSyncSuccess: (n) => `${n} 件のセッションを同期しました。`,
    toastSyncError: '同期リクエストでエラーが発生しました。',

    sidebarSyncNone: '未同期 (0 件のメッセージ)',
    sidebarSyncPartial: (s, t) => `一部同期済み (${s}/${t} 件)`,
    sidebarSyncFull: 'すべてのメッセージが同期済み',
  },

  ko: {
    savedInLiya: 'Liya AI에 저장됨',
    savedInSynapse: 'Liya AI에 저장됨',
    doNotSave: '저장 안 함',
    notSaved: '저장되지 않음',
    secretsRedacted: (n) => `민감한 정보 ${n}개 로컬 마스킹됨`,

    statusActive: '활성',
    statusStandby: '대기 중',
    statusPaused: '일시 중지됨',
    statusListening: (p) => `수집 중: ${p}`,

    siteHintStandby: '대기 중 — ChatGPT, Claude 또는 Gemini를 여세요',
    siteHintListening: (p) => `${p}에서 대화 턴 활성 수집 중`,
    siteHintPaused: '설정에서 수집 엔진이 일시 중지되었습니다',

    statTurns: '수집된 턴 수',
    statSessions: '활성 세션',
    labelEndpoint: '수집 엔드포인트 URL',
    labelAuthToken: 'Bearer 인증 토큰',
    labelPauseSync: '수집 및 동기화 일시 중지',
    btnSave: '설정 저장',
    btnSyncNow: '지금 동기화',
    btnSyncing: '동기화 중...',
    toastSaveSuccess: '설정이 성공적으로 저장되었습니다.',
    toastSaveError: '설정 저장에 실패했습니다.',
    toastSyncSuccess: (n) => `${n}개 세션이 동기화되었습니다.`,
    toastSyncError: '동기화 요청 오류입니다.',

    sidebarSyncNone: '동기화되지 않음 (0개 메시지)',
    sidebarSyncPartial: (s, t) => `부분 동기화됨 (${s}/${t}개 메시지)`,
    sidebarSyncFull: '모든 메시지가 동기화됨',
  },

  ru: {
    savedInLiya: 'Сохранено в Liya AI',
    savedInSynapse: 'Сохранено в Liya AI',
    doNotSave: 'Не сохранять',
    notSaved: 'Не сохранено',
    secretsRedacted: (n) => `${n} конфид. данных скрыто`,

    statusActive: 'АКТИВНО',
    statusStandby: 'ОЖИДАНИЕ',
    statusPaused: 'ПАУЗА',
    statusListening: (p) => `ЗАХВАТ: ${p}`,

    siteHintStandby: 'Ожидание — Откройте ChatGPT, Claude или Gemini',
    siteHintListening: (p) => `Активный захват диалогов на ${p}`,
    siteHintPaused: 'Захват диалогов приостановлен в настройках',

    statTurns: 'Захвачено диалогов',
    statSessions: 'Активных сессий',
    labelEndpoint: 'Конечная точка (Endpoint)',
    labelAuthToken: 'Токен авторизации Bearer',
    labelPauseSync: 'Приостановить захват и синхронизацию',
    btnSave: 'Сохранить настройки',
    btnSyncNow: 'Синхронизировать сейчас',
    btnSyncing: 'Синхронизация...',
    toastSaveSuccess: 'Настройки успешно сохранены.',
    toastSaveError: 'Не удалось сохранить настройки.',
    toastSyncSuccess: (n) => `Синхронизировано сессий: ${n}.`,
    toastSyncError: 'Ошибка при синхронизации.',

    sidebarSyncNone: 'Не синхронизировано (0 сообщений)',
    sidebarSyncPartial: (s, t) => `Частично синхронизировано (${s}/${t} сообщ.)`,
    sidebarSyncFull: 'Все сообщения синхронизированы',
  },

  ar: {
    savedInLiya: 'تم الحفظ في Liya AI',
    savedInSynapse: 'تم الحفظ في Liya AI',
    doNotSave: 'عدم الحفظ',
    notSaved: 'لم يتم الحفظ',
    secretsRedacted: (n) => `تم إخفاء ${n} من البيانات الحساسة محلياً`,

    statusActive: 'نشط',
    statusStandby: 'في وضع الاستعداد',
    statusPaused: 'متوقف مؤقتاً',
    statusListening: (p) => `جاري الاستماع: ${p}`,

    siteHintStandby: 'في وضع الاستعداد — يرجى فتح ChatGPT أو Claude أو Gemini',
    siteHintListening: (p) => `التقاط المحادثات نشط على ${p}`,
    siteHintPaused: 'محرك الالتقاط متوقف مؤقتاً في الإعدادات',

    statTurns: 'المحادثات الملتقطة',
    statSessions: 'الجلسات النشطة',
    labelEndpoint: 'نقطة نهاية المزامنة (Endpoint)',
    labelAuthToken: 'رمز مصادقة Bearer',
    labelPauseSync: 'إيقاف الالتقاط والمزامنة مؤقتاً',
    btnSave: 'حفظ الإعدادات',
    btnSyncNow: 'مزامنة الآن',
    btnSyncing: 'جاري المزامنة...',
    toastSaveSuccess: 'تم حفظ الإعدادات بنجاح.',
    toastSaveError: 'فشل حفظ الإعدادات.',
    toastSyncSuccess: (n) => `تمت مزامنة ${n} من الجلسات بنجاح.`,
    toastSyncError: 'حدث خطأ في طلب المزامنة.',

    sidebarSyncNone: 'غير متزامن (0 رسائل)',
    sidebarSyncPartial: (s, t) => `متزامن جزئياً (${s}/${t} رسائل)`,
    sidebarSyncFull: 'تمت مزامنة جميع الرسائل بالكامل',
  },

  nl: {
    savedInLiya: 'Opgeslagen in Liya AI',
    savedInSynapse: 'Opgeslagen in Liya AI',
    doNotSave: 'Niet opslaan',
    notSaved: 'Niet opgeslagen',
    secretsRedacted: (n) => (n === 1 ? '1 geheim gegeven afgeschermd' : `${n} geheime gegevens afgeschermd`),

    statusActive: 'ACTIEF',
    statusStandby: 'STAND-BY',
    statusPaused: 'GEPAUZEERD',
    statusListening: (p) => `LUISTERT OP: ${p}`,

    siteHintStandby: 'Stand-by — Open ChatGPT, Claude of Gemini',
    siteHintListening: (p) => `Actief berichten opvangen op ${p}`,
    siteHintPaused: 'Opnamemotor is gepauzeerd in instellingen',

    statTurns: 'Vastgelegde berichten',
    statSessions: 'Actieve sessies',
    labelEndpoint: 'Ingestion Eindpunt URL',
    labelAuthToken: 'Bearer Auth Token',
    labelPauseSync: 'Pauzeer opname & synchronisatie',
    btnSave: 'Instellingen opslaan',
    btnSyncNow: 'Nu synchroniseren',
    btnSyncing: 'Synchroniseren...',
    toastSaveSuccess: 'Instellingen succesvol opgeslagen.',
    toastSaveError: 'Opslaan van instellingen mislukt.',
    toastSyncSuccess: (n) => `${n} sessie(s) gesynchroniseerd.`,
    toastSyncError: 'Fout bij synchronisatieverzoek.',

    sidebarSyncNone: 'Niet gesynchroniseerd (0 berichten)',
    sidebarSyncPartial: (s, t) => `Gedeeltelijk gesynchroniseerd (${s}/${t} berichten)`,
    sidebarSyncFull: 'Alle berichten zijn gesynchroniseerd',
  },

  tr: {
    savedInLiya: "Liya AI'ye kaydedildi",
    savedInSynapse: "Liya AI'ye kaydedildi",
    doNotSave: 'Kaydetme',
    notSaved: 'Kaydedilmedi',
    secretsRedacted: (n) => `${n} hassas veri yerel olarak gizlendi`,

    statusActive: 'AKTİF',
    statusStandby: 'BEKLEMEDE',
    statusPaused: 'DURAKLATILDI',
    statusListening: (p) => `DİNLENİYOR: ${p}`,

    siteHintStandby: 'Beklemede — ChatGPT, Claude veya Gemini sayfasını açın',
    siteHintListening: (p) => `${p} üzerindeki konuşmalar yakalanıyor`,
    siteHintPaused: 'Yakalama motoru ayarlardan duraklatıldı',

    statTurns: 'Yakalanan Turlar',
    statSessions: 'Aktif Oturumlar',
    labelEndpoint: 'Senkronizasyon Uç Noktası (Endpoint)',
    labelAuthToken: 'Bearer Kimlik Doğrulama Belirteci',
    labelPauseSync: 'Motoru ve Senkronizasyonu Duraklat',
    btnSave: 'Ayarları Kaydet',
    btnSyncNow: 'Şimdi Senkronize Et',
    btnSyncing: 'Senkronize ediliyor...',
    toastSaveSuccess: 'Ayarlar başarıyla kaydedildi.',
    toastSaveError: 'Ayarlar kaydedilemedi.',
    toastSyncSuccess: (n) => `${n} oturum senkronize edildi.`,
    toastSyncError: 'Senkronizasyon isteği hatası.',

    sidebarSyncNone: 'Senkronize edilmedi (0 mesaj)',
    sidebarSyncPartial: (s, t) => `Kısmen senkronize edildi (${s}/${t} mesaj)`,
    sidebarSyncFull: 'Tüm mesajlar senkronize edildi',
  },

  pl: {
    savedInLiya: 'Zapisano w Liya AI',
    savedInSynapse: 'Zapisano w Liya AI',
    doNotSave: 'Nie zapisuj',
    notSaved: 'Nie zapisano',
    secretsRedacted: (n) => `${n} poufnych danych zamaskowano`,

    statusActive: 'AKTYWNY',
    statusStandby: 'OCZEKIWANIE',
    statusPaused: 'WSTRZYMANY',
    statusListening: (p) => `NASŁUCHIWANIE: ${p}`,

    siteHintStandby: 'Oczekiwanie — Otwórz ChatGPT, Claude lub Gemini',
    siteHintListening: (p) => `Aktywne przechwytywanie rozmów w ${p}`,
    siteHintPaused: 'Przechwytywanie zostało wstrzymane w ustawieniach',

    statTurns: 'Przechwycone tury',
    statSessions: 'Aktywne sesje',
    labelEndpoint: 'Punkt końcowy (Endpoint)',
    labelAuthToken: 'Token uwierzytelniający Bearer',
    labelPauseSync: 'Wstrzymaj silnik i synchronizację',
    btnSave: 'Zapisz ustawienia',
    btnSyncNow: 'Synchronizuj teraz',
    btnSyncing: 'Synchronizowanie...',
    toastSaveSuccess: 'Ustawienia zapisane pomyślnie.',
    toastSaveError: 'Nie udało się zapisać ustawień.',
    toastSyncSuccess: (n) => `Zsynchronizowano ${n} sesji.`,
    toastSyncError: 'Błąd żądania synchronizacji.',

    sidebarSyncNone: 'Niezsynchronizowane (0 wiadomości)',
    sidebarSyncPartial: (s, t) => `Częściowo zsynchronizowane (${s}/${t} wiadomości)`,
    sidebarSyncFull: 'Wszystkie wiadomości zsynchronizowane',
  },

  hi: {
    savedInLiya: 'Liya AI में सहेजा गया',
    savedInSynapse: 'Liya AI में सहेजा गया',
    doNotSave: 'सहेजें नहीं',
    notSaved: 'सहेजा नहीं गया',
    secretsRedacted: (n) => `${n} संवेदनशील डेटा स्थानीय रूप से छुपाया गया`,

    statusActive: 'सक्रिय',
    statusStandby: 'स्टैंडबाय',
    statusPaused: 'रोका गया',
    statusListening: (p) => `सुन रहा है: ${p}`,

    siteHintStandby: 'स्टैंडबाय — ChatGPT, Claude या Gemini खोलें',
    siteHintListening: (p) => `${p} पर बातचीत सक्रिय रूप से रिकॉर्ड हो रही है`,
    siteHintPaused: 'कैप्चर इंजन सेटिंग्स में रोका गया है',

    statTurns: 'रिकॉर्ड किए गए राउंड',
    statSessions: 'सक्रिय सत्र',
    labelEndpoint: 'इंजेस्ट एंडपॉइंट URL',
    labelAuthToken: 'Bearer ऑथ टोकन',
    labelPauseSync: 'इंजन और सिंक रोकें',
    btnSave: 'सेटिंग्स सहेजें',
    btnSyncNow: 'अभी सिंक करें',
    btnSyncing: 'सिंक हो रहा है...',
    toastSaveSuccess: 'सेटिंग्स सफलतापूर्वक सहेजी गईं।',
    toastSaveError: 'सेटिंग्स सहेजने में विफल।',
    toastSyncSuccess: (n) => `${n} सत्र सिंक किए गए।`,
    toastSyncError: 'सिंक अनुरोध त्रुटि।',

    sidebarSyncNone: 'सिंक नहीं हुआ (0 संदेश)',
    sidebarSyncPartial: (s, t) => `आंशिक रूप से सिंक किया गया (${s}/${t} संदेश)`,
    sidebarSyncFull: 'सभी संदेश सिंक किए गए',
  },
};

/**
 * Detects the user's browser language.
 */
export function detectBrowserLocale(): SupportedLocale {
  let rawLocale = 'en';

  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
    rawLocale = chrome.i18n.getUILanguage();
  } else if (typeof navigator !== 'undefined') {
    rawLocale = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
  }

  // Extract base language code (e.g. 'fr-FR' -> 'fr', 'zh-CN' -> 'zh')
  const baseCode = rawLocale.toLowerCase().split('-')[0] as SupportedLocale;

  if (baseCode in baseTranslations) {
    return baseCode;
  }

  return 'en';
}

/**
 * Returns the translations dictionary for the detected browser locale.
 */
export function getI18n(locale?: SupportedLocale): I18nTranslations {
  const selectedLocale = locale ?? detectBrowserLocale();
  const base = baseTranslations[selectedLocale] ?? baseTranslations.en;
  const authStrings = selectedLocale === 'fr' ? frAuthTranslations : defaultAuthTranslations;
  return {
    ...base,
    ...authStrings,
  };
}
