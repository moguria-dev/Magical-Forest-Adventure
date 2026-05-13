(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const img = {};
  const srcs = ['bg_stage1','bg_stage2','bg_stage3','tile_forest','tile_crystal','tile_castle','hero','spark_slug','moon_bat','spider_boss','magic_orb'];
  let loaded = 0;
  srcs.forEach(n => { img[n] = new Image(); img[n].src = `assets/${n}.png`; img[n].onload = () => loaded++; });

  const keys = { left:false, right:false, jump:false, fire:false };
  const bind = (id, key) => {
    const b = document.getElementById(id);
    const on = e => { e.preventDefault(); keys[key] = true; b.classList.add('active'); };
    const off = e => { e.preventDefault(); keys[key] = false; b.classList.remove('active'); };
    b.addEventListener('touchstart', on, {passive:false}); b.addEventListener('touchend', off, {passive:false}); b.addEventListener('touchcancel', off, {passive:false});
    b.addEventListener('mousedown', on); window.addEventListener('mouseup', off);
  };
  bind('btnLeft','left'); bind('btnRight','right'); bind('btnJump','jump'); bind('btnFire','fire');
  window.addEventListener('keydown', e => {
    if (['ArrowLeft','a','A'].includes(e.key)) keys.left = true;
    if (['ArrowRight','d','D'].includes(e.key)) keys.right = true;
    if (['ArrowUp','w','W',' '].includes(e.key)) keys.jump = true;
    if (['x','X','Enter'].includes(e.key)) keys.fire = true;
  });
  window.addEventListener('keyup', e => {
    if (['ArrowLeft','a','A'].includes(e.key)) keys.left = false;
    if (['ArrowRight','d','D'].includes(e.key)) keys.right = false;
    if (['ArrowUp','w','W',' '].includes(e.key)) keys.jump = false;
    if (['x','X','Enter'].includes(e.key)) keys.fire = false;
  });
  document.getElementById('restartBtn').onclick = () => reset(0);

  const stages = [
    { name:'STAGE 1  まどろみの森', bg:'bg_stage1', tile:'tile_forest', boss:false,
      platforms:[[0,472,1450,80],[260,382,210,35],[620,330,210,35],[990,388,220,35],[1280,300,180,35]],
      enemies:[[520,330,'slug'],[910,340,'bat'],[1210,250,'slug']], goal:1420 },
    { name:'STAGE 2  星屑クリスタル洞窟', bg:'bg_stage2', tile:'tile_crystal', boss:false,
      platforms:[[0,472,1580,80],[240,380,170,35],[520,315,180,35],[790,390,190,35],[1070,315,180,35],[1320,250,220,35]],
      enemies:[[420,335,'bat'],[720,275,'slug'],[1030,345,'bat'],[1285,205,'slug']], goal:1560 },
    { name:'STAGE 3  蜘蛛の魔城', bg:'bg_stage3', tile:'tile_castle', boss:true,
      platforms:[[0,472,1760,80],[300,390,180,35],[610,320,180,35],[940,390,180,35],[1240,325,160,35]],
      enemies:[[460,345,'slug'],[805,275,'bat'],[1140,345,'bat']], goal:1660 }
  ];

  let stageIndex, stage, hero, camera, bullets, enemyBullets, enemies, boss, particles, messageTimer, gameState, lastFire, prevJump;
  function reset(i=stageIndex||0) {
    stageIndex = i; stage = stages[stageIndex];
    hero = {x:70,y:350,w:58,h:72,vx:0,vy:0,onGround:false,dir:1,hp:100,inv:0,shootCd:0};
    camera = 0; bullets=[]; enemyBullets=[]; particles=[]; messageTimer=140; gameState='play'; lastFire=false; prevJump=false;
    enemies = stage.enemies.map((e,n)=>({x:e[0],y:e[1],w:e[2]==='bat'?62:58,h:e[2]==='bat'?46:42,type:e[2],hp:e[2]==='bat'?2:3,base:e[1],phase:n*1.7,dir:n%2?1:-1,dead:false}));
    boss = stage.boss ? {x:1490,y:292,w:170,h:135,hp:46,maxHp:46,dir:-1,phase:0,shoot:90,dead:false} : null;
    showMessage(stage.name + '<br><small>魔法で道をひらけ！</small>');
  }
  function showMessage(html){ const m=document.getElementById('message'); m.innerHTML=html; m.style.display='block'; messageTimer=145; }
  function rects(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  function damageHero(dmg){ if(hero.inv>0||gameState!=='play') return; hero.hp-=dmg; hero.inv=70; hero.vy=-6; hero.vx=-hero.dir*4; burst(hero.x+hero.w/2,hero.y+hero.h/2,'hit'); if(hero.hp<=0){hero.hp=0; gameState='dead'; showMessage('魔法が尽きてしまった…<br><small>RESTARTで再挑戦</small>');} }
  function burst(x,y,type='spark') { for(let i=0;i<18;i++) particles.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-.8)*5,life:30+Math.random()*20,type}); }
  function platformCollide(o) {
    o.onGround=false;
    for(const p of stage.platforms){
      const r={x:p[0],y:p[1],w:p[2],h:p[3]};
      if(rects(o,r)){
        if(o.vy>=0 && o.y+o.h-o.vy <= r.y+8){ o.y=r.y-o.h; o.vy=0; o.onGround=true; }
        else if(o.vy<0 && o.y-o.vy >= r.y+r.h-8){ o.y=r.y+r.h; o.vy=0; }
        else if(o.vx>0){ o.x=r.x-o.w; o.vx=0; } else if(o.vx<0){ o.x=r.x+r.w; o.vx=0; }
      }
    }
  }
  function update() {
    if(loaded < srcs.length) return;
    if(messageTimer>0){ messageTimer--; if(messageTimer===0) document.getElementById('message').style.display='none'; }
    if(gameState !== 'play') return;
    const accel = 0.78, max = 5.2, friction = 0.78;
    if(keys.left){ hero.vx -= accel; hero.dir=-1; }
    if(keys.right){ hero.vx += accel; hero.dir=1; }
    if(!keys.left&&!keys.right) hero.vx *= friction;
    hero.vx = Math.max(-max, Math.min(max, hero.vx));
    if(keys.jump && !prevJump && hero.onGround){ hero.vy=-13.2; hero.onGround=false; burst(hero.x+hero.w/2,hero.y+hero.h,'jump'); }
    prevJump=keys.jump;
    if(keys.fire && !lastFire && hero.shootCd<=0){
      bullets.push({x:hero.x+hero.w/2+hero.dir*34,y:hero.y+26,w:22,h:22,vx:hero.dir*10,life:90}); hero.shootCd=22; burst(hero.x+hero.w/2+hero.dir*42,hero.y+32,'magic');
    }
    lastFire=keys.fire; if(hero.shootCd>0) hero.shootCd--; if(hero.inv>0) hero.inv--;
    hero.vy += 0.62; hero.x += hero.vx; platformCollide(hero); hero.y += hero.vy; platformCollide(hero);
    if(hero.y>650) damageHero(999);
    hero.x = Math.max(0, Math.min(stage.goal+260, hero.x));
    camera += ((hero.x - W*0.43) - camera)*0.08; camera = Math.max(0, Math.min(stage.goal-W+180, camera));

    bullets.forEach(b=>{ b.x+=b.vx; b.life--; particles.push({x:b.x+11,y:b.y+11,vx:-b.vx*.05+Math.random()-0.5,vy:Math.random()-0.5,life:12,type:'magic'}); });
    bullets = bullets.filter(b=>b.life>0 && b.x>-80 && b.x<stage.goal+420);
    enemyBullets.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.life--; if(rects(hero,b)) { b.life=0; damageHero(13); }});
    enemyBullets = enemyBullets.filter(b=>b.life>0);

    enemies.forEach(e=>{
      if(e.dead) return;
      e.phase += 0.035;
      if(e.type==='bat'){ e.y=e.base+Math.sin(e.phase*3)*36; e.x += Math.sin(e.phase)*1.2; }
      else { e.x += e.dir*1.1; if(Math.sin(e.phase)>0.98) e.dir*=-1; }
      if(rects(hero,e)) damageHero(14);
      bullets.forEach(b=>{ if(rects(b,e)){ b.life=0; e.hp--; burst(b.x,b.y,'magic'); if(e.hp<=0){e.dead=true; burst(e.x+e.w/2,e.y+e.h/2,'hit');} }});
    });

    if(boss && !boss.dead){
      boss.phase += 0.025; boss.y = 292 + Math.sin(boss.phase*2)*20; boss.x += Math.sin(boss.phase*.7)*1.4;
      boss.shoot--; if(boss.shoot<=0){ boss.shoot=55; const dx=(hero.x-boss.x), dy=(hero.y-boss.y); const len=Math.hypot(dx,dy)||1; enemyBullets.push({x:boss.x+70,y:boss.y+65,w:24,h:24,vx:dx/len*4.4,vy:dy/len*4.4,life:160}); }
      if(rects(hero,boss)) damageHero(21);
      bullets.forEach(b=>{ if(rects(b,boss)){ b.life=0; boss.hp--; burst(b.x,b.y,'magic'); if(boss.hp<=0){ boss.dead=true; burst(boss.x+boss.w/2,boss.y+boss.h/2,'hit'); showMessage('蜘蛛のボスを倒した！<br><small>月明かりの王国に平和が戻った</small>'); gameState='clear'; } }});
    }
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life--;}); particles=particles.filter(p=>p.life>0);
    if(!stage.boss && hero.x > stage.goal-30){ reset(stageIndex+1); }
    document.querySelector('#hpBar span').style.width = hero.hp + '%';
    document.getElementById('stageText').textContent = `STAGE ${stageIndex+1}`;
  }

  function drawPlatform(p,tileName){ const [x,y,w,h]=p; const pattern=ctx.createPattern(img[tileName],'repeat'); ctx.save(); ctx.translate(-camera,0); ctx.fillStyle=pattern; ctx.fillRect(x,y,w,h); ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h); ctx.restore(); }
  function draw() {
    ctx.clearRect(0,0,W,H);
    if(loaded < srcs.length){ ctx.fillStyle='#130d2c'; ctx.fillRect(0,0,W,H); ctx.fillStyle='white'; ctx.font='bold 28px system-ui'; ctx.textAlign='center'; ctx.fillText('Loading magic...',W/2,H/2); return; }
    ctx.drawImage(img[stage.bg],0,0,W,H);
    // parallax spark foreground
    ctx.save(); ctx.globalAlpha=.28; ctx.fillStyle='#fff'; for(let i=0;i<36;i++){const x=(i*137-camera*.35)%(W+80)-40, y=70+(i*53)%250; ctx.beginPath(); ctx.arc(x,y,1+(i%3),0,Math.PI*2); ctx.fill();} ctx.restore();
    stage.platforms.forEach(p=>drawPlatform(p,stage.tile));
    enemies.forEach(e=>{ if(e.dead) return; const im=e.type==='bat'?img.moon_bat:img.spark_slug; ctx.drawImage(im,e.x-camera,e.y,e.w,e.h); });
    if(boss && !boss.dead){ ctx.drawImage(img.spider_boss,boss.x-camera,boss.y,boss.w,boss.h); ctx.save(); ctx.translate(-camera,0); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(boss.x,boss.y-24,boss.w,10); ctx.fillStyle='#ff6688'; ctx.fillRect(boss.x,boss.y-24,boss.w*(boss.hp/boss.maxHp),10); ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.strokeRect(boss.x,boss.y-24,boss.w,10); ctx.restore(); }
    bullets.forEach(b=>ctx.drawImage(img.magic_orb,b.x-camera-10,b.y-10,44,44));
    enemyBullets.forEach(b=>{ ctx.save(); ctx.translate(b.x-camera+b.w/2,b.y+b.h/2); ctx.fillStyle='rgba(255,70,120,.32)'; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ff4d7e'; ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.fill(); ctx.restore(); });
    particles.forEach(p=>{ ctx.save(); ctx.globalAlpha=Math.max(0,p.life/42); ctx.fillStyle=p.type==='hit'?'#ff7aa8':p.type==='jump'?'#dff7ff':'#baf8ff'; ctx.beginPath(); ctx.arc(p.x-camera,p.y,2.2,0,Math.PI*2); ctx.fill(); ctx.restore(); });
    ctx.save(); const flicker = hero.inv>0 && Math.floor(hero.inv/5)%2===0; ctx.globalAlpha=flicker ? 0.45 : 1; if(hero.dir<0){ ctx.translate(hero.x-camera+hero.w,hero.y); ctx.scale(-1,1); ctx.drawImage(img.hero,-8,-16,92,104); } else ctx.drawImage(img.hero,hero.x-camera-16,hero.y-16,92,104); ctx.restore();
    // goal sparkle
    if(!stage.boss){ ctx.save(); ctx.translate(stage.goal-camera,405); ctx.globalAlpha=.85; ctx.strokeStyle='#eaffff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,34,0,Math.PI*2); ctx.stroke(); ctx.fillStyle='rgba(160,240,255,.15)'; ctx.beginPath(); ctx.arc(0,0,42+Math.sin(Date.now()/200)*5,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    if(gameState==='clear'){ ctx.save(); ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(0,0,W,H); ctx.restore(); }
  }
  function loop(){ update(); draw(); requestAnimationFrame(loop); }
  reset(0); loop();
})();
