<?php
// Photos envoyées par les lecteurs (formulaire Participer > J'ai une photo).
// Accès réservé : ?k=CLE (seule l'empreinte SHA-256 de la clé est stockée ici).
//   ?k=CLE              liste des photos reçues (JSON)
//   ?k=CLE&f=FICHIER    télécharge une photo
//   ?k=CLE&utilisee=FICHIER   marque une photo comme utilisée
declare(strict_types=1);
const CLE_SHA256 = '6771ba6946327b9fc9fe04498d7a5ac0e0265123a1d3fceb6c4042d95ff4a8f7';

$k = (string) ($_GET['k'] ?? '');
if ($k === '' || !hash_equals(CLE_SHA256, hash('sha256', $k))) { http_response_code(403); exit; }
header('X-Robots-Tag: noindex');
$dir = __DIR__ . '/data/photos';

if (isset($_GET['f'])) {
    $f = basename((string) $_GET['f']);
    $path = "$dir/$f";
    if (!preg_match('/^[0-9a-f-]+\.(jpg|png|webp|heic)$/i', $f) || !is_file($path)) { http_response_code(404); exit; }
    header('Content-Type: ' . (mime_content_type($path) ?: 'application/octet-stream'));
    header('Content-Disposition: inline; filename="' . $f . '"');
    readfile($path);
    exit;
}
if (isset($_GET['utilisee'])) {
    $j = "$dir/" . preg_replace('/\.[a-z]+$/i', '', basename((string) $_GET['utilisee'])) . '.json';
    if (is_file($j)) { $m = json_decode((string) file_get_contents($j), true) ?: []; $m['utilisee'] = true; file_put_contents($j, json_encode($m, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)); }
}
$liste = [];
foreach (glob("$dir/*.json") ?: [] as $j) $liste[] = json_decode((string) file_get_contents($j), true);
usort($liste, fn($a, $b) => strcmp((string) ($b['recu'] ?? ''), (string) ($a['recu'] ?? '')));
header('Content-Type: application/json; charset=utf-8');
echo json_encode($liste, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
