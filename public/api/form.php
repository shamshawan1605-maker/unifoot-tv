<?php
// Réception des formulaires du site (Participer, Partenaires, Contact, Newsletter).
// Envoie un e-mail à l'adresse de contact. Les inscriptions newsletter sont aussi enregistrées
// dans un fichier CSV non accessible depuis le web (dossier « data » protégé par .htaccess).
// Protections : champ piège, délai minimum de remplissage, limite d'envois par adresse IP, champs validés.

declare(strict_types=1);

const DESTINATAIRE = 'contact@unifoottv.fr';
const EXPEDITEUR = 'site@unifoottv.fr';
const DELAI_MIN_SECONDES = 3;
const MAX_ENVOIS_PAR_HEURE = 8;

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function repondre(bool $ok, string $message = '', int $code = 200): void {
    global $wantsJson;
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . ($ok ? '/merci/' : '/contact/?erreur=1'), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') repondre(false, 'Méthode non autorisée', 405);

// Robots : on fait semblant que tout va bien, sans rien envoyer
if (!empty($_POST['bot-field'])) repondre(true);
if (isset($_POST['_t']) && (int) $_POST['_t'] < DELAI_MIN_SECONDES) repondre(true);

$formulaires = [
    'participer' => ['titre' => 'Participer', 'requis' => ['type', 'consentement']],
    'partenaires' => ['titre' => 'Demande de partenariat', 'requis' => ['nom', 'entreprise', 'email', 'message', 'consentement']],
    'contact' => ['titre' => 'Contact', 'requis' => ['nom', 'email', 'message', 'consentement']],
    'newsletter' => ['titre' => 'Inscription newsletter', 'requis' => ['email', 'consentement']],
];
$nomForm = (string) ($_POST['form-name'] ?? '');
if (!isset($formulaires[$nomForm])) repondre(false, 'Formulaire inconnu', 400);
$conf = $formulaires[$nomForm];

// Nettoyage
$champs = [];
foreach ($_POST as $cle => $valeur) {
    if (in_array($cle, ['bot-field', 'form-name', '_t'], true) || !is_string($valeur)) continue;
    $cle = preg_replace('/[^a-z0-9_-]/i', '', (string) $cle);
    $champs[$cle] = trim(mb_substr(str_replace(["\r\n", "\r"], "\n", $valeur), 0, 5000));
}
foreach ($conf['requis'] as $r) {
    if (($champs[$r] ?? '') === '') repondre(false, "Champ manquant : $r", 422);
}
$email = filter_var($champs['email'] ?? '', FILTER_VALIDATE_EMAIL);
if ($nomForm === 'participer') {
    // Participer : un téléphone OU un e-mail suffit
    if (!$email && ($champs['telephone'] ?? '') === '') repondre(false, 'Laisse-nous un téléphone ou un e-mail', 422);
    if (($champs['email'] ?? '') !== '' && !$email) repondre(false, 'Adresse e-mail invalide', 422);
} elseif (!$email) {
    repondre(false, 'Adresse e-mail invalide', 422);
}
if (!empty($champs['lien']) && !filter_var($champs['lien'], FILTER_VALIDATE_URL)) repondre(false, 'Lien invalide', 422);

// Limite d'envois par IP (fichiers dans data/, hors web)
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0750, true);
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H'));
$compteur = "$dataDir/rate-$ipHash";
$n = is_file($compteur) ? (int) file_get_contents($compteur) : 0;
if ($n >= MAX_ENVOIS_PAR_HEURE) repondre(false, 'Trop d’envois, réessaie dans une heure', 429);
@file_put_contents($compteur, (string) ($n + 1));
foreach (glob("$dataDir/rate-*") ?: [] as $f) if (filemtime($f) < time() - 7200) @unlink($f);

