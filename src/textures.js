// 程序生成的材质贴图（不依赖任何外部图片，离线可用）
const TEX = (() => {
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
  const S = 512;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };
  function planks(ctx, base, rows, grainK) {
    const h = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * S;
      while (x < S) {
        const L = S * (0.45 + rnd() * 0.6), k = (rnd() - 0.5) * 0.18;
        ctx.fillStyle = shade(base, k); ctx.fillRect(x, r * h, L, h);
        // 木纹
        for (let i = 0; i < 9; i++) {
          ctx.strokeStyle = shade(base, k - 0.12 - rnd() * grainK); ctx.globalAlpha = 0.25 + rnd() * 0.3; ctx.lineWidth = 0.6 + rnd() * 1.2;
          ctx.beginPath(); const y0 = r * h + rnd() * h; ctx.moveTo(x, y0);
          for (let s = 0; s <= 8; s++) ctx.lineTo(x + L * s / 8, y0 + Math.sin(s * 0.9 + rnd()) * h * 0.08);
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(40,25,10,.35)'; ctx.fillRect(x, r * h, 1.5, h);
        x += L;
      }
      ctx.fillStyle = 'rgba(40,25,10,.35)'; ctx.fillRect(0, r * h, S, 1.5);
    }
  }
  function tiles(ctx, base, n, grout, vein) {
    const t = S / n;
    ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = shade(base, (rnd() - 0.5) * 0.06); ctx.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
      if (vein) marbleVeins(ctx, i * t, j * t, t, vein, 3);
    }
  }
  function marbleVeins(ctx, x0, y0, sz, col, n) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, sz, sz); ctx.clip();
    for (let k = 0; k < n; k++) {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.15 + rnd() * 0.35; ctx.lineWidth = 0.5 + rnd() * 2;
      ctx.beginPath(); let x = x0 + rnd() * sz, y = y0; ctx.moveTo(x, y);
      while (y < y0 + sz) { x += (rnd() - 0.5) * sz * 0.25; y += sz * 0.06; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function speckle(ctx, base, cols, n, rmax) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) { ctx.fillStyle = cols[Math.floor(rnd() * cols.length)]; ctx.globalAlpha = 0.5 + rnd() * 0.5; const r = 0.5 + rnd() * rmax; ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, r, r * (0.6 + rnd() * 0.5), rnd() * 3, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function noise(ctx, base, amt) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${amt * rnd()})` : `rgba(0,0,0,${amt * rnd()})`; ctx.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 2 + rnd() * 6); }
  }
  const DEF = {
    // —— 地面 ——
    oak: { label: '橡木', cat: 'floor', size: 1800, color: '#c99a66', draw: c => planks(c, '#c99a66', 6, 0.15) },
    oakLight: { label: '浅橡木', cat: 'floor', size: 1800, color: '#dcbf96', draw: c => planks(c, '#dcbf96', 6, 0.12) },
    walnut: { label: '胡桃木', cat: 'floor', size: 1800, color: '#8a5a3b', draw: c => planks(c, '#8a5a3b', 6, 0.2) },
    ash: { label: '白蜡木', cat: 'floor', size: 1800, color: '#e3d3b8', draw: c => planks(c, '#e3d3b8', 6, 0.1) },
    greyOak: { label: '灰橡木', cat: 'floor', size: 1800, color: '#a59c92', draw: c => planks(c, '#a59c92', 6, 0.12) },
    herring: {
      label: '人字拼', cat: 'floor', size: 1200, color: '#b98a5c', draw: c => {
        c.fillStyle = '#6b4a2e'; c.fillRect(0, 0, S, S);
        const L = S / 2, W = S / 8;
        for (let y = -S; y < 2 * S; y += W * 2) for (let x = -S; x < 2 * S; x += W * 2) {
          for (const k of [0, 1]) {
            c.save(); c.translate(x + (k ? W : 0), y + (k ? W : 0)); c.rotate(k ? -Math.PI / 4 : Math.PI / 4);
            c.fillStyle = shade('#b98a5c', (rnd() - 0.5) * 0.25); c.fillRect(0, 0, L * 0.7, W * 0.68); c.restore();
          }
        }
      }
    },
    tileWhite: { label: '白色哑光砖', cat: 'floor', size: 1200, color: '#e9e6e1', draw: c => tiles(c, '#ebe8e3', 2, '#cfcac2') },
    tileGrey: { label: '浅灰砖', cat: 'floor', size: 1200, color: '#c5c3bf', draw: c => tiles(c, '#c9c6c1', 2, '#a9a59f') },
    marble: { label: '鱼肚白大理石', cat: 'floor', size: 1600, color: '#efece7', draw: c => tiles(c, '#f1eee9', 2, '#d9d4cc', '#8d8a86') },
    darkMarble: { label: '黑金大理石', cat: 'floor', size: 1600, color: '#2d2b2a', draw: c => tiles(c, '#2e2c2b', 2, '#1a1918', '#c9a45c') },
    terrazzo: { label: '水磨石', cat: 'floor', size: 1000, color: '#e6e1d9', draw: c => speckle(c, '#e8e3db', ['#b9a58f', '#8e9aa3', '#d8b48c', '#6d6d6d', '#ffffff'], 900, 6) },
    concrete: { label: '微水泥', cat: 'floor', size: 2000, color: '#b7b3ad', draw: c => noise(c, '#b9b5af', 0.06) },
    tileTerra: { label: '陶土砖', cat: 'floor', size: 900, color: '#c98b6a', draw: c => tiles(c, '#c98b6a', 3, '#e9dccf') },
    hexTile: {
      label: '六角砖', cat: 'floor', size: 900, color: '#d9d4cc', draw: c => {
        c.fillStyle = '#9d988f'; c.fillRect(0, 0, S, S); const r = S / 8, h = r * Math.sqrt(3);
        for (let y = -h; y < S + h; y += h) for (let i = -1, x = -r; x < S + r * 2; x += r * 1.5, i++) {
          const yy = y + (i % 2 ? h / 2 : 0); c.fillStyle = shade(rnd() > 0.82 ? '#3c5a6b' : '#e2ddd5', (rnd() - 0.5) * 0.05);
          c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(x + Math.cos(k * Math.PI / 3) * (r - 2), yy + Math.sin(k * Math.PI / 3) * (r - 2)); c.fill();
        }
      }
    },
    carpet: { label: '羊毛地毯', cat: 'floor', size: 1000, color: '#d8d0c4', draw: c => noise(c, '#d9d1c5', 0.08) },
    // —— 墙面 ——
    paint: { label: '乳胶漆', cat: 'wall', size: 2000, color: null, draw: c => noise(c, '#f4f1ec', 0.02) },
    woodPanel: {
      label: '木饰面', cat: 'wall', size: 1200, color: '#b8875a', draw: c => {
        for (let i = 0; i < 8; i++) { c.fillStyle = shade('#b8875a', (rnd() - 0.5) * 0.1); c.fillRect(i * S / 8, 0, S / 8, S); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(i * S / 8, 0, 2, S); }
        for (let i = 0; i < 60; i++) { c.strokeStyle = 'rgba(70,40,20,.18)'; c.beginPath(); const x = rnd() * S; c.moveTo(x, 0); c.bezierCurveTo(x + 6, S / 3, x - 6, S * 2 / 3, x, S); c.stroke(); }
      }
    },
    marbleWall: { label: '岩板背景墙', cat: 'wall', size: 2400, color: '#ece9e4', draw: c => { c.fillStyle = '#efece7'; c.fillRect(0, 0, S, S); marbleVeins(c, 0, 0, S, '#7f7a74', 9); } },
    brick: {
      label: '复古红砖', cat: 'wall', size: 1200, color: '#a65a3e', draw: c => {
        c.fillStyle = '#d8cfc4'; c.fillRect(0, 0, S, S); const bh = S / 16, bw = S / 4;
        for (let r = 0; r < 16; r++) for (let x = (r % 2 ? -bw / 2 : 0); x < S; x += bw) { c.fillStyle = shade('#a65a3e', (rnd() - 0.5) * 0.3); c.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); }
      }
    },
    wainscot: {
      label: '法式护墙板', cat: 'wall', size: 1200, color: '#efe7da', draw: c => {
        c.fillStyle = '#f1e9dc'; c.fillRect(0, 0, S, S); c.strokeStyle = 'rgba(120,100,70,.35)'; c.lineWidth = 3;
        c.strokeRect(40, 40, S - 80, S * 0.55); c.strokeRect(40, S * 0.68, S - 80, S * 0.26);
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.strokeRect(44, 44, S - 88, S * 0.55 - 8);
      }
    },
    fluted: {
      label: '格栅护墙', cat: 'wall', size: 600, color: '#9c7451', draw: c => {
        for (let i = 0; i < 16; i++) { const g = c.createLinearGradient(i * S / 16, 0, (i + 1) * S / 16, 0); g.addColorStop(0, '#6e4d33'); g.addColorStop(0.5, '#b18660'); g.addColorStop(1, '#6e4d33'); c.fillStyle = g; c.fillRect(i * S / 16, 0, S / 16, S); }
      }
    },
    greenPaint: { label: '墨绿漆', cat: 'wall', size: 2000, color: '#3f5a4b', draw: c => noise(c, '#3f5a4b', 0.03) },
    bluePaint: { label: '雾霾蓝', cat: 'wall', size: 2000, color: '#7d93a6', draw: c => noise(c, '#7d93a6', 0.03) },
    pinkPaint: { label: '奶油粉', cat: 'wall', size: 2000, color: '#e9cfc4', draw: c => noise(c, '#e9cfc4', 0.03) },
  };
  const cache = {};
  function canvas(name) {
    if (!cache[name]) { const c = mk(); const d = DEF[name] || DEF.oak; d.draw(c.getContext('2d')); cache[name] = c; }
    return cache[name];
  }
  const patCache = new WeakMap();
  function pattern(ctx, name) {
    let m = patCache.get(ctx); if (!m) { m = {}; patCache.set(ctx, m); }
    if (!m[name]) m[name] = ctx.createPattern(canvas(name), 'repeat');
    return m[name];
  }
  return { DEF, canvas, pattern, S, shade };
})();
