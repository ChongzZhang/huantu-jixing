/* 宦途疾行 · 地狱难度弹劾弹 */
const Impeachment = (() => {
  const FIRE_CD = 15;
  const PLAYER_SPEED = 580;
  const RIVAL_SPEED = 295;
  const BALL_R = 12;

  let projectiles = [];
  let playerCd = 4;

  function enabled() {
    return typeof Difficulty !== 'undefined' && Difficulty.isHell();
  }

  function reset() {
    projectiles = [];
    playerCd = 4;
  }

  function spawnBall(x, y, tx, ty, speed, side, ownerId) {
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    projectiles.push({
      x,
      y,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      r: BALL_R,
      side,
      ownerId: ownerId || null,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function activeTargets(rivals, npcs) {
    const out = [];
    rivals.forEach((r) => {
      if (r.state === 'active') out.push(r);
    });
    npcs.forEach((n) => {
      if (n.state === 'fall') out.push(n);
    });
    return out;
  }

  function findNearestTarget(px, py, rivals, npcs) {
    let best = null;
    let bestD = Infinity;
    activeTargets(rivals, npcs).forEach((actor) => {
      const d = Math.hypot(actor.x - px, actor.y - py);
      if (d < bestD) {
        bestD = d;
        best = actor;
      }
    });
    return best;
  }

  function calcDodgeChance(actor, player, badPickups) {
    let chance = 0.12;
    const dist = Math.hypot(actor.x - player.x, actor.y - player.y);

    if (dist > 220) chance += 0.28;
    else if (dist > 140) chance += 0.16;
    else if (dist < 75) chance -= 0.08;

    if (actor.grabCd > 0) chance += 0.22;
    if (actor.chaseKey && (actor.chaseHold || 0) > 0) chance += 0.14;

    const sp = Math.hypot(actor.vx || 0, actor.vy || 0);
    if (sp > 55) chance += 0.1;

    if (badPickups?.length) {
      let nearBad = Infinity;
      badPickups.forEach((p) => {
        const d = Math.hypot(actor.x - p.x, actor.y - p.y);
        if (d < nearBad) nearBad = d;
      });
      if (nearBad < 90) chance += 0.2;
      else if (nearBad < 150) chance += 0.1;
    }

    return Math.max(0.04, Math.min(0.78, chance));
  }

  function tryPlayerFire(player, rivals, npcs) {
    if (!enabled() || playerCd > 0) return false;
    const target = findNearestTarget(player.x, player.y, rivals, npcs);
    if (!target) {
      EventLog.showQuick('弹劾', '射程内无同僚', 'demote');
      return false;
    }
    spawnBall(player.x, player.y - 4, target.x, target.y, PLAYER_SPEED, 'player');
    playerCd = FIRE_CD;
    EventLog.showQuick('弹劾', `弹击${target.name}`, 'promote');
    return true;
  }

  function hitPlayerBall(p, player, onDemote) {
    if (p.side !== 'rival' || player.invincible > 0) return false;
    const hb = Player.hitbox(player);
    const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    if (!Renderer.aabb(hb, box)) return false;
    onDemote();
    player.invincible = 1.1;
    return true;
  }

  function hitNpcBall(p, player, rivals, npcs, badPickups) {
    if (p.side !== 'player') return false;
    const targets = activeTargets(rivals, npcs);
    for (let i = 0; i < targets.length; i++) {
      const actor = targets[i];
      const pad = 2;
      const box = {
        x: actor.x - actor.w / 2 + pad,
        y: actor.y - actor.h / 2 + pad,
        w: actor.w - pad * 2,
        h: actor.h - pad * 2
      };
      const pr = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
      if (!Renderer.aabb(box, pr)) continue;

      if (Math.random() < calcDodgeChance(actor, player, badPickups)) {
        EventLog.showQuick(actor.name, '侧身避弹', 'demote');
        return true;
      }

      if (actor.rival) {
        Rivals.knockOut(actor, '弹劾', '承弹劾弹 · 击飞');
      } else {
        Npcs.knockOut(actor, '弹劾', '承弹劾弹 · 击飞');
      }
      return true;
    }
    return false;
  }

  function tick(dt, layout, player, rivals, npcs, badPickups, onPlayerHit) {
    if (!enabled()) {
      projectiles = [];
      return;
    }

    playerCd = Math.max(0, playerCd - dt);

    rivals.forEach((r) => {
      if (r.state !== 'active') return;
      r.impeachCd = (r.impeachCd ?? 8) - dt;
      if (r.impeachCd > 0) return;
      r.impeachCd = FIRE_CD;
      spawnBall(r.x, r.y, player.x, player.y, RIVAL_SPEED, 'rival', r.id);
    });

    const limit = layout.playAreaW + 80;
    const bottom = layout.playTop + layout.playHeight + 60;
    const top = layout.playTop - 60;

    projectiles.forEach((p) => {
      p.pulse = (p.pulse || 0) + dt * 8;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });

    projectiles = projectiles.filter((p) => {
      if (p.x < -40 || p.x > limit || p.y < top || p.y > bottom) return false;
      if (hitPlayerBall(p, player, onPlayerHit)) return false;
      if (hitNpcBall(p, player, rivals, npcs, badPickups)) return false;
      return true;
    });
  }

  function getProjectiles() {
    return projectiles;
  }

  function getPlayerCdLeft() {
    return Math.max(0, playerCd);
  }

  function isPlayerReady() {
    return playerCd <= 0;
  }

  return {
    reset, tick, tryPlayerFire, getProjectiles,
    getPlayerCdLeft, isPlayerReady, enabled, FIRE_CD
  };
})();
