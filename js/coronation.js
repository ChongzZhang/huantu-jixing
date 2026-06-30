/* 宦途疾行 · 黄袍加身终局 */
const Coronation = (() => {
  const PHASE_SEC = 30;

  let offered = false;
  let picked = false;
  let active = false;
  let phaseLeft = 0;

  function reset() {
    offered = false;
    picked = false;
    active = false;
    phaseLeft = 0;
  }

  function offer() {
    offered = true;
  }

  function startChallenge() {
    picked = true;
    active = true;
    phaseLeft = PHASE_SEC;
  }

  function isOffered() { return offered; }
  function isPicked() { return picked; }
  function isActive() { return active; }
  function getPhaseLeft() { return phaseLeft; }

  /** @returns {boolean} true when phase completes */
  function tick(dt) {
    if (!active) return false;
    phaseLeft -= dt;
    return phaseLeft <= 0;
  }

  return {
    PHASE_SEC,
    reset, offer, startChallenge, tick,
    isOffered, isPicked, isActive, getPhaseLeft
  };
})();
