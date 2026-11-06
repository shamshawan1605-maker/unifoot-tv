// Informations générales du média. À modifier seulement si l'une d'elles change.

export const site = {
  name: 'UNIFOOT TV',
  tagline: 'Le média du football amateur',
  promise: 'On donne la parole à ceux qui font vivre le foot amateur.',
  description:
    "UNIFOOT TV, média indépendant du football amateur : Kick in the Foot du mercredi au samedi à 18h, interviews, formation, éducateurs, arbitrage, bénévoles et vie des clubs.",
  locale: 'fr_FR',
  lang: 'fr',
  email: 'contact@unifoottv.fr',
  /** Rendez-vous hebdomadaire (heure de Paris) */
  /** Jours de sortie (0 = dimanche … 3 = mercredi … 6 = samedi), heure de Paris */
  rendezVous: { weekdays: [3, 4, 5, 6], hour: 18, minute: 0, label: 'Du mercredi au samedi, 18h' },
  /** Image de partage par défaut (dans /public) */
  ogImage: '/brand/og-default.png',
  /**
   * Logo officiel (PNG transparent, lettres blanches pour fond sombre) : /public/brand/logo-240.png (+ versions 480 et WebP).
   * Pour le changer, remplace ces fichiers. Si src est vide, un logo texte de secours s'affiche.
   */
  logo: { src: '/brand/logo-240.png' as string, width: 116, height: 55 },
};

export const links = {
  youtube: 'https://www.youtube.com/UNIFOOTTV',
  youtubeSubscribe: 'https://www.youtube.com/UNIFOOTTV?sub_confirmation=1',
  spotify: 'https://open.spotify.com/show/0TfpGN1cjRLsQr9oqqAvX4',
  apple: 'https://podcasts.apple.com/fr/podcast/kick-in-the-foot/id1683438671',
  deezer: 'https://www.deezer.com/fr/show/5975407',
  amazon: 'https://music.amazon.com/podcasts/50de28f4-bb3d-408f-946c-12fde4f926bc/kick-in-the-foot',
  instagram: 'https://www.instagram.com/unifoottvofficiel/',
  tiktok: 'https://www.tiktok.com/@unifoottv',
  facebook: 'https://www.facebook.com/unifoottv/',
  x: 'https://twitter.com/unifoottv',
  linkedin: 'https://fr.linkedin.com/company/unifoot-tv',
  tipeee: 'https://fr.tipeee.com/unifoot-tv',
};

export const podcastPlatforms = [
  { name: 'Spotify', url: links.spotify },
  { name: 'Apple Podcasts', url: links.apple },
  { name: 'Deezer', url: links.deezer },
  { name: 'Amazon Music', url: links.amazon },
];

export const socials = [
  { name: 'YouTube', url: links.youtube, icon: 'youtube' },
  { name: 'Instagram', url: links.instagram, icon: 'instagram' },
  { name: 'TikTok', url: links.tiktok, icon: 'tiktok' },
  { name: 'Facebook', url: links.facebook, icon: 'facebook' },
  { name: 'X', url: links.x, icon: 'x' },
  { name: 'LinkedIn', url: links.linkedin, icon: 'linkedin' },
] as const;

/** Mentions légales. Les champs marqués A_COMPLETER s'affichent tels quels : remplace-les. */
export const legal = {
  company: 'UNIFOOT',
  form: 'SASU',
  capital: 'A_COMPLETER',
  siret: '978 722 023 00014',
  rcs: 'A_COMPLETER',
  vat: 'A_COMPLETER',
  address: '9 rue des Colonnes, 75002 Paris, France',
  publicationDirector: 'Khalid Shamsh Awan',
  host: {
    name: 'O2switch',
    address: '222-224 Boulevard Gustave Flaubert, 63000 Clermont-Ferrand, France',
    url: 'https://www.o2switch.fr',
  },
  updatedAt: '2026-11-06',
};
