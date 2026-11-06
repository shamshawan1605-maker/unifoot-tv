// Partenaires et offres. Modifier seulement quand un partenaire ou une offre change.
// Logos : dépose-les dans /public/partenaires/ (SVG ou PNG transparent).

export interface Partner {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}

export const partners: Partner[] = [
  {
    name: 'Do Your Football',
    url: 'https://www.doyourfootball.com/',
    logo: '/partenaires/dyf.png',
    description: "L'application de suivi des joueurs et des séances pour les clubs. Code UNIFOOTTV : -20 %.",
  },
];

/**
 * Offres de partenariat. Les noms des formules sont ceux du dossier de sponsoring.
 * EXEMPLE : les contenus ci-dessous sont indicatifs, à remplacer par ceux du dossier (prix compris si tu veux les afficher).
 */
export const offersAreExample = true;

export const offers = [
  {
    name: 'Silver',
    pitch: 'Être vu par la communauté',
    items: ['Logo sur le site et les vidéos', 'Mention dans une émission par mois'],
  },
  {
    name: 'Gold',
    pitch: 'Être associé à une rubrique',
    items: ['Tout Silver', 'Parrainage d\'une rubrique de Kick in the Foot', 'Publications dédiées sur les réseaux'],
  },
  {
    name: 'Platine',
    pitch: 'Être présent toute la saison',
    items: ['Tout Gold', 'Présence plateau (visuel, produit)', 'Contenus vidéo co-construits'],
  },
  {
    name: 'Diamant',
    pitch: 'Devenir partenaire principal',
    items: ['Tout Platine', 'Nommage d\'un format', 'Opérations sur mesure avec la communauté'],
  },
];

export const mediaKitUrl: string | undefined = undefined; // ex. '/docs/media-kit-unifoot-tv.pdf'
