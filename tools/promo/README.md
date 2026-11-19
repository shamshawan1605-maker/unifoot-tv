# Promo des épisodes Kick in the Foot (modèles)

Scripts Python (Pillow + numpy) des visuels validés par Shamsh. Ils ont été écrits avec des chemins
de travail codés en dur (variable `S` = dossier de travail, polices dans `S/fnt`, logos dans `S/promo`) :
avant usage, copier `fnt/` et `assets/` dans le dossier de travail et adapter `S`, les chemins des photos
et les textes (invité, club, fonction, titres).

- `invite3.py` : affiche « L'invité de la semaine » (4:5). Args : photo x0 hauteur_crop y0 sortie.
- `story_yt.py` : story « Ce soir 18h » (fond flouté, boîtes noires, carte YouTube, rectangle lien).
- `story_live.py` : story « C'est en ligne » (même modèle, badge NOUVEAU, rectangle « REGARDER L'ÉPISODE »).
- `recap.py` : carrousel récap « La semaine avec … » (couverture photo + une slide par période avec vignette).
- `teaser2.py` / teaser : montage ffmpeg 9:16, en-tête compact, vidéo 1080x950 à y=270,
  sous-titres verts Inter ExtraBold 64 (#4FFFBE) à y=1236, rectangle lien à y≈1420, fin « LA RÉPONSE / CE SOIR 18H !! »
  en boîtes noires. Fondus audio 0,08 s par coupe.
- `exemples/` : rendus validés.

Couleurs : teal (34,195,211), vert sous-titres #4FFFBE. Police : Inter (fnt/).
