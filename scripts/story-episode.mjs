// Visuel de story (1080 × 1920) pour chaque nouvel épisode de l'émission :
// fond flouté tiré de la miniature, titre de l'épisode en haut, miniature au centre,
// place libre en dessous pour le sticker « lien » d'Instagram.
// Usage : node scripts/story-episode.mjs            → épisodes des 3 derniers jours sans visuel
//         node scripts/story-episode.mjs <id> [miniature locale]   → un épisode précis (test)
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import sharp from 'sharp';

const W = 1080, H = 1920;
const FONT = 'assets/fonts/BarlowCondensed-Bold.ttf';
const OUT = 'public/stories';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function thumbFor(v, local) {
  if (local) return readFile(local);
  const urls = [...(v.thumbnails ?? [])].sort((a, b) => b.width - a.width).map((t) => t.url);
  urls.push(`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`);
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch {}
  }
  throw new Error(`miniature introuvable pour ${v.id}`);
}

export async function renderStory(v, thumbBuf) {
  // Miniature recadrée en 16:9
  const thumbW = 1000, thumbH = 563;
  const thumb = await sharp(thumbBuf).resize(thumbW, thumbH, { fit: 'cover' }).toBuffer();
  const radius = 18;
  const mask = Buffer.from(`<svg width="${thumbW}" height="${thumbH}"><rect width="${thumbW}" height="${thumbH}" rx="${radius}" ry="${radius}"/></svg>`);
  const thumbRounded = await sharp(thumb).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

  // Fond : miniature agrandie, très floutée et assombrie vers le bas
  const bg = await sharp(thumbBuf).resize(W, H, { fit: 'cover' }).blur(60).modulate({ brightness: 0.75, saturation: 0.9 }).toBuffer();
  const shade = Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0a0c2c" stop-opacity="0.25"/><stop offset="0.55" stop-color="#0a0c2c" stop-opacity="0.45"/><stop offset="1" stop-color="#0a0c2c" stop-opacity="0.9"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);

  // Titre
  const title = v.title.replace(/\s+/g, ' ').trim();
  const size = title.length > 90 ? 76 : title.length > 60 ? 86 : 96;
  const text = await sharp({
    text: {
      text: `<span foreground="#ffffff">${esc(title)}</span>`,
      fontfile: FONT, font: `Barlow Condensed, Bold ${size}`,
      width: 920, align: 'centre', wrap: 'word', rgba: true, spacing: 6,
    },
  }).png().toBuffer();
  const tm = await sharp(text).metadata();

  // Ombre portée de la miniature
  const shadow = Buffer.from(`<svg width="${thumbW + 80}" height="${thumbH + 80}"><filter id="f"><feGaussianBlur stdDeviation="18"/></filter>
    <rect x="40" y="48" width="${thumbW}" height="${thumbH}" rx="${radius}" fill="#000" opacity="0.55" filter="url(#f)"/></svg>`);

  const thumbTop = 640;
  const textTop = Math.max(170, thumbTop - 70 - tm.height);
  return sharp(bg)
    .composite([
      { input: shade, top: 0, left: 0 },
      { input: text, top: textTop, left: Math.round((W - tm.width) / 2) },
      { input: shadow, top: thumbTop - 40, left: (W - thumbW) / 2 - 40 },
      { input: thumbRounded, top: thumbTop, left: (W - thumbW) / 2 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

const data = JSON.parse(await readFile('data/content.json', 'utf8'));
await mkdir(OUT, { recursive: true });
const [, , onlyId, localThumb] = process.argv;
const since = Date.now() - 3 * 86_400_000;
const todo = data.videos.filter((v) => onlyId ? v.id === onlyId
  : v.kind !== 'short' && v.durationSec >= 600 && new Date(v.publishedAt).getTime() >= since);

let made = 0;
for (const v of todo) {
  const dest = `${OUT}/${v.id}.jpg`;
  if (!onlyId) { try { await access(dest); continue; } catch {} }
  try {
    await writeFile(dest, await renderStory(v, await thumbFor(v, localThumb)));
    made++;
    console.log(`Story créée : ${dest}`);
  } catch (e) { console.warn(String(e)); }
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `stories=${made > 0}\n`);
