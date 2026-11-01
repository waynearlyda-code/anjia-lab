// 日照分析（解析法：在平面上追踪阳光射线，穿过墙体时检查是否落在窗洞里）
// 以及水电自动布置
const SUNLIGHT = {
  // 一束阳光能否照到 p 点（高度 z0，单位 mm）。sun: {az, alt}，north: 正北相对图纸「上」的偏角（度，顺时针）
  lit(state, p, z0, sun, north, ceil) {
    if (sun.alt <= 0.5) return false;
    ceil = ceil || 2800;
    const azPlan = (sun.az - north) * Math.PI / 180; // 图纸坐标：上=北，y 向南
    const d = [Math.sin(azPlan), -Math.cos(azPlan)]; // 指向太阳的水平方向
    const tanA = Math.tan(sun.alt * Math.PI / 180);
    const sRoof = (ceil - z0) / tanA;
    const hits = [];
    for (const w of state.walls) {
      const s = G.raySeg(p, d, w.a, w.b); if (!isFinite(s) || s > sRoof + 50) continue;
      hits.push({ s, w });
    }
    hits.sort((a, b) => a.s - b.s);
    let prev = 0;
    for (const h of hits) {
      // 进入这面墙之前，射线是否已经在户外？
      const mid = (prev + h.s) / 2;
      if (mid > 1 && !SUNLIGHT.inside(state, [p[0] + d[0] * mid, p[1] + d[1] * mid])) return true;
      const z = z0 + h.s * tanA;
      if (z >= ceil) return false;
      const w = h.w; if (w.kind === 'rail') { prev = h.s; continue; }
      const t = G.projT(w, [p[0] + d[0] * h.s, p[1] + d[1] * h.s]);
      const o = w.ops.find(o => Math.abs(t - o.pos) <= o.w / 2);
      const glass = o && (o.type === 'window' || o.type === 'bay' || o.type === 'slide' || o.open > 0.5);
      if (!glass || z < o.sill || z > o.sill + o.h) return false;
      prev = h.s;
    }
    const end = Math.min(sRoof, prev + 3000);
    return !SUNLIGHT.inside(state, [p[0] + d[0] * end, p[1] + d[1] * end]);
  },
  inside(state, q) { for (const r of state.rooms) if (G.inPoly(q, r.poly)) return true; return false; },
  // 某时刻地面受光格点（用于 2D 光斑）
  patches(state, sun, north, step) {
    const out = []; step = step || 200;
    for (const r of state.rooms) {
      const bb = G.bbox(r.poly);
      for (let x = bb.x0 + step / 2; x < bb.x1; x += step) for (let y = bb.y0 + step / 2; y < bb.y1; y += step) {
        const p = [x, y]; if (!G.inPoly(p, r.poly)) continue;
        if (SUNLIGHT.lit(state, p, 50, sun, north)) out.push(p);
      }
    }
    return out;
  },
  // 全天日照时长（小时），返回格点和每个房间统计
  hours(state, city, m, d, north, from, to, step) {
    from = from ?? 8; to = to ?? 16; const dt = 10 / 60, grid = step || 300;
    const suns = []; for (let h = from; h < to - 1e-6; h += dt) suns.push(SUN.pos(city.lat, city.lon, m, d, h + dt / 2));
    const cells = [], rooms = [];
    for (const r of state.rooms) {
      const bb = G.bbox(r.poly); let sum = 0, n = 0, mx = 0, litCells = 0;
      for (let x = bb.x0 + grid / 2; x < bb.x1; x += grid) for (let y = bb.y0 + grid / 2; y < bb.y1; y += grid) {
        const p = [x, y]; if (!G.inPoly(p, r.poly)) continue;
        let c = 0; for (const s of suns) if (SUNLIGHT.lit(state, p, 600, s, north)) c++;
        const hrs = c * dt; cells.push({ x, y, h: hrs }); sum += hrs; n++; mx = Math.max(mx, hrs); if (hrs > 0) litCells++;
      }
      rooms.push({ id: r.id, name: r.name, avg: n ? sum / n : 0, max: mx, cover: n ? litCells / n : 0 });
    }
    return { cells, rooms, grid, from, to };
  },
};

