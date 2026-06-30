/* 宦途疾行 · 输入 — 鼠标/触屏二维跟随 */
const Input = (() => {
  let mouseX = 0;
  let mouseY = 0;
  let active = false;
  let touchMode = false;

  function isTouchDevice() {
    return touchMode || (typeof window !== 'undefined' && (
      'ontouchstart' in window
      || navigator.maxTouchPoints > 0
      || window.matchMedia('(pointer: coarse)').matches
    ));
  }

  function init(canvas) {
    touchMode = isTouchDevice();

    const onMove = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = clientX - rect.left;
      mouseY = clientY - rect.top;
      active = true;
    };

    const onPointer = (e) => {
      if (e.pointerType === 'touch') touchMode = true;
      onMove(e.clientX, e.clientY);
    };

    canvas.addEventListener('pointerdown', onPointer);
    canvas.addEventListener('pointermove', onPointer);
    canvas.addEventListener('pointerenter', (e) => {
      if (e.buttons || e.pointerType === 'touch') onPointer(e);
    });

    canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    canvas.addEventListener('mousedown', (e) => onMove(e.clientX, e.clientY));

    canvas.addEventListener('touchstart', (e) => {
      touchMode = true;
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    const blockScroll = (e) => {
      const wrap = document.getElementById('wrap');
      if (!wrap?.classList.contains('phase-play')) return;
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', blockScroll, { passive: false });

    return {
      getPos: () => ({ x: mouseX, y: mouseY }),
      getX: () => mouseX,
      getY: () => mouseY,
      isActive: () => active,
      isTouchDevice,
      setDefault: (x, y) => {
        if (!active) {
          mouseX = x;
          mouseY = y;
        }
      },
      resetActive: () => { active = false; }
    };
  }

  return { init, isTouchDevice };
})();
