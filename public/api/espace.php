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
// Admin (?k=CLE) : action=liste · action=contributeur&email&nom&part · action=rpm&mois&rpm · action=paiement&email&montant&note
declare(strict_types=1);

const CLE_SHA256 = '6771ba6946327b9fc9fe04498d7a5ac0e0265123a1d3fceb6c4042d95ff4a8f7';
const EXPEDITEUR = 'site@unifoottv.fr';
const SITE = 'https://unifoottv.fr';
const DUREE_LIEN = 1800;          // 30 minutes
const DUREE_SESSION = 2592000;    // 30 jours

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$data = __DIR__ . '/data';
foreach (['', '/jetons', '/sessions'] as $s) if (!is_dir("$data$s")) @mkdir("$data$s", 0750, true);

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
if (isset($_GET['k'])) {
    if (!hash_equals(CLE_SHA256, hash('sha256', (string) $_GET['k']))) sortie(['ok' => false], 403);
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
    foreach ($contributeurs as $e => $c) $vue[$e] = stats($e, $c);
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
    sortie(['ok' => true] + stats($session['email'], $contributeurs[$session['email']]));
}
sortie(['ok' => false, 'message' => 'Action inconnue'], 400);
