/* 宦途疾行 · 宿敌同僚（全向追吉，强避谪令，碰触击飞） */
const Rivals = (() => {
  const RESPAWN_SEC = 15;
  const COMPANION_NAMES = ['韩彦博', '富子坚'];
  const ROBES = ['#4a5878', '#5a4848'];
  const AVOID_RADIUS = 150;
  const PANIC_RADIUS = 75;
  const AVOID_PUSH = 165;
  const PANIC_PUSH_MULT = 2.2;

  let list = [];
  let onKnockout = null;

  function setOnKnockout(fn) {
    onKnockout = fn;
  }

  function isGoodPickup(p) {
    if (p.meritValue || p.coinValue) return true;
    if (p.color === 'red') return true;
    return false;
  }

  function isBadPickup(p) {
    return p.color === 'blue';
  }

  function spawnPos(layout, slot) {
    const margin = 20;
    const span = Math.max(40, layout.trackWidth - margin * 2);
    const slotBias = slot === 0 ? 0.22 : 0.68;
    return {
      x: layout.trackLeft + margin + (slotBias + (Math.random() - 0.5) * 0.18) * span,
      y: layout.playTop + layout.playHeight * (0.35 + Math.random() * 0.45)
    };
  }

  function create(layout, slot, x, y) {
    const size = Lanes.fitSize(layout, 28, 34);
    const pos = spawnPos(layout, slot);
    return {
      id: 'rival_' + slot,
      slot,
      name: COMPANION_NAMES[slot] || ('宿敌' + slot),
      x: x ?? pos.x,
      y: y ?? pos.y,
      w: size.w,
      h: size.h,
      moveSpeed: Difficulty.rivalSpeed(slot),
      grabCd: 0,
      vx: 0,
      vy: 0,
      chaseKey: null,
      chaseHold: 0,
      pulse: Math.random() * Math.PI * 2,
      robe: ROBES[slot % ROBES.length],
      state: 'active',
      knockVx: 0,
      knockVy: 0,
      knockRot: 0,
      knockRotV: 0,
      knockFlash: 0,
      knockAge: 0,
      fade: 1,
      respawnCd: 0,
      rival: true,
      impeachCd: 6 + slot * 5
    };
  }

  function reset() {
    list = [];
  }

  function seed(layout) {
    list = [create(layout, 0), create(layout, 1)];
  }

  function clampPos(rival, layout) {
    const halfW = rival.w / 2;
    const halfH = rival.h / 2;
    rival.x = Math.max(
      layout.trackLeft + halfW,
      Math.min(layout.trackLeft + layout.trackWidth - halfW, rival.x)
    );
    rival.y = Math.max(
      layout.playTop + halfH,
      Math.min(layout.playTop + layout.playHeight - halfH, rival.y)
    );
  }

  function hitbox(r) {
    const pad = 2;
    return {
      x: r.x - r.w / 2 + pad,
      y: r.y - r.h / 2 + pad,
      w: r.w - pad * 2,
      h: r.h - pad * 2
    };
  }

  function entityBox(e) {
    return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
  }

  function collectGoodItems(pickups, coins, merits) {
    const out = [];
    pickups.forEach((p) => {
      if (isGoodPickup(p)) out.push({ kind: 'pickup', ref: p, x: p.x, y: p.y });
    });
    coins.forEach((c) => out.push({ kind: 'coin', ref: c, x: c.x, y: c.y }));
    merits.forEach((m) => out.push({ kind: 'merit', ref: m, x: m.x, y: m.y }));
    return out;
  }

  function findNearestGood(actor, items, peers) {
    return AiMove.pickTarget(actor, items, peers || list, null);
  }

  function chaseToward(actor, tx, ty, dt) {
    AiMove.steerToward(actor, tx, ty, dt);
  }

  function applyAvoidance(rival, badPickups, dt) {
    AiMove.applyAvoidance(rival, badPickups, {
      radius: AVOID_RADIUS,
      panicRadius: PANIC_RADIUS,
      pushBase: AVOID_PUSH,
      panicMult: PANIC_PUSH_MULT
    }, dt);
  }

  function launchKnockfly(rival, pickupName, reason) {
    const side = Math.random() < 0.5 ? -1 : 1;
    rival.state = 'knockfly';
    rival.knockVx = side * (220 + Math.random() * 110);
    rival.knockVy = -(360 + Math.random() * 130);
    rival.knockRot = side * 0.45;
    rival.knockRotV = side * (11 + Math.random() * 5);
    rival.knockFlash = 0.55;
    rival.knockAge = 0;
    rival.fade = 1;
    const label = reason || `误承${pickupName || '谪令'} · 击飞`;
    EventLog.showQuick(rival.name, label, 'promote');
    if (onKnockout) onKnockout(rival);
  }

  function isLethalObstacle(o) {
    return (o.tier || 1) === 3;
  }

  function tryLethalObstacle(rival, obstacles) {
    if (rival.state !== 'active') return;
    const hb = hitbox(rival);
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!isLethalObstacle(o)) continue;
      const box = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
      if (!Renderer.aabb(hb, box)) continue;
      Spawner.removeObstacle(o);
      obstacles.splice(i, 1);
      launchKnockfly(rival, o.name, `承${o.name || '诏狱'} · 淘汰`);
      return;
    }
  }

  function beginRespawn(rival) {
    rival.state = 'respawn';
    rival.respawnCd = RESPAWN_SEC;
    rival.fade = 0;
  }

  function respawn(rival, layout) {
    rival.state = 'active';
    rival.respawnCd = 0;
    rival.fade = 1;
    rival.moveSpeed = Difficulty.rivalSpeed(rival.slot);
    rival.vx = 0;
    rival.vy = 0;
    const pos = spawnPos(layout, rival.slot);
    rival.x = pos.x;
    rival.y = pos.y;
    rival.grabCd = 0.45;
    rival.impeachCd = 6 + rival.slot * 5;
    clampPos(rival, layout);
  }

  function removeGrabbed(kind, ref) {
    if (kind === 'pickup') Spawner.removePickup(ref);
    else if (kind === 'coin') Spawner.removeCoin(ref);
    else if (kind === 'merit') Spawner.removeMerit(ref);
  }

  function tryGrabGood(rival, goodItems) {
    if (rival.grabCd > 0 || rival.state !== 'active') return;
    const hb = hitbox(rival);
    for (let i = 0; i < goodItems.length; i++) {
      const it = goodItems[i];
      if (!Renderer.aabb(hb, entityBox(it.ref))) continue;
      removeGrabbed(it.kind, it.ref);
      goodItems.splice(i, 1);
      if (it.kind === 'coin') {
        EventLog.showQuick(rival.name, '捷足先登 · 封赏', 'demote');
      } else if (it.kind === 'merit') {
        EventLog.showQuick(rival.name, '捷足先登 · 功劳', 'demote');
      } else {
        EventLog.showQuick(rival.name, `夺去${it.ref.name}`, 'demote');
      }
      rival.grabCd = 0.32;
      return;
    }
  }

  function tryBadContact(rival, badPickups) {
    if (rival.state !== 'active') return;
    const hb = hitbox(rival);
    for (let i = 0; i < badPickups.length; i++) {
      const p = badPickups[i];
      if (!Renderer.aabb(hb, entityBox(p))) continue;
      Spawner.removePickup(p);
      badPickups.splice(i, 1);
      launchKnockfly(rival, p.name);
      return;
    }
  }

  function updateActive(rival, dt, layout, goodItems, badPickups, peers) {
    rival.pulse += dt * 4;
    if (rival.grabCd > 0) rival.grabCd -= dt;
    AiMove.tickHold(rival, dt);
    Difficulty.applyRivalSpeed(rival);

    const target = findNearestGood(rival, goodItems, peers);
    if (target) chaseToward(rival, target.x, target.y, dt);

    AiMove.applySeparation(rival, peers, dt);
    applyAvoidance(rival, badPickups, dt);
    AiMove.integrate(rival, dt);
    AiMove.clampSpeed(rival, rival.moveSpeed * 1.15);

    clampPos(rival, layout);
  }

  function updateKnockfly(rival, dt) {
    rival.knockAge += dt;
    rival.knockFlash = Math.max(0, rival.knockFlash - dt);
    rival.x += rival.knockVx * dt;
    rival.y += rival.knockVy * dt;
    rival.knockVy += 520 * dt;
    rival.knockRot += rival.knockRotV * dt;
    if (rival.knockAge > 1.0) rival.fade = Math.max(0, rival.fade - dt * 0.5);
    if (rival.knockAge > 0.9 && ((rival.fade ?? 1) <= 0 || rival.y < -120)) {
      beginRespawn(rival);
    }
  }

  function updateRespawn(rival, dt, layout) {
    rival.respawnCd -= dt;
    if (rival.respawnCd <= 0) respawn(rival, layout);
  }

  function tick(dt, layout, spawnerState, peers) {
    const goodItems = collectGoodItems(
      spawnerState.pickups,
      spawnerState.coins,
      spawnerState.merits
    );
    const badPickups = spawnerState.pickups.filter(isBadPickup);
    const obstacles = spawnerState.obstacles || [];
    const allPeers = peers || list;

    list.forEach((rival) => {
      if (rival.state === 'knockfly') {
        updateKnockfly(rival, dt);
      } else if (rival.state === 'respawn') {
        updateRespawn(rival, dt, layout);
      } else {
        updateActive(rival, dt, layout, goodItems, badPickups, allPeers);
        tryLethalObstacle(rival, obstacles);
        tryGrabGood(rival, goodItems);
        tryBadContact(rival, badPickups);
      }
    });
  }

  function getList() {
    return list;
  }

  function getActiveCount() {
    return list.filter((r) => r.state === 'active' || r.state === 'knockfly').length;
  }

  return {
    reset, seed, tick, getList, getActiveCount, setOnKnockout, hitbox, knockOut: launchKnockfly
  };
})();
