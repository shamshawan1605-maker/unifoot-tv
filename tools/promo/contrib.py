import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S='/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
O=f'{S}/contrib'
FN=lambda w,n: ImageFont.truetype(f'{S}/fnt/Inter-{w}.ttf',n)
TEAL=(34,195,211); NAVY=(12,18,32)
LOGO=Image.open('/home/claude/unifoot-tv/public/brand/logo-480.png').convert('RGBA')

def cover_bg(src,W,H,dark=0.4):
    r=max(W/src.width,H/src.height); bg=src.resize((int(src.width*r)+1,int(src.height*r)+1))
    bg=bg.crop(((bg.width-W)//2,(bg.height-H)//2,(bg.width-W)//2+W,(bg.height-H)//2+H)).filter(ImageFilter.GaussianBlur(30))
    return Image.fromarray((np.asarray(bg).astype(np.float32)*dark).astype(np.uint8))

def box(d,W,y,txt,f,pad=(26,14),fill=(0,0,0),tc=(255,255,255),x=None):
    w=d.textlength(txt,font=f); bb=f.getbbox('ÉAgjp'); h=bb[3]-bb[1]; x0=(W-w)/2 if x is None else x
    d.rounded_rectangle([x0-pad[0],y,x0+w+pad[0],y+h+2*pad[1]],radius=14,fill=fill); d.text((x0,y+pad[1]-bb[1]),txt,font=f,fill=tc); return h+2*pad[1]

def wrap(d,txt,f,maxw):
    lines=[];cur=''
    for w_ in txt.split():
        t=(cur+' '+w_).strip()
        if d.textlength(t,font=f)<=maxw: cur=t
        else: lines.append(cur); cur=w_
    lines.append(cur); return lines

def logo(im,W,y,h=86):
    u=LOGO.copy(); u.thumbnail((400,h)); im.paste(u,((W-u.width)//2,y),u)

def cover(photo,kicker,title,out):
    W,H=1080,1350; src=Image.open(f'{O}/{photo}.jpg').convert('RGB')
    im=Image.new('RGB',(W,H),NAVY)
    PH=880; r=PH/src.height; ph=src.resize((int(src.width*r),PH),Image.LANCZOS); ox=(ph.width-W)//2; ph=ph.crop((ox,0,ox+W,PH))
    im.paste(ph,(0,0))
    # fondu bas de la photo
    g=Image.new('L',(1,200));
    for i in range(200): g.putpixel((0,i),int(255*i/199))
    g=g.resize((W,200)); im.paste(Image.new('RGB',(W,200),NAVY),(0,ph.height-200),g)
    d=ImageDraw.Draw(im)
    y=ph.height-150
    y+=box(d,W,y,kicker,FN('ExtraBold',50),fill=TEAL,tc=(10,10,10))+26
    ft=FN('ExtraBold',68)
    for l in (title if isinstance(title,list) else wrap(d,title,ft,W-140)): y+=box(d,W,y,l,ft,pad=(24,12),fill=(255,255,255),tc=(10,10,10))+10
    logo(im,W,H-130,70)
    d.text((W-60,H-75),'1/5',font=FN('Bold',30),fill=(170,180,195),anchor='rm')
    d.text((60,H-75),'Illustration générée par IA',font=FN('Medium',22),fill=(120,130,145),anchor='lm')
    im.save(out,quality=93)

def slide(photo,n,titre,items,out,note=None,numbered=True):
    W,H=1080,1350; src=Image.open(f'{O}/{photo}.jpg').convert('RGB')
    im=cover_bg(src,W,H,0.35); d=ImageDraw.Draw(im)
    logo(im,W,70,64)
    y=190; y+=box(d,W,y,titre,FN('ExtraBold',58))+40
    fi=FN('SemiBold',38); fb=FN('ExtraBold',44)
    # mesure
    rows=[]
    for it in items:
        head,body=it if isinstance(it,tuple) else (it,None)
        ls=wrap(d,head,fb,W-340); bl=wrap(d,body,fi,W-340) if body else []
        rows.append((ls,bl))
    hgt=sum(len(a)*56+len(b)*50+56 for a,b in rows)+24*(len(rows)-1)+60
    extra=(len(wrap(d,note,FN('SemiBold',36),W-160))*50+40) if note else 0
    card_top=max(y,(H-60-hgt-extra+y)//2) if False else y+max(0,(H-120-y-hgt-extra)//2)
    d.rounded_rectangle([70,card_top,W-70,card_top+hgt],radius=36,fill=(246,246,246))
    y=card_top+30
    for k,(ls,bl) in enumerate(rows):
        rh=len(ls)*56+len(bl)*50+56
        d.rounded_rectangle([100,y,W-100,y+rh],radius=22,fill=(255,255,255))
        cx,cy=160,y+rh/2
        d.ellipse([cx-34,cy-34,cx+34,cy+34],fill=TEAL)
        d.text((cx,cy),str(k+1) if numbered else '✓',font=FN('ExtraBold',36),fill=(10,10,10),anchor='mm')
        ty=y+26
        for l in ls: d.text((225,ty),l,font=fb,fill=(20,20,20)); ty+=56
        for l in bl: d.text((225,ty),l,font=fi,fill=(85,85,90)); ty+=50
        y+=rh+24
    if note:
        y=card_top+hgt+40
        for l in wrap(d,note,FN('SemiBold',36),W-160):
            w=d.textlength(l,font=FN('SemiBold',36)); d.text(((W-w)/2,y),l,font=FN('SemiBold',36),fill=(235,235,235)); y+=50
    d.text((W-60,H-60),f'{n}/5',font=FN('Bold',30),fill=(200,205,215),anchor='rm')
    im.save(out,quality=93)

def cta(photo,out):
    W,H=1080,1350; src=Image.open(f'{O}/{photo}.jpg').convert('RGB')
    im=cover_bg(src,W,H,0.35); d=ImageDraw.Draw(im)
    logo(im,W,170,110)
    y=360
    for l in ['Candidate en 2 minutes']: y+=box(d,W,y,l,FN('ExtraBold',66))+16
    y+=box(d,W,y,'Bénévole, à ton rythme',FN('ExtraBold',50),fill=TEAL,tc=(10,10,10))+80
    for l,f,c in [('Toutes les infos et la candidature :',FN('SemiBold',42),(235,235,235)),('unifoottv.fr/contributeurs',FN('ExtraBold',62),(255,255,255)),('Lien cliquable dans notre story du jour',FN('Bold',40),TEAL)]:
        w=d.textlength(l,font=f); d.text(((W-w)/2,y),l,font=f,fill=c); y+=f.size+40
    y+=70
    for l in ['Partage à un pote qui écrit bien','ou qui shoote tous les matchs 📲']:
        f=FN('SemiBold',40); w=d.textlength(l.replace(' 📲',''),font=f); d.text(((W-w)/2,y),l.replace(' 📲',''),font=f,fill=(220,220,220)); y+=56
    d.text((W-60,H-60),'5/5',font=FN('Bold',30),fill=(200,205,215),anchor='rm')
    im.save(out,quality=93)

def story(photo,kicker,title,out):
    W,H=1080,1920; src=Image.open(f'{O}/{photo}.jpg').convert('RGB')
    im=cover_bg(src,W,H,0.45); d=ImageDraw.Draw(im)
    logo(im,W,150,92)
    y=290; y+=box(d,W,y,kicker,FN('ExtraBold',58),fill=TEAL,tc=(10,10,10))+18
    cw=960; ch=int(cw*src.height/src.width); cx=(W-cw)//2; cy=y+30
    card=src.resize((cw,ch),Image.LANCZOS)
    mk=Image.new('L',(cw*2,ch*2),0); ImageDraw.Draw(mk).rounded_rectangle([0,0,cw*2-1,ch*2-1],radius=48,fill=255); mk=mk.resize((cw,ch),Image.LANCZOS)
    im.paste(card,(cx,cy),mk); d=ImageDraw.Draw(im)
    ft=FN('ExtraBold',60); y=cy+ch+50
    for l in (title if isinstance(title,list) else wrap(d,title,ft,W-170)): y+=box(d,W,y,l,ft,pad=(22,12))+8
    y+=26; f=FN('SemiBold',38)
    for l in ['Ta signature, une attestation,','tes articles relayés sur nos réseaux']:
        w=d.textlength(l,font=f); d.text(((W-w)/2,y),l,font=f,fill=(235,235,235)); y+=52
    # rectangle lien (même taille que LIRE L'ARTICLE pour garder la position du sticker)
    y2=1420; fl=FN('ExtraBold',46); pw=d.textlength("LIRE L'ARTICLE",font=fl)+150; px=(W-pw)/2
    t='JE CANDIDATE'; tw=d.textlength(t,font=fl)
    d.rounded_rectangle([px,y2,px+pw,y2+98],radius=24,fill=(255,255,255))
    ix=px+(pw-(tw+64))/2; iy=y2+49
    for dx in (0,22): d.rounded_rectangle([ix+dx-2,iy-14,ix+dx+30,iy+14],radius=14,outline=(221,42,123),width=6)
    d.text((ix+64,y2+22),t,font=fl,fill=(30,30,30))
    t='SUR UNIFOOTTV.FR'; f=FN('ExtraBold',34); tw=d.textlength(t,font=f); d.text(((W-tw)/2,y2+128),t,font=f,fill=(255,255,255))
    im.save(out,quality=92)

QUI=[('Étudiant en journalisme, en com','Des articles signés pour ton book'),('Photographe de match','Tes photos publiées, ton nom en crédit'),('Passionné de ton district','Tu connais ton championnat par cœur'),('Dirigeant ou chargé de com','Les infos de ton club, de l\'intérieur')]
COMMENT=[('Tu proposes un sujet','Une actu de ta région, en une phrase'),('Tu écris l\'article','Avec tes photos si tu en as'),('On relit et on publie','Signé de ton nom sur unifoottv.fr'),('On te met en avant','Post et story sur nos réseaux, tu es tagué')]
GAINS=[('Ta signature','Et ta page auteur sur le site'),('Une attestation','À mettre sur ton CV'),('L\'émission','Les meilleurs passent dans Kick in the Foot'),('30 % des revenus pub','De tes articles, suivis dans ton espace perso')]

SEMAINES=[('s1','stade','ON RECRUTE',['Deviens correspondant','UNIFOOT TV dans ta région']),
          ('s2','etudiante','ÉTUDIANT EN JOURNALISME ?',['Signe tes premiers articles','sur le foot amateur']),
          ('s3','photographe','PHOTOGRAPHE DE MATCH ?',['Tes photos publiées,','ton nom en crédit']),
          ('s4','dirigeant','PASSIONNÉ OU DIRIGEANT ?',['Ton club mérite','qu\'on parle de lui'])]
if __name__=='__main__':
    for s,ph,k,t in SEMAINES:
        cover(ph,k,t,f'{O}/{s}-1.jpg')
        slide(ph,2,'QUI ON CHERCHE',QUI,f'{O}/{s}-2.jpg',note='Partout en France : une place par grande région pour commencer.')
        slide(ph,3,'COMMENT ÇA MARCHE',COMMENT,f'{O}/{s}-3.jpg')
        slide(ph,4,'CE QUE TU GAGNES',GAINS,f'{O}/{s}-4.jpg',numbered=False,note='Zéro frais : tu écris quand tu veux.')
        cta(ph,f'{O}/{s}-5.jpg')
        story(ph,k,t,f'{O}/story-{s}.jpg')
    print('ok')
