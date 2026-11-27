"""Vidéo promo contributeurs V2 : caméra dynamique, animations, bruitages."""
import json, subprocess, sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = '/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
V1 = f'{S}/vid'; V = f'{S}/v2'
PORT = os.environ.get('FMT') == 'portrait'
FPS = 30
W, H = (1080, 1350) if PORT else (1080, 1920)
U = H / 1920  # échelle verticale pour placer les éléments
FN = lambda w, n: ImageFont.truetype(f'{S}/fnt/Inter-{w}.ttf', int(n))
TEAL = (34, 195, 211); MENTHE = (79, 255, 190); NAVY = (10, 12, 44); WHITE = (255, 255, 255); INK = (10, 10, 10)
LOGO = Image.open('/home/claude/unifoot-tv/public/brand/logo-480.png').convert('RGBA')

T = json.load(open(f'{V1}/times.json')); P = T['p']; TOTAL = T['total']
SUBS = json.load(open(f'{V1}/subs.json'))

CAP = {n: Image.open(f'{V1}/cap/{n}.jpg').convert('RGB') for n in ['contrib', 'form', 'dash', 'ecrire', 'mes', 'apercu']}
TABBAR = Image.open(f'{V1}/cap/viewport.jpg').convert('RGB').crop((0, 1556, 780, 1688))
HEAD = {n: im.crop((0, 82, 780, 220)) for n, im in CAP.items()}
SW, SH, BZ = 780, 1210, 18
LW, LH = SW + 2 * BZ, SH + 2 * BZ
BASEZ = 0.66 if PORT else 0.92
PCX, PCY = W / 2, (735 if PORT else 1090)

def ease(x):
    x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def eout(x):
    x = min(1, max(0, x)); return 1 - (1 - x) ** 3
def back(x):
    x = min(1, max(0, x)); c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def keyval(keys, t, f=ease):
    if t <= keys[0][0]: return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            k = f((t - t0) / max(1e-6, t1 - t0))
            return tuple(a + (b - a) * k for a, b in zip(v0, v1)) if isinstance(v0, tuple) else v0 + (v1 - v0) * k
    return keys[-1][1]

# ---------- fond animé ----------
def make_bg():
    y = np.linspace(0, 1, H)[:, None, None]
    base = np.array([16, 22, 64]) * (1 - y) + np.array([5, 7, 24]) * y
    return Image.fromarray(np.broadcast_to(base, (H, W, 3)).astype(np.uint8))
BG = make_bg()
def glow_sprite(r, col, a):
    yy, xx = np.mgrid[-r:r, -r:r]; g = np.exp(-(xx ** 2 + yy ** 2) / (2 * (r / 2.4) ** 2))
    arr = np.zeros((2 * r, 2 * r, 4), np.uint8); arr[..., :3] = col; arr[..., 3] = (g * a).astype(np.uint8)
    return Image.fromarray(arr)
G1 = glow_sprite(560, (30, 170, 190), 120); G2 = glow_sprite(460, (79, 255, 190), 60)
def background(t):
    im = BG.convert('RGBA')
    im.alpha_composite(G1, (int(540 - 560 + 220 * math.sin(t * 0.35)), int(H * 0.55 - 560 + 160 * math.cos(t * 0.27))))
    im.alpha_composite(G2, (int(540 - 460 - 260 * math.sin(t * 0.22 + 1)), int(H * 0.3 - 460 + 120 * math.sin(t * 0.3))))
    return im

# ---------- téléphone ----------
def rmask(w, h, r):
    m = Image.new('L', (w * 2, h * 2), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255)
    return m.resize((w, h), Image.LANCZOS)
