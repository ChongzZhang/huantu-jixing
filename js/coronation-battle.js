/* 宦途疾行 · 黄袍加身终局 — 飞机大战式逼宫战 */
const CoronationBattle = (() => {
  const TOTAL = 200;
  const ALLY_TARGET = 130;
  const BASE_SPAWN_INTERVAL = 0.78;
  const BASE_SPAWN_BATCH = 2;
  const WAVE_SIZES = [25, 25, 25, 25, 25, 25, 25, 25];
  /** 八轮对战：波次越高略加速（幅度收敛） */
  const WAVE_SPAWN_MULT = [1, 1.14, 1.26, 1.36, 1.44, 1.50, 1.55, 1.58];
  const WAVE_FIRE_MULT = [1, 1.10, 1.20, 1.28, 1.34, 1.38, 1.42, 1.45];
  const WAVE_BREAKS = (() => {
    const out = [];
    let acc = 0;
    for (let i = 0; i < WAVE_SIZES.length - 1; i++) {
      acc += WAVE_SIZES[i];
      out.push(acc);
    }
    return out;
  })();
  const WAVE_PAUSE = 2.5;
  const BALL_R = 12;
  const PLAYER_FIRE_CD = 0.22;
  const PLAYER_BULLET_SPEED = 500;
  const ALLY_BULLET_SPEED = 420;
  const ENEMY_BULLET_SPEED = 200;
  const BOSS_BULLET_SPEED = 225;
  const PLAYER_MOVE_SPEED = 340;
  const TOUCH_LERP = 22;
  const TOUCH_DEADZONE = 5;
  const ENEMY_DRIFT = 78;
  const MINION_DRIFT = 92;
  const ALLY_DRIFT = 28;
  const PLAYER_MAX_HITS = 3;
  const UNIT_MAX_HITS = 2;
  const BOSS_MAX_HITS = 16;
  const LIGHT_DROP_CHANCE = 0.3;
  const LIGHT_INVINCIBLE = 10;
  const HIT_IFRAME = 0.55;
  const ENEMY_FIRE_RATE = 0.88;
  const ENEMY_FIRE_MIN = 1.4 / ENEMY_FIRE_RATE;
  const ENEMY_FIRE_MAX = 2.6 / ENEMY_FIRE_RATE;
  const BOSS_FIRE_MIN = 0.48 / ENEMY_FIRE_RATE;
  const BOSS_FIRE_MAX = 0.72 / ENEMY_FIRE_RATE;
  const BOSS_MINION_INTERVAL = 2.4 / ENEMY_FIRE_RATE;
  const BOSS_MAX_MINIONS = 12;

  function rollEnemyFireCd() {
    const w = combatWaveIndex();
    const min = (1.65 / ENEMY_FIRE_RATE) / WAVE_FIRE_MULT[w];
    const max = (3.1 / ENEMY_FIRE_RATE) / WAVE_FIRE_MULT[w];
    return min + Math.random() * (max - min);
  }

  function combatWaveIndex() {
    if (phase !== 'waves') return WAVE_SIZES.length - 1;
    return Math.min(waveIdx, WAVE_SIZES.length - 1);
  }

  function spawnIntervalForWave() {
    return BASE_SPAWN_INTERVAL / WAVE_SPAWN_MULT[combatWaveIndex()];
  }

  function spawnBatchForWave() {
    return Math.min(5, BASE_SPAWN_BATCH + combatWaveIndex());
  }

  const HIGH_RANKS = [
    '宰相', '枢密使', '参政知事', '尚书令', '侍中', '同平章事',
    '太保', '太傅', '太尉', '节度使', '宣徽使', '枢相',
    '知枢密院', '中书令', '尚书右丞', '翰林承旨', '副枢密使', '参知政事'
  ];
  const FOE_SURNAMES = ['韩', '富', '吕', '晏', '欧阳', '范', '包', '曾', '蔡', '庞', '文', '种'];
  const FOE_GIVEN1 = ['彦', '子', '夷', '元', '公', '君', '仲', '文', '正', '德', '师'];
  const FOE_GIVEN2 = ['博', '坚', '简', '殊', '修', '弼', '拯', '巩', '京', '卞', '通'];
  const ALLY_SURNAMES = ['李', '王', '张', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙'];
  const ALLY_GIVEN1 = ['仲', '彦', '子', '君', '元', '正', '师', '希', '永', '升', '执', '文'];
  const ALLY_GIVEN2 = ['文', '固', '国', '中', '范', '谟', '修', '厚', '言', '之', '道', '甫'];
  const ALLY_ROBES = ['#3a5a6a', '#4a6a7a', '#3a5868', '#456878', '#3d6270'];

  let active = false;
  let phase = 'waves';
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
    phase = 'waves';
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

  function randomFoeIdentity() {
    const rankTitle = HIGH_RANKS[Math.floor(Math.random() * HIGH_RANKS.length)];
    const sn = FOE_SURNAMES[Math.floor(Math.random() * FOE_SURNAMES.length)];
    const g1 = FOE_GIVEN1[Math.floor(Math.random() * FOE_GIVEN1.length)];
    const g2 = FOE_GIVEN2[Math.floor(Math.random() * FOE_GIVEN2.length)];
    const name = sn + g1 + g2;
    return { rankTitle, name };
  }

  function randomAllyName() {
    const sn = ALLY_SURNAMES[Math.floor(Math.random() * ALLY_SURNAMES.length)];
    const g1 = ALLY_GIVEN1[Math.floor(Math.random() * ALLY_GIVEN1.length)];
    const g2 = ALLY_GIVEN2[Math.floor(Math.random() * ALLY_GIVEN2.length)];
    return sn + g1 + g2;
  }

  function makeReinforcementAlly(layout, index) {
    const size = Lanes.fitSize(layout, 22, 28);
    const margin = size.w / 2 + 6;
    const span = Math.max(20, layout.trackWidth - margin * 2);
    const bandTop = layout.playTop + layout.playHeight * 0.48;
    const bandH = layout.playHeight * 0.42;
    return {
      id: 'reinforce_' + index,
      name: randomAllyName(),
      x: layout.trackLeft + margin + Math.random() * span,
      y: bandTop + Math.random() * bandH,
      w: size.w,
      h: size.h,
      robe: ALLY_ROBES[Math.floor(Math.random() * ALLY_ROBES.length)],
      pulse: Math.random() * Math.PI * 2,
      state: 'active',
      side: 'ally',
      hits: 0,
      maxHits: UNIT_MAX_HITS,
      fireCd: 0.4 + Math.random() * 1.4,
      vx: 0,
      vy: ALLY_DRIFT,
      battle: true
    };
  }

  function fillReinforcements(layout) {
    const need = ALLY_TARGET - allies.length;
    for (let i = 0; i < need; i++) {
      allies.push(makeReinforcementAlly(layout, i));
    }
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

  function makeMinion(layout, xHint) {
    const size = Lanes.fitSize(layout, 24, 30);
    const margin = size.w / 2 + 6;
    const span = Math.max(20, layout.trackWidth - margin * 2);
    const id = randomFoeIdentity();
    const x = xHint != null
      ? Math.max(layout.trackLeft + margin, Math.min(layout.trackLeft + layout.trackWidth - margin, xHint + (Math.random() - 0.5) * 50))
      : layout.trackLeft + margin + Math.random() * span;
    return {
      id: 'minion_' + Date.now() + Math.random(),
      rankTitle: id.rankTitle,
      name: id.name,
      x,
      y: layout.playTop + 12,
      w: size.w,
      h: size.h,
      robe: '#5a2020',
      pulse: Math.random() * Math.PI * 2,
      state: 'active',
      side: 'enemy',
      isMinion: true,
      hits: 0,
      maxHits: UNIT_MAX_HITS,
      fireCd: rollEnemyFireCd() * 0.55,
      vx: (Math.random() - 0.5) * 40,
      vy: MINION_DRIFT,
      battle: true
    };
  }

  function spawnWaveEnemy(layout) {
    const size = Lanes.fitSize(layout, 26, 32);
    const margin = size.w / 2 + 6;
    const span = Math.max(20, layout.trackWidth - margin * 2);
    const id = randomFoeIdentity();
    enemies.push({
      id: 'foe_' + spawnCount,
      rankTitle: id.rankTitle,
      name: id.name,
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
      fireCd: rollEnemyFireCd() * 0.7,
      vx: (Math.random() - 0.5) * 36,
      vy: ENEMY_DRIFT,
      battle: true
    });
    spawnCount += 1;
  }

  function spawnBoss(layout) {
    const size = Lanes.fitSize(layout, 46, 54);
    const cx = layout.trackLeft + layout.trackWidth / 2;
    enemies.push({
      id: 'emperor_boss',
      rankTitle: '伪帝',
      name: '赵祯',
      isBoss: true,
      x: cx,
      y: layout.playTop + 52,
      w: size.w,
      h: size.h,
      robe: '#5a0a0a',
      pulse: 0,
      state: 'active',
      side: 'enemy',
      hits: 0,
      maxHits: BOSS_MAX_HITS,
      fireCd: 0.8,
      minionCd: 0.6,
      swayT: 0,
      battle: true
    });
    EventLog.showQuick('逼宫决战', '伪帝御前！击溃方可登基！', 'demote');
  }

  function countMinions() {
    return enemies.filter((e) => e.isMinion).length;
  }

  function getBoss() {
    return enemies.find((e) => e.isBoss) || null;
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
    fillReinforcements(layout);
    spawnAcc = 0.4;
    EventLog.showQuick('八轮对战', `援军${allies.length}人集结！八波尽破，方入逼宫！`, 'promote');
  }

  function skipToBossPhase(layout) {
    phase = 'boss';
    spawnCount = TOTAL;
    waveIdx = WAVE_SIZES.length - 1;
    enemies = [];
    bullets = bullets.filter((b) => b.side !== 'enemy');
    spawnBoss(layout);
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
    const pad = u.isBoss ? 4 : 2;
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
    const boss = getBoss();
    if (boss) return boss;
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

  function trySpawnWaves(dt, layout) {
    if (phase !== 'waves' || spawnCount >= TOTAL) return;
    if (wavePause > 0) {
      wavePause -= dt;
      return;
    }
    spawnAcc += dt;
    const interval = spawnIntervalForWave();
    while (spawnAcc >= interval && spawnCount < TOTAL) {
      spawnAcc -= interval;
      const batch = Math.min(spawnBatchForWave(), TOTAL - spawnCount);
      for (let i = 0; i < batch; i++) {
        spawnWaveEnemy(layout);
        if (WAVE_BREAKS.includes(spawnCount)) {
          waveIdx += 1;
          wavePause = WAVE_PAUSE;
          if (waveIdx < WAVE_SIZES.length) {
            EventLog.showQuick(
              '敌兵波次',
              `第 ${waveIdx + 1} 波将至 · 愈急愈猛……`,
              'demote'
            );
          }
          break;
        }
      }
      if (wavePause > 0) break;
    }
  }

  function beginBossPhase(layout) {
    phase = 'boss';
    bullets = bullets.filter((b) => b.side !== 'enemy');
    spawnBoss(layout);
    EventLog.showQuick('八轮已破', '逼宫决战！击溃伪帝登基！', 'demote');
  }

  function updateEnemyMotion(e, player, layout, dt) {
    const density = Math.min(1, spawnCount / TOTAL);
    const toPx = player.x - e.x;
    const toPy = player.y - e.y;
    const steerCap = 70 + density * 80;
    const steerX = Math.sign(toPx) * Math.min(Math.abs(toPx), steerCap);
    e.vx = e.vx * 0.84 + steerX * dt * (2 + density * 2.8);

    let avgX = 0;
    let avgY = 0;
    let near = 0;
    enemies.forEach((o) => {
      if (o === e || o.isBoss) return;
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d > 72 || d < 4) return;
      avgX += o.x;
      avgY += o.y;
      near += 1;
    });
    if (near > 0) {
      avgX /= near;
      avgY /= near;
      e.vx += (avgX - e.x) * (0.18 + density * 0.28) * dt;
      e.y += (avgY - e.y) * (0.08 + density * 0.14) * dt;
    }

    const rush = ENEMY_DRIFT * (0.95 + density * 0.75);
    const dive = toPy > 0 ? Math.min(toPy * 0.12, 90) : 0;
    e.vy = rush + dive * 0.35;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    clampUnit(e, layout);
  }

  function updateMinionMotion(e, player, layout, dt) {
    const toPx = player.x - e.x;
    const toPy = player.y - e.y;
    e.vx = e.vx * 0.82 + Math.sign(toPx) * Math.min(Math.abs(toPx), 80) * dt * 2.4;
    const rush = MINION_DRIFT + Math.min(Math.max(0, toPy) * 0.15, 100);
    e.vy = rush;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    clampUnit(e, layout);
  }

  function updateBoss(boss, player, layout, dt) {
    boss.pulse = (boss.pulse || 0) + dt * 3.2;
    boss.swayT = (boss.swayT || 0) + dt;
    const cx = layout.trackLeft + layout.trackWidth / 2;
    const sway = Math.sin(boss.swayT * 1.1) * (layout.trackWidth * 0.22);
    boss.x = cx + sway;
    boss.y = layout.playTop + 48 + Math.sin(boss.pulse * 0.5) * 10;
    clampUnit(boss, layout);

    boss.fireCd -= dt;
    if (boss.fireCd <= 0) {
      boss.fireCd = BOSS_FIRE_MIN + Math.random() * (BOSS_FIRE_MAX - BOSS_FIRE_MIN);
      const spread = [-52, -24, 0, 24, 52];
      const speed = BOSS_BULLET_SPEED;
      const by = boss.y + boss.h / 2;
      spread.forEach((off) => {
        spawnBall(boss.x, by, player.x + off, player.y, speed, 'enemy');
      });
    }

    boss.minionCd -= dt;
    if (boss.minionCd <= 0 && countMinions() < BOSS_MAX_MINIONS) {
      boss.minionCd = BOSS_MINION_INTERVAL * (0.82 + Math.random() * 0.36);
      enemies.push(makeMinion(layout, boss.x));
    }
  }

  function tick(dt, layout, player, input) {
    if (!active) return null;

    playerFireCd = Math.max(0, playerFireCd - dt);
    hitFlash = Math.max(0, hitFlash - dt);
    if (player.invincible > 0) player.invincible -= dt;

    const mv = input.getMoveVector();
    let moved = false;
    if (mv.x !== 0 || mv.y !== 0) {
      const len = Math.hypot(mv.x, mv.y) || 1;
      const spd = PLAYER_MOVE_SPEED * dt;
      const p = Player.clampPos(
        player, layout,
        player.x + (mv.x / len) * spd,
        player.y + (mv.y / len) * spd
      );
      player.x = p.x;
      player.y = p.y;
      moved = true;
    }
    if (!moved && input.isActive()) {
      const pos = input.getPos();
      const tx = pos.x - player.x;
      const ty = pos.y - player.y;
      const d = Math.hypot(tx, ty);
      if (d > TOUCH_DEADZONE) {
        const lerp = Math.min(1, dt * TOUCH_LERP);
        const target = Player.clampPos(player, layout, pos.x, pos.y);
        player.x += (target.x - player.x) * lerp;
        player.y += (target.y - player.y) * lerp;
      }
    }

    tryPlayerFire(player);

    if (phase === 'waves') {
      trySpawnWaves(dt, layout);
      if (spawnCount >= TOTAL && enemies.length === 0) {
        beginBossPhase(layout);
      }
    }

    enemies.forEach((e) => {
      e.pulse = (e.pulse || 0) + dt * 4;
      if (e.isBoss) {
        updateBoss(e, player, layout, dt);
        return;
      }
      if (phase === 'boss') {
        updateMinionMotion(e, player, layout, dt);
      } else {
        updateEnemyMotion(e, player, layout, dt);
      }
      e.fireCd -= dt;
      if (e.fireCd > 0) return;
      e.fireCd = rollEnemyFireCd();
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
            const wasBoss = e.isBoss;
            if (b.side === 'player' && !wasBoss && Math.random() < LIGHT_DROP_CHANCE) {
              drops.push({
                x: e.x,
                y: e.y,
                r: 14,
                vy: 55,
                pulse: 0
              });
            }
            enemies.splice(i, 1);
            if (wasBoss) {
              bullets = bullets.filter((bl) => bl.side !== 'enemy');
            }
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
    if (phase === 'boss' && !getBoss()) return 'win';
    return null;
  }

  function getHud() {
    const boss = getBoss();
    return {
      phase,
      wave: phase === 'boss' ? 0 : Math.min(waveIdx + 1, WAVE_SIZES.length),
      waveTotal: WAVE_SIZES.length,
      enemiesLeft: enemies.length,
      spawnDone: spawnCount >= TOTAL,
      spawned: spawnCount,
      total: TOTAL,
      playerHits,
      playerMaxHits: PLAYER_MAX_HITS,
      hits: playerHits,
      maxHits: PLAYER_MAX_HITS,
      alliesLeft: allies.length,
      fireReady: playerFireCd <= 0,
      bossHits: boss ? boss.hits : 0,
      bossMaxHits: BOSS_MAX_HITS,
      bossActive: !!boss
    };
  }

  function getAllies() { return allies; }
  function getEnemies() { return enemies; }
  function getBullets() { return bullets; }
  function getDrops() { return drops; }

  function getPhase() {
    return phase;
  }

  function isWavePhase() {
    return phase === 'waves';
  }

  function isBossPhase() {
    return phase === 'boss';
  }

  return {
    reset, start, tick, isActive, tryPlayerFire, skipToBossPhase,
    getPhase, isWavePhase, isBossPhase,
    getAllies, getEnemies, getBullets, getDrops, getHud,
    PLAYER_FIRE_CD, PLAYER_MAX_HITS
  };
})();
