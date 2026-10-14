// 面壁精神卡：用 Canvas 直接画正反两面，导出成图片（手机可长按保存，电脑可下载）。

const Card = (() => {
  const SANS = '"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif';
  const MONO = '"SF Mono","JetBrains Mono",Menlo,Consolas,"Roboto Mono",monospace';
  const W = 1080, P = 76;
  const NO_START = '，。、！？：；）》」』”’…%';
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
        if (NO_START.includes(ch)) {
          // 标点不能起行：往回借字，直到借到一个非标点（“儿。”” 整体挪下去）
          const cs = Array.from(cur); let k = cs.length - 1;
          while (k > 0 && NO_START.includes(cs[k])) k--;
          lines.push(cs.slice(0, k).join('')); cur = cs.slice(k).join('') + ch;
        }
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

  // 把颜色往白 (k>0) 或黑 (k<0) 推
  function mix(hex, k) {
    const n = parseInt(hex.slice(1), 16), t = k > 0 ? 255 : 0, a = Math.abs(k);
    const ch = v => Math.round(v + (t - v) * a);
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  }

  function theme(R) {
    const sp = SPIRITS[R.top];
    return { sp, pc: sp.color, ink: '#eef1ff', sub: '#a7acd8', faint: '#5f6597', panel: 'rgba(255,255,255,.045)', line: 'rgba(150,160,255,.18)', led: '#b9f6ff', accent: sp.color };
  }

  function background(c, T, H, glowY) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1030'); g.addColorStop(0.55, '#0a0b22'); g.addColorStop(1, '#130f36');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 网格
    c.strokeStyle = 'rgba(143,124,255,.06)'; c.lineWidth = 1;
    for (let x = 0; x <= W; x += 54) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke(); }
    for (let y = 0; y <= H; y += 54) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke(); }
    // 精神色光晕
    if (glowY != null) {
      const rg = c.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, 520);
      rg.addColorStop(0, hexA(T.pc, 0.32)); rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
    }
    // 边框：6 种精神色 + 四角用本卡的颜色
    const m = 26;
    const sg = c.createLinearGradient(0, 0, W, H);
    ORDER.forEach((k, i) => sg.addColorStop(i / (ORDER.length - 1), SPIRITS[k].color));
    c.strokeStyle = sg;
    c.lineWidth = 3; rr(c, m, m, W - 2 * m, H - 2 * m, 40); c.stroke();
    c.strokeStyle = T.pc; c.lineWidth = 6; c.lineCap = 'round';
    const k = 54, n = m + 16;
    [[n, n, 1, 1], [W - n, n, -1, 1], [n, H - n, 1, -1], [W - n, H - n, -1, -1]].forEach(([x, y, sx, sy]) => {
      c.beginPath(); c.moveTo(x, y + sy * k); c.lineTo(x, y); c.lineTo(x + sx * k, y); c.stroke();
    });
    c.lineCap = 'butt';
  }

  function header(c, T, right) {
    c.fillStyle = T.sub; c.font = font(25, 600, MONO); c.textBaseline = 'alphabetic';
    spaced(c, '2¹⁰ · NEW WALL-FACER', P, 104, 3);
    c.fillStyle = T.led; c.font = font(25, 700, MONO);
    spaced(c, right, W - P, 104, 3, 'right');
  }

  // 发光纽扣：本卡精神色，外圈 10 盏灯 + 顶上一盏金灯（v1024）
  function emblem(c, T, cx, cy) {
    const r = 138, orbit = 196;
    c.save();
    c.setLineDash([3, 12]); c.lineWidth = 2;
    c.strokeStyle = 'rgba(143,124,255,.45)';
    c.beginPath(); c.arc(cx, cy, orbit, 0, 7); c.stroke();
    c.restore();
    for (let i = 0; i < 11; i++) {
      const a = (-90 + i * (360 / 11)) * Math.PI / 180;
      const x = cx + Math.cos(a) * orbit, y = cy + Math.sin(a) * orbit;
      if (i === 0) led(c, x, y, 15, '#ffc766', true);
      else led(c, x, y, 9, '#b9f6ff', true);
    }
    c.save();
    c.shadowColor = T.pc; c.shadowBlur = 90;
    const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, mix(T.pc, 0.45)); g.addColorStop(1, mix(T.pc, -0.3));
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.restore();
    const hl = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.35, cy - r * 0.4, r * 1.1);
    hl.addColorStop(0, 'rgba(255,255,255,.65)'); hl.addColorStop(0.5, 'rgba(255,255,255,.08)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hl; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 7;
    c.beginPath(); c.arc(cx, cy, r * 0.76, 0, 7); c.stroke();
    c.fillStyle = hexA(T.sp.ink, 0.55);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.beginPath(); c.arc(cx + dx * r * 0.24, cy + dy * r * 0.24, r * 0.11, 0, 7); c.fill();
    }
    return orbit + 15;
  }

  function lightsRow(c, x, y, r, gap) {
    for (let i = 0; i < 10; i++) led(c, x + i * (2 * r + gap) + r, y, r, '#b9f6ff', true);
    return x + 10 * (2 * r + gap);
  }

  function panelLabel(c, T, en, zh, x, y) {
    c.fillStyle = T.sub; c.font = font(24, 700, MONO);
    const w = spaced(c, en, x, y, 4);
    c.font = font(25, 500); c.fillText(`· ${zh}`, x + w + 14, y);
  }

  // 6 种精神的六边形雷达
  function radar(c, T, R, cx, cy, rad) {
    const max = Math.max(4, ...ORDER.map(k => R.counts[k]));
    const pt = (i, f) => { const a = (-90 + i * 60) * Math.PI / 180; return [cx + Math.cos(a) * rad * f, cy + Math.sin(a) * rad * f]; };
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
    for (const f of [0.25, 0.5, 0.75, 1]) {
      c.beginPath(); ORDER.forEach((_, i) => c[i ? 'lineTo' : 'moveTo'](...pt(i, f))); c.closePath(); c.stroke();
    }
    ORDER.forEach((_, i) => { c.beginPath(); c.moveTo(cx, cy); c.lineTo(...pt(i, 1)); c.stroke(); });
    const ps = ORDER.map((k, i) => pt(i, Math.max(0.06, R.counts[k] / max)));
    c.beginPath(); ps.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](...p)); c.closePath();
    c.fillStyle = hexA(T.pc, 0.3); c.fill();
    c.strokeStyle = T.pc; c.lineWidth = 4; c.stroke();
    ORDER.forEach((k, i) => led(c, ...ps[i], k === R.top ? 11 : 7, SPIRITS[k].color, R.counts[k] > 0));
    c.textAlign = 'center';
    ORDER.forEach((k, i) => {
      const [x, y] = pt(i, 1);
      const lx = x + (x - cx) / rad * 46, ly = y + (y - cy) / rad * 52 + 9;
      c.fillStyle = k === R.top ? SPIRITS[k].color : T.sub; c.font = font(24, k === R.top ? 800 : 600);
      c.fillText(SPIRITS[k].name, lx, ly);
    });
    c.textAlign = 'left';
  }

  // ---------- 正面 ----------
  async function front(R, name) {
    const T = theme(R), sp = T.sp;
    const L = document.createElement('canvas'); L.width = W; L.height = 3600;
    const c = L.getContext('2d');
    c.textBaseline = 'alphabetic';

    const cy0 = 118 + 6 + 250;
    const half = emblem(c, T, W / 2, cy0);
    const glowY = cy0;
    let y = cy0 + half + 128;

    c.textAlign = 'center';
    c.fillStyle = T.ink; c.font = font(112, 900);
    spaced(c, sp.name, W / 2, y, 14, 'center');
    y += 58;
    c.fillStyle = T.accent; c.font = font(27, 700, MONO);
    spaced(c, sp.en.toUpperCase(), W / 2, y, 5, 'center');
    y += 78;
    c.fillStyle = '#d9dcff'; c.font = font(38, 600);
    c.fillText(`“${sp.line}”`, W / 2, y);

    // 名字 · 编号
    y += 50;
    const pills = [
      { t: name, f: font(31, 800), fill: T.pc, ink: sp.ink },
      { t: `No. ${R.top.toUpperCase()}-${R.code}`, f: font(28, 700, MONO), stroke: T.pc, ink: T.pc },
    ];
    const ph = 60, pg = 14;
    pills.forEach(p => { c.font = p.f; p.w = c.measureText(p.t).width + 46; });
    let px = (W - pills.reduce((s, p) => s + p.w, 0) - pg) / 2;
    for (const p of pills) {
      rr(c, px, y, p.w, ph, ph / 2);
      if (p.fill) { c.fillStyle = p.fill; c.fill(); }
      if (p.stroke) { c.strokeStyle = p.stroke; c.lineWidth = 3; c.stroke(); }
      c.fillStyle = p.ink; c.font = p.f; c.fillText(p.t, px + p.w / 2, y + 41);
      px += p.w + pg;
    }
    y += ph + 50;
    c.textAlign = 'left';

    // 释义
    c.font = font(32, 500);
    const dl = wrap(c, sp.def, W - 2 * P - 72);
    let ph2 = 98 + dl.length * 50 + 14;
    c.fillStyle = T.panel; rr(c, P - 10, y, W - 2 * P + 20, ph2, 30); c.fill();
    c.fillStyle = T.pc; c.fillRect(P - 10, y + 30, 8, ph2 - 60);
    panelLabel(c, T, 'WALL-FACER SPIRIT', '面壁精神', P + 26, y + 56);
    c.fillStyle = T.ink; c.font = font(32, 500);
    dl.forEach((ln, j) => c.fillText(ln, P + 26, y + 112 + j * 50));
    y += ph2 + 30;

    // 你亮起它的时刻
    const rows = R.answers.map((oi, qi) => ({ q: QUESTIONS[qi], o: QUESTIONS[qi].o[oi] })).filter(r => r.o.s === R.top);
    const textX = P + 216, textW = W - P - 30 - textX;
    c.font = font(31, 500);
    rows.forEach(r => { r.wl = wrap(c, r.o.c, textW); r.h = 30 + r.wl.length * 44; });
    ph2 = 92 + rows.reduce((s, r) => s + r.h, 0) + 22;
    c.fillStyle = T.panel; rr(c, P - 10, y, W - 2 * P + 20, ph2, 30); c.fill();
    panelLabel(c, T, 'SPIRIT LOG', `你亮起它的 ${rows.length} 个时刻`, P + 26, y + 56);
    let ry = y + 92;
    rows.forEach((r, i) => {
      const base = ry + 40;
      if (i) { c.strokeStyle = T.line; c.lineWidth = 2; c.beginPath(); c.moveTo(P + 26, ry + 2); c.lineTo(W - P - 26, ry + 2); c.stroke(); }
      led(c, P + 36, base - 11, 8, T.pc, true, false);
      c.fillStyle = T.sub; c.font = font(25, 700, MONO);
      c.fillText(r.q.v == null ? 'v—' : 'v' + r.q.v, P + 60, base - 1);
      c.fillStyle = T.ink; c.font = font(31, 500);
      r.wl.forEach((ln, j) => c.fillText(ln, textX, base + j * 44));
      ry += r.h;
    });
    y += ph2 + 64;

    // 6 种精神
    panelLabel(c, T, 'SIX SPIRITS', '12 个选择亮起了什么', P + 6, y);
    const rcx = P + 206, rcy = y + 236;
    radar(c, T, R, rcx, rcy, 138);
    const lx = P + 470;
    ORDER.forEach((k, i) => {
      const ly = y + 92 + i * 60;
      const on = k === R.top;
      led(c, lx + 9, ly - 10, 9, SPIRITS[k].color, R.counts[k] > 0);
      c.fillStyle = on ? T.ink : T.sub; c.font = font(31, on ? 800 : 600); c.fillText(SPIRITS[k].name, lx + 34, ly);
      c.fillStyle = R.counts[k] ? SPIRITS[k].color : T.faint; c.font = font(32, 800, MONO);
      c.textAlign = 'right'; c.fillText(`×${R.counts[k]}`, W - P - 10, ly); c.textAlign = 'left';
    });
    y += 470;

    // 领卡券
    const th = 176, tx = P - 10, tw = W - 2 * P + 20;
    c.save();
    c.beginPath(); rr(c, tx, y, tw, th, 26);
    c.fillStyle = hexA(T.pc, 0.12); c.fill();
    c.setLineDash([12, 10]); c.strokeStyle = T.pc; c.lineWidth = 3; c.stroke();
    c.restore();
    // 两侧打孔
    c.fillStyle = '#0b0c25';
    for (const x of [tx, tx + tw]) { c.beginPath(); c.arc(x, y + th / 2, 22, 0, 7); c.fill(); }
    c.fillStyle = T.pc; c.font = font(24, 700, MONO);
    spaced(c, 'REDEEM · 1024', P + 30, y + 54, 4);
    c.fillStyle = T.ink; c.font = font(36, 800);
    c.fillText(REDEEM.title, P + 30, y + 106);
    c.fillStyle = T.sub; c.font = font(27, 500);
    c.fillText(`「${sp.name}」实体小卡 · ${REDEEM.sub}`, P + 30, y + 148);
    y += th + 70;

    // 卡底：10 盏灯 → 第 11 位
    c.strokeStyle = T.line; c.lineWidth = 2; c.beginPath(); c.moveTo(P, y); c.lineTo(W - P, y); c.stroke();
    y += 58;
    const ex = lightsRow(c, P, y - 10, 11, 9);
    c.fillStyle = T.sub; c.font = font(30, 700, MONO); c.fillText('→', ex + 14, y);
    led(c, ex + 70, y - 10, 13, '#ffc766', true);
    c.textAlign = 'right';
    c.fillStyle = '#ffd98a'; c.font = font(30, 800, MONO);
    c.fillText('v1023 → v1024', W - P, y - 4);
    c.fillStyle = T.sub; c.font = font(23, 500);
    c.fillText('1677 万种走法之一', W - P, y + 34);
    c.textAlign = 'left';
    y += 96;

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

    const foot = 280, partH = 64, textW = W - 2 * P - 40;
    const avail = H - y - foot - 2 * partH;
    // 正面多高，背面就多高：放得下就印完整的选项原文，放不下退回卡面短句
    c.font = font(29, 500);
    let items = QUESTIONS.map((q, i) => { const o = q.o[R.answers[i]]; return { q, o, wl: wrap(c, o.t, textW) }; });
    let lh = 42, need = items.reduce((s, it) => s + 62 + it.wl.length * lh, 0);
    if (need > avail) {
      c.font = font(31, 500);
      items = items.map(it => ({ ...it, wl: [wrap(c, it.o.c, textW)[0]] }));
      lh = 44; need = items.reduce((s, it) => s + 62 + lh, 0);
    }
    const extra = Math.max(0, Math.min(40, (avail - need) / 12));
    items.forEach(({ q, o, wl }, i) => {
      if (i === 0 || i === 6) {
        c.fillStyle = T.faint; c.font = font(22, 700, MONO);
        spaced(c, i === 0 ? 'PART 1 · 一个人怎么把难事做成' : 'PART 2 · 一群人怎么把难事做成', P, y + 40, 2);
        y += partH;
      }
      const sp = SPIRITS[o.s], rowH = 62 + wl.length * lh + extra, top = y + extra / 2 + 30;
      led(c, P + 10, top - 8, 9, sp.color, true);
      c.fillStyle = T.faint; c.font = font(22, 700, MONO);
      c.fillText(`${String(i + 1).padStart(2, '0')}  ${q.v == null ? 'v—' : 'v' + q.v}`, P + 40, top);
      c.fillStyle = T.sub; c.font = font(22, 600); c.fillText(q.stage, P + 196, top);
      c.fillStyle = sp.color; c.font = font(22, 700); c.textAlign = 'right';
      c.fillText(sp.name, W - P, top); c.textAlign = 'left';
      c.fillStyle = T.ink; c.font = font(lh === 42 ? 29 : 31, 500);
      wl.forEach((ln, j) => c.fillText(ln, P + 40, top + 44 + j * lh));
      c.strokeStyle = T.line; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(P + 40, y + rowH - 1); c.lineTo(W - P, y + rowH - 1); c.stroke();
      y += rowH;
    });

    // 底部：12 → 6 → 1
    const fy = H - foot + 40;
    c.textAlign = 'center';
    c.fillStyle = T.sub; c.font = font(26, 700, MONO);
    spaced(c, '12 步 → 6 种精神 → 1 张卡', W / 2, fy, 4, 'center');
    c.fillStyle = T.ink; c.font = font(40, 800);
    c.fillText('差的那 1，是一路上帮过你的人', W / 2, fy + 70);
    c.fillStyle = T.sub; c.font = font(26, 500);
    c.fillText('从 v1023 到 v1024', W / 2, fy + 120);
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

  return { render, hexA };
})();