SMASK = rmask(SW, SH, 56)
FRAME = Image.new('RGBA', (LW, LH), (0, 0, 0, 0))
ImageDraw.Draw(FRAME).rounded_rectangle([0, 0, LW - 1, LH - 1], radius=74, fill=(18, 20, 28, 255), outline=(84, 92, 116, 255), width=3)
SHADOW = Image.new('RGBA', (LW + 200, LH + 200), (0, 0, 0, 0))
ImageDraw.Draw(SHADOW).rounded_rectangle([100, 130, LW + 100, LH + 130], radius=80, fill=(0, 0, 0, 200))
SHADOW = SHADOW.filter(ImageFilter.GaussianBlur(40))

def screen(name, s):
    im = CAP[name]; y0 = int(round(s * 2)); y0 = max(0, min(im.height - SH, y0))
    sc = im.crop((0, y0, SW, y0 + SH))
    if y0 > 82: sc.paste(HEAD[name], (0, 0))
    sc.paste(TABBAR, (0, SH - TABBAR.height)); return sc

def phone_layer(name, s):
    L = FRAME.copy(); L.paste(screen(name, s), (BZ, BZ), SMASK); return L

def cam_matrix(z, fx, fy, rot, cx, cy):
    """point layer (x,y) -> sortie : R*z*(p - f) + c ; on renvoie la matrice inverse pour PIL"""
    c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    # inverse : p = f + (1/z) R^-1 (q - c)
    a, b = c / z, s_ / z; d, e = -s_ / z, c / z
    return (a, b, fx - a * cx - b * cy, d, e, fy - d * cx - e * cy)
def cam_fwd(z, fx, fy, rot, cx, cy, x, y):
    c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot)); dx, dy = (x - fx) * z, (y - fy) * z
    return cx + c * dx - s_ * dy, cy + s_ * dx + c * dy

def place(canvas, layer, cam, shadow=True):
    z, fx, fy, rot, cx, cy = cam
    if shadow:
        sh = SHADOW.transform((W, H), Image.AFFINE, cam_matrix(z, fx + 100, fy + 100, rot, cx, cy), resample=Image.BILINEAR)
        canvas.alpha_composite(sh)
    canvas.alpha_composite(layer.transform((W, H), Image.AFFINE, cam_matrix(z, fx, fy, rot, cx, cy), resample=Image.BICUBIC))

# ---------- éléments graphiques ----------
def pill(txt, f, fill, tc, pad=(28, 16), outline=None):
    tmp = ImageDraw.Draw(Image.new('L', (1, 1))); w = tmp.textlength(txt, font=f); bb = f.getbbox('ÉAgjp'); h = bb[3] - bb[1]
    im = Image.new('RGBA', (int(w + 2 * pad[0]) + 4, int(h + 2 * pad[1]) + 4), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([2, 2, im.width - 3, im.height - 3], radius=min(18, im.height // 2), fill=fill, outline=outline, width=5 if outline else 0)
    d.text((2 + pad[0], 2 + pad[1] - bb[1]), txt, font=f, fill=tc); return im

def pop(canvas, img, cx, cy, t_rel, dur_out=None, rot=0):
    """apparition en rebond centrée sur (cx,cy) ; t_rel temps depuis l'apparition"""
    if t_rel < 0: return
    k = back(t_rel / 0.32); a = min(1, t_rel / 0.12)
    if dur_out is not None and t_rel > dur_out: a *= max(0, 1 - (t_rel - dur_out) / 0.18)
    if a <= 0 or k <= 0.02: return
    im = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))), Image.BICUBIC)
    if rot: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if a < 1: im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

def titles(canvas, lines, t_rel, t_left):
    y = int(150 * U) if not PORT else 72
    for i, (txt, kind) in enumerate(lines):
        f = FN('ExtraBold', (50 if kind == 'k' else 58) * (0.8 if PORT else 1))
        im = pill(txt, f, TEAL if kind == 'k' else WHITE, INK, pad=(24, 13) if PORT else (28, 15))
        tr = t_rel - 0.08 * i
        if tr < 0: y += im.height + 10; continue
        k = back(tr / 0.35); a = min(1, tr / 0.12) * min(1, max(0, t_left / 0.15))
        if a > 0:
            im2 = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.BICUBIC)
            if a < 1: im2.putalpha(im2.getchannel('A').point(lambda v: int(v * a)))
            canvas.alpha_composite(im2, (int(W / 2 - im2.width / 2), int(y + im.height / 2 - im2.height / 2)))
        y += im.height + 10

