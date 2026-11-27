# Veille actus du matin

La tâche planifiée « Tournée actus UNIFOOT » dépose ici chaque matin son tableau du jour :
`veille/AAAA-MM-JJ.md` (sujets classés, liens sources, photos, crédits, blocs JSON).

Ce dossier n'est pas publié sur le site et ne déclenche pas de mise en ligne.

## Photos des lecteurs (avant de générer une image IA)

Les clubs et photographes peuvent envoyer une photo via unifoottv.fr/participer/?type=photo.
Avant de générer une image Grok pour une actu, vérifier s'il existe une vraie photo du club :
- liste : `https://unifoottv.fr/api/photos.php?k=CLE` (la clé est dans `Bureau\Actus UNIFOOT\cle-photos-unifoot.txt` sur le PC, jamais dans ce dépôt) ;
- photo : `...&f=FICHIER` ; la marquer utilisée : `...&utilisee=FICHIER`.
Si une photo correspond, l'utiliser avec `credit: "Photo : <photographe>"` (et le crédit en bas du visuel des posts).

## Espace contributeur (unifoottv.fr/espace)

Administration avec la même clé (fichier sur le Bureau du PC) :
- ajouter un contributeur : `/api/espace.php?k=CLE&action=contributeur&email=…&nom=Nom%20Signature&part=0.3` (le `nom` doit être exactement le champ `auteur:` de ses articles) ;
- revenu du mois clôturé : `…&action=rpm&mois=AAAA-MM&rpm=2.40` (RPM « page » du mois dans AdSense > Rapports) ;
- paiement versé : `…&action=paiement&email=…&montant=12.50&note=décembre%202026` ;
- tout voir : `…&action=liste`.
