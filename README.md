# UNIFOOT TV : site du média

Site statique (Astro + TypeScript) hébergé sur Netlify. Les épisodes, les extraits et les liens podcast se mettent à jour seuls : une tâche GitHub Actions interroge YouTube et le flux du podcast toutes les heures, et toutes les 10 minutes du mercredi au samedi de 18h à 20h (heure de Paris). Quand quelque chose change, elle enregistre `data/content.json` et Netlify republie le site.

Configuration à faire **une seule fois**, en 30 minutes environ.

## 1. Clé API YouTube

1. Sur [console.cloud.google.com](https://console.cloud.google.com), crée un projet (par exemple « unifoot-site »).
2. Dans *API et services > Bibliothèque*, active **YouTube Data API v3**.
3. Dans *Identifiants*, crée une **clé API**, puis restreins-la à « YouTube Data API v3 ».

Le quota gratuit est de 10 000 unités par jour. La synchro en utilise moins de 1 000.

## 2. Dépôt GitHub

1. Crée un dépôt **privé** et envoies-y ce dossier (`git init`, `git add .`, `git commit`, `git push`).
2. *Settings > Actions > General > Workflow permissions* : coche **Read and write permissions**.
3. *Settings > Secrets and variables > Actions* :
   - onglet **Secrets** : `YOUTUBE_API_KEY` et, pour les alertes, `RESEND_API_KEY` ;
   - onglet **Variables** : `ALERT_EMAIL_TO` (adresse technique) et `ALERT_EMAIL_FROM` (expéditeur vérifié chez Resend). `YOUTUBE_CHANNEL_ID` et `PODCAST_RSS_URL` sont facultatifs.
4. Onglet *Actions* > **Synchronisation des contenus** > *Run workflow*, case « scan complet » cochée. Au bout d'une minute environ, `data/content.json` contient tout l'historique de la chaîne.

Alertes : crée un compte gratuit sur [resend.com](https://resend.com) et vérifie le domaine unifoottv.fr. Un e-mail part seulement après 3 échecs de suite, puis un autre quand la synchro repart. Sans Resend, le site marche quand même, il n'y a juste pas d'alerte.

## 3. Netlify

1. Sur [app.netlify.com](https://app.netlify.com) : *Add new site > Import an existing project*, puis choisis le dépôt. Les réglages sont lus dans `netlify.toml`, il n'y a rien à remplir.
2. *Forms* : clique sur **Enable form detection**, puis relance un déploiement. Dans *Forms > Form notifications*, ajoute une notification e-mail vers contact@unifoottv.fr pour les formulaires `participer`, `partenaires`, `contact` et `newsletter`.
3. *Domain management* : ajoute **unifoottv.fr** et suis les instructions DNS. Les anciennes adresses du site WordPress sont redirigées automatiquement (voir `config/redirects.ts`).

## 4. Publier une actualité

Chaque actu est un fichier dans `src/content/actualites/`. La rubrique Actualités, son lien dans le menu et le bloc de l'accueil s'affichent automatiquement dès la première actu publiée.

1. Sur GitHub, ouvre `src/content/actualites/_modele.md` et copie son contenu.
2. Dans le même dossier, clique sur *Add file > Create new file*. Donne-lui un nom de la forme `2026-11-06-titre-court.md` : ce nom devient l'adresse de la page.
3. Colle le modèle, remplis les champs et mets `brouillon: false`.
4. Photo (facultatif) : dépose-la dans `public/actualites/` (*Add file > Upload files*) et indique son chemin dans `image:`.
5. *Commit changes* : l'actu est en ligne 1 à 2 minutes plus tard.

## 5. Ce qui se modifie à la main (seulement si ça change)

| Fichier | Contenu |
|---|---|
| `config/site.ts` | liens, e-mail, mentions légales (remplace les `A_COMPLETER` : capital, RCS, TVA) |
| `config/shows.ts` | émissions et identifiants de leurs playlists YouTube |
| `config/themes.ts` | thèmes et mots-clés d'attribution automatique |
| `config/team.ts` | équipe et histoire (photos dans `public/equipe/`) |
| `config/partners.ts` | partenaires et formules (le détail des formules est un exemple à remplacer) |
| `config/audience.ts` | chiffres d'audience |
| `config/faq.ts` | FAQ (5 questions maximum) |
| `public/brand/` | logo et images de partage |

Toute modification poussée sur GitHub est mise en ligne par Netlify en 1 à 2 minutes.

## Commandes utiles

```bash
npm install
npm test                      # tests de la synchro (nouvelle vidéo, suppressions, pannes, alertes)
DEMO_CONTENT=1 npm run dev    # aperçu local avec des données de démonstration
npm run build                 # construction du site dans dist/
```

Mesure d'audience (facultatif) : renseigne `PUBLIC_ANALYTICS_SRC` dans Netlify. Le bandeau de consentement apparaît alors automatiquement. Ajoute aussi le domaine de l'outil à la ligne `script-src` de `public/_headers`.
