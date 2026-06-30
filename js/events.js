/* 宦途疾行 · 事件与图鉴（提示队列 + 朝报条幅） */
const EventLog = (() => {
  let codex = [];
  let toast = null;
  let toastTimer = 0;
  let toastTotal = 0;
  let queue = [];
  let detail = null;
  let ambientEvents = [];
  let banner = null;
  let bannerAcc = 0;

  const DUR = { pickup: 1.0, quick: 0.65, coin: 0.5, merit: 0.55, promote: 0.9, demote: 0.85, danger: 0.45 };

  async function load(data) {
    if (data?.events) {
      ambientEvents = data.events;
    } else {
      try {
        ambientEvents = await fetch('js/data/events.json').then((r) => r.json());
      } catch {
        ambientEvents = window.HUANTU_GAME_DATA?.events || [];
      }
    }
  }

  function reset() {
    codex = [];
    toast = null;
    toastTimer = 0;
    toastTotal = 0;
    queue = [];
    detail = null;
    banner = null;
    bannerAcc = 0;
  }

  function enqueue(item, dur) {
    queue.push({ ...item, dur });
    if (!toast) showNext();
  }

  function showNext() {
    if (!queue.length) {
      toast = null;
      toastTimer = 0;
      toastTotal = 0;
      return;
    }
    const item = queue.shift();
    toast = { text: item.text, sub: item.sub, kind: item.kind };
    toastTotal = item.dur;
    toastTimer = item.dur;
  }

  function addPickup(entry) {
    const effect = PickupFx.effectLabel(entry);
    if (!codex.find((c) => c.id === entry.id)) {
      codex.push({ ...entry, effect, time: Date.now() });
    }
    enqueue({ text: entry.name, sub: effect, kind: 'pickup' }, DUR.pickup);
  }

  function showDetail(entry) {
    detail = entry;
  }

  function showQuick(text, sub, kind) {
    const k = kind || 'quick';
    enqueue({ text, sub, kind: k }, DUR[k] || DUR.quick);
  }

  function closeDetail() {
    detail = null;
  }

  function tick(dt, progress, panelX, panelW) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) showNext();
    }
    tickBanner(dt, progress, panelX, panelW);
  }

  function tickBanner(dt, progress, panelX, panelW) {
    if (!ambientEvents.length || !panelW) return;
    bannerAcc += dt;
    const interval = Math.max(6, 16 - progress * 8);
    if (!banner && bannerAcc >= interval) {
      bannerAcc = 0;
      const e = randomAmbient();
      if (e) {
        banner = {
          title: e.title,
          brief: e.brief,
          x: panelX + panelW + 8,
          w: Math.min(panelW - 12, 190)
        };
      }
    }
    if (banner) {
      banner.x -= (22 + progress * 18) * dt;
      if (banner.x + banner.w < panelX) banner = null;
    }
  }

  function randomAmbient() {
    return ambientEvents[Math.floor(Math.random() * ambientEvents.length)];
  }

  function getCodex() { return codex; }
  function getToast() { return toast; }
  function getBanner() { return banner; }
  function getToastAlpha() {
    if (!toast || toastTotal <= 0) return 0;
    const t = toastTimer / toastTotal;
    if (t > 0.85) return (1 - t) / 0.15;
    if (t < 0.12) return t / 0.12;
    return 1;
  }
  function getDetail() { return detail; }

  return {
    load, reset, addPickup, showDetail, closeDetail, showQuick,
    tick, randomAmbient, getCodex, getToast, getToastAlpha, getBanner, getDetail
  };
})();
