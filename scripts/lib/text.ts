/** minuscules, sans accents, sans emojis, espaces normalisés */
export function normalize(input: string): string {
  return input
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(input: string, max = 80): string {
  const s = normalize(input)
    .replace(/['"]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= max) return s || 'video';
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf('-') > 40 ? cut.lastIndexOf('-') : max).replace(/-+$/, '');
}

const STOP = new Set(
  'le la les un une des de du d l a au aux et ou en dans sur pour par avec sans ce ces cet cette son sa ses leur leurs qui que quoi est sont il elle ils on nous vous je tu ne pas plus se s c n y t qu the of and to is'.split(' '),
);

export function tokens(input: string): string[] {
  return normalize(input)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Similarité de Dice entre deux titres (0 à 1) */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return (2 * inter) / (ta.size + tb.size);
}

/** ISO 8601 (PT1H2M3S) -> secondes */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, mi, s] = m.map((x) => (x ? Number(x) : 0)) as number[];
  return d * 86400 + h * 3600 + mi * 60 + s;
}

/** "01:02:03" | "62:03" | "3723" -> secondes */
export function parseClock(input: string | number | undefined): number | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  if (typeof input === 'number') return input;
  const parts = String(input).trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
