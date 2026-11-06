// Génère data/demo/content.json (aperçu du site avec des données de démonstration) via le faux YouTube.
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startMock } from './mock-server.ts';
import { demoState } from './fixtures.ts';

const state = demoState();
const { server, base } = await startMock(state);
Object.assign(process.env, {
  YOUTUBE_API_BASE: `${base}/yt`, YOUTUBE_API_KEY: 'demo', YOUTUBE_CHANNEL_ID: state.channelId,
  PODCAST_RSS_URL: `${base}/podcast.xml`, CONTENT_PATH: resolve('data/demo/content.json'),
  STATE_PATH: join(await mkdtemp(join(tmpdir(), 'demo-')), 's.json'), SYNC_FULL: '1', SYNC_NO_SLEEP: '1',
});
const { runSync } = await import('../scripts/sync.ts');
const r = await runSync();
console.log('démo générée', r.added.length, 'vidéos');
server.close();
