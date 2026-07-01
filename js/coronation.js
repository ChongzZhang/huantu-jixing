/* 宦途疾行 · 黄袍加身终局 */
const Coronation = (() => {
  let offered = false;
  let picked = false;
  let active = false;

  function reset() {
    offered = false;
    picked = false;
    active = false;
  }

  function offer() {
    offered = true;
  }

  function startChallenge() {
    picked = true;
    active = true;
  }

  function endChallenge() {
    active = false;
  }

  function isOffered() { return offered; }
  function isPicked() { return picked; }
  function isActive() { return active; }

  function tick() {
    return false;
  }

  return {
    reset, offer, startChallenge, endChallenge, tick,
    isOffered, isPicked, isActive
  };
})();
