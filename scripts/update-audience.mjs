// Met à jour config/audience.ts à partir de chiffres bruts (tirés de Metricool).
// Usage : node scripts/update-audience.mjs '{"date":"2026-11-06","views30d":9510678,"followers":{"TikTok":116742,"Facebook":53152,"Instagram":24817,"YouTube":17800,"X":3230,"LinkedIn":1008}}'
// Un réseau absent ou à 0 garde sa valeur précédente. Les vues ne baissent pas sous 1 M (garde-fou contre une donnée vide).
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../config/audience.ts', import.meta.url);
const input = JSON.parse(process.argv[2] || '{}');
const old = readFileSync(file, 'utf8');

const prev = {};
for (const m of old.matchAll(/\{ network: '([^']+)', value: '([^']+)' \}/g)) prev[m[1]] = m[2];
const prevViews = old.match(/\{ value: '([^']+)', label: 'vues par mois/)?.[1] ?? '9,5 M';

const fr = (n, d) => n.toFixed(d).replace('.', ',').replace(/,0$/, '');
const k = (n) => (n >= 1e6 ? `${fr(n / 1e6, 1)} M` : n >= 1e4 ? `${Math.round(n / 1e3)} K` : n >= 1e3 ? `${fr(n / 1e3, 1)} K` : String(n));
const order = ['TikTok', 'Facebook', 'Instagram', 'YouTube', 'X', 'LinkedIn'];
const parse = (v) => { const m = v.replace(',', '.').match(/([\d.]+)\s*([KM]?)/); return m ? Number(m[1]) * (m[2] === 'M' ? 1e6 : m[2] === 'K' ? 1e3 : 1) : 0; };

const nets = order.map((network) => {
  const raw = Number(input.followers?.[network]) || 0;
  return { network, n: raw > 0 ? raw : parse(prev[network] ?? '0'), value: raw > 0 ? k(raw) : prev[network] };
}).filter((x) => x.value);
nets.sort((a, b) => b.n - a.n);
const total = nets.reduce((s, x) => s + x.n, 0);
const views = Number(input.views30d) >= 1e6 ? k(Number(input.views30d)) : prevViews;
const date = input.date || new Date().toISOString().slice(0, 10);
const [y, mo, d] = date.split('-');
const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][Number(mo) - 1];

const out = `// Chiffres d'audience. Mis à jour automatiquement chaque jour depuis Metricool (scripts/update-audience.mjs).
// Ces chiffres sont affichés tels quels : n'y mets que des données vérifiées.

export const audienceUpdatedAt = '${y}-${mo}';

// Vues : Instagram + Facebook + YouTube sur les 30 derniers jours (Metricool, ${Number(d)} ${mois} ${y})
export const audienceHighlights = [
  { value: '${views}', label: 'vues par mois sur nos réseaux' },
  { value: '${k(total)}', label: 'abonnés sur nos réseaux' },
];

// Abonnés par réseau (source : Metricool, ${Number(d)} ${mois} ${y})
export const audienceByNetwork = [
${nets.map((x) => `  { network: '${x.network}', value: '${x.value}' },`).join('\n')}
];
`;
writeFileSync(file, out);
console.log(out === old ? 'Aucun changement' : 'audience.ts mis à jour');
console.log(`Vues ${views} · Abonnés ${k(total)} · ${nets.map((x) => `${x.network} ${x.value}`).join(' · ')}`);
