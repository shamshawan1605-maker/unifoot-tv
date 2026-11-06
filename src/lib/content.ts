import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
// Accès aux contenus synchronisés (data/content.json) pour la construction du site.
import type { ContentStore, Video } from '~/types';
import { allShows, type ShowConfig } from '@config/shows';
import { themes, type ThemeConfig } from '@config/themes';
import prodStore from '../../data/content.json';

/** DEMO_CONTENT=1 : construit l'aperçu avec data/demo/content.json (données fictives signalées) */
export const isDemo = import.meta.env.DEMO_CONTENT === '1' || process.env.DEMO_CONTENT === '1';

const demoFiles = import.meta.glob('../../data/demo/content.json', { eager: true, import: 'default' });
const demoStore = Object.values(demoFiles)[0] as ContentStore | undefined;

export const store: ContentStore = (isDemo && demoStore ? demoStore : prodStore) as ContentStore;

export const videos: Video[] = [...store.videos].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
export const episodes = videos.filter((v) => v.kind === 'episode');
export const shorts = videos.filter((v) => v.kind === 'short');
export const latestEpisode: Video | undefined =
  episodes.find((v) => v.show === allShows[0].slug) ?? episodes[0];

export const showBySlug = new Map(allShows.map((s) => [s.slug, s]));
export const themeBySlug = new Map(themes.map((t) => [t.slug, t]));

export function showOf(v: Video): ShowConfig {
  return showBySlug.get(v.show) ?? allShows[allShows.length - 1];
}

export function episodesOfShow(slug: string) {
  return episodes.filter((v) => v.show === slug);
}

/** Émissions qui ont au moins un épisode (on n'affiche jamais de section vide) */
export const activeShows = allShows
  .filter((s) => episodesOfShow(s.slug).length > 0)
  .sort((a, b) => a.order - b.order);

export function contentOfTheme(slug: string) {
  return { episodes: episodes.filter((v) => v.themes.includes(slug)), shorts: shorts.filter((v) => v.themes.includes(slug)) };
}

export const activeThemes: (ThemeConfig & { count: number })[] = themes
  .map((t) => ({ ...t, count: contentOfTheme(t.slug).episodes.length + contentOfTheme(t.slug).shorts.length }))
  .filter((t) => t.count > 0);

export const videoPath = (v: Pick<Video, 'show' | 'slug'>) => `/emissions/${v.show}/${v.slug}/`;
export const watchUrl = (v: Video) => (v.kind === 'short' ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`);

/** Épisodes liés : même émission et thèmes communs, puis récence */
export function related(v: Video, n = 6): Video[] {
  return episodes
    .filter((x) => x.id !== v.id)
    .map((x) => ({
      x,
      score:
        x.themes.filter((t) => v.themes.includes(t)).length * 3 +
        (x.show === v.show ? 2 : 0) +
        (x.guest && x.guest === v.guest ? 4 : 0) -
        Math.abs(new Date(x.publishedAt).getTime() - new Date(v.publishedAt).getTime()) / (86_400_000 * 120),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((s) => s.x);
}

export function neighbours(v: Video) {
  const list = episodesOfShow(v.show);
  const i = list.findIndex((x) => x.id === v.id);
  return { newer: i > 0 ? list[i - 1] : undefined, older: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}

// ---------- Formatage ----------
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const shortDateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso));

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function durationLabel(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m) return `${m} min`;
  return `${sec} s`;
}

export const isoDuration = (sec: number) => `PT${Math.floor(sec / 3600)}H${Math.floor((sec % 3600) / 60)}M${sec % 60}S`;

/** Première phrase utile de la description, pour les meta descriptions et les cartes */
export function excerpt(v: Video, max = 155): string {
  const lines = v.description
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/https?:\/\//.test(l) && !/^\s*[[(]?\d{1,2}:\d{2}/.test(l) && !/^#/.test(l))
    .map((l) => l.replace(/#[\p{L}\p{N}_]+/gu, '').trim())
    .filter(Boolean);
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
}

export function metaDescription(v: Video): string {
  const show = showOf(v).name;
  const ex = excerpt(v, 120);
  const base = ex || `${v.title}.`;
  const suffix = ` ${show}, ${formatDate(v.publishedAt)}.`;
  return (base + suffix).slice(0, 160);
}

/**
 * Photos personnalisées : public/photos/<identifiant de la vidéo YouTube>.jpg (ou .webp / .png).
 * Si une photo existe, elle remplace la miniature YouTube partout sur le site.
 */
const customPhotos: Map<string, string> = (() => {
  const m = new Map<string, string>();
  try {
    for (const f of readdirSync(join(process.cwd(), 'public', 'photos'))) {
      const match = f.match(/^(.+)\.(jpe?g|webp|png)$/i);
      // ?v=… change à chaque nouvelle version de la photo : les navigateurs ne gardent pas l'ancienne en mémoire
      if (match) {
        const v = createHash('md5').update(readFileSync(join(process.cwd(), 'public', 'photos', f))).digest('hex').slice(0, 8);
        m.set(match[1], `/photos/${f}?v=${v}`);
      }
    }
  } catch { /* pas de dossier photos */ }
  return m;
})();
export const hasCustomPhoto = (v: Video) => customPhotos.has(v.id);

export function thumbSrcset(v: Video) {
  const photo = customPhotos.get(v.id);
  if (photo) return { src: photo, srcset: `${photo} 1280w`, largest: new URL(photo, import.meta.env.SITE).href };
  if (isDemo && v.id.startsWith('demo')) return { src: '/demo-sans-miniature.jpg', srcset: '/demo-sans-miniature.jpg 480w', largest: '/brand/og-default.png' };
  const t = v.thumbnails.length
    ? v.thumbnails
    : [
        { url: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, width: 320, height: 180 },
        { url: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, width: 480, height: 360 },
      ];
  return {
    src: t[Math.min(1, t.length - 1)].url,
    srcset: t.map((x) => `${x.url} ${x.width}w`).join(', '),
    largest: t[t.length - 1].url,
  };
}

export function paginate<T>(items: T[], perPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  return Array.from({ length: pages }, (_, i) => ({ page: i + 1, pages, items: items.slice(i * perPage, (i + 1) * perPage) }));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Description YouTube en HTML sûr : liens cliquables, paragraphes, sans les lignes de chapitres */
export function descriptionHtml(v: Video): string {
  const chapterLine = /^\s*(?:[-–—•▶►▪*]\s*)?[[(]?(?:\d{1,2}:)?\d{1,2}:\d{2}[\])]?\s|\s[[(]?(?:\d{1,2}:)?\d{1,2}:\d{2}[\])]?\s*$/;
  const lines = v.description.split(/\r?\n/).filter((l) => !(v.chapters.length && chapterLine.test(l)));
  const paragraphs = lines.join('\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragraphs
    .map((p) => {
      const html = esc(p)
        .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/g, (url) => {
          const label = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48);
          return `<a href="${url}" rel="noopener nofollow ugc" target="_blank">${label}</a>`;
        })
        .replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    })
    .join('');
}

/** Typographie française : espace insécable avant ? ! : ; et à l'intérieur des guillemets */
export function fr(text: string): string {
  return text
    .replace(/\s+([?!:;»])/g, '\u00a0$1')
    .replace(/«\s+/g, '«\u00a0');
}
