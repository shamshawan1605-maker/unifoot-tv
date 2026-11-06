// L'équipe. Modifier seulement quand l'équipe change.
// Photos : dépose les fichiers dans /public/equipe/ (JPG ou WebP, carré, 600 px minimum) et indique le chemin.
// Sans photo, une initiale s'affiche à la place.

export interface Member {
  name: string;
  /** Nom complet (affiché en petit sous le nom) */
  fullName?: string;
  role: string;
  /** 'fondateur' | 'chroniqueur' | 'production' */
  group: 'fondateur' | 'chroniqueur' | 'production';
  photo?: string;
  bio?: string;
  instagram?: string;
}

export const team: Member[] = [
  {
    name: 'Shamsh',
    fullName: 'Khalid Shamsh Awan',
    role: 'Fondateur, animateur et producteur',
    group: 'fondateur',
    photo: '/equipe/shamsh.webp',
    bio: "Ancien joueur et éducateur, il a créé UNIFOOT TV pour donner la parole aux acteurs du foot amateur. Il anime Kick in the Foot et réalise les émissions.",
  },
  // Chroniqueurs : liste à vérifier avant mise en ligne (ajoute photo et rôle exact).
  { name: 'Lass', role: 'Chroniqueur', group: 'chroniqueur' },
  { name: 'Alexis', role: 'Chroniqueur', group: 'chroniqueur' },
  { name: 'Soufiane', role: 'Chroniqueur', group: 'chroniqueur' },
  { name: 'Saïd', role: 'Chroniqueur', group: 'chroniqueur' },
  { name: 'François-Xavier', role: 'Chroniqueur', group: 'chroniqueur' },
  { name: 'Mathieu', role: 'Chroniqueur', group: 'chroniqueur' },
  { name: 'Habib Bellaïd', role: 'Chroniqueur', group: 'chroniqueur' },
];

/** Histoire du média (page L'équipe). Texte à relire et compléter. */
export const story: string[] = [
  "UNIFOOT TV est né d'un constat simple : le football amateur fait jouer des millions de personnes chaque week-end, mais on ne l'entend presque jamais. Ceux qui le font vivre ont des choses à dire.",
  "Chaque semaine, Kick in the Foot réunit autour de la table des éducateurs, des présidents, des arbitres, des joueurs et des parents. On y parle formation, arbitrage, bénévolat et vie des clubs, sans langue de bois.",
  "Le média est indépendant. Il vit grâce à sa communauté, à ses soutiens sur Tipeee et à des partenaires qui partagent ses valeurs.",
];
