// Jeu de données de test / démonstration.
// Les titres d'épisodes proviennent du flux podcast public ; identifiants, descriptions, durées et Shorts sont FICTIFS.
import type { MockState, MockVideo } from './mock-server.ts';

export const CHANNEL_ID = 'UCdemoUnifootTv000000000';
export const PL_KITF = 'PL2RJrkbFf1HxuY01BYKrlAN5fsFAd3B0f';
export const PL_ENTRE2 = 'PL2RJrkbFf1HyAYoJuMypsDBILoTa0OR1n';
export const PL_SEANCE = 'PL2RJrkbFf1HwoYU4VTX1v93odpqBvWqid';

const kitfDesc = (topic: string) => `[Démo] Description d'exemple. Cette semaine dans Kick in the Foot, on parle de ${topic}. Éducateurs, présidents et joueurs du foot amateur réagissent et débattent autour de la table.

Pour participer à l'émission : https://unifoottv.fr/participer/

00:00 Introduction
02:15 Le sujet de la semaine
14:40 Le débat
31:05 Vos questions
44:20 Le mot de la fin

#footamateur #football`;

const shortDesc = '[Démo] Extrait de Kick in the Foot. #shorts #footamateur';

export function demoVideos(): MockVideo[] {
  const v = (id: string, title: string, date: string, duration: string, description: string, extra: Partial<MockVideo> = {}): MockVideo => ({
    id, title, publishedAt: `${date}T16:00:00Z`, duration, description, ...extra,
  });
  return [
    v('demoKITF006', 'Wilo Footix : arbitre à 16 ans, 950 000 abonnés, les coulisses de Ground et du format VS', '2026-10-24', 'PT52M10S', kitfDesc("l'arbitrage chez les jeunes et des réseaux sociaux"), { tags: ['arbitre', 'arbitrage'] }),
    v('demoKITF005', 'Comment lancer un pôle foot adapté dans ton club amateur ? (L\'astuce du jour)', '2026-10-24', 'PT8M40S', "[Démo] Description d'exemple. Les étapes pour créer une section de foot adapté dans un club amateur : encadrement, licences, accueil des familles et partenaires.", { tags: ['club'] }),
    v('demoKITF004', "Qui mérite vraiment le Ballon d'Or ? Débat VS avec Wilo Footix !", '2026-10-22', 'PT21M30S', "[Démo] Description d'exemple. Débat sans filtre sur le Ballon d'Or."),
    v('demoENT0004', 'Ancien pro passé par Watford, il ramène des joueurs amateurs vers le pro : Gauthier Diafutua', '2026-10-18', 'PT38M05S', "[Démo] Description d'exemple. Invité : Gauthier Diafutua\nSon parcours d'ancien joueur professionnel et son travail de détection de joueurs amateurs, du recrutement à l'accompagnement vers les centres de formation.", { tags: ['recrutement', 'formation'] }),
    v('demoKITF003', 'Éducateurs abandonnés ? Les responsables techniques sont-ils en cause ?', '2026-10-16', 'PT47M50S', kitfDesc('la place des éducateurs dans les clubs et du rôle des responsables techniques')),
    v('demoKITF002', "Un parent menace un éducateur bénévole de 21 ans (Le tour de l'actu)", '2026-10-15', 'PT32M00S', kitfDesc("l'actu de la semaine : un éducateur bénévole menacé par un parent")),
    v('demoENT0003', 'Santiago Cucci, Président Aviron Bayonnais FC, ex-OL : rachat Girondins raté, business vs foot.', '2026-10-10', 'PT55M12S', "[Démo] Description d'exemple. Le président de l'Aviron Bayonnais FC raconte son parcours, le projet de rachat des Girondins et sa vision du business dans le football de National et des clubs régionaux."),
    v('demoKITF001', 'Méthode espagnole : pourquoi certains éducateurs pensent la faire déjà ? (Sylvain répond)', '2026-10-09', 'PT18M25S', kitfDesc("la méthode espagnole de formation et de ce qu'elle change pour les éducateurs")),
    v('demoKITF000', "Cours particuliers à l'école : normal. Spécifique foot en dehors du club : mal vu. Est-ce juste ?", '2026-10-08', 'PT26M45S', kitfDesc("l'entraînement spécifique en dehors du club et de la formation des jeunes")),
    v('demoENT0002', 'Il a dit non à une offre à 6 chiffres pour son fils 😱 ( Sambou Tati, président du Roissy FC)', '2026-10-03', 'PT41M30S', "[Démo] Description d'exemple. Un père et président de club raconte comment il a refusé une offre pour son fils, et pourquoi le projet sportif passe avant l'argent pour les parents."),
    v('7OTcr_ng22o', "L'entre 2 avec Nasser Larguet", '2026-09-20', 'PT49M00S', "[Démo] Description d'exemple. Un entretien en tête-à-tête sur la formation des jeunes joueurs, les centres de formation et le rôle des éducateurs dans le développement des talents."),
    v('demoSEA0001', "Au cœur d'une séance : les U11 travaillent la conservation", '2026-09-14', 'PT14M10S', "[Démo] Description d'exemple. Une séance U11 filmée de l'intérieur : échauffement, jeu réduit de conservation, consignes de l'éducateur et retour au calme."),
    v('demoHS00001', 'Rencontre avec les bénévoles du tournoi de Pâques', '2026-09-02', 'PT11M00S', '[Démo] Bénévoles.'),
    // Shorts
    ...[
      ['demoSHT0010', '« Les parents doivent rester des parents »', '2026-10-25', 'PT58S'],
      ['demoSHT0009', "L'arbitre de 16 ans qui a 950 000 abonnés", '2026-10-24', 'PT45S'],
      ['demoSHT0008', 'Un éducateur bénévole menacé : le débat', '2026-10-17', 'PT1M42S'],
      ['demoSHT0007', 'Responsable technique : un rôle mal compris ?', '2026-10-16', 'PT1M10S'],
      ['demoSHT0006', 'Refuser une offre pour son fils', '2026-10-04', 'PT2M05S'],
      ['demoSHT0005', 'La méthode espagnole en 1 minute', '2026-10-10', 'PT1M00S'],
      ['demoSHT0004', 'Le président qui voulait racheter les Girondins', '2026-10-11', 'PT1M30S'],
      ['demoSHT0003', 'Pourquoi les clubs manquent de bénévoles', '2026-09-28', 'PT55S'],
    ].map(([id, title, date, dur]) => v(id, title, date, dur, shortDesc, { short: true })),
  ];
}

