/* 宦途疾行 · 数据加载（支持 file:// 与本地服务器） */
const DataLoad = (() => {
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    return res.json();
  }

  function fromBundle() {
    const b = window.HUANTU_GAME_DATA;
    if (!b || !b.ladder) return null;
    return {
      guanzhi: null,
      ladder: b.ladder,
      obstacles: b.obstacles || [],
      pickups: b.pickups || [],
      ranksById: b.ranksById || {},
      events: b.events || []
    };
  }

  async function loadAll() {
    const bundled = fromBundle();
    if (bundled) return bundled;

    try {
      const [guanzhi, ladder, obstacles, pickups, events] = await Promise.all([
        fetchJson('js/data/guanzhi.json'),
        fetchJson('js/data/guanzhi-ladder.json'),
        fetchJson('js/data/obstacles.json'),
        fetchJson('js/data/pickups.json'),
        fetchJson('js/data/events.json').catch(() => [])
      ]);
      return { guanzhi, ladder, obstacles, pickups, ranksById: null, events };
    } catch (e) {
      const fallback = fromBundle();
      if (fallback) return fallback;
      throw e;
    }
  }

  return { loadAll };
})();
