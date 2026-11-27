<?php
// Compteur de vues des articles (sans cookie) : une vue par lecteur, par article et par jour.
// Appelé par les pages /actualites/<slug>/ (navigator.sendBeacon). Stockage : data/vues/<slug>.json
//   {"total": 123, "jours": {"2026-11-27": 40, ...}}
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$slug = (string) ($_POST['slug'] ?? file_get_contents('php://input'));
$slug = trim($slug);
if (!preg_match('/^[a-z0-9-]{8,140}$/', $slug)) { http_response_code(400); exit; }
// Robots : pas comptés
$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i', $ua)) { http_response_code(204); exit; }

$dir = __DIR__ . '/data/vues';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
$jour = date('Y-m-d');

// Déjà compté aujourd'hui pour ce lecteur ? (empreinte anonyme, effacée après 2 jours)
$empreinte = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . $ua . '|' . $slug . '|' . $jour), 0, 20);
$vusFichier = "$dir/_vus-$jour.txt";
$fh = @fopen($vusFichier, 'c+');
if (!$fh) { http_response_code(204); exit; }
flock($fh, LOCK_EX);
$vus = stream_get_contents($fh) ?: '';
if (str_contains($vus, $empreinte)) { flock($fh, LOCK_UN); fclose($fh); http_response_code(204); exit; }
fseek($fh, 0, SEEK_END);
fwrite($fh, $empreinte . "\n");
flock($fh, LOCK_UN);
fclose($fh);

$f = "$dir/$slug.json";
$h = @fopen($f, 'c+');
if ($h) {
    flock($h, LOCK_EX);
    $d = json_decode(stream_get_contents($h) ?: '', true) ?: ['total' => 0, 'jours' => []];
    $d['total'] = (int) ($d['total'] ?? 0) + 1;
    $d['jours'][$jour] = (int) ($d['jours'][$jour] ?? 0) + 1;
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, json_encode($d));
    flock($h, LOCK_UN);
    fclose($h);
}
foreach (glob("$dir/_vus-*.txt") ?: [] as $v) if (filemtime($v) < time() - 2 * 86400) @unlink($v);
http_response_code(204);
