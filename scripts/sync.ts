// Synchronisation automatique YouTube + podcast -> data/content.json
// Lancé par GitHub Actions (toutes les heures, toutes les 10 min du mercredi au samedi de 18h à 20h).
// Ne modifie data/content.json que si le contenu a réellement changé.

import { readFile, writeFile, mkdir, rename, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ContentStore, SyncState, Video } from '../src/types.ts';
import { syncConfig } from '../config/sync.ts';
import { YouTubeClient, type YtVideo } from './lib/youtube.ts';
import { fetchPodcastFeed, matchPodcast } from './lib/podcast.ts';
import { assignShow, assignThemes, detectGuest, isThin, parseChapters } from './lib/enrich.ts';
import { parseIsoDuration, slugify } from './lib/text.ts';
import { sendAlert } from './lib/alert.ts';

const ROOT = resolve(import.meta.dirname, '..');
const CONTENT_PATH = resolve(ROOT, process.env.CONTENT_PATH || 'data/content.json');
const STATE_PATH = resolve(ROOT, process.env.STATE_PATH || 'data/.tmp/sync-state.json');

const log = (...a: unknown[]) => console.log('[sync]', ...a);

export function emptyStore(): ContentStore {
  return { version: 1, generatedAt: new Date(0).toISOString(), channel: null, videos: [], removed: [], podcast: null };
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    log(`fichier illisible, valeur par défaut utilisée : ${path}`);
    return fallback;
  }
}

async function writeJsonAtomic(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await rename(tmp, path);
}

function parisParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hour12: false });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { weekday: wd, hour: Number(parts.hour) % 24 };
}

export function inRushWindow(d = new Date()) {
  const { weekday, hour } = parisParts(d);
  const w = syncConfig.rushWindow;
  return w.weekdays.includes(weekday) && hour >= w.fromHour && hour < w.toHour;
}

/** Jour de quota YouTube (remis à zéro à minuit, heure du Pacifique) */
function quotaDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
}

function pickThumbnails(t: YtVideo['snippet']['thumbnails']) {
  return ['medium', 'high', 'standard', 'maxres']
    .map((k) => t[k])
    .filter(Boolean)
    .map((x) => ({ url: x.url, width: x.width, height: x.height }));
}

export function videoPath(v: Pick<Video, 'show' | 'slug'>) {
  return `/emissions/${v.show}/${v.slug}/`;
}

/** Recalcule tout ce qui dépend de la configuration (thèmes, émission, chapitres, invité…) */
function enrich(v: Video, playlists: string[] | undefined) {
  if (playlists) v.playlists = playlists;
  const show = assignShow(v.playlists, v.title);
  if (v.show && v.show !== show && v.kind === 'episode') {
    v.previousPaths = Array.from(new Set([...(v.previousPaths || []), videoPath(v)]));
  }
  v.show = show;
  v.chapters = v.kind === 'episode' ? parseChapters(v.description, v.durationSec) : [];
  v.guest = detectGuest(v.title, v.description);
  if (!v.guest) delete v.guest;
  v.themes = assignThemes(v.title, v.description, v.tags);
  v.thin = isThin(v.description, v.chapters);
}

