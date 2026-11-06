// Test de bout en bout de la synchronisation, contre un faux YouTube / faux podcast / faux service e-mail.
// Lancer : npm test
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startMock } from './mock-server.ts';
import { demoState, PL_KITF, PL_SEANCE } from './fixtures.ts';
import type { ContentStore, SyncState } from '../src/types.ts';

const dir = await mkdtemp(join(tmpdir(), 'unifoot-sync-'));
const state = demoState();
const { server, base } = await startMock(state);

Object.assign(process.env, {
  YOUTUBE_API_BASE: `${base}/yt`,
  YOUTUBE_API_KEY: 'test-key',
  YOUTUBE_CHANNEL_ID: state.channelId,
  PODCAST_RSS_URL: `${base}/podcast.xml`,
  RESEND_API_BASE: `${base}/mail`,
  RESEND_API_KEY: 'test',
  ALERT_EMAIL_TO: 'tech@example.com',
  CONTENT_PATH: join(dir, 'content.json'),
  STATE_PATH: join(dir, 'state.json'),
  SYNC_NO_SLEEP: '1',
});
delete process.env.SYNC_WINDOW;

const { runSync, inRushWindow } = await import('../scripts/sync.ts');
const content = async () => JSON.parse(await readFile(join(dir, 'content.json'), 'utf8')) as ContentStore;
const syncState = async () => JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')) as SyncState;
const byId = (c: ContentStore, id: string) => c.videos.find((v) => v.id === id);

let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('Synchronisation : scénarios');

await step('1. synchronisation complète initiale', async () => {
  process.env.SYNC_FULL = '1';
  const r = await runSync();
  assert.equal(r.errors.length, 0, r.errors.join());
  assert.equal(r.changed, true);
  const c = await content();
  assert.equal(c.videos.length, 21);
  assert.equal(c.videos.filter((v) => v.kind === 'short').length, 8);
  const kitf = byId(c, 'demoKITF003')!;
  assert.equal(kitf.show, 'kick-in-the-foot');
  assert.equal(kitf.slug, 'educateurs-abandonnes-les-responsables-techniques-sont-ils-en-cause');
  assert.equal(kitf.chapters.length, 5);
  assert.deepEqual(kitf.chapters[1], { start: 135, label: 'Le sujet de la semaine' });
  assert.ok(kitf.themes.includes('educateurs'), `thèmes : ${kitf.themes}`);
  assert.equal(kitf.podcast?.title, 'Éducateurs abandonnés ? Les responsables techniques sont-ils en cause ?');
  assert.equal(byId(c, 'demoENT0004')!.show, 'entre-2');
  assert.equal(byId(c, 'demoENT0004')!.guest, 'Gauthier Diafutua');
  assert.equal(byId(c, 'demoENT0002')!.guest, 'Sambou Tati');
  assert.equal(byId(c, 'demoENT0003')!.guest, 'Santiago Cucci');
  assert.equal(byId(c, 'demoKITF004')!.guest, 'Wilo Footix');
  assert.equal(byId(c, 'demoKITF001')!.guest, undefined, 'pas de faux invité');
  assert.equal(byId(c, 'demoSEA0001')!.show, 'au-coeur-d-une-seance');
  assert.equal(byId(c, 'demoSEA0001')!.podcast, undefined, "pas d'audio pour une émission sans podcast");
  assert.equal(byId(c, 'demoHS00001')!.show, 'kick-in-the-foot'); // pas de hors-série : par défaut, Kick in the Foot
  assert.equal(byId(c, 'demoHS00001')!.thin, true, 'description pauvre => noindex');
  assert.equal(kitf.thin, false);
  assert.equal(byId(c, 'demoENT0003')!.podcast?.audioUrl, 'https://example.com/audio/cucci.mp3');
  // les 10 épisodes audio associés à 10 vidéos différentes
  assert.equal(c.videos.filter((v) => v.podcast).length, 10);
});

