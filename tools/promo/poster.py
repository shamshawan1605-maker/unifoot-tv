import numpy as np, json, sys
from PIL import Image, ImageDraw, ImageFont
S='/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
FN=lambda w,n: ImageFont.truetype(f'{S}/fnt/Inter-{w}.ttf',n)
TEAL=(34,195,211)
def logo_round(path,size):
    lg=Image.open(path).convert('RGB').resize((size,size),Image.LANCZOS)
    m=Image.new('L',(size*4,size*4),0); ImageDraw.Draw(m).ellipse([2,2,size*4-3,size*4-3],fill=255); return lg,m.resize((size,size),Image.LANCZOS)
def make(c):
    W,H=c['size']; src=Image.open(c['src']).convert('RGB'); x0,y0,x1,y1=c['crop']
    p=src.crop((x0,y0,x1,y1)).resize((W,H),Image.LANCZOS)
    a=np.asarray(p).astype(np.float32); yy=np.linspace(0,1,H)[:,None,None]
    top=c.get('textTop',0.48); a*=(1-np.clip((yy-top)/0.22,0,1)**1.1*0.93)
    a*=(1-np.clip((0.12-yy)/0.12,0,1)*0.45)   # léger assombrissement en haut pour les logos
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8)); d=ImageDraw.Draw(im)
    # logos
    u=Image.open('/home/claude/unifoot-tv/public/brand/logo-480.png').convert('RGBA'); u.thumbnail((150,72))
    if c['logo2']=='kitf':
        l2=Image.open(S+'/promo/KICK_crop.png').convert('RGBA').resize((84,84)); m2=l2
    else:
        l2,m2=logo_round(c['logo2'],78)
    f=FN('SemiBold',30); xw=d.textlength('×',font=f); tot=u.width+28+xw+28+l2.width; x=int((W-tot)//2); cy=72
    im.paste(u,(x,cy-u.height//2),u); d.text((x+u.width+28,cy-22),'×',font=f,fill=(235,238,245)); im.paste(l2,(int(x+u.width+28+xw+28),cy-l2.height//2),m2)
    # texte
    X=48; ft=FN('ExtraBold',c.get('tsize',41)); fp=FN('SemiBold',35); ff=FN('ExtraBold',22)
    def wrap(t,fo,maxw):
        out=[];cur=''
        for w in t.split():
            tst=(cur+' '+w).strip()
            if d.textlength(tst,font=fo)<=maxw: cur=tst
            else: out.append(cur);cur=w
        out.append(cur);return out
    tl=wrap(c['title'],ft,W-2*X); pl=wrap(c['pres'],fp,W-2*X); lh=48; tlh=int(ft.size*1.2)
    yf=H-70-c.get('bottomPad',0); yp=yf-36-lh*len(pl); yt=yp-14-tlh*len(tl)
    for i,l in enumerate(tl): d.text((X,yt+i*tlh),l,font=ft,fill=TEAL)
    for i,l in enumerate(pl): d.text((X,yp+i*lh),l,font=fp,fill=(255,255,255))
    d.text((X,yf),c['foot'],font=ff,fill=TEAL)
    im.save(c['out'],quality=93); print(c['out'])
for c in json.load(open(sys.argv[1])): make(c)
