/* 宦途疾行 · 难度（同僚降速，宿敌始终快于同僚） */
const Difficulty = (() => {
  const LEVELS = {
    easy: {
      id: 'easy',
      label: '平易',
      npcSpeedMult: 0.52,
      rivalSpeedMult: 0.78
    },
    normal: {
      id: 'normal',
      label: '中庸',
      npcSpeedMult: 0.68,
      rivalSpeedMult: 0.92
    },
    hard: {
      id: 'hard',
      label: '严苛',
      npcSpeedMult: 0.88,
      rivalSpeedMult: 1.08
    }
  };

  const NPC_BASE = 48;
  const NPC_RANGE = 26;
  const RIVAL_BASE = 108;
  const RIVAL_SLOT = 14;

  let current = 'normal';

  function set(id) {
    current = LEVELS[id] ? id : 'normal';
  }

  function get() {
    return LEVELS[current] || LEVELS.normal;
  }

  function rivalSpeed(slot) {
    const base = RIVAL_BASE + (slot || 0) * RIVAL_SLOT;
    return base * get().rivalSpeedMult;
  }

  function npcSpeed() {
    return (NPC_BASE + Math.random() * NPC_RANGE) * get().npcSpeedMult;
  }

  return { set, get, LEVELS, rivalSpeed, npcSpeed };
})();