FINGER = Image.new('RGBA', (120, 120), (0, 0, 0, 0))
_d = ImageDraw.Draw(FINGER); _d.ellipse([22, 26, 98, 102], fill=(0, 0, 0, 90)); _d.ellipse([20, 20, 96, 96], fill=(255, 255, 255, 235), outline=(10, 12, 44, 255), width=4)
FINGER = FINGER.filter(ImageFilter.GaussianBlur(0.6))
def finger(canvas, x, y, t_rel):
    """doigt qui arrive (0.35 s avant), appuie à t_rel=0, ripple, repart"""
    if t_rel < -0.4 or t_rel > 0.6: return
    a = min(1, (t_rel + 0.4) / 0.15) * (1 if t_rel < 0.35 else max(0, 1 - (t_rel - 0.35) / 0.25))
    off = 60 * (1 - eout((t_rel + 0.4) / 0.38)); s = 0.82 if 0 <= t_rel < 0.12 else 1.0
    f = FINGER.resize((int(120 * s), int(120 * s))); f.putalpha(f.getchannel('A').point(lambda v: int(v * a)))
    canvas.alpha_composite(f, (int(x + off - f.width / 2), int(y + off - f.height / 2)))
    if t_rel >= 0:
        d = ImageDraw.Draw(canvas); r = 30 + 70 * eout(t_rel / 0.5); al = int(255 * max(0, 1 - t_rel / 0.5))
        d.ellipse([x - r, y - r, x + r, y + r], outline=MENTHE + (al,), width=7)

FSUB = FN('ExtraBold', 54 if PORT else 62)
def subtitle(canvas, t):
    for a, b, txt in SUBS:
        if a <= t < b:
            d = ImageDraw.Draw(canvas)
            lines = [txt] if d.textlength(txt, font=FSUB) < 960 else split2(d, txt)
            lh = 66 if PORT else 76; y = (H - 150 if PORT else 1745) - (lh // 2 if len(lines) > 1 else 0) * (len(lines) - 1) * 2 // 2
            if len(lines) > 1: y -= lh // 2
            for l in lines:
                w = d.textlength(l, font=FSUB); d.text(((W - w) / 2, y), l, font=FSUB, fill=MENTHE, stroke_width=7, stroke_fill=(0, 0, 0)); y += lh
            return
def split2(d, txt):
    ws = txt.split(' '); best = None
    for i in range(1, len(ws)):
        a, b = ' '.join(ws[:i]), ' '.join(ws[i:]); m = max(d.textlength(a, font=FSUB), d.textlength(b, font=FSUB))
        if best is None or m < best[0]: best = (m, [a, b])
    return best[1]

# ---------- extraits vidéo ----------
class Clip:
    def __init__(self, src, x0, cw, ch, start=0.0, w=W, h=H, blur=False):
        if cw < 1920:  # recadrage vertical : garder le centre, adapter la largeur au format de sortie
            c = x0 + cw / 2; cw = int(round(ch * w / h / 2) * 2); x0 = int(max(0, min(1920 - cw, c - cw / 2)))
        vf = f'crop={cw}:{ch}:{x0}:0,scale={w}:{h}:flags=lanczos,unsharp=5:5:0.6' + (',gblur=sigma=18' if blur else '')
        self.p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(start), '-i', f'{V}/src/{src}.mp4', '-vf', vf, '-r', '30', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                  stdout=subprocess.PIPE); self.w, self.h = w, h; self.last = None
    def next(self):
        b = self.p.stdout.read(self.w * self.h * 3)
        if len(b) == self.w * self.h * 3: self.last = Image.frombytes('RGB', (self.w, self.h), b)
        return self.last
