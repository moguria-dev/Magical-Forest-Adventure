(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const message = document.getElementById('message');
  const W = canvas.width;
  const H = canvas.height;

  const keys = new Set();
  let last = 0;
  let cameraX = 0;
  let shake = 0;
  let magicCooldown = 0;
  let gameState = 'playing';

  const world = {
    width: 3900,
    gravity: 2100,
    floorY: 462,
  };

  const playerStart = { x: 70, y: 360 };
  const player = {
    ...playerStart,
    w: 38,
    h: 54,
    vx: 0,
    vy: 0,
    speed: 350,
    jump: 760,
    facing: 1,
    onGround: false,
    invincible: 0,
    hp: 3,
    stars: 0,
    rescued: false,
  };

  const platforms = [
    { x: 0, y: 492, w: 750, h: 90 },
    { x: 850, y: 492, w: 620, h: 90 },
    { x: 1600, y: 492, w: 620, h: 90 },
    { x: 2370, y: 492, w: 650, h: 90 },
    { x: 3120, y: 492, w: 830, h: 90 },
    { x: 380, y: 378, w: 210, h: 24 },
    { x: 970, y: 388, w: 180, h: 24 },
    { x: 1240, y: 315, w: 210, h: 24 },
    { x: 1740, y: 390, w: 190, h: 24 },
    { x: 2040, y: 325, w: 190, h: 24 },
    { x: 2540, y: 378, w: 220, h: 24 },
    { x: 2830, y: 305, w: 190, h: 24 },
    { x: 3360, y: 380, w: 240, h: 24 },
  ];

  const enemies = [
    { x: 555, y: 450, w: 42, h: 38, min: 500, max: 690, vx: 70, alive: true },
    { x: 1060, y: 450, w: 42, h: 38, min: 910, max: 1350, vx: -90, alive: true },
    { x: 1870, y: 450, w: 42, h: 38, min: 1650, max: 2130, vx: 85, alive: true },
    { x: 2680, y: 450, w: 42, h: 38, min: 2420, max: 2940, vx: -95, alive: true },
    { x: 3460, y: 450, w: 42, h: 38, min: 3210, max: 3740, vx: 110, alive: true },
  ];

  const stars = [];
  [
    [430,340],[520,340],[1010,350],[1110,350],[1300,275],[1400,275],
    [1775,350],[1865,350],[2075,285],[2570,340],[2670,340],
    [2860,265],[2960,265],[3400,342],[3500,342],[3660,430]
  ].forEach(([x,y]) => stars.push({ x, y, r: 13, taken: false, spin: Math.random()*9 }));

  const hazards = [
    { x: 760, y: 502, w: 90, h: 40 },
    { x: 1480, y: 502, w: 105, h: 40 },
    { x: 2230, y: 502, w: 120, h: 40 },
    { x: 3040, y: 502, w: 80, h: 40 },
  ];

  const projectiles = [];
  const goal = { x: 3740, y: 390, w: 70, h: 102 };

  function reset() {
    Object.assign(player, { ...playerStart, vx: 0, vy: 0, facing: 1, onGround: false, invincible: 0, hp: 3, stars: 0, rescued: false });
    stars.forEach(s => s.taken = false);
    enemies.forEach((e, i) => { e.alive = true; e.x = [555,1060,1870,2680,3460][i]; });
    projectiles.length = 0;
    cameraX = 0; shake = 0; magicCooldown = 0; gameState = 'playing';
    message.classList.add('hidden');
  }

  function rects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRect(c, r) {
    const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
    return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r ** 2;
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function hitPlayer() {
    if (player.invincible > 0 || gameState !== 'playing') return;
    player.hp -= 1;
    player.invincible = 1.2;
    player.vx = -player.facing * 360;
    player.vy = -520;
    shake = 10;
    if (player.hp <= 0) {
      gameState = 'dead';
      message.innerHTML = '森の魔法が消えてしまった…<br><small>Rでリスタート</small>';
      message.classList.remove('hidden');
    }
  }

  function castMagic() {
    if (magicCooldown > 0 || gameState !== 'playing') return;
    magicCooldown = .32;
    projectiles.push({
      x: player.x + player.w / 2 + player.facing * 18,
      y: player.y + 22,
      r: 10,
      vx: player.facing * 650,
      life: .8,
    });
  }

  function update(dt) {
    if (keys.has('KeyR')) reset();
    if (gameState !== 'playing') return;

    magicCooldown = Math.max(0, magicCooldown - dt);
    player.invincible = Math.max(0, player.invincible - dt);
    shake = Math.max(0, shake - 30 * dt);

    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const jump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');
    const magic = keys.has('KeyJ') || keys.has('KeyZ');

    player.vx *= Math.pow(0.0008, dt);
    if (left) { player.vx = -player.speed; player.facing = -1; }
    if (right) { player.vx = player.speed; player.facing = 1; }
    if (jump && player.onGround) { player.vy = -player.jump; player.onGround = false; }
    if (magic) castMagic();

    player.vy += world.gravity * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.onGround = false;

    for (const p of platforms) {
      if (rects(player, p)) {
        const prevY = player.y - player.vy * dt;
        const prevX = player.x - player.vx * dt;
        if (prevY + player.h <= p.y && player.vy >= 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (prevY >= p.y + p.h && player.vy < 0) {
          player.y = p.y + p.h;
          player.vy = 0;
        } else if (prevX + player.w <= p.x) {
          player.x = p.x - player.w;
          player.vx = 0;
        } else if (prevX >= p.x + p.w) {
          player.x = p.x + p.w;
          player.vx = 0;
        }
      }
    }

    player.x = Math.max(0, Math.min(world.width - player.w, player.x));
    if (player.y > H + 120) hitPlayer();
    if (player.y > H + 180) { player.x = Math.max(30, cameraX + 40); player.y = 300; player.vy = 0; }

    for (const e of enemies) {
      if (!e.alive) continue;
      e.x += e.vx * dt;
      if (e.x < e.min || e.x > e.max) e.vx *= -1;
      if (rects(player, e)) {
        if (player.vy > 220 && player.y + player.h - e.y < 26) {
          e.alive = false;
          player.vy = -560;
          player.stars += 1;
          shake = 5;
        } else {
          hitPlayer();
        }
      }
    }

    for (const h of hazards) if (rects(player, h)) hitPlayer();

    for (const s of stars) {
      if (!s.taken && circleRect(s, player)) {
        s.taken = true;
        player.stars += 1;
      }
      s.spin += dt * 5;
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const b = projectiles[i];
      b.x += b.vx * dt;
      b.life -= dt;
      for (const e of enemies) {
        if (e.alive && circleRect(b, e)) {
          e.alive = false;
          b.life = -1;
          player.stars += 1;
          shake = 6;
        }
      }
      if (b.life <= 0) projectiles.splice(i, 1);
    }

    if (rects(player, goal)) {
      gameState = 'clear';
      message.innerHTML = `クリア！<br><small>星 ${player.stars} 個を集めました / Rで再挑戦</small>`;
      message.classList.remove('hidden');
    }

    cameraX += ((player.x + player.w/2) - cameraX - W * .42) * Math.min(1, dt * 5);
    cameraX = Math.max(0, Math.min(world.width - W, cameraX));
  }

  function drawStar(x, y, r, spin = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * .45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe36e';
    ctx.fill();
    ctx.strokeStyle = '#fff5bd';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground() {
    const grd = ctx.createLinearGradient(0,0,0,H);
    grd.addColorStop(0, '#15164a');
    grd.addColorStop(.52, '#3c245c');
    grd.addColorStop(1, '#18162a');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle = 'rgba(255, 240, 168, .95)';
    ctx.beginPath();
    ctx.arc(785 - cameraX * .08, 86, 38, 0, Math.PI*2);
    ctx.fill();

    for (let layer = 0; layer < 3; layer++) {
      const par = [.16,.28,.42][layer];
      const base = [420, 445, 474][layer];
      ctx.fillStyle = [`rgba(75,48,112,.72)`,`rgba(50,63,102,.72)`,`rgba(26,59,69,.9)`][layer];
      ctx.beginPath();
      ctx.moveTo(-100, H);
      for (let x = -100; x < W + 180; x += 95) {
        const wx = x + (cameraX * par % 95);
        ctx.lineTo(wx, base - Math.sin((x + cameraX*.05) * .03) * 18);
        ctx.lineTo(wx + 48, base - 82 - layer * 15);
      }
      ctx.lineTo(W + 160, H);
      ctx.closePath();
      ctx.fill();
    }

    for (let i=0; i<80; i++) {
      const x = (i * 211 - cameraX * .22) % (W + 160) - 80;
      const y = 38 + (i * 79) % 250;
      ctx.fillStyle = i % 7 ? 'rgba(255,255,255,.42)' : 'rgba(255,223,102,.72)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawPlatform(p) {
    const x = p.x - cameraX;
    ctx.fillStyle = '#68462d';
    drawRoundedRect(x, p.y, p.w, p.h, 13);
    ctx.fillStyle = '#66b357';
    drawRoundedRect(x, p.y - 12, p.w, 26, 13);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(x + 12, p.y - 7, Math.max(10, p.w - 24), 3);
  }

  function drawEnemy(e) {
    if (!e.alive) return;
    const x = e.x - cameraX;
    ctx.fillStyle = '#2d2244';
    drawRoundedRect(x, e.y, e.w, e.h, 13);
    ctx.fillStyle = '#ff8fb7';
    ctx.beginPath(); ctx.arc(x + 13, e.y + 15, 4, 0, Math.PI*2); ctx.arc(x + 29, e.y + 15, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1b1328';
    ctx.fillRect(x + 9, e.y + 31, 8, 6); ctx.fillRect(x + 25, e.y + 31, 8, 6);
  }

  function drawPlayer() {
    const x = player.x - cameraX;
    const blink = player.invincible > 0 && Math.floor(player.invincible * 20) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(x + player.w/2, player.y + player.h/2);
    ctx.scale(player.facing, 1);

    ctx.fillStyle = '#ffe2b7';
    ctx.beginPath(); ctx.arc(0, -16, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4b2b86';
    drawRoundedRect(-17, -7, 34, 36, 10);
    ctx.fillStyle = '#ffd764';
    ctx.fillRect(-13, 7, 26, 6);
    ctx.fillStyle = '#321a5d';
    ctx.beginPath(); ctx.moveTo(-18,-25); ctx.lineTo(0,-55); ctx.lineTo(18,-25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe36e';
    ctx.beginPath(); ctx.arc(0,-55,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#23152f';
    ctx.beginPath(); ctx.arc(6, -18, 2.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffe2b7';
    ctx.fillRect(13, -1, 20, 8);
    ctx.fillStyle = '#2a2440';
    ctx.fillRect(-13, 27, 10, 18); ctx.fillRect(5, 27, 10, 18);
    ctx.restore();
  }

  function drawGoal() {
    const x = goal.x - cameraX;
    ctx.fillStyle = '#7c5cff';
    drawRoundedRect(x, goal.y, goal.w, goal.h, 18);
    ctx.fillStyle = '#fff0a7';
    ctx.fillRect(x + 30, goal.y + 18, 10, 84);
    drawStar(x + 35, goal.y + 20, 20, performance.now() * .002);
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(0,0,0,.26)';
    drawRoundedRect(18, 16, 300, 46, 16);
    ctx.fillStyle = '#fff7dc';
    ctx.font = '800 20px ui-rounded, system-ui, sans-serif';
    ctx.fillText(`HP ${'♥'.repeat(player.hp)}   星 ${player.stars}`, 36, 46);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    drawRoundedRect(W - 244, 16, 226, 46, 16);
    ctx.fillStyle = '#d8cff8';
    ctx.font = '700 15px ui-rounded, system-ui, sans-serif';
    ctx.fillText('Goal: 魔法の扉まで進もう', W - 224, 45);
  }

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random()-.5)*shake, (Math.random()-.5)*shake);
    drawBackground();
    for (const p of platforms) drawPlatform(p);
    for (const h of hazards) {
      ctx.fillStyle = '#2bb6bf';
      ctx.beginPath();
      for (let x = h.x - cameraX; x < h.x - cameraX + h.w; x += 16) {
        ctx.lineTo(x, h.y + 34);
        ctx.lineTo(x + 8, h.y + 8);
      }
      ctx.lineTo(h.x - cameraX + h.w, h.y + 42); ctx.lineTo(h.x - cameraX, h.y + 42); ctx.closePath(); ctx.fill();
    }
    for (const s of stars) if (!s.taken) drawStar(s.x - cameraX, s.y, s.r, s.spin);
    for (const e of enemies) drawEnemy(e);
    for (const b of projectiles) {
      ctx.fillStyle = 'rgba(135, 237, 255, .9)';
      ctx.beginPath(); ctx.arc(b.x - cameraX, b.y, b.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
    }
    drawGoal();
    drawPlayer();
    drawHud();
    ctx.restore();
  }

  function loop(t) {
    const dt = Math.min(.033, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));

  const touchMap = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space', magic: 'KeyJ' };
  document.querySelectorAll('[data-key]').forEach(btn => {
    const code = touchMap[btn.dataset.key];
    const down = e => { e.preventDefault(); keys.add(code); };
    const up = e => { e.preventDefault(); keys.delete(code); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });

  requestAnimationFrame(loop);
})();
