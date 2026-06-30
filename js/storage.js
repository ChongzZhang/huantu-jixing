/* 宦途疾行 · 本地存档 */
const Storage = (() => {
  const KEY = 'huantu_jixing_v1';

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY)) || defaultData();
      return normalize(d);
    } catch {
      return defaultData();
    }
  }

  function defaultData() {
    return {
      bestDistance: 0,
      bestRanks: {},
      codex: [],
      achievements: {
        grandWin: false,
        npcKnockouts: 0,
        bestNpcKnockouts: 0
      }
    };
  }

  function normalize(d) {
    d.achievements = d.achievements || {};
    if (d.achievements.npcKnockouts == null) d.achievements.npcKnockouts = 0;
    if (d.achievements.bestNpcKnockouts == null) d.achievements.bestNpcKnockouts = 0;
    return d;
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function mergeRun(result) {
    const d = load();
    if (result.distance > d.bestDistance) d.bestDistance = Math.floor(result.distance);
    result.ranks && Object.entries(result.ranks).forEach(([k, v]) => {
      const prev = d.bestRanks[k];
      if (!prev || v.index > prev.index) d.bestRanks[k] = v;
    });
    result.codex?.forEach((c) => {
      if (!d.codex.find((x) => x.id === c.id)) d.codex.push(c);
    });
    if (result.grandWin) d.achievements.grandWin = true;
    const ko = result.npcKnockouts || 0;
    if (ko > 0) {
      d.achievements.npcKnockouts = (d.achievements.npcKnockouts || 0) + ko;
      if (ko > (d.achievements.bestNpcKnockouts || 0)) {
        d.achievements.bestNpcKnockouts = ko;
      }
    }
    save(d);
    return d;
  }

  return { load, save, mergeRun };
})();
