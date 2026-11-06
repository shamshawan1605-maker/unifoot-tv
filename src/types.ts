// Types partagés entre la synchronisation (scripts/) et le site (src/).

export interface Chapter {
  /** secondes depuis le début */
  start: number;
  label: string;
}

export interface PodcastMatch {
  title: string;
  /** page de l'épisode chez l'hébergeur (Spotify for Creators / Anchor) */
  url?: string;
  /** fichier audio (pour le lecteur intégré) */
  audioUrl?: string;
  audioType?: string;
  publishedAt: string;
  durationSec?: number;
  guid: string;
}

export interface Video {
  id: string;
  /** slug stable : fixé à la première apparition, ne change plus même si le titre change */
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  thumbnails: { url: string; width: number; height: number }[];
  /** 'episode' = vidéo longue, 'short' = Short vertical */
  kind: 'episode' | 'short';
  /** slug de l'émission (config/shows.ts) ou 'hors-serie' */
  show: string;
  /** playlists YouTube contenant la vidéo */
  playlists: string[];
  chapters: Chapter[];
  guest?: string;
  themes: string[];
  tags: string[];
  podcast?: PodcastMatch;
  viewCount?: number;
  /** vrai si la description est trop pauvre : page en noindex */
  thin: boolean;
  /** date de la dernière mise à jour des détails via l'API */
  refreshedAt: string;
  /** anciennes URL (si la vidéo a changé d'émission) : redirigées en 301 */
  previousPaths?: string[];
}

export interface RemovedVideo {
  id: string;
  slug: string;
  show: string;
  removedAt: string;
}

export interface PodcastFeedItem {
  guid: string;
  title: string;
  url?: string;
  audioUrl?: string;
  audioType?: string;
  publishedAt: string;
  durationSec?: number;
}

export interface ContentStore {
  version: 1;
  generatedAt: string;
  channel: {
    id: string;
    title: string;
    handle?: string;
    subscriberCount?: number;
    videoCount?: number;
  } | null;
  videos: Video[];
  removed: RemovedVideo[];
  podcast: {
    title?: string;
    fetchedAt: string;
    items: PodcastFeedItem[];
  } | null;
}

export interface SyncState {
  consecutiveFailures: number;
  lastSuccessAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
  alertSentAt?: string;
  lastFullScanAt?: string;
  /** consommation estimée du quota YouTube (unités) pour la journée en cours (heure du Pacifique) */
  quota: { day: string; used: number };
}
