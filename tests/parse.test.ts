// Tests unitaires : chapitres, invités, thèmes, similarité de titres.
import assert from 'node:assert/strict';
import { parseChapters, detectGuest, assignThemes, isThin } from '../scripts/lib/enrich.ts';
import { titleSimilarity, parseIsoDuration, slugify } from '../scripts/lib/text.ts';

assert.deepEqual(parseChapters('Intro\n0:00 Début\n1:30 - Sujet\n1:02:03 Fin'), [
  { start: 0, label: 'Début' }, { start: 90, label: 'Sujet' }, { start: 3723, label: 'Fin' },
]);
assert.deepEqual(parseChapters('Début (00:00)\nSujet - 04:10\nDébat – 12:00'), [
  { start: 0, label: 'Début' }, { start: 250, label: 'Sujet' }, { start: 720, label: 'Débat' },
]);
assert.deepEqual(parseChapters('0:00 a\n1:00 b'), [], 'moins de 3 chapitres');
assert.deepEqual(parseChapters('0:10 a\n1:00 b\n2:00 c'), [], 'doit commencer à 0:00');

assert.equal(detectGuest("L'entre 2 avec Nasser Larguet", ''), 'Nasser Larguet');
assert.equal(detectGuest('Débat ft. Kaou Diallo', ''), 'Kaou Diallo');
assert.equal(detectGuest('Titre quelconque', 'Invité : Baptiste Monveneur\nblabla'), 'Baptiste Monveneur');
assert.equal(detectGuest("Méthode espagnole : pourquoi ? (Sylvain répond)", ''), undefined);
assert.equal(detectGuest("Un parent menace un éducateur bénévole (Le tour de l'actu)", ''), undefined);
assert.equal(detectGuest('Comment lancer un pôle foot adapté ? (L\'astuce du jour)', ''), undefined);
assert.equal(detectGuest('Kick In The Foot : épisode 12', ''), undefined);

assert.deepEqual(assignThemes("Agression d'un arbitre en U15", '', []).slice(0, 2).sort(), ['arbitrage', 'formation']);
assert.deepEqual(assignThemes('Recette de cuisine', 'rien à voir', []), []);
assert.ok(assignThemes('Les bénévoles du club', '', []).includes('benevoles'));

assert.equal(isThin('Lien https://x.y\n#foot', []), true);
assert.equal(parseIsoDuration('PT1H2M3S'), 3723);
assert.ok(titleSimilarity('Un parent menace un éducateur 😱', "UN PARENT MENACE UN EDUCATEUR (Le tour de l'actu)") > 0.5);
assert.equal(slugify("L'été à Saint-Étienne : c'est OK ?"), 'l-ete-a-saint-etienne-c-est-ok');
assert.equal(slugify("Au cœur d'une séance"), 'au-coeur-d-une-seance');
console.log('Analyse des métadonnées : tous les tests passent.');
