// 2D 平面编辑器：渲染 + 各种工具的交互
const P2 = (() => {
  let cv, ctx, W = 1, H = 1, dpr = 1, S = null;
  const view = { s: 0.05, x: 0, y: 0 }; // 屏幕 = 世界*s + (x,y)
  const st = { tool: 'select', sel: null, hover: null, draft: null, opType: 'window', finish: 'woodPanel', mepType: 'socket', layers: { mep: false, pipes: false, dims: true, sun: false, heat: null, furn: true, labels: true }, patches: null, mepPick: null };
  const cb = {};
  const toW = (sx, sy) => [(sx - view.x) / view.s, (sy - view.y) / view.s];

  function init(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    new ResizeObserver(resize).observe(cv.parentElement); resize();
    bind();
  }
  function resize() {
    const r = cv.parentElement.getBoundingClientRect(); W = r.width || 1; H = r.height || 1; dpr = Math.min(devicePixelRatio, 2);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; if (autoFit && S && W > 50 && H > 50) fit(); else draw();
  }
  let autoFit = true;
  function fit() {
    if (!S) return; autoFit = true; const all = S.rooms.flatMap(r => r.poly).concat(S.walls.flatMap(w => [w.a, w.b])); const bb = G.bbox(all);
    const pad = W < 600 ? 60 : 110; view.s = Math.min((W - pad * 2) / (bb.x1 - bb.x0), (H - pad * 2) / (bb.y1 - bb.y0));
    view.x = W / 2 - (bb.x0 + bb.x1) / 2 * view.s; view.y = H / 2 - (bb.y0 + bb.y1) / 2 * view.s; draw();
  }
  function setState(s) { S = s; draw(); }

  // —— 渲染 ——
  let raf = 0; function draw() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
  function render() {
    if (!S) return;
    const pal = STYLES[S.style] || STYLES.cream;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    // 网格背景
    const gs = 500 * view.s; if (gs > 6) { ctx.strokeStyle = 'rgba(120,140,170,.10)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = view.x % gs; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = view.y % gs; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); }
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
    const px = 1 / view.s; // 一个屏幕像素对应多少 mm
    // 地面
    for (const r of S.rooms) {
      ctx.beginPath(); r.poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      const pat = TEX.pattern(ctx, r.floor || 'oak'); const sz = (TEX.DEF[r.floor] || TEX.DEF.oak).size; pat.setTransform(new DOMMatrix().scaleSelf(sz / TEX.S));
      ctx.fillStyle = pat; ctx.fill();
      if (st.sel && st.sel.room === r.id) { ctx.fillStyle = 'rgba(47,124,246,.16)'; ctx.fill(); ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 3 * px; ctx.setLineDash([10 * px, 6 * px]); ctx.stroke(); ctx.setLineDash([]); }
    }
    // 原图对照
    if (st.ref && st.refImg && st.refImg.complete) { ctx.globalAlpha = 0.5; ctx.drawImage(st.refImg, -OX * PX, -OY * PX, 1440 * PX, 1080 * PX); ctx.globalAlpha = 1; }
    // 日照热力 / 光斑
    if (st.layers.heat) { const res = st.layers.heat; for (const c of res.cells) { ctx.fillStyle = heatColor(c.h, res.to - res.from); ctx.globalAlpha = 0.72; ctx.fillRect(c.x - res.grid / 2 + 8, c.y - res.grid / 2 + 8, res.grid - 16, res.grid - 16); } ctx.globalAlpha = 1; }
    if (st.patches) { ctx.fillStyle = 'rgba(255,214,102,.55)'; for (const p of st.patches) ctx.fillRect(p[0] - 100, p[1] - 100, 200, 200); }
    // 家具
    if (st.layers.furn) {
      const items = [...S.items].sort((a, b) => (a.type === 'rug' ? -1 : 0) - (b.type === 'rug' ? -1 : 0) || (FURN[a.type]?.ceil ? 1 : 0) - (FURN[b.type]?.ceil ? 1 : 0));
      for (const it of items) drawItem2D(ctx, it, pal, st.sel && st.sel.item === it.id);
    }
    // 墙
    for (const w of S.walls) drawWall(w, px);
    // 选中墙 / 悬停
    const hw = st.hover && st.hover.wall ? S.walls.find(w => w.id === st.hover.wall) : null;
    if (hw && (st.tool === 'demolish' || st.tool === 'finish' || st.tool === 'opening' || st.tool === 'select')) {
      ctx.fillStyle = st.tool === 'demolish' ? 'rgba(229,72,77,.55)' : 'rgba(47,124,246,.35)';
      const r = wallRect(hw, 0, G.wallLen(hw), hw.t / 2); poly(r); ctx.fill();
    }
    if (st.sel && st.sel.wall) { const w = S.walls.find(x => x.id === st.sel.wall); if (w) { ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 3 * px; poly(wallRect(w, 0, G.wallLen(w), w.t / 2)); ctx.stroke(); dimLine(w.a, w.b, -(w.t / 2 + 260), G.fmt(G.wallLen(w)) + ' mm', px, '#2f7cf6'); } }
    // 水电
    if (st.layers.pipes && S.mepData) for (const l of S.mepData.lines) { const k = MEP_KINDS[l.k]; ctx.strokeStyle = k.c; ctx.lineWidth = 2.2 * px; ctx.setLineDash(k.dash.map(v => v * px * 0.12)); ctx.beginPath(); l.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    ctx.setLineDash([]);
    if ((st.layers.mep || st.layers.pipes) && S.mepData) for (const p of S.mepData.pts) drawMEP(p, px);
    // 尺寸链
    if (st.layers.dims && view.s >= 0.03) drawDims(px);
    // 房间标签
    const lod = view.s < 0.032 ? 0 : view.s < 0.05 ? 1 : 2;
    if (st.layers.labels) for (const r of S.rooms) {
      const c = G.labelPoint(r.poly), a = G.area(r.poly), bb = G.bbox(r.poly);
      if (lod === 0) { ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(px, px); ctx.font = '600 10px -apple-system,PingFang SC,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(r.name, 0, 3); ctx.fillStyle = '#1d2433'; ctx.fillText(r.name, 0, 3); ctx.restore(); continue; }
      const lines = [r.name, G.m2(a) + '㎡'], small = `${G.fmt(bb.x1 - bb.x0)} × ${G.fmt(bb.y1 - bb.y0)}`;
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(px, px);
      ctx.font = '600 13px -apple-system,PingFang SC,sans-serif'; const w1 = ctx.measureText(lines[0] + ' ' + lines[1]).width; ctx.font = '10px -apple-system,sans-serif'; const w2 = ctx.measureText(small).width; const bw = Math.max(w1, w2) + 16;
      ctx.fillStyle = 'rgba(255,255,255,.86)'; ctx.shadowColor = 'rgba(0,0,0,.15)'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.roundRect(-bw / 2, -19, bw, 36, 8); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#1d2433'; ctx.textAlign = 'center'; ctx.font = '600 13px -apple-system,PingFang SC,sans-serif'; ctx.fillText(lines[0] + ' ' + lines[1], 0, -2);
      ctx.fillStyle = '#6b7385'; ctx.font = '10px -apple-system,sans-serif'; ctx.fillText(small, 0, 11); ctx.restore();
    }
    // 选中家具：尺寸 + 到墙距离 + 旋转手柄
    if (st.sel && st.sel.item) { const it = S.items.find(i => i.id === st.sel.item); if (it) drawItemSel(it, px); }
    // 门窗选中
    if (st.sel && st.sel.op) { const f = findOp(st.sel.op); if (f) { const c = G.at(f.w, f.o.pos); ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 3 * px; ctx.beginPath(); ctx.arc(c[0], c[1], f.o.w / 2 + 80, 0, 7); ctx.stroke(); } }
    // 批注
    for (const n of S.notes) drawNote(n, px);
    // 测量
    for (const m of S.measures) dimLine(m.a, m.b, 0, G.fmt(G.len(m.a, m.b)) + ' mm', px, '#e5484d', true);
    // 草稿（画墙/房间/测量）
    if (st.draft) {
      const d = st.draft; ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 2 * px; ctx.setLineDash([8 * px, 5 * px]);
      ctx.beginPath(); d.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (d.cur) ctx.lineTo(d.cur[0], d.cur[1]); ctx.stroke(); ctx.setLineDash([]);
      for (const p of d.pts) { ctx.fillStyle = '#2f7cf6'; ctx.beginPath(); ctx.arc(p[0], p[1], 5 * px, 0, 7); ctx.fill(); }
      if (d.cur && d.pts.length) { const a = d.pts[d.pts.length - 1]; dimLine(a, d.cur, 0, G.fmt(G.len(a, d.cur)), px, '#2f7cf6', true); }
      if (d.snap) { ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 2 * px; ctx.beginPath(); ctx.arc(d.snap[0], d.snap[1], 9 * px, 0, 7); ctx.stroke(); }
    }
    // —— 屏幕空间：指北针、净面积、比例尺 ——
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCompass(W - 46, 52, (V3.sunState.north || 0));
    const net = S.rooms.reduce((s, r) => s + G.area(r.poly), 0);
    ctx.font = '600 12px -apple-system,PingFang SC,sans-serif'; const txt = `套内净面积 ${G.m2(net)}㎡ · ${S.rooms.length} 个空间`; const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(17,24,39,.78)'; ctx.beginPath(); ctx.roundRect(W - tw - 30, H - 40, tw + 20, 26, 13); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(txt, W - tw - 20, H - 23);
    const sb = 1000 * view.s; ctx.strokeStyle = '#475066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, H - 22); ctx.lineTo(16 + sb, H - 22); ctx.moveTo(16, H - 27); ctx.lineTo(16, H - 17); ctx.moveTo(16 + sb, H - 27); ctx.lineTo(16 + sb, H - 17); ctx.stroke(); ctx.fillStyle = '#475066'; ctx.font = '11px sans-serif'; ctx.fillText('1 m', 20 + sb, H - 18);
  }
  function poly(r) { ctx.beginPath(); r.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
  function drawWall(w, px) {
    const L = G.wallLen(w), fin = S.wallFinish[w.id];
    if (w.kind === 'rail') { ctx.strokeStyle = '#7a8aa0'; ctx.lineWidth = 40; ctx.setLineDash([120, 80]); ctx.beginPath(); ctx.moveTo(...w.a); ctx.lineTo(...w.b); ctx.stroke(); ctx.setLineDash([]); return; }
    for (const sp of G.spans(w)) {
      if (!sp.op) { ctx.fillStyle = w.kind === 'outer' ? '#1f232b' : '#3b414d'; poly(wallRect(w, sp.s - (sp.s <= 1 ? w.t / 2 : 0), sp.e + (sp.e >= L - 1 ? w.t / 2 : 0), 0)); ctx.fill(); continue; }
      const o = sp.op, a = G.at(w, sp.s), b = G.at(w, sp.e), n = G.wallNormal(w), d = G.wallDir(w), t2 = w.t / 2;
      if (o.type === 'window' || o.type === 'bay') {
        ctx.fillStyle = '#eaf4fb'; poly(wallRect(w, sp.s, sp.e, 0)); ctx.fill();
        ctx.strokeStyle = '#4a7fa8'; ctx.lineWidth = 1.4 * px;
        for (const k of [-t2, -t2 / 3, t2 / 3, t2]) { ctx.beginPath(); ctx.moveTo(a[0] + n[0] * k, a[1] + n[1] * k); ctx.lineTo(b[0] + n[0] * k, b[1] + n[1] * k); ctx.stroke(); }
      } else if (o.type === 'slide') {
        ctx.fillStyle = '#f4f7fa'; poly(wallRect(w, sp.s, sp.e, 0)); ctx.fill(); ctx.strokeStyle = '#4a7fa8'; ctx.lineWidth = 2 * px;
        const mid = (sp.s + sp.e) / 2, sh = o.open * o.w * 0.25;
        for (const [s0, s1, k] of [[sp.s, mid + 40, -t2 / 3], [mid - 40, sp.e, t2 / 3]]) { const p0 = G.at(w, s0 + (k < 0 ? -sh : sh)), p1 = G.at(w, s1 + (k < 0 ? -sh : sh)); ctx.beginPath(); ctx.moveTo(p0[0] + n[0] * k, p0[1] + n[1] * k); ctx.lineTo(p1[0] + n[0] * k, p1[1] + n[1] * k); ctx.stroke(); }
      } else {
        ctx.fillStyle = '#ffffff'; poly(wallRect(w, sp.s, sp.e, 0)); ctx.fill();
        // 门扇 + 开启弧线
        const flip = o.flip ? -1 : 1, hinge = flip > 0 ? a : b, other = flip > 0 ? b : a;
        const side = o.type === 'entry' ? -1 : 1; const nn = [n[0] * side, n[1] * side];
        const r = o.w, ang0 = Math.atan2(other[1] - hinge[1], other[0] - hinge[0]), angN = Math.atan2(nn[1], nn[0]);
        let da = angN - ang0; da = Math.atan2(Math.sin(da), Math.cos(da));
        const leafAng = ang0 + da * (0.85 + 0.15 * (1 - o.open));
        ctx.strokeStyle = o.type === 'entry' ? '#2f3238' : '#8a6d4d'; ctx.lineWidth = 2 * px;
        ctx.beginPath(); ctx.moveTo(hinge[0], hinge[1]); ctx.lineTo(hinge[0] + Math.cos(angN) * r, hinge[1] + Math.sin(angN) * r); ctx.lineWidth = 3 * px; ctx.stroke();
        ctx.lineWidth = 1 * px; ctx.setLineDash([6 * px, 4 * px]); ctx.beginPath(); ctx.arc(hinge[0], hinge[1], r, Math.min(ang0, ang0 + da), Math.max(ang0, ang0 + da)); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (fin && fin !== 'paint') { const c = TEX.DEF[fin]?.color || '#b8875a'; ctx.strokeStyle = c; ctx.lineWidth = 7 * px; ctx.beginPath(); const n = G.wallNormal(w); ctx.moveTo(w.a[0] + n[0] * (w.t / 2 + 25), w.a[1] + n[1] * (w.t / 2 + 25)); ctx.lineTo(w.b[0] + n[0] * (w.t / 2 + 25), w.b[1] + n[1] * (w.t / 2 + 25)); ctx.moveTo(w.a[0] - n[0] * (w.t / 2 + 25), w.a[1] - n[1] * (w.t / 2 + 25)); ctx.lineTo(w.b[0] - n[0] * (w.t / 2 + 25), w.b[1] - n[1] * (w.t / 2 + 25)); ctx.stroke(); }
  }
  function dimLine(a, b, off, text, px, col, plain) {
    const L = G.len(a, b); if (L < 1) return; const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1], d[0]];
    const A = [a[0] + n[0] * off, a[1] + n[1] * off], B = [b[0] + n[0] * off, b[1] + n[1] * off];
    ctx.strokeStyle = col || '#6b7385'; ctx.lineWidth = 1 * px; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B);
    for (const P of [A, B]) { ctx.moveTo(P[0] - (d[0] + n[0]) * 5 * px, P[1] - (d[1] + n[1]) * 5 * px); ctx.lineTo(P[0] + (d[0] + n[0]) * 5 * px, P[1] + (d[1] + n[1]) * 5 * px); }
    if (!plain && off) { ctx.moveTo(a[0] + n[0] * off * 0.3, a[1] + n[1] * off * 0.3); ctx.lineTo(...A); ctx.moveTo(b[0] + n[0] * off * 0.3, b[1] + n[1] * off * 0.3); ctx.lineTo(...B); }
    ctx.stroke();
    const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; let ang = Math.atan2(d[1], d[0]); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(ang); ctx.scale(px, px); ctx.font = '600 11px -apple-system,sans-serif'; const tw = ctx.measureText(text).width;
    if (plain) { ctx.fillStyle = col || '#6b7385'; ctx.beginPath(); ctx.roundRect(-tw / 2 - 5, -17, tw + 10, 16, 8); ctx.fill(); ctx.fillStyle = '#fff'; } else ctx.fillStyle = col || '#4b5366';
    ctx.textAlign = 'center'; ctx.fillText(text, 0, -5); ctx.restore();
  }
  function drawDims(px) {
    const outer = S.walls.filter(w => w.kind === 'outer'); if (!outer.length) return;
    const pts = outer.flatMap(w => [w.a, w.b]); const bb = G.bbox(pts);
    const gap = 700;
    const chain = (vals, fixed, horiz, side) => {
      const u = [...new Set(vals.map(v => Math.round(v / 10) * 10))].sort((a, b) => a - b);
      const merged = u.filter((v, i) => i === 0 || v - u[i - 1] > 150);
      for (let i = 1; i < merged.length; i++) {
        const a = horiz ? [merged[i - 1], fixed] : [fixed, merged[i - 1]], b = horiz ? [merged[i], fixed] : [fixed, merged[i]];
        dimLine(a, b, 0, G.fmt(merged[i] - merged[i - 1]), px);
      }
      const a = horiz ? [merged[0], fixed + side * 380] : [fixed + side * 380, merged[0]], b = horiz ? [merged[merged.length - 1], fixed + side * 380] : [fixed + side * 380, merged[merged.length - 1]];
      dimLine(a, b, 0, G.fmt(merged[merged.length - 1] - merged[0]), px);
    };
    const near = (w, k, v) => Math.abs((k === 'y' ? Math.min(w.a[1], w.b[1]) : Math.min(w.a[0], w.b[0])) - v);
    const xsTop = outer.filter(w => Math.min(w.a[1], w.b[1]) < bb.y0 + 3500).flatMap(w => [w.a[0], w.b[0]]);
    const xsBot = outer.filter(w => Math.max(w.a[1], w.b[1]) > bb.y1 - 3500).flatMap(w => [w.a[0], w.b[0]]);
    const ysL = outer.filter(w => Math.min(w.a[0], w.b[0]) < bb.x0 + 3500).flatMap(w => [w.a[1], w.b[1]]);
    const ysR = outer.filter(w => Math.max(w.a[0], w.b[0]) > bb.x1 - 3500).flatMap(w => [w.a[1], w.b[1]]);
    chain(xsTop, bb.y0 - gap - 900, true, -1); chain(xsBot, bb.y1 + gap + 900, true, 1); chain(ysL, bb.x0 - gap, false, -1); chain(ysR, bb.x1 + gap, false, 1);
  }
  function drawCompass(x, y, north) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.stroke();
    ctx.rotate(-north * Math.PI / 180); ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(6, 2); ctx.lineTo(-6, 2); ctx.fill(); ctx.fillStyle = '#9aa3b2'; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(6, 2); ctx.lineTo(-6, 2); ctx.fill();
    ctx.fillStyle = '#1d2433'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', 0, -20 + 30 > 0 ? -21 : 0); ctx.restore();
  }
  function drawMEP(p, px) {
    const d = MEP_POINTS[p.t], k = MEP_KINDS[d.k]; const r = (p.t === 'panel' || p.t === 'weakbox') ? 11 : 7;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(px, px);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = k.c; ctx.lineWidth = 2;
    if (p.t === 'panel' || p.t === 'weakbox') { ctx.beginPath(); ctx.rect(-r, -r * 0.7, r * 2, r * 1.4); ctx.fill(); ctx.stroke(); ctx.fillStyle = k.c; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.t === 'panel' ? '强' : '弱', 0, 3); }
    else if (p.t === 'lamp') { ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(r, -r); ctx.lineTo(-r, r); ctx.stroke(); }
    else if (p.t === 'switch') { ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fillStyle = k.c; ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, -9); ctx.stroke(); }
    else if (p.t === 'water' || p.t === 'hotwater') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.7); ctx.lineTo(-r, r * 0.7); ctx.closePath(); ctx.fillStyle = k.c; ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r, 2); ctx.lineTo(r, 2); ctx.stroke(); if (p.t === 'socket16') { ctx.fillStyle = k.c; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('AC', 0, 13); } if (p.t === 'net') { ctx.fillStyle = k.c; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TV', 0, 13); } }
    ctx.restore();
  }
  function drawNote(n, px) {
    ctx.save(); ctx.translate(n.x, n.y); ctx.scale(px, px);
    ctx.font = '12px -apple-system,PingFang SC,sans-serif'; const t = n.text || '（点我写批注）'; const tw = Math.min(180, ctx.measureText(t).width);
    ctx.fillStyle = st.sel && st.sel.note === n.id ? '#2f7cf6' : '#ffcf4a'; ctx.beginPath(); ctx.roundRect(8, -26, tw + 16, 22, 6); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = st.sel && st.sel.note === n.id ? '#fff' : '#3d2e00'; ctx.fillText(t.length > 18 ? t.slice(0, 18) + '…' : t, 16, -11); ctx.restore();
  }
  function itemDistances(it) {
    const f = FURN[it.type], w = it.w || f.w, d = it.d || f.d, out = [];
    for (const [lx, ly, half] of [[1, 0, w / 2], [-1, 0, w / 2], [0, 1, d / 2], [0, -1, d / 2]]) {
      const dir = G.rot([lx, ly], it.rot); const o = [it.x + dir[0] * half, it.y + dir[1] * half];
      let best = Infinity, bw = null;
      for (const wl of S.walls) { const s = G.raySeg(o, dir, wl.a, wl.b); if (s < best) { best = s; bw = wl; } }
      if (isFinite(best) && best < 6000) { const dd = best - (bw ? bw.t / 2 : 0); out.push({ o, e: [o[0] + dir[0] * dd, o[1] + dir[1] * dd], d: dd }); }
    }
    return out;
  }
  function drawItemSel(it, px) {
    const f = FURN[it.type], w = it.w || f.w, d = it.d || f.d;
    for (const m of itemDistances(it)) if (m.d > 30) dimLine(m.o, m.e, 0, G.fmt(m.d), px, '#2f7cf6', true);
    // 尺寸标签
    ctx.save(); ctx.translate(it.x, it.y); ctx.scale(px, px); const t = `${G.fmt(w)} × ${G.fmt(d)} × 高${G.fmt(it.h || f.h)}`; ctx.font = '600 11px sans-serif'; const tw = ctx.measureText(t).width;
    ctx.fillStyle = '#2f7cf6'; ctx.beginPath(); ctx.roundRect(-tw / 2 - 6, d / 2 * view.s + 12, tw + 12, 18, 9); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(t, 0, d / 2 * view.s + 25); ctx.restore();
    // 旋转手柄
    const h = rotHandle(it); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 2.5 * px; ctx.beginPath(); ctx.arc(h[0], h[1], 11 * px, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(h[0], h[1], 5 * px, 0.3, 5.2); ctx.stroke();
  }
  function rotHandle(it) { const f = FURN[it.type], d = it.d || f.d; const p = G.rot([0, -d / 2 - 36 / view.s], it.rot); return [it.x + p[0], it.y + p[1]]; }

  // —— 命中测试 ——
  function hitItem(p) {
    const its = S.items.filter(i => FURN[i.type]); for (let i = its.length - 1; i >= 0; i--) { const it = its[i]; if (it.type === 'rug') continue; const f = FURN[it.type]; const l = G.toLocal(it, p); if (Math.abs(l[0]) <= (it.w || f.w) / 2 && Math.abs(l[1]) <= (it.d || f.d) / 2) return it; }
    return its.find(it => it.type === 'rug' && (l => Math.abs(l[0]) <= (it.w || FURN.rug.w) / 2 && Math.abs(l[1]) <= (it.d || FURN.rug.d) / 2)(G.toLocal(it, p)));
  }
  function hitWall(p, tol) { let best = null, bd = tol; for (const w of S.walls) { const d = G.distSeg(p, w.a, w.b) - w.t / 2; if (d < bd) { bd = d; best = w; } } return best; }
  function hitOp(p) { for (const w of S.walls) for (const o of w.ops) { if (G.len(p, G.at(w, o.pos)) < o.w / 2 && G.distSeg(p, w.a, w.b) < w.t / 2 + 150) return { w, o }; } return null; }
  function findOp(id) { for (const w of S.walls) for (const o of w.ops) if (o.id === id) return { w, o }; return null; }
  function snapPt(p, from) {
    let q = [G.snap(p[0], 50), G.snap(p[1], 50)], snap = null, best = 14 / view.s;
    for (const w of S.walls) for (const e of [w.a, w.b]) { const d = G.len(p, e); if (d < best) { best = d; q = [...e]; snap = e; } }
    if (!snap && from) { const dx = q[0] - from[0], dy = q[1] - from[1]; if (Math.abs(dx) > Math.abs(dy) * 4) q[1] = from[1]; else if (Math.abs(dy) > Math.abs(dx) * 4) q[0] = from[0]; }
    return { q, snap };
  }

  // —— 交互 ——
  const ptrs = new Map(); let drag = null, pinch = null, down = null;
  function bind() {
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: view.s, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; drag = null; return; }
      const p = toW(e.offsetX, e.offsetY); down = { sx: e.offsetX, sy: e.offsetY, p, moved: false, btn: e.button, t: performance.now() };
      if (e.button === 2 || e.button === 1) { drag = { pan: true, sx: e.offsetX, sy: e.offsetY, vx: view.x, vy: view.y }; return; }
      if (st.tool === 'select') {
        if (st.sel && st.sel.item) { const it = S.items.find(i => i.id === st.sel.item); if (it && G.len(p, rotHandle(it)) < 18 / view.s) { drag = { rot: it, start: it.rot }; return; } }
        const it = st.layers.furn ? hitItem(p) : null;
        if (it) { if (!(st.sel && st.sel.item === it.id)) select({ item: it.id }); drag = { item: it, off: [it.x - p[0], it.y - p[1]], start: [it.x, it.y] }; return; }
        const n = S.notes.find(n => G.len(p, [n.x, n.y]) < 14 / view.s); if (n) { select({ note: n.id }); drag = { note: n, off: [n.x - p[0], n.y - p[1]] }; return; }
        const o = hitOp(p); if (o) { select({ op: o.o.id }); drag = { op: o, start: o.o.pos }; return; }
      }
      drag = { pan: true, sx: e.offsetX, sy: e.offsetY, vx: view.x, vy: view.y };
    });
    cv.addEventListener('pointermove', e => {
      const p = toW(e.offsetX, e.offsetY);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; autoFit = false; zoomAt(pinch.m[0], pinch.m[1], pinch.s * d / pinch.d / view.s); view.x += m[0] - pinch.m[0]; view.y += m[1] - pinch.m[1]; pinch.m = m; draw(); return; }
      if (down && Math.hypot(e.offsetX - down.sx, e.offsetY - down.sy) > 4) down.moved = true;
      if (drag && ptrs.size === 1 && down && down.moved) {
        if (drag.pan) { autoFit = false; view.x = drag.vx + e.offsetX - drag.sx; view.y = drag.vy + e.offsetY - drag.sy; draw(); return; }
        if (drag.item) { const it = drag.item; let nx = G.snap(p[0] + drag.off[0], 10), ny = G.snap(p[1] + drag.off[1], 10); [nx, ny] = snapToWall(it, nx, ny); it.x = nx; it.y = ny; cb.itemMoved && cb.itemMoved(it); draw(); return; }
        if (drag.rot) { const it = drag.rot; let a = Math.atan2(p[1] - it.y, p[0] - it.x) * 180 / Math.PI + 90; a = ((a % 360) + 360) % 360; const sn = Math.round(a / 90) * 90; if (Math.abs(a - sn) < 6) a = sn; it.rot = Math.round(a) % 360; cb.itemMoved && cb.itemMoved(it); draw(); return; }
        if (drag.note) { drag.note.x = p[0] + drag.off[0]; drag.note.y = p[1] + drag.off[1]; draw(); return; }
        if (drag.op) { const { w, o } = drag.op; const L = G.wallLen(w); o.pos = Math.max(o.w / 2, Math.min(L - o.w / 2, G.snap(G.projT(w, p), 10))); cb.opMoved && cb.opMoved(); draw(); return; }
      }
      // 悬停 & 草稿
      const old = st.hover; st.hover = null;
      if (['demolish', 'finish', 'opening'].includes(st.tool)) { const w = hitWall(p, 12 / view.s); if (w) st.hover = { wall: w.id }; }
      if (st.draft) { const last = st.draft.pts[st.draft.pts.length - 1]; const s = st.tool === 'measure' ? { q: p, snap: null } : snapPt(p, last); st.draft.cur = s.q; st.draft.snap = s.snap; draw(); }
      if (old?.wall !== st.hover?.wall) draw();
    });
    const up = e => {
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (ptrs.size) return;
      const wasDrag = drag && !drag.pan && down && down.moved;
      if (wasDrag && (drag.item || drag.rot || drag.op || drag.note)) cb.commit && cb.commit('移动');
      if (down && !down.moved && down.btn === 0) tap(down.p, e);
      drag = null; down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', e => { e.preventDefault(); if (st.draft) finishDraft(); });
    cv.addEventListener('dblclick', () => { if (st.draft) finishDraft(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); autoFit = false; zoomAt(e.offsetX, e.offsetY, Math.pow(0.9985, e.deltaY)); draw(); }, { passive: false });
  }
  function zoomAt(sx, sy, k) { const ns = Math.max(0.008, Math.min(0.6, view.s * k)); k = ns / view.s; view.x = sx - (sx - view.x) * k; view.y = sy - (sy - view.y) * k; view.s = ns; }
  function snapToWall(it, x, y) {
    const f = FURN[it.type], d = it.d || f.d; const back = G.rot([0, -1], it.rot); const o = [x + back[0] * d / 2, y + back[1] * d / 2];
    for (const w of S.walls) { const s = G.raySeg(o, back, w.a, w.b); const gap = s - w.t / 2; if (isFinite(s) && gap > -40 && gap < 90 && w.kind !== 'rail') { return [x + back[0] * gap, y + back[1] * gap]; } }
    return [x, y];
  }
  function tap(p) {
    const t = st.tool;
    if (t === 'select') {
      const it = st.layers.furn ? hitItem(p) : null; if (it) return select({ item: it.id });
      const o = hitOp(p); if (o) return select({ op: o.o.id });
      const w = hitWall(p, 8 / view.s); if (w) return select({ wall: w.id });
      const r = S.rooms.find(r => G.inPoly(p, r.poly)); return select(r ? { room: r.id } : null);
    }
    if (t === 'wall' || t === 'room' || t === 'measure') {
      const s = t === 'measure' ? { q: p } : snapPt(p, st.draft && st.draft.pts[st.draft.pts.length - 1]);
      if (!st.draft) st.draft = { pts: [s.q], cur: s.q };
      else {
        if (t === 'room' && st.draft.pts.length > 2 && G.len(s.q, st.draft.pts[0]) < 20 / view.s) return finishDraft();
        st.draft.pts.push(s.q);
        if (t === 'measure' && st.draft.pts.length === 2) return finishDraft();
      }
      draw(); cb.draftChanged && cb.draftChanged(); return;
    }
    if (t === 'opening') {
      const w = hitWall(p, 12 / view.s); if (!w || w.kind === 'rail') return cb.toast && cb.toast('点在墙上放门窗');
      const def = OPENING_DEFAULTS[st.opType], L = G.wallLen(w); const ww = Math.min(def.w, L - 100); if (ww < 300) return cb.toast && cb.toast('这面墙太短了');
      const pos = Math.max(ww / 2, Math.min(L - ww / 2, G.projT(w, p)));
      const s0 = pos - ww / 2, s1 = pos + ww / 2; if (w.ops.some(o => Math.abs(o.pos - pos) < (o.w + ww) / 2)) return cb.toast && cb.toast('和已有门窗重叠了');
      const o = { id: uid('op'), type: st.opType, pos, w: ww, h: def.h, sill: def.sill, open: 0, flip: false }; w.ops.push(o);
      cb.commit && cb.commit('添加门窗', true); select({ op: o.id }); return;
    }
    if (t === 'demolish') { const w = hitWall(p, 12 / view.s); if (w) { S.walls = S.walls.filter(x => x !== w); delete S.wallFinish[w.id]; st.hover = null; cb.commit && cb.commit('拆墙', true, { removedWall: w.id }); cb.toast && cb.toast(`已拆除一段 ${G.fmt(G.wallLen(w))}mm 的墙（可撤销）`); } return; }
    if (t === 'finish') { const w = hitWall(p, 12 / view.s); if (w && w.kind !== 'rail') { if (S.wallFinish[w.id] === st.finish) delete S.wallFinish[w.id]; else S.wallFinish[w.id] = st.finish; cb.commit && cb.commit('墙面造型', true); } return; }
    if (t === 'note') { const n = { id: uid('n'), x: p[0], y: p[1], text: '' }; S.notes.push(n); cb.commit && cb.commit('批注', true); select({ note: n.id }); cb.editNote && cb.editNote(n); return; }
    if (t === 'mep') { const r = S.rooms.find(r => G.inPoly(p, r.poly)); if (!S.mepData) S.mepData = { pts: [], lines: [] }; S.mepData.pts.push({ t: st.mepType, x: p[0], y: p[1] }); cb.commit && cb.commit('水电点位', true); return; }
  }
  function finishDraft() {
    const d = st.draft; st.draft = null; if (!d) return;
    if (st.tool === 'wall' && d.pts.length >= 2) { for (let i = 1; i < d.pts.length; i++) if (G.len(d.pts[i - 1], d.pts[i]) > 50) S.walls.push({ id: uid('w'), a: d.pts[i - 1], b: d.pts[i], t: st.wallT || 120, kind: 'inner', h: 2800, ops: [] }); cb.commit && cb.commit('画墙', true); }
    if (st.tool === 'room' && d.pts.length >= 3) { const r = { id: uid('r'), name: '新房间', kind: 'bed', poly: d.pts, floor: 'oak' }; S.rooms.push(r); cb.commit && cb.commit('新房间', true); select({ room: r.id }); }
    if (st.tool === 'measure' && d.pts.length === 2) { S.measures.push({ a: d.pts[0], b: d.pts[1] }); cb.commit && cb.commit('测量'); }
    draw(); cb.draftChanged && cb.draftChanged();
  }
  function select(s) { st.sel = s; cb.select && cb.select(s); draw(); }
  function setTool(t) { if (st.draft) st.draft = null; st.tool = t; st.hover = null; cv.style.cursor = t === 'select' ? 'default' : t === 'demolish' ? 'not-allowed' : 'crosshair'; draw(); }
  function exportImage(w, h) {
    const saved = { cv, ctx, W, H, dpr, v: { ...view }, sel: st.sel, hover: st.hover };
    const oc = document.createElement('canvas'); oc.width = w; oc.height = h; cv = oc; ctx = oc.getContext('2d'); W = w; H = h; dpr = 1; st.sel = null; st.hover = null;
    const all = S.rooms.flatMap(r => r.poly).concat(S.walls.flatMap(x => [x.a, x.b])); const bb = G.bbox(all); const pad = 160;
    view.s = Math.min((W - pad * 2) / (bb.x1 - bb.x0), (H - pad * 2) / (bb.y1 - bb.y0)); view.x = W / 2 - (bb.x0 + bb.x1) / 2 * view.s; view.y = H / 2 - (bb.y0 + bb.y1) / 2 * view.s;
    render();
    const out = document.createElement('canvas'); out.width = w; out.height = h; const o = out.getContext('2d'); o.fillStyle = '#fbfcfe'; o.fillRect(0, 0, w, h); o.drawImage(oc, 0, 0);
    o.fillStyle = '#162033'; o.font = 'bold 34px -apple-system,PingFang SC,sans-serif'; o.fillText('四室两厅两卫 · 平面方案', 60, 80); o.fillStyle = '#69728a'; o.font = '20px -apple-system,PingFang SC,sans-serif'; o.fillText('安家 Lab · ' + new Date().toLocaleDateString('zh-CN'), 60, 116);
    cv = saved.cv; ctx = saved.ctx; W = saved.W; H = saved.H; dpr = saved.dpr; Object.assign(view, saved.v); st.sel = saved.sel; st.hover = saved.hover; draw();
    return out.toDataURL('image/png');
  }
  function centerWorld() { return toW(W / 2, H / 2); }
  return { init, setState, draw, fit, exportImage, st, cb, setTool, select, finishDraft, view, centerWorld, itemDistances, resize };
})();
