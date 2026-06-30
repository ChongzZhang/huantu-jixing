/* 宦途疾行 · AI 移动（平滑、分散、目标粘性） */
const AiMove = (() => {
  const SEP_RADIUS = 48;
  const SEP_PUSH = 110;

  function targetKey(it) {
    const r = it.ref;
    return r?.uid || r?.id || `${it.kind}_${Math.round(it.x)}_${Math.round(it.y)}`;
  }

  function isActivePeer(p) {
    return p && p.state !== 'knockfly' && p.state !== 'respawn';
  }

  function applySeparation(actor, peers, dt) {
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
      const push = SEP_PUSH * dt;
      actor.x += (sx / mag) * push;
      actor.y += (sy / mag) * push;
    }
  }

  function smoothChase(actor, tx, ty, dt) {
    actor.vx = actor.vx || 0;
    actor.vy = actor.vy || 0;
    const dx = tx - actor.x;
    const dy = ty - actor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      actor.vx *= Math.max(0, 1 - dt * 8);
      actor.vy *= Math.max(0, 1 - dt * 8);
    } else {
      const desiredVx = (dx / dist) * actor.moveSpeed;
      const desiredVy = (dy / dist) * actor.moveSpeed;
      const blend = 1 - Math.exp(-11 * dt);
      actor.vx += (desiredVx - actor.vx) * blend;
      actor.vy += (desiredVy - actor.vy) * blend;
    }
    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;
  }

  function drift(actor, dy, dt) {
    actor.vx = (actor.vx || 0) * Math.max(0, 1 - dt * 4);
    actor.vy = (actor.vy || 0) * Math.max(0, 1 - dt * 4);
    actor.y += dy * dt;
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

  return { applySeparation, smoothChase, drift, pickTarget, tickHold, targetKey };
})();