CLIPS = {}
def clip(key, *a, **k):
    if key not in CLIPS: CLIPS[key] = Clip(*a, **k)
    return CLIPS[key]

def darken(im, f):
    return Image.fromarray((np.asarray(im).astype(np.float32) * f).astype(np.uint8))

# ---------- scènes ----------
SFX = []   # (temps, fichier, gain)
def sfx(t, f, g=1.0): SFX.append((round(t, 3), f, g))

def kinetic(canvas, lines, t_rel, word_dt, y0, size):
    """texte qui apparaît mot par mot dans des cadres qui s'agrandissent"""
    f = FN('ExtraBold', size); idx = 0; y = y0
    for txt, fill in lines:
        ws = txt.split(' '); shown = [w for j, w in enumerate(ws) if t_rel >= (idx + j) * word_dt]; idx += len(ws)
        if not shown: break
        s = ' '.join(shown); im = pill(s, f, fill, INK, pad=(30, 16))
        last_t = t_rel - (idx - len(ws) + len(shown) - 1) * word_dt; k = 1 + 0.08 * max(0, 1 - last_t / 0.12)
        im = im.resize((int(im.width * k), int(im.height * k)), Image.BICUBIC)
        canvas.alpha_composite(im, (int(W / 2 - im.width / 2), int(y))); y += int(im.height / k) + 14

