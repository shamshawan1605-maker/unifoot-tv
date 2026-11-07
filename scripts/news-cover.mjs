// Visuel UNIFOOT TV pour une actu du site quand on n'a pas de photo libre de droits.
// Usage : node scripts/news-cover.mjs public/actualites/2026-11-07-mon-actu.jpg "ARBITRAGE" "Le titre de l'actu"
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright installé sur la machine (pas une dépendance du site)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [out, cat = 'FOOT AMATEUR', titre = ''] = process.argv.slice(2);
if (!out || !titre) { console.error('Usage : node scripts/news-cover.mjs <sortie.jpg> <catégorie> <titre>'); process.exit(1); }
const b64 = (p) => readFileSync(resolve(p)).toString('base64');
const logo = `data:image/png;base64,${b64('public/brand/logo-480.png')}`;
const mic = `data:image/webp;base64,${b64('public/brand/micro-unifoot.webp')}`;
const font = `data:font/woff2;base64,${b64('node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2')}`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const size = titre.length > 90 ? 64 : titre.length > 60 ? 76 : 88;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:PJ;src:url(${font});font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:1600px;height:900px;overflow:hidden;font-family:PJ;color:#fff;position:relative;
 background:radial-gradient(900px 700px at 85% 20%,rgba(34,195,211,.28),transparent 60%),radial-gradient(700px 600px at 0% 100%,rgba(34,195,211,.12),transparent 60%),#0a0c2c}
.pitch{position:absolute;inset:60px;border:3px solid rgba(255,255,255,.06);border-radius:18px}
.pitch:before{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:3px solid rgba(255,255,255,.06)}
.pitch:after{content:'';position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px;border:3px solid rgba(255,255,255,.06);border-radius:50%}
.logo{position:absolute;left:110px;top:105px;width:230px}
.mic{position:absolute;right:40px;bottom:-40px;width:520px;transform:rotate(-16deg);filter:drop-shadow(0 30px 40px rgba(0,0,0,.5));opacity:.95}
.txt{position:absolute;left:110px;right:520px;bottom:120px}
.cat{display:inline-block;padding:12px 24px;border-radius:12px;background:#22c3d3;color:#0a0c2c;font-weight:800;font-size:30px;letter-spacing:.08em;text-transform:uppercase}
h1{margin-top:30px;font-size:${size}px;line-height:1.05;font-weight:800;letter-spacing:-.02em;text-wrap:balance}
.url{position:absolute;left:110px;bottom:62px;font-weight:700;font-size:24px;color:rgba(255,255,255,.6)}
</style><div class="pitch"></div><img class="mic" src="${mic}"><img class="logo" src="${logo}">
<div class="txt"><span class="cat">${esc(cat)}</span><h1>${esc(titre)}</h1></div><div class="url">unifoottv.fr · l'actu du foot amateur</div>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path: out, type: 'jpeg', quality: 86 });
await b.close();
console.log('Visuel créé :', out);
