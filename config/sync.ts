// Réglages techniques de la synchronisation. Les secrets (clé API, e-mail) sont dans les variables d'environnement.

export const syncConfig = {
  /** Flux RSS du podcast (Spotify for Creators / Anchor). Surchargeable par PODCAST_RSS_URL. */
  podcastRssUrl: 'https://anchor.fm/s/103114550/podcast/rss',
  /** Chaîne YouTube : identifiant UC… si connu (sinon résolu via le handle). Surchargeable par YOUTUBE_CHANNEL_ID. */
  channelId: '',
  channelHandle: '@UNIFOOTTV',
  channelLegacyUsername: 'UNIFOOTTV',
  /** Scan complet de l'historique (détection des suppressions) toutes les N heures ; sinon scan incrémental */
  fullScanEveryHours: 6,
  /** Vidéos récentes dont on rafraîchit les détails à chaque passage */
  refreshRecentDays: 14,
  /** Nombre d'anciennes vidéos rafraîchies par passage (rotation) */
  refreshBatchSize: 50,
  /** Budget quotidien d'unités de quota YouTube (quota par défaut : 10 000) */
  quotaBudget: 8000,
  /** Alerte e-mail après N échecs consécutifs */
  alertAfterFailures: 3,
  /** Sécurité : si un scan complet renvoie moins de X % des vidéos connues, on considère que c'est une panne */
  minKeepRatio: 0.5,
  /** Durée max (s) d'une vidéo pour la considérer comme Short si la playlist des Shorts est indisponible */
  shortMaxDurationFallback: 60,
  /** Description jugée trop pauvre (en caractères utiles) : page en noindex */
  thinDescriptionChars: 160,
  /** Association vidéo / épisode audio */
  podcastMatch: { maxDaysApart: 10, minScore: 0.5, minScoreSameDay: 0.3 },
  /** Fenêtre de synchronisation rapprochée, du mercredi au samedi (heure de Paris) */
  rushWindow: { weekdays: [3, 4, 5, 6], fromHour: 18, toHour: 20 },
};
