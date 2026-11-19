import numpy as np, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
S='/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
FB=S+'/fnt/Inter-Bold.ttf'; FM=S+'/fnt/Inter-SemiBold.ttf'
W,H=1080,1350; TEAL=(34,195,211)
NAME="Kévin Gallou"; ROLE="Entraîneur des U19 Nationaux du FC Versailles"
src=Image.open(sys.argv[1]).convert('RGB')
x0=int(sys.argv[2]); ph=int(sys.argv[3]); y0=int(sys.argv[4]); pw=int(ph*W/H)
p=src.crop((x0,y0,x0+pw,y0+ph)).resize((W,H),Image.LANCZOS)
# étalonnage façon photo : contraste, couleurs un peu éteintes, ombres froides

a=np.asarray(p).astype(np.float32)
l=a.mean(axis=2,keepdims=True)/255
yy,xx=np.mgrid[0:H,0:W]/np.array([H,W])[:,None,None]
v=np.sqrt(((xx-0.5)/0.75)**2+((yy-0.45)/0.8)**2); 
# bas assombri pour le texte
a*= (1-np.clip((yy-0.48)/0.22,0,1)**1.1*0.93)[...,None]
# grain + poussières
im=Image.fromarray(np.clip(a,0,255).astype(np.uint8))
d=ImageDraw.Draw(im); rng=np.random.default_rng(3)
for _ in range(0):
    x,y=rng.integers(0,W),rng.integers(0,H); r=rng.uniform(0.6,1.8); c=int(rng.uniform(150,230)); d.ellipse([x-r,y-r,x+r,y+r],fill=(c,c,c))
# logos en haut
u=Image.open('/home/claude/unifoot-tv/public/brand/logo-480.png').convert('RGBA'); u.thumbnail((150,72))
lg=Image.open('/tmp/claude-chrome-screenshots-2tGacM/screenshot-1795055996252-0.jpg').convert('RGB').crop((15,15,541,541)).resize((78,78),Image.LANCZOS)
m=Image.new('L',(78*4,78*4),0); ImageDraw.Draw(m).ellipse([2,2,78*4-3,78*4-3],fill=255); m=m.resize((78,78),Image.LANCZOS)
f=ImageFont.truetype(FM,30); xw=d.textlength('×',font=f)
tot=u.width+28+xw+28+78; x=int((W-tot)//2); cy=72
im.paste(u,(x,cy-u.height//2),u); d.text((x+u.width+28,cy-22),'×',font=f,fill=(235,238,245)); im.paste(lg,(int(x+u.width+28+xw+28),cy-39),m)
# texte bas, aligné à gauche
RG=S+"/fnt/Inter-Regular.ttf"; X=48
TITLE="L'INVITÉ DE LA SEMAINE : KÉVIN GALLOU"
PRES="Entraîneur des U19 Nationaux du FC Versailles, Kévin Gallou est l'invité de Kick in the Foot cette semaine. Débats, coups de cœur, coups de gueule et, dans les prolongations, il nous dévoile ses méthodes de travail."
FOOT="KÉVIN GALLOU - ENTRAÎNEUR U19 NATIONAUX - FC VERSAILLES"
ft=ImageFont.truetype(S+"/fnt/Inter-ExtraBold.ttf",41); fp=ImageFont.truetype(S+"/fnt/Inter-SemiBold.ttf",35); ff=ImageFont.truetype(S+"/fnt/Inter-ExtraBold.ttf",22)
def wrap(t,f,maxw):
    out=[];cur=''
    for w in t.split():
        tst=(cur+' '+w).strip()
        if d.textlength(tst,font=f)<=maxw: cur=tst
        else: out.append(cur);cur=w
    out.append(cur);return out
lines=wrap(PRES,fp,W-2*X); lh=48
yf=H-70; yp_end=yf-36; yp=yp_end-lh*len(lines); yt=yp-64
d.text((X,yt),TITLE,font=ft,fill=TEAL)
for i,l in enumerate(lines): d.text((X,yp+i*lh),l,font=fp,fill=(255,255,255))
d.text((X,yf),FOOT,font=ff,fill=TEAL)
im.save(sys.argv[5],quality=93); print('ok')