// Candidature contributeur : enregistrée pour le mode admin de l'espace contributeur
if ($nomForm === 'participer' && ($champs['type'] ?? '') === 'contributeur') {
    if (!is_dir("$dataDir/candidatures")) @mkdir("$dataDir/candidatures", 0750, true);
    $cid = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $cand = $champs; unset($cand['consentement']);
    @file_put_contents("$dataDir/candidatures/$cid.json", json_encode(['id' => $cid, 'date' => date('c'), 'statut' => 'nouvelle'] + $cand, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// Newsletter : enregistrement dans un CSV
if ($nomForm === 'newsletter') {
    $fh = @fopen("$dataDir/newsletter.csv", 'a');
    if ($fh) { fputcsv($fh, [date('c'), $email, $champs['origine'] ?? '']); fclose($fh); }
}

// Vocal (Participer) : fichier audio joint à l'e-mail, 10 Mo maximum
$vocal = null;
if ($nomForm === 'participer' && isset($_FILES['vocal']) && is_array($_FILES['vocal']) && ($_FILES['vocal']['error'] ?? 1) === UPLOAD_ERR_OK) {
    $f = $_FILES['vocal'];
    $mime = function_exists('mime_content_type') ? (string) @mime_content_type($f['tmp_name']) : '';
    $okType = str_starts_with($mime, 'audio/') || str_starts_with($mime, 'video/') || $mime === 'application/octet-stream' || $mime === '';
    if ($f['size'] > 10 * 1024 * 1024) repondre(false, 'Vocal trop long (10 Mo maximum)', 413);
    if (!$okType) repondre(false, 'Format de vocal non reconnu', 415);
    $ext = preg_match('/\.(webm|ogg|m4a|mp4)$/i', (string) $f['name'], $m) ? strtolower($m[1]) : 'webm';
    $vocal = ['data' => (string) file_get_contents($f['tmp_name']), 'nom' => 'vocal-' . date('Ymd-His') . '.' . $ext, 'type' => ($ext === 'm4a' || $ext === 'mp4') ? 'audio/mp4' : ($ext === 'ogg' ? 'audio/ogg' : 'audio/webm')];
}

// Photo (Participer) : image jointe à l'e-mail et rangée dans data/photos (lue par photos.php), 10 Mo maximum
$photo = null;
if ($nomForm === 'participer' && ($champs['type'] ?? '') === 'photo') {
    $f = $_FILES['photo'] ?? null;
    if (!is_array($f) || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) repondre(false, 'Photo manquante', 422);
    if ($f['size'] > 10 * 1024 * 1024) repondre(false, 'Photo trop lourde (10 Mo maximum)', 413);
    $mime = function_exists('mime_content_type') ? (string) @mime_content_type($f['tmp_name']) : '';
    $exts = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/heic' => 'heic', 'image/heif' => 'heic'];
    if (!isset($exts[$mime])) repondre(false, 'Format de photo non reconnu (JPG, PNG ou HEIC)', 415);
    if (($champs['accord_photo'] ?? '') !== 'oui' || ($champs['photographe'] ?? '') === '') repondre(false, 'Crédit et accord du photographe obligatoires', 422);
    $photoDir = "$dataDir/photos";
    if (!is_dir($photoDir)) @mkdir($photoDir, 0750, true);
    $base = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $nomPhoto = "$base.{$exts[$mime]}";
    @copy($f['tmp_name'], "$photoDir/$nomPhoto");
    $meta = ['fichier' => $nomPhoto, 'recu' => date('c'), 'club' => $champs['club'] ?? '', 'niveau' => $champs['niveau'] ?? '',
        'contexte' => $champs['sujet'] ?? '', 'photographe' => $champs['photographe'] ?? '', 'nom' => $champs['nom'] ?? '',
        'email' => $email ?: '', 'telephone' => $champs['telephone'] ?? '', 'utilisee' => false];
    @file_put_contents("$photoDir/$base.json", json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    $photo = ['data' => (string) file_get_contents($f['tmp_name']), 'nom' => $nomPhoto, 'type' => $mime];
}
$piece = $vocal ?? $photo;

// E-mail
$typesParticiper = ['sujet' => 'Proposition de sujet', 'temoignage' => 'Témoignage', 'topbut' => 'Top but', 'invite' => 'Proposition d’invité', 'chroniqueur' => 'Candidature chroniqueur', 'photo' => 'Photo pour les actus', 'contributeur' => 'Candidature contributeur'];
if ($nomForm === 'participer' && isset($typesParticiper[$champs['type'] ?? ''])) $conf['titre'] = $typesParticiper[$champs['type']];
$libelles = ['type' => 'Demande', 'sujet' => 'Sujet', 'concerne' => 'Concerne', 'participation' => 'Participation', 'categorie' => 'Catégorie',
    'niveau' => 'Niveau', 'adversaire' => 'Adversaire', 'date_match' => 'Date du match', 'accord_diffusion' => 'Accord de diffusion',
    'propose' => 'Propose', 'invite_contact' => 'Contact de l’invité', 'profil' => 'Profil', 'anonyme' => 'Anonyme à l’antenne', 'ville' => 'Ville', 'nom' => 'Nom', 'email' => 'E-mail', 'role' => 'Rôle', 'club' => 'Club / ville',
    'entreprise' => 'Entreprise', 'telephone' => 'Téléphone', 'formule' => 'Formule', 'lien' => 'Lien',
    'anonymat' => 'Citation à l’antenne', 'photographe' => 'Crédit photo', 'region' => 'Région', 'accord_charte' => 'Accord avec les règles des contributeurs', 'accord_photo' => 'Accord du photographe et des personnes visibles', 'disponibilite' => 'Disponibilité', 'accord_paris' => 'Accord tournage à Paris (frais à sa charge)', 'consentement' => 'Consentement', 'message' => 'Message'];
$corps = "Nouveau message depuis le site UNIFOOT TV ({$conf['titre']})\n\n";
foreach ($champs as $k => $v) {
    if ($k === 'message') continue;
    $corps .= ($libelles[$k] ?? ucfirst($k)) . " : $v\n";
}
if (isset($champs['message'])) $corps .= "\nMessage :\n{$champs['message']}\n";
if ($vocal) $corps .= "\n🎤 Un vocal est joint à cet e-mail.\n";
if ($photo) $corps .= "\n📸 La photo est jointe à cet e-mail.\n";
$corps .= "\n---\nEnvoyé le " . date('d/m/Y à H:i') . " depuis " . ($_SERVER['HTTP_HOST'] ?? 'unifoottv.fr');

$sujetBrut = '[Site] ' . $conf['titre'] . (($champs['nom'] ?? '') !== '' ? ' : ' . $champs['nom'] : '') . ($vocal ? ' 🎤' : '') . ($photo ? ' 📸' : '');
$sujet = '=?UTF-8?B?' . base64_encode(mb_substr($sujetBrut, 0, 150)) . '?=';
$base = ['From: UNIFOOT TV <' . EXPEDITEUR . '>', 'MIME-Version: 1.0'];
if ($email) $base[] = 'Reply-To: ' . $email;
if ($piece) {
    $limite = 'uf' . bin2hex(random_bytes(8));
    $entetes = implode("\r\n", [...$base, "Content-Type: multipart/mixed; boundary=\"$limite\""]);
    $corpsMail = "--$limite\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$corps\r\n"
        . "--$limite\r\nContent-Type: {$piece['type']}; name=\"{$piece['nom']}\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$piece['nom']}\"\r\n\r\n"
        . chunk_split(base64_encode($piece['data'])) . "--$limite--\r\n";
} else {
    $entetes = implode("\r\n", [...$base, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit']);
    $corpsMail = $corps;
}
$ok = @mail(DESTINATAIRE, $sujet, $corpsMail, $entetes, '-f' . EXPEDITEUR);

// Accusé de réception pour la personne qui participe (si elle a laissé un e-mail)
if ($ok && $nomForm === 'participer' && $email) {
    $prenom = ($champs['nom'] ?? '') !== '' ? ' ' . $champs['nom'] : '';
    $merci = "Salut$prenom,\n\nMerci, on a bien reçu ta demande (" . mb_strtolower($conf['titre']) . ") pour Kick in the Foot.\n\n"
        . "On lit toutes les propositions chaque semaine. Si la tienne est retenue, on te recontacte sous 7 jours.\n\n"
        . "En attendant, retrouve l'émission du mercredi au samedi à 18h sur YouTube : https://www.youtube.com/@UNIFOOTTV\n\nL'équipe UNIFOOT TV\nhttps://unifoottv.fr";
    @mail($email, '=?UTF-8?B?' . base64_encode('UNIFOOT TV : on a bien reçu ta demande') . '?=', $merci,
        implode("\r\n", ['From: UNIFOOT TV <' . EXPEDITEUR . '>', 'Reply-To: ' . DESTINATAIRE, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit']),
        '-f' . EXPEDITEUR);
}
if (!$ok && $nomForm !== 'newsletter') repondre(false, 'Envoi impossible', 500);
repondre(true);