await step('2. passage sans nouveauté : aucun changement, scan incrémental', async () => {
  delete process.env.SYNC_FULL;
  state.requests.length = 0;
  const r = await runSync();
  assert.equal(r.changed, false);
  const uploadsCalls = state.requests.filter((u) => u.includes('playlistItems') && u.includes('UUdemo'));
  assert.equal(uploadsCalls.length, 1, 'une seule page lue pour les mises en ligne');
});

await step('3. nouvelle vidéo du mercredi : page créée automatiquement, podcast associé quand il sort', async () => {
  state.videos.push({
    id: 'demoKITF007', title: 'Faut-il payer les éducateurs dans le foot amateur ?', publishedAt: '2026-11-04T17:00:00Z',
    duration: 'PT49M00S', description: state.videos[4].description,
  });
  state.playlists[PL_KITF].unshift('demoKITF007');
  let r = await runSync();
  assert.deepEqual(r.added, ['demoKITF007']);
  let c = await content();
  const v = byId(c, 'demoKITF007')!;
  assert.equal(v.slug, 'faut-il-payer-les-educateurs-dans-le-foot-amateur');
  assert.equal(v.show, 'kick-in-the-foot');
  assert.equal(c.videos[0].id, 'demoKITF007', "en tête de liste");
  assert.equal(v.podcast, undefined);
  state.podcast.unshift({ title: 'Faut-il payer les éducateurs dans le foot amateur ?', pubDate: '2026-11-04T19:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/payer', audio: 'https://example.com/audio/payer.mp3', duration: '49:00' });
  r = await runSync();
  assert.equal(r.changed, true);
  c = await content();
  assert.equal(byId(c, 'demoKITF007')!.podcast?.url, 'https://creators.spotify.com/pod/demo/episodes/payer');
});

await step('4. titre modifié sur YouTube : contenu mis à jour, URL inchangée', async () => {
  state.videos.find((x) => x.id === 'demoKITF007')!.title = 'Faut-il payer les éducateurs ? Le grand débat';
  const r = await runSync();
  assert.ok(r.updated.includes('demoKITF007'));
  const v = byId(await content(), 'demoKITF007')!;
  assert.equal(v.title, 'Faut-il payer les éducateurs ? Le grand débat');
  assert.equal(v.slug, 'faut-il-payer-les-educateurs-dans-le-foot-amateur');
});

await step('5. vidéo hors playlist ajoutée ensuite à une émission : ancienne URL redirigée', async () => {
  state.playlists[PL_SEANCE].push('demoHS00001');
  await runSync();
  const v = byId(await content(), 'demoHS00001')!;
  assert.equal(v.show, 'au-coeur-d-une-seance');
  assert.deepEqual(v.previousPaths, ['/emissions/kick-in-the-foot/rencontre-avec-les-benevoles-du-tournoi-de-paques/']);
});

await step('6. vidéo passée en privée + vidéo supprimée : retirées et redirigées vers leur émission', async () => {
  state.videos.find((x) => x.id === 'demoENT0003')!.privacy = 'private';
  state.videos.find((x) => x.id === 'demoSHT0003')!.deleted = true;
  process.env.SYNC_FULL = '1';
  const r = await runSync();
  delete process.env.SYNC_FULL;
  assert.deepEqual(r.removed.sort(), ['demoENT0003', 'demoSHT0003']);
  const c = await content();
  assert.equal(byId(c, 'demoENT0003'), undefined);
  assert.ok(c.removed.some((x) => x.id === 'demoENT0003' && x.show === 'entre-2'));
  execFileSync('npx', ['tsx', 'scripts/build-redirects.ts'], { env: process.env, stdio: 'pipe' });
  const redirects = await readFile('public/_redirects', 'utf8');
  assert.match(redirects, /\/emissions\/entre-2\/santiago-cucci-president-aviron-bayonnais-fc-ex-ol-rachat-girondins-rate\/\s+\/emissions\/entre-2\/\s+301/);
  assert.match(redirects, /\/emissions\/kick-in-the-foot\/rencontre-avec-les-benevoles-du-tournoi-de-paques\/\s+\/emissions\/au-coeur-d-une-seance\/rencontre-avec-les-benevoles-du-tournoi-de-paques\/\s+301/);
  assert.match(redirects, /\/lequipe\/\s+\/equipe\/\s+301/);
});

