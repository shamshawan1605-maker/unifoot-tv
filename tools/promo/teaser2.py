import numpy as np, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S='/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
FN=lambda w,n: ImageFont.truetype(f'{S}/fnt/Inter-{w}.ttf',n)
W,H=1080,1920; VY=470; VW,VH=1080,1200   # zone vidéo
def boxes(im):
    d=ImageDraw.Draw(im)
    def box(y,txt,f,pad=(26,16)):
        w=d.textlength(txt,font=f); bb=f.getbbox(txt); h=bb[3]-bb[1]; x=(W-w)/2
        d.rounded_rectangle([x-pad[0],y,x+w+pad[0],y+h+2*pad[1]],radius=14,fill=(0,0,0)); d.text((x,y+pad[1]-bb[1]),txt,font=f,fill=(255,255,255)); return h+2*pad[1]
    y=150; y+=box(y,'CE SOIR 18H !!',FN('ExtraBold',72))+14
    y+=box(y,'AVEC KÉVIN GALLOU',FN('ExtraBold',48))+10
    box(y,'COACH DES U19 NATIONAUX DU FC VERSAILLES',FN('ExtraBold',30),pad=(20,12))
    return d
# fond fixe (flou de la vidéo) + titres + bas
fr=Image.open('/mnt/user-data/uploads/Downloads/claude-temp/fr2514.png').convert('RGB')
bg=fr.crop((420,0,1500,880)).resize((W,int(W*880/1080))).resize((W,H)).filter(ImageFilter.GaussianBlur(40))
bg=Image.fromarray((np.asarray(bg)*0.35).astype(np.uint8))
d=boxes(bg)
f=FN('ExtraBold',40); t='YOUTUBE.COM/@UNIFOOTTV'; tw=d.textlength(t,font=f); pw=tw+60; px=(W-pw)/2; y2=VY+VH+40
d.rounded_rectangle([px,y2,px+pw,y2+84],radius=20,fill=(255,255,255)); d.text((px+30,y2+17),t,font=f,fill=(30,30,30))
bg.save(S+'/teaser/fond2.png')
# aperçu : fond + image vidéo + sous-titre
v=fr.crop((480,0,1440,880)).resize((VW,int(VW*880/960)))  # 1080x990
v=v.crop((0,0,VW,min(VH,v.height)))
prev=bg.copy(); prev.paste(v,(0,VY))
sub=Image.open('/mnt/user-data/outputs/teaser/sub1.png') if False else None
dd=ImageDraw.Draw(prev); f=FN('ExtraBold',62)
for i,l in enumerate(["il se dit : c'est quoi","ces voyous sur le terrain ?"]):
    w=dd.textlength(l,font=f); dd.text(((W-w)/2,VY+v.height-230+i*76),l,font=f,fill=(79,255,190),stroke_width=6,stroke_fill=(0,0,0))
prev.save(S+'/teaser/apercu-teaser.jpg',quality=90); print(v.size)
