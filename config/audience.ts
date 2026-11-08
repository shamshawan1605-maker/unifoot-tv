// Chiffres d'audience. Mis à jour automatiquement chaque jour depuis Metricool (scripts/update-audience.mjs).
// Ces chiffres sont affichés tels quels : n'y mets que des données vérifiées.

export const audienceUpdatedAt = '2026-11';

// Vues : Instagram + Facebook + YouTube sur les 30 derniers jours (Metricool, 7 nov. 2026)
export const audienceHighlights = [
  { value: '9,7 M', label: 'vues par mois sur nos réseaux' },
  { value: '217 K', label: 'abonnés sur nos réseaux' },
];

// Abonnés par réseau (source : Metricool, 7 nov. 2026)
export const audienceByNetwork = [
  { network: 'TikTok', value: '117 K' },
  { network: 'Facebook', value: '53 K' },
  { network: 'Instagram', value: '25 K' },
  { network: 'YouTube', value: '18 K' },
  { network: 'X', value: '3,3 K' },
  { network: 'LinkedIn', value: '1 K' },
];
