<?php
// Espace contributeur : connexion par lien e-mail (sans mot de passe), statistiques et part des revenus.
//
// Données (dossier data/, inaccessible depuis le web) :
//   contributeurs.json  {"email": {"nom": "Léa Martin", "part": 0.3, "depuis": "2026-12-01"}}
//   rpm.json            {"2026-12": 2.40}   revenu pub réel (€) pour 1 000 vues, par mois, relevé dans AdSense
//   paiements.json      {"email": [{"date": "2027-01-21", "montant": 12.5, "note": "décembre 2026"}]}
//   vues/<slug>.json    écrit par vue.php
// Articles : /espace/articles.json (généré à la construction du site : slug, titre, date, auteur)
//
// Lecteur :  POST action=lien (email) · GET action=entrer&t=… · GET action=moi · POST action=sortir
// Articles écrits dans l'espace : soumissions/<id>.json (+ dossier soumissions/<id>/ pour les photos)
//   statut : brouillon → envoye → en_relecture → a_corriger | publie | refuse
// Contributeur : GET mes_articles · POST enregistrer · POST photo · POST photo_suppr · POST envoyer · POST supprimer · GET photo_voir
// Admin (?k=CLE) : action=liste · contributeur&email&nom&part · rpm&mois&rpm · paiement&email&montant&note
//                  · moi&as=EMAIL (voir l'espace d'un contributeur) · soumissions · statut&id&statut&retour&lien
declare(strict_types=1);

const CLE_SHA256 = '6771ba6946327b9fc9fe04498d7a5ac0e0265123a1d3fceb6c4042d95ff4a8f7';
const EXPEDITEUR = 'site@unifoottv.fr';
const SITE = 'https://unifoottv.fr';
const DUREE_LIEN = 1800;          // 30 minutes
const DUREE_SESSION = 2592000;    // 30 jours
const DESTINATAIRE = 'contact@unifoottv.fr';
const STATUTS = ['brouillon', 'envoye', 'en_relecture', 'a_corriger', 'publie', 'refuse'];
const MAX_PHOTOS = 5;
const PHOTO_MAX_OCTETS = 12 * 1024 * 1024;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$data = __DIR__ . '/data';
foreach (['', '/jetons', '/sessions', '/soumissions'] as $s) if (!is_dir("$data$s")) @mkdir("$data$s", 0750, true);

