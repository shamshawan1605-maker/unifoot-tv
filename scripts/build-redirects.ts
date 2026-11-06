// Génère public/_redirects (Netlify) : anciennes URL du site WordPress + épisodes supprimés ou déplacés.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContentStore } from '../src/types.ts';
import { legacyRedirects } from '../config/redirects.ts';

const ROOT = resolve(import.meta.dirname, '..');
const contentPath = resolve(ROOT, process.env.CONTENT_PATH || 'data/content.json');
const store: ContentStore | null = existsSync(contentPath) ? JSON.parse(await readFile(contentPath, 'utf8')) : null;

const lines: string[] = ['# Fichier généré automatiquement par scripts/build-redirects.ts : ne pas modifier à la main.', ''];
lines.push('# Anciennes URL du site WordPress');
for (const [from, to] of legacyRedirects) lines.push(`${from}  ${to}  301`);

if (store) {
  const live = new Set(store.videos.filter((v) => v.kind === 'episode').map((v) => `/emissions/${v.show}/${v.slug}/`));
  const liveShows = new Set(store.videos.filter((v) => v.kind === 'episode').map((v) => v.show));
  const showPage = (show: string) => (liveShows.has(show) ? `/emissions/${show}/` : '/emissions/');
  lines.push('', '# Épisodes déplacés vers une autre émission');
  for (const v of store.videos) {
    for (const p of v.previousPaths || []) {
      if (live.has(p)) continue;
      lines.push(`${p}  /emissions/${v.show}/${v.slug}/  301`);
      lines.push(`${p.replace(/\/$/, '')}  /emissions/${v.show}/${v.slug}/  301`);
    }
  }
  lines.push('', '# Épisodes supprimés ou passés en privé : redirigés vers leur émission');
  const seen = new Set<string>();
  for (const r of store.removed) {
    const p = `/emissions/${r.show}/${r.slug}/`;
    if (live.has(p) || seen.has(p)) continue;
    seen.add(p);
    lines.push(`${p}  ${showPage(r.show)}  301`);
    lines.push(`${p.replace(/\/$/, '')}  ${showPage(r.show)}  301`);
  }
}

await writeFile(resolve(ROOT, 'public/_redirects'), lines.join('\n') + '\n');
console.log(`[redirects] ${lines.filter((l) => l && !l.startsWith('#')).length} règles écrites dans public/_redirects`);
