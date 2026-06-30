/* 宦途疾行 · 开局指引（贴近实机画面） */
const Tutorial = (() => {
  const STEPS = [
    {
      title: '移动',
      line: '手指或鼠标跟随，绯袍即你。',
      scene: 'move'
    },
    {
      title: '拾吉',
      line: '碰触红色卷轴升官；圆形「钱」「功」；浮空金「奏」皆利。',
      scene: 'pickup'
    },
    {
      title: '避凶',
      line: '蓝色卷轴降阶，黑色「狱」出局；金色「免」牌可挡一次。',
      scene: 'danger'
    },
    {
      title: '启程',
      line: '六分钟任期，卷轴结算人生。',
      scene: 'start',
      final: true
    }
  ];

  let step = 0;
  let active = false;
  let onDone = null;

  function el(id) {
    return document.getElementById(id);
  }

  function sceneChrome() {
    return `
      <div class="tut-headers">
        <span>改革道</span><span>中庸道</span><span>守旧道</span>
      </div>
      <div class="tut-field">
        <div class="tut-lane tut-lane-0"></div>
        <div class="tut-gutter"></div>
        <div class="tut-lane tut-lane-1"></div>
        <div class="tut-gutter"></div>
        <div class="tut-lane tut-lane-2"></div>
      </div>`;
  }

  function playerHtml(cls) {
    return `<div class="tut-official ${cls || ''}">
      <div class="tut-head"></div>
      <div class="tut-robe"></div>
    </div>`;
  }

  function pickupRedHtml(cls) {
    return `<div class="tut-pickup tut-pickup-red ${cls || ''}">
      <div class="tut-pk-top"><span>敕书</span><span class="tut-pk-badge">+1</span></div>
      <div class="tut-pk-fx">本官升一阶</div>
    </div>`;
  }

  function pickupBlueHtml(cls) {
    return `<div class="tut-pickup tut-pickup-blue ${cls || ''}">
      <div class="tut-pk-top"><span>台疏</span><span class="tut-pk-badge">−1</span></div>
      <div class="tut-pk-fx">散阶谪一阶</div>
    </div>`;
  }

  function ring(cls) {
    return `<span class="tut-ring ${cls}"></span>`;
  }

  function sceneHtml(kind) {
    const chrome = sceneChrome();
    const you = playerHtml('tut-you');

    if (kind === 'move') {
      return `${chrome}${you}${ring('tut-ring-you')}`;
    }
    if (kind === 'pickup') {
      return `${chrome}${you}
        ${pickupRedHtml('tut-pos-red')}${ring('tut-ring-red')}
        <div class="tut-coin tut-pos-coin">钱</div>
        <div class="tut-merit-chip tut-pos-merit">功</div>
        <div class="tut-special tut-pos-mem">奏</div>${ring('tut-ring-mem')}`;
    }
    if (kind === 'danger') {
      return `${chrome}${you}
        ${pickupBlueHtml('tut-pos-blue')}${ring('tut-ring-blue')}
        <div class="tut-obstacle tut-pos-prison">狱</div>${ring('tut-ring-prison')}
        <div class="tut-amnesty tut-pos-amnesty"><span class="tut-am-main">免</span><span class="tut-am-sub">金牌</span></div>`;
    }
    return `${chrome}${you}<div class="tut-scroll-end">卷</div>`;
  }

  function renderScene(kind) {
    const box = el('tutorial-scene');
    if (!box) return;
    box.dataset.scene = kind || '';
    box.innerHTML = sceneHtml(kind);
  }

  function renderStep() {
    const data = STEPS[step];
    const title = el('tutorial-title');
    const body = el('tutorial-body');
    const prog = el('tutorial-progress');
    const btn = el('tutorial-continue');
    if (!data || !title || !body) return;

    title.textContent = data.title;
    body.textContent = data.line;
    renderScene(data.scene);

    if (prog) prog.textContent = `${step + 1} / ${STEPS.length}`;
    if (btn) btn.textContent = data.final ? '开始' : '继续';
  }

  function bind() {
    const screen = el('screen-tutorial');
    const skip = el('tutorial-skip');

    skip?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      end();
    });

    screen?.addEventListener('click', (e) => {
      if (e.target.closest('#tutorial-skip')) return;
      e.preventDefault();
      advance();
    });
  }

  function begin(done) {
    step = 0;
    active = true;
    onDone = done || null;
    renderStep();
    el('screen-tutorial')?.classList.remove('hidden');
  }

  function advance() {
    if (!active) return;
    step += 1;
    if (step >= STEPS.length) {
      end();
      return;
    }
    renderStep();
  }

  function end() {
    active = false;
    el('screen-tutorial')?.classList.add('hidden');
    const cb = onDone;
    onDone = null;
    cb?.();
  }

  function isActive() {
    return active;
  }

  return { bind, begin, advance, end, isActive };
})();
