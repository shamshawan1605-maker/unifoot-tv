import type { Chapter } from '../../src/types.ts';
import { themes, THEME_MIN_SCORE, THEME_MAX_PER_VIDEO } from '../../config/themes.ts';
import { shows } from '../../config/shows.ts';
import { syncConfig } from '../../config/sync.ts';
import { normalize, parseClock } from './text.ts';

const TS = String.raw`(?:(\d{1,2}):)?(\d{1,2}):(\d{2})`;
const LEAD = new RegExp(String.raw`^\s*(?:[-–—•▶►▪*]\s*)?[\[(]?${TS}[\])]?\s*(?:[-–—:|•.]\s*)?(.+?)\s*$`);
const TRAIL = new RegExp(String.raw`^\s*(?:[-–—•▶►▪*]\s*)?(.+?)\s*(?:[-–—:|•]\s*)?[\[(]?${TS}[\])]?\s*$`);

function toSec(h: string | undefined, m: string, s: string) {
  return (h ? Number(h) * 3600 : 0) + Number(m) * 60 + Number(s);
}

/**
 * Chapitres YouTube tirés de la description.
 * Mêmes règles que YouTube : au moins 3 horodatages croissants, le premier à 0:00.
 */
export function parseChapters(description: string, durationSec = 0): Chapter[] {
  const out: Chapter[] = [];
  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let m = line.match(LEAD);
    let chapter: Chapter | null = null;
    if (m) chapter = { start: toSec(m[1], m[2], m[3]), label: m[4] };
    else if ((m = line.match(TRAIL))) chapter = { start: toSec(m[2], m[3], m[4]), label: m[1] };
    if (!chapter) continue;
    chapter.label = chapter.label.replace(/^[-–—:|•.\s]+|[-–—:|•\s]+$/g, '').trim();
    if (!chapter.label || /^https?:/i.test(chapter.label)) continue;
    if (durationSec && chapter.start > durationSec) continue;
    if (out.length && chapter.start <= out[out.length - 1].start) continue;
    out.push(chapter);
  }
  if (out.length < 3 || out[0].start !== 0) return [];
  return out;
}

const NOT_NAME = new Set(
  normalize(
    'le la les un une des du de comment pourquoi qui quoi quand debat kick foot fc us as club ballon or tour actu ' +
      'methode educateurs educateur parent parents arbitre arbitrage president presidente ancien ancienne ' +
      'episode emission partie avant match premiere deuxieme periode prolongations live special best top ' +
      'il elle on ils ce cette sylvain repond astuce jour coach france paris national',
  ).split(' '),
);

function looksLikeName(candidate: string): boolean {
  const c = candidate.trim().replace(/[!?.…]+$/, '').trim();
  const words = c.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  const particles = new Set(['de', 'da', 'du', 'van', 'von', 'el', 'ben', 'dos', 'di', 'le']);
  let caps = 0;
  for (const w of words) {
    if (particles.has(w)) continue;
    if (!/^\p{Lu}[\p{L}'’-]+$/u.test(w)) return false;
    if (/^\p{Lu}+$/u.test(w) && w.length > 1 && w.length <= 3) return false; // sigles (VS, FC, OL…)
    if (NOT_NAME.has(normalize(w))) return false;
    caps++;
  }
  return caps >= 2;
}

function clean(name: string) {
  return name.trim().replace(/[!?.…,;:]+$/, '').trim();
}

/** Invité détecté dans le titre ou la description. Prudent : en cas de doute, rien. */
export function detectGuest(title: string, description: string): string | undefined {
  // 1. Ligne explicite dans la description : "Invité : Prénom Nom"
  const d = description.match(/^\s*(?:🎙️?\s*)?(?:invit[ée]e?s?|guest)\s*[:：]\s*([^\n,|(–—-]+)/im);
  if (d && looksLikeName(clean(d[1]))) return clean(d[1]);

  const t = title.trim();
  // 2. "avec Prénom Nom" / "ft. Prénom Nom" / "feat Prénom Nom"
  const a = t.match(/\b(?:avec|ft\.?|feat\.?)\s+((?:\p{Lu}[\p{L}'’-]+\s?){2,4})/u);
  if (a && looksLikeName(clean(a[1]))) return clean(a[1]);
  // 3. "(Prénom Nom, rôle…)" en fin de titre
  const p = t.match(/\(\s*((?:\p{Lu}[\p{L}'’-]+\s?){2,4}),[^)]*\)\s*$/u);
  if (p && looksLikeName(clean(p[1]))) return clean(p[1]);
  // 4. "Prénom Nom, rôle… : sujet" ou "Prénom Nom : sujet" en début de titre
  const s = t.match(/^((?:\p{Lu}[\p{L}'’-]+\s?){2,4})\s*[,:]/u);
  if (s && looksLikeName(clean(s[1]))) return clean(s[1]);
  // 5. "… : Prénom Nom" en fin de titre
  const e = t.match(/:\s*((?:\p{Lu}[\p{L}'’-]+\s?){2,4})$/u);
  if (e && looksLikeName(clean(e[1]))) return clean(e[1]);
  return undefined;
}

function countMatches(haystack: string, keyword: string): number {
  const k = normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[^a-z0-9])${k}(?:s|x|es)?(?=$|[^a-z0-9])`, 'g');
  return (haystack.match(re) || []).length;
}

/** Thèmes attribués selon les règles de config/themes.ts */
export function assignThemes(title: string, description: string, tags: string[]): string[] {
  const nt = normalize(title);
  const nd = normalize(description);
  const ntags = normalize(tags.join(' | '));
  const scored: { slug: string; score: number }[] = [];
  for (const theme of themes) {
    if (theme.exclude?.some((x) => countMatches(nt, x) > 0)) continue;
    let score = 0;
    for (const k of theme.keywords) {
      score += Math.min(countMatches(nt, k), 1) * 3;
      score += Math.min(countMatches(ntags, k), 1) * 2;
      score += Math.min(countMatches(nd, k), 2) * 1;
    }
    if (score >= THEME_MIN_SCORE) scored.push({ slug: theme.slug, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, THEME_MAX_PER_VIDEO)
    .map((s) => s.slug);
}

/** Texte utile de la description (sans liens, hashtags, horodatages, lignes promotionnelles) */
export function usefulDescription(description: string): string {
  return description
    .split(/\r?\n/)
    .filter((l) => !/https?:\/\//i.test(l))
    .filter((l) => !LEAD.test(l.trim()) && !TRAIL.test(l.trim()))
    .join('\n')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isThin(description: string, chapters: Chapter[]): boolean {
  return usefulDescription(description).length < syncConfig.thinDescriptionChars && chapters.length < 3;
}

/** Émission d'une vidéo : playlist d'abord, puis mots-clés du titre, sinon Kick in the Foot (il n'y a pas de hors-série) */
export function assignShow(videoPlaylists: string[], title: string): string {
  for (const show of [...shows].sort((a, b) => a.order - b.order)) {
    if (show.playlistIds.some((p) => videoPlaylists.includes(p))) return show.slug;
  }
  const nt = normalize(title);
  for (const show of shows) {
    if (show.titleMatches?.some((m) => nt.includes(normalize(m)))) return show.slug;
  }
  return 'kick-in-the-foot';
}

export { parseClock };
