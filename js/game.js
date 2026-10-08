// 流程：首页 → 12 题（穿插过场和加载失败彩蛋）→ 结局 → 揭晓 → 掷骰子（同分时）→ 结果卡。进度存在 localStorage。

(() => {
  const KEY = 'wallfacer1024_v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app'), hud = $('#hud'), lightsEl = $('#lights'), verEl = $('#ver');
  const modal = $('#modal'), toastEl = $('#toast'), dim = $('#dim');
  const UA = navigator.userAgent;
  const isWx = /MicroMessenger/i.test(UA);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const raf2 = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const color = s => STYLES[s].color;
  const styleOf = qi => QUESTIONS[qi].o[S.answers[qi]].s;

  // 每道题一步，过场插在对应题目后面
  const FLOW = [];
  QUESTIONS.forEach((q, i) => {
    FLOW.push({ t: 'q', i });
    for (const k in SCENES) if (SCENES[k].after === i) FLOW.push({ t: 'scene', k });
  });
  FLOW.push({ t: 'ending' }, { t: 'reveal' }, { t: 'dice' }, { t: 'result' });
  const stepOf = t => FLOW.findIndex(f => f.t === t);

  // ---------- 存档 ----------
  const fresh = () => ({ name: '', step: -1, answers: [], orders: {}, eggDone: false, result: null });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s.step === 'number') return Object.assign(fresh(), s);
    } catch (e) { /* 存档坏了就从头来 */ }
    return fresh();
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 无痕模式等 */ } };
  if (/[?&]reset\b/.test(location.search)) {
    localStorage.removeItem(KEY);
    history.replaceState(null, '', location.pathname);
  }
  let S = load();

  // ---------- 顶部灯条 ----------
  const leds = Array.from({ length: 10 }, () => lightsEl.appendChild(Object.assign(document.createElement('i'), { className: 'led' })));
  function setVersion(v) {
    let lit = false;
    leds.forEach((l, k) => {
      const on = v != null && ((v >> (9 - k)) & 1) === 1;
      if (on && !l.classList.contains('on')) { lit = true; l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop'); }
      l.classList.toggle('on', on);
    });
    verEl.textContent = v == null ? '未立项' : 'v' + v;
    if (lit) setTimeout(SFX.led, 120);
  }
  function hudMode(m) {
    hud.classList.toggle('off', m === 'off');
    hud.classList.toggle('mini', m === 'mini');
  }
  $('#snd').onclick = () => SFX.toggle();
  addEventListener('pointerdown', () => SFX.wake(), { once: true });

  // ---------- 弹窗 / 提示 ----------
  let toastTimer = 0;
  function say(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('in'), 2400);
  }
  function dialog(html, btns, dismiss = false) {
    return new Promise(res => {
      modal.innerHTML = `<div class="box">${html}<div class="${btns.length > 1 ? 'btn-row' : ''}">${btns.map((b, i) => `<button class="btn small${b.ghost ? ' ghost' : ''}" data-i="${i}">${b.t}</button>`).join('')}</div></div>`;
      modal.hidden = false;
      const close = i => { modal.hidden = true; modal.innerHTML = ''; modal.onclick = null; res(i); };
      modal.onclick = e => {
        const b = e.target.closest('[data-i]');
        if (b) { const i = +b.dataset.i; SFX.tap(); if (btns[i].fn) btns[i].fn(); close(i); }
        else if (dismiss && e.target === modal) close(-1);
      };
    });
  }

  // ---------- 页面切换 ----------
  // tok 每换一页 +1，旧页面里还在跑的动画序列一看到 tok 变了就停
  let tok = 0, speed = 1, onKey = null;
  async function wait(t, ms) {
    let done = 0;
    while (done < ms) {
      await sleep(40);
      if (t !== tok) return false;
      done += 40 * speed;
    }
    return t === tok;
  }
  async function mount(html, { cls = '', hudM = 'on', bare = false } = {}) {
    const t = ++tok;
    speed = 1; onKey = null;
    const old = app.querySelector('.screen');
    if (old) { old.classList.add('leave'); await sleep(260); if (t !== tok) return null; }
    dim.classList.remove('on');
    app.classList.remove('lift');
    FX.setEnergy(1);
    hudMode(hudM);
    app.classList.toggle('bare', bare);
    app.innerHTML = `<section class="screen ${cls}">${html}</section>`;
    scrollTo(0, 0);
    return { el: app.firstElementChild, t };
  }
  function go(step) { S.step = step; save(); render(); }
  const adv = t => { if (t === tok) go(S.step + 1); };

  function render() {
    const f = FLOW[S.step];
    if (S.step < 0 || !f) return screenHome();
    if (f.t === 'q') return screenQ(f.i);
    if (f.t === 'scene') return screenScene(f.k);
    const miss = QUESTIONS.findIndex((_, i) => S.answers[i] == null);
    if (miss >= 0) return go(FLOW.findIndex(x => x.t === 'q' && x.i === miss));
    if (f.t === 'ending') return screenEnding();
    if (!S.result) { S.result = computeResult(); save(); }
    if (f.t === 'reveal') return screenReveal();
    if (f.t === 'dice') return S.result.rolls.length ? screenDice() : go(S.step + 1);
    return screenResult();
  }

  addEventListener('keydown', e => {
    if (!modal.hidden || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (onKey) onKey(e);
  });

  // ---------- 计分（进揭晓页时只算一次，存下来） ----------
  function computeResult() {
    const counts = { xc: 0, sj: 0, yl: 0, jf: 0 };
    S.answers.forEach((oi, i) => counts[QUESTIONS[i].o[oi].s]++);
    const rolls = [];
    const top = (pool, kind) => {
      const max = Math.max(...pool.map(s => counts[s]));
      const cands = pool.filter(s => counts[s] === max);
      const pick = cands[(Math.random() * cands.length) | 0];
      if (cands.length > 1) rolls.push({ kind, cands, pick });
      return pick;
    };
    const p = top(RING, 'p');
    const s = top(RING.filter(x => x !== p), 's');
    // 每个关键词 2 道题：优先带梗的那句；都带梗或都不带，取后一道
    const lines = {};
    for (const g of SPIRIT) {
      for (const k of [g, ...g.children]) {
        const [a, b] = k.qs.map(qi => ({ qi, o: QUESTIONS[qi].o[S.answers[qi]] }));
        const pick = a.o.h && !b.o.h ? a : b;
        lines[k.key] = { c: pick.o.c, s: pick.o.s, q: pick.qi };
      }
    }
    return { counts, p, s, rare: counts[p] >= RARE_MIN, rolls, lines, answers: S.answers.slice() };
  }

  // ---------- 首页 ----------
  async function screenHome() {
    const m = await mount(`<div class="home">
      <div class="tag">2¹⁰ · NEW WALL-FACER</div>
      <div class="bits">0b<span>1</span>0000000000 = 1024</div>
      ${SHOW_MASCOT ? '<div class="hero"><div class="orbit"></div><div class="orbit o2"></div><img src="img/00_hero.svg" alt="小钢炮"></div>' : ORB}
      <h1 class="grad">纽扣</h1>
      <div class="intro">
        <p>2046 年，新面壁计划启动。这一次不选 4 个人，选 <em>1024</em> 个。</p>
        <p>接下来，你要陪一件“所有人都说做不成”的事，从一个念头走到发布。</p>
        <p>12 道题，每道 4 种做法。没有错误答案，每一种都是面壁者的做法。</p>
      </div>
      <form class="form" id="f" autocomplete="off">
        <div class="field"><label for="nm">花名 / 昵称</label><input id="nm" maxlength="12" placeholder="会印在你的卡上" enterkeyhint="go"></div>
        <button class="btn" id="start" disabled>启动面壁计划 <span class="arr">→</span></button>
      </form>
      <div class="meta-line">12 道题 · 约 3 分钟 · <span class="mono">4¹² = 16,777,216</span> 种走法</div>
    </div>`, { hudM: 'mini', bare: true });
    if (!m) return;
    const nm = $('#nm'), btn = $('#start');
    nm.value = S.name;
    nm.oninput = () => { btn.disabled = !nm.value.trim(); };
    nm.oninput();
    $('#f').onsubmit = e => {
      e.preventDefault();
      if (!nm.value.trim()) return nm.focus();
      SFX.wake(); SFX.ok();
      S = Object.assign(fresh(), { name: nm.value.trim().slice(0, 12) });
      nm.blur();
      go(0);
    };
  }

  // ---------- 题目 ----------
  const verTag = v => v == null ? '<div class="q-ver none">还没有版本号</div>' : `<div class="q-ver">v${v}</div>`;
  const qHead = (i, stage, ver) => `<div class="q-head"><div class="q-no">Q <b>${pad(i + 1)}</b> / 12<span class="q-stage">${stage}</span></div>${ver}</div>
    <div class="q-half">${i < 6 ? 'PART 1 · 一个人怎么把难事做成' : 'PART 2 · 一群人怎么把难事做成'}</div>`;
  function qBody(i) {
    const q = QUESTIONS[i];
    return `<div class="q-text">${q.text.map((p, j) => `<p style="animation-delay:${0.1 + j * 0.45}s">${esc(p)}</p>`).join('')}</div>
      <div class="opts">${S.orders[i].map((oi, j) => `<button class="opt" data-o="${oi}" style="animation-delay:${0.8 + j * 0.1}s"><span class="k">${'ABCD'[j]}</span><span>${esc(q.o[oi].t)}</span></button>`).join('')}</div>`;
  }
  function bindOpts(root, i, t) {
    const box = $('.opts', root);
    const pick = b => {
      if (box.classList.contains('locked')) return;
      box.classList.add('locked');
      b.classList.add('picked');
      SFX.pick();
      FX.setEnergy(3); setTimeout(() => FX.setEnergy(1), 700);
      S.answers[i] = +b.dataset.o;
      save();
      wait(t, 800).then(ok => ok && adv(t));
    };
    box.onclick = e => { const b = e.target.closest('.opt'); if (b) pick(b); };
    onKey = e => {
      const j = Math.max('1234'.indexOf(e.key), e.key.length === 1 ? 'abcd'.indexOf(e.key.toLowerCase()) : -1);
      if (j >= 0) pick(box.children[j]);
    };
  }
  async function screenQ(i) {
    const q = QUESTIONS[i];
    if (!S.orders[i]) { S.orders[i] = shuffle([0, 1, 2, 3]); save(); }
    if (q.egg && !S.eggDone) return screenEgg(i);
    const m = await mount(qHead(i, esc(q.stage), verTag(q.v)) + qBody(i), { cls: 'q' });
    if (!m) return;
    setVersion(q.v);
    bindOpts(m.el, i, m.t);
  }

  // 插关：第 5 题加载失败两次，第三次才出来。重试成功后灯才点到 v7
  async function screenEgg(i) {
    const q = QUESTIONS[i];
    const m = await mount(`${qHead(i, '加载中…', '<div class="q-ver none">v?</div>')}
      <div class="err"><div class="ico">⚠️</div><h3>第 5 题加载失败</h3><code>ERR_QUESTION_TIMEOUT · retry 0</code><button class="btn small" id="retry">重试</button></div>`, { cls: 'q' });
    if (!m) return;
    const { el, t } = m;
    setVersion(QUESTIONS[i - 1].v);
    const err = $('.err', el), btn = $('#retry'), h3 = $('h3', err), code = $('code', err);
    wait(t, 300).then(ok => ok && SFX.err());
    let n = 0, busy = false;
    btn.onclick = async () => {
      if (busy) return;
      busy = true; n++;
      SFX.tap();
      btn.innerHTML = '<span class="spin"></span>';
      if (!await wait(t, 950)) return;
      if (n === 1) {
        err.classList.remove('shake'); void err.offsetWidth; err.classList.add('shake');
        SFX.err();
        h3.textContent = '又失败了';
        code.textContent = 'ERR_STILL_NOT_READY · retry 1';
        btn.textContent = '再试一次';
        busy = false;
        return;
      }
      S.eggDone = true;
      save();
      SFX.ok();
      el.innerHTML = qHead(i, esc(q.stage), verTag(q.v)) + qBody(i);
      setVersion(q.v);
      bindOpts(el, i, t);
      if (!await wait(t, 1000)) return;
      dialog('<div class="em">🔁</div><p>你刚为一道题重试了 2 次。<br>纽扣也是这么过来的。</p>', [{ t: '接着来' }]);
    };
  }

  // ---------- 过场 ----------
  const ORB = `<div class="button-orb"><span class="ring"></span><span class="ring"></span><span class="ring"></span>
    <svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="bo" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".45" stop-color="#ffd98a"/><stop offset="1" stop-color="#ff9a3c"/></radialGradient></defs>
    <circle cx="60" cy="60" r="50" fill="url(#bo)"/><circle cx="60" cy="60" r="39" fill="none" stroke="rgba(130,60,0,.28)" stroke-width="3"/>
    <g fill="rgba(110,48,0,.5)"><circle cx="48" cy="48" r="6"/><circle cx="72" cy="48" r="6"/><circle cx="48" cy="72" r="6"/><circle cx="72" cy="72" r="6"/></g></svg></div>`;
  async function screenScene(k) {
    const sc = SCENES[k];
    const m = await mount(`<div class="center scene">${k === 'half' ? '' : ORB}
      <div class="tag">${sc.tag}</div>${sc.title ? `<h2 class="grad">${sc.title}</h2>` : ''}
      <div class="lines">${sc.lines.map(l => `<div>${l || '&nbsp;'}</div>`).join('')}</div>
      <button class="btn" id="cont">继续 <span class="arr">→</span></button>
      <div class="tap-hint">点任意处加速</div></div>`);
    if (!m) return;
    const { el, t } = m;
    setVersion(QUESTIONS[sc.after].v);
    const btn = $('#cont', el), hint = $('.tap-hint', el);
    let ready = false;
    const poke = () => { if (ready) { SFX.tap(); adv(t); } else speed = 14; };
    el.onclick = poke;
    onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } };
    if (!await wait(t, k === 'half' ? 500 : 900)) return;
    for (const d of $$('.lines div', el)) {
      const has = d.textContent.trim();
      d.classList.add('in');
      if (has) SFX.line();
      if (!await wait(t, has ? 780 : 260)) return;
    }
    ready = true;
    btn.classList.add('in');
    hint.style.visibility = 'hidden';
  }

  // ---------- 结局：进位 + 把灯关咯 + 片尾字幕 ----------
  async function screenEnding() {
    const m = await mount(`<div class="center ending">
      <div class="tag">RELEASE DAY</div>
      <div class="big-lights"><i class="led new"></i>${'<i class="led on"></i>'.repeat(10)}</div>
      <div class="big-ver">v1023</div>
      <div class="end-stage"><div class="end-lines"></div></div>
      <button class="btn after" id="toRv">看看你走过的路 <span class="arr">→</span></button>
      <div class="tap-hint">点任意处加速</div>
    </div>`, { hudM: 'off', bare: true });
    if (!m) return;
    const { el, t } = m;
    app.classList.add('lift');
    const lines = $('.end-lines', el), bl = $$('.big-lights .led', el), ver = $('.big-ver', el), btn = $('#toRv'), hint = $('.tap-hint', el);
    let anim = null, done = false;
    el.onclick = () => {
      if (done) return;
      speed = 6;
      if (anim) anim.playbackRate = 5;
    };
    btn.onclick = e => { e.stopPropagation(); if (done) { SFX.tap(); adv(t); } };
    const add = (html, cls = '') => {
      const d = document.createElement('div');
      d.className = cls; d.innerHTML = html;
      lines.appendChild(d);
      raf2(() => d.classList.add('in'));
      if (d.textContent.trim()) SFX.line();
    };

    if (!await wait(t, 700)) return;
    add('第二天，纽扣发布了。');
    if (!await wait(t, 1600)) return;
    // 1111111111 + 1：从最右边开始一盏盏灭，进到第 11 位
    FX.setEnergy(3);
    for (let k = 10; k >= 1; k--) {
      bl[k].classList.remove('on');
      SFX.off(10 - k);
      if (!await wait(t, 110)) return;
    }
    bl[0].classList.add('show');
    if (!await wait(t, 380)) return;
    bl[0].classList.add('on', 'pop');
    ver.textContent = 'v1024';
    ver.classList.add('gold');
    SFX.carry();
    FX.burst(['#ffd98a', '#ffb347', '#ffffff', '#b9f6ff'], 80);
    FX.setEnergy(1);
    if (!await wait(t, 900)) return;
    add('版本号不是 v1023，是 <b>v1024</b>。');
    if (!await wait(t, 1900)) return;
    add('&nbsp;');
    add('第一位用户是奶奶。');
    if (!await wait(t, 1200)) return;
    add('她说的第一句话是：');
    if (!await wait(t, 1100)) return;
    add('“把灯关咯。”', 'quote');
    if (!await wait(t, 1500)) return;
    dim.classList.add('on');
    FX.setEnergy(0.25);
    SFX.off(0);
    if (!await wait(t, 1400)) return;
    add('它听懂了。', 'soft');
    if (!await wait(t, 2800)) return;

    // 片尾字幕
    lines.style.transition = 'opacity .7s';
    lines.style.opacity = 0;
    if (!await wait(t, 700)) return;
    $('.end-stage', el).innerHTML = `<div class="credits-wrap"><div class="credits">
      <div class="ct">CREDITS</div>
      <h3>纽扣 v1024</h3>
      <div class="row me"><div class="role">带它走到 v1023 的人</div><div class="who">${esc(S.name)}</div></div>
      ${CREDITS.map(([r, w]) => `<div class="row">${r ? `<div class="role">${r}</div>` : ''}<div class="who">${w}</div></div>`).join('')}
      <div class="last">从 v1023 到 v1024，<br>差的那 <b>1</b>，是他们。</div>
    </div></div>`;
    const wrap = $('.credits-wrap', el), cr = $('.credits', el), last = $('.last', el);
    const dist = wrap.clientHeight / 2 + last.offsetTop + last.offsetHeight / 2;
    if (cr.animate) {
      anim = cr.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist}px)` }],
        { duration: Math.max(9000, dist / 80 * 1000), easing: 'cubic-bezier(.3,.05,.4,1)', fill: 'forwards' });
      if (speed > 1) anim.playbackRate = 5;
      await new Promise(r => { anim.onfinish = r; });
    } else {
      cr.style.transform = `translateY(${-dist}px)`;
    }
    if (t !== tok) return;
    done = true;
    btn.classList.add('in');
    hint.style.visibility = 'hidden';
  }

  // ---------- 揭晓：12 → 6 → 2 → 1 ----------
  async function screenReveal() {
    const R = S.result;
    Card.preload(R).catch(() => {});
    const kw = [SPIRIT[0], SPIRIT[1], SPIRIT[0].children[0], SPIRIT[1].children[0], SPIRIT[0].children[1], SPIRIT[1].children[1]];
    const tri = [1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 1024];
    const m = await mount(`<div class="reveal">
      <div class="tag" style="margin-bottom:22px">REVIEW · <i>12 → 6 → 2 → 1</i></div>
      <div class="rv"><div class="num grad">12</div>
        <h3>你的 <b>12</b> 个选择，走过了学习圈上的这几站。</h3>
        <div class="dots12">${S.answers.map((_, i) => { const c = color(styleOf(i)); return `<i class="dot12" style="background:${c};box-shadow:0 0 10px ${c};transition-delay:${(i * 0.07).toFixed(2)}s">${i + 1}</i>`; }).join('')}</div>
        <div class="legend">${RING.map(s => `<span style="--c:${color(s)}">${STYLES[s].full} ×${R.counts[s]}</span>`).join('')}</div></div>
      <div class="rv"><div class="num grad">6</div>
        <h3>它们是 <b>6</b> 个关键词</h3>
        <div class="kw6">${kw.map(k => `<div class="kw"><span>${k.key}</span><span class="pair">${k.qs.map(qi => `<i style="--c:${color(styleOf(qi))}"></i>`).join('')}</span></div>`).join('')}</div></div>
      <div class="rv"><div class="num grad">2</div>
        <h3>收成 <b>2</b> 种精神</h3>
        <div class="kw2"><div>深思实干<small>一个人怎么把难事做成</small></div><div>尽责无界<small>一群人怎么把难事做成</small></div></div></div>
      <div class="rv"><div class="num grad">1</div>
        <h3>收成 <b>1</b> 句话</h3>
        <div class="one">从个体的智慧，<br><span class="grad">到群体的智慧结晶</span></div></div>
      <div class="rv"><div class="tri">${tri.map(v => `<div class="l${v === 1024 ? ' gold' : ''}"><span class="v">v${v}</span><span class="eq">=</span><span class="b">${v.toString(2).padStart(11, ' ')}</span></div>${
        v === 1023 ? '<div class="note">↑ 一个人全都要，能走到这里</div>' : v === 1024 ? '<div class="note gold">↑ 最后那个 1，是一路上帮过你的人</div>' : ''}`).join('')}</div></div>
      <div class="rv"><p class="one" style="font-size:20px;text-align:center;margin:0 0 22px">10 盏灯没有灭，<br>是一起进到了更高的一位。</p>
        <button class="btn" id="toCard">领取我的未来人格卡 <span class="arr">→</span></button></div>
    </div>`, { hudM: 'mini', bare: true });
    if (!m) return;
    const { el, t } = m;
    const skip = document.createElement('button');
    skip.className = 'skip'; skip.textContent = '跳过 »';
    app.appendChild(skip);
    skip.onclick = e => { e.stopPropagation(); speed = 60; skip.remove(); };
    el.onclick = () => { speed = Math.max(speed, 4); };
    $('#toCard').onclick = e => { e.stopPropagation(); SFX.tap(); adv(t); };
    const follow = b => {
      const r = b.getBoundingClientRect();
      if (r.bottom > innerHeight - 24) scrollTo({ top: scrollY + r.bottom - innerHeight + 72, behavior: speed > 10 ? 'auto' : 'smooth' });
    };
    const blocks = $$('.rv', el);
    const pause = [1900, 1800, 1500, 1500, 1200, 0];
    if (!await wait(t, 500)) return;
    for (let k = 0; k < blocks.length; k++) {
      blocks[k].classList.add('in');
      follow(blocks[k]);
      SFX.line();
      if (k === 4) {
        const rows = $$('.l, .note', blocks[k]);
        for (let j = 0, n = 0; j < rows.length; j++) {
          const r = rows[j];
          if (!await wait(t, r.classList.contains('note') ? 500 : r.classList.contains('gold') ? 900 : 170)) return;
          r.classList.add('in');
          if (r.classList.contains('gold')) SFX.carry();
          else if (r.classList.contains('l')) SFX.off(9 - n++);
        }
      }
      if (!await wait(t, pause[k])) return;
    }
    skip.remove();
  }

  // ---------- 同分掷骰子 ----------
  async function screenDice() {
    const R = S.result;
    const m = await mount(`<div class="center dice">
      ${SHOW_MASCOT ? '<div class="hero"><img src="img/00_hero.svg" alt=""></div>' : ''}
      <p id="dq"></p><p class="sub">${SHOW_MASCOT ? '小钢炮替你' : '那就'}掷一次骰子，结果会记下来。</p>
      <div class="die-wrap"><div class="die" id="die" style="transform:rotateX(-22deg) rotateY(-32deg)">${[1, 2, 3, 4, 5, 6].map(n => `<div class="f f${n}"></div>`).join('')}</div></div>
      <div class="die-res" id="dres"></div>
      <button class="btn" id="roll" style="max-width:320px;margin:14px auto 0">🎲 掷！</button>
    </div>`, { hudM: 'mini', bare: true });
    if (!m) return;
    const { t } = m;
    const die = $('#die'), faces = $$('.f', die), q = $('#dq'), res = $('#dres'), btn = $('#roll');
    const ROT = [[0, 0], [0, -180], [0, -90], [0, 90], [-90, 0], [90, 0]];
    const label = r => r.kind === 'p' ? '主场' : '副场';
    let ri = 0, turns = 0, busy = false;
    const setup = () => {
      const r = R.rolls[ri];
      q.innerHTML = `${label(r)}打平了：${r.cands.map(s => `<b style="color:${color(s)}">${STYLES[s].full}</b>`).join(' · ')}，各 ${R.counts[r.cands[0]]} 次`;
      faces.forEach((f, j) => { const s = r.cands[j % r.cands.length]; f.textContent = STYLES[s].name; f.style.setProperty('--c', color(s)); });
      res.classList.remove('in');
      btn.innerHTML = ri ? '🎲 再掷一次，定副场' : '🎲 掷！';
    };
    setup();
    btn.onclick = async () => {
      if (busy) return;
      if (ri >= R.rolls.length) { SFX.tap(); return adv(t); }
      busy = true;
      const r = R.rolls[ri];
      const hits = [0, 1, 2, 3, 4, 5].filter(j => r.cands[j % r.cands.length] === r.pick);
      const fi = hits[(Math.random() * hits.length) | 0];
      turns += 2;
      die.style.transform = `rotateX(${ROT[fi][0] + 360 * turns}deg) rotateY(${ROT[fi][1] + 360 * (turns + 1)}deg)`;
      SFX.roll();
      if (!await wait(t, 1900)) return;
      res.innerHTML = `${label(r)}：<span style="color:${color(r.pick)}">${STYLES[r.pick].full}</span>`;
      res.classList.add('in');
      SFX.ok();
      ri++;
      if (!await wait(t, 1100)) return;
      if (ri < R.rolls.length) setup();
      else btn.innerHTML = '看我的卡 <span class="arr">→</span>';
      busy = false;
    };
  }

  // ---------- 结果卡 ----------
  function toFile(url, name) {
    try {
      const bin = atob(url.split(',')[1]);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return new File([u], name, { type: 'image/jpeg' });
    } catch (e) { return null; }
  }
  async function copy(s) {
    try { await navigator.clipboard.writeText(s); return true; } catch (e) { /* 走老办法 */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = s; ta.style.cssText = 'position:fixed;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  async function screenResult() {
    const R = S.result, id = IDENTITIES[R.p + R.s];
    const pc = color(R.p), sc = color(R.s);
    const m = await mount(`<div class="result">
      <div class="r-title">${R.rare ? '<span class="rare">RARE · 单站满格</span>' : ''}<div class="tag">2¹⁰ · 你的未来人格卡</div></div>
      <div class="stage"><div class="spot"></div>
        <div class="flip" id="flip"><div class="flip-in"><div class="loading-card">GENERATING…</div></div></div>
        <div class="floor"></div></div>
      <div class="after" id="after">
        <p class="r-tip">点卡片翻面，正反两面都能保存</p>
        <div class="actions">
          <button class="btn" id="save">保存这一面</button>
          <div class="btn-row"><button class="btn ghost small" id="flipb">翻到背面</button><button class="btn ghost small" id="share">分享给同事</button></div>
          <button class="link" id="again">再测一次</button>
        </div>
      </div></div>`, { hudM: 'mini', bare: true });
    if (!m) return;
    const { el, t } = m;
    const stage = $('.stage', el), flip = $('#flip'), inner = $('.flip-in', el);
    stage.style.setProperty('--spot', Card.hexA(pc, 0.38));

    let card;
    try { card = await Card.render(R, S.name); } catch (e) {
      console.error(e);
      inner.innerHTML = '<div class="loading-card">卡片生成失败，刷新试试</div>';
      return;
    }
    if (t !== tok) return;
    inner.innerHTML = '';
    const faces = [[card.frontUrl, card.front, 'f', `${S.name} 的未来人格卡：${id.name}`], [card.backUrl, card.back, 'b', '卡片背面：我的 12 步']].map(([url, cv, cls, alt]) => {
      const n = url ? Object.assign(new Image(), { src: url, alt }) : cv;
      n.className = 'face ' + cls;
      n.style.setProperty('--glow', Card.hexA(pc, 0.45));
      inner.appendChild(n);
      return n;
    });
    if (R.rare) inner.insertAdjacentHTML('beforeend', '<div class="holo"></div>');
    if (faces[0].decode) await faces[0].decode().catch(() => {});
    if (t !== tok) return;

    flip.classList.add('drop');
    SFX.card();
    if (!await wait(t, 800)) return;
    stage.classList.add('lit');
    FX.burst([pc, sc, '#ffffff', pc, sc], 140);
    if (!await wait(t, 500)) return;
    $('#after').classList.add('in');

    let back = false;
    const doFlip = () => {
      back = !back;
      flip.classList.toggle('back', back);
      $('#flipb').textContent = back ? '翻回正面' : '翻到背面';
      SFX.tap();
    };
    flip.onclick = doFlip;
    $('#flipb').onclick = doFlip;

    const files = {};
    const fname = b => `纽扣_${S.name}_${id.name}${b ? '_背面' : ''}.jpg`.replace(/[\\/:*?"<>|\s]/g, '');
    $('#save').onclick = () => {
      const url = back ? card.backUrl : card.frontUrl;
      if (!url) return say('这个浏览器不支持导出，直接截图就好');
      SFX.tap();
      if (!isMobile) {
        const a = document.createElement('a');
        a.href = url; a.download = fname(back);
        document.body.appendChild(a); a.click(); a.remove();
        return say('已保存到下载文件夹');
      }
      const file = files[back] || (files[back] = toFile(url, fname(back)));
      const canShare = !isWx && file && navigator.canShare && navigator.canShare({ files: [file] });
      dialog(`<img src="${url}" alt="未来人格卡"><p style="margin:2px 0 14px;font-size:15px">长按图片，保存到相册</p>`,
        canShare ? [{ t: '关闭', ghost: true }, { t: '系统分享', fn: () => navigator.share({ files: [file] }).catch(() => {}) }] : [{ t: '好的', ghost: true }], true);
    };
    $('#share').onclick = () => {
      SFX.tap();
      const url = location.href.split(/[?#]/)[0];
      const text = `我陪纽扣走到了 v1024，测出来是「${id.name}」，主场${STYLES[R.p].full}。你从哪一站出发？`;
      if (isWx) return dialog('<div class="em">↗️</div><p>点右上角 <b>···</b><br>发送给同事，或分享到朋友圈</p>', [{ t: '知道了', ghost: true }], true);
      if (isMobile && navigator.share) return navigator.share({ title: document.title, text, url }).catch(() => {});
      copy(`${text} ${url}`).then(ok => say(ok ? '链接已复制，发给同事吧' : url));
    };
    $('#again').onclick = async () => {
      const ok = await dialog('<p>再测一次会清掉这张卡。<br>想留着的话，先保存哦。</p>', [{ t: '取消', ghost: true }, { t: '再测一次' }], true);
      if (ok !== 1) return;
      S = Object.assign(fresh(), { name: S.name });
      go(-1);
    };
  }

  // 调试：__wf.auto('xc xc sj xc xc yl sj xc sj jf yl sj', 'result')
  window.__wf = {
    get S() { return S; }, FLOW, go,
    auto(styles, to = 'reveal') {
      const arr = typeof styles === 'string' ? styles.trim().split(/\s+/) : styles || [];
      S.name = S.name || '测试员';
      S.answers = QUESTIONS.map((q, i) => q.o.findIndex(o => o.s === (arr[i] || RING[(Math.random() * 4) | 0])));
      QUESTIONS.forEach((_, i) => { if (!S.orders[i]) S.orders[i] = shuffle([0, 1, 2, 3]); });
      S.eggDone = true;
      S.result = null;
      go(stepOf(to));
    },
  };

  render();
})();
