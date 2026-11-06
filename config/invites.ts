// Les invités passés sur UNIFOOT TV (bandeau « Ils sont passés chez UNIFOOT TV » de l'accueil).
// Chaque invité renvoie vers son émission (identifiant de la vidéo YouTube).
// Photo portrait : mets un fichier dans public/invites/ (ex. public/invites/wilo-footix.webp, format vertical 3:4)
// et indique-le dans photo. Sans photo, c'est la photo de l'épisode (public/photos/) ou la miniature YouTube qui s'affiche.
// Le rôle reprend uniquement ce qui est dit dans le titre de l'émission.

export interface Invite {
  name: string;
  role?: string;
  video: string;
  photo?: string;
  /** Lien du clic (sinon : la page de l'émission sur le site) */
  link?: string;
}

export const invites: Invite[] = [
  { name: 'Wilo Footix', role: 'Arbitre et créateur de contenu', video: 'p9Acoe81iAE', photo: '/invites/wilo-footix.webp', link: 'https://www.youtube.com/watch?v=p9Acoe81iAE' },
  { name: 'Gauthier Diafutua', role: 'Ancien pro passé par Watford', video: 'Oun_cmc9KhY' },
  { name: 'Santiago Cucci', role: 'Président de l’Aviron Bayonnais FC', video: 'hsDgxLIhlmw' },
  { name: 'Sambou Tati', role: 'Président du Roissy FC', video: '5Eg9G9zh3XE', photo: '/invites/sambou-tati.webp' },
  { name: 'Emmanuel Dorado', role: 'Sainte-Geneviève FC', video: 'X4dpWkIbFJA', photo: '/invites/emmanuel-dorado.webp', link: 'https://www.youtube.com/watch?v=X4dpWkIbFJA&t=2777s' },
  { name: 'Boulaya', video: 'O5Zbz6sV52c', photo: '/invites/boulaya.webp', link: 'https://www.youtube.com/watch?v=O5Zbz6sV52c&t=26s' },
  { name: 'Romain', role: 'Bontaz Academy Coaching', video: 'v4QIAYF9hV4', photo: '/invites/romain-bontaz.webp', link: 'https://www.youtube.com/watch?v=v4QIAYF9hV4' },
  { name: 'Gessime Yassine', video: '5rjiPyLH4lU' },
  { name: 'Alexis Lefebvre', video: '6wa0xC6JVqI' },
  { name: 'Oussama Moueddene', role: 'Coach U17 National de Montrouge', video: 'lG51nKqw8Aw' },
  { name: 'Fabio Frasconi', role: 'U19 National', video: 'sUAM1QH1wFU', photo: '/invites/fabio-frasconi.webp' },
  { name: 'Baptiste Monveneur', video: 'J679xfI93t0' },
  { name: 'Kaou Diallo', role: 'Responsable préformation au PSG', video: 'h-J8Fzf5dUg', photo: '/invites/kaou-diallo.webp', link: 'https://www.youtube.com/watch?v=h-J8Fzf5dUg&t=8842s' },
  { name: 'Teddy Bartouche-Selbonne', role: 'Gardien en Ligue 2', video: 'VZCpLxeNmUE' },
  { name: 'Patrice Ribaton', role: 'Institut international Sadio Mané', video: 'HGKzHbZ3dVU' },
  { name: 'Hassan Baillon', role: 'Président de club', video: '8vg0jnjg3JE' },
  { name: 'Jasmine Cherchali', role: 'Football ghanéen', video: 'aN87fPkn5FA' },
  { name: 'Bakary Sylla', role: 'Coach U17 National de Montfermeil', video: 'v-D0tKlJeJ4' },
  { name: 'Rafik Masmoudi', role: 'Santé du sportif', video: 'LEnUyKq5yEg' },
  { name: 'Samy Guenfoud', role: 'FC Montreuil', video: 'ACqtc0FIJiY' },
  { name: 'Alexandre Lafitte', role: 'Entraîneur champion à 28 ans', video: 'aecg1tCuiCw' },
  { name: 'Siné', role: 'FC 93', video: '8fwOMO2Auko', photo: '/invites/sine-fc93.webp', link: 'https://www.youtube.com/watch?v=8fwOMO2Auko&t=6881s' },
  { name: 'Kevin', role: 'FC 93', video: '8fwOMO2Auko', photo: '/invites/kevin-fc93.webp', link: 'https://www.youtube.com/watch?v=8fwOMO2Auko&t=6881s' },
  { name: 'Mohamed Segueni', role: 'Agent FFF', video: 'TdWJqqwuCpU', photo: '/invites/mohamed-segueni.webp', link: 'https://www.youtube.com/watch?v=TdWJqqwuCpU&t=5606s' },
  { name: 'Hassoun Camara', role: 'CF Montréal', video: '9YIkfAuQaQ0' },
  { name: 'Ismaël Bamba', role: 'Du Paris FC à Villejuif', video: 'GHIhYpBtXKs', photo: '/invites/ismael-bamba.webp', link: 'https://www.youtube.com/watch?v=GHIhYpBtXKs&t=3481s' },
  { name: 'Yacoub Yassine', role: 'Entraîneur de l’US Chantilly', video: 'glIkdFI_Jdo', photo: '/invites/yacoub-yassine.webp', link: 'https://www.youtube.com/watch?v=glIkdFI_Jdo&t=578s' },
  { name: 'Chardel Makaya', role: 'Formé au Havre AC', video: 'glIkdFI_Jdo', photo: '/invites/chardel-makaya.webp', link: 'https://www.youtube.com/watch?v=glIkdFI_Jdo&t=578s' },
  { name: 'Marc Bascol-Munuera', video: 'Xg4dipLTXbo', photo: '/invites/marc-bascol-munuera.webp', link: 'https://www.youtube.com/watch?v=Xg4dipLTXbo&t=1s' },
  { name: 'Raymond Domenech', video: '08uQBnGleeU' },
  { name: 'Florentin Pogba', role: 'Footballeur professionnel', video: '4VV1qqZP0SA', photo: '/invites/florentin-pogba.webp', link: 'https://www.youtube.com/watch?v=4VV1qqZP0SA&t=5360s' },
  { name: 'Cyrille Dolce', role: 'Éducateur U15 de l’OL', video: 'baE7JyC3O3E', photo: '/invites/cyrille-dolce.webp', link: 'https://www.youtube.com/watch?v=baE7JyC3O3E&t=2235s' },
  { name: 'Nasser Larguet', role: 'Invité de L’Entre 2', video: '7OTcr_ng22o', photo: '/invites/nasser-larguet.webp', link: 'https://www.youtube.com/watch?v=7OTcr_ng22o&t=6s' },
  { name: 'Frédéric Advice-Desruisseaux', role: 'Ex-coach du Paris 13 Atletico (N2)', video: 'jfatOAWbNZ4', photo: '/invites/frederic-advice-desruisseaux.webp', link: 'https://www.youtube.com/watch?v=jfatOAWbNZ4&t=5874s' },
  { name: 'Angelo Michaud', role: 'Recruteur de l’En Avant Guingamp', video: 'RX7X2JazkpQ', photo: '/invites/angelo-michaud.webp', link: 'https://www.youtube.com/watch?v=RX7X2JazkpQ&t=1s' },
  { name: 'Samy Mandessi-Bell', role: 'Coach U17 National de Montrouge FC 92', video: 'TYzv5Ka2Wd8', photo: '/invites/samy-mandessi-bell.webp', link: 'https://www.youtube.com/watch?v=TYzv5Ka2Wd8&t=2024s' },
  { name: 'Eduardo Moreira', role: 'US Créteil Lusitanos', video: 'hXtk6iq_ZX4' },
  { name: 'Emmanuel Trégoat', video: 'ipWYwxavW8w' },
  { name: 'Himed Hamma', role: 'Entraîneur et recruteur du DFCO', video: '01NRbe6cioA' },
  { name: 'Yacine Hamened', video: 'rt8yqZUBwDI' },
];
