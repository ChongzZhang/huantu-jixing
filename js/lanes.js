/* 宦途疾行 · 窄道三格布局（自适应屏宽） */
const Lanes = (() => {
  const COUNT = 3;
  const LANE_W_MAX = 92;
  const GUTTER = 8;

  function trackWidth(laneWidth) {
    return laneWidth * COUNT + GUTTER * (COUNT - 1);
  }

  function compute(canvasW, canvasH, panelW, hudTop, opts = {}) {
    const mobile = opts.mobile;
    const laneHeaderH = 24;
    const hudH = hudTop || 120;
    const playTop = hudH + laneHeaderH;

    if (mobile) {
      const bottomPanelH = Math.min(118, Math.max(96, Math.floor(canvasH * 0.15)));
      const playAreaW = canvasW;
      const margin = 8;
      const available = playAreaW - margin * 2;
      const laneWidth = Math.max(
        68,
        Math.min(LANE_W_MAX, Math.floor((available - GUTTER * (COUNT - 1)) / COUNT))
      );
      const tw = trackWidth(laneWidth);
      const trackLeft = margin + Math.max(0, (playAreaW - tw) / 2);
      const panelY = canvasH - bottomPanelH;

      return {
        mode: 'bottom',
        laneWidth,
        gutter: GUTTER,
        trackLeft,
        trackWidth: tw,
        playLeft: 0,
        playWidth: playAreaW,
        playAreaW,
        playTop,
        playHeight: Math.max(120, panelY - playTop - 6),
        panelW: canvasW,
        panelX: 0,
        panelY,
        bottomPanelH,
        hudH,
        laneHeaderY: hudH,
        laneHeaderH,
        isMobile: true
      };
    }

    const playAreaW = canvasW - panelW;
    const margin = 6;
    const available = playAreaW - margin * 2;
    const laneWidth = Math.max(
      58,
      Math.min(LANE_W_MAX, Math.floor((available - GUTTER * (COUNT - 1)) / COUNT))
    );
    const tw = trackWidth(laneWidth);
    const trackLeft = margin + Math.max(0, (playAreaW - tw) / 2);

    return {
      mode: 'side',
      laneWidth,
      gutter: GUTTER,
      trackLeft,
      trackWidth: tw,
      playLeft: 0,
      playWidth: playAreaW,
      playAreaW,
      playTop,
      playHeight: canvasH - playTop - 10,
      panelW,
      panelX: canvasW - panelW,
      hudH,
      laneHeaderY: hudH,
      laneHeaderH,
      isMobile: false
    };
  }

  function laneLeft(lane, layout) {
    return layout.trackLeft + lane * (layout.laneWidth + layout.gutter);
  }

  function laneCenter(lane, layout) {
    return laneLeft(lane, layout) + layout.laneWidth / 2;
  }

  function laneFromMouseX(mouseX, layout, prevLane) {
    for (let i = 0; i < COUNT; i++) {
      const left = laneLeft(i, layout);
      if (mouseX >= left && mouseX <= left + layout.laneWidth) return i;
    }
    return prevLane ?? 1;
  }

  function fitSize(layout, prefW, prefH) {
    const maxW = layout.laneWidth - 16;
    const maxH = layout.laneWidth - 12;
    return {
      w: Math.min(prefW, maxW),
      h: Math.min(prefH, maxH)
    };
  }

  function clampX(centerX, lane, layout, halfW) {
    const pad = 4;
    const min = laneLeft(lane, layout) + halfW + pad;
    const max = laneLeft(lane, layout) + layout.laneWidth - halfW - pad;
    return Math.max(min, Math.min(max, centerX));
  }

  function randomXInLane(lane, layout, halfW) {
    const center = laneCenter(lane, layout);
    const inner = Math.max(0, (layout.laneWidth - halfW * 2 - 10) / 2);
    const jitter = (Math.random() - 0.5) * inner * 1.4;
    return clampX(center + jitter, lane, layout, halfW);
  }

  function randomSpawnY() {
    return -(50 + Math.random() * 140);
  }

  function placeEntity(entity, lane, layout) {
    const halfW = entity.w / 2;
    entity.lane = lane;
    entity.x = clampX(entity.x ?? laneCenter(lane, layout), lane, layout, halfW);
  }

  return {
    COUNT, LANE_W_MAX, GUTTER, trackWidth, compute,
    laneLeft, laneCenter, laneFromMouseX, fitSize, clampX,
    randomXInLane, randomSpawnY, placeEntity
  };
})();
