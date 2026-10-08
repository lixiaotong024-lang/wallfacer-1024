// 结果卡：用 Canvas 直接画正反两面，导出成图片（手机可长按保存，电脑可下载）。

const Card = (() => {
  const SANS = '"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif';
  const MONO = '"SF Mono","JetBrains Mono",Menlo,Consolas,"Roboto Mono",monospace';
  const W = 1080, P = 76;
  const NO_START = '，。、！？：；）》」』”’…%';
  const imgs = {};

  const loadImg = src => imgs[src] || (imgs[src] = new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im); im.onerror = bad; im.src = src;
  }));
  const font = (px, w = 400, fam = SANS) => `${w} ${px}px ${fam}`;

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function wrap(c, text, maxW) {
    const lines = []; let cur = '';
    for (const ch of Array.from(text)) {
      if (c.measureText(cur + ch).width > maxW && cur) {
        if (NO_START.includes(ch)) { const last = Array.from(cur).pop(); cur = cur.slice(0, -last.length); lines.push(cur); cur = last + ch; }
        else { lines.push(cur); cur = ch; }
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function spaced(c, text, x, y, gap, align = 'left') {
    const chars = Array.from(text);
    const w = chars.reduce((s, ch) => s + c.measureText(ch).width, 0) + gap * (chars.length - 1);
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const prev = c.textAlign; c.textAlign = 'left';
    for (const ch of chars) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + gap; }
    c.textAlign = prev;
    return w;
  }
  function led(c, x, y, r, color, on, glow = true) {
    if (on) {
      if (glow) { c.save(); c.shadowColor = color; c.shadowBlur = r * 2.2; }
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, color);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      if (glow) c.restore();
    } else {
      c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function theme(R) {
    const pc = STYLES[R.p].color;
    if (R.rare) {
      const ink = STYLES[R.p].ink;
      return { rare: true, pc, ink, sub: hexA(ink, 0.7), faint: hexA(ink, 0.42), panel: 'rgba(255,255,255,.28)', line: hexA(ink, 0.18), led: ink, accent: ink };
    }
    return { rare: false, pc, ink: '#eef1ff', sub: '#a7acd8', faint: '#5f6597', panel: 'rgba(255,255,255,.045)', line: 'rgba(150,160,255,.18)', led: '#b9f6ff', accent: pc };
  }

  function background(c, T, H, glowY) {
    if (T.rare) {
      c.fillStyle = T.pc; c.fillRect(0, 0, W, H);
      const s = c.createLinearGradient(0, 0, W, H);
      s.addColorStop(0, 'rgba(255,255,255,.35)'); s.addColorStop(0.5, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(0,0,0,.12)');
      c.fillStyle = s; c.fillRect(0, 0, W, H);
    } else {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0d1030'); g.addColorStop(0.55, '#0a0b22'); g.addColorStop(1, '#130f36');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // 网格
    c.strokeStyle = T.rare ? 'rgba(0,0,0,.05)' : 'rgba(143,124,255,.06)'; c.lineWidth = 1;
    for (let x = 0; x <= W; x += 54) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke(); }
    for (let y = 0; y <= H; y += 54) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke(); }
    // 主场色光晕
    if (glowY != null) {
      const rg = c.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, 520);
      rg.addColorStop(0, T.rare ? 'rgba(255,255,255,.45)' : hexA(T.pc, 0.32));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
    }
    // 边框 + 四角
    const m = 26;
    if (T.rare) c.strokeStyle = hexA(T.ink, 0.5);
    else {
      const sg = c.createLinearGradient(0, 0, W, H);
      sg.addColorStop(0, '#ff7a3d'); sg.addColorStop(0.36, '#ff4fd8'); sg.addColorStop(0.68, '#7cf7ff'); sg.addColorStop(1, '#c6ff3d');
      c.strokeStyle = sg;
    }
    c.lineWidth = 3; rr(c, m, m, W - 2 * m, H - 2 * m, 40); c.stroke();
    c.lineWidth = 6; c.lineCap = 'round';
    const k = 54, n = m + 16;
    [[n, n, 1, 1], [W - n, n, -1, 1], [n, H - n, 1, -1], [W - n, H - n, -1, -1]].forEach(([x, y, sx, sy]) => {
      c.beginPath(); c.moveTo(x, y + sy * k); c.lineTo(x, y); c.lineTo(x + sx * k, y); c.stroke();
    });
    c.lineCap = 'butt';
  }

  function header(c, T, right) {
    c.fillStyle = T.sub; c.font = font(25, 600, MONO); c.textBaseline = 'alphabetic';
    spaced(c, '2¹⁰ · NEW WALL-FACER', P, 104, 3);
    c.fillStyle = T.rare ? T.ink : T.led; c.font = font(25, 700, MONO);
    spaced(c, right, W - P, 104, 3, 'right');
  }

  // 发光纽扣：主场色 → 副场色，外圈 10 盏灯 + 顶上一盏金灯（v1024）
  function emblem(c, T, R, cx, cy) {
    const r = 138, orbit = 196;
    c.save();
    c.setLineDash([3, 12]); c.lineWidth = 2;
    c.strokeStyle = T.rare ? hexA(T.ink, 0.35) : 'rgba(143,124,255,.45)';
    c.beginPath(); c.arc(cx, cy, orbit, 0, 7); c.stroke();
    c.restore();
    for (let i = 0; i < 11; i++) {
      const a = (-90 + i * (360 / 11)) * Math.PI / 180;
      const x = cx + Math.cos(a) * orbit, y = cy + Math.sin(a) * orbit;
      if (i === 0) led(c, x, y, 15, T.rare ? T.ink : '#ffc766', true, !T.rare);
      else led(c, x, y, 9, T.rare ? T.ink : '#b9f6ff', true, !T.rare);
    }
    const sc = STYLES[R.s].color;
    c.save();
    c.shadowColor = T.rare ? 'rgba(0,0,0,.25)' : T.pc; c.shadowBlur = 90;
    const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, T.rare ? '#ffffff' : T.pc); g.addColorStop(1, T.rare ? T.pc : sc);
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.restore();
    const hl = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.35, cy - r * 0.4, r * 1.1);
    hl.addColorStop(0, 'rgba(255,255,255,.65)'); hl.addColorStop(0.5, 'rgba(255,255,255,.08)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hl; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 7;
    c.beginPath(); c.arc(cx, cy, r * 0.76, 0, 7); c.stroke();
    const ink = T.rare ? T.ink : STYLES[R.p].ink;
    c.fillStyle = hexA(ink, 0.55);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.beginPath(); c.arc(cx + dx * r * 0.24, cy + dy * r * 0.24, r * 0.11, 0, 7); c.fill();
    }
    return orbit + 15;
  }

  function lightsRow(c, T, x, y, r, gap) {
    for (let i = 0; i < 10; i++) led(c, x + i * (2 * r + gap) + r, y, r, T.rare ? T.ink : '#b9f6ff', true, !T.rare);
    return x + 10 * (2 * r + gap);
  }

  // ---------- 正面 ----------
  async function front(R, name) {
    const T = theme(R);
    const id = IDENTITIES[R.p + R.s];
    const L = document.createElement('canvas'); L.width = W; L.height = 3400;
    const c = L.getContext('2d');
    c.textBaseline = 'alphabetic';

    let y = 118;
    if (T.rare) {
      c.font = font(24, 800, MONO);
      const label = `RARE · ${STYLES[R.p].full}单站满格`;
      const w = c.measureText(label).width + 44;
      c.fillStyle = T.ink; rr(c, (W - w) / 2, y + 12, w, 46, 23); c.fill();
      c.fillStyle = T.pc; c.textAlign = 'center'; c.fillText(label, W / 2, y + 44); c.textAlign = 'left';
    }
    const iy = y + (T.rare ? 34 : 6);
    let glowY;
    if (SHOW_MASCOT) {
      const S = 600;
      c.drawImage(await loadImg(`img/${id.img}.svg`), (W - S) / 2, iy, S, S);
      glowY = iy + S * 0.45;
      y = iy + S + 70;
    } else {
      const cy = iy + 250;
      const half = emblem(c, T, R, W / 2, cy);
      glowY = cy;
      y = cy + half + 104;
    }

    c.textAlign = 'center';
    c.fillStyle = T.ink; c.font = font(94, 800);
    c.fillText(id.name, W / 2, y);
    y += 52;
    c.fillStyle = T.accent; c.font = font(27, 700, MONO);
    spaced(c, id.en.toUpperCase(), W / 2, y, 5, 'center');
    y += 66;
    c.fillStyle = T.rare ? T.ink : '#d9dcff'; c.font = font(35, 500);
    for (const ln of wrap(c, id.line, W - 2 * P - 60)) { c.fillText(ln, W / 2, y); y += 54; }

    if (T.rare) {
      y += 8;
      c.font = font(30, 700);
      const t = `12 道题里，有 ${R.counts[R.p]} 道你都从${STYLES[R.p].name}出发。`;
      const w = c.measureText(t).width + 56;
      c.fillStyle = 'rgba(255,255,255,.4)'; rr(c, (W - w) / 2, y - 40, w, 60, 30); c.fill();
      c.fillStyle = T.ink; c.fillText(t, W / 2, y);
      y += 58;
    }

    // 名字 · 主场 · 副场
    y += 20;
    const pills = [
      { t: name, f: font(31, 800), fill: T.rare ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.1)', ink: T.ink },
      { t: `主场 · ${STYLES[R.p].full}`, f: font(29, 700), fill: T.rare ? T.ink : STYLES[R.p].color, ink: T.rare ? T.pc : STYLES[R.p].ink },
      { t: `副场 · ${STYLES[R.s].full}`, f: font(29, 700), stroke: T.rare ? T.ink : STYLES[R.s].color, ink: T.rare ? T.ink : STYLES[R.s].color },
    ];
    const ph = 60, pg = 14;
    pills.forEach(p => { c.font = p.f; p.w = c.measureText(p.t).width + 46; });
    let px = (W - pills.reduce((s, p) => s + p.w, 0) - pg * 2) / 2;
    for (const p of pills) {
      rr(c, px, y, p.w, ph, ph / 2);
      if (p.fill) { c.fillStyle = p.fill; c.fill(); }
      if (p.stroke) { c.strokeStyle = p.stroke; c.lineWidth = 3; c.stroke(); }
      c.fillStyle = p.ink; c.font = p.f; c.fillText(p.t, px + p.w / 2, y + 41);
      px += p.w + pg;
    }
    y += ph + 52;
    c.textAlign = 'left';

    // 面壁精神 · 6 个关键词
    const rows = [];
    for (const g of SPIRIT) {
      rows.push({ k: g.key, lv: 0, ...R.lines[g.key] });
      for (const ch of g.children) rows.push({ k: ch.key, lv: 1, ...R.lines[ch.key] });
    }
    const textX = P + 236, textW = W - P - 34 - textX;
    c.font = font(31, 500);
    rows.forEach(r => { r.wl = wrap(c, r.c, textW); r.h = 34 + r.wl.length * 44; });
    const panelH = 92 + rows.reduce((s, r) => s + r.h, 0) + 18;
    c.fillStyle = T.panel; rr(c, P - 10, y, W - 2 * P + 20, panelH, 30); c.fill();
    c.fillStyle = T.sub; c.font = font(24, 700, MONO);
    spaced(c, 'SPIRIT LOG', P + 26, y + 56, 4);
    c.font = font(25, 500); c.fillText('· 一路上你做过的事', P + 210, y + 56);
    let ry = y + 92;
    rows.forEach((r, i) => {
      const base = ry + 44;
      if (r.lv === 0) {
        if (i) { c.strokeStyle = T.line; c.lineWidth = 2; c.beginPath(); c.moveTo(P + 26, ry + 4); c.lineTo(W - P - 26, ry + 4); c.stroke(); }
        c.fillStyle = T.accent; c.fillRect(P + 26, base - 25, 10, 26);
        c.fillStyle = T.ink; c.font = font(33, 800); c.fillText(r.k, P + 48, base);
      } else {
        c.strokeStyle = T.faint; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(P + 31, base - 44); c.lineTo(P + 31, base - 12); c.lineTo(P + 52, base - 12); c.stroke();
        c.fillStyle = T.sub; c.font = font(30, 700); c.fillText(r.k, P + 64, base);
      }
      led(c, textX - 22, base - 11, 8, STYLES[r.s].color, true, false);
      if (T.rare) { c.strokeStyle = hexA(T.ink, 0.6); c.lineWidth = 2; c.beginPath(); c.arc(textX - 22, base - 11, 8, 0, 7); c.stroke(); }
      c.fillStyle = T.ink; c.font = font(31, 500);
      r.wl.forEach((ln, j) => c.fillText(ln, textX, base + j * 44));
      ry += r.h;
    });
    y += panelH + 54;

    // 我的学习圈
    const cx = P + 160, cy = y + 170, RR = 120;
    c.fillStyle = T.sub; c.font = font(24, 700, MONO); spaced(c, 'LEARNING LOOP', P + 6, y + 6, 4);
    c.font = font(25, 500); c.fillText('· 我的学习圈', P + 248, y + 6);
    RING.forEach((s, qi) => {
      const col = STYLES[s].color, n = R.counts[s];
      for (let j = 0; j < 12; j++) {
        const a = (-90 + qi * 90 + 6 + j * (78 / 11)) * Math.PI / 180;
        const x = cx + Math.cos(a) * RR, yy = cy + Math.sin(a) * RR;
        if (j < n) {
          led(c, x, yy, 8.5, col, true, !T.rare);
          if (T.rare) { c.strokeStyle = hexA(T.ink, 0.55); c.lineWidth = 2; c.beginPath(); c.arc(x, yy, 8.5, 0, 7); c.stroke(); }
        } else {
          c.strokeStyle = T.rare ? hexA(T.ink, 0.25) : 'rgba(255,255,255,.16)'; c.lineWidth = 2;
          c.beginPath(); c.arc(x, yy, 6.5, 0, 7); c.stroke();
        }
      }
      const ma = (-45 + qi * 90) * Math.PI / 180;
      c.fillStyle = T.rare ? T.ink : col; c.font = font(25, 800); c.textAlign = 'center';
      c.fillText(STYLES[s].name, cx + Math.cos(ma) * (RR + 46), cy + Math.sin(ma) * (RR + 46) + 9);
    });
    c.fillStyle = T.sub; c.font = font(22, 600); c.fillText('主场', cx, cy - 10);
    c.fillStyle = T.rare ? T.ink : STYLES[R.p].color; c.font = font(44, 800); c.fillText(STYLES[R.p].name, cx, cy + 38);
    c.textAlign = 'left';

    const lx = P + 390;
    RING.forEach((s, i) => {
      const ly = y + 74 + i * 76;
      led(c, lx + 9, ly - 10, 9, STYLES[s].color, R.counts[s] > 0, !T.rare);
      if (T.rare) { c.strokeStyle = hexA(T.ink, 0.6); c.lineWidth = 2; c.beginPath(); c.arc(lx + 9, ly - 10, 9, 0, 7); c.stroke(); }
      c.fillStyle = T.ink; c.font = font(31, 800); c.fillText(STYLES[s].full, lx + 34, ly);
      c.fillStyle = T.rare ? T.ink : STYLES[s].color; c.font = font(34, 800, MONO);
      c.textAlign = 'right'; c.fillText(`×${R.counts[s]}`, W - P - 10, ly); c.textAlign = 'left';
      c.fillStyle = T.sub; c.font = font(21, 500); c.fillText(STYLES[s].desc, lx + 34, ly + 32);
    });
    y += 360;

    // 卡底：10 盏灯 → 第 11 位
    c.strokeStyle = T.line; c.lineWidth = 2; c.beginPath(); c.moveTo(P, y); c.lineTo(W - P, y); c.stroke();
    y += 58;
    let ex = lightsRow(c, T, P, y - 10, 11, 9);
    c.fillStyle = T.sub; c.font = font(30, 700, MONO); c.fillText('→', ex + 14, y);
    led(c, ex + 70, y - 10, 13, T.rare ? T.ink : '#ffc766', true, !T.rare);
    c.textAlign = 'right';
    c.fillStyle = T.rare ? T.ink : '#ffd98a'; c.font = font(30, 800, MONO);
    c.fillText('v1023 → v1024', W - P, y - 4);
    c.fillStyle = T.sub; c.font = font(23, 500);
    c.fillText('1677 万种走法之一', W - P, y + 34);
    c.textAlign = 'center';
    y += 112;
    c.fillStyle = T.ink; c.font = font(34, 800);
    c.fillText('1677 万种走法，没有一种是错的。', W / 2, y);
    c.textAlign = 'left';
    y += 80;

    return compose(L, y, T, glowY);
  }

  // ---------- 背面 ----------
  async function back(R, name, H) {
    const T = theme(R);
    const L = document.createElement('canvas'); L.width = W; L.height = H;
    const c = L.getContext('2d');
    let y = 214;
    c.fillStyle = T.ink; c.font = font(64, 800); c.fillText('我的 12 步', P, y);
    c.fillStyle = T.sub; c.font = font(28, 500);
    c.fillText(`${name} · 陪纽扣从一个念头走到 v1024`, P, y + 56);
    y += 120;

    const foot = 300;
    const rowH = Math.max(88, Math.min(118, (H - y - foot - 2 * 64) / 12));
    QUESTIONS.forEach((q, i) => {
      if (i === 0 || i === 6) {
        c.fillStyle = T.faint; c.font = font(22, 700, MONO);
        spaced(c, i === 0 ? 'PART 1 · 一个人怎么把难事做成' : 'PART 2 · 一群人怎么把难事做成', P, y + 40, 2);
        y += 64;
      }
      const o = q.o[R.answers[i]];
      const col = STYLES[o.s].color;
      led(c, P + 10, y + rowH / 2 - 4, 9, col, true, !T.rare);
      if (T.rare) { c.strokeStyle = hexA(T.ink, 0.6); c.lineWidth = 2; c.beginPath(); c.arc(P + 10, y + rowH / 2 - 4, 9, 0, 7); c.stroke(); }
      c.fillStyle = T.faint; c.font = font(22, 700, MONO);
      c.fillText(`${String(i + 1).padStart(2, '0')}  ${q.v == null ? 'v—' : 'v' + q.v}`, P + 40, y + rowH / 2 - 18);
      c.fillStyle = T.sub; c.font = font(22, 600); c.fillText(q.stage, P + 196, y + rowH / 2 - 18);
      c.fillStyle = T.ink; c.font = font(31, 500);
      const ln = wrap(c, o.c, W - 2 * P - 40)[0];
      c.fillText(ln, P + 40, y + rowH / 2 + 24);
      c.strokeStyle = T.line; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(P + 40, y + rowH - 1); c.lineTo(W - P, y + rowH - 1); c.stroke();
      y += rowH;
    });

    // 底部：12 → 6 → 2 → 1
    let fy = H - foot + 40;
    c.textAlign = 'center';
    c.fillStyle = T.sub; c.font = font(26, 700, MONO);
    spaced(c, '12 → 6 → 2 → 1', W / 2, fy, 6, 'center');
    c.fillStyle = T.ink; c.font = font(40, 800);
    c.fillText('从个体的智慧，到群体的智慧结晶', W / 2, fy + 66);
    c.fillStyle = T.sub; c.font = font(26, 500);
    c.fillText('从 v1023 到 v1024，差的那 1，是一路上帮过你的人', W / 2, fy + 120);
    c.textAlign = 'left';
    return compose(L, H, T, null);
  }

  function compose(L, H, T, glowY) {
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c = out.getContext('2d');
    background(c, T, H, glowY);
    header(c, T, '纽扣 v1024');
    c.drawImage(L, 0, 0);
    return out;
  }

  function exportImg(cv) {
    try { return cv.toDataURL('image/jpeg', 0.92); } catch (e) { return null; }
  }

  async function render(R, name) {
    const f = await front(R, name);
    const b = await back(R, name, f.height);
    return { front: f, back: b, frontUrl: exportImg(f), backUrl: exportImg(b) };
  }

  return { render, hexA, preload: R => SHOW_MASCOT ? loadImg(`img/${IDENTITIES[R.p + R.s].img}.svg`) : Promise.resolve() };
})();
