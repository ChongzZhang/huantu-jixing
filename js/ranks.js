/* 宦途疾行 · 官职四线 */
const Ranks = (() => {
  const TRACKS = ['benguan', 'sanjie', 'xun', 'jue'];
  const LABELS = { benguan: '本官', sanjie: '散阶', xun: '勋', jue: '爵' };
  let guanzhi = null;
  let ladder = null;
  let ranksById = null;
  const idx = { benguan: 0, sanjie: 0, xun: -1, jue: -1 };
  const flash = { benguan: 0, sanjie: 0, xun: 0, jue: 0 };

  async function load(data) {
    if (data) {
      guanzhi = data.guanzhi;
      ladder = data.ladder;
      ranksById = data.ranksById;
    } else {
      const d = await DataLoad.loadAll();
      guanzhi = d.guanzhi;
      ladder = d.ladder;
      ranksById = d.ranksById;
    }
    reset();
  }

  function reset() {
    idx.benguan = ladder.startIndex.benguan;
    idx.sanjie = ladder.startIndex.sanjie;
    idx.xun = ladder.startIndex.xun;
    idx.jue = ladder.startIndex.jue;
    TRACKS.forEach((t) => { flash[t] = 0; });
  }

  function resolveRank(track, index) {
    if (index < 0) return { name: '未授', pin: '—' };
    const id = ladder[track][index];
    if (!id) return { name: '—', pin: '—' };
    if (ranksById && ranksById[id]) return ranksById[id];
    const r = guanzhi?.[track]?.ranks?.find((x) => x.id === id);
    return r || { name: id, pin: '—' };
  }

  function promote(track, steps) {
    if (steps <= 0) return;
    if (idx[track] < 0) idx[track] = 0;
    const max = ladder.winIndex[track];
    idx[track] = Math.min(max, idx[track] + steps);
    flash[track] = 0.6;
  }

  function demote(track, steps) {
    if (steps <= 0) return { ok: true };
    if (idx[track] < 0) return { ok: true, noop: true };
    const minIdx = ladder.startIndex[track] ?? 0;
    if (track === 'benguan' && idx.benguan <= minIdx) {
      return { ok: false, gameOver: true, reason: '本官贬尽，仕途断绝' };
    }
    idx[track] = Math.max(minIdx, idx[track] - steps);
    flash[track] = 0.6;
    if (track === 'benguan') {
      const sub = demote('sanjie', steps);
      if (!sub.ok) return sub;
    }
    return { ok: true };
  }

  function applyPickup(p) {
    const steps = PickupFx.resolveSteps(p);
    if (steps === 0) return { applied: [], vitals: PickupFx.vitalsDelta(p) };
    const applied = [];
    if (p.color === 'red') {
      promote(p.track, steps);
      applied.push({ track: p.track, delta: steps });
    } else if (p.color === 'blue') {
      if (idx[p.track] < 0) return { applied: [], vitals: null, blocked: true };
      const res = demote(p.track, steps);
      if (!res.ok) return { applied: [], gameOver: res.gameOver, reason: res.reason };
      applied.push({ track: p.track, delta: -steps });
    }
    return { applied, vitals: PickupFx.vitalsDelta(p) };
  }

  function benguanLevel() {
    return idx.benguan < 0 ? 0 : idx.benguan;
  }

  function isGrandWin() {
    return TRACKS.every((t) => {
      const max = ladder.winIndex[t];
      return idx[t] >= max;
    });
  }

  /** 四线中当前最高阶的一路（同阶优先本官） */
  function highestRankTrack() {
    const order = ['benguan', 'sanjie', 'xun', 'jue'];
    let best = null;
    let bestIdx = -1;
    for (const t of order) {
      const i = idx[t];
      if (i < 0) continue;
      if (i > bestIdx) {
        bestIdx = i;
        best = t;
      }
    }
    return best;
  }

  function demoteHighest(steps = 1) {
    const track = highestRankTrack();
    if (!track) return { ok: true, noop: true, track: null };
    const res = demote(track, steps);
    return { ...res, track };
  }

  /** 功劳满：升当前最低的一路官职 */
  function lowestPromotableTrack() {
    let best = null;
    let bestKey = Infinity;
    for (const t of TRACKS) {
      const max = ladder.winIndex[t];
      const i = idx[t];
      if (i >= max) continue;
      const key = i < 0 ? -100 + TRACKS.indexOf(t) : i * 10 + TRACKS.indexOf(t);
      if (key < bestKey) {
        bestKey = key;
        best = t;
      }
    }
    return best;
  }

  /** 封赏满：随机升一路可进官职 */
  function randomPromotableTrack() {
    const pool = TRACKS.filter((t) => idx[t] < ladder.winIndex[t]);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function nextPromotableTrack() {
    return lowestPromotableTrack();
  }

  function getCoinThreshold() {
    return 320;
  }

  function getMeritThreshold() {
    return 300;
  }

  function getCoinProgress(coinBank) {
    const th = getCoinThreshold();
    return { bank: coinBank % th, need: th };
  }

  function getState() {
    return TRACKS.map((t) => ({
      track: t,
      label: LABELS[t],
      index: idx[t],
      max: ladder.winIndex[t],
      current: resolveRank(t, idx[t]),
      next: resolveRank(t, idx[t] + 1),
      flash: flash[t]
    }));
  }

  function tick(dt) {
    TRACKS.forEach((t) => {
      if (flash[t] > 0) flash[t] = Math.max(0, flash[t] - dt);
    });
  }

  function snapshot() {
    const s = {};
    TRACKS.forEach((t) => {
      s[t] = { index: idx[t], name: resolveRank(t, idx[t]).name };
    });
    return s;
  }

  /** 升官图路径：整条梯级及到达状态 */
  function getCareerPath(track) {
    const ids = ladder[track] || [];
    const current = idx[track];
    return ids.map((_, n) => {
      const r = resolveRank(track, n);
      return {
        index: n,
        name: r.name,
        pin: r.pin || '—',
        reached: current >= 0 && n <= current,
        current: n === current
      };
    });
  }

  return {
    load, reset, promote, demote, demoteHighest, highestRankTrack, applyPickup, benguanLevel,
    isGrandWin, getState, tick, snapshot, resolveRank, getCareerPath, TRACKS, LABELS,
    lowestPromotableTrack, randomPromotableTrack, nextPromotableTrack,
    getCoinThreshold, getMeritThreshold, getCoinProgress
  };
})();