function sortie(array $r, int $code = 200): void { http_response_code($code); echo json_encode($r, JSON_UNESCAPED_UNICODE); exit; }
function lire(string $f, array $defaut = []): array { return is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: $defaut) : $defaut; }
function ecrire(string $f, array $d): void { file_put_contents($f, json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX); }
function slugNom(string $s): string {
    $s = mb_strtolower(trim($s));
    $s = strtr($s, ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c']);
    return trim((string) preg_replace('/[^a-z0-9]+/', '-', $s), '-');
}
function articles(): array {
    foreach ([($_SERVER['DOCUMENT_ROOT'] ?? '') . '/espace/articles.json', __DIR__ . '/../espace/articles.json'] as $f) if (is_file($f)) return lire($f);
    return [];
}


function envoyerMail(string $a, string $sujet, string $corps): void {
    @mail($a, '=?UTF-8?B?' . base64_encode($sujet) . '?=', $corps,
        implode("\r\n", ['From: UNIFOOT TV <' . EXPEDITEUR . '>', 'Reply-To: ' . DESTINATAIRE, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit']), '-f' . EXPEDITEUR);
}
function idValide(string $id): bool { return (bool) preg_match('/^[a-z0-9]{16}$/', $id); }
function soumission(string $id): array { global $data; return idValide($id) ? lire("$data/soumissions/$id.json") : []; }
function sauverSoumission(array &$s): void { global $data; $s['maj'] = date('c'); ecrire("$data/soumissions/{$s['id']}.json", $s); }
/** Toutes les soumissions (d'un contributeur si $email), les plus récentes d'abord */
function soumissions(?string $email = null): array {
    global $data;
    $l = [];
    foreach (glob("$data/soumissions/*.json") ?: [] as $f) { $x = lire($f); if ($x && ($email === null || $x['email'] === $email)) $l[] = $x; }
    usort($l, fn($a, $b) => strcmp((string) $b['maj'], (string) $a['maj']));
    return $l;
}
function texteChamp(string $k, int $max): string { return mb_substr(trim(str_replace("\r", '', (string) ($_POST[$k] ?? ''))), 0, $max); }
function nbMots(string $t): int { return count(preg_split('/\s+/u', trim($t), -1, PREG_SPLIT_NO_EMPTY) ?: []); }

/** Statistiques d'un contributeur : vues par article, revenus estimés mois par mois, sa part */
function stats(string $email, array $c): array {
    global $data;
    $rpm = lire("$data/rpm.json");
    $moi = slugNom($c['nom']);
    $part = (float) ($c['part'] ?? 0.3);
    $moisCourant = date('Y-m');
    $liste = [];
    $tot = ['vues' => 0, 'vues_mois' => 0, 'revenus' => 0.0, 'part' => 0.0, 'vues_en_attente' => 0];
    foreach (articles() as $a) {
        if (slugNom((string) ($a['auteur'] ?? '')) !== $moi) continue;
        $v = lire("$data/vues/" . basename((string) $a['slug']) . '.json', ['total' => 0, 'jours' => []]);
        $parMois = [];
        foreach (($v['jours'] ?? []) as $jour => $n) { $m = substr((string) $jour, 0, 7); $parMois[$m] = ($parMois[$m] ?? 0) + (int) $n; }
        $revenus = 0.0; $attente = 0;
        foreach ($parMois as $m => $n) {
            if (isset($rpm[$m])) $revenus += $n * (float) $rpm[$m] / 1000; else $attente += $n;
        }
        $ligne = ['slug' => $a['slug'], 'titre' => $a['titre'], 'date' => $a['date'], 'vues' => (int) ($v['total'] ?? 0),
            'vues_mois' => (int) ($parMois[$moisCourant] ?? 0), 'revenus' => round($revenus, 2), 'part' => round($revenus * $part, 2), 'vues_en_attente' => $attente];
        $liste[] = $ligne;
        foreach (['vues', 'vues_mois', 'vues_en_attente'] as $k) $tot[$k] += $ligne[$k];
        $tot['revenus'] += $revenus; $tot['part'] += $revenus * $part;
    }
    usort($liste, fn($x, $y) => strcmp((string) $y['date'], (string) $x['date']));
    $paiements = lire("$data/paiements.json")[$email] ?? [];
    $verse = array_sum(array_map(fn($p) => (float) $p['montant'], $paiements));
    $tot['revenus'] = round($tot['revenus'], 2); $tot['part'] = round($tot['part'], 2);
    return ['nom' => $c['nom'], 'part_pourcent' => (int) round($part * 100), 'articles' => $liste, 'totaux' => $tot,
        'verse' => round($verse, 2), 'solde' => round(max(0, $tot['part'] - $verse), 2), 'paiements' => $paiements, 'seuil' => 50,
        'rpm_dernier' => $rpm ? ['mois' => array_key_last($rpm), 'rpm' => end($rpm)] : null];
}

$action = (string) ($_REQUEST['action'] ?? '');
$contributeurs = lire("$data/contributeurs.json");

// ===== Administration (clé) =====
$cle = (string) ($_GET['k'] ?? ($_POST['k'] ?? ''));
$admin = $cle !== '' && hash_equals(CLE_SHA256, hash('sha256', $cle));
if ($cle !== '' && !$admin) sortie(['ok' => false], 403);
if ($admin && $action === 'moi') {
    $e = strtolower(trim((string) ($_GET['as'] ?? '')));
    if (!isset($contributeurs[$e])) sortie(['ok' => false, 'message' => 'contributeur inconnu'], 404);
    sortie(['ok' => true, 'admin' => true, 'email' => $e] + stats($e, $contributeurs[$e]) + ['soumissions' => soumissions($e)]);
}
if ($admin && $action === 'soumissions') sortie(['ok' => true, 'soumissions' => soumissions(), 'noms' => array_map(fn($c) => $c['nom'], $contributeurs)]);
if ($admin && $action === 'statut') {
    $x = soumission((string) ($_REQUEST['id'] ?? ''));
    $st = (string) ($_REQUEST['statut'] ?? '');
    if (!$x || !in_array($st, STATUTS, true)) sortie(['ok' => false, 'message' => 'id ou statut'], 422);
    $x['statut'] = $st;
    $x['retour'] = texteChamp('retour', 3000) ?: (string) ($_GET['retour'] ?? ($x['retour'] ?? ''));
    if (!empty($_REQUEST['lien'])) $x['lien'] = (string) $_REQUEST['lien'];
    $x['historique'][] = ['date' => date('c'), 'statut' => $st];
    sauverSoumission($x);
    $nom = $contributeurs[$x['email']]['nom'] ?? '';
    $msgs = [
        'en_relecture' => "Ton article « {$x['titre']} » est en relecture. On revient vers toi très vite.",
        'a_corriger' => "Ton article « {$x['titre']} » a besoin de quelques retouches. Tout est expliqué dans ton espace :

" . ($x['retour'] ?? ''),
        'publie' => "Ton article « {$x['titre']} » est en ligne ! " . (($x['lien'] ?? '') ? "

{$x['lien']}" : '') . "

Partage-le à ton club et à tes potes : chaque lecture compte dans ta cagnotte.",
        'refuse' => "On ne va pas publier « {$x['titre']} » cette fois. Le pourquoi est dans ton espace. Propose-nous vite un autre sujet !",
    ];
    if (isset($msgs[$st])) envoyerMail($x['email'], 'UNIFOOT TV : ton article', "Salut $nom,

{$msgs[$st]}

Ton espace : " . SITE . "/espace/

L'équipe UNIFOOT TV");
    sortie(['ok' => true, 'soumission' => $x]);
}
if ($admin && $action === 'photo_voir') { /* traité plus bas */ }
elseif ($admin) {
    if ($action === 'contributeur') {
        $e = strtolower(trim((string) ($_GET['email'] ?? '')));
        if (!filter_var($e, FILTER_VALIDATE_EMAIL)) sortie(['ok' => false, 'message' => 'email'], 422);
        if (($_GET['supprimer'] ?? '') === '1') unset($contributeurs[$e]);
        else $contributeurs[$e] = ['nom' => trim((string) ($_GET['nom'] ?? ($contributeurs[$e]['nom'] ?? ''))), 'part' => (float) ($_GET['part'] ?? ($contributeurs[$e]['part'] ?? 0.3)), 'depuis' => $contributeurs[$e]['depuis'] ?? date('Y-m-d')];
        ecrire("$data/contributeurs.json", $contributeurs);
    } elseif ($action === 'rpm') {
        $r = lire("$data/rpm.json");
        $m = (string) ($_GET['mois'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}$/', $m)) sortie(['ok' => false, 'message' => 'mois'], 422);
        $r[$m] = round((float) ($_GET['rpm'] ?? 0), 3);
        ksort($r);
        ecrire("$data/rpm.json", $r);
    } elseif ($action === 'paiement') {
        $e = strtolower(trim((string) ($_GET['email'] ?? '')));
        if (!isset($contributeurs[$e])) sortie(['ok' => false, 'message' => 'contributeur inconnu'], 404);
        $p = lire("$data/paiements.json");
        $p[$e][] = ['date' => date('Y-m-d'), 'montant' => round((float) ($_GET['montant'] ?? 0), 2), 'note' => (string) ($_GET['note'] ?? '')];
        ecrire("$data/paiements.json", $p);
    }
    $vue = [];
    foreach ($contributeurs as $e => $c) $vue[$e] = stats($e, $c) + ['a_relire' => count(array_filter(soumissions($e), fn($x) => $x['statut'] === 'envoye'))];
    sortie(['ok' => true, 'rpm' => lire("$data/rpm.json"), 'contributeurs' => $vue]);
}

// ===== Demande de lien de connexion =====
if ($action === 'lien' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $e = strtolower(trim((string) ($_POST['email'] ?? '')));
    // Limite : 5 demandes par heure et par adresse IP
    $rl = "$data/rate-espace-" . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H'));
    $n = is_file($rl) ? (int) file_get_contents($rl) : 0;
    if ($n >= 5) sortie(['ok' => false, 'message' => 'Trop de demandes, réessaie dans une heure'], 429);
    @file_put_contents($rl, (string) ($n + 1));
    foreach (glob("$data/rate-espace-*") ?: [] as $f) if (filemtime($f) < time() - 7200) @unlink($f);
    // Même réponse que l'adresse soit connue ou non (on ne dévoile pas qui est contributeur)
    if (filter_var($e, FILTER_VALIDATE_EMAIL) && isset($contributeurs[$e])) {
        $jeton = bin2hex(random_bytes(24));
        ecrire("$data/jetons/" . hash('sha256', $jeton) . '.json', ['email' => $e, 'exp' => time() + DUREE_LIEN]);
        $lien = SITE . '/espace/?t=' . $jeton;
        $corps = "Salut {$contributeurs[$e]['nom']},\n\nVoici ton lien pour entrer dans ton espace contributeur UNIFOOT TV (valable 30 minutes) :\n\n$lien\n\nSi tu n'as rien demandé, ignore ce message.\n\nL'équipe UNIFOOT TV";
        @mail($e, '=?UTF-8?B?' . base64_encode('Ton lien de connexion UNIFOOT TV') . '?=', $corps,
            implode("\r\n", ['From: UNIFOOT TV <' . EXPEDITEUR . '>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit']), '-f' . EXPEDITEUR);
    }
    foreach (glob("$data/jetons/*.json") ?: [] as $f) if (filemtime($f) < time() - DUREE_LIEN) @unlink($f);
    sortie(['ok' => true]);
}

// ===== Lien cliqué : ouverture de la session =====
if ($action === 'entrer') {
    $f = "$data/jetons/" . hash('sha256', (string) ($_GET['t'] ?? '')) . '.json';
    $j = lire($f);
    @unlink($f);
    if (!$j || ($j['exp'] ?? 0) < time() || !isset($contributeurs[$j['email']])) sortie(['ok' => false, 'message' => 'Lien expiré ou déjà utilisé'], 401);
    $sid = bin2hex(random_bytes(32));
    ecrire("$data/sessions/" . hash('sha256', $sid) . '.json', ['email' => $j['email'], 'exp' => time() + DUREE_SESSION]);
    setcookie('uftv_espace', $sid, ['expires' => time() + DUREE_SESSION, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
    foreach (glob("$data/sessions/*.json") ?: [] as $s) if (filemtime($s) < time() - DUREE_SESSION) @unlink($s);
    sortie(['ok' => true]);
}

// ===== Session en cours =====
$sid = (string) ($_COOKIE['uftv_espace'] ?? '');
$sf = "$data/sessions/" . hash('sha256', $sid) . '.json';
$session = $sid !== '' ? lire($sf) : [];
$connecte = $session && ($session['exp'] ?? 0) > time() && isset($contributeurs[$session['email']]);

if ($action === 'sortir') {
    if ($sid !== '') @unlink($sf);
    setcookie('uftv_espace', '', ['expires' => 1, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
    sortie(['ok' => true]);
}
if ($action === 'moi') {
    if (!$connecte) sortie(['ok' => false], 401);
    sortie(['ok' => true] + stats($session['email'], $contributeurs[$session['email']]) + ['soumissions' => soumissions($session['email'])]);
}

// ===== Photo d'une soumission (contributeur propriétaire ou admin) =====
if ($action === 'photo_voir') {
    $x = soumission((string) ($_GET['id'] ?? ''));
    $f = basename((string) ($_GET['f'] ?? ''));
    if (!$x || !($admin || ($connecte && $x['email'] === $session['email']))) sortie(['ok' => false], 403);
    $chemin = "$data/soumissions/{$x['id']}/$f";
    if (!is_file($chemin)) sortie(['ok' => false], 404);
    $types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'heic' => 'image/heic'];
    header('Content-Type: ' . ($types[pathinfo($f, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
    header('Cache-Control: private, max-age=86400');
    readfile($chemin);
    exit;
}

// ===== Écrire un article (contributeur connecté) =====
if (in_array($action, ['mes_articles', 'enregistrer', 'photo', 'photo_suppr', 'envoyer', 'supprimer'], true)) {
    if (!$connecte) sortie(['ok' => false], 401);
    $email = $session['email'];
    if ($action === 'mes_articles') sortie(['ok' => true, 'soumissions' => soumissions($email)]);
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') sortie(['ok' => false], 405);

    $id = (string) ($_POST['id'] ?? '');
    $x = $id !== '' ? soumission($id) : [];
    if ($id !== '' && (!$x || $x['email'] !== $email)) sortie(['ok' => false, 'message' => 'Article introuvable'], 404);
    $modifiable = !$x || in_array($x['statut'], ['brouillon', 'a_corriger'], true);

    if ($action === 'enregistrer') {
        if (!$modifiable) sortie(['ok' => false, 'message' => 'Cet article est déjà envoyé, il ne peut plus être modifié'], 409);
        if (!$x) {
            if (count(array_filter(soumissions($email), fn($s) => $s['statut'] === 'brouillon')) >= 10) sortie(['ok' => false, 'message' => 'Tu as déjà 10 brouillons : envoie ou supprime-en un'], 429);
            $x = ['id' => substr(bin2hex(random_bytes(8)), 0, 16), 'email' => $email, 'statut' => 'brouillon', 'cree' => date('c'), 'photos' => [], 'historique' => [['date' => date('c'), 'statut' => 'brouillon']]];
        }
        foreach (['titre' => 160, 'chapo' => 400, 'texte' => 20000, 'region' => 80, 'club' => 120, 'source' => 300] as $k => $max) $x[$k] = texteChamp($k, $max);
        $x['propre_club'] = ($_POST['propre_club'] ?? '') === '1';
        $x['accord_photo'] = ($_POST['accord_photo'] ?? '') === '1';
        if (isset($_POST['credits']) && is_array($c = json_decode((string) $_POST['credits'], true)))
            foreach ($x['photos'] as $i => $p) if (isset($c[$p['f']])) $x['photos'][$i]['credit'] = mb_substr(trim((string) $c[$p['f']]), 0, 120);
        sauverSoumission($x);
        sortie(['ok' => true, 'soumission' => $x]);
    }
    if (!$x) sortie(['ok' => false, 'message' => 'Enregistre d\'abord ton brouillon'], 422);

    if ($action === 'photo') {
        if (!$modifiable) sortie(['ok' => false, 'message' => 'Article déjà envoyé'], 409);
        if (count($x['photos']) >= MAX_PHOTOS) sortie(['ok' => false, 'message' => 'Maximum ' . MAX_PHOTOS . ' photos'], 422);
        $f = $_FILES['photo'] ?? null;
        if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK || $f['size'] > PHOTO_MAX_OCTETS) sortie(['ok' => false, 'message' => 'Photo trop lourde (12 Mo maximum) ou envoi raté'], 422);
        $mime = function_exists('mime_content_type') ? (string) @mime_content_type($f['tmp_name']) : '';
        $exts = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/heic' => 'heic', 'image/heif' => 'heic'];
        if (!isset($exts[$mime])) sortie(['ok' => false, 'message' => 'Format non reconnu (JPG, PNG, WEBP ou HEIC)'], 415);
        $dir = "$data/soumissions/{$x['id']}";
        if (!is_dir($dir)) @mkdir($dir, 0750, true);
        $nom = substr(bin2hex(random_bytes(6)), 0, 12) . '.' . $exts[$mime];
        if (!move_uploaded_file($f['tmp_name'], "$dir/$nom")) sortie(['ok' => false, 'message' => 'Enregistrement impossible'], 500);
        $x['photos'][] = ['f' => $nom, 'credit' => mb_substr(trim((string) ($_POST['credit'] ?? '')), 0, 120)];
        sauverSoumission($x);
        sortie(['ok' => true, 'soumission' => $x]);
    }
    if ($action === 'photo_suppr') {
        if (!$modifiable) sortie(['ok' => false, 'message' => 'Article déjà envoyé'], 409);
        $f = basename((string) ($_POST['f'] ?? ''));
        $x['photos'] = array_values(array_filter($x['photos'], fn($p) => $p['f'] !== $f));
        @unlink("$data/soumissions/{$x['id']}/$f");
        sauverSoumission($x);
        sortie(['ok' => true, 'soumission' => $x]);
    }
    if ($action === 'supprimer') {
        if ($x['statut'] !== 'brouillon') sortie(['ok' => false, 'message' => 'Seul un brouillon peut être supprimé'], 409);
        foreach (glob("$data/soumissions/{$x['id']}/*") ?: [] as $f) @unlink($f);
        @rmdir("$data/soumissions/{$x['id']}");
        @unlink("$data/soumissions/{$x['id']}.json");
        sortie(['ok' => true]);
    }
    if ($action === 'envoyer') {
        if (!$modifiable) sortie(['ok' => false, 'message' => 'Déjà envoyé'], 409);
        $manque = [];
        if (mb_strlen($x['titre'] ?? '') < 10) $manque[] = 'un titre';
        if (nbMots($x['texte'] ?? '') < 150) $manque[] = 'un texte d\'au moins 150 mots';
        if (trim($x['source'] ?? '') === '') $manque[] = 'ta source (club, district, témoin…)';
        foreach ($x['photos'] as $p) if (trim($p['credit'] ?? '') === '') { $manque[] = 'le nom du photographe pour chaque photo'; break; }
        if ($x['photos'] && empty($x['accord_photo'])) $manque[] = 'cocher l\'accord pour les photos';
        if ($manque) sortie(['ok' => false, 'message' => 'Il manque : ' . implode(', ', $manque) . '.'], 422);
        $deja = $x['statut'] === 'a_corriger';
        $x['statut'] = 'envoye';
        $x['envoye'] = date('c');
        $x['historique'][] = ['date' => date('c'), 'statut' => 'envoye'];
        sauverSoumission($x);
        $nom = $contributeurs[$email]['nom'] ?? $email;
        envoyerMail(DESTINATAIRE, ($deja ? 'Article corrigé' : 'Nouvel article') . " de $nom : {$x['titre']}",
            "$nom vient d'envoyer " . ($deja ? 'la version corrigée de ' : '') . "son article depuis son espace.\n\nTitre : {$x['titre']}\nRégion : {$x['region']}\nClub : {$x['club']}\nMots : " . nbMots($x['texte']) . "\nPhotos : " . count($x['photos']) . "\n\nÀ relire dans l'espace (mode admin).");
        sortie(['ok' => true, 'soumission' => $x]);
    }
}
sortie(['ok' => false, 'message' => 'Action inconnue'], 400);