def hook(t, t0):
    if t < 2.45: c = clip('h1', 'k3414', 733, 495, 880, start=0.0); z0 = 0 if t < 1.15 else 1.15
    else:        c = clip('h3', 'k1355', 640, 495, 880, start=0.0); z0 = 2.45
    fr = c.next(); z = (1.0 if t < 1.15 else 1.16) + 0.05 * (t - z0) + (0.05 * max(0, 1 - (t - z0) / 0.2) if z0 > 0 else 0)
    w2, h2 = int(W * z), int(H * z); fr = fr.resize((w2, h2), Image.BILINEAR).crop(((w2 - W) // 2, (h2 - H) // 2, (w2 - W) // 2 + W, (h2 - H) // 2 + H))
    im = darken(fr, 0.62).convert('RGBA')
    grad = Image.linear_gradient('L').resize((W, H)).point(lambda v: int(v * 0.55)); im.paste(Image.new('RGB', (W, H), NAVY), (0, 0), grad)
    lg = LOGO.copy(); lg.thumbnail((260, 64)); im.alpha_composite(lg, ((W - lg.width) // 2, int(80 * U)))
    if t < P[1][0] - 0.1:
        kinetic(im, [('TU SUIS LE FOOT', WHITE), ('AMATEUR DE TA', WHITE), ('RÉGION ?', TEAL)], t - 0.05, 0.27, H * 0.64, 84 * (0.85 if PORT else 1))
    else:
        kinetic(im, [('ET SI C\'ÉTAIT TOI', TEAL), ('QUI LE RACONTAIS ?', WHITE)], t - P[1][0] + 0.02, 0.2, H * 0.68, 88 * (0.85 if PORT else 1))
    if t >= 0.0 and int(t * FPS) == int(0.0 * FPS): pass
    return im

def mk_phone(name, scroll, cam, ttl, taps=(), extra=None, enter=None):
    """cam: [(t, (z, fx, fy, rot))] ; taps: [(t, x_css, y_css)] ; enter: animation d'entrée"""
    def f(t, t0, t1):
        im = background(t); s = keyval(scroll, t)
        z, fx, fy, rot = keyval(cam, t); z *= BASEZ / 0.92; cy = PCY
        if enter == 'up':
            k = eout((t - t0) / 0.55); cy += (1 - k) * H * 0.9; rot += (1 - k) * -14
        cam6 = (z, fx, fy, rot, PCX, cy)
        place(im, phone_layer(name, s), cam6)
        for (tt, x, y) in taps:
            px, py = cam_fwd(*cam6, BZ + x * 2, BZ + (y - s) * 2); finger(im, px, py, t - tt)
        im.alpha_composite(TOPFADE); im.alpha_composite(BOTFADE)
        if extra: extra(im, t, cam6, s)
        titles(im, ttl, t - t0, t1 - t)
        return im
    return f

def _fade(h0, h1, top):
    a = np.zeros((H, W, 4), np.uint8); a[..., :3] = (8, 10, 34)
    y = np.arange(H, dtype=np.float32)
    v = np.clip((h1 - y) / (h1 - h0), 0, 1) if top else np.clip((y - h0) / (h1 - h0), 0, 1)
    a[..., 3] = (np.clip(v, 0, 1) ** 1.3 * 235)[:, None].astype(np.uint8); return Image.fromarray(a)
TOPFADE = _fade(int(330 * U) if not PORT else 150, int(560 * U) if not PORT else 300, True)
BOTFADE = _fade(H - (300 if not PORT else 230), H - (60 if not PORT else 40), False)
CEN = (LW / 2, LH / 2)
def C(z, x=None, y=None, r=-2.5): return (z, CEN[0] if x is None else x, CEN[1] if y is None else y, r)
def L(x_css, y_css, s):  # point de la page -> coordonnées du calque téléphone
    return BZ + x_css * 2, BZ + (y_css - s) * 2

def chips_whoqui(im, t, cam6, s):
    for i, (tt, txt, x, y) in enumerate([(P[3][0] + 0.05, 'ÉTUDIANTS', 0.27, 0.40), (P[3][0] + 1.25, 'PHOTOGRAPHES', 0.72, 0.52), (P[3][0] + 2.55, 'PASSIONNÉS', 0.30, 0.64)]):
        pop(im, pill(txt, FN('ExtraBold', 52 if not PORT else 42), MENTHE, INK, pad=(30, 16)), W * x, H * y, t - tt, rot=4 if i % 2 else -4)

def chip_2min(im, t, cam6, s):
    pop(im, pill('2 MIN CHRONO', FN('ExtraBold', 50 if not PORT else 40), MENTHE, INK), W * 0.70, H * 0.33, t - (P[5][0] + 1.3), rot=-5)

def chip_photos(im, t, cam6, s):
    pop(im, pill('+ TES PHOTOS', FN('ExtraBold', 50 if not PORT else 40), MENTHE, INK), W * 0.68, H * 0.62, t - (P[7][0] + 1.9), rot=4)

def stamp_publie(im, t, cam6, s):
    t_st = 29.3
    tr = t - t_st
    if tr >= 0:
        img = pill('PUBLIÉ ✓'.replace(' ✓', ''), FN('ExtraBold', 110 if not PORT else 86), (0, 0, 0, 0), MENTHE, pad=(40, 20), outline=MENTHE)
        k = 1 + 1.4 * (1 - eout(tr / 0.22)); a = min(1, tr / 0.08)
        im2 = img.resize((int(img.width * k), int(img.height * k)), Image.BICUBIC).rotate(-9, expand=True, resample=Image.BICUBIC)
        if a < 1: im2.putalpha(im2.getchannel('A').point(lambda v: int(v * a)))
        bg = Image.new('RGBA', im2.size, (0, 0, 0, 0)); m = im2.getchannel('A').filter(ImageFilter.MaxFilter(9)).point(lambda v: int(v * 0.55))
        bg.putalpha(m); im.alpha_composite(bg, (int(W / 2 - im2.width / 2), int(H * 0.47 - im2.height / 2)))
        im.alpha_composite(im2, (int(W / 2 - im2.width / 2), int(H * 0.47 - im2.height / 2)))
        if tr < 0.12:  # flash
            fl = Image.new('RGBA', (W, H), (255, 255, 255, int(110 * (1 - tr / 0.12)))); im.alpha_composite(fl)
    pop(im, pill('SIGNÉ DE TON NOM', FN('ExtraBold', 46 if not PORT else 38), WHITE, INK), W * 0.5, H * 0.60, t - 30.15, rot=3)
    pop(im, pill('RELAYÉ SUR NOS RÉSEAUX', FN('ExtraBold', 46 if not PORT else 38), TEAL, INK), W * 0.5, H * 0.68, t - 30.75, rot=-3)

def badge_30(im, t, cam6, s):
    tr = t - (P[11][0] + 1.1)
    if tr >= 0:
        n = int(round(30 * eout(tr / 0.7)))
        pop(im, pill(f'{n} %', FN('ExtraBold', 120 if not PORT else 92), MENTHE, INK, pad=(36, 18)), W * 0.74, H * 0.56, tr, rot=-6)

def kitf(t, t0, t1):
    im = background(t)
    c = clip('kitf', 'k2405', 0, 1920, 900, start=0.4, w=960, h=450); fr = c.next()
    k = eout((t - t0) / 0.4); cw = int(960 * (0.85 + 0.15 * k)); ch = int(cw * 450 / 960)
    card = fr.resize((cw, ch), Image.BILINEAR).convert('RGBA'); card.putalpha(rmask(cw, ch, 36))
    sh = Image.new('RGBA', (cw + 120, ch + 120), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([60, 80, cw + 60, ch + 80], radius=40, fill=(0, 0, 0, 190)); sh = sh.filter(ImageFilter.GaussianBlur(30))
    y = int(H * 0.56 - ch / 2); im.alpha_composite(sh, (int(W / 2 - cw / 2 - 60), y - 60)); im.alpha_composite(card, (int(W / 2 - cw / 2), y))
    d = ImageDraw.Draw(im); d.rounded_rectangle([W / 2 - cw / 2 - 4, y - 4, W / 2 + cw / 2 + 4, y + ch + 4], radius=40, outline=TEAL, width=5)
    if not PORT:
        lg = LOGO.copy(); lg.thumbnail((200, 50)); im.alpha_composite(lg, ((W - lg.width) // 2, int(80 * U)))
    titles(im, [('LE N°1 DU MOIS', 'k'), ('ANNONCÉ DANS', 't'), ('KICK IN THE FOOT', 't')], t - t0, t1 - t)
    return im

def outro(t, t0, t1):
    c = clip('out', 'k2405', 420, 495, 880, start=0.5, blur=True); fr = c.next()
    im = darken(fr, 0.38).convert('RGBA'); a = t - t0
    grad = Image.linear_gradient('L').resize((W, H)).point(lambda v: int(80 + v * 0.5)); im.paste(Image.new('RGB', (W, H), NAVY), (0, 0), grad)
    lg = LOGO.copy(); lg.thumbnail((560, 150)); k = back(a / 0.5)
    if k > 0.02:
        l2 = lg.resize((int(lg.width * k), int(lg.height * k)), Image.LANCZOS); im.alpha_composite(l2, ((W - l2.width) // 2, int(H * 0.22 - l2.height / 2)))
    y = H * 0.33
    for i, (txt, fill, sz) in enumerate([('DEVIENS', TEAL, 70), ('CORRESPONDANT', WHITE, 78), ('UNIFOOT TV', WHITE, 78), ('DANS TA RÉGION', TEAL, 66)]):
        img = pill(txt, FN('ExtraBold', sz * (0.85 if PORT else 1)), fill, INK, pad=(30, 14))
        pop(im, img, W / 2, y + img.height / 2, a - 0.25 - 0.12 * i); y += img.height + 14
    tu = P[13][0] - 0.1 - t0
    url = pill('unifoottv.fr/contributeurs', FN('ExtraBold', 62 * (0.9 if PORT else 1)), (0, 0, 0, 0), WHITE, pad=(40, 22), outline=MENTHE)
    if a >= tu:
        pul = 1 + 0.03 * math.sin((a - tu) * 6) if a - tu > 0.4 else 1
        u2 = url.resize((int(url.width * pul), int(url.height * pul)), Image.BICUBIC)
        pop(im, u2, W / 2, y + 60 + url.height / 2, a - tu)
        f2 = FN('SemiBold', 42 * (0.9 if PORT else 1)); d = ImageDraw.Draw(im); yy = y + 100 + url.height
        if a - tu > 0.4:
            for l in ['Candidature en 2 minutes', 'Étudiants, photographes, passionnés']:
                w = d.textlength(l, font=f2); d.text(((W - w) / 2, yy), l, font=f2, fill=(225, 230, 240)); yy += 58
    return im

def build():
    p = P; m9 = 24.79
    scenes = [
        ('01', 0, p[2][0], lambda t, a, b: hook(t, a), False),
        ('02', p[2][0], p[4][0], mk_phone('contrib', [(p[2][0], 0), (5.4, 0), (7.4, 560), (11.9, 1080)],
              [(p[2][0], C(0.92)), (7.3, C(0.92)), (8.0, C(1.08, None, 700, -3))],
              [('ON RECRUTE', 'k'), ('PARTOUT EN FRANCE', 't')], extra=chips_whoqui, enter='up'), True),
        ('03', p[4][0], p[5][0], mk_phone('contrib', [(p[4][0], 0)],
              [(p[4][0], C(1.3, *L(195, 330, 0), 2)), (13.2, C(0.95, None, None, 2)), (14.0, C(0.95, None, None, 2)), (14.6, C(1.55, *L(150, 513, 0), 0))],
              [('TOUT SE PASSE SUR', 'k'), ('UNIFOOTTV.FR', 't')], taps=[(15.05, 120, 513)]), True),
        ('04', p[5][0], p[6][0], mk_phone('form', [(p[5][0], 0), (16.3, 560)],
              [(p[5][0], C(0.95, None, None, -2)), (16.3, C(1.3, *L(190, 830, 560), -1))],
              [('CANDIDATURE', 'k'), ('EN 2 MINUTES', 't')], taps=[(16.75, 95, 787), (17.75, 95, 1015)], extra=chip_2min), True),
        ('05', p[6][0], p[7][0], mk_phone('dash', [(p[6][0], 0), (19.3, 0), (20.42, 230)],
              [(p[6][0], C(1.5, *L(171, 200, 0), 0)), (18.85, C(1.5, *L(171, 200, 0), 0)), (19.4, C(0.95, None, None, 2.5))],
              [('UNE FOIS ACCEPTÉ', 'k'), ('TON ESPACE PERSO', 't')], taps=[(18.6, 171, 75)]), True),
        ('06', p[7][0], 23.44, mk_phone('ecrire', [(p[7][0], 0), (21.0, 0), (21.6, 330), (23.44, 1450)],
              [(p[7][0], C(0.95, None, None, -2.5)), (21.4, C(1.12, None, None, -1.5))],
              [('TU ÉCRIS', 'k'), ('DIRECT DEDANS', 't')], taps=[(20.75, 150, 300)], extra=chip_photos), True),
        ('07', 23.44, m9, mk_phone('ecrire', [(23.44, 1450), (23.85, 1640)],
              [(23.44, C(1.12, None, None, -1.5)), (24.1, C(1.7, *L(110, 2086, 1640), 0))],
              [('UN CLIC SUR', 'k'), ('APERÇU', 't')], taps=[(24.42, 110, 2086)]), False),
        ('08', m9, p[9][0], mk_phone('apercu', [(m9, 0), (25.5, 0), (27.2, 520)],
              [(m9, C(1.45, None, 700, 0)), (25.3, C(0.95, None, None, 2.5))],
              [('TON ARTICLE', 'k'), ('COMME SUR LE SITE', 't')]), True),
        ('09', p[9][0], p[10][0], mk_phone('mes', [(p[9][0], 100), (31.9, 380)],
              [(p[9][0], C(0.95, None, None, -2.5)), (29.2, C(0.95, None, None, -2.5)), (29.5, C(0.85, None, None, -1))],
              [('ON RELIT', 'k'), ('ET ON PUBLIE', 't')], extra=stamp_publie), True),
        ('10', p[10][0], 35.0, mk_phone('dash', [(p[10][0], 1040), (33.0, 1150), (35.0, 1190)],
              [(p[10][0], C(0.95, None, None, 2.5)), (33.0, C(1.18, *L(195, 1430, 1150), 1))],
              [('LE CLASSEMENT', 'k'), ('DU MOIS', 't')]), True),
        ('11', 35.0, p[11][0], kitf, True),
        ('12', p[11][0], p[12][0], mk_phone('dash', [(p[11][0], 420), (39.6, 440), (41.6, 900), (43.6, 900)],
              [(p[11][0], C(0.95, None, None, -2.5)), (38.6, C(1.45, *L(195, 860, 440), -1)), (40.3, C(1.45, *L(195, 860, 440), -1)), (41.4, C(1.15, *L(195, 1040, 900), 1))],
              [('30 % DES REVENUS PUB', 'k'), ('DE TES ARTICLES', 't')], extra=badge_30), True),
        ('13', p[12][0], TOTAL, outro, True),
    ]
    return scenes

def all_sfx(scenes):
    SFX.clear()
    for i, (nm, a, b, fn, wh) in enumerate(scenes):
        if wh: sfx(a - 0.18, 'w1', 0.55)
    for t in [15.05, 16.75, 17.75, 18.6, 20.75, 24.42]: sfx(t, 'click', 0.9)
    for t in [P[3][0] + 0.05, P[3][0] + 1.25, P[3][0] + 2.55, P[5][0] + 1.3, P[7][0] + 1.9, 30.15, 30.75, P[11][0] + 1.1, 0.05, 2.56]: sfx(t, 'pop', 0.6)
    sfx(29.3, 'flash', 0.8)
    sfx(P[2][0] - 0.1, 'w2', 0.6)
    return SFX

def render(only=None, sub=True):
    scenes = build(); SC = f'{V}/sc' + ('45' if PORT else ''); os.makedirs(SC, exist_ok=True)
    for i, (nm, a, b, fn, wh) in enumerate(scenes):
        if only and nm not in only: continue
        CLIPS.clear()
        f0, f1 = round(a * FPS), round(b * FPS)
        prev = None
        if i > 0:
            pa = scenes[i - 1]; CLIPS.clear()
            # dernière image de la scène précédente pour le fondu (on avance les extraits si besoin)
            if pa[0] in ('01',):
                prev = None
            else:
                prev = pa[3]((round(pa[2] * FPS) - 1) / FPS, pa[1], pa[2]).convert('RGB') if pa[0] not in ('11', '13') else None
            CLIPS.clear()
        out = f'{SC}/{nm}.tmp.mp4'
        pr = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                               '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        for k in range(f0, f1):
            t = k / FPS; im = fn(t, a, b).convert('RGBA')
            if nm not in ('01', '13') and sub: subtitle(im, t)
            im = im.convert('RGB')
            if prev is not None and k - f0 < 5: im = Image.blend(prev, im, (k - f0 + 1) / 6)
            pr.stdin.write(im.tobytes())
        pr.stdin.close(); assert pr.wait() == 0
        for c in CLIPS.values(): c.p.kill()
        os.replace(out, f'{SC}/{nm}.mp4'); print(nm, f1 - f0, flush=True)

def still(ts):
    scenes = build()
    for j, t in enumerate(ts):
        for nm, a, b, fn, wh in scenes:
            if a <= t < b:
                CLIPS.clear(); im = fn(t, a, b).convert('RGBA')
                if nm not in ('01', '13'): subtitle(im, t)
                im.convert('RGB').save(f'{V}/st{"P" if PORT else ""}-{j}.jpg', quality=88)

if __name__ == '__main__':
    if sys.argv[1] == 'still': still(list(map(float, sys.argv[2:])))
    elif sys.argv[1] == 'sfx': json.dump(all_sfx(build()), open(f'{V}/sfx.json', 'w'))
    else: render(sys.argv[2:] or None)
