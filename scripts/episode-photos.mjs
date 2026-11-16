// Photo de l'émission pour chaque nouvel épisode qui n'en a pas encore :
// image tirée de la vidéo elle-même (plan du plateau, sans le texte de la miniature YouTube).
// Une photo déposée à la main dans public/photos/<id>.* reste prioritaire et n'est jamais remplacée.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import sharp from 'sharp';

const DIR = 'public/photos';
const DAYS = 21;
const have = new Set((await readdir(DIR)).map((f) => f.replace(/\.(jpe?g|webp|png)$/i, '')));
const data = JSON.parse(await readFile('data/content.json', 'utf8'));
const since = Date.now() - DAYS * 86_400_000;
const todo = data.videos.filter((v) => v.kind !== 'short' && v.durationSec >= 600
  && new Date(v.publishedAt).getTime() >= since && !have.has(v.id));

// Images que YouTube extrait de la vidéo (milieu, début, fin), de la meilleure à la moins bonne
const frames = ['maxres2', 'maxres1', 'maxres3', 'sd2', 'sd1', 'sd3', 'hq2'];

let made = 0;
for (const v of todo) {
  for (const f of frames) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${v.id}/${f}.jpg`);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const m = await sharp(buf).metadata();
      if ((m.width ?? 0) < 600) continue; // image de remplacement de YouTube
      // recadrage 16:9 (les formats sd/hq ont des bandes noires)
      const img = await sharp(buf).trim({ threshold: 20 }).resize(1280, 720, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
      await writeFile(`${DIR}/${v.id}.webp`, img);
      made++;
      console.log(`Photo ${v.id} (${f}) : ${v.title}`);
      break;
    } catch (e) { console.warn(v.id, f, String(e)); }
  }
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `photos=${made > 0}\n`);