await step('7. panne YouTube : derniers contenus conservés, alerte après 3 échecs seulement', async () => {
  const snapshot = JSON.stringify(await content());
  state.fail = 'youtube-500';
  for (let i = 1; i <= 4; i++) {
    const r = await runSync();
    assert.equal(r.errors.length, 1);
    assert.equal(r.changed, false);
    assert.equal((await syncState()).consecutiveFailures, i);
    assert.equal(state.emails.length, i >= 3 ? 1 : 0, `e-mails après ${i} échec(s)`);
  }
  assert.equal(JSON.stringify(await content()), snapshot, 'contenu strictement identique');
  assert.match(state.emails[0].subject, /4|3/);
  state.fail = 'none';
  const r = await runSync();
  assert.equal(r.errors.length, 0);
  assert.equal((await syncState()).consecutiveFailures, 0);
  assert.equal(state.emails.length, 2, 'e-mail de rétablissement');
});

await step('8. réponse anormalement vide (scan complet) : traitée comme une panne', async () => {
  const snapshot = JSON.stringify(await content());
  state.fail = 'youtube-empty';
  process.env.SYNC_FULL = '1';
  const r = await runSync();
  delete process.env.SYNC_FULL;
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /anormale/);
  assert.equal(JSON.stringify(await content()), snapshot);
  state.fail = 'none';
  await runSync();
});

await step('9. quota YouTube dépassé : contenus conservés', async () => {
  const snapshot = JSON.stringify(await content());
  state.fail = 'youtube-quota';
  const r = await runSync();
  assert.match(r.errors[0], /quotaExceeded/);
  assert.equal(JSON.stringify(await content()), snapshot);
  state.fail = 'none';
  await runSync();
});

await step('10. panne du flux podcast : vidéos à jour, liens audio conservés', async () => {
  state.fail = 'podcast-500';
  state.videos.push({ id: 'demoSHT0011', title: 'Nouveau Short', publishedAt: '2026-11-05T10:00:00Z', duration: 'PT40S', description: '#shorts', short: true });
  const r = await runSync();
  assert.equal(r.errors.length, 1);
  assert.deepEqual(r.added, ['demoSHT0011']);
  const c = await content();
  assert.equal(c.videos.filter((v) => v.podcast).length, 10);
  state.fail = 'none';
  await runSync();
});

await step('11. fenêtre de sortie mercredi-samedi 18h-20h (heure de Paris, été et hiver)', async () => {
  assert.equal(inRushWindow(new Date('2026-11-04T17:05:00Z')), true); // mer. 18h05 (hiver, UTC+1)
  assert.equal(inRushWindow(new Date('2026-11-04T19:05:00Z')), false); // mer. 20h05
  assert.equal(inRushWindow(new Date('2026-06-03T16:30:00Z')), true); // mer. 18h30 (été, UTC+2)
  assert.equal(inRushWindow(new Date('2026-06-03T15:30:00Z')), false); // mer. 17h30 (été)
  assert.equal(inRushWindow(new Date('2026-11-05T17:05:00Z')), true); // jeudi 18h05
  assert.equal(inRushWindow(new Date('2026-11-07T17:30:00Z')), true); // samedi 18h30
  assert.equal(inRushWindow(new Date('2026-11-08T17:30:00Z')), false); // dimanche
  assert.equal(inRushWindow(new Date('2026-11-03T17:30:00Z')), false); // mardi
});

console.log(`\n${passed} scénarios réussis.`);
server.close();
await rm(dir, { recursive: true, force: true });
