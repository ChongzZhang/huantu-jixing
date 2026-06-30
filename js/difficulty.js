/* 宦途疾行 · 难度（同僚降速，宿敌始终快于同僚） */
const Difficulty = (() => {
  const LEVELS = {
    easy: {
      id: 'easy',
      label: '平易',
      npcSpeedMult: 0.44,
      rivalSpeedMult: 0.76
    },
    normal: {
      id: 'normal',
      label: '中庸',
      npcSpeedMult: 0.54,
      rivalSpeedMult: 0.9
    },
    hard: {
      id: 'hard',
      label: '严苛',
      npcSpeedMult: 0.76,
      rivalSpeedMult: 1.04
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

  function npcSpeedFromRoll(roll = Math.random()) {
    const r = Math.max(0, Math.min(1, roll));
    return (NPC_BASE + r * NPC_RANGE) * get().npcSpeedMult;
  }

  function npcSpeed() {
    return npcSpeedFromRoll(Math.random());
  }

  function applyNpcSpeed(npc) {
    if (!npc) return;
    npc.moveSpeed = npcSpeedFromRoll(npc.speedRoll ?? 0.5);
  }

  function applyRivalSpeed(rival) {
    if (!rival) return;
    rival.moveSpeed = rivalSpeed(rival.slot);
  }

  return {
    set, get, LEVELS,
    rivalSpeed, npcSpeed, npcSpeedFromRoll,
    applyNpcSpeed, applyRivalSpeed
  };
})();