function uniqueSlug(base: string, show: string, videos: Video[], selfId: string) {
  const taken = new Set(videos.filter((v) => v.show === show && v.id !== selfId).map((v) => v.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function comparable(store: ContentStore) {
  const { generatedAt, ...rest } = store;
  const copy = JSON.parse(JSON.stringify(rest));
  if (copy.podcast) delete copy.podcast.fetchedAt;
  for (const v of copy.videos) delete v.refreshedAt;
  return JSON.stringify(copy);
}

export interface SyncResult {
  changed: boolean;
  errors: string[];
  added: string[];
  updated: string[];
  removed: string[];
  skipped?: boolean;
}

export async function runSync(): Promise<SyncResult> {
  if (process.env.SYNC_WINDOW === 'rush' && !inRushWindow()) {
    log('hors de la fenêtre de sortie (mercredi-samedi 18h-20h) : rien à faire.');
    return { changed: false, errors: [], added: [], updated: [], removed: [], skipped: true };
  }

  const now = new Date();
  const store = await readJson<ContentStore>(CONTENT_PATH, emptyStore());
  const before = comparable(store);
  const state = await readJson<SyncState>(STATE_PATH, { consecutiveFailures: 0, quota: { day: '', used: 0 } });
  if (state.quota.day !== quotaDay(now)) state.quota = { day: quotaDay(now), used: 0 };
  state.lastAttemptAt = now.toISOString();

  const errors: string[] = [];
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];

  // ---------- YouTube ----------
  let yt: YouTubeClient | null = null;
  try {
    yt = new YouTubeClient(process.env.YOUTUBE_API_KEY || '');
    const channel = await yt.resolveChannel({
      id: process.env.YOUTUBE_CHANNEL_ID || syncConfig.channelId || store.channel?.id,
      handle: syncConfig.channelHandle,
      username: syncConfig.channelLegacyUsername,
    });

    const known = new Map(store.videos.map((v) => [v.id, v]));
    const lastFull = state.lastFullScanAt ? new Date(state.lastFullScanAt).getTime() : 0;
    const fullScan =
      process.env.SYNC_FULL === '1' ||
      store.videos.length === 0 ||
      now.getTime() - lastFull > syncConfig.fullScanEveryHours * 3_600_000;
    const allKnown = (page: { videoId: string }[]) => page.length > 0 && page.every((i) => known.has(i.videoId));

    const uploads = await yt.playlistItems(channel.uploads, fullScan ? undefined : allKnown);
    const uploadIds = new Set(uploads.map((u) => u.videoId));

    // Shorts : playlist système "UUSH…" (Shorts de la chaîne). Repli sur la durée si indisponible.
    let shortIds: Set<string> | null = null;
    try {
      const shorts = await yt.playlistItems(`UUSH${channel.id.slice(2)}`, fullScan ? undefined : allKnown);
      shortIds = new Set(shorts.map((s) => s.videoId));
    } catch (e) {
      log('playlist des Shorts indisponible, repli sur la durée :', (e as Error).message);
    }

    if (fullScan) {
      try {
        const pls = await yt.channelPlaylists(channel.id);
        log(`playlists de la chaîne (${pls.length}) :`);
        for (const p of pls) log(`  ${p.id}  ${p.count} vidéos  ${p.title}`);
      } catch (e) {
        log('liste des playlists indisponible :', (e as Error).message);
      }
    }

    // Appartenance aux playlists d'émissions (scan complet, ces playlists ne sont pas triées par date)
    const { shows } = await import('../config/shows.ts');
    const membership = new Map<string, string[]>();
    let playlistsOk = true;
    for (const show of shows) {
      for (const pid of show.playlistIds) {
        try {
          for (const item of await yt.playlistItems(pid)) {
            membership.set(item.videoId, [...(membership.get(item.videoId) || []), pid]);
          }
        } catch (e) {
          playlistsOk = false;
          log(`playlist ${pid} (${show.name}) indisponible :`, (e as Error).message);
        }
      }
    }

    // Vidéos à (re)lire en détail
    const toFetch = new Set<string>();
    for (const u of uploads) {
      const k = known.get(u.videoId);
      if (!k || k.title !== u.title) toFetch.add(u.videoId);
    }
    const recentLimit = now.getTime() - syncConfig.refreshRecentDays * 86_400_000;
    for (const v of store.videos) if (new Date(v.publishedAt).getTime() > recentLimit) toFetch.add(v.id);
    const missing = fullScan ? store.videos.filter((v) => !uploadIds.has(v.id)).map((v) => v.id) : [];
    missing.forEach((id) => toFetch.add(id));
    const budgetLeft = syncConfig.quotaBudget - state.quota.used - yt.unitsUsed;
    if (budgetLeft > 200) {
      store.videos
        .filter((v) => !toFetch.has(v.id))
        .sort((a, b) => a.refreshedAt.localeCompare(b.refreshedAt))
        .slice(0, syncConfig.refreshBatchSize)
        .forEach((v) => toFetch.add(v.id));
    }

    const details = await yt.videos([...toFetch]);
    const detailMap = new Map(details.map((d) => [d.id, d]));

    // Suppressions : absentes de l'API, privées ou non répertoriées
    const gone = new Set<string>();
    for (const id of toFetch) {
      const d = detailMap.get(id);
      if (!known.has(id)) continue;
      if (!d || d.status.privacyStatus !== 'public') gone.add(id);
    }

    // Sécurité : une réponse anormalement vide est traitée comme une panne
    if (fullScan && store.videos.length > 10 && uploadIds.size < store.videos.length * syncConfig.minKeepRatio) {
      throw new Error(
        `Réponse YouTube anormale : ${uploadIds.size} vidéos reçues pour ${store.videos.length} connues. Contenu conservé.`,
      );
    }
    if (gone.size > Math.max(10, store.videos.length * (1 - syncConfig.minKeepRatio))) {
      throw new Error(`Trop de vidéos signalées supprimées d'un coup (${gone.size}). Contenu conservé.`);
    }

    const nextVideos: Video[] = [];
    for (const v of store.videos) {
      if (gone.has(v.id)) {
        removed.push(v.id);
        if (v.kind === 'episode') {
          store.removed = store.removed.filter((r) => r.id !== v.id);
          store.removed.push({ id: v.id, slug: v.slug, show: v.show, removedAt: now.toISOString() });
          for (const p of v.previousPaths || []) {
            const [, , show, slug] = p.split('/');
            store.removed.push({ id: v.id, slug, show, removedAt: now.toISOString() });
          }
        }
        continue;
      }
      nextVideos.push(v);
    }

    const byId = new Map(nextVideos.map((v) => [v.id, v]));
    for (const d of details) {
      if (d.status.privacyStatus !== 'public') continue;
      if (d.snippet.liveBroadcastContent && d.snippet.liveBroadcastContent !== 'none') continue; // direct en cours / à venir
      if (d.status.uploadStatus && !['processed', 'uploaded'].includes(d.status.uploadStatus)) continue;
      const durationSec = parseIsoDuration(d.contentDetails.duration);
      if (!durationSec) continue;
      const existing = byId.get(d.id);
      const isShort = shortIds
        ? shortIds.has(d.id) || (existing?.kind === 'short' && !fullScan)
        : durationSec <= syncConfig.shortMaxDurationFallback || /#shorts?\b/i.test(d.snippet.title + d.snippet.description);
      const base: Video = existing
        ? { ...existing }
        : {
            id: d.id,
            slug: '',
            title: '',
            description: '',
            publishedAt: d.snippet.publishedAt,
            durationSec,
            thumbnails: [],
            kind: 'episode',
            show: '',
            playlists: [],
            chapters: [],
            themes: [],
            tags: [],
            thin: false,
            refreshedAt: '',
          };
      const prevSig = existing ? JSON.stringify([existing.title, existing.description, existing.durationSec, existing.tags]) : '';
      base.title = d.snippet.title;
      base.description = d.snippet.description || '';
      base.publishedAt = d.snippet.publishedAt;
      base.durationSec = durationSec;
      base.thumbnails = pickThumbnails(d.snippet.thumbnails);
      base.kind = isShort && durationSec <= 180 ? 'short' : 'episode';
      base.tags = d.snippet.tags || [];
      base.viewCount = d.statistics?.viewCount ? Number(d.statistics.viewCount) : undefined;
      base.refreshedAt = now.toISOString();
      if (existing) {
        if (prevSig !== JSON.stringify([base.title, base.description, base.durationSec, base.tags])) updated.push(d.id);
        byId.set(d.id, base);
      } else {
        byId.set(d.id, base);
        added.push(d.id);
      }
    }

    // Enrichissement + slugs stables
    const all = [...byId.values()];
    for (const v of all) {
      enrich(v, playlistsOk ? membership.get(v.id) || [] : undefined);
      if (!v.slug) v.slug = uniqueSlug(slugify(v.title), v.show, all, v.id);
    }
    all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    store.videos = all;
    store.channel = {
      id: channel.id,
      title: channel.title,
      handle: channel.handle,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
    };
    // Une URL revenue en ligne n'est plus redirigée
    const livePaths = new Set(all.map((v) => videoPath(v)));
    store.removed = store.removed.filter((r) => !livePaths.has(videoPath(r)));
    if (fullScan) state.lastFullScanAt = now.toISOString();
    log(`YouTube OK : ${all.length} vidéos (${fullScan ? 'scan complet' : 'scan incrémental'}), ${yt.unitsUsed} unités de quota.`);
  } catch (e) {
    errors.push(`YouTube : ${(e as Error).message}`);
    log('ÉCHEC YouTube, derniers contenus valides conservés :', (e as Error).message);
  } finally {
    if (yt) state.quota.used += yt.unitsUsed;
  }

  // ---------- Podcast ----------
  try {
    const feed = await fetchPodcastFeed(process.env.PODCAST_RSS_URL || syncConfig.podcastRssUrl);
    store.podcast = { title: feed.title, fetchedAt: now.toISOString(), items: feed.items };
    log(`Podcast OK : ${feed.items.length} épisodes audio.`);
  } catch (e) {
    errors.push(`Podcast : ${(e as Error).message}`);
    log('ÉCHEC podcast, derniers contenus valides conservés :', (e as Error).message);
  }
  if (store.podcast?.items.length) {
    const matches = matchPodcast(store.videos, store.podcast.items);
    for (const v of store.videos) {
      const m = matches.get(v.id);
      if (m) v.podcast = m;
      else delete v.podcast;
    }
  }

  // ---------- Écriture ----------
  const changed = comparable(store) !== before;
  if (changed) {
    store.generatedAt = now.toISOString();
    await writeJsonAtomic(CONTENT_PATH, store);
    log(`contenu mis à jour : +${added.length} / ~${updated.length} / -${removed.length}`);
  } else {
    log('aucun changement.');
  }

  // ---------- État + alerte ----------
  if (errors.length) {
    state.consecutiveFailures += 1;
    state.lastError = errors.join(' | ');
    if (state.consecutiveFailures >= syncConfig.alertAfterFailures && !state.alertSentAt) {
      const ok = await sendAlert(
        `[UNIFOOT TV] Synchronisation en échec (${state.consecutiveFailures} fois de suite)`,
        [
          `La synchronisation automatique du site échoue depuis ${state.consecutiveFailures} passages.`,
          `Dernier succès : ${state.lastSuccessAt || 'jamais'}`,
          '',
          'Erreur(s) :',
          ...errors.map((e) => `- ${e}`),
          '',
          'Le site reste en ligne avec les derniers contenus valides.',
          "Vérifie la clé YOUTUBE_API_KEY, le quota dans Google Cloud et l'URL du flux podcast.",
        ].join('\n'),
      );
      if (ok) state.alertSentAt = now.toISOString();
    }
  } else {
    if (state.alertSentAt) {
      await sendAlert('[UNIFOOT TV] Synchronisation rétablie', `La synchronisation fonctionne à nouveau (${now.toISOString()}).`);
    }
    state.consecutiveFailures = 0;
    state.lastSuccessAt = now.toISOString();
    delete state.lastError;
    delete state.alertSentAt;
  }
  await writeJsonAtomic(STATE_PATH, state);

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  }
  return { changed, errors, added, updated, removed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runSync()
    .then((r) => {
      // On ne fait jamais échouer le job : l'alerte e-mail gère les échecs répétés.
      if (r.errors.length) log(`terminé avec ${r.errors.length} erreur(s).`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[sync] erreur inattendue :', e);
      process.exit(1);
    });
}
