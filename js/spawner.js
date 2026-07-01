/* 宦途疾行 · 生成器（分事件下落速度） */
const Spawner = (() => {
  const LANE_MAP = { left: 0, center: 1, right: 2, any: null };
  const TRACKS = ['benguan', 'sanjie', 'xun', 'jue'];
  const BASE_FALL = 1.0;
  const JITTER = 0.08;

  let obstacles = [];
  let pickups = [];
  let coins = [];
  let merits = [];
  let amnesties = [];
  let specials = [];
  let obsDefs = [];
  let pickDefs = [];
  let timer = 0;
  let pickupAcc = 0;
  let coinAcc = 0;
  let meritAcc = 0;
  let amnestyAcc = 0;
  let specialAcc = 0;
  let obsAcc = 0;
  let coronationRobe = null;
  let coronationMode = false;
  let hellAcc = 0;

  async function load(data) {
    if (data) {
      obsDefs = data.obstacles;
      pickDefs = data.pickups;
      return;
    }
    const d = await DataLoad.loadAll();
    obsDefs = d.obstacles;
    pickDefs = d.pickups;
  }

  function reset() {
    obstacles = [];
    pickups = [];
    coins = [];
    merits = [];
    amnesties = [];
    specials = [];
    timer = 0;
    pickupAcc = 0;
    coinAcc = 0;
    meritAcc = 0;
    amnestyAcc = 0;
    specialAcc = 0;
    obsAcc = 0;
    coronationRobe = null;
    coronationMode = false;
    hellAcc = 0;
  }

  function spawnY(extraJitter) {
    return Lanes.randomSpawnY() - (extraJitter || 0);
  }

  function spawnRateMult() {
    return (1.2 + Math.random() * 0.2) * 1.3;
  }

  function pickWeighted(list, getWeight) {
    if (!list.length) return null;
    const weights = list.map(getWeight);
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return list[0];
    let r = Math.random() * sum;
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[0];
  }

  /** 为单个事件解析下落倍率（可配 fallMult，否则按类型推断） */
  function resolveFallMult(def, kind) {
    if (typeof def.fallMult === 'number') return def.fallMult;

    if (kind === 'coin') return 0.92 + Math.random() * 0.22;

    if (kind === 'obstacle') {
      if (def.tier === 3) return 1.38 + Math.random() * 0.14;
      if (def.tier === 2) return 1.08 + Math.random() * 0.18;
      const slowIds = ['hehu', 'liumin', 'xueye', 'zhangqi', 'xuli'];
      const fastIds = ['feiyu', 'xunjie', 'chaoyi', 'cuikel'];
      if (slowIds.includes(def.id)) return 0.68 + Math.random() * 0.12;
      if (fastIds.includes(def.id)) return 1.18 + Math.random() * 0.14;
      return 0.82 + Math.random() * 0.16;
    }

    if (kind === 'pickup') {
      if (def.meritValue) return 0.9 + Math.random() * 0.16;
      if (def.coinValue) return 0.88 + Math.random() * 0.18;
      if (def.steps === 0) {
        const slowNeutral = ['dingyou', 'chaobai', 'pingdiao'];
        if (slowNeutral.includes(def.id)) return 0.58 + Math.random() * 0.1;
        return 0.72 + Math.random() * 0.12;
      }
      if (def.color === 'blue') {
        if (def.shade === 'dark') return 1.22 + Math.random() * 0.16;
        return 0.98 + Math.random() * 0.14;
      }
      if (def.color === 'red') {
        if (def.shade === 'dark') return 1.1 + Math.random() * 0.14;
        return 0.76 + Math.random() * 0.12;
      }
    }
    return BASE_FALL;
  }

  function attachFallMult(entity, def, kind) {
    const base = resolveFallMult(def, kind);
    entity.fallMult = Math.max(0.5, Math.min(1.65, base * (1 + (Math.random() - 0.5) * JITTER * 2)));
  }

  function resolveLane(def) {
    let lane = LANE_MAP[def.lane];
    if (lane === null) lane = Math.floor(Math.random() * 3);
    return lane;
  }

  function trackNeedWeight(track, rankState) {
    let w = 10;
    const st = rankState?.find((s) => s.track === track);
    if (!st) return w;
    if (st.index < 0) w += 14;
    else if (st.index < st.max) w += 5;
    const poolN = pickDefs.filter((d) => d.track === track && d.steps > 0 && !d.coinValue && !d.meritValue).length;
    w += Math.max(0, 12 - poolN);
    return w;
  }

  function obsWeight(d, progress) {
    if (d.tier === 3) {
      if (progress < 0.12) return 3 + progress * 8;
      return 8 + progress * 24;
    }
    if (d.tier === 2) return 18 + progress * 52;
    return 4 + progress * 10;
  }

  function pickWeight(d, progress) {
    if (d.meritValue) return 12 + progress * 5;
    if (d.coinValue) return 14 + progress * 6;
    let w = 6;
    if (d.color === 'blue' && d.steps > 0) {
      w = 22 + progress * 58;
      if (d.shade === 'dark') w *= 1.35 + progress * 0.6;
    } else if (d.color === 'red' && d.steps > 0) {
      w = Math.max(1.5, 5 - progress * 4);
      if (d.shade === 'dark') w *= 0.6;
    } else if (d.steps === 0) {
      w = d.color === 'blue' ? 10 + progress * 8 : 3 + progress * 3;
    }
    return w;
  }

  function pickBalancedTrack(rankState) {
    return pickWeighted(TRACKS, (t) => trackNeedWeight(t, rankState));
  }

  function pickNegativePickup(progress) {
    const pool = pickDefs.filter((d) => d.color === 'blue' && d.steps > 0);
    if (!pool.length) return null;
    return pickWeighted(pool, (d) => pickWeight(d, progress));
  }

  function pickCoinPickup(progress) {
    const pool = pickDefs.filter((d) => d.coinValue);
    if (!pool.length) return null;
    return pickWeighted(pool, (d) => pickWeight(d, progress));
  }

  function pickMeritPickup(progress) {
    const pool = pickDefs.filter((d) => d.meritValue);
    if (!pool.length) return null;
    return pickWeighted(pool, (d) => pickWeight(d, progress));
  }

  function spawnObstacle(layout, progress, forceHell) {
    const prog = forceHell ? 1 : progress;
    const pool = obsDefs.filter((o) => o.tier === 3 && (forceHell || progress >= 0.08));
    if (!pool.length) return;
    const def = pickWeighted(pool, (d) => obsWeight(d, prog));
    if (!def) return;

    const lane = resolveLane(def);
    const size = Lanes.fitSize(layout, 42, 42);
    const o = {
      ...def,
      y: spawnY(),
      lane,
      w: size.w,
      h: size.h,
      id: def.id + '_' + Date.now() + Math.random()
    };
    attachFallMult(o, def, 'obstacle');
    o.x = Lanes.randomXInLane(lane, layout, o.w / 2);
    Lanes.placeEntity(o, lane, layout);
    obstacles.push(o);
  }

  function spawnSpecial(layout, progress) {
    if (specials.length >= 2) return;
    const pool = obsDefs.filter((o) => o.tier === 1 || o.tier === 2);
    if (!pool.length) return;
    const def = pickWeighted(pool, (d) => (d.tier === 2 ? 14 + progress * 28 : 10 + progress * 18));
    if (!def) return;
    specials.push(ObstacleEvents.createFloating(def, layout, progress));
  }

  function spawnPickup(layout, progress, rankState) {
    let def = null;
    const negBias = 0.62 + progress * 0.34;
    const coinBias = 0.14 + progress * 0.08;
    const meritBias = 0.12 + progress * 0.06;

    if (Math.random() < negBias) {
      def = pickNegativePickup(progress);
    }

    if (!def && Math.random() < meritBias) {
      def = pickMeritPickup(progress);
    }

    if (!def && Math.random() < coinBias) {
      def = pickCoinPickup(progress);
    }

    if (!def && Math.random() < negBias * 0.85) {
      def = pickNegativePickup(progress);
    }

    if (!def && Math.random() < 0.38) {
      const track = pickBalancedTrack(rankState);
      const pool = pickDefs.filter((d) => d.track === track && !d.coinValue && !d.meritValue);
      if (pool.length) {
        def = pickWeighted(pool, (d) => pickWeight(d, progress));
      }
    }

    if (!def) {
      def = pickWeighted(pickDefs, (d) => pickWeight(d, progress));
    }
    if (!def) return;

    const lane = resolveLane(def);
    const size = Lanes.fitSize(layout, 68, 50);
    const p = {
      ...def,
      y: spawnY(Math.random() * 50),
      lane,
      w: size.w,
      h: size.h,
      uid: def.id + '_' + Date.now() + Math.random()
    };
    attachFallMult(p, def, 'pickup');
    p.x = Lanes.randomXInLane(lane, layout, p.w / 2);
    Lanes.placeEntity(p, lane, layout);
    pickups.push(p);
  }

  function spawnBadPickup(layout) {
    let def = pickNegativePickup(1);
    if (!def) {
      const pool = pickDefs.filter((d) => d.color === 'blue');
      def = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    if (!def) return;

    const lane = resolveLane(def);
    const size = Lanes.fitSize(layout, 68, 50);
    const p = {
      ...def,
      y: spawnY(Math.random() * 40),
      lane,
      w: size.w,
      h: size.h,
      uid: def.id + '_hell_' + Date.now() + Math.random()
    };
    attachFallMult(p, def, 'pickup');
    if (coronationMode) p.fallMult = Math.min(1.55, (p.fallMult || 1) * 1.18);
    p.x = Lanes.randomXInLane(lane, layout, p.w / 2);
    Lanes.placeEntity(p, lane, layout);
    pickups.push(p);
  }

  function spawnCoronationRobe(layout) {
    if (coronationRobe || coronationMode) return;
    const size = Lanes.fitSize(layout, 54, 60);
    coronationRobe = {
      name: '黄袍加身',
      x: layout.trackLeft + layout.trackWidth / 2,
      y: layout.playTop - 48,
      lane: 1,
      w: size.w,
      h: size.h,
      fallMult: 0.42,
      pulse: Math.random() * Math.PI * 2,
      flash: 0,
      uid: 'robe_' + Date.now()
    };
    Lanes.placeEntity(coronationRobe, 1, layout);
  }

  function enterCoronationMode() {
    coronationMode = true;
    coronationRobe = null;
    obstacles = [];
    pickups = [];
    coins = [];
    merits = [];
    amnesties = [];
    specials = [];
    hellAcc = 0;
    obsAcc = 0;
    pickupAcc = 0;
  }

  function isCoronationMode() {
    return coronationMode;
  }

  function tickCoronationHell(dt, layout, speed) {
    hellAcc += dt;
    const progressBoost = 1.48;

    while (hellAcc > 0.1) {
      hellAcc -= 0.1;
      if (Math.random() < 0.94) spawnObstacle(layout, 1, true);
      if (Math.random() < 0.88) spawnBadPickup(layout);
      if (Math.random() < 0.55) spawnObstacle(layout, 1, true);
    }

    obstacles.forEach((o) => {
      moveEntity(o, speed, dt, progressBoost);
      keepInLane(o, layout);
    });
    pickups.forEach((p) => {
      moveEntity(p, speed, dt, progressBoost);
      keepInLane(p, layout);
    });

    const limit = (typeof window !== 'undefined' ? window.innerHeight : 900) + 120;
    obstacles = obstacles.filter((o) => o.y < limit);
    pickups = pickups.filter((p) => p.y < limit);
  }

  function tickCoronationRobe(dt, layout, speed) {
    if (!coronationRobe) return;
    coronationRobe.pulse = (coronationRobe.pulse || 0) + dt * 5;
    coronationRobe.flash = (coronationRobe.flash || 0) + dt * 7;
    moveEntity(coronationRobe, speed * 0.5, dt, 1);
    Lanes.placeEntity(coronationRobe, coronationRobe.lane, layout);
    const bottom = layout.playTop + layout.playHeight + 80;
    if (coronationRobe.y > bottom) coronationRobe = null;
  }

  function spawnCoin(layout) {
    const lane = 1;
    const size = Lanes.fitSize(layout, 24, 24);
    const c = {
      y: spawnY(Math.random() * 70),
      lane,
      w: size.w,
      h: size.h,
      value: 55 + Math.floor(Math.random() * 90),
      uid: 'coin_' + Date.now() + Math.random()
    };
    attachFallMult(c, {}, 'coin');
    c.x = Lanes.randomXInLane(lane, layout, c.w / 2);
    Lanes.placeEntity(c, lane, layout);
    coins.push(c);
  }

  function spawnMerit(layout) {
    const lane = Math.random() < 0.5 ? 0 : 2;
    const size = Lanes.fitSize(layout, 24, 24);
    const m = {
      y: spawnY(Math.random() * 70),
      lane,
      w: size.w,
      h: size.h,
      value: 50 + Math.floor(Math.random() * 75),
      uid: 'merit_' + Date.now() + Math.random()
    };
    attachFallMult(m, { fallMult: 0.95 }, 'coin');
    m.x = Lanes.randomXInLane(lane, layout, m.w / 2);
    Lanes.placeEntity(m, lane, layout);
    merits.push(m);
  }

  function spawnAmnesty(layout) {
    if (amnesties.length >= 1) return;
    const lane = Math.floor(Math.random() * 3);
    const size = Lanes.fitSize(layout, 30, 30);
    const a = {
      y: spawnY(Math.random() * 40),
      lane,
      w: size.w,
      h: size.h,
      uid: 'amnesty_' + Date.now() + Math.random()
    };
    attachFallMult(a, { fallMult: 0.88 }, 'coin');
    a.x = Lanes.randomXInLane(lane, layout, a.w / 2);
    Lanes.placeEntity(a, lane, layout);
    amnesties.push(a);
  }

  function keepInLane(entity, layout) {
    Lanes.placeEntity(entity, entity.lane, layout);
  }

  function moveEntity(entity, speed, dt, progressBoost) {
    const mult = (entity.fallMult ?? 1) * progressBoost;
    entity.y += speed * mult * dt;
  }

  function tick(dt, progress, layout, speed, rankState) {
    timer += dt;

    if (coronationMode) {
      return;
    }

    tickCoronationRobe(dt, layout, speed);

    const obsInterval = Math.max(0.16, 1.85 - progress * 1.85);
    const pickInterval = Math.max(0.16, 0.82 - progress * 0.78);
    const coinInterval = Math.max(0.32, 0.78 - progress * 0.42);
    const meritInterval = Math.max(0.34, 0.78 - progress * 0.4);

    const obsChance = 0.64 + progress * 0.48;
    const pickChance = 0.68 + progress * 0.38;
    const coinChance = Math.max(0.38, 0.62 - progress * 0.18);
    const meritChance = Math.max(0.36, 0.6 - progress * 0.16);

    const specialInterval = Math.max(5.5, 9.5 - progress * 2.8);
    const specialChance = 0.22 + progress * 0.12;

    obsAcc += dt;
    pickupAcc += dt;
    coinAcc += dt;
    meritAcc += dt;
    amnestyAcc += dt;
    specialAcc += dt;

    const rateM = spawnRateMult();

    while (obsAcc > obsInterval) {
      obsAcc -= obsInterval;
      if (Math.random() < obsChance * rateM) spawnObstacle(layout, progress);
      if (progress > 0.18 && Math.random() < obsChance * 0.52 * rateM) spawnObstacle(layout, progress);
    }
    while (pickupAcc > pickInterval) {
      pickupAcc -= pickInterval;
      if (Math.random() < Math.min(0.98, pickChance * rateM)) spawnPickup(layout, progress, rankState);
    }
    while (coinAcc > coinInterval) {
      coinAcc -= coinInterval;
      if (Math.random() < Math.min(0.95, coinChance * rateM)) spawnCoin(layout);
    }
    while (meritAcc > meritInterval) {
      meritAcc -= meritInterval;
      if (Math.random() < Math.min(0.95, meritChance * rateM)) spawnMerit(layout);
    }
    const amnestyInterval = 7.5;
    const amnestyChance = 0.038;

    while (amnestyAcc > amnestyInterval) {
      amnestyAcc -= amnestyInterval;
      if (Math.random() < amnestyChance) spawnAmnesty(layout);
    }

    while (specialAcc > specialInterval) {
      specialAcc -= specialInterval;
      if (Math.random() < specialChance) spawnSpecial(layout, progress);
    }

    specials.forEach((s) => { s.pulse = (s.pulse || 0) + dt * 5; s.lifetime -= dt; });
    specials = specials.filter((s) => s.lifetime > 0);

    const progressBoost = 1 + progress * 0.48;

    obstacles.forEach((o) => { moveEntity(o, speed, dt, progressBoost); keepInLane(o, layout); });
    pickups.forEach((p) => { moveEntity(p, speed, dt, progressBoost); keepInLane(p, layout); });
    coins.forEach((c) => { moveEntity(c, speed, dt, 1); keepInLane(c, layout); });
    merits.forEach((m) => { moveEntity(m, speed, dt, 1); keepInLane(m, layout); });

    amnesties.forEach((a) => { moveEntity(a, speed, dt, 1); keepInLane(a, layout); });

    const limit = (typeof window !== 'undefined' ? window.innerHeight : 900) + 120;
    obstacles = obstacles.filter((o) => o.y < limit);
    pickups = pickups.filter((p) => p.y < limit);
    coins = coins.filter((c) => c.y < limit);
    merits = merits.filter((m) => m.y < limit);
    amnesties = amnesties.filter((a) => a.y < limit);
  }

  function getObstacles() { return obstacles; }
  function getPickups() { return pickups; }
  function getCoins() { return coins; }
  function getMerits() { return merits; }
  function removeObstacle(o) { obstacles = obstacles.filter((x) => x !== o); }
  function removePickup(p) { pickups = pickups.filter((x) => x !== p); }
  function removeCoin(c) { coins = coins.filter((x) => x !== c); }
  function removeMerit(m) { merits = merits.filter((x) => x !== m); }

  function getSpecials() { return specials; }
  function removeSpecial(s) { specials = specials.filter((x) => x !== s); }

  function getAmnesties() { return amnesties; }
  function removeAmnesty(a) { amnesties = amnesties.filter((x) => x !== a); }

  function getCoronationRobe() { return coronationRobe; }
  function removeCoronationRobe() { coronationRobe = null; }

  return {
    load, reset, tick,
    getObstacles, getPickups, getCoins, getMerits, getAmnesties, getSpecials,
    removeObstacle, removePickup, removeCoin, removeMerit, removeAmnesty, removeSpecial,
    spawnCoronationRobe, enterCoronationMode, isCoronationMode,
    getCoronationRobe, removeCoronationRobe
  };
})();
