import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S='/tmp/claude-0/-home-claude/03546910-959d-57c6-934e-eb403f7c9aa7/scratchpad'
FN=lambda w,n: ImageFont.truetype(f'{S}/fnt/Inter-{w}.ttf',n)
W,H=1080,1920
src=Image.open('/mnt/user-data/uploads/Desktop/video-thumbnail-v2-ee432e40-a404-4d1e-aef7-5222ff3158e9-D-1795042053590.png').convert('RGB')
bg=src.crop((1150,0,2365,2160)).resize((W,H),Image.LANCZOS)
a=np.asarray(bg).astype(np.float32)*0.55; im=Image.fromarray(a.astype(np.uint8)); d=ImageDraw.Draw(im)
def box(y,txt,f,pad=(26,16)):
    w=d.textlength(txt,font=f); bb=f.getbbox(txt); h=bb[3]-bb[1]; x=(W-w)/2
    d.rounded_rectangle([x-pad[0],y,x+w+pad[0],y+h+2*pad[1]],radius=14,fill=(0,0,0)); d.text((x,y+pad[1]-bb[1]),txt,font=f,fill=(255,255,255)); return h+2*pad[1]
y=250; y+=box(y,'C\'EST EN LIGNE !!',FN('ExtraBold',72))+16
y+=box(y,'AVEC KÉVIN GALLOU',FN('ExtraBold',52))+12
y+=box(y,'COACH DES U19 NATIONAUX DU FC VERSAILLES',FN('ExtraBold',32),pad=(20,12))
# carte YouTube
cw=980; cx=(W-cw)//2; cy=y+70
th=Image.open('/mnt/user-data/uploads/Desktop/TORSE CONTRE TORSE.png').convert('RGB').resize((cw,int(cw*9/16)),Image.LANCZOS)
card_h=th.height+200
card=Image.new('RGB',(cw,card_h),(18,18,18)); card.paste(th,(0,0)); cd=ImageDraw.Draw(card)
bf=FN('ExtraBold',26); t='NOUVEAU'; tw=cd.textlength(t,font=bf)
cd.rounded_rectangle([cw-tw-44,th.height-56,cw-14,th.height-14],radius=8,fill=(204,0,0)); cd.text((cw-tw-29,th.height-53),t,font=bf,fill=(255,255,255))
av=Image.open('/home/claude/unifoot-tv/public/brand/avatar-unifoot-tv.jpg').convert('RGB').resize((64,64)); m=Image.new('L',(256,256),0); ImageDraw.Draw(m).ellipse([0,0,255,255],fill=255)
card.paste(av,(24,th.height+28),m.resize((64,64)))
cd.text((106,th.height+24),"À 14 ans ? Torse contre torse !",font=FN('Bold',38),fill=(255,255,255))
cd.text((106,th.height+70),"Kick in the Foot avec Kévin Gallou",font=FN('SemiBold',32),fill=(255,255,255))
cd.text((106,th.height+120),"UNIFOOT TV  •  Disponible maintenant",font=FN('Medium',26),fill=(170,170,170))
mk=Image.new('L',(cw*2,card_h*2),0); ImageDraw.Draw(mk).rounded_rectangle([0,0,cw*2-1,card_h*2-1],radius=44,fill=255); mk=mk.resize((cw,card_h),Image.LANCZOS)
sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).rounded_rectangle([cx+6,cy+16,cx+cw+6,cy+card_h+16],radius=22,fill=170); sh=sh.filter(ImageFilter.GaussianBlur(22))
im=Image.composite(Image.new('RGB',(W,H),(0,0,0)),im,sh); im.paste(card,(cx,cy),mk); d=ImageDraw.Draw(im)
# sticker lien (façon Instagram)
y2=cy+card_h+110; f=FN('ExtraBold',44); t='REGARDER L\'ÉPISODE'; tw=d.textlength(t,font=f)
pw=tw+130; px=(W-pw)/2; d.rounded_rectangle([px,y2,px+pw,y2+96],radius=22,fill=(255,255,255))
ix=px+36; iy=y2+48
for dx in (0,22):
    d.rounded_rectangle([ix+dx-2,iy-14,ix+dx+30,iy+14],radius=14,outline=(221,42,123),width=6)
d.text((px+100,y2+20),t,font=f,fill=(30,30,30))
box(y2+130,'AUSSI SUR SPOTIFY',FN('ExtraBold',38),pad=(22,14))
im.save(S+'/demo-promo/story-c-est-en-ligne.jpg',quality=93); print('ok')
