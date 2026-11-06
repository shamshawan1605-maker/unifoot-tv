import { XMLParser } from 'fast-xml-parser';
import type { PodcastFeedItem, PodcastMatch, Video } from '../../src/types.ts';
import { syncConfig } from '../../config/sync.ts';
import { allShows } from '../../config/shows.ts';
import { titleSimilarity, parseClock } from './text.ts';

export async function fetchPodcastFeed(url: string, fetchImpl: typeof fetch = fetch) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { 'user-agent': 'UNIFOOT-TV-sync/1.0', accept: 'application/rss+xml, application/xml, text/xml' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parsePodcastFeed(await res.text());
    } catch (err) {
      lastErr = err;
      if (!process.env.SYNC_NO_SLEEP) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new Error(`Flux podcast indisponible : ${(lastErr as Error)?.message}`);
}

export function parsePodcastFeed(xml: string): { title?: string; items: PodcastFeedItem[] } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: false });
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) throw new Error('Flux podcast invalide (pas de <channel>)');
  const raw = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
  const items: PodcastFeedItem[] = raw
    .map((it: any): PodcastFeedItem | null => {
      const title = textOf(it.title);
      const date = new Date(textOf(it.pubDate));
      if (!title || Number.isNaN(date.getTime())) return null;
      const guid = textOf(it.guid) || textOf(it.link) || `${title}-${date.toISOString()}`;
      return {
        guid,
        title,
        url: textOf(it.link) || undefined,
        audioUrl: it.enclosure?.['@_url'] || undefined,
        audioType: it.enclosure?.['@_type'] || undefined,
        publishedAt: date.toISOString(),
        durationSec: parseClock(textOf(it['itunes:duration'])) || undefined,
      };
    })
    .filter(Boolean) as PodcastFeedItem[];
  if (!items.length) throw new Error('Flux podcast vide');
  return { title: textOf(channel.title) || undefined, items };
}

function textOf(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (typeof v === 'object' && '#text' in (v as any)) return String((v as any)['#text']).trim();
  return '';
}

/**
 * Associe chaque épisode vidéo à un épisode audio (titre proche + date proche).
 * Un épisode audio n'est associé qu'à une seule vidéo (meilleur score d'abord).
 */
export function matchPodcast(videos: Video[], items: PodcastFeedItem[]): Map<string, PodcastMatch> {
  const { maxDaysApart, minScore, minScoreSameDay } = syncConfig.podcastMatch;
  const podcastShows = new Set(allShows.filter((s) => s.hasPodcast).map((s) => s.slug));
  const candidates: { videoId: string; item: PodcastFeedItem; score: number }[] = [];
  for (const v of videos) {
    if (v.kind !== 'episode' || !podcastShows.has(v.show)) continue;
    const vt = new Date(v.publishedAt).getTime();
    for (const item of items) {
      const days = Math.abs(new Date(item.publishedAt).getTime() - vt) / 86_400_000;
      if (days > maxDaysApart) continue;
      const sim = titleSimilarity(v.title, item.title);
      const threshold = days <= 1.5 ? minScoreSameDay : minScore;
      if (sim < threshold) continue;
      candidates.push({ videoId: v.id, item, score: sim - days * 0.01 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const usedVideos = new Set<string>();
  const usedItems = new Set<string>();
  const out = new Map<string, PodcastMatch>();
  for (const c of candidates) {
    if (usedVideos.has(c.videoId) || usedItems.has(c.item.guid)) continue;
    usedVideos.add(c.videoId);
    usedItems.add(c.item.guid);
    out.set(c.videoId, { ...c.item });
  }
  return out;
}
