// Redirections 301 depuis les anciennes URL du site WordPress (unifoottv.fr).
// Format : [ancienne URL, nouvelle URL]. Les jokers * et :splat sont ceux de Netlify.
export const legacyRedirects: [string, string][] = [
  ['/emissions/hors-serie/', '/emissions/kick-in-the-foot/'], // il n'y a plus de hors-série
  ['/kick-in-the-foot/', '/emissions/kick-in-the-foot/'],
  ['/kick-in-the-foot', '/emissions/kick-in-the-foot/'],
  ['/lequipe/', '/equipe/'],
  ['/lequipe', '/equipe/'],
  ['/la-boutique/', '/'],
  ['/la-boutique', '/'],
  ['/la-boutique/*', '/'],
  ['/boutique/*', '/'],
  ['/produit/*', '/'],
  ['/panier/*', '/'],
  ['/category/*', '/themes/'],
  ['/tag/*', '/themes/'],
  ['/author/*', '/equipe/'],
  // Anciens articles datés (/2024/06/26/titre/) : vers la rubrique Actualités
  ['/2021/*', '/actualites/'],
  ['/2022/*', '/actualites/'],
  ['/2023/*', '/actualites/'],
  ['/2024/*', '/actualites/'],
  ['/2025/*', '/actualites/'],
  ['/feed/*', '/'],
  ['/wp-admin/*', '/'],
  ['/wp-login.php', '/'],
  ['/mentions-legales-2/', '/mentions-legales/'],
  ['/politique-de-confidentialite/', '/confidentialite/'],
];
