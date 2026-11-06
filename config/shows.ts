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
    playlistIds: ['PL2RJrkbFf1Hy3MptZKDzQCg2pZDP-eZn-'],
    titleMatches: ['kick in the foot', 'tour de l\'actu'],
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
    playlistIds: ['PL2RJrkbFf1HyAYoJuMypsDBILoTa0OR1n'],
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
    playlistIds: ['PL2RJrkbFf1HwoYU4VTX1v93odpqBvWqid'],
    titleMatches: ["au coeur d'une seance"],
    order: 3,
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
