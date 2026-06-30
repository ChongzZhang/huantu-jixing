/* 宦途疾行 · 道具效果（颜色=升降，深浅=幅度） */
const PickupFx = (() => {
  const TRACK_LABELS = { benguan: '本官', sanjie: '散阶', xun: '勋', jue: '爵' };

  /** 幅度仅由颜色深浅决定：浅 ±1，深 ±2 */
  function resolveSteps(p) {
    if (p.steps === 0) return 0;
    return p.shade === 'dark' ? 2 : 1;
  }

  function fillColor(p, COLORS) {
    if (p.meritValue) return '#6b3a5c';
    if (p.coinValue) return COLORS.gold;
    const isRed = p.color === 'red';
    const dark = p.shade === 'dark';
    if (stepsZero(p)) return '#8a8070';
    return isRed
      ? (dark ? COLORS.redDark : COLORS.redLight)
      : (dark ? COLORS.blueDark : COLORS.blueLight);
  }

  function effectLabel(p) {
    if (p.meritValue) return `+${p.meritValue} 功劳`;
    if (p.coinValue) return `+${p.coinValue} 封赏`;
    const steps = resolveSteps(p);
    const track = TRACK_LABELS[p.track] || '';
    if (steps === 0) return p.brief || '无品阶变动';
    const n = steps === 2 ? '二' : '一';
    const verb = p.color === 'red' ? '升' : '谪';
    return `${track}${verb}${n}阶`;
  }

  function shortBadge(p) {
    if (p.meritValue) return '功';
    if (p.coinValue) return '钱';
    const steps = resolveSteps(p);
    if (steps === 0) return '—';
    const sign = p.color === 'red' ? '+' : '−';
    return sign + steps;
  }

  /** 拾取道具时的安危/气节变动（与显示一致） */
  function vitalsDelta(p) {
    if (p.meritValue) return { safety: 2, integrity: 4 };
    if (p.coinValue) return { safety: 0, integrity: 2 };
    const steps = resolveSteps(p);
    if (steps === 0) {
      return p.color === 'red'
        ? { safety: 5, integrity: 4 }
        : { safety: -6, integrity: -5 };
    }
    const mag = steps === 2 ? 2 : 1;
    if (p.color === 'red') return { safety: 6 * mag, integrity: 8 * mag };
    return { safety: -10 * mag, integrity: -14 * mag };
  }

  function trackShort(p) {
    const map = { benguan: '本', sanjie: '散', xun: '勋', jue: '爵' };
    return map[p.track] || '';
  }

  function stepsZero(p) {
    return resolveSteps(p) === 0;
  }

  return {
    resolveSteps, effectLabel, shortBadge, trackShort, fillColor, vitalsDelta, TRACK_LABELS
  };
})();
