// Emplacements partenaires vendus directement à des marques du foot.
// Pour vendre un emplacement : remplace `null` par un partenaire. Pour le libérer : remets `null`.
// Un emplacement libre affiche automatiquement une annonce maison (« Devenir partenaire » ou Tipeee) : jamais vide.
// Logos : dépose-les dans /public/partenaires/ (PNG ou SVG, fond transparent).

export interface Sponsor {
  nom: string;
  /** Phrase courte (60 caractères max conseillé) */
  texte: string;
  lien: string;
  logo?: string;
  /** Texte du bouton */
  bouton?: string;
}

export const placements: {
  /** Bandeau sur la page d'accueil, entre « À ne pas manquer » et « Les plus regardées » */
  accueil: Sponsor | null;
  /** « Présenté par » en tête de chaque émission (clé = identifiant de l'émission) */
  emissions: Record<string, Sponsor | null>;
  /** Partenaire d'un thème (clé = identifiant du thème) */
  themes: Record<string, Sponsor | null>;
  /** Encart dans les actus et sur les pages d'épisodes */
  contenus: Sponsor | null;
} = {
  accueil: {
    nom: 'Do Your Football',
    texte: "L'application de suivi des joueurs et des séances pour les clubs.",
    lien: 'https://www.doyourfootball.com/',
    bouton: 'Découvrir DYF',
  },
  emissions: {
    'kick-in-the-foot': null,
    'entre-2': null,
    'au-coeur-d-une-seance': null,
  },
  themes: {
    formation: null,
    educateurs: null,
    arbitrage: null,
    benevoles: null,
    parents: null,
    'vie-des-clubs': null,
  },
  contenus: {
    nom: 'Do Your Football',
    texte: "L'application de suivi des joueurs et des séances pour les clubs.",
    lien: 'https://www.doyourfootball.com/',
    bouton: 'Découvrir DYF',
  },
};

/** Catégories refusées, pour mémoire (aucune pub automatique n'est diffusée sur le site) */
export const categoriesRefusees = ['Paris sportifs et jeux d’argent', 'Alcool', 'Annonces sans lien avec le sport'];