export function demoState(): MockState {
  return {
    channelId: CHANNEL_ID,
    videos: demoVideos(),
    playlists: {
      [PL_KITF]: ['demoKITF006', 'demoKITF005', 'demoKITF004', 'demoKITF003', 'demoKITF002', 'demoKITF001', 'demoKITF000'],
      [PL_ENTRE2]: ['demoENT0004', 'demoENT0003', 'demoENT0002', '7OTcr_ng22o'],
      [PL_SEANCE]: ['demoSEA0001'],
    },
    podcast: [
      { title: 'Wilo Footix : arbitre à 16 ans, 950 000 abonnés, les coulisses de Ground et du format VS', pubDate: '2026-10-24T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/wilo', audio: 'https://example.com/audio/wilo.mp3', duration: '52:10' },
      { title: "Comment lancer un pôle foot adapté dans ton club amateur ? (L'astuce du jour)", pubDate: '2026-10-24T18:30:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/pole', audio: 'https://example.com/audio/pole.mp3', duration: '08:40' },
      { title: "Qui mérite vraiment le Ballon d'Or ? Débat VS avec Wilo Footix !", pubDate: '2026-10-22T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/bo', audio: 'https://example.com/audio/bo.mp3', duration: '21:30' },
      { title: 'Ancien pro passé par Watford, il ramène des joueurs amateurs vers le pro : Gauthier Diafutua', pubDate: '2026-10-18T09:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/gd', audio: 'https://example.com/audio/gd.mp3', duration: '38:05' },
      { title: 'Éducateurs abandonnés ? Les responsables techniques sont-ils en cause ?', pubDate: '2026-10-16T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/edu', audio: 'https://example.com/audio/edu.mp3', duration: '47:50' },
      { title: "Un parent menace un éducateur bénévole de 21 ans (Le tour de l'actu)", pubDate: '2026-10-15T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/actu', audio: 'https://example.com/audio/actu.mp3', duration: '32:00' },
      { title: 'Santiago Cucci, Président Aviron Bayonnais FC, ex-OL : rachat Girondins raté, business vs foot.', pubDate: '2026-10-10T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/cucci', audio: 'https://example.com/audio/cucci.mp3', duration: '55:12' },
      { title: 'Méthode espagnole : pourquoi certains éducateurs pensent la faire déjà ? (Sylvain répond)', pubDate: '2026-10-09T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/esp', audio: 'https://example.com/audio/esp.mp3', duration: '18:25' },
      { title: "Cours particuliers à l'école : normal. Spécifique foot en dehors du club : mal vu. Est-ce juste ?", pubDate: '2026-10-08T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/cours', audio: 'https://example.com/audio/cours.mp3', duration: '26:45' },
      { title: 'Il a dit non à une offre à 6 chiffres pour son fils 😱 ( Sambou Tati, président du Roissy FC)', pubDate: '2026-10-03T18:00:00Z', link: 'https://creators.spotify.com/pod/demo/episodes/tati', audio: 'https://example.com/audio/tati.mp3', duration: '41:30' },
    ],
    fail: 'none',
    requests: [],
    emails: [],
  };
}
