// Thèmes : attribués automatiquement à chaque vidéo à partir des mots-clés ci-dessous.
// La recherche porte sur le titre (poids fort), les tags et la description.
// Insensible à la casse et aux accents. Un mot-clé peut être une expression ("vie de club").
// Modifier une règle ici suffit : tout le site se met à jour à la synchronisation suivante.

export interface ThemeConfig {
  slug: string;
  name: string;
  /** Titre H1 de la page du thème */
  heading: string;
  /** Introduction de la page (texte éditorial du média) */
  intro: string;
  keywords: string[];
  /** Mots qui empêchent l'attribution (faux positifs) */
  exclude?: string[];
}

export const themes: ThemeConfig[] = [
  {
    slug: 'formation',
    name: 'Formation',
    heading: 'La formation des jeunes joueurs',
    intro:
      "Écoles de foot, préformation, centres de formation, détection, méthodes d'entraînement : comment on forme les joueurs dans le foot amateur, et ce qu'on pourrait faire mieux.",
    keywords: [
      'formation', 'formateur', 'centre de formation', 'preformation', 'ecole de foot', 'jeunes',
      'u7', 'u9', 'u11', 'u13', 'u15', 'u17', 'u19', 'academie', 'detection', 'recrutement',
      'methode', 'apprentissage', 'pole espoir', 'specifique',
    ],
  },
  {
    slug: 'educateurs',
    name: 'Éducateurs',
    heading: 'Éducateurs et entraîneurs',
    intro:
      "Le quotidien de ceux qui encadrent : diplômes, séances, gestion de groupe, reconnaissance et difficultés d'un rôle souvent bénévole.",
    keywords: [
      'educateur', 'educatrice', 'entraineur', 'coach', 'staff', 'seance', 'diplome', 'bmf', 'bef',
      'responsable technique', 'directeur technique', 'entrainement',
    ],
  },
  {
    slug: 'arbitrage',
    name: 'Arbitrage',
    heading: "L'arbitrage dans le foot amateur",
    intro:
      "Agressions, manque d'arbitres, formation, respect : la place de l'arbitre le week-end, racontée par ceux qui tiennent le sifflet.",
    keywords: ['arbitre', 'arbitrage', 'arbitrer', 'sifflet', 'carton rouge', 'var', 'penalty', 'hors-jeu'],
  },
  {
    slug: 'benevoles',
    name: 'Bénévoles',
    heading: 'Les bénévoles, moteur des clubs',
    intro:
      "Dirigeants, parents accompagnateurs, intendants, secrétaires : sans eux, pas de match le week-end. Leur engagement, leur fatigue et leurs idées.",
    keywords: ['benevole', 'benevolat', 'dirigeant', 'engagement', 'volontaire'],
  },
  {
    slug: 'parents',
    name: 'Parents',
    heading: 'Les parents et le foot de leurs enfants',
    intro:
      "Bord de terrain, pression, agents, rêves de carrière : la relation entre parents, joueurs et éducateurs, sans tabou.",
    keywords: ['parent', 'pere', 'mere', 'famille', 'fils', 'enfant', 'entourage', 'bord de terrain'],
  },
  {
    slug: 'vie-des-clubs',
    name: 'Vie des clubs',
    heading: 'La vie des clubs amateurs',
    intro:
      "Présidents, budgets, installations, licences, projets de club, district et ligue : ce qui fait tourner un club amateur, au-delà du terrain.",
    keywords: [
      'club', 'president', 'presidente', 'district', 'ligue', 'fff', 'licence', 'licencie', 'budget',
      'subvention', 'sponsor', 'installation', 'stade', 'terrain synthetique', 'projet de club',
      'national', 'r1', 'r2', 'r3', 'n2', 'n3', 'regional',
    ],
  },
];

/** Nombre minimum de points pour attribuer un thème (titre = 3 pts, tag = 2 pts, description = 1 pt) */
export const THEME_MIN_SCORE = 2;
/** Nombre maximum de thèmes par vidéo */
export const THEME_MAX_PER_VIDEO = 3;
