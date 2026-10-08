// 背景神经网络 + 彩纸 + 合成音效。全部代码生成，没有外部资源。

const FX = (() => {
  const cv = document.getElementById('bg');
  const ctx = cv.getContext('2d');
  const NODE_COLORS = ['#8f7cff', '#8f7cff', '#7cf7ff', '#b9f6ff', '#ff4fd8', '#ff7a3d', '#c6ff3d'];
  let W = 0, H = 0, nodes = [], pulses = [], confetti = [], link = 130, lastPulse = 0, energy = 1;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    link = W < 720 ? 115 : 150;
    const n = Math.round(Math.min(72, Math.max(30, (W * H) / 15000)));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.5 + 0.7,
      c: NODE_COLORS[(Math.random() * NODE_COLORS.length) | 0],
    }));
  }

  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of nodes) {
      p.x += p.vx * energy; p.y += p.vy * energy;
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
    }
    ctx.lineWidth = 1;
    const near = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < link * link) {
          const k = 1 - Math.sqrt(d2) / link;
          ctx.strokeStyle = `rgba(143,124,255,${0.22 * k})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (k > 0.35) near.push([a, b]);
        }
      }
    }
    // 沿连线跑的信号
    if (t - lastPulse > 420 / energy && near.length) {
      lastPulse = t;
      const [a, b] = near[(Math.random() * near.length) | 0];
      pulses.push({ a, b, t0: t, c: Math.random() < 0.5 ? a.c : b.c });
    }
    pulses = pulses.filter(p => t - p.t0 < 1100);
    for (const p of pulses) {
      const k = (t - p.t0) / 1100;
      const x = p.a.x + (p.b.x - p.a.x) * k, y = p.a.y + (p.b.y - p.a.y) * k;
      ctx.fillStyle = p.c; ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.25 * Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of nodes) {
      ctx.fillStyle = p.c; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 彩纸
    if (confetti.length) {
      confetti = confetti.filter(c => c.y < H + 40 && c.life-- > 0);
      for (const c of confetti) {
        c.vy += 0.12; c.vx *= 0.99; c.x += c.vx; c.y += c.vy; c.rot += c.vr;
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 2)));
        ctx.restore();
      }
    }
  }

  function burst(colors, n = 120) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = 6 + Math.random() * 8;
      confetti.push({
        x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.42,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        c: colors[i % colors.length], life: 260,
      });
    }
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  return { burst, setEnergy: e => { energy = e; } };
})();

const SFX = (() => {
  let ac = null;
  let muted = localStorage.getItem('wf_muted') === '1';
  document.body.classList.toggle('muted', muted);

  function wake() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, at, dur, { type = 'sine', vol = 0.07, to = 0 } = {}) {
    if (muted || !wake()) return;
    const t = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(at, dur, vol = 0.05) {
    if (muted || !wake()) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1200;
    g.gain.value = vol; s.buffer = buf;
    s.connect(f).connect(g).connect(ac.destination);
    s.start(ac.currentTime + at);
  }

  const api = {
    wake,
    tap() { tone(900, 0, 0.06, { type: 'triangle', vol: 0.04 }); },
    pick() { tone(660, 0, 0.09, { type: 'triangle' }); tone(990, 0.07, 0.14, { type: 'triangle' }); },
    led() { tone(1320, 0, 0.16, { vol: 0.05 }); tone(1980, 0.07, 0.26, { vol: 0.035 }); },
    line() { tone(520, 0, 0.12, { vol: 0.025 }); },
    err() { tone(160, 0, 0.22, { type: 'square', vol: 0.035 }); tone(120, 0.14, 0.28, { type: 'square', vol: 0.035 }); },
    ok() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.25, { type: 'triangle', vol: 0.05 })); },
    roll() { for (let i = 0; i < 12; i++) { tone(260 + Math.random() * 500, i * 0.12 + i * i * 0.004, 0.035, { type: 'square', vol: 0.02 }); } },
    off(i) { tone(700 - i * 40, 0, 0.07, { type: 'triangle', vol: 0.03 }); },
    carry() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, { vol: 0.05 })); },
    card() { noise(0, 0.5, 0.04); [262, 392, 523, 659].forEach((f, i) => tone(f, 0.45 + i * 0.05, 1.2, { type: 'triangle', vol: 0.04 })); },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      localStorage.setItem('wf_muted', muted ? '1' : '0');
      document.body.classList.toggle('muted', muted);
      if (!muted) api.tap();
    },
  };
  return api;
})();
