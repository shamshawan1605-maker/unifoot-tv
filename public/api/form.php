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
    'participer' => ['titre' => 'Participer', 'requis' => ['nom', 'email', 'message', 'consentement']],
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
if (!$email) repondre(false, 'Adresse e-mail invalide', 422);
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

// Newsletter : enregistrement dans un CSV
if ($nomForm === 'newsletter') {
    $fh = @fopen("$dataDir/newsletter.csv", 'a');
    if ($fh) { fputcsv($fh, [date('c'), $email]); fclose($fh); }
}

// E-mail
$libelles = ['type' => 'Demande', 'nom' => 'Nom', 'email' => 'E-mail', 'role' => 'Rôle', 'club' => 'Club / ville',
    'entreprise' => 'Entreprise', 'telephone' => 'Téléphone', 'formule' => 'Formule', 'lien' => 'Lien',
    'anonymat' => 'Citation à l’antenne', 'consentement' => 'Consentement', 'message' => 'Message'];
$corps = "Nouveau message depuis le site UNIFOOT TV ({$conf['titre']})\n\n";
foreach ($champs as $k => $v) {
    if ($k === 'message') continue;
    $corps .= ($libelles[$k] ?? ucfirst($k)) . " : $v\n";
}
if (isset($champs['message'])) $corps .= "\nMessage :\n{$champs['message']}\n";
$corps .= "\n---\nEnvoyé le " . date('d/m/Y à H:i') . " depuis " . ($_SERVER['HTTP_HOST'] ?? 'unifoottv.fr');

$sujetBrut = '[Site] ' . $conf['titre'] . (isset($champs['nom']) ? ' : ' . $champs['nom'] : '');
$sujet = '=?UTF-8?B?' . base64_encode(mb_substr($sujetBrut, 0, 150)) . '?=';
$entetes = implode("\r\n", [
    'From: UNIFOOT TV <' . EXPEDITEUR . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);
$ok = @mail(DESTINATAIRE, $sujet, $corps, $entetes, '-f' . EXPEDITEUR);
if (!$ok && $nomForm !== 'newsletter') repondre(false, 'Envoi impossible', 500);
repondre(true);
