// Client minimal de l'API YouTube Data v3 avec comptage de quota et nouvelles tentatives.

const API_BASE = process.env.YOUTUBE_API_BASE || 'https://www.googleapis.com/youtube/v3';

export class YouTubeError extends Error {
  constructor(message: string, public status?: number, public reason?: string) {
    super(message);
  }
}

export interface YtPlaylistItem {
  videoId: string;
  title: string;
  publishedAt?: string;
  position?: number;
}

export interface YtVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    tags?: string[];
    liveBroadcastContent?: string;
    thumbnails: Record<string, { url: string; width: number; height: number }>;
  };
  contentDetails: { duration: string };
  status: { privacyStatus: string; uploadStatus?: string; embeddable?: boolean };
  statistics?: { viewCount?: string; commentCount?: string };
}

export class YouTubeClient {
  public unitsUsed = 0;
  constructor(private key: string, private fetchImpl: typeof fetch = fetch) {
    if (!key) throw new YouTubeError('YOUTUBE_API_KEY manquante');
  }

  private async get<T>(endpoint: string, params: Record<string, string>, attempt = 0): Promise<T> {
    const url = new URL(`${API_BASE}/${endpoint}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('key', this.key);
    this.unitsUsed += 1; // channels, playlistItems et videos.list coûtent 1 unité
    let res: Response;
    try {
      res = await this.fetchImpl(url, { signal: AbortSignal.timeout(20_000) });
    } catch (err) {
      if (attempt < 2) {
        await sleep(1000 * 2 ** attempt);
        return this.get<T>(endpoint, params, attempt + 1);
      }
      throw new YouTubeError(`Réseau indisponible (${endpoint}) : ${(err as Error).message}`);
    }
    if (res.ok) return (await res.json()) as T;
    let reason = '';
    try {
      const body = (await res.json()) as { error?: { errors?: { reason?: string }[]; message?: string } };
      reason = body.error?.errors?.[0]?.reason || body.error?.message || '';
    } catch {}
    if ((res.status >= 500 || res.status === 429) && attempt < 2) {
      await sleep(1000 * 2 ** attempt);
      return this.get<T>(endpoint, params, attempt + 1);
    }
    throw new YouTubeError(`YouTube ${endpoint} : HTTP ${res.status} ${reason}`, res.status, reason);
  }

  async resolveChannel(opts: { id?: string; handle?: string; username?: string }) {
    type R = {
      items?: {
        id: string;
        snippet: { title: string; customUrl?: string };
        statistics?: { subscriberCount?: string; videoCount?: string };
        contentDetails: { relatedPlaylists: { uploads: string } };
      }[];
    };
    const part = 'snippet,statistics,contentDetails';
    const tries: Record<string, string>[] = [];
    if (opts.id) tries.push({ id: opts.id });
    if (opts.handle) tries.push({ forHandle: opts.handle });
    if (opts.username) tries.push({ forUsername: opts.username });
    for (const q of tries) {
      const r = await this.get<R>('channels', { part, ...q });
      const c = r.items?.[0];
      if (c)
        return {
          id: c.id,
          title: c.snippet.title,
          handle: c.snippet.customUrl,
          uploads: c.contentDetails.relatedPlaylists.uploads,
          subscriberCount: c.statistics?.subscriberCount ? Number(c.statistics.subscriberCount) : undefined,
          videoCount: c.statistics?.videoCount ? Number(c.statistics.videoCount) : undefined,
        };
    }
    throw new YouTubeError('Chaîne YouTube introuvable (vérifie YOUTUBE_CHANNEL_ID)');
  }

  /**
   * Parcourt une playlist. `stopWhen` permet un scan incrémental :
   * on s'arrête dès qu'une page entière ne contient que des vidéos déjà connues.
   */
  async playlistItems(playlistId: string, stopWhen?: (page: YtPlaylistItem[]) => boolean): Promise<YtPlaylistItem[]> {
    type R = {
      nextPageToken?: string;
      items?: {
        snippet: { title: string; position?: number; publishedAt?: string; resourceId: { videoId: string } };
        contentDetails?: { videoPublishedAt?: string };
      }[];
    };
    const out: YtPlaylistItem[] = [];
    let pageToken: string | undefined;
    let guard = 0;
    do {
      const r = await this.get<R>('playlistItems', {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      });
      const page = (r.items || []).map((i) => ({
        videoId: i.snippet.resourceId.videoId,
        title: i.snippet.title,
        position: i.snippet.position,
        publishedAt: i.contentDetails?.videoPublishedAt,
      }));
      out.push(...page);
      pageToken = r.nextPageToken;
      if (stopWhen && stopWhen(page)) break;
    } while (pageToken && ++guard < 200);
    return out;
  }

  /** Playlists publiques de la chaîne (pour aider à configurer config/shows.ts) */
  async channelPlaylists(channelId: string): Promise<{ id: string; title: string; count: number }[]> {
    type R = { nextPageToken?: string; items?: { id: string; snippet: { title: string }; contentDetails?: { itemCount?: number } }[] };
    const out: { id: string; title: string; count: number }[] = [];
    let pageToken: string | undefined;
    let guard = 0;
    do {
      const r = await this.get<R>('playlists', { part: 'snippet,contentDetails', channelId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      for (const p of r.items || []) out.push({ id: p.id, title: p.snippet.title, count: p.contentDetails?.itemCount ?? 0 });
      pageToken = r.nextPageToken;
    } while (pageToken && ++guard < 20);
    return out;
  }

  /** Détails de vidéos par lots de 50. Les vidéos supprimées n'apparaissent pas dans la réponse. */
  async videos(ids: string[]): Promise<YtVideo[]> {
    const out: YtVideo[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const r = await this.get<{ items?: YtVideo[] }>('videos', {
        part: 'snippet,contentDetails,status,statistics',
        id: batch.join(','),
        maxResults: '50',
      });
      out.push(...(r.items || []));
    }
    return out;
  }
}

function sleep(ms: number) {
  if (process.env.SYNC_NO_SLEEP) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}
