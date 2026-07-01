/* 宦途疾行 · 主循环 */
const GAME_DURATION = 360;
const SPEED_MIN = 235;
const SPEED_MAX = 880;
const START_AGE = 24;
const SECONDS_PER_YEAR = 8; // 9.6÷1.2，年齿增速为上一版 1.2 倍
const AGE_DEATH_START = 51;
const AGE_DEATH_RAMP = 66;
const PANEL_W = 340;
const HUD_TOP = 142;
const HUD_TOP_MOBILE = 108;

const Game = (() => {
  let canvas, ctx, input;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let phase = 'menu';
  let player, playerName = '沈砚青';
  let timeLeft = GAME_DURATION;
  let lastTs = 0;
  let layout = {};
  let endResult = null;
  let audioCtx = null;
  let paused = false;
  let sessionNpcKnockouts = 0;

  function isMobileLayout() {
    return window.matchMedia('(max-width: 640px)').matches;
  }

  function layoutUiScale() {
    if (isMobileLayout()) return 1.1;
    return Math.min(1.55, Math.max(1.3, cssW / 680));
  }

  function layoutPanelW() {
    if (isMobileLayout()) return 0;
    return Math.round(Math.max(260, Math.min(PANEL_W, cssW * 0.22)));
  }

  function layoutDpr() {
    const raw = window.devicePixelRatio || 1;
    if (isMobileLayout()) return Math.min(raw, 2);
    return Math.min(Math.max(raw, 2), 3);
  }

  function layoutHudTop() {
    return isMobileLayout() ? HUD_TOP_MOBILE : HUD_TOP;
  }

  function applyLayout() {
    layout = Lanes.compute(cssW, cssH, layoutPanelW(), layoutHudTop(), {
      mobile: isMobileLayout()
    });
    layout.isMobile = isMobileLayout();
    layout.uiScale = layoutUiScale();
  }

  function updateControlHints() {
    const touch = Input?.isTouchDevice?.() ?? false;
    document.querySelectorAll('.hint-touch').forEach((el) => {
      el.classList.toggle('hidden', !touch);
    });
    document.querySelectorAll('.hint-mouse').forEach((el) => {
      el.classList.toggle('hidden', touch);
    });
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) pauseBtn.title = touch ? '暂停' : '暂停 (P)';
  }

  let ready = false;
  let loadError = '';

  function setPhaseClass() {
    const wrap = document.getElementById('wrap');
    if (!wrap) return;
    wrap.classList.remove('phase-menu', 'phase-play', 'phase-end');
    wrap.classList.add('phase-' + phase);
  }

  function bindUi() {
    Tutorial.bind();
    const diffEl = document.getElementById('difficulty');
    diffEl?.addEventListener('change', updateDifficultyHint);
    updateDifficultyHint();
    document.getElementById('btn-start')?.addEventListener('click', (e) => {
      e.preventDefault();
      tryStart();
    });
    document.getElementById('btn-codex')?.addEventListener('click', (e) => {
      e.preventDefault();
      showCodex();
    });
    document.getElementById('btn-test-battle')?.addEventListener('click', (e) => {
      e.preventDefault();
      tryCoronationTest(false);
    });
    document.getElementById('btn-test-boss')?.addEventListener('click', (e) => {
      e.preventDefault();
      tryCoronationTest(true);
    });
    document.getElementById('btn-retry')?.addEventListener('click', (e) => {
      e.preventDefault();
      phase = 'menu';
      showScreen('menu');
      document.getElementById('screen-menu')?.classList.remove('hidden');
      setPhaseClass();
    });
    document.getElementById('btn-codex-end')?.addEventListener('click', (e) => {
      e.preventDefault();
      showCodex();
    });
    document.getElementById('btn-pause')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (phase === 'play') togglePause(true);
    });
    document.getElementById('btn-resume')?.addEventListener('click', (e) => {
      e.preventDefault();
      togglePause(false);
    });
    document.getElementById('btn-quit')?.addEventListener('click', (e) => {
      e.preventDefault();
      quitToMenu();
    });
    window.addEventListener('keydown', (e) => {
      if (Tutorial.isActive()) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Tutorial.advance();
        }
        return;
      }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phase === 'play') togglePause(!paused);
      }
    });
  }

  function updateDifficultyHint() {
    const el = document.querySelector('.hint-mouse');
    if (!el) return;
    const diff = document.getElementById('difficulty')?.value || 'normal';
    const base = '鼠标跟随 · 碰触拾取（奏章同） · P 暂停';
    el.textContent = diff === 'hell'
      ? `${base} · 地狱：点玩法区发射弹劾弹（15s）`
      : base;
  }

  function registerNpcKnockout() {
    sessionNpcKnockouts += 1;
  }

  function tryUseAmnesty(label) {
    if (!player || !(player.amnestyLeft > 0)) return false;
    player.amnestyLeft = 0;
    EventLog.showQuick('免死金牌', `挡下${label}`, 'promote');
    return true;
  }

  function tickAmnesty(dt) {
    if (!player || !(player.amnestyLeft > 0)) return;
    player.amnestyLeft -= dt;
    if (player.amnestyLeft <= 0) {
      player.amnestyLeft = 0;
      EventLog.showQuick('免死金牌', '逾期未用，作废', 'demote');
    }
  }

  function togglePause(on) {
    if (phase !== 'play') return;
    paused = on;
    const el = document.getElementById('screen-pause');
    if (el) el.classList.toggle('hidden', !paused);
  }

  function quitToMenu() {
    paused = false;
    phase = 'menu';
    EventLog.closeDetail?.();
    document.getElementById('screen-pause')?.classList.add('hidden');
    showScreen('menu');
    document.getElementById('screen-menu')?.classList.remove('hidden');
    setPhaseClass();
  }

  function tryStart() {
    if (!ready) {
      const el = document.getElementById('load-hint');
      if (el) el.textContent = loadError || '数据加载中，请稍候…';
      return;
    }
    startFromMenu();
  }

  function showLoadError(msg) {
    loadError = msg;
    const el = document.getElementById('load-hint');
    if (el) el.textContent = msg;
  }

  async function init() {
    bindUi();
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
      window.visualViewport.addEventListener('scroll', resize);
    }

    try {
      const data = await DataLoad.loadAll();
      await Ranks.load(data);
      await Spawner.load(data);
      await EventLog.load(data);
      ready = true;
      showLoadError('');
    } catch (e) {
      console.error('宦途疾行加载失败', e);
      showLoadError('加载失败：' + (e.message || '请刷新页面重试'));
    }

    applyLayout();
    input = Input.init(canvas);
    input.setDefault(
      layout.trackLeft + layout.trackWidth / 2,
      layout.playTop + layout.playHeight - 56
    );
    updateControlHints();

    canvas.addEventListener('click', onCanvasClick);

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { /* 古琴 ambient 占位 */ }

    phase = 'menu';
    showScreen('menu');
    setPhaseClass();
    requestAnimationFrame(loop);

    const testMode = parseTestMode();
    if (testMode === 'coronation') startCoronationTest();
    if (testMode === 'boss') startCoronationTest({ skipToBoss: true });
  }

  function resize() {
    const wrap = document.getElementById('wrap');
    const vp = window.visualViewport;
    const mobile = isMobileLayout();
    dpr = layoutDpr();
    cssW = Math.round(mobile ? (wrap?.clientWidth || window.innerWidth) : window.innerWidth);
    cssH = Math.round(mobile && vp?.height ? vp.height : window.innerHeight);
    if (cssH < 400) cssH = Math.max(400, window.innerHeight);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    applyLayout();
    updateControlHints();
  }

  function showScreen(id) {
    ['menu', 'hud', 'end'].forEach((s) => {
      const el = document.getElementById('screen-' + s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  }

  function startFromMenu() {
    const nameInput = document.getElementById('player-name');
    playerName = (nameInput?.value || '沈砚青').trim() || '沈砚青';
    const diffEl = document.getElementById('difficulty');
    Difficulty.set(diffEl?.value || 'normal');
    startGame();
  }

  function enterCoronationBattle() {
    Coronation.startChallenge();
    Spawner.enterCoronationMode();
    CoronationBattle.start(layout, Npcs.getList(), Rivals.getList());
    Npcs.reset();
    Rivals.reset();
  }

  function startCoronationTest(options = {}) {
    if (!ready) {
      showLoadError('数据加载中，请稍候再试…');
      return false;
    }
    const nameInput = document.getElementById('player-name');
    playerName = (nameInput?.value || '沈砚青').trim() || '沈砚青';
    const diffEl = document.getElementById('difficulty');
    Difficulty.set(diffEl?.value || 'normal');

    Ranks.reset();
    Spawner.reset();
    Npcs.reset();
    Rivals.reset();
    Coronation.reset();
    CoronationBattle.reset();
    Impeachment.reset();
    EventLog.reset();
    sessionNpcKnockouts = 0;
    Npcs.setOnKnockout(registerNpcKnockout);
    Rivals.setOnKnockout(registerNpcKnockout);
    timeLeft = GAME_DURATION;
    endResult = null;
    paused = false;
    Tutorial.end();
    document.getElementById('screen-pause')?.classList.add('hidden');
    input.resetActive();
    player = Player.create(
      layout,
      layout.playTop + layout.playHeight - 56
    );
    input.setDefault(player.x, player.y);
    Ranks.setGrandWin();
    Npcs.seed(layout);
    Rivals.seed(layout);
    phase = 'play';
    showScreen('hud');
    document.getElementById('screen-menu')?.classList.add('hidden');
    setPhaseClass();
    enterCoronationBattle();
    if (options.skipToBoss) {
      CoronationBattle.skipToBossPhase(layout);
      EventLog.showQuick('测试模式', '直抵伪帝决战 · 殿陛 Boss', 'promote');
    } else {
      EventLog.showQuick('测试模式', '直抵逼宫战 · 四波百敌后伪帝', 'promote');
    }
    return true;
  }

  function tryCoronationTest(skipToBoss = false) {
    if (!ready) {
      const el = document.getElementById('load-hint');
      if (el) el.textContent = loadError || '数据加载中，请稍候…';
      return;
    }
    startCoronationTest({ skipToBoss });
  }

  function parseTestMode() {
    const q = new URLSearchParams(window.location.search);
    const v = (q.get('test') || '').toLowerCase();
    if (v === 'boss' || v === '伪帝' || v === 'emperor') return 'boss';
    if (v === 'coronation' || v === 'battle' || v === '终局') return 'coronation';
    return null;
  }

  function startGame() {
    Ranks.reset();
    Spawner.reset();
    Npcs.reset();
    Rivals.reset();
    Coronation.reset();
    CoronationBattle.reset();
    Impeachment.reset();
    EventLog.reset();
    sessionNpcKnockouts = 0;
    Npcs.setOnKnockout(registerNpcKnockout);
    Rivals.setOnKnockout(registerNpcKnockout);
    timeLeft = GAME_DURATION;
    endResult = null;
    paused = false;
    document.getElementById('screen-pause')?.classList.add('hidden');
    input.resetActive();
    player = Player.create(
      layout,
      layout.playTop + layout.playHeight - 56
    );
    input.setDefault(player.x, player.y);
    Npcs.seed(layout);
    Rivals.seed(layout);
    phase = 'play';
    showScreen('hud');
    document.getElementById('screen-menu').classList.add('hidden');
    setPhaseClass();
    playAmbientPing();
    Tutorial.begin();
  }

  function playAmbientPing() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 220;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    o.stop(audioCtx.currentTime + 1.2);
  }

  function getSpeed() {
    if (Coronation.isActive()) return SPEED_MAX;
    const progress = getProgress() * 0.5;
    const curve = Math.pow(progress, 0.85) * 0.32 + Math.pow(progress, 3.6) * 0.68;
    const rankBoost = Ranks.benguanLevel() * 3.8;
    return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * curve + rankBoost;
  }

  function getProgress() {
    return 1 - timeLeft / GAME_DURATION;
  }

  function getPlayerAge() {
    const elapsed = GAME_DURATION - timeLeft;
    return START_AGE + Math.floor(elapsed / SECONDS_PER_YEAR);
  }

  function getAgeProgress() {
    const elapsed = GAME_DURATION - timeLeft;
    return (elapsed % SECONDS_PER_YEAR) / SECONDS_PER_YEAR;
  }

  function formatTenureLeft() {
    if (Coronation.isActive()) {
      const hud = CoronationBattle.getHud();
      if (CoronationBattle.isBossPhase()) {
        const boss = hud.bossActive;
        return boss ? `帝${(hud.bossMaxHits || 16) - (hud.bossHits || 0)}` : '…';
      }
      return `敌${hud.enemiesLeft}`;
    }
    const sec = Math.max(0, Math.ceil(timeLeft));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function getAgeDeathChancePerSecond(age) {
    if (age < AGE_DEATH_START) return 0;
    const t = Math.min(1, (age - AGE_DEATH_START) / (AGE_DEATH_RAMP - AGE_DEATH_START));
    const curve = Math.pow(t, 2.1);
    return 0.0006 + curve * 0.014;
  }

  function tenureHudLabel() {
    if (!Coronation.isActive()) return '任期余';
    if (CoronationBattle.isBossPhase()) return '逼宫余';
    return '四轮余';
  }

  function tryOfferCoronation() {
    if (!Ranks.isGrandWin() || Coronation.isOffered()) return;
    Coronation.offer();
    Spawner.spawnCoronationRobe(layout);
    EventLog.showQuick('黄袍加身', '四线顶格！金黄袍服飘来……', 'promote');
  }

  function handleCoronationRobe() {
    const robe = Spawner.getCoronationRobe();
    if (!robe || Coronation.isPicked()) return;
    const pb = Player.hitbox(player);
    const pad = 14;
    const bob = Math.sin(robe.pulse || 0) * 4;
    const box = {
      x: robe.x - robe.w / 2 - pad,
      y: robe.y + bob - robe.h / 2 - pad,
      w: robe.w + pad * 2,
      h: robe.h + pad * 2
    };
    if (!Renderer.aabb(pb, box)) return;
    Spawner.removeCoronationRobe();
    enterCoronationBattle();
    EventLog.showQuick('黄袍加身', '同僚归心！先破四轮，再逼宫登基！', 'promote');
  }

  function resolveEndOutcome(type, reason) {
    if (Coronation.isPicked() && type === 'fail') {
      return { type: 'traitor', reason: '乱臣贼子' };
    }
    if (type === 'time' && Ranks.isGrandWin() && !Coronation.isPicked()) {
      return { type: 'minister', reason: '位极人臣' };
    }
    if (type === 'emperor') {
      return { type: 'emperor', reason: '登基称帝' };
    }
    return { type, reason };
  }

  function checkAgeMortality(dt) {
    if (Coronation.isActive()) return false;
    const age = getPlayerAge();
    const chance = getAgeDeathChancePerSecond(age);
    if (chance <= 0) return false;
    if (Math.random() >= chance * dt) return false;
    const reasons = ['卒于任所', '突发急症', '心力交瘁', '客死途中', '病逝任所'];
    endGame('fail', reasons[Math.floor(Math.random() * reasons.length)]);
    return true;
  }

  function checkVitals() {
    if (player.safety <= 0) {
      endGame('fail', '安危尽失');
      return true;
    }
    if (player.integrity <= 0) {
      endGame('fail', '气节尽毁');
      return true;
    }
    return false;
  }

  function applyVitalsDelta(safety, integrity) {
    if (safety) player.safety = Math.max(0, Math.min(100, player.safety + safety));
    if (integrity) player.integrity = Math.max(0, Math.min(100, player.integrity + integrity));
    return checkVitals();
  }

  function applyCoinValue(value, silent) {
    player.distance += value;
    player.coins = (player.coins || 0) + 1;
    player.coinBank = (player.coinBank || 0) + value;
    if (!silent) EventLog.showQuick('封赏', `+${value}（满则随机升官）`, 'coin');

    const th = Ranks.getCoinThreshold();
    while (player.coinBank >= th) {
      player.coinBank -= th;
      const track = Ranks.randomPromotableTrack();
      if (!track) break;
      Ranks.promote(track, 1);
      const st = Ranks.getState().find((s) => s.track === track);
      EventLog.showQuick('封赏升官', `${st.label} → ${st.current.name}`, 'promote');
    }
    applyVitalsDelta(0, 2);
    checkVitals();
  }

  function applyMeritValue(value, silent) {
    player.meritBank = (player.meritBank || 0) + value;
    if (!silent) EventLog.showQuick('功劳', `+${value}（满则升最低官）`, 'merit');

    const th = Ranks.getMeritThreshold();
    while (player.meritBank >= th) {
      player.meritBank -= th;
      const track = Ranks.lowestPromotableTrack();
      if (!track) break;
      Ranks.promote(track, 1);
      const st = Ranks.getState().find((s) => s.track === track);
      EventLog.showQuick('功劳升官', `${st.label} → ${st.current.name}`, 'promote');
    }
    applyVitalsDelta(2, 4);
    checkVitals();
  }

  function applyObstacleEvent(o, silent) {
    const label = o.eventLabel || o.brief || o.name;
    const kind = o.eventPolarity === 'good' ? 'promote' : 'demote';

    if (o.safety || o.integrity) {
      applyVitalsDelta(o.safety || 0, o.integrity || 0);
    }
    if (o.merit) applyMeritValue(o.merit, true);
    if (o.coin) applyCoinValue(o.coin, true);

    if (o.promoteTrack && o.promoteSteps) {
      Ranks.promote(o.promoteTrack, o.promoteSteps);
      if (!silent) EventLog.showQuick(o.name, label, 'promote');
      checkVitals();
      return;
    }

    if (o.demoteTrack && o.demoteSteps) {
      const res = Ranks.demote(o.demoteTrack, o.demoteSteps);
      if (!res.ok) {
        if (tryUseAmnesty('谪尽')) {
          if (!silent) EventLog.showQuick(o.name, label, 'demote');
          checkVitals();
          return;
        }
        endGame('fail', res.reason);
        return;
      }
      if (!silent) EventLog.showQuick(o.name, label, 'demote');
      checkVitals();
      return;
    }

    if (!silent) EventLog.showQuick(o.name, label, kind);
    checkVitals();
  }

  function resolveSpecial(s) {
    ObstacleEvents.resolveOnContact(s, getProgress());
    const sub = `${s.eventIcon} ${s.eventLabel}`;
    EventLog.showQuick(s.name, sub, 'promote');
    applyObstacleEvent(s, true);
    Spawner.removeSpecial(s);
  }

  function handleSpecial(s) {
    const pb = Player.hitbox(player);
    const pad = 12;
    const bob = Math.sin(s.pulse || 0) * 3;
    const cy = s.y + bob;
    const box = {
      x: s.x - s.w / 2 - pad,
      y: cy - s.h / 2 - pad,
      w: s.w + pad * 2,
      h: s.h + pad * 2
    };
    if (!Renderer.aabb(pb, box)) return;
    resolveSpecial(s);
  }

  function handleObstacle(o) {
    if (player.invincible > 0) return;

    const pb = Player.hitbox(player);
    const ob = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
    if (!Renderer.aabb(pb, ob)) return;

    Spawner.removeObstacle(o);
    player.invincible = 1;

    if (o.tier === 3) {
      if (tryUseAmnesty('诏狱')) return;
      endGame('fail', ExitReasons.pickPrisonExit(getPlayerAge()));
      return;
    }

    applyVitalsDelta(-Math.round((o.damage || 15) * (1 + getProgress() * 0.5)), -8);
  }

  function handlePickup(p) {
    const pb = Player.hitbox(player);
    const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
    if (!Renderer.aabb(pb, box)) return;

    if (p.meritValue) {
      Spawner.removePickup(p);
      applyMeritValue(p.meritValue);
      return;
    }
    if (p.coinValue) {
      Spawner.removePickup(p);
      applyCoinValue(p.coinValue);
      return;
    }

    if (p.color === 'blue' && p.steps > 0 && player.amnestyLeft > 0) {
      Spawner.removePickup(p);
      tryUseAmnesty('贬谪');
      return;
    }

    const result = Ranks.applyPickup(p);
    Spawner.removePickup(p);

    if (result.gameOver) {
      if (tryUseAmnesty('谪尽')) return;
      endGame('fail', result.reason);
      return;
    }
    if (result.blocked) {
      EventLog.showQuick(p.name, `${Ranks.LABELS[p.track]}未授，谪罚不及`);
      return;
    }

    const effect = PickupFx.effectLabel(p);
    if (result.applied.length) {
      EventLog.addPickup(p);
    } else if (PickupFx.resolveSteps(p) > 0) {
      EventLog.showQuick(p.name, effect);
      return;
    } else {
      EventLog.addPickup(p);
    }

    if (result.vitals) applyVitalsDelta(result.vitals.safety, result.vitals.integrity);
  }

  function handleCoin(c) {
    const pb = Player.hitbox(player);
    const box = { x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h };
    if (!Renderer.aabb(pb, box)) return;
    Spawner.removeCoin(c);
    applyCoinValue(c.value);
  }

  function handleMerit(m) {
    const pb = Player.hitbox(player);
    const box = { x: m.x - m.w / 2, y: m.y - m.h / 2, w: m.w, h: m.h };
    if (!Renderer.aabb(pb, box)) return;
    Spawner.removeMerit(m);
    applyMeritValue(m.value);
  }

  function handleAmnesty(a) {
    if (player.amnestyLeft > 0) return;
    const pb = Player.hitbox(player);
    const box = { x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h };
    if (!Renderer.aabb(pb, box)) return;
    Spawner.removeAmnesty(a);
    player.amnestyLeft = 20;
    EventLog.showQuick('免死金牌', '20秒内可挡贬谪或出局一次', 'promote');
  }

  function buildLifeScroll(type, reason) {
    const r = {
      name: playerName,
      age: getPlayerAge(),
      ranks: Ranks.snapshot(),
      grandWin: Ranks.isGrandWin(),
      coronationPicked: Coronation.isPicked(),
      codex: EventLog.getCodex(),
      safety: player.safety,
      integrity: player.integrity,
      type,
      reason
    };
    const bg = r.ranks.benguan?.name || '白身';
    const saved = Storage.load();
    const scrollBase = {
      title: '',
      subtitle: `庆历 ${r.name} 人生卷轴`,
      meta: `年齿 ${r.age} 岁 · 功 ${Math.round(player.meritBank || 0)}`,
      name: r.name,
      age: r.age,
      safety: r.safety,
      integrity: r.integrity,
      type,
      reason: type === 'fail' ? ExitReasons.fitReason(reason, r.age) : (reason || null),
      grandWin: r.grandWin,
      coronationPicked: r.coronationPicked,
      ranks: r.ranks,
      npcKnockouts: sessionNpcKnockouts,
      totalNpcKnockouts: (saved.achievements?.npcKnockouts || 0) + sessionNpcKnockouts
    };
    const ending = LifeScroll.buildEnding(scrollBase);
    return {
      ...scrollBase,
      title: ending.title,
      lines: ending.epilogue,
      seal: ending.seal
    };
  }

  function endGame(type, reason) {
    if (phase === 'end') return;
    const outcome = resolveEndOutcome(type, reason);
    type = outcome.type;
    reason = outcome.reason;
    phase = 'end';
    const grandWin = Ranks.isGrandWin();
    endResult = {
      type,
      reason,
      distance: player.distance,
      age: getPlayerAge(),
      ranks: Ranks.snapshot(),
      grandWin,
      coronationPicked: Coronation.isPicked(),
      codex: EventLog.getCodex(),
      name: playerName,
      npcKnockouts: sessionNpcKnockouts,
      scroll: buildLifeScroll(type, reason)
    };
    Storage.mergeRun(endResult);
    showEndScreen();
    showScreen('end');
    setPhaseClass();
  }

  function showEndScreen() {
    LifeScroll.render(endResult.scroll);
  }

  function buildBiography(r) {
    const bg = r.ranks.benguan?.name || '白身';
    if (r.grandWin) {
      return [
        `${r.name}，庆历进士，历四途并进，终至${bg}。`,
        '朝野称之「一时之选」，史册留名。',
        '大胜之局，图鉴已录。'
      ];
    }
    if (r.type === 'fail') {
      return [
        `${r.name}，本官止于${bg}，因${r.reason}。`,
        '士林叹息，然名节或未尽毁。',
        '重来一局，或可另辟宦途。'
      ];
    }
    return [
      `${r.name}，宦途六载，年齿${r.age ?? START_AGE}岁，终官${bg}。`,
      (r.age ?? START_AGE) >= 28 ? '岁月不居，官声渐著。' : '少年得志，前程未可限量。',
      '局后可于图鉴回看典故。'
    ];
  }

  function showCodex() {
    const saved = Storage.load();
    const list = saved.codex.length ? saved.codex : EventLog.getCodex();
    const html = list.length
      ? list.map((c) => `<div class="codex-item"><strong>${c.name}</strong><span class="codex-fx">${c.effect || PickupFx.effectLabel(c)}</span><p>${c.detail || c.brief}</p></div>`).join('')
      : '<p>尚无收录。对局中拾取道具可解锁典故。</p>';
    document.getElementById('codex-body').innerHTML = html;
    document.getElementById('modal-codex').classList.remove('hidden');
  }

  function handlePlayerImpeachHit() {
    const res = Ranks.demoteHighest(1);
    const track = res.track;
    const label = track ? Ranks.LABELS[track] : '官阶';
    if (!res.ok) {
      if (tryUseAmnesty('弹劾')) return;
      endGame('fail', res.reason);
      return;
    }
    if (res.noop) {
      EventLog.showQuick('弹劾中招', '无官可贬', 'demote');
      return;
    }
    const st = track ? Ranks.getState().find((s) => s.track === track) : null;
    EventLog.showQuick(
      '弹劾中招',
      `${label}贬一阶${st ? ' · ' + st.current.name : ''}`,
      'demote'
    );
  }

  function onCanvasClick(e) {
    if (phase !== 'play' || paused || Tutorial.isActive()) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const inPlay = layout.mode === 'bottom' ? y <= layout.panelY : x <= layout.panelX;
    if (inPlay && Coronation.isActive()) {
      if (CoronationBattle.tryPlayerFire(player)) return;
    }
    if (inPlay && Impeachment.tryPlayerFire(player, Rivals.getList(), Npcs.getList())) {
      return;
    }

    if (layout.mode === 'bottom' ? y > layout.panelY : x > layout.panelX) {
      const codex = EventLog.getCodex();
      if (codex.length) EventLog.showDetail(codex[codex.length - 1]);
    }
  }

  function update(dt) {
    if (phase !== 'play' || paused || Tutorial.isActive()) return;

    const inBattle = Coronation.isActive();

    if (inBattle) {
      const battleResult = CoronationBattle.tick(dt, layout, player, input);
      if (battleResult === 'win') {
        Coronation.endChallenge();
        endGame('emperor', '登基称帝');
        return;
      }
      if (battleResult === 'lose') {
        Coronation.endChallenge();
        endGame('fail', '乱臣贼子');
        return;
      }
      Ranks.tick(dt);
      EventLog.tick(dt, 1, layout.mode === 'bottom' ? 0 : layout.panelX,
        layout.mode === 'bottom' ? layout.playAreaW : layout.panelW);
      return;
    }

    const progress = getProgress();
    const speed = getSpeed();
    player.distance += speed * dt;

    Player.update(player, input.getPos(), layout, dt);
    tickAmnesty(dt);
    Spawner.tick(dt, progress, layout, speed, Ranks.getState());
    Ranks.tick(dt);
    const bannerX = layout.mode === 'bottom' ? 0 : layout.panelX;
    const bannerW = layout.mode === 'bottom' ? layout.playAreaW : layout.panelW;
    EventLog.tick(dt, progress, bannerX, bannerW);

    Spawner.getObstacles().forEach(handleObstacle);
    Spawner.getSpecials().forEach(handleSpecial);
    Spawner.getPickups().forEach(handlePickup);
    Spawner.getCoins().forEach(handleCoin);
    Spawner.getMerits().forEach(handleMerit);
    Spawner.getAmnesties().forEach(handleAmnesty);
    handleCoronationRobe();

    const spawnerState = {
      pickups: Spawner.getPickups(),
      coins: Spawner.getCoins(),
      merits: Spawner.getMerits(),
      obstacles: Spawner.getObstacles()
    };
    const aiPeers = [...Npcs.getList(), ...Rivals.getList()];
    Npcs.tick(dt, layout, player, speed, progress, spawnerState, aiPeers);
    Rivals.tick(dt, layout, spawnerState, aiPeers);

    const badPickups = Spawner.getPickups().filter((p) => p.color === 'blue');
    Impeachment.tick(
      dt, layout, player,
      Rivals.getList(), Npcs.getList(), badPickups,
      handlePlayerImpeachHit
    );

    tryOfferCoronation();

    if (!Coronation.isActive()) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame('time', '任期已满');
        return;
      }
    }

    if (checkAgeMortality(dt)) return;
    checkVitals();
  }

  function render() {
    const w = cssW;
    const h = cssH;
    Renderer.drawPaperTexture(ctx, w, h);

    if (phase === 'menu') {
      return;
    }
    if (!player) return;

    Renderer.setLayout(layout);
    Renderer.drawPlayChrome(ctx, layout, h);
    Renderer.drawHud(ctx, layout.playAreaW, layout.hudH, {
      playerName,
      age: getPlayerAge(),
      coinBank: player.coinBank || 0,
      coinNeed: Ranks.getCoinThreshold(),
      meritBank: player.meritBank || 0,
      meritNeed: Ranks.getMeritThreshold(),
      safety: player.safety,
      integrity: player.integrity,
      amnestyLeft: player.amnestyLeft || 0,
      hellMode: Difficulty.isHell(),
      impeachReady: Impeachment.isPlayerReady(),
      impeachLeft: Impeachment.getPlayerCdLeft()
    }, layout);
    Renderer.drawLaneHeaders(ctx, layout);
    Renderer.drawLanes(ctx, layout, layout.playHeight);

    if (Coronation.isActive()) {
      CoronationBattle.getAllies().forEach((npc) => Renderer.drawNpc(ctx, npc, 'ally'));
      CoronationBattle.getEnemies().forEach((npc) => {
        Renderer.drawNpc(ctx, npc, npc.isBoss ? 'boss' : 'enemy');
      });
      CoronationBattle.getDrops().forEach((d) => Renderer.drawLightDrop(ctx, d));
      CoronationBattle.getBullets().forEach((b) => Renderer.drawBattleBullet(ctx, b));
    } else {
      Spawner.getObstacles().forEach((o) => Renderer.drawObstacle(ctx, o));
      Spawner.getSpecials().forEach((s) => Renderer.drawSpecial(ctx, s));
      Npcs.getList().forEach((npc) => Renderer.drawNpc(ctx, npc));
      Rivals.getList().forEach((r) => Renderer.drawNpc(ctx, r));
      Spawner.getAmnesties().forEach((a) => Renderer.drawAmnesty(ctx, a));
      Spawner.getCoins().forEach((c) => Renderer.drawCoin(ctx, c));
      Spawner.getMerits().forEach((m) => Renderer.drawMerit(ctx, m));
      Spawner.getPickups().forEach((p) => Renderer.drawPickup(ctx, p));
      const robe = Spawner.getCoronationRobe();
      if (robe) Renderer.drawCoronationRobe(ctx, robe);
      Impeachment.getProjectiles().forEach((b) => Renderer.drawImpeachBall(ctx, b));
    }

    Renderer.drawPlayer(ctx, player, Coronation.isActive() ? CoronationBattle.getHud() : null);

    if (Coronation.isActive()) {
      Renderer.drawCoronationBanner(ctx, layout, CoronationBattle.getHud());
    }

    const tenureMeta = {
      tenureLeft: formatTenureLeft(),
      tenureLabel: tenureHudLabel(),
      uiScale: layout.uiScale
    };
    if (layout.mode === 'bottom') {
      Renderer.drawRankPanelBottom(ctx, layout, Ranks.getState(), tenureMeta);
    } else {
      Renderer.drawRankPanel(ctx, layout.panelX, layout.panelW, h, Ranks.getState(), {
        age: getPlayerAge(),
        ageProgress: getAgeProgress(),
        tenureLeft: tenureMeta.tenureLeft,
        tenureLabel: tenureMeta.tenureLabel,
        uiScale: layout.uiScale,
        startAge: START_AGE
      });
    }
    Renderer.drawAmbientBanner(ctx, layout, EventLog.getBanner());
    Renderer.drawToast(ctx, layout, h, EventLog.getToast(), EventLog.getToastAlpha());

    if (paused && phase === 'play') {
      Renderer.drawOverlay(ctx, w, h, ['稍憩片刻', '点击继续或按 P'], '暂停', '');
    }

    const detail = EventLog.getDetail();
    if (detail) {
      Renderer.drawOverlay(ctx, w, h,
        [detail.name, detail.brief, detail.detail || ''],
        '典故', '点击继续');
    }
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    try {
      update(dt);
      render();
    } catch (err) {
      console.error('宦途疾行运行错误', err);
      showLoadError('运行出错：' + (err.message || '请刷新重试'));
      phase = 'menu';
      document.getElementById('screen-menu')?.classList.remove('hidden');
      setPhaseClass();
    }
    requestAnimationFrame(loop);
  }

  return { init, tryStart, tryCoronationTest };
})();

document.addEventListener('DOMContentLoaded', () => {
  Game.init();
  document.getElementById('modal-codex')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-codex' || e.target.classList.contains('modal-close')) {
      document.getElementById('modal-codex').classList.add('hidden');
    }
  });
  document.getElementById('game')?.addEventListener('click', () => EventLog.closeDetail());
});
