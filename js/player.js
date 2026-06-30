/* 宦途疾行 · 玩家 — 鼠标二维跟随，接触判定 */
const Player = (() => {
  function create(layout, y) {
    const size = Lanes.fitSize(layout, 30, 38);
    const cx = layout.trackLeft + layout.trackWidth / 2;
    return {
      x: cx,
      y: y ?? layout.playTop + layout.playHeight - 56,
      w: size.w,
      h: size.h,
      safety: 100,
      integrity: 80,
      invincible: 0,
      distance: 0,
      coins: 0,
      coinBank: 0,
      meritBank: 0,
      amnestyLeft: 0
    };
  }

  function clampPos(player, layout, x, y) {
    const halfW = player.w / 2;
    const halfH = player.h / 2;
    const minX = layout.trackLeft + halfW;
    const maxX = layout.trackLeft + layout.trackWidth - halfW;
    const minY = layout.playTop + halfH;
    const maxY = layout.playTop + layout.playHeight - halfH;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  function update(player, pos, layout, dt) {
    const p = clampPos(player, layout, pos.x, pos.y);
    player.x = p.x;
    player.y = p.y;
    if (player.invincible > 0) player.invincible -= dt;
  }

  function hitbox(p) {
    const pad = 4;
    return {
      x: p.x - p.w / 2 + pad,
      y: p.y - p.h / 2 + pad,
      w: p.w - pad * 2,
      h: p.h - pad * 2
    };
  }

  return { create, update, hitbox, clampPos };
})();
