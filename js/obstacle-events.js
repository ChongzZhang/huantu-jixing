/* 宦途疾行 · 浮空奏章（碰触获吉，不下落） */
const ObstacleEvents = (() => {
  const GOOD_KINDS_T1 = ['safety', 'integrity', 'merit', 'coin'];
  const LIFETIME = 11;

  function scale(progress) {
    return 1 + progress * 0.35;
  }

  function blank() {
    return {
      safety: 0, integrity: 0, merit: 0, coin: 0,
      promoteTrack: null, promoteSteps: 0,
      demoteTrack: null, demoteSteps: 0,
      eventLabel: '', eventIcon: ''
    };
  }

  function buildGoodTier1(progress) {
    const s = scale(progress);
    const p = blank();
    const kind = GOOD_KINDS_T1[Math.floor(Math.random() * GOOD_KINDS_T1.length)];
    p.eventIcon = '吉';
    if (kind === 'safety') {
      const amt = Math.round((10 + Math.random() * 8) * s);
      p.safety = amt;
      p.eventLabel = `安危+${amt}`;
    } else if (kind === 'integrity') {
      const amt = Math.round((8 + Math.random() * 6) * s);
      p.integrity = amt;
      p.eventLabel = `气节+${amt}`;
    } else if (kind === 'merit') {
      const amt = Math.round((40 + Math.random() * 35) * s);
      p.merit = amt;
      p.eventLabel = `功劳+${amt}`;
    } else {
      const amt = Math.round((35 + Math.random() * 30) * s);
      p.coin = amt;
      p.eventLabel = `封赏+${amt}`;
    }
    return p;
  }

  function buildGoodTier2(o) {
    const track = o.demote || 'benguan';
    const p = blank();
    p.eventIcon = '升';
    p.promoteTrack = track;
    p.promoteSteps = 1;
    p.eventLabel = `${PickupFx.TRACK_LABELS[track] || '官阶'}升一阶`;
    return p;
  }

  function applyPayload(o, p) {
    o.safety = p.safety || 0;
    o.integrity = p.integrity || 0;
    o.merit = p.merit || 0;
    o.coin = p.coin || 0;
    o.promoteTrack = p.promoteTrack;
    o.promoteSteps = p.promoteSteps || 0;
    o.demoteTrack = p.demoteTrack;
    o.demoteSteps = p.demoteSteps || 0;
    o.eventLabel = p.eventLabel;
    o.eventIcon = p.eventIcon;
  }

  /** 奏章碰触：均为吉 */
  function resolveOnContact(o, progress) {
    const payload = o.tier === 1 ? buildGoodTier1(progress) : buildGoodTier2(o);
    applyPayload(o, payload);
    o.eventPolarity = 'good';
    return true;
  }

  function resolveOnClick(o, progress) {
    return resolveOnContact(o, progress);
  }

  function hitTest(o, x, y) {
    const pad = 14;
    return x >= o.x - o.w / 2 - pad && x <= o.x + o.w / 2 + pad
      && y >= o.y - o.h / 2 - pad && y <= o.y + o.h / 2 + pad;
  }

  function randomPos(layout) {
    const margin = 28;
    const minX = layout.trackLeft + margin;
    const maxX = layout.trackLeft + layout.trackWidth - margin;
    const minY = layout.playTop + layout.playHeight * 0.22;
    const maxY = layout.playTop + layout.playHeight * 0.78;
    return {
      x: minX + Math.random() * Math.max(40, maxX - minX),
      y: minY + Math.random() * Math.max(40, maxY - minY)
    };
  }

  function createFloating(def, layout, progress) {
    const pos = randomPos(layout);
    const size = 46 + Math.floor(Math.random() * 8);
    return {
      ...def,
      x: pos.x,
      y: pos.y,
      w: size,
      h: size,
      lifetime: LIFETIME,
      pulse: Math.random() * Math.PI * 2,
      uid: 'spec_' + Date.now() + '_' + Math.random(),
      progress
    };
  }

  return {
    resolveOnContact, resolveOnClick, hitTest, createFloating, LIFETIME
  };
})();
