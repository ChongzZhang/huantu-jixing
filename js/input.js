/* 宦途疾行 · 输入 — 鼠标/触摸二维跟随 */
const Input = (() => {
  let mouseX = 0;
  let mouseY = 0;
  let active = false;

  function init(canvas) {
    const onMove = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = clientX - rect.left;
      mouseY = clientY - rect.top;
      active = true;
    };
    canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    canvas.addEventListener('mousedown', (e) => onMove(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    return {
      getPos: () => ({ x: mouseX, y: mouseY }),
      getX: () => mouseX,
      getY: () => mouseY,
      isActive: () => active,
      setDefault: (x, y) => {
        if (!active) {
          mouseX = x;
          mouseY = y;
        }
      },
      resetActive: () => { active = false; }
    };
  }

  return { init };
})();
