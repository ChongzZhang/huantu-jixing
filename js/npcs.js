/* 宦途疾行 · 同僚 NPC — 从天而降、抢拾掉落；承谪则击飞 */
const Npcs = (() => {
  const SURNAMES = ['李', '王', '张', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
  const GIVEN1 = ['仲', '彦', '子', '君', '元', '正', '师', '希', '永', '升', '执', '文', '景', '伯', '叔', '季'];
  const GIVEN2 = ['文', '固', '国', '中', '范', '谟', '修', '厚', '言', '之', '道', '甫', '卿', '明', '远', '达'];
  const ROBES = ['#5a6a7a', '#4a5c68', '#6a5a4a', '#556855', '#5c4a62', '#4a5868'];

  const MAX_ACTIVE = 6;
  const SPAWN_INTERVAL = 9 / 1.35;
  const SPAWN_BATCH = 2;
  const SEED_COUNT = 3;
  const FALL_MULT_BASE = 0.5;
  const FALL_MULT_RANGE = 0.16;
  const AVOID_RADIUS = 140;
  const PANIC_RADIUS = 72;
  const AVOID_PUSH = 150;
  const PANIC_PUSH_MULT = 2;

  let list = [];
  let spawnAcc = 0;
  let onKnockout = null;

  function setOnKnockout(fn) {
    onKnockout = fn;
  }

  function randomName() {
    const a = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const b = GIVEN1[Math.floor(Math.random() * GIVEN1.length)];
    const c = GIVEN2[Math.floor(Math.random() * GIVEN2.length)];
    return a + b + c;
  }

  function uniqueName() {
    let n = randomName();
    let guard = 0;
    while (list.some((npc) => npc.name === n) && guard++ < 12) n = randomName();
    return n;
  }

  function create(layout, lane, yOverride) {
    const size = Lanes.fitSize(layout, 26, 32);
    const ln = lane ?? Math.floor(Math.random() * 3);
    const margin = size.w / 2 + 4;
    const span = Math.max(20, layout.trackWidth - margin * 2);
    return {
      name: uniqueName(),
      lane: ln,
      x: layout.trackLeft + margin + Math.random() * span,
      y: yOverride ?? (Lanes.randomSpawnY() - Math.random() * 60),
      w: size.w,
      h: size.h,
      vx: 0,
      vy: 0,
      chaseKey: null,
      chaseHold: 0,
      fallMult: FALL_MULT_BASE + Math.random() * FALL_MULT_RANGE,
      speedRoll: Math.random(),
      moveSpeed: 0,
      grabCd: 0,
      pulse: Math.random() * Math.PI * 2,
      robe: ROBES[Math.floor(Math.random() * ROBES.length)],
      state: 'fall',
      knockVx: 0,
      knockVy: 0,
      knockRot: 0,
      knockRotV: 0,
      knockFlash: 0,
      knockAge: 0,
      fade: 1,
      exiting: false
    };
  }

  function reset() {
    list = [];
    spawnAcc = 0;
  }

  function seed(layout) {
    list = [];
    for (let i = 0; i < SEED_COUNT; i++) {
      list.push(create(layout, i % 3, Lanes.randomSpawnY() - 30 - i * 70));
    }
  }

  function hitbox(npc) {
    const pad = 3;
    return {
      x: npc.x - npc.w / 2 + pad,
      y: npc.y - npc.h / 2 + pad,
      w: npc.w - pad * 2,
      h: npc.h - pad * 2
    };
  }

  function entityBox(e) {
    return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
  }

  function laneDist(la, lb) {
    return Math.abs(la - lb);
  }

  function isDemotionPickup(ref) {
    return ref.color === 'blue' && ref.steps > 0;
  }

  function collectibles(pickups, coins, merits) {
    const out = [];
    pickups.forEach((p) => out.push({ kind: 'pickup', ref: p, x: p.x, y: p.y, lane: p.lane }));
    coins.forEach((c) => out.push({ kind: 'coin', ref: c, x: c.x, y: c.y, lane: c.lane }));
    merits.forEach((m) => out.push({ kind: 'merit', ref: m, x: m.x, y: m.y, lane: m.lane }));
    return out;
  }

  function isBadPickup(ref) {
    return ref.color === 'blue';
  }

  function applyAvoidance(npc, badPickups, dt) {
    AiMove.applyAvoidance(npc, badPickups, {
      radius: AVOID_RADIUS,
      panicRadius: PANIC_RADIUS,
      pushBase: AVOID_PUSH,
      panicMult: PANIC_PUSH_MULT
    }, dt);
  }

  function clampPos(npc, layout) {
    const halfW = npc.w / 2;
    const halfH = npc.h / 2;
    npc.x = Math.max(
      layout.trackLeft + halfW,
      Math.min(layout.trackLeft + layout.trackWidth - halfW, npc.x)
    );
    npc.y = Math.max(
      layout.playTop + halfH,
      Math.min(layout.playTop + layout.playHeight - halfH, npc.y)
    );
  }

  function chaseToward(npc, tx, ty, dt) {
    AiMove.steerToward(npc, tx, ty, dt);
  }

  function findTarget(npc, items, peers) {
    return AiMove.pickTarget(npc, items, peers, (it) => {
      return !(it.kind === 'pickup' && isBadPickup(it.ref));
    });
  }

  function launchKnockfly(npc, pickupName, reason) {
    const side = Math.random() < 0.5 ? -1 : 1;
    npc.state = 'knockfly';
    npc.knockVx = side * (200 + Math.random() * 140);
    npc.knockVy = -(380 + Math.random() * 160);
    npc.knockRot = side * 0.4;
    npc.knockRotV = side * (10 + Math.random() * 8);
    npc.knockFlash = 0.55;
    npc.knockAge = 0;
    npc.exiting = false;
    npc.fade = 1;
    const label = reason || `承${pickupName || '谪令'} · 击飞`;
    EventLog.showQuick(npc.name, label, 'promote');
    if (onKnockout) onKnockout(npc);
  }

  function isLethalObstacle(o) {
    return (o.tier || 1) === 3;
  }

  function tryLethalObstacle(npc, obstacles) {
    if (npc.state !== 'fall') return;
    const hb = hitbox(npc);
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!isLethalObstacle(o)) continue;
      const box = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
      if (!Renderer.aabb(hb, box)) continue;
      Spawner.removeObstacle(o);
      obstacles.splice(i, 1);
      launchKnockfly(npc, o.name, `承${o.name || '诏狱'} · 淘汰`);
      return;
    }
  }

  function toastForGrab(npc, kind, ref) {
    if (kind === 'coin') {
      EventLog.showQuick(npc.name, '捷足先登 · 封赏', 'demote');
      return;
    }
    if (kind === 'merit') {
      EventLog.showQuick(npc.name, '捷足先登 · 功劳', 'demote');
      return;
    }
    const p = ref;
    if (isDemotionPickup(p)) return;
    if (p.color === 'red' && p.steps > 0) {
      EventLog.showQuick(npc.name, `夺去${p.name}`, 'demote');
    } else {
      EventLog.showQuick(npc.name, `拾得${p.name}`, 'pickup');
    }
  }

  function removeGrabbed(kind, ref) {
    if (kind === 'pickup') Spawner.removePickup(ref);
    else if (kind === 'coin') Spawner.removeCoin(ref);
    else if (kind === 'merit') Spawner.removeMerit(ref);
  }

  function tryGrab(npc, items) {
    if (npc.grabCd > 0 || npc.state !== 'fall') return false;
    const hb = hitbox(npc);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!Renderer.aabb(hb, entityBox(it.ref))) continue;

      const demotion = it.kind === 'pickup' && isDemotionPickup(it.ref);
      removeGrabbed(it.kind, it.ref);
      items.splice(i, 1);

      if (demotion) {
        launchKnockfly(npc, it.ref.name);
      } else {
        toastForGrab(npc, it.kind, it.ref);
        npc.grabCd = 0.35;
      }
      return true;
    }
    return false;
  }

  function updateFall(npc, dt, layout, items, badPickups, speed, progressBoost, peers) {
    npc.pulse += dt * 4;
    if (npc.grabCd > 0) npc.grabCd -= dt;
    AiMove.tickHold(npc, dt);
    Difficulty.applyNpcSpeed(npc);

    const bottom = layout.playTop + layout.playHeight;
    if (npc.y > bottom - npc.h * 0.4) {
      npc.exiting = true;
      npc.fade = Math.max(0, (npc.fade ?? 1) - dt * 0.55);
    }

    const target = findTarget(npc, items, peers);
    if (target) {
      chaseToward(npc, target.x, target.y, dt);
    } else {
      AiMove.steerDrift(npc, speed * npc.fallMult * progressBoost * 0.28, dt);
    }

    AiMove.applySeparation(npc, peers, dt);
    applyAvoidance(npc, badPickups, dt);
    AiMove.integrate(npc, dt);
    AiMove.clampSpeed(npc, npc.moveSpeed * 1.12);

    clampPos(npc, layout);
  }

  function updateKnockfly(npc, dt) {
    npc.knockAge = (npc.knockAge || 0) + dt;
    npc.knockFlash = Math.max(0, npc.knockFlash - dt);
    npc.x += npc.knockVx * dt;
    npc.y += npc.knockVy * dt;
    npc.knockVy += 520 * dt;
    npc.knockRot += npc.knockRotV * dt;
    npc.knockRotV *= 1 - dt * 0.8;
    if (npc.knockAge > 1.4) {
      npc.fade = Math.max(0, (npc.fade ?? 1) - dt * 0.35);
    }
  }

  function shouldRemove(npc, layout) {
    const bottom = layout.playTop + layout.playHeight;

    if (npc.state === 'knockfly') {
      const offTop = npc.y < -220;
      const offSide = npc.x < -150 || npc.x > layout.playAreaW + 150;
      const faded = (npc.fade ?? 1) <= 0;
      return npc.knockAge > 0.85 && (offTop || offSide || faded);
    }

    if (npc.exiting && (npc.fade ?? 1) <= 0) return true;
    return npc.y > bottom + npc.h + 48;
  }

  function tick(dt, layout, player, speed, progress, spawnerState, peers) {
    if (!player) return;

    const progressBoost = 1 + progress * 0.48;
    const allPeers = peers || list;

    spawnAcc += dt;
    while (list.length < MAX_ACTIVE && spawnAcc >= SPAWN_INTERVAL) {
      spawnAcc -= SPAWN_INTERVAL;
      for (let n = 0; n < SPAWN_BATCH && list.length < MAX_ACTIVE; n++) {
        list.push(create(layout));
      }
    }

    const items = collectibles(
      spawnerState.pickups,
      spawnerState.coins,
      spawnerState.merits
    );
    const badPickups = spawnerState.pickups.filter(isBadPickup);

    list.forEach((npc) => {
      if (npc.state === 'knockfly') updateKnockfly(npc, dt);
      else {
        updateFall(npc, dt, layout, items, badPickups, speed, progressBoost, allPeers);
        tryLethalObstacle(npc, spawnerState.obstacles || []);
      }
      tryGrab(npc, items);
    });

    list = list.filter((npc) => !shouldRemove(npc, layout));
  }

  function getList() {
    return list;
  }

  return { reset, seed, tick, getList, hitbox, setOnKnockout };
})();
