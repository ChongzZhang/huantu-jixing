/* 宦途疾行 · 渲染 */
const Renderer = (() => {
  const COLORS = {
    paper: '#f2ead8',
    paperDark: '#e4dac6',
    paperDeep: '#d8ccb4',
    ink: '#1a1208',
    inkMid: '#3b2f1e',
    inkLight: '#7a6848',
    red: '#9b2222',
    redLight: '#d45555',
    redDark: '#5c1010',
    blue: '#1e4478',
    blueLight: '#4a7ab8',
    blueDark: '#0c2448',
    gold: '#b8922e',
    goldLight: '#e8c86a',
    seal: '#8b1c1c',
    laneReform: '#f5e8e6',
    laneCenter: '#f0ebe2',
    laneCons: '#e8efe8',
    laneBorder: '#b8a888'
  };

  const LANE_NAMES = ['改革道', '中庸道', '守旧道'];
  const LANE_TINT = [COLORS.laneReform, COLORS.laneCenter, COLORS.laneCons];

  let activeLayout = { uiScale: 1, isMobile: false };

  function setLayout(layout) {
    activeLayout = layout || { uiScale: 1, isMobile: false };
  }

  function u(px) {
    return Math.round(px * (activeLayout.uiScale || 1));
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function ellipsize(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  /** 在宽度内自适应字号：优先用大号，仅溢出时逐级缩小 */
  function fitFontSize(ctx, text, maxW, preferPx, minPx, bold) {
    const fam = 'KaiTi, STKaiti, serif';
    const lo = Math.max(9, minPx);
    const hi = Math.max(lo, preferPx);
    for (let fs = hi; fs >= lo; fs--) {
      ctx.font = `${bold ? 'bold ' : ''}${fs}px ${fam}`;
      if (ctx.measureText(text).width <= maxW) return fs;
    }
    ctx.font = `${bold ? 'bold ' : ''}${lo}px ${fam}`;
    return lo;
  }

  function drawPaperTexture(ctx, w, h) {
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPlayChrome(ctx, layout, h) {
    if (layout.mode === 'bottom') {
      ctx.fillStyle = COLORS.paperDark;
      ctx.fillRect(0, 0, layout.playAreaW, layout.panelY);
      ctx.fillStyle = COLORS.paperDeep;
      ctx.fillRect(0, layout.panelY, layout.panelW, layout.bottomPanelH);
      ctx.fillStyle = 'rgba(26,18,8,0.15)';
      ctx.fillRect(0, layout.panelY, layout.playAreaW, 3);
      return;
    }
    const { playAreaW, panelX } = layout;
    ctx.fillStyle = COLORS.paperDark;
    ctx.fillRect(0, 0, playAreaW, h);
    ctx.fillStyle = COLORS.paperDeep;
    ctx.fillRect(panelX, 0, layout.panelW, h);
    ctx.fillStyle = 'rgba(26,18,8,0.15)';
    ctx.fillRect(playAreaW, 0, 3, h);
  }

  function drawHud(ctx, w, hudH, state, layout) {
    const lay = layout || activeLayout;
    const compact = !!lay.isMobile;
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, hudH);
    grad.addColorStop(0, '#f4ecda');
    grad.addColorStop(1, '#e8deca');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, hudH);
    ctx.strokeStyle = COLORS.seal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudH - 1);
    ctx.lineTo(w, hudH - 1);
    ctx.stroke();

    const pad = compact ? u(6) : u(12);
    const { playerName, age, coinBank, coinNeed, meritBank, meritNeed, safety, integrity, amnestyLeft } = state;

    ctx.font = `bold ${u(compact ? 15 : 19)}px KaiTi, STKaiti, serif`;
    ctx.fillStyle = COLORS.ink;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(`庆历 · ${playerName || '沈砚青'}`, pad, 6);
    ctx.font = `${u(compact ? 13 : 15)}px KaiTi, serif`;
    ctx.fillStyle = COLORS.inkMid;
    ctx.textAlign = 'right';
    ctx.fillText(`年齿 ${age ?? 24} 岁`, w - pad, 8);

    const labelW = compact ? u(32) : u(38);
    const barX = pad + labelW + (compact ? u(4) : u(8));
    const barW = w - pad * 2 - labelW - (compact ? u(4) : u(8));
    const halfW = (barW - 8) / 2;
    const row1 = compact ? u(28) : u(32);
    const row2 = compact ? u(46) : u(52);
    const barH = compact ? u(10) : u(13);

    const coinProg = coinNeed ? Math.min(1, coinBank / coinNeed) : 0;
    const meritProg = meritNeed ? Math.min(1, meritBank / meritNeed) : 0;
    const safeProg = Math.max(0, Math.min(1, (safety ?? 100) / 100));
    const intProg = Math.max(0, Math.min(1, (integrity ?? 80) / 100));

    drawStatBar(ctx, pad, row1, labelW, barX, halfW, barH, '封赏', coinProg, COLORS.gold);
    drawStatBar(ctx, pad, row1, labelW, barX + halfW + 8, halfW, barH, '功劳', meritProg, '#6b3a5c');
    drawStatBar(ctx, pad, row2, labelW, barX, halfW, barH, '安危', safeProg, COLORS.blueLight);
    drawStatBar(ctx, pad, row2, labelW, barX + halfW + 8, halfW, barH, '气节', intProg, COLORS.redLight);

    ctx.font = `${u(compact ? 11 : 13)}px KaiTi, serif`;
    ctx.fillStyle = COLORS.inkLight;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${coinBank}/${coinNeed}`, barX + halfW - 2, row1 + barH / 2);
    ctx.fillText(`${meritBank}/${meritNeed}`, w - pad, row1 + barH / 2);
    ctx.fillText(`${Math.round(safety ?? 0)}`, barX + halfW - 2, row2 + barH / 2);
    ctx.fillText(`${Math.round(integrity ?? 0)}`, w - pad, row2 + barH / 2);

    if (amnestyLeft > 0) {
      ctx.font = `bold ${u(12)}px KaiTi, serif`;
      ctx.fillStyle = '#8a6020';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`免死金牌 ${amnestyLeft.toFixed(0)}s`, pad, compact ? 56 : 62);
    }

    const legendY = amnestyLeft > 0 ? (compact ? u(72) : u(84)) : (compact ? u(62) : u(74));
    drawMiniLegend(ctx, pad, legendY, w - pad * 2);

    if (state.hellMode) {
      ctx.font = `bold ${u(10)}px KaiTi, serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = state.impeachReady ? COLORS.redDark : COLORS.inkLight;
      const msg = state.impeachReady
        ? '弹劾可击·点屏'
        : `弹劾${Math.ceil(state.impeachLeft || 0)}s`;
      ctx.fillText(msg, w - pad, legendY);
    }

    ctx.restore();
  }

  function drawStatBar(ctx, padX, y, labelW, barX, barW, barH, label, pct, color) {
    ctx.font = `bold ${u(14)}px KaiTi, serif`;
    ctx.fillStyle = COLORS.inkMid;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, padX, y + barH / 2);

    const p = Math.max(0, Math.min(1, pct));
    ctx.fillStyle = '#d5cdb8';
    roundRect(ctx, barX, y, barW, barH, 3);
    ctx.fill();
    if (p > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, barX, y, Math.max(4, barW * p), barH, 3);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(59,47,30,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, barX, y, barW, barH, 3);
    ctx.stroke();
  }

  function drawMiniLegend(ctx, x, y, totalW) {
    const items = [
      { c: '#e8c86a', t: '奏' },
      { c: COLORS.redDark, t: '狱' },
      { c: COLORS.redLight, t: '升' },
      { c: COLORS.blueLight, t: '谪' },
      { c: COLORS.goldLight, t: '钱' },
      { c: '#9a6a8a', t: '功' },
      { c: '#e8d080', t: '免' }
    ];
    const chipW = totalW / items.length;
    ctx.font = `${u(11)}px KaiTi, serif`;
    items.forEach((it, i) => {
      const cx = x + i * chipW;
      ctx.fillStyle = it.c;
      roundRect(ctx, cx, y, u(13), u(13), 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26,18,8,0.25)';
      ctx.stroke();
      ctx.fillStyle = COLORS.inkLight;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(it.t, cx + u(15), y + 1);
    });
  }

  function drawLaneHeaders(ctx, layout) {
    const { laneHeaderY, laneHeaderH, laneWidth, playAreaW } = layout;
    ctx.fillStyle = '#e0d6c2';
    ctx.fillRect(0, laneHeaderY, playAreaW, laneHeaderH);

    for (let i = 0; i < 3; i++) {
      const lx = Lanes.laneLeft(i, layout);
      ctx.fillStyle = LANE_TINT[i];
      roundRect(ctx, lx + 1, laneHeaderY + 2, laneWidth - 2, laneHeaderH - 4, 3);
      ctx.fill();
      ctx.strokeStyle = COLORS.laneBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = COLORS.inkMid;
      ctx.font = `bold ${u(16)}px KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_NAMES[i], lx + laneWidth / 2, laneHeaderY + laneHeaderH / 2);
    }
  }

  function drawLanes(ctx, layout, playHeight) {
    const { laneWidth, playTop, playAreaW } = layout;

    ctx.save();
    ctx.strokeStyle = 'rgba(139,110,60,0.07)';
    ctx.lineWidth = 1;
    for (let y = playTop + 24; y < playTop + playHeight; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(playAreaW, y);
      ctx.stroke();
    }
    ctx.restore();

    for (let g = 0; g < 2; g++) {
      const gx = Lanes.laneLeft(g, layout) + laneWidth;
      ctx.fillStyle = 'rgba(26,18,8,0.12)';
      ctx.fillRect(gx, playTop, layout.gutter, playHeight);
    }

    for (let i = 0; i < 3; i++) {
      const lx = Lanes.laneLeft(i, layout);
      const grad = ctx.createLinearGradient(lx, playTop, lx + laneWidth, playTop);
      grad.addColorStop(0, LANE_TINT[i]);
      grad.addColorStop(0.5, '#faf6ee');
      grad.addColorStop(1, LANE_TINT[i]);
      ctx.fillStyle = grad;
      ctx.fillRect(lx, playTop, laneWidth, playHeight);
      ctx.strokeStyle = COLORS.laneBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(lx + 0.5, playTop + 0.5, laneWidth - 1, playHeight - 1);
      ctx.strokeStyle = 'rgba(139,28,28,0.35)';
      ctx.beginPath();
      ctx.moveTo(lx + 3, playTop + 4);
      ctx.lineTo(lx + 3, playTop + playHeight - 4);
      ctx.stroke();
    }
  }

  function drawOfficial(ctx, opts) {
    const {
      x, y, w, h,
      robeTop, robeMid, robeBot,
      beltColor, accent,
      mini = false,
      name = '',
      rankTitle = '',
      pulse = 0,
      alpha = 1
    } = opts;

    ctx.save();
    ctx.globalAlpha = alpha;

    const bob = mini ? Math.sin(pulse) * 1.2 : 0;
    const cy = y + bob;
    const scale = mini ? 1 : 1.08;

    ctx.fillStyle = 'rgba(26,18,8,0.1)';
    ctx.beginPath();
    ctx.ellipse(x, cy + h * 0.38, w * 0.5 * scale, h * (mini ? 0.07 : 0.1), 0, 0, Math.PI * 2);
    ctx.fill();

    const rw = w * (mini ? 0.78 : 0.88);
    const rh = h * (mini ? 0.52 : 0.58);
    const bodyTop = cy - h * (mini ? 0.02 : 0.06);

    const robeGrad = ctx.createLinearGradient(x, bodyTop, x, bodyTop + rh);
    robeGrad.addColorStop(0, robeTop);
    robeGrad.addColorStop(0.5, robeMid);
    robeGrad.addColorStop(1, robeBot);
    ctx.fillStyle = robeGrad;
    roundRect(ctx, x - rw / 2, bodyTop, rw, rh, mini ? 5 : 8);
    ctx.fill();
    ctx.strokeStyle = robeBot;
    ctx.lineWidth = mini ? 1 : 1.5;
    ctx.stroke();

    if (!mini) {
      ctx.fillStyle = '#f8f0e4';
      ctx.beginPath();
      ctx.moveTo(x - rw * 0.22, bodyTop + 4);
      ctx.lineTo(x, bodyTop + rh * 0.32);
      ctx.lineTo(x + rw * 0.22, bodyTop + 4);
      ctx.closePath();
      ctx.fill();
    }

    const beltY = bodyTop + rh * (mini ? 0.48 : 0.52);
    ctx.fillStyle = beltColor || COLORS.goldLight;
    ctx.fillRect(x - rw * 0.42, beltY, rw * 0.84, h * (mini ? 0.05 : 0.06));
    if (accent) {
      ctx.fillStyle = accent;
      ctx.fillRect(x - rw * 0.07, beltY, rw * 0.14, h * (mini ? 0.05 : 0.06));
    }

    const headY = cy - h * (mini ? 0.38 : 0.46);
    const headR = w * (mini ? 0.24 : 0.28);
    ctx.fillStyle = '#edd4b8';
    ctx.beginPath();
    ctx.arc(x, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c4a080';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (!mini) {
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.ellipse(x - headR * 0.28, headY + headR * 0.05, 2.4, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(x + headR * 0.28, headY + headR * 0.05, 2.4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,50,35,0.35)';
      ctx.beginPath();
      ctx.moveTo(x, headY + headR * 0.3);
      ctx.quadraticCurveTo(x + headR * 0.1, headY + headR * 0.52, x, headY + headR * 0.55);
      ctx.stroke();
    } else {
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(x - headR * 0.22, headY + headR * 0.02, 2, 2.5);
      ctx.fillRect(x + headR * 0.1, headY + headR * 0.02, 2, 2.5);
    }

    const hatY = headY - headR * (mini ? 0.5 : 0.62);
    ctx.fillStyle = mini ? '#1a1410' : '#0e0a06';
    roundRect(ctx, x - headR * (mini ? 1 : 1.2), hatY, headR * (mini ? 2 : 2.4), headR * (mini ? 0.36 : 0.4), 2);
    ctx.fill();
    if (!mini) {
      roundRect(ctx, x - headR * 0.4, hatY - headR * 0.4, headR * 0.8, headR * 0.4, 2);
      ctx.fill();
      ctx.fillRect(x - headR * 1.48, hatY + headR * 0.08, headR * 0.58, headR * 0.1);
      ctx.fillRect(x + headR * 0.9, hatY + headR * 0.08, headR * 0.58, headR * 0.1);
    } else {
      roundRect(ctx, x - headR * 0.32, hatY - headR * 0.28, headR * 0.64, headR * 0.28, 1);
      ctx.fill();
    }

    if (rankTitle && name) {
      const tw = u(78);
      const th = u(30);
      const tx = x - tw / 2;
      const ty = headY - headR * (mini ? 1.45 : 1.55);
      ctx.fillStyle = 'rgba(248,242,228,0.94)';
      roundRect(ctx, tx, ty, tw, th, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59,47,30,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#6a1818';
      ctx.font = `bold ${u(9)}px KaiTi, STKaiti, serif`;
      const rank = rankTitle.length > 5 ? rankTitle.slice(0, 5) : rankTitle;
      ctx.fillText(rank, x, ty + u(10));
      ctx.fillStyle = COLORS.inkMid;
      ctx.font = `${u(10)}px KaiTi, STKaiti, serif`;
      const nm = name.length > 4 ? name.slice(0, 4) : name;
      ctx.fillText(nm, x, ty + u(22));
    } else if (name) {
      ctx.font = `${u(11)}px KaiTi, STKaiti, serif`;
      const tw = Math.min(u(72), Math.max(u(40), ctx.measureText(name).width + u(12)));
      const th = u(16);
      const tx = x - tw / 2;
      const ty = headY - headR * (mini ? 1.15 : 1.35);
      ctx.fillStyle = 'rgba(248,242,228,0.92)';
      roundRect(ctx, tx, ty, tw, th, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59,47,30,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = COLORS.inkMid;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.length > 4 ? name.slice(0, 4) : name, x, ty + th / 2);
    }

    if (!mini) {
      ctx.strokeStyle = 'rgba(201,168,76,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, cy, w * 0.62, -Math.PI * 0.15, Math.PI * 0.15);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBattleHpBar(ctx, x, y, w, h, hits, maxHits, variant) {
    const hp = Math.max(0, maxHits - hits);
    const pct = maxHits > 0 ? hp / maxHits : 0;
    const isBoss = variant === 'boss';
    const barW = isBoss ? Math.max(w * 1.6, 56) : Math.max(w, 28);
    const barH = isBoss ? 7 : 4;
    const bx = x - barW / 2;
    const by = y - h / 2 - (isBoss ? 58 : 9);
    ctx.save();
    ctx.fillStyle = isBoss ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)';
    roundRect(ctx, bx, by, barW, barH, 2);
    ctx.fill();
    const fill = variant === 'boss' ? '#ffd040'
      : variant === 'enemy' ? '#c83838'
      : variant === 'ally' ? '#3a88b8' : '#d8a820';
    ctx.fillStyle = fill;
    roundRect(ctx, bx, by, Math.max(barH, barW * pct), barH, 2);
    ctx.fill();
    ctx.strokeStyle = isBoss ? 'rgba(255,220,120,0.9)' : 'rgba(255,80,80,0.8)';
    ctx.lineWidth = isBoss ? 1.5 : 1;
    roundRect(ctx, bx, by, barW, barH, 2);
    ctx.stroke();
    if (isBoss) {
      ctx.fillStyle = '#fff8e0';
      ctx.font = `bold ${u(9)}px KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${hp}/${maxHits}`, x, by + barH / 2);
    } else if (pct <= 0.34) {
      ctx.strokeStyle = 'rgba(255,80,80,0.8)';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, barW, barH, 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer(ctx, p, battleHp) {
    const { x, y, w, h, invincible } = p;
    const flash = invincible > 0 && Math.floor(invincible * 10) % 2 === 0;
    if (battleHp) {
      drawBattleHpBar(ctx, x, y, w, h, battleHp.hits, battleHp.maxHits, 'player');
    }
    drawOfficial(ctx, {
      x, y, w, h,
      robeTop: '#d45050',
      robeMid: '#a83030',
      robeBot: '#6a1818',
      beltColor: COLORS.goldLight,
      accent: COLORS.gold,
      mini: false,
      alpha: flash ? 0.45 : 1
    });
  }

  function drawNpc(ctx, npc, battleRole) {
    const c = npc.robe || '#5a6a7a';
    const knock = npc.state === 'knockfly';
    const isRival = npc.rival && !battleRole;
    const isEnemy = battleRole === 'enemy';
    const isAlly = battleRole === 'ally';
    const isBoss = battleRole === 'boss' || npc.isBoss;
    const alpha = (knock ? 0.88 : 0.92) * (npc.fade ?? 1);
    if (npc.state === 'respawn') return;

    const showBattleHp = (battleRole || npc.isBoss) && npc.maxHits != null && !isBoss && (!npc.reinforce || npc.named);
    if (showBattleHp) {
      drawBattleHpBar(
        ctx, npc.x, npc.y, npc.w, npc.h,
        npc.hits || 0, npc.maxHits, battleRole
      );
    }

    ctx.save();
    if (knock && npc.knockFlash > 0) {
      const flash = npc.knockFlash / 0.45;
      ctx.globalAlpha = 0.35 + flash * 0.25;
      ctx.strokeStyle = `rgba(74,122,184,${0.5 + flash * 0.4})`;
      ctx.lineWidth = 2 + flash * 2;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, npc.w * (0.9 + flash * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(120,170,230,${flash * 0.35})`;
      ctx.font = `bold ${14 + flash * 6}px KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('谪', npc.x, npc.y - npc.h * 0.5);
    }

    ctx.translate(npc.x, npc.y);
    if (knock) ctx.rotate(npc.knockRot || 0);

    if (knock) {
      ctx.strokeStyle = 'rgba(30,68,120,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-npc.w * 0.2, npc.h * 0.15 + i * 5);
        ctx.lineTo(-npc.w * (0.7 + i * 0.15), npc.h * (0.35 + i * 0.1));
        ctx.stroke();
      }
    }

    const showPlate = (isBoss || (isEnemy && !npc.isMinion) || (isAlly && npc.named));
    drawOfficial(ctx, {
      x: 0,
      y: 0,
      w: npc.w,
      h: npc.h,
      robeTop: lighten(c, isBoss ? 42 : (isRival ? 34 : 28)),
      robeMid: c,
      robeBot: darken(c, isBoss ? 12 : 22),
      beltColor: isBoss ? '#ffd700' : (isRival ? COLORS.goldLight : '#c8b888'),
      accent: isBoss ? '#ffd700' : (isRival ? COLORS.gold : (isAlly && npc.named ? '#5ab0d8' : null)),
      mini: isBoss ? false : (isEnemy ? !!npc.isMinion : (npc.reinforce && !npc.named)),
      rankTitle: knock ? '' : (showPlate ? (npc.rankTitle || '') : ''),
      name: knock ? '' : ((npc.reinforce && !npc.named) ? '' : (npc.isMinion ? '' : (npc.name || ''))),
      pulse: npc.pulse || 0,
      alpha
    });

    if (isAlly && npc.named && !knock) {
      ctx.strokeStyle = 'rgba(58,136,184,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, npc.w * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isRival && !knock) {
      ctx.strokeStyle = 'rgba(201,168,76,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, npc.w * 0.58, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isEnemy) {
      if (npc.isMinion) {
        ctx.strokeStyle = 'rgba(255,160,80,0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, npc.w * 0.66, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffe0b0';
        ctx.font = `bold ${Math.max(10, npc.w * 0.42)}px KaiTi, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('兵', 0, npc.h * 0.06);
      } else {
        ctx.strokeStyle = 'rgba(180,40,40,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, npc.w * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (isBoss) {
      ctx.strokeStyle = 'rgba(255,215,80,0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, npc.w * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,120,0.35)';
      ctx.font = `bold ${Math.max(12, npc.w * 0.22)}px KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('帝', 0, -npc.h * 0.08);
    }
    if (isAlly) {
      ctx.strokeStyle = 'rgba(50,120,160,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, npc.w * 0.58, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    if (isBoss && npc.maxHits != null) {
      drawBattleHpBar(
        ctx, npc.x, npc.y, npc.w, npc.h,
        npc.hits || 0, npc.maxHits, 'boss'
      );
    }
  }

  function drawAmnesty(ctx, a) {
    const r = a.w / 2;
    const bob = Math.sin((a.pulse || 0)) * 2;
    const cy = a.y + bob;
    const g = ctx.createRadialGradient(a.x - 4, cy - 5, 2, a.x, cy, r + 3);
    g.addColorStop(0, '#fff8d8');
    g.addColorStop(0.45, '#e8c86a');
    g.addColorStop(1, '#a87820');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(a.x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a5010';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4a2808';
    ctx.font = `bold ${Math.max(11, r * 0.85)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('免', a.x, cy);
    ctx.font = '8px KaiTi, serif';
    ctx.fillStyle = '#5c4010';
    ctx.fillText('金牌', a.x, cy + r * 0.55);
    a.pulse = (a.pulse || 0) + 0.08;
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + amt);
    const g = Math.min(255, ((n >> 8) & 255) + amt);
    const b = Math.min(255, (n & 255) + amt);
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) - amt);
    const g = Math.max(0, ((n >> 8) & 255) - amt);
    const b = Math.max(0, (n & 255) - amt);
    return `rgb(${r},${g},${b})`;
  }

  function drawSpecial(ctx, s) {
    const r = s.w / 2;
    const bob = Math.sin(s.pulse || 0) * 3;
    const cy = s.y + bob;
    const g = ctx.createRadialGradient(s.x - 4, cy - 6, 2, s.x, cy, r + 4);
    g.addColorStop(0, '#fffce8');
    g.addColorStop(0.4, '#f5e090');
    g.addColorStop(1, '#c9a030');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7020';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,220,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, cy, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#5c4010';
    ctx.font = `bold ${Math.max(15, r * 0.82)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('奏', s.x, cy);
  }

  function drawCoronationRobe(ctx, robe) {
    const r = robe.w / 2;
    const bob = Math.sin(robe.pulse || 0) * 4;
    const cy = robe.y + bob;
    const flash = 0.55 + Math.sin(robe.flash || 0) * 0.45;

    ctx.save();
    ctx.globalAlpha = 0.35 + flash * 0.25;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(robe.x, cy, r + 10 + flash * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const g = ctx.createRadialGradient(robe.x - 5, cy - 8, 2, robe.x, cy, r + 6);
    g.addColorStop(0, '#fffef0');
    g.addColorStop(0.35, '#ffe566');
    g.addColorStop(0.72, '#e8b820');
    g.addColorStop(1, '#9a7010');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(robe.x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4a08';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#4a2800';
    ctx.font = `bold ${Math.max(17, r * 0.9)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('袍', robe.x, cy - 1);

    ctx.fillStyle = '#7a5008';
    ctx.font = `bold ${Math.max(9, r * 0.34)}px KaiTi, serif`;
    ctx.fillText('黄袍', robe.x, cy + r * 0.42);
  }

  function drawCoronationBanner(ctx, layout, hud) {
    const meta = hud || {};
    const w = layout.playAreaW;
    const y = layout.hudH + layout.laneHeaderH + 6;
    const hits = meta.playerHits || 0;
    const max = meta.playerMaxHits || 3;
    const allies = meta.alliesLeft || 0;
    const allyCap = meta.allyTarget || 118;
    const allyIn = meta.allySpawned ?? allies;
    let line;
    if (meta.phase === 'boss_bridge') {
      const wait = Math.max(0, Math.ceil(meta.bossBridgeT || 0));
      line = `殿门洞开 · 伪帝将现${wait > 0 ? ` · ${wait}s` : ''} · 命${max - hits}/${max} · 援${allies} · 破阵接逼宫`;
    } else if (meta.phase === 'boss' || meta.bossActive) {
      const bh = (meta.bossMaxHits || 16) - (meta.bossHits || 0);
      const minions = Math.max(0, (meta.enemiesLeft || 1) - 1);
      line = `逼宫决战 · 伪帝 ${bh}/${meta.bossMaxHits || 16} · 小怪${minions} · 命${max - hits}/${max} · 援${allies} · 自动`;
    } else {
      const enemies = meta.enemiesLeft || 0;
      const oSpawn = meta.officialSpawned ?? 0;
      const mSpawn = meta.minionSpawned ?? 0;
      const oTotal = meta.officialTotal || 200;
      const mTotal = meta.minionTotal || 160;
      const spawnTxt = meta.spawnDone
        ? ''
        : ` · 敌官${oSpawn}/${oTotal}兵${mSpawn}/${mTotal}`;
      const allyTxt = ` · 援${allyIn}/${allyCap}场${allies}`;
      line = `八轮${meta.wave}/${meta.waveTotal || 8}波${spawnTxt}${allyTxt} · 场${enemies} · 命${max - hits}/${max} · 自动`;
    }
    ctx.save();
    ctx.fillStyle = (meta.bossActive || meta.phase === 'boss_bridge')
      ? 'rgba(70, 10, 10, 0.9)' : 'rgba(90, 20, 20, 0.82)';
    roundRect(ctx, 8, y, w - 16, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe8a0';
    ctx.font = 'bold 13px KaiTi, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line, w / 2, y + 14);
    ctx.restore();
  }

  function drawObstacle(ctx, o) {
    const tier = o.tier || 1;
    const x0 = o.x - o.w / 2;
    const y0 = o.y - o.h / 2;
    const fast = (o.fallMult ?? 1) >= 1.2;

    const pal = { fill: '#4a0a0a', edge: '#1a0202', accent: COLORS.goldLight };

    ctx.fillStyle = pal.fill;
    roundRect(ctx, x0, y0, o.w, o.h, tier === 3 ? 3 : 5);
    ctx.fill();
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = tier === 3 ? 2.5 : 1.5;
    ctx.stroke();

    if (tier >= 2 || o.eventPolarity) {
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 3, y0 + 3, o.w - 6, o.h - 6);
    }

    const icon = o.eventIcon || o.icon || '障';
    ctx.fillStyle = pal.accent;
    ctx.font = `bold ${Math.min(18, o.w * 0.38)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, o.x, o.y - (o.eventLabel ? 5 : 1));

    if (o.eventLabel && o.w >= 36) {
      ctx.font = `9px KaiTi, serif`;
      ctx.fillText(ellipsize(ctx, o.eventLabel, o.w - 4), o.x, o.y + o.h * 0.22);
    }
    if (fast) {
      ctx.strokeStyle = 'rgba(26,18,8,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x, y0 - 6);
      ctx.lineTo(o.x, y0 - 14);
      ctx.stroke();
    }
  }

  function drawPickup(ctx, p) {
    const w = p.w || 68;
    const h = p.h || 50;
    const x = p.x - w / 2;
    const y = p.y - h / 2;
    const fill = PickupFx.fillColor(p, COLORS);
    const effect = PickupFx.effectLabel(p);
    const steps = PickupFx.resolveSteps(p);

    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(26,18,8,0.55)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();

    const padX = 5;
    const innerW = w - padX * 2;
    const line2 = (p.coinValue || p.meritValue) ? effect : (steps === 0 ? (p.brief || '无变动') : effect);
    const titleRaw = p.name || '';
    const preferTitle = Math.min(u(15), w * 0.24, h * 0.3);
    const preferSub = Math.min(u(14), w * 0.22, h * 0.26);
    const minFs = Math.max(9, u(10));

    const titleFs = fitFontSize(ctx, titleRaw, innerW, preferTitle, minFs, true);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${titleFs}px KaiTi, STKaiti, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(ellipsize(ctx, titleRaw, innerW), x + padX, y + 3);

    const subFs = fitFontSize(ctx, line2, innerW, preferSub, minFs, false);
    ctx.font = `${subFs}px KaiTi, STKaiti, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ellipsize(ctx, line2, innerW), p.x, y + h - 4);
  }

  function drawCoin(ctx, c) {
    const r = c.w / 2;
    const g = ctx.createRadialGradient(c.x - 3, c.y - 3, 1, c.x, c.y, r);
    g.addColorStop(0, '#fff0b0');
    g.addColorStop(0.5, COLORS.goldLight);
    g.addColorStop(1, '#9a7420');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5c18';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#4a3808';
    ctx.font = `bold ${Math.max(12, r * 0.9)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('钱', c.x, c.y);
  }

  function drawMerit(ctx, m) {
    const r = m.w / 2;
    const g = ctx.createRadialGradient(m.x - 3, m.y - 3, 1, m.x, m.y, r);
    g.addColorStop(0, '#f0d8e8');
    g.addColorStop(0.5, '#c89ab8');
    g.addColorStop(1, '#6b3a5c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2848';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff8fc';
    ctx.font = `bold ${Math.max(12, r * 0.9)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('功', m.x, m.y);
  }

  function drawImpeachBall(ctx, p) {
    const r = p.r;
    const pulse = 0.88 + Math.sin(p.pulse || 0) * 0.12;
    const rr = r * pulse;
    const isPlayer = p.side === 'player';
    const g = ctx.createRadialGradient(p.x - 2, p.y - 3, 1, p.x, p.y, rr + 2);
    if (isPlayer) {
      g.addColorStop(0, '#ffe0e0');
      g.addColorStop(0.45, '#e84848');
      g.addColorStop(1, '#8a1414');
    } else {
      g.addColorStop(0, '#ffd0d0');
      g.addColorStop(0.45, '#d03838');
      g.addColorStop(1, '#6a0a0a');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isPlayer ? '#fff6f6' : '#4a0808';
    ctx.lineWidth = isPlayer ? 2 : 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff8f8';
    ctx.font = `bold ${Math.max(10, rr * 0.95)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('弹', p.x, p.y);
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(255,200,200,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  function drawBattleBullet(ctx, p) {
    const r = p.r;
    const pulse = 0.88 + Math.sin(p.pulse || 0) * 0.12;
    const rr = r * pulse;
    const isEnemy = p.side === 'enemy';
    const g = ctx.createRadialGradient(p.x - 2, p.y - 3, 1, p.x, p.y, rr + 2);
    if (isEnemy) {
      g.addColorStop(0, '#ffd8d8');
      g.addColorStop(0.45, '#d03030');
      g.addColorStop(1, '#6a0a0a');
    } else {
      g.addColorStop(0, '#ffe8c8');
      g.addColorStop(0.45, '#e87830');
      g.addColorStop(1, '#8a4010');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isEnemy ? '#4a0808' : '#6a3010';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff8f0';
    ctx.font = `bold ${Math.max(10, rr * 0.95)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('兵', p.x, p.y);
  }

  function drawLightDrop(ctx, d) {
    const bob = Math.sin(d.pulse || 0) * 3;
    const r = d.r;
    const g = ctx.createRadialGradient(d.x - 3, d.y + bob - 4, 1, d.x, d.y + bob, r + 4);
    g.addColorStop(0, '#fffce8');
    g.addColorStop(0.35, '#ffe878');
    g.addColorStop(0.7, '#f0c030');
    g.addColorStop(1, 'rgba(200,140,20,0.2)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.x, d.y + bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c89820';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#6a4808';
    ctx.font = `bold ${Math.max(11, r * 0.85)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('光', d.x, d.y + bob);
  }

  function drawRankPanel(ctx, panelX, panelW, h, ranks, meta) {
    const pad = u(8);
    const innerW = panelW - pad * 2;
    const scale = meta?.uiScale || activeLayout.uiScale || 1;
    const { age, ageProgress, tenureLeft, tenureLabel, startAge } = meta || {};

    ctx.fillStyle = COLORS.paperDeep;
    ctx.fillRect(panelX, 0, panelW, h);

    ctx.fillStyle = COLORS.seal;
    ctx.fillRect(panelX, 0, 4, h);

    ctx.fillStyle = COLORS.ink;
    ctx.font = `bold ${Math.round(15 * scale)}px KaiTi, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('官职梯', panelX + panelW / 2, u(8));

    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold ${Math.round(24 * scale)}px KaiTi, serif`;
    ctx.fillText(`年齿 ${age ?? startAge ?? 24} 岁`, panelX + panelW / 2, u(30));

    const barX = panelX + pad + 4;
    const barY = u(58);
    const barW = innerW - 8;
    ctx.fillStyle = '#d5cdb8';
    roundRect(ctx, barX, barY, barW, u(10), 2);
    ctx.fill();
    if (ageProgress > 0) {
      ctx.fillStyle = COLORS.gold;
      roundRect(ctx, barX, barY, Math.max(3, barW * ageProgress), u(10), 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(59,47,30,0.3)';
    roundRect(ctx, barX, barY, barW, u(10), 2);
    ctx.stroke();

    ctx.font = `${Math.round(13 * scale)}px KaiTi, serif`;
    ctx.fillStyle = COLORS.inkMid;
    ctx.textAlign = 'left';
    ctx.fillText('寿序', panelX + pad + 4, u(72));
    ctx.textAlign = 'right';
    ctx.fillText(`${tenureLabel || '任期余'} ${tenureLeft || '—'}`, panelX + pad + innerW - 4, u(72));

    const rowH = Math.round(62 * scale);
    const startY = u(92);

    ranks.forEach((r, ti) => {
      const ty = startY + ti * rowH;
      const cardH = rowH - 4;
      const total = r.max + 1;

      ctx.fillStyle = r.flash > 0 ? 'rgba(201,168,76,0.25)' : 'rgba(248,242,228,0.65)';
      roundRect(ctx, panelX + pad, ty, innerW, cardH, 4);
      ctx.fill();
      ctx.strokeStyle = r.flash > 0 ? COLORS.gold : 'rgba(122,104,72,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = r.flash > 0 ? COLORS.gold : COLORS.ink;
      ctx.font = `bold ${Math.round(14 * scale)}px KaiTi, serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(r.label, panelX + pad + 5, ty + 4);

      ctx.textAlign = 'right';
      ctx.font = `${Math.round(12 * scale)}px KaiTi, serif`;
      if (r.index < 0) {
        ctx.fillStyle = COLORS.inkLight;
        ctx.fillText('未授', panelX + pad + innerW - 5, ty + 5);
      } else if (r.index >= r.max) {
        ctx.fillStyle = COLORS.seal;
        ctx.fillText(`顶格 ${total}/${total}`, panelX + pad + innerW - 5, ty + 5);
      } else {
        ctx.fillStyle = COLORS.inkMid;
        ctx.fillText(`${r.index + 1}/${total}`, panelX + pad + innerW - 5, ty + 5);
      }

      const barX = panelX + pad + 5;
      const barY = ty + 20;
      const barW = innerW - 10;
      const gap = 1;
      const cellW = Math.max(3, (barW - gap * (total - 1)) / total);
      const cellH = u(10);
      const prog = r.index < 0 ? -1 : r.index;

      for (let i = 0; i < total; i++) {
        const cx = barX + i * (cellW + gap);
        const filled = prog >= 0 && i <= prog;
        const isCurrent = prog >= 0 && i === prog;
        ctx.fillStyle = filled ? (isCurrent ? COLORS.goldLight : COLORS.gold) : '#d8d0bc';
        roundRect(ctx, cx, barY, cellW, cellH, 1);
        ctx.fill();
        if (isCurrent) {
          ctx.strokeStyle = COLORS.seal;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.fillStyle = COLORS.inkMid;
      ctx.font = `${Math.round(13 * scale)}px KaiTi, serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const name = ellipsize(ctx, r.current.name, innerW - 10);
      ctx.fillText(name, panelX + pad + 5, ty + 34);

      if (r.index >= 0 && r.index < r.max && r.next?.name) {
        ctx.fillStyle = COLORS.inkLight;
        ctx.font = `${Math.round(11 * scale)}px KaiTi, serif`;
        ctx.fillText(
          '→ ' + ellipsize(ctx, r.next.name, innerW - 16),
          panelX + pad + 5,
          ty + 48
        );
      }
    });
  }

  function drawRankPanelBottom(ctx, layout, ranks, meta) {
    const { panelY, panelW, bottomPanelH } = layout;
    const scale = meta?.uiScale || layout?.uiScale || 1.1;
    const pad = u(8);

    ctx.fillStyle = COLORS.paperDeep;
    ctx.fillRect(0, panelY, panelW, bottomPanelH);
    ctx.fillStyle = COLORS.seal;
    ctx.fillRect(0, panelY, panelW, 3);

    ctx.fillStyle = COLORS.ink;
    ctx.font = `bold ${Math.round(14 * scale)}px KaiTi, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('官职梯', pad, panelY + u(8));

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.inkMid;
    ctx.font = `${Math.round(13 * scale)}px KaiTi, serif`;
    ctx.fillText(`${meta?.tenureLabel || '任期余'} ${meta?.tenureLeft || '—'}`, panelW - pad, panelY + u(9));

    const colW = (panelW - pad * 2) / ranks.length;
    const startY = panelY + u(28);

    ranks.forEach((r, i) => {
      const cx = pad + i * colW;
      const innerW = colW - 4;
      const total = r.max + 1;

      ctx.fillStyle = r.flash > 0 ? 'rgba(201,168,76,0.22)' : 'rgba(248,242,228,0.55)';
      roundRect(ctx, cx, startY, innerW, bottomPanelH - u(30), 3);
      ctx.fill();
      ctx.strokeStyle = r.flash > 0 ? COLORS.gold : 'rgba(122,104,72,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = r.flash > 0 ? COLORS.gold : COLORS.ink;
      ctx.font = `bold ${Math.round(12 * scale)}px KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(r.label, cx + innerW / 2, startY + u(4));

      ctx.font = `${Math.round(11 * scale)}px KaiTi, serif`;
      ctx.fillStyle = COLORS.inkMid;
      if (r.index < 0) {
        ctx.fillText('未授', cx + innerW / 2, startY + u(16));
      } else if (r.index >= r.max) {
        ctx.fillText('顶格', cx + innerW / 2, startY + u(16));
      } else {
        ctx.fillText(`${r.index + 1}/${total}`, cx + innerW / 2, startY + u(16));
      }

      const barX = cx + 3;
      const barY = startY + u(26);
      const barW = innerW - 6;
      const gap = 1;
      const cellW = Math.max(2, (barW - gap * (total - 1)) / total);
      const cellH = u(6);
      const prog = r.index < 0 ? -1 : r.index;

      for (let j = 0; j < total; j++) {
        const bx = barX + j * (cellW + gap);
        const filled = prog >= 0 && j <= prog;
        ctx.fillStyle = filled ? COLORS.gold : '#d8d0bc';
        roundRect(ctx, bx, barY, cellW, cellH, 1);
        ctx.fill();
      }

      ctx.font = `${Math.round(11 * scale)}px KaiTi, serif`;
      ctx.textAlign = 'center';
      const name = ellipsize(ctx, r.current.name, innerW - 4);
      ctx.fillText(name, cx + innerW / 2, startY + u(38));
    });
  }

  function drawToast(ctx, layout, canvasH, toast, alpha) {
    if (!toast || alpha <= 0) return;
    const pad = 8;
    const tw = layout.mode === 'bottom'
      ? Math.min(layout.playAreaW - pad * 2, 280)
      : layout.panelW - pad * 2;
    const th = 46;
    const tx = layout.mode === 'bottom' ? pad : layout.panelX + pad;
    const ty = layout.mode === 'bottom'
      ? layout.panelY - th - 8
      : canvasH - th - 10;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(22,16,10,0.92)';
    roundRect(ctx, tx, ty, tw, th, 5);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = COLORS.goldLight;
    ctx.font = 'bold 15px KaiTi, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ellipsize(ctx, toast.text, tw - 16), tx + tw / 2, ty + 15);

    const subColor = toast.kind === 'promote' ? COLORS.redLight
      : (toast.kind === 'demote' ? COLORS.blueLight
        : (toast.kind === 'pickup' && toast.sub?.includes('升') ? COLORS.redLight
          : (toast.sub?.includes('谪') || toast.sub?.includes('不及') ? COLORS.blueLight : COLORS.paper)));
    ctx.fillStyle = subColor;
    ctx.font = '12px KaiTi, serif';
    ctx.fillText(ellipsize(ctx, toast.sub || '', tw - 16), tx + tw / 2, ty + 32);
    ctx.restore();
  }

  function drawAmbientBanner(ctx, layout, banner) {
    if (!banner) return;
    const y = 78;
    const bh = 14;
    const x = banner.x;
    const w = banner.w;
    const clipX = layout.mode === 'bottom' ? 0 : layout.panelX;
    const clipW = layout.mode === 'bottom' ? layout.playAreaW : layout.panelW;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, y - 1, clipW, bh + 2);
    ctx.clip();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(26,18,8,0.78)';
    roundRect(ctx, x, y, w, bh, 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.goldLight;
    ctx.font = 'bold 10px KaiTi, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('朝报', x + 4, y + bh / 2);
    ctx.fillStyle = '#f0e8d8';
    ctx.font = '10px KaiTi, serif';
    ctx.fillText(
      ellipsize(ctx, `${banner.title} · ${banner.brief}`, w - 36),
      x + 30,
      y + bh / 2
    );
    ctx.restore();
  }

  function drawOverlay(ctx, w, h, lines, title, btn) {
    ctx.fillStyle = 'rgba(26,18,8,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COLORS.paper;
    const bw = Math.min(480, w - 40);
    const bh = 320;
    const bx = (w - bw) / 2;
    const by = (h - bh) / 2;
    roundRect(ctx, bx, by, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = COLORS.seal;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'bold 22px KaiTi, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, bx + bw / 2, by + 44);
    ctx.font = '15px KaiTi, serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + bw / 2, by + 84 + i * 30);
    });
    if (btn) {
      ctx.fillStyle = COLORS.seal;
      roundRect(ctx, bx + bw / 2 - 72, by + bh - 52, 144, 36, 4);
      ctx.fill();
      ctx.fillStyle = COLORS.paper;
      ctx.fillText(btn, bx + bw / 2, by + bh - 28);
    }
  }

  return {
    COLORS, aabb, setLayout, drawPaperTexture, drawPlayChrome, drawHud, drawLaneHeaders,
    drawLanes, drawPlayer, drawNpc, drawAmnesty, drawObstacle, drawSpecial, drawCoronationRobe, drawCoronationBanner,
    drawPickup, drawCoin, drawMerit, drawImpeachBall, drawBattleBullet, drawLightDrop,
    drawRankPanel, drawRankPanelBottom, drawToast, drawAmbientBanner, drawOverlay, LANE_NAMES
  };
})();
