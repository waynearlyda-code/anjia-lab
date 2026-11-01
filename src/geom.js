// 几何工具
const G = {
  len: (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]),
  wallLen: w => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]),
  wallDir(w) { const L = G.wallLen(w) || 1; return [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L]; },
  wallNormal(w) { const d = G.wallDir(w); return [-d[1], d[0]]; },
  at(w, s) { const d = G.wallDir(w); return [w.a[0] + d[0] * s, w.a[1] + d[1] * s]; },
  // 墙按门窗切段：[{s,e,op|null}]
  spans(w) {
    const L = G.wallLen(w); const ops = [...w.ops].sort((a, b) => a.pos - b.pos);
    const out = []; let cur = 0;
    for (const o of ops) {
      const s = Math.max(0, o.pos - o.w / 2), e = Math.min(L, o.pos + o.w / 2);
      if (s > cur + 1) out.push({ s: cur, e: s, op: null });
      out.push({ s, e, op: o }); cur = e;
    }
    if (cur < L - 1) out.push({ s: cur, e: L, op: null });
    return out;
  },
  projT(w, p) { const d = G.wallDir(w); return (p[0] - w.a[0]) * d[0] + (p[1] - w.a[1]) * d[1]; },
  distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  },
  area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s) / 2; },
  centroid(poly) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; const f = p[0] * q[1] - q[0] * p[1]; a += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f; }
    a /= 2; if (Math.abs(a) < 1) return poly[0]; return [cx / (6 * a), cy / (6 * a)];
  },
  // 标签位置：取多边形内最大矩形的近似——网格采样离边最远的点
  labelPoint(poly) {
    const bb = G.bbox(poly); let best = G.centroid(poly), bd = -1;
    for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) {
      const p = [bb.x0 + (bb.x1 - bb.x0) * i / 12, bb.y0 + (bb.y1 - bb.y0) * j / 12];
      if (!G.inPoly(p, poly)) continue;
      let d = 1e9; for (let k = 0; k < poly.length; k++) d = Math.min(d, G.distSeg(p, poly[k], poly[(k + 1) % poly.length]));
      if (d > bd) { bd = d; best = p; }
    }
    return best;
  },
  bbox(poly) { const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; },
  inPoly(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  },
  // 射线和线段求交，返回距离
  raySeg(o, d, a, b) {
    const ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-9) return Infinity;
    const t = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den, u = ((a[0] - o[0]) * d[1] - (a[1] - o[1]) * d[0]) / den;
    return t > 0 && u >= 0 && u <= 1 ? t : Infinity;
  },
  rot(p, deg) { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; },
  itemCorners(it, def) {
    const w = it.w || def.w, d = it.d || def.d;
    return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(p => { const r = G.rot(p, it.rot); return [r[0] + it.x, r[1] + it.y]; });
  },
  toLocal(it, p) { const r = G.rot([p[0] - it.x, p[1] - it.y], -it.rot); return r; },
  snap: (v, s) => Math.round(v / s) * s,
  fmt: v => Math.round(v).toLocaleString('en-US'),
  m2: a => (a / 1e6).toFixed(2),
};

// 墙体外轮廓：每面墙一个矩形（两端各延伸半个墙厚，交接处自然重叠）
function wallRect(w, s0, s1, ext) {
  const d = G.wallDir(w), n = G.wallNormal(w), h = w.t / 2;
  const a = [w.a[0] + d[0] * (s0 - ext), w.a[1] + d[1] * (s0 - ext)], b = [w.a[0] + d[0] * (s1 + ext), w.a[1] + d[1] * (s1 + ext)];
  return [[a[0] + n[0] * h, a[1] + n[1] * h], [b[0] + n[0] * h, b[1] + n[1] * h], [b[0] - n[0] * h, b[1] - n[1] * h], [a[0] - n[0] * h, a[1] - n[1] * h]];
}

// 太阳位置（NOAA 简化算法），返回方位角（正北顺时针，度）和高度角
const SUN = {
  cities: [
    { n: '南通', lat: 32.01, lon: 120.86 }, { n: '南京', lat: 32.06, lon: 118.80 }, { n: '上海', lat: 31.23, lon: 121.47 },
    { n: '苏州', lat: 31.30, lon: 120.58 }, { n: '杭州', lat: 30.27, lon: 120.15 }, { n: '北京', lat: 39.90, lon: 116.40 },
    { n: '广州', lat: 23.13, lon: 113.26 }, { n: '深圳', lat: 22.54, lon: 114.06 }, { n: '成都', lat: 30.66, lon: 104.06 },
    { n: '武汉', lat: 30.59, lon: 114.30 }, { n: '西安', lat: 34.34, lon: 108.94 }, { n: '哈尔滨', lat: 45.80, lon: 126.53 },
  ],
  doy(m, d) { return Math.floor((Date.UTC(2026, m - 1, d) - Date.UTC(2026, 0, 0)) / 864e5); },
  pos(lat, lon, m, d, hour) {
    const N = SUN.doy(m, d), g = 2 * Math.PI / 365 * (N - 1 + (hour - 12) / 24);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const tst = hour * 60 + eqt + 4 * lon - 60 * 8; // 北京时间 UTC+8
    const ha = (tst / 4 - 180) * Math.PI / 180, la = lat * Math.PI / 180;
    const cz = Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha);
    const zen = Math.acos(Math.max(-1, Math.min(1, cz)));
    let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(decl) * Math.cos(la)) * 180 / Math.PI + 180;
    return { az: (az + 360) % 360, alt: 90 - zen * 180 / Math.PI, decl };
  },
  riseSet(lat, lon, m, d) {
    const N = SUN.doy(m, d), g = 2 * Math.PI / 365 * (N - 1);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const la = lat * Math.PI / 180;
    const c = Math.cos(90.833 * Math.PI / 180) / (Math.cos(la) * Math.cos(decl)) - Math.tan(la) * Math.tan(decl);
    const ha = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
    const rise = 720 - 4 * (lon + ha) - eqt + 480, set = 720 - 4 * (lon - ha) - eqt + 480;
    return { rise: rise / 60, set: set / 60 };
  },
  hm(h) { const m = Math.round(h * 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); },
  dir8(az) { return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(az / 45) % 8]; },
};
