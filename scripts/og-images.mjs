// Facebook ne lit pas les images WebP en aperçu de lien : on crée une copie JPG
// (1200 × 630) de chaque image d'actu, utilisée seulement pour og:image.
import { readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const src = 'public/actualites';
const out = 'public/actualites/og';
await mkdir(out, { recursive: true });
for (const f of await readdir(src)) {
  if (!/\.(webp|png|jpe?g)$/i.test(f)) continue;
  const dest = path.join(out, f.replace(/\.(webp|png|jpe?g)$/i, '.jpg'));
  try {
    const [a, b] = await Promise.all([stat(path.join(src, f)), stat(dest).catch(() => null)]);
    if (b && b.mtimeMs >= a.mtimeMs) continue;
  } catch {}
  await sharp(path.join(src, f)).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(dest);
}
