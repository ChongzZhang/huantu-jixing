/* 宦途疾行 · AI 移动（速度驱动、平滑、分散） */
const AiMove = (() => {
  const SEP_RADIUS = 46;
  const SEP_PUSH = 72;

  function targetKey(it) {
    const r = it.ref;
    return r?.uid || r?.id || `${it.kind}_${Math.round(it.x)}_${Math.round(it.y)}`;
  }

  function isActivePeer(p) {
    return p && p.state !== 'knockfly' && p.state !== 'respawn';
  }

  function ensureVel(actor) {
    if (actor.vx == null) actor.vx = 0;
    if (actor.vy == null) actor.vy = 0;
  }

  function blendFactor(rate, dt) {
    return Math.min(1, rate * dt);
  }

  function steerToward(actor, tx, ty, dt) {
    ensureVel(actor);
    const dx = tx - actor.x;
    const dy = ty - actor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      const damp = Math.max(0, 1 - dt * 6);
      actor.vx *= damp;
      actor.vy *= damp;
      return;
    }
    const maxSpd = actor.moveSpeed || 48;
    const desiredVx = (dx / dist) * maxSpd;
    const desiredVy = (dy / dist) * maxSpd;
    const blend = blendFactor(7, dt);
    actor.vx += (desiredVx - actor.vx) * blend;
    actor.vy += (desiredVy - actor.vy) * blend;
  }

  function steerDrift(actor, dy, dt) {
    ensureVel(actor);
    actor.vx *= Math.max(0, 1 - dt * 3);
    const blend = blendFactor(4, dt);
    actor.vy += (dy - actor.vy) * blend;
  }

  function applySeparation(actor, peers, dt) {
    ensureVel(actor);
    let sx = 0;
    let sy = 0;
    peers.forEach((other) => {
      if (other === actor || !isActivePeer(other)) return;
      const dx = actor.x - other.x;
      const dy = actor.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= SEP_RADIUS || dist < 0.01) return;
      const t = (SEP_RADIUS - dist) / SEP_RADIUS;
      const w = t * t;
      sx += (dx / dist) * w;
      sy += (dy / dist) * w;
    });
    const mag = Math.hypot(sx, sy);
    if (mag > 0.01) {
      const push = SEP_PUSH;
      actor.vx += (sx / mag) * push;
      actor.vy += (sy / mag) * push;
    }
  }

  function applyAvoidance(actor, points, opts, dt) {
    ensureVel(actor);
    const radius = opts.radius || 140;
    const panicRadius = opts.panicRadius || 72;
    const pushBase = opts.pushBase || 150;
    const panicMult = opts.panicMult || 2;
    let panic = false;
    let ax = 0;
    let ay = 0;

    points.forEach((p) => {
      const px = p.x ?? p.ref?.x;
      const py = p.y ?? p.ref?.y;
      if (px == null || py == null) return;
      const dx = actor.x - px;
      const dy = actor.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist >= radius || dist < 1) return;
      if (dist < panicRadius) panic = true;
      const t = (radius - dist) / radius;
      const weight = t * t * (dist < panicRadius ? 1.25 : 1);
      ax += (dx / dist) * weight;
      ay += (dy / dist) * weight;
    });

    const mag = Math.hypot(ax, ay);
    if (mag > 0.01) {
      const push = pushBase * (panic ? panicMult : 1.05);
      actor.vx += (ax / mag) * push;
      actor.vy += (ay / mag) * push;
    }
  }

  function integrate(actor, dt) {
    ensureVel(actor);
    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;
  }

  function clampSpeed(actor, maxSpd) {
    ensureVel(actor);
    const sp = Math.hypot(actor.vx, actor.vy);
    if (sp > maxSpd && sp > 0.01) {
      const s = maxSpd / sp;
      actor.vx *= s;
      actor.vy *= s;
    }
  }

  function pickTarget(actor, items, peers, isValid) {
    const claims = new Map();
    peers.forEach((p) => {
      if (p === actor || !p.chaseKey || !isActivePeer(p)) return;
      claims.set(p.chaseKey, (claims.get(p.chaseKey) || 0) + 1);
    });

    if (actor.chaseKey && (actor.chaseHold || 0) > 0) {
      const kept = items.find((it) => targetKey(it) === actor.chaseKey);
      if (kept && (!isValid || isValid(kept))) {
        const d = Math.hypot(kept.x - actor.x, kept.y - actor.y);
        if (d < 440) return kept;
      }
    }

    let best = null;
    let bestScore = Infinity;
    items.forEach((it) => {
      if (isValid && !isValid(it)) return;
      const d = Math.hypot(it.x - actor.x, it.y - actor.y);
      const crowd = (claims.get(targetKey(it)) || 0) * 58;
      const score = d + crowd;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    });

    if (best) {
      const key = targetKey(best);
      if (key !== actor.chaseKey) {
        actor.chaseKey = key;
        actor.chaseHold = 0.5 + Math.random() * 0.4;
      }
    } else {
      actor.chaseKey = null;
      actor.chaseHold = 0;
    }
    return best;
  }

  function tickHold(actor, dt) {
    if (actor.chaseHold > 0) actor.chaseHold -= dt;
  }

  function smoothChase(actor, tx, ty, dt) {
    steerToward(actor, tx, ty, dt);
    integrate(actor, dt);
  }

  function drift(actor, dy, dt) {
    steerDrift(actor, dy, dt);
    integrate(actor, dt);
  }

  return {
    applySeparation, applyAvoidance, steerToward, steerDrift,
    integrate, clampSpeed, pickTarget, tickHold, targetKey,
    smoothChase, drift
  };
})();
