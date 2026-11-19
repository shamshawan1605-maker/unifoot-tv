import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S='/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
F=lambda w,n: ImageFont.truetype(f'{S}/fnt/Inter-{w}.ttf',n)
W,H=1080,1350; TEAL=(34,195,211); WHITE=(255,255,255); GREY=(150,156,168)
OUT=S+'/demo-promo/recap'
import os; os.makedirs(OUT,exist_ok=True)
PHOTO='/mnt/user-data/attachments/03546910-959d-57c6-934e-eb403f7c9aa7/e3bb79a6-image.jpg'
THUMB='/mnt/user-data/uploads/Desktop/TORSE CONTRE TORSE.png'
PERIODS=['PREMIÈRE PÉRIODE','DEUXIÈME PÉRIODE','PROLONGATIONS']
EPS=[(S+'/recap_src/ep1.png',(1000,0,860),"À 14 ANS ? TORSE CONTRE TORSE !","Un penalty sifflé en U14 R1 fait débat : coup ou pas coup ?"),
     (None,None,"TITRE DE L'ÉPISODE 2","Le sujet en une ligne"),
     (None,None,"TITRE DE L'ÉPISODE 3","Ses méthodes de travail avec les U19 Nationaux")]

def logos(im,cy=78):
    d=ImageDraw.Draw(im)
    u=Image.open('/home/claude/unifoot-tv/public/brand/logo-480.png').convert('RGBA'); u.thumbnail((150,72))
    v=Image.open(S+'/promo/versailles.png').convert('RGBA'); v.thumbnail((78,78)); mk=Image.new('L',(v.width*4,v.height*4),0); ImageDraw.Draw(mk).ellipse([3,3,v.width*4-4,v.height*4-4],fill=255); v.putalpha(mk.resize(v.size,Image.LANCZOS))
    f=F('SemiBold',30); xw=d.textlength('×',font=f)
    tot=u.width+28+xw+28+v.width; x=int((W-tot)//2)
    im.paste(u,(x,cy-u.height//2),u); d.text((x+u.width+28,cy-22),'×',font=f,fill=(235,238,245))
    im.paste(v,(int(x+u.width+28+xw+28),cy-v.height//2),v)

def bg_from(path,dark=0.35,blur=28):
    s=Image.open(path).convert('RGB'); r=max(W/s.width,H/s.height)
    s=s.resize((int(s.width*r)+1,int(s.height*r)+1)); s=s.crop(((s.width-W)//2,(s.height-H)//2,(s.width-W)//2+W,(s.height-H)//2+H))
    s=s.filter(ImageFilter.GaussianBlur(blur)); a=np.asarray(s).astype(np.float32)*dark
    return Image.fromarray(a.astype(np.uint8))

def plain_bg():
    yy=np.linspace(0,1,H)[:,None,None]; top=np.array([16,30,44]); bot=np.array([6,10,16])
    a=np.broadcast_to(top*(1-yy)+bot*yy,(H,W,3)); return Image.fromarray(a.astype(np.uint8))

def box(d,cx,y,t,f,fill=(0,0,0),tc=WHITE,pad=(26,14),r=14):
    bb=d.textbbox((0,0),t,font=f); w=bb[2]-bb[0]; h=bb[3]-bb[1]
    d.rounded_rectangle([cx-w/2-pad[0],y,cx+w/2+pad[0],y+h+2*pad[1]],radius=r,fill=fill)
    d.text((cx-w/2-bb[0],y+pad[1]-bb[1]),t,font=f,fill=tc); return h+2*pad[1]

def timeline(d,y,active):
    # barre façon tableau de score : 4 segments
    n=len(PERIODS); gap=12; x0=60; tw=W-120; sw=(tw-gap*(n-1))/n; f=F('ExtraBold',19)
    for i,p in enumerate(PERIODS):
        x=x0+i*(sw+gap); on=(i==active); done=(i<active)
        d.rounded_rectangle([x,y,x+sw,y+8],radius=4,fill=TEAL if on else ((70,110,120) if done else (55,60,70)))
        lab=p.replace('PREMIÈRE','1RE').replace('DEUXIÈME','2E')
        tw2=d.textlength(lab,font=f); d.text((x+(sw-tw2)/2,y+20),lab,font=f,fill=WHITE if on else GREY)

def rounded(img,r):
    m=Image.new('L',(img.width*2,img.height*2),0); ImageDraw.Draw(m).rounded_rectangle([0,0,img.width*2-1,img.height*2-1],radius=r*2,fill=255)
    return m.resize(img.size,Image.LANCZOS)

def wrap(d,t,f,maxw):
    out=[];cur=''
    for w in t.split():
        tst=(cur+' '+w).strip()
        if d.textlength(tst,font=f)<=maxw: cur=tst
        else: out.append(cur);cur=w
    out.append(cur);return out


def poster(src,crop,top,title,sub,active,foot,out):
    if src:
        p=Image.open(src).convert('RGB'); x0,y0,ph=crop; pw=int(ph*W/H)
        im=p.crop((x0,y0,x0+pw,y0+ph)).resize((W,H),Image.LANCZOS)
    else:
        im=plain_bg(); dd=ImageDraw.Draw(im); f=F('ExtraBold',40); t="PHOTO DE L'ÉPISODE"; w=dd.textlength(t,font=f); dd.text(((W-w)/2,440),t,font=f,fill=(90,98,110))
    a=np.asarray(im).astype(np.float32); yy=np.mgrid[0:H,0:W][0]/H
    a*=(1-np.clip((yy-0.36)/0.26,0,1)**1.1*0.94)[...,None]; im=Image.fromarray(np.clip(a,0,255).astype(np.uint8))
    logos(im); d=ImageDraw.Draw(im); X=48
    ft=F('ExtraBold',56); fs=F('SemiBold',33)
    tl=wrap(d,title,ft,W-2*X); sl=wrap(d,sub,fs,W-2*X)
    y=H-215-len(sl)*44            # bas du sous-titre au-dessus de la barre
    ys=y
    y-= 14+len(tl)*68
    d.text((X,y-72),top,font=ft,fill=TEAL)
    for l in tl: d.text((X,y),l,font=ft,fill=WHITE); y+=68
    for k,l in enumerate(sl): d.text((X,ys+k*44),l,font=fs,fill=WHITE)
    timeline(d,H-180,active)
    d.text((X,H-78),foot,font=F('ExtraBold',24),fill=TEAL)
    im.save(out,quality=93)

poster(PHOTO,(360,70,860),"LA SEMAINE","AVEC KÉVIN GALLOU","Coach des U19 Nationaux du FC Versailles",-1,"3 ÉPISODES • YOUTUBE ET SPOTIFY  →  FAIS GLISSER",f'{OUT}/1-couverture.jpg')
def ep_slide(th,top,title,sub,active,foot,out):
    im=bg_from(th,dark=0.32) if th else plain_bg(); d=ImageDraw.Draw(im); logos(im)
    cw=W-96; chh=int(cw*9/16); cx=48; cy=190
    if th: t=Image.open(th).convert('RGB').resize((cw,chh),Image.LANCZOS)
    else:
        t=Image.new('RGB',(cw,chh),(38,44,54)); td=ImageDraw.Draw(t); f=F('ExtraBold',40)
        s_="VIGNETTE DE L'ÉPISODE"; w=td.textlength(s_,font=f); td.text(((cw-w)/2,chh/2-24),s_,font=f,fill=(110,118,130))
    sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).rounded_rectangle([cx+6,cy+16,cx+cw+6,cy+chh+16],radius=26,fill=170)
    im=Image.composite(Image.new('RGB',(W,H),(0,0,0)),im,sh.filter(ImageFilter.GaussianBlur(22)))
    im.paste(t,(cx,cy),rounded(t,26)); d=ImageDraw.Draw(im); X=48
    ft=F('ExtraBold',56); fs=F('SemiBold',33)
    tl=wrap(d,title,ft,W-2*X); sl=wrap(d,sub,fs,W-2*X)
    y=H-215-len(sl)*44; ys=y; y-=14+len(tl)*68
    d.text((X,y-72),top,font=ft,fill=TEAL)
    for l in tl: d.text((X,y),l,font=ft,fill=WHITE); y+=68
    for k,l in enumerate(sl): d.text((X,ys+k*44),l,font=fs,fill=WHITE)
    timeline(d,H-180,active)
    d.text((X,H-78),foot,font=F('ExtraBold',24),fill=TEAL)
    im.save(out,quality=93)

THUMBS=[THUMB,None,None]
for i,(src,crop,title,desc) in enumerate(EPS):
    ep_slide(THUMBS[i],PERIODS[i],title,desc,i,"ÉPISODE %d/3 • DISPO SUR YOUTUBE ET SPOTIFY"%(i+1),f'{OUT}/{i+2}-{PERIODS[i].lower().replace("è","e").replace("é","e").replace(" ","-")}.jpg')

# planche
fs=sorted(os.listdir(OUT)); fs=[x for x in fs if x[0].isdigit()]
sheet=Image.new('RGB',(len(fs)*370+10,480),(240,240,240))
for k,fn in enumerate(fs):
    s=Image.open(f'{OUT}/{fn}'); s.thumbnail((360,450)); sheet.paste(s,(10+k*370,15))
sheet.save(S+'/demo-promo/recap-planche.jpg',quality=90); print(fs)
