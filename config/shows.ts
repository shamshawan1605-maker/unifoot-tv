// Les émissions. Chaque vidéo est rangée dans l'émission dont elle fait partie de la playlist YouTube.
// Ajouter une émission = ajouter un bloc ici avec l'identifiant de sa playlist. Rien d'autre à faire.

export interface ShowConfig {
  slug: string;
  name: string;
  /** Accroche courte (cartes, balise title) */
  kicker: string;
  /** Présentation affichée sur la page de l'émission */
  intro: string;
  playlistIds: string[];
  /** Mots-clés de secours dans le titre si la vidéo n'est dans aucune playlist (insensible à la casse et aux accents) */
  titleMatches?: string[];
  /** Le podcast diffuse cette émission : on cherche l'épisode audio correspondant */
  hasPodcast?: boolean;
  schedule?: string;
  /** Ordre d'affichage */
  order: number;
}

export const shows: ShowConfig[] = [
  {
    slug: 'kick-in-the-foot',
    name: 'Kick in the Foot',
    kicker: "L'émission du foot amateur",
    intro:
      "Le rendez-vous de la semaine. Éducateurs, présidents, arbitres, joueurs et parents autour de la table pour parler franchement de ce qui se passe dans les clubs : actu, formation, débats et invités.",
    playlistIds: [
      'PL2RJrkbFf1HxuY01BYKrlAN5fsFAd3B0f', // KICK IN THE FOOT (ÉMISSION COMPLÈTE)
      'PLA4Ou4xJxSSg', // NOS ÉMISSIONS (SAISON 5)
      'PL2RJrkbFf1HwoCS60Jy1qA7Lsnf_Yv-Ot', // NOS ÉMISSIONS (SAISON 4)
      'PL2RJrkbFf1HyjwCBat59PaSPDghAR3FFR', // KICK IN THE FOOT SAISON 1
    ],
    titleMatches: ['kick in the foot', 'kitf', 'tour de l\'actu'],
    hasPodcast: true,
    schedule: 'Du mercredi au samedi à 18h',
    order: 1,
  },
  {
    slug: 'entre-2',
    name: 'Entre 2',
    kicker: "L'interview en tête-à-tête",
    intro:
      "Un invité, une conversation, sans détour. Entre 2 prend le temps d'écouter un parcours et une vision du football.",
    playlistIds: ['PL2RJrkbFf1HyAYoJuMypsDBILoTa0OR1n'], // L'ENTRE 2 INTERVIEW DES ACTEURS DU FOOT
    titleMatches: ["l'entre 2", 'entre 2'],
    hasPodcast: true,
    order: 2,
  },
  {
    slug: 'au-coeur-d-une-seance',
    name: "Au cœur d'une séance",
    kicker: 'Sur le terrain, avec les éducateurs',
    intro:
      "La caméra suit un entraînement de l'intérieur : la préparation, les consignes, les exercices et les échanges avec les joueurs.",
    playlistIds: ['PL2RJrkbFf1HwoYU4VTX1v93odpqBvWqid'], // AU COEUR D'UNE SEANCE
    titleMatches: ["au coeur d'une seance"],
    order: 3,
  },
  {
    slug: 'inside',
    name: 'Inside',
    kicker: 'À la rencontre des clubs du monde entier',
    intro: "On part à la rencontre de clubs, en France et à l'étranger, pour découvrir comment ils fonctionnent et ce qu'ils peuvent apprendre au foot amateur.",
    playlistIds: ['PL2RJrkbFf1HxR2EOon2s6i-jn88MZGtjk'], // INSIDE
    order: 4,
  },
];

/** Vidéos longues qui ne sont dans aucune playlist d'émission */
export const fallbackShow: ShowConfig = {
  slug: 'hors-serie',
  name: 'Hors-série',
  kicker: 'Interviews, reportages et formats spéciaux',
  intro: "Les vidéos qui sortent du cadre des émissions : interviews, reportages et formats ponctuels.",
  playlistIds: [],
  hasPodcast: true,
  order: 99,
};

export const allShows = [...shows, fallbackShow];
