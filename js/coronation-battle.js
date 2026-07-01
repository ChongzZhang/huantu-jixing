/* 宦途疾行 · 黄袍加身终局 — 飞机大战式逼宫战 */
const CoronationBattle = (() => {
  const TOTAL = 50;
  const SPAWN_INTERVAL = 1;
  const WAVE_SIZES = [17, 17, 16];
  const WAVE_PAUSE = 2.5;
  const BALL_R = 12;
  const PLAYER_FIRE_CD = 0.3;
  const PLAYER_BULLET_SPEED = 500;
  const ALLY_BULLET_SPEED = 420;
  const ENEMY_BULLET_SPEED = 195;
  const PLAYER_MOVE_SPEED = 240;
  const ENEMY_DRIFT = 42;
  const ALLY_DRIFT = 28;
  const PLAYER_MAX_HITS = 3;
  const UNIT_MAX_HITS = 2;
  const LIGHT_DROP_CHANCE = 0.3;
  const LIGHT_INVINCIBLE = 10;
  const HIT_IFRAME = 0.55;

  const SURNAMES = ['辽', '西夏', '吐蕃', '大理', '回鹘', '契丹', '女真', '蒙古', '金', '夏'];
  const GIVEN = ['先锋', '偏将', '都尉', '校尉', '弓手', '铁骑', '伏兵', '斥候', '牙将', '统制'];

  const ENEMY_FIRE_MIN = 1.6;
  const ENEMY_FIRE_MAX = 3.0;

  let active = false;
  let allies = [];
  let enemies = [];
  let bullets = [];
  let drops = [];
  let spawnCount = 0;
  let spawnAcc = 0;
  let waveIdx = 0;
  let wavePause = 0;
  let playerHits = 0;
  let playerFireCd = 0;
  let hitFlash = 0;

  function reset() {
    active = false;
    allies = [];
    enemies = [];
    bullets = [];
    drops = [];
    spawnCount = 0;
    spawnAcc = 0;
    waveIdx = 0;
    wavePause = 0;
    playerHits = 0;
    playerFireCd = 0;
    hitFlash = 0;
  }

  function randomEnemyName() {
    const a = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const b = GIVEN[Math.floor(Math.random() * GIVEN.length)];
    return a + b;
  }

  function adoptUnit(src, side) {
    if (!src || src.state === 'knockfly' || (src.fade ?? 1) < 0.15) return null;
    return {
      id: src.id || ('ally_' + Math.random()),
      name: src.name,
      x: src.x,
      y: src.y,
      w: src.w,
      h: src.h,
      robe: side === 'ally' ? (src.robe || '#3a5a6a') : '#6a2828',
      pulse: src.pulse || 0,
      state: 'active',
      side,
      hits: 0,
      maxHits: UNIT_MAX_HITS,
      fireCd: 0.6 + Math.random() * 1.2,
      vx: 0,
      vy: ALLY_DRIFT,
      battle: true
    };
  }

  function spawnEnemy(layout) {
    const size = Lanes.fitSize(layout, 26, 32);
    const margin = size.w / 2 + 6;
    const span = Math.max(20, layout.trackWidth - margin * 2);
    enemies.push({
      id: 'foe_' + spawnCount,
      name: randomEnemyName(),
      x: layout.trackLeft + margin + Math.random() * span,
      y: layout.playTop + 18,
      w: size.w,
      h: size.h,
      robe: '#5a2020',
      pulse: Math.random() * Math.PI * 2,
      state: 'active',
      side: 'enemy',
      hits: 0,
      maxHits: UNIT_MAX_HITS,
      fireCd: 0.8 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 30,
      vy: ENEMY_DRIFT,
      battle: true
    });
    spawnCount += 1;
  }

  function start(layout, npcList, rivalList) {
    reset();
    active = true;
    npcList.forEach((n) => {
      const u = adoptUnit(n, 'ally');
      if (u) allies.push(u);
    });
    rivalList.forEach((r) => {
      const u = adoptUnit(r, 'ally');
      if (u) allies.push(u);
    });
    spawnAcc = 0.4;
    EventLog.showQuick('黄袍加身', '同僚归心！击退三波敌兵即登基！', 'promote');
  }

  function isActive() {
    return active;
  }

  function spawnBall(x, y, tx, ty, speed, side) {
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    bullets.push({
      x,
      y,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      r: BALL_R,
      side,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function tryPlayerFire(player) {
    if (!active || playerFireCd > 0) return false;
    const target = nearestEnemy(player);
    if (!target) return false;
    spawnBall(player.x, player.y - 6, target.x, target.y, PLAYER_BULLET_SPEED, 'player');
    playerFireCd = PLAYER_FIRE_CD;
    return true;
  }

  function unitBox(u) {
    const pad = 2;
    return {
      x: u.x - u.w / 2 + pad,
      y: u.y - u.h / 2 + pad,
      w: u.w - pad * 2,
      h: u.h - pad * 2
    };
  }

  function clampUnit(u, layout) {
    const halfW = u.w / 2;
    const halfH = u.h / 2;
    u.x = Math.max(
      layout.trackLeft + halfW,
      Math.min(layout.trackLeft + layout.trackWidth - halfW, u.x)
    );
    u.y = Math.max(
      layout.playTop + halfH,
      Math.min(layout.playTop + layout.playHeight - halfH, u.y)
    );
  }

  function nearestEnemy(from) {
    let best = null;
    let bestD = Infinity;
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }

  function nearestAlly(from) {
    let best = null;
    let bestD = Infinity;
    allies.forEach((a) => {
      const d = Math.hypot(a.x - from.x, a.y - from.y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    });
    return best;
  }

  function trySpawn(dt, layout) {
    if (spawnCount >= TOTAL) return;
    if (wavePause > 0) {
      wavePause -= dt;
      return;
    }
    spawnAcc += dt;
    while (spawnAcc >= SPAWN_INTERVAL && spawnCount < TOTAL) {
      spawnAcc -= SPAWN_INTERVAL;
      spawnEnemy(layout);
      if (spawnCount === WAVE_SIZES[0] || spawnCount === WAVE_SIZES[0] + WAVE_SIZES[1]) {
        waveIdx += 1;
        wavePause = WAVE_PAUSE;
        if (waveIdx < WAVE_SIZES.length) {
          EventLog.showQuick('敌兵波次', `第 ${waveIdx + 1} 波将至……`, 'demote');
        }
        break;
      }
    }
  }

  function updateEnemyMotion(e, player, layout, dt) {
    const density = Math.min(1, spawnCount / TOTAL);
    const cluster = 0.45 + density * 1.1;

    const toPx = player.x - e.x;
    const steerCap = 55 + density * 65;
    const steerX = Math.sign(toPx) * Math.min(Math.abs(toPx), steerCap);
    e.vx = e.vx * 0.86 + steerX * dt * (1.4 + density * 2.2);

    let avgX = 0;
    let avgY = 0;
    let near = 0;
    enemies.forEach((o) => {
      if (o === e) return;
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d > 72 || d < 4) return;
      avgX += o.x;
      avgY += o.y;
      near += 1;
    });
    if (near > 0) {
      avgX /= near;
      avgY /= near;
      e.vx += (avgX - e.x) * (0.14 + density * 0.22) * dt;
      e.y += (avgY - e.y) * (0.06 + density * 0.1) * dt;
    }

    e.vy = ENEMY_DRIFT * (0.75 + density * 0.55);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    clampUnit(e, layout);
  }

  function tick(dt, layout, player, input) {
    if (!active) return null;

    playerFireCd = Math.max(0, playerFireCd - dt);
    hitFlash = Math.max(0, hitFlash - dt);
    if (player.invincible > 0) player.invincible -= dt;

    const mv = input.getMoveVector();
    let dx = mv.x;
    let dy = mv.y;
    if (dx === 0 && dy === 0 && input.isActive()) {
      const pos = input.getPos();
      const tx = pos.x - player.x;
      const ty = pos.y - player.y;
      const d = Math.hypot(tx, ty);
      if (d > 14) {
        dx = tx / d;
        dy = ty / d;
      }
    }
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      const spd = PLAYER_MOVE_SPEED * dt;
      const p = Player.clampPos(
        player, layout,
        player.x + (dx / len) * spd,
        player.y + (dy / len) * spd
      );
      player.x = p.x;
      player.y = p.y;
    }

    trySpawn(dt, layout);

    enemies.forEach((e) => {
      e.pulse = (e.pulse || 0) + dt * 4;
      updateEnemyMotion(e, player, layout, dt);
      e.fireCd -= dt;
      if (e.fireCd > 0) return;
      e.fireCd = ENEMY_FIRE_MIN + Math.random() * (ENEMY_FIRE_MAX - ENEMY_FIRE_MIN);
      const tx = player.x + (Math.random() - 0.5) * 16;
      const ty = player.y;
      spawnBall(e.x, e.y + e.h / 2, tx, ty, ENEMY_BULLET_SPEED, 'enemy');
    });

    allies.forEach((a) => {
      a.pulse = (a.pulse || 0) + dt * 4;
      const target = nearestEnemy(a);
      if (target) {
        const steer = Math.sign(target.x - a.x) * 40;
        a.vx = steer;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      clampUnit(a, layout);
      a.fireCd -= dt;
      if (a.fireCd > 0) return;
      a.fireCd = 1.6 + Math.random() * 1.2;
      const foe = nearestEnemy(a);
      if (!foe) return;
      spawnBall(a.x, a.y - 4, foe.x, foe.y, ALLY_BULLET_SPEED, 'ally');
    });

    bullets.forEach((b) => {
      b.pulse = (b.pulse || 0) + dt * 8;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });

    drops.forEach((d) => {
      d.pulse = (d.pulse || 0) + dt * 6;
      d.y += d.vy * dt;
    });

    const limitX = layout.playAreaW + 60;
    const top = layout.playTop - 40;
    const bottom = layout.playTop + layout.playHeight + 40;

    bullets = bullets.filter((b) => {
      if (b.x < -30 || b.x > limitX || b.y < top || b.y > bottom) return false;

      const br = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };

      if (b.side === 'enemy') {
        if (player.invincible <= 0 && hitFlash <= 0) {
          const pb = Player.hitbox(player);
          if (Renderer.aabb(pb, br)) {
            playerHits += 1;
            hitFlash = HIT_IFRAME;
            player.invincible = Math.max(player.invincible || 0, HIT_IFRAME);
            return false;
          }
        }
        for (let i = 0; i < allies.length; i++) {
          const a = allies[i];
          if (!Renderer.aabb(unitBox(a), br)) continue;
          a.hits += 1;
          if (a.hits >= a.maxHits) allies.splice(i, 1);
          return false;
        }
        return true;
      }

      if (b.side === 'player' || b.side === 'ally') {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!Renderer.aabb(unitBox(e), br)) continue;
          e.hits += 1;
          if (e.hits >= e.maxHits) {
            if (b.side === 'player' && Math.random() < LIGHT_DROP_CHANCE) {
              drops.push({
                x: e.x,
                y: e.y,
                r: 14,
                vy: 55,
                pulse: 0
              });
            }
            enemies.splice(i, 1);
          }
          return false;
        }
      }
      return true;
    });

    drops = drops.filter((d) => {
      if (d.y > bottom) return false;
      const dr = { x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2 };
      if (Renderer.aabb(Player.hitbox(player), dr)) {
        player.invincible = LIGHT_INVINCIBLE;
        EventLog.showQuick('护体神光', `无敌 ${LIGHT_INVINCIBLE} 秒`, 'promote');
        return false;
      }
      return true;
    });

    if (playerHits >= PLAYER_MAX_HITS) return 'lose';
    if (spawnCount >= TOTAL && enemies.length === 0) return 'win';
    return null;
  }

  function getHud() {
    return {
      wave: waveIdx + 1,
      enemiesLeft: enemies.length,
      spawnDone: spawnCount >= TOTAL,
      spawned: spawnCount,
      total: TOTAL,
      playerHits,
      playerMaxHits: PLAYER_MAX_HITS,
      hits: playerHits,
      maxHits: PLAYER_MAX_HITS,
      alliesLeft: allies.length,
      fireReady: playerFireCd <= 0
    };
  }

  function getAllies() { return allies; }
  function getEnemies() { return enemies; }
  function getBullets() { return bullets; }
  function getDrops() { return drops; }

  return {
    reset, start, tick, isActive, tryPlayerFire,
    getAllies, getEnemies, getBullets, getDrops, getHud,
    PLAYER_FIRE_CD, PLAYER_MAX_HITS
  };
})();
