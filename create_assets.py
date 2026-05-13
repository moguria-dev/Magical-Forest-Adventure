from PIL import Image, ImageDraw, ImageFilter
import math, os, random
base='/mnt/data/magic_mouse_adventure/assets'
os.makedirs(base, exist_ok=True)

def save_bg(name, palette, motif):
    w,h=960,540
    img=Image.new('RGBA',(w,h),palette[0])
    d=ImageDraw.Draw(img,'RGBA')
    # gradient sky
    for y in range(h):
        t=y/(h-1)
        c=tuple(int(palette[0][i]*(1-t)+palette[1][i]*t) for i in range(3))+ (255,)
        d.line([(0,y),(w,y)],fill=c)
    # moon/sun glow
    for r in range(160,0,-8):
        a=int(4+55*(1-r/160))
        d.ellipse((690-r,65-r,690+r,65+r),fill=(255,245,210,a))
    d.ellipse((650,25,730,105),fill=(255,238,185,230))
    # stars / sparks
    random.seed(name)
    for _ in range(90):
        x=random.randrange(w); y=random.randrange(10,240); s=random.choice([1,1,2,2,3])
        d.ellipse((x,y,x+s,y+s),fill=(255,245,210,random.randrange(80,200)))
    # motif layers
    if motif=='forest':
        for layer, col, yy, amp in [(0,(34,72,80,160),345,50),(1,(28,95,88,190),390,35),(2,(20,63,64,230),450,25)]:
            pts=[]
            for x in range(-20,w+41,40):
                y=yy+math.sin(x*.012+layer)*amp*0.25+random.randrange(-10,10)
                pts.append((x,y))
            pts += [(w,h),(-20,h)]
            d.polygon(pts, fill=col)
            for x in range(0,w,70):
                trunk=(x+layer*25, yy-10+random.randrange(-10,20))
                d.rectangle((trunk[0]-5,trunk[1],trunk[0]+5,h),fill=(25,45,48,130))
                d.ellipse((trunk[0]-35,trunk[1]-45,trunk[0]+35,trunk[1]+25),fill=(40,135,100,120))
    elif motif=='crystal':
        for i in range(26):
            x=random.randrange(-50,w); y=random.randrange(250,510); hh=random.randrange(80,210); ww=random.randrange(24,65)
            col=random.choice([(91,206,255,95),(190,128,255,80),(110,255,220,70)])
            d.polygon([(x,y),(x+ww//2,y-hh),(x+ww,y),(x+ww//2,y+25)],fill=col,outline=(230,255,255,90))
        for x in range(0,w,90):
            d.arc((x,300,x+120,500),0,180,fill=(255,255,255,30),width=2)
    else:
        # castle/cave boss arena
        for x in range(-40,w+80,120):
            d.rectangle((x,235,x+70,520),fill=(48,35,72,155))
            d.polygon([(x,235),(x+35,180),(x+70,235)],fill=(70,45,92,165))
            for yy in range(285,500,60):
                d.rectangle((x+22,yy,x+48,yy+30),fill=(255,180,100,50))
        for _ in range(65):
            x=random.randrange(w); y=random.randrange(250,520)
            d.line((x,y,x+random.randrange(-20,20),y+random.randrange(10,45)),fill=(255,255,255,30),width=1)
    img=img.filter(ImageFilter.GaussianBlur(0.2))
    img.save(os.path.join(base,name))

save_bg('bg_stage1.png',[(40,96,132),(119,71,142)],'forest')
save_bg('bg_stage2.png',[(31,46,104),(87,34,125)],'crystal')
save_bg('bg_stage3.png',[(28,18,54),(95,31,77)],'castle')

def tile(name, basecol, accent):
    img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
    d.rounded_rectangle((2,18,126,126),radius=14,fill=basecol,outline=(255,255,255,55),width=3)
    d.rectangle((2,18,126,52),fill=accent)
    for i in range(9):
        x=(i*31+17)%120
        d.ellipse((x,26,x+10,36),fill=(255,255,255,60))
    for _ in range(18):
        x=random.randrange(5,120); y=random.randrange(56,120)
        d.line((x,y,x+random.randrange(-8,9),y+random.randrange(-4,5)),fill=(0,0,0,35),width=1)
    img.save(os.path.join(base,name))

tile('tile_forest.png',(79,62,68,255),(80,185,118,255))
tile('tile_crystal.png',(48,67,120,255),(120,229,255,230))
tile('tile_castle.png',(67,50,87,255),(152,94,168,230))

# sprites 128x128

def glow_circle(d,cx,cy,r,col):
    for rr in range(r,0,-6):
        a=int(col[3]*(1-rr/r)*0.35)
        d.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),fill=col[:3]+(a,))

img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
# cape behind
for off,a in [(8,150),(0,230),(-5,180)]:
    d.polygon([(62,45),(31+off,101),(88+off,110),(78,52)],fill=(128,45,175,a),outline=(255,190,255,60))
# ears head body
for x in [44,84]:
    d.ellipse((x-20,12,x+20,52),fill=(66,60,80,255),outline=(232,210,255,100),width=3)
    d.ellipse((x-10,22,x+10,43),fill=(236,174,213,230))
d.ellipse((39,22,91,76),fill=(76,69,88,255),outline=(255,255,255,100),width=3)
d.ellipse((54,50,102,112),fill=(92,82,112,255),outline=(255,255,255,80),width=3)
d.ellipse((51,42,58,50),fill=(255,255,255,255)); d.ellipse((73,42,80,50),fill=(255,255,255,255))
d.ellipse((54,44,58,50),fill=(20,20,30,255)); d.ellipse((73,44,77,50),fill=(20,20,30,255))
d.polygon([(62,53),(68,53),(65,58)],fill=(28,20,30,255))
d.arc((55,55,75,68),10,170,fill=(255,210,230,230),width=2)
# arm wand/finger magic
for p in [((91,66),(117,52)),((50,80),(31,94))]: d.line(p,fill=(92,82,112,255),width=10)
d.ellipse((110,45,124,58),fill=(92,82,112,255))
glow_circle(d,122,47,18,(130,235,255,210)); d.ellipse((116,41,128,53),fill=(205,255,255,245))
# feet
for box in [(50,105,72,119),(77,105,103,119)]: d.ellipse(box,fill=(38,35,52,255))
img.save(os.path.join(base,'hero.png'))

# enemies
for name,col,kind in [('spark_slug.png',(112,228,132,255),'slug'),('moon_bat.png',(78,75,130,255),'bat')]:
    img=Image.new('RGBA',(96,96),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
    if kind=='slug':
        glow_circle(d,48,52,38,(140,255,170,120)); d.rounded_rectangle((14,35,82,72),radius=24,fill=col,outline=(235,255,220,110),width=3)
        d.ellipse((33,44,40,52),fill=(20,30,28,255)); d.ellipse((56,44,63,52),fill=(20,30,28,255))
        d.arc((36,55,62,66),0,180,fill=(20,70,50,200),width=2)
    else:
        d.polygon([(48,34),(10,20),(25,58)],fill=col,outline=(210,200,255,100))
        d.polygon([(48,34),(86,20),(71,58)],fill=col,outline=(210,200,255,100))
        d.ellipse((31,30,65,70),fill=(58,52,104,255),outline=(255,255,255,80),width=2)
        d.ellipse((39,43,45,50),fill=(255,220,120,255)); d.ellipse((52,43,58,50),fill=(255,220,120,255))
    img.save(os.path.join(base,name))

img=Image.new('RGBA',(220,180),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
glow_circle(d,110,88,85,(155,55,210,160))
for side in [-1,1]:
    for i,y in enumerate([56,75,94,113]):
        d.line((110+side*45,y,110+side*(85+12*i),y-22+8*i),fill=(52,37,72,255),width=10)
        d.ellipse((110+side*(84+12*i)-8,y-28+8*i,110+side*(84+12*i)+8,y-12+8*i),fill=(38,28,56,255))
d.ellipse((54,35,166,132),fill=(54,38,75,255),outline=(230,190,255,110),width=4)
d.ellipse((72,54,100,82),fill=(250,70,90,255)); d.ellipse((120,54,148,82),fill=(250,70,90,255))
d.ellipse((81,62,91,75),fill=(35,8,20,255)); d.ellipse((129,62,139,75),fill=(35,8,20,255))
for x in [88,102,118,132]: d.line((x,94,x-5,111),fill=(255,245,220,230),width=3)
d.arc((78,85,145,118),10,170,fill=(255,210,220,230),width=3)
img.save(os.path.join(base,'spider_boss.png'))

img=Image.new('RGBA',(64,64),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
glow_circle(d,32,32,31,(128,240,255,255)); d.ellipse((18,18,46,46),fill=(215,255,255,245),outline=(98,215,255,230),width=3)
d.line((23,32,41,32),fill=(255,255,255,220),width=3); d.line((32,23,32,41),fill=(255,255,255,220),width=3)
img.save(os.path.join(base,'magic_orb.png'))

img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
for r in range(54,0,-6): d.ellipse((64-r,64-r,64+r,64+r),fill=(255,255,255,int(20+90*(1-r/54))))
d.rounded_rectangle((18,18,110,110),radius=28,fill=(255,255,255,48),outline=(255,255,255,135),width=4)
img.save(os.path.join(base,'button.png'))

# icon
img=Image.new('RGBA',(512,512),(34,28,64,255)); d=ImageDraw.Draw(img,'RGBA')
for r in range(250,0,-12): d.ellipse((256-r,256-r,256+r,256+r),fill=(95,60,170,int(3+80*(1-r/250))))
d.ellipse((88,80,222,214),fill=(70,62,92)); d.ellipse((290,80,424,214),fill=(70,62,92))
d.polygon([(260,195),(110,440),(408,430)],fill=(135,49,175))
d.ellipse((145,145,367,350),fill=(83,76,99),outline=(255,255,255,120),width=8)
d.ellipse((200,220,230,252),fill=(255,255,255)); d.ellipse((282,220,312,252),fill=(255,255,255))
d.ellipse((211,225,224,248),fill=(20,20,30)); d.ellipse((293,225,306,248),fill=(20,20,30))
glow_circle(d,360,185,70,(120,235,255,240)); d.ellipse((333,158,387,212),fill=(220,255,255,245))
img.save(os.path.join(base,'icon.png'))