// —— 水电自动布置 ——
const MEP_KINDS = {
  light: { n: '照明回路', c: '#f2b01e', dash: [90, 60] },
  power: { n: '插座回路', c: '#e5484d', dash: [] },
  ac: { n: '空调回路', c: '#9b5de5', dash: [] },
  weak: { n: '弱电(网络/电视)', c: '#2f7cf6', dash: [40, 40] },
  cold: { n: '冷水管', c: '#12a4c4', dash: [] },
  hot: { n: '热水管', c: '#ff8a1f', dash: [120, 50] },
};
const MEP_POINTS = {
  socket: { n: '五孔插座', k: 'power', h: 300 }, socketHigh: { n: '高位插座', k: 'power', h: 1100 }, socket16: { n: '16A 空调插座', k: 'ac', h: 2200 },
  switch: { n: '开关', k: 'light', h: 1300 }, lamp: { n: '灯位', k: 'light', h: 2800 }, net: { n: '网口/电视', k: 'weak', h: 300 },
  water: { n: '冷水点', k: 'cold', h: 500 }, hotwater: { n: '热水点', k: 'hot', h: 500 }, panel: { n: '强电箱', k: 'power', h: 1600 }, weakbox: { n: '弱电箱', k: 'weak', h: 400 },
};
function autoMEP(state) {
  const pts = [], lines = [];
  const roomOf = p => state.rooms.find(r => G.inPoly(p, r.poly));
  // 入户门 → 强弱电箱
  let entry = null;
  for (const w of state.walls) for (const o of w.ops) if (o.type === 'entry') entry = { w, o };
  const inward = (w, s, off) => { const c = G.at(w, s), n = G.wallNormal(w); for (const k of [1, -1]) { const q = [c[0] + n[0] * off * k, c[1] + n[1] * off * k]; if (roomOf(q)) return q; } return c; };
  const panel = entry ? inward(entry.w, entry.o.pos - entry.o.w / 2 - 350, 120) : state.rooms[0].poly[0];
  const weakbox = entry ? inward(entry.w, entry.o.pos - entry.o.w / 2 - 750, 120) : panel;
  pts.push({ t: 'panel', x: panel[0], y: panel[1] }, { t: 'weakbox', x: weakbox[0], y: weakbox[1] });
  // 门的位置（每个房间）
  const doorsOf = r => {
    const out = [];
    for (const w of state.walls) for (const o of w.ops) {
      if (!['door', 'slide', 'entry'].includes(o.type)) continue;
      const c = G.at(w, o.pos), n = G.wallNormal(w);
      for (const k of [1, -1]) { const q = [c[0] + n[0] * 200 * k, c[1] + n[1] * 200 * k]; if (G.inPoly(q, r.poly)) out.push({ c, q, w, o, k }); }
    }
    return out;
  };
  // 离某点最近的墙面上的点（贴墙放插座）
  const toWall = (p, maxD) => {
    let best = null, bd = maxD || 900;
    for (const w of state.walls) {
      if (w.kind === 'rail') continue;
      const t = Math.max(0, Math.min(G.wallLen(w), G.projT(w, p))); const c = G.at(w, t); const dd = G.len(p, c);
      if (dd < bd) { const n = G.wallNormal(w), s = Math.sign((p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1]) || 1; bd = dd; best = [c[0] + n[0] * (w.t / 2 + 40) * s, c[1] + n[1] * (w.t / 2 + 40) * s]; }
    }
    return best || p;
  };
  const add = (t, p, near) => { const q = near === false ? p : toWall(p); pts.push({ t, x: q[0], y: q[1] }); return q; };
  for (const r of state.rooms) {
    const c = G.labelPoint(r.poly), ds = doorsOf(r);
    add('lamp', c, false);
    if (ds[0]) { const d0 = ds[0]; const dir = G.wallDir(d0.w); const sp = [d0.q[0] + dir[0] * (d0.o.w / 2 + 150), d0.q[1] + dir[1] * (d0.o.w / 2 + 150)]; add('switch', sp); }
    if (r.kind === 'bed') add('socket16', [c[0], G.bbox(r.poly).y0 + 200]);
    if (r.kind === 'living') add('socket16', [G.bbox(r.poly).x1 - 300, G.bbox(r.poly).y1 - 300]);
  }
  for (const it of state.items) {
    const f = FURN[it.type]; if (!f) continue;
    const L = (lx, ly) => { const p = G.rot([lx, ly], it.rot); return [it.x + p[0], it.y + p[1]]; };
    const w = it.w || f.w, d = it.d || f.d;
    switch (it.type) {
      case 'bed': case 'bed15': add('socket', L(-w / 2 - 250, -d / 2)); add('socket', L(w / 2 + 250, -d / 2)); break;
      case 'desk': add('socket', L(-w / 3, -d / 2)); add('net', L(w / 3, -d / 2)); break;
      case 'tvstand': add('socket', L(-w / 4, -d / 2)); add('socket', L(w / 4, -d / 2)); add('net', L(0, -d / 2)); break;
      case 'sofa': add('socket', L(-w / 2 - 150, -d / 2)); add('socket', L(w / 2 + 150, -d / 2)); break;
      case 'fridge': add('socket', L(0, -d / 2)); break;
      case 'counter':
        add('socketHigh', L(-w / 3, -d / 2)); add('socketHigh', L(w / 3, -d / 2));
        if (it.opt === 'sink') { add('water', L(-120, -d / 2)); add('hotwater', L(120, -d / 2)); add('socket', L(400, -d / 2)); }
        if (it.opt === 'hob') add('socketHigh', L(0, -d / 2));
        break;
      case 'washer': add('socket', L(0, -d / 2)); add('water', L(200, -d / 2)); break;
      case 'toilet': add('socket', L(300, -d / 2)); add('water', L(-150, -d / 2)); break;
      case 'basin': add('socketHigh', L(w / 2, -d / 2)); add('water', L(-100, -d / 2)); add('hotwater', L(100, -d / 2)); break;
      case 'shower': case 'bathtub': add('water', L(-100, -d / 2)); add('hotwater', L(100, -d / 2)); break;
      case 'nightstand': break;
    }
  }
  return { pts, lines: routeMEP(state, pts, panel, weakbox) };
}
// 走线：配电箱 → 房间门口 → 点位，正交折线；同类回路平行错开
function routeMEP(state, pts, panel, weakbox) {
  const lines = [];
  const roomOf = p => state.rooms.find(r => G.inPoly(p, r.poly));
  const doorPoint = r => {
    for (const w of state.walls) for (const o of w.ops) {
      if (!['door', 'slide', 'entry'].includes(o.type)) continue;
      const c = G.at(w, o.pos), n = G.wallNormal(w);
      for (const k of [1, -1]) { const q = [c[0] + n[0] * 250 * k, c[1] + n[1] * 250 * k]; if (G.inPoly(q, r.poly)) return { inP: q, outP: [c[0] - n[0] * 250 * k, c[1] - n[1] * 250 * k] }; }
    }
    return null;
  };
  // 冷热水入户点：厨房
  const kitchen = state.rooms.find(r => r.kind === 'kitchen');
  const waterIn = kitchen ? [G.bbox(kitchen.poly).x1 - 200, G.bbox(kitchen.poly).y0 + 200] : panel;
  const offs = { light: -160, power: 0, ac: 160, weak: 80, cold: -60, hot: 60 };
  const counter = {};
  for (const p of pts) {
    if (p.t === 'panel' || p.t === 'weakbox') continue;
    const k = MEP_POINTS[p.t].k, src = k === 'weak' ? weakbox : (k === 'cold' || k === 'hot') ? waterIn : panel;
    const r = roomOf([p.x, p.y]); const dp = r ? doorPoint(r) : null;
    const o = offs[k] + ((counter[k] = (counter[k] || 0) + 1) % 4) * 22;
    const path = [[src[0] + o, src[1] + o]];
    const L = (a, b) => { path.push([b[0], a[1]]); path.push(b); };
    let cur = path[0];
    if (dp && !(r && G.inPoly(src, r.poly))) { L(cur, [dp.outP[0] + o, dp.outP[1] + o]); cur = path[path.length - 1]; path.push([dp.inP[0] + o, dp.inP[1] + o]); cur = path[path.length - 1]; }
    L(cur, [p.x, p.y]);
    lines.push({ k, pts: path });
  }
  return lines;
}
function mepStats(mep) {
  const cnt = {}, len = {};
  for (const p of mep.pts) cnt[p.t] = (cnt[p.t] || 0) + 1;
  for (const l of mep.lines) { let s = 0; for (let i = 1; i < l.pts.length; i++) s += G.len(l.pts[i - 1], l.pts[i]); len[l.k] = (len[l.k] || 0) + s; }
  return { cnt, len };
}
