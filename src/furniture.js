// 家具库：尺寸（mm）、2D 俯视图画法、3D 模型（全部程序生成）
// 约定：局部坐标原点在家具中心，「正面」朝 +y（3D 里是 +z），靠墙的背面朝 -y。
const CATS = [
  { k: 'living', n: '客厅' }, { k: 'bed', n: '卧室' }, { k: 'dine', n: '餐厨' }, { k: 'bath', n: '卫浴' }, { k: 'deco', n: '装饰' },
];
const FURN = {
  sofa: { n: '三人沙发', c: 'living', w: 2400, d: 920, h: 820, ic: '🛋' },
  armchair: { n: '单人椅', c: 'living', w: 850, d: 850, h: 800, ic: '💺' },
  coffee: { n: '茶几', c: 'living', w: 1200, d: 600, h: 400, ic: '▭' },
  tvstand: { n: '电视柜+电视', c: 'living', w: 2000, d: 420, h: 520, ic: '📺' },
  rug: { n: '地毯', c: 'living', w: 2400, d: 1700, h: 10, ic: '▦' },
  bookshelf: { n: '书架', c: 'living', w: 1200, d: 350, h: 2000, ic: '📚' },
  drums: { n: '架子鼓', c: 'living', w: 1500, d: 1250, h: 1300, ic: '🥁' },
  piano: { n: '钢琴', c: 'living', w: 1500, d: 600, h: 1250, ic: '🎹' },
  ac: { n: '空调柜机', c: 'living', w: 500, d: 380, h: 1800, ic: '❄' },
  bed: { n: '双人床 1.8m', c: 'bed', w: 1800, d: 2150, h: 520, ic: '🛏' },
  bed15: { n: '双人床 1.5m', c: 'bed', w: 1500, d: 2100, h: 500, ic: '🛏' },
  nightstand: { n: '床头柜', c: 'bed', w: 460, d: 400, h: 520, ic: '◫', light: 1 },
  wardrobe: { n: '衣柜', c: 'bed', w: 2000, d: 600, h: 2400, ic: '🚪' },
  desk: { n: '书桌+椅', c: 'bed', w: 1200, d: 600, h: 750, ic: '🖥' },
  dresser: { n: '梳妆台', c: 'bed', w: 1000, d: 450, h: 760, ic: '🪞' },
  dining: { n: '餐桌四人', c: 'dine', w: 1400, d: 800, h: 750, ic: '🍽' },
  counter: { n: '橱柜', c: 'dine', w: 2000, d: 600, h: 850, ic: '▬' },
  fridge: { n: '冰箱', c: 'dine', w: 700, d: 700, h: 1850, ic: '🧊' },
  pendant: { n: '吊灯', c: 'dine', w: 500, d: 500, h: 60, ic: '💡', light: 1, ceil: 1 },
  toilet: { n: '马桶', c: 'bath', w: 400, d: 700, h: 760, ic: '🚽' },
  basin: { n: '浴室柜', c: 'bath', w: 800, d: 500, h: 850, ic: '🚰' },
  shower: { n: '淋浴房', c: 'bath', w: 900, d: 900, h: 2000, ic: '🚿' },
  bathtub: { n: '浴缸', c: 'bath', w: 1600, d: 750, h: 580, ic: '🛁' },
  washer: { n: '洗衣机', c: 'bath', w: 600, d: 600, h: 850, ic: '🌀' },
  plant: { n: '绿植', c: 'deco', w: 480, d: 480, h: 1300, ic: '🪴' },
  floorlamp: { n: '落地灯', c: 'deco', w: 400, d: 400, h: 1650, ic: '💡', light: 1 },
  lounger: { n: '休闲椅+边几', c: 'deco', w: 1300, d: 700, h: 780, ic: '🪑' },
  shoe: { n: '鞋柜', c: 'deco', w: 1200, d: 350, h: 1100, ic: '👟' },
  cattree: { n: '猫爬架', c: 'deco', w: 600, d: 600, h: 1500, ic: '🐈' },
};

// —— 2D 俯视图 ——
function drawItem2D(ctx, it, pal, sel) {
  const f = FURN[it.type]; if (!f) return;
  const w = it.w || f.w, d = it.d || f.d;
  ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot * Math.PI / 180);
  const R = (x, y, ww, hh, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, ww, hh, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke !== false) { ctx.strokeStyle = stroke || 'rgba(60,45,30,.55)'; ctx.lineWidth = 14; ctx.stroke(); } };
  const C = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(60,45,30,.5)'; ctx.lineWidth = 12; ctx.stroke(); };
  const W2 = w / 2, D2 = d / 2, fab = pal.fabric, wood = pal.wood;
  ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 0;
  switch (it.type) {
    case 'sofa':
      R(-W2, -D2, w, d, 120, TEX.shade(fab, -0.08));
      R(-W2 + 40, -D2 + 40, w - 80, 220, 80, TEX.shade(fab, -0.15));
      R(-W2 + 40, -D2 + 40, 200, d - 80, 80, TEX.shade(fab, -0.15)); R(W2 - 240, -D2 + 40, 200, d - 80, 80, TEX.shade(fab, -0.15));
      for (let i = 0; i < 3; i++) R(-W2 + 260 + i * (w - 520) / 3, -D2 + 280, (w - 520) / 3 - 20, d - 340, 70, fab);
      break;
    case 'armchair': case 'lounger': {
      const cw = it.type === 'lounger' ? 760 : w;
      R(-W2, -D2, cw, d, 120, TEX.shade(fab, -0.1)); R(-W2 + 120, -D2 + 180, cw - 240, d - 240, 80, fab);
      if (it.type === 'lounger') C(W2 - 220, 0, 220, wood);
      break;
    }
    case 'coffee': R(-W2, -D2, w, d, 60, wood); R(-W2 + 80, -D2 + 80, w - 160, d - 160, 40, TEX.shade(wood, 0.15), false); break;
    case 'tvstand': R(-W2, -D2, w, d, 30, wood); R(-W2 * 0.75, -D2 + 20, w * 0.75, 70, 20, '#1d1f24'); break;
    case 'rug':
      ctx.globalAlpha = 0.8; R(-W2, -D2, w, d, 80, pal.rug, 'rgba(0,0,0,.1)');
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 24; ctx.strokeRect(-W2 + 120, -D2 + 120, w - 240, d - 240); ctx.globalAlpha = 1; break;
    case 'bookshelf': R(-W2, -D2, w, d, 20, wood); for (let i = 1; i < 4; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-W2 + i * w / 4 - 8, -D2, 16, d); } break;
    case 'drums': {
      ctx.globalAlpha = 0.25; R(-W2, -D2, w, d, 120, pal.rug, false); ctx.globalAlpha = 1;
      const shell = '#b3262e';
      C(0, -D2 + 300, 280, shell); C(0, -D2 + 300, 210, '#f3efe7');
      C(-330, -D2 + 520, 170, '#f3efe7'); C(-200, -D2 + 180, 130, shell); C(190, -D2 + 180, 140, shell); C(430, -D2 + 520, 200, shell);
      C(-560, -D2 + 260, 190, '#d9b55b'); C(560, -D2 + 140, 220, '#d9b55b'); C(-520, -D2 + 620, 170, '#d9b55b');
      C(0, D2 - 220, 170, '#2a2a2e'); break;
    }
    case 'piano': R(-W2, -D2, w, d, 30, '#1b1b1d'); R(-W2 + 60, D2 - 180, w - 120, 150, 10, '#f5f5f5'); break;
    case 'ac': R(-W2, -D2, w, d, 80, '#f4f6f8'); R(-W2 + 60, D2 - 90, w - 120, 40, 10, '#9fb4c7', false); break;
    case 'bed': case 'bed15':
      R(-W2, -D2, w, d, 60, wood);
      R(-W2 + 40, -D2 + 120, w - 80, d - 160, 60, '#fbfaf7');
      R(-W2 + 40, -D2 + 620, w - 80, d - 660, 60, fab);
      ctx.fillStyle = TEX.shade(fab, -0.12); ctx.fillRect(-W2 + 40, -D2 + 620, w - 80, 120);
      R(-W2 + 120, -D2 + 180, w / 2 - 180, 360, 90, '#ffffff'); R(60, -D2 + 180, w / 2 - 180, 360, 90, '#ffffff');
      R(-W2, -D2, w, 100, 30, TEX.shade(wood, -0.2)); break;
    case 'nightstand': R(-W2, -D2, w, d, 50, wood); C(0, 0, 110, '#fff6dc'); break;
    case 'wardrobe':
      R(-W2, -D2, w, d, 20, TEX.shade(wood, 0.25));
      ctx.setLineDash([60, 40]); ctx.strokeStyle = 'rgba(60,45,30,.5)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-W2 + 60, 0); ctx.lineTo(W2 - 60, 0); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); for (let i = 1; i < Math.round(w / 500); i++) { ctx.moveTo(-W2 + i * w / Math.round(w / 500), -D2); ctx.lineTo(-W2 + i * w / Math.round(w / 500), D2); } ctx.stroke(); break;
    case 'desk': R(-W2, -D2, w, d, 40, wood); R(-180, -D2 + 40, 360, 40, 10, '#202226'); C(0, D2 + 160, 230, TEX.shade(fab, -0.25)); break;
    case 'dresser': R(-W2, -D2, w, d, 40, wood); R(-W2 + 100, -D2 + 10, w - 200, 30, 10, '#cfe3ee'); C(0, D2 + 140, 170, fab); break;
    case 'dining':
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) R(sx * w * 0.22 - 220, sy * (D2 + 160) - 220, 440, 440, 80, TEX.shade(fab, -0.05));
      R(-W2, -D2, w, d, 60, wood); R(-W2 + 70, -D2 + 70, w - 140, d - 140, 40, TEX.shade(wood, 0.12), false); break;
    case 'counter':
      R(-W2, -D2, w, d, 10, pal.stone);
      if (it.opt === 'sink') { R(-260, -D2 + 100, 520, 400, 60, '#d5dadf'); C(0, -D2 + 80, 30, '#999'); }
      if (it.opt === 'hob') { R(-380, -D2 + 80, 760, 440, 30, '#1c1c1e'); for (const x of [-180, 180]) { ctx.strokeStyle = '#555'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(x, -D2 + 300, 120, 0, 7); ctx.stroke(); } }
      break;
    case 'fridge': R(-W2, -D2, w, d, 50, '#dfe3e8'); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-20, D2 - 60, 40, 50); break;
    case 'pendant': ctx.globalAlpha = 0.7; C(0, 0, W2, '#fff1c9'); ctx.globalAlpha = 1; C(0, 0, 60, '#f2c14e'); break;
    case 'toilet': R(-W2, -D2, w, 220, 40, '#fbfbfb'); ctx.beginPath(); ctx.ellipse(0, 80, 190, 250, 0, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(60,60,70,.5)'; ctx.lineWidth = 14; ctx.stroke(); break;
    case 'basin': R(-W2, -D2, w, d, 40, wood); ctx.beginPath(); ctx.ellipse(0, 20, W2 * 0.55, D2 * 0.55, 0, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); break;
    case 'shower':
      R(-W2, -D2, w, d, 20, 'rgba(180,215,235,.45)', 'rgba(70,120,150,.7)');
      ctx.strokeStyle = 'rgba(70,120,150,.5)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-W2, -D2); ctx.lineTo(W2, D2); ctx.moveTo(W2, -D2); ctx.lineTo(-W2, D2); ctx.stroke(); C(0, 0, 50, '#9fb3c2'); break;
    case 'bathtub': R(-W2, -D2, w, d, 200, '#fbfbfb'); R(-W2 + 80, -D2 + 80, w - 160, d - 160, 220, '#e6f1f6'); break;
    case 'washer': R(-W2, -D2, w, d, 50, '#f2f4f6'); C(0, 40, 200, '#c8d6e0'); break;
    case 'plant': {
      for (let i = 0; i < 7; i++) { const a = i * 0.9, r = W2 * 0.55; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r, r * 0.55, a, 0, 7); ctx.fillStyle = i % 2 ? '#5f8f4e' : '#7aa860'; ctx.fill(); }
      C(0, 0, 70, '#4f7a41'); break;
    }
    case 'floorlamp': C(0, 0, W2, '#fff3d4'); C(0, 0, 70, '#333'); break;
    case 'shoe': R(-W2, -D2, w, d, 20, TEX.shade(wood, 0.2)); break;
    case 'cattree': R(-W2, -D2, w, d, 60, '#d9c3a0'); C(-120, -120, 90, '#b48a5a'); C(140, 120, 140, '#e8dcc8'); break;
    default: R(-W2, -D2, w, d, 30, '#ccc');
  }
  if (sel) { ctx.setLineDash([80, 60]); ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 30; ctx.strokeRect(-W2 - 60, -D2 - 60, w + 120, d + 120); ctx.setLineDash([]); }
  ctx.restore();
}

// —— 3D 模型 ——
function buildItem3D(it, M) {
  const f = FURN[it.type]; const g = new THREE.Group();
  const w = (it.w || f.w) / 1000, d = (it.d || f.d) / 1000, h = (it.h || f.h) / 1000;
  const box = (bw, bh, bd, mat, x, y, z, r) => { const m = new THREE.Mesh(r ? M.rbox(bw, bh, bd, r) : M.box, mat); if (!r) m.scale.set(bw, bh, bd); m.position.set(x, y + (r ? 0 : 0), z); if (r) m.position.y = y; g.add(m); m.castShadow = m.receiveShadow = true; return m; };
  const cyl = (rt, rb, ch, mat, x, y, z, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, ch, seg || 24), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const sph = (r, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(M.sphere, mat); m.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const P = M.pal, fab = M.mat(P.fabric, 0.95), fabD = M.mat(TEX.shade(P.fabric, -0.12), 0.95), wood = M.mat(P.wood, 0.6), metal = M.mat('#2b2b2e', 0.35, 0.8), white = M.mat('#f7f7f5', 0.4), legs = M.mat(P.leg || '#3a3029', 0.5);
  const legs4 = (lw, ld, lh, inset, r) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(r || 0.018, r || 0.014, lh, legs, sx * (lw / 2 - inset), lh / 2, sz * (ld / 2 - inset), 10); };
  switch (it.type) {
    case 'sofa': {
      box(w, 0.22, d, fabD, 0, 0.18, 0, 0.04);
      box(w - 0.1, 0.5, 0.22, fabD, 0, 0.5, -d / 2 + 0.13, 0.08);
      box(0.2, 0.42, d - 0.06, fabD, -w / 2 + 0.1, 0.4, 0, 0.07); box(0.2, 0.42, d - 0.06, fabD, w / 2 - 0.1, 0.4, 0, 0.07);
      const n = 3, cw = (w - 0.44) / n;
      for (let i = 0; i < n; i++) { box(cw - 0.02, 0.14, d - 0.3, fab, -w / 2 + 0.22 + cw * (i + 0.5), 0.36, 0.08, 0.06); box(cw - 0.06, 0.38, 0.14, fab, -w / 2 + 0.22 + cw * (i + 0.5), 0.6, -d / 2 + 0.3, 0.06); }
      box(0.42, 0.36, 0.12, M.mat(P.accent, 0.9), -w / 2 + 0.45, 0.6, -d / 2 + 0.42, 0.06).rotation.z = 0.2;
      legs4(w, d, 0.08, 0.08, 0.02); break;
    }
    case 'armchair': case 'lounger': {
      const cw = it.type === 'lounger' ? 0.76 : w, ox = it.type === 'lounger' ? -w / 2 + cw / 2 : 0;
      box(cw, 0.2, d, fabD, ox, 0.3, 0, 0.06); box(cw, 0.5, 0.16, fabD, ox, 0.6, -d / 2 + 0.08, 0.07);
      box(cw - 0.24, 0.12, d - 0.2, fab, ox, 0.44, 0.06, 0.05);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.015, 0.012, 0.22, legs, ox + sx * (cw / 2 - 0.08), 0.11, sz * (d / 2 - 0.08), 8);
      if (it.type === 'lounger') { cyl(0.22, 0.22, 0.03, wood, w / 2 - 0.22, 0.5, 0, 32); cyl(0.02, 0.02, 0.5, metal, w / 2 - 0.22, 0.25, 0, 8); cyl(0.12, 0.12, 0.02, metal, w / 2 - 0.22, 0.01, 0, 16); }
      break;
    }
    case 'coffee': box(w, 0.04, d, wood, 0, h - 0.02, 0, 0.015); box(w - 0.1, 0.02, d - 0.1, wood, 0, 0.12, 0); legs4(w, d, h - 0.04, 0.06, 0.02);
      box(0.22, 0.03, 0.16, M.mat('#e8d7b9', 0.8), 0.2, h + 0.015, 0.05); cyl(0.05, 0.04, 0.1, M.mat('#7b9b8b', 0.4), -0.25, h + 0.05, -0.05, 16); break;
    case 'tvstand': {
      box(w, h - 0.12, d, wood, 0, (h - 0.12) / 2 + 0.12, 0, 0.01); legs4(w, d, 0.12, 0.08, 0.015);
      for (let i = 1; i < 3; i++) box(0.006, h - 0.16, 0.002, M.mat('#000', 0.5), -w / 2 + i * w / 3, (h - 0.12) / 2 + 0.12, d / 2 + 0.001);
      const tw = Math.min(1.65, w * 0.82);
      box(tw, tw * 0.57, 0.035, M.mat('#111', 0.25, 0.4), 0, h + 0.08 + tw * 0.285, -d / 2 + 0.1);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(tw - 0.03, tw * 0.57 - 0.03), M.screen); scr.position.set(0, h + 0.08 + tw * 0.285, -d / 2 + 0.119); g.add(scr);
      box(0.3, 0.012, 0.18, metal, 0, h + 0.006, -d / 2 + 0.12); box(0.04, 0.08, 0.04, metal, 0, h + 0.05, -d / 2 + 0.1);
      break;
    }
    case 'rug': { const m = new THREE.Mesh(M.rbox(w, 0.012, d, 0.04), M.mat(P.rug, 1)); m.position.y = 0.006; m.receiveShadow = true; g.add(m); break; }
    case 'bookshelf': {
      box(w, h, 0.02, wood, 0, h / 2, -d / 2 + 0.01); box(0.03, h, d, wood, -w / 2 + 0.015, h / 2, 0); box(0.03, h, d, wood, w / 2 - 0.015, h / 2, 0);
      const cols = ['#b5523b', '#3d6b8c', '#d9a441', '#6a8f62', '#e7e1d6', '#4a4a4a'];
      for (let s = 0; s < 5; s++) {
        const y = s * h / 5 + 0.02; box(w - 0.06, 0.025, d, wood, 0, y, 0);
        let x = -w / 2 + 0.05; while (x < w / 2 - 0.12) { const bw = 0.03 + Math.random() * 0.04, bh = 0.2 + Math.random() * 0.12; box(bw, bh, d * 0.75, M.mat(cols[Math.floor(Math.random() * cols.length)], 0.8), x + bw / 2, y + 0.013 + bh / 2, 0.02); x += bw + 0.004; if (Math.random() < 0.08) x += 0.15; }
      }
      break;
    }
    case 'drums': {
      // 鼓手坐在 +z（正面），鼓朝 -z 摆开
      const shell = M.mat('#b3262e', 0.25, 0.3), head = M.mat('#f3efe7', 0.6), chrome = M.mat('#d6d9de', 0.15, 1), brass = M.mat('#d9b55b', 0.25, 0.9), blk = M.mat('#1d1d20', 0.6);
      const z0 = -d / 2;
      const kick = new THREE.Group(); kick.position.set(0, 0.29, z0 + 0.3); kick.rotation.x = Math.PI / 2; g.add(kick);
      { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 32), shell); m.castShadow = true; kick.add(m); for (const sy of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.02, 32), sy > 0 ? head : chrome); r.position.y = sy * 0.21; kick.add(r); } }
      { const logo = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), M.mat('#1d1d20', 0.5)); logo.position.set(0, 0.29, z0 + 0.3 - 0.222); logo.rotation.y = Math.PI; g.add(logo); }
      const drum = (r, hgt, x, y, z, tilt) => { const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.x = tilt || 0; g.add(t); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 28), shell); m.castShadow = true; t.add(m); const hd = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.012, 28), head); hd.position.y = hgt / 2; t.add(hd); return t; };
      const stand = (x, z, hgt) => { cyl(0.01, 0.01, hgt, chrome, x, hgt / 2, z, 8); for (let i = 0; i < 3; i++) { const a = i * 2.09; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.3, 6), chrome); l.position.set(x + Math.cos(a) * 0.1, 0.06, z + Math.sin(a) * 0.1); l.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(l); } };
      const cymbal = (r, x, y, z) => { stand(x, z, y); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, r, 0.02, 32), brass); c.position.set(x, y + 0.01, z); c.rotation.z = 0.12; c.castShadow = true; g.add(c); };
      drum(0.17, 0.14, -0.33, 0.62, z0 + 0.52, 0.12); stand(-0.33, z0 + 0.52, 0.55);              // 军鼓
      drum(0.13, 0.14, -0.2, 0.78, z0 + 0.2, 0.35); drum(0.14, 0.15, 0.19, 0.78, z0 + 0.2, 0.35); // 两个嗵鼓
      drum(0.2, 0.36, 0.43, 0.42, z0 + 0.52, 0); for (const [x, z] of [[0.6, z0 + 0.4], [0.26, z0 + 0.4], [0.43, z0 + 0.7]]) cyl(0.008, 0.008, 0.3, chrome, x, 0.15, z, 6); // 落地嗵
      // 踩镲（两片）
      stand(-0.56, z0 + 0.26, 0.82); for (const dy of [0.82, 0.85]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.18, 0.012, 32), brass); c.position.set(-0.56, dy, z0 + 0.26); c.castShadow = true; g.add(c); }
      cymbal(0.22, 0.56, 1.22, z0 + 0.14); cymbal(0.19, -0.52, 1.12, z0 + 0.62);                    // 吊镲 + 碎音镲
      // 鼓凳 + 鼓棒
      cyl(0.17, 0.17, 0.08, blk, 0, 0.52, d / 2 - 0.22, 24); cyl(0.02, 0.02, 0.48, chrome, 0, 0.24, d / 2 - 0.22, 8); cyl(0.15, 0.15, 0.01, chrome, 0, 0.005, d / 2 - 0.22, 3);
      for (const sx of [-1, 1]) { const st2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.4, 6), M.mat('#e2c9a0', 0.6)); st2.position.set(-0.33 + sx * 0.05, 0.71, z0 + 0.52); st2.rotation.z = Math.PI / 2 + sx * 0.3; st2.rotation.y = sx * 0.4; g.add(st2); }
      break;
    }
    case 'piano': { const blk = M.mat('#141416', 0.15, 0.1); box(w, h - 0.5, d * 0.55, blk, 0, 0.5 + (h - 0.5) / 2, -d * 0.2); box(w, 0.12, d, blk, 0, 0.7, 0); box(w - 0.1, 0.03, 0.15, white, 0, 0.775, d / 2 - 0.08); box(0.06, 0.7, d * 0.6, blk, -w / 2 + 0.03, 0.35, 0.05); box(0.06, 0.7, d * 0.6, blk, w / 2 - 0.03, 0.35, 0.05); break; }
    case 'ac': box(w, h, d, white, 0, h / 2, 0, 0.06); box(w - 0.08, 0.5, 0.01, M.mat('#c9d6e2', 0.3), 0, h - 0.4, d / 2); break;
    case 'bed': case 'bed15': {
      box(w + 0.04, 0.3, d, wood, 0, 0.15, 0, 0.02);
      box(w - 0.04, 0.22, d - 0.1, white, 0, 0.4, 0.02, 0.06);
      box(w, 0.12, d * 0.66, fab, 0, 0.5, d * 0.17, 0.05);
      box(w + 0.02, 0.06, 0.32, fabD, 0, 0.56, d * 0.17 - d * 0.33 + 0.16, 0.03);
      for (const sx of [-1, 1]) box(w / 2 - 0.16, 0.13, 0.36, white, sx * w / 4, 0.57, -d / 2 + 0.32, 0.06);
      box(w + 0.1, 0.62, 0.1, M.mat(TEX.shade(P.fabric, -0.2), 0.95), 0, 0.6, -d / 2 + 0.05, 0.05);
      break;
    }
    case 'nightstand': {
      box(w, h - 0.08, d, wood, 0, (h - 0.08) / 2 + 0.08, 0, 0.02); legs4(w, d, 0.08, 0.05, 0.012);
      box(w - 0.04, 0.004, 0.002, M.mat('#000', 0.5), 0, h * 0.55, d / 2 + 0.001);
      cyl(0.05, 0.07, 0.16, M.mat('#e9e2d6', 0.5), 0, h + 0.08, -0.03, 16);
      const sh = cyl(0.09, 0.13, 0.16, M.lampShade, 0, h + 0.25, -0.03, 24); sh.castShadow = false; g.userData.lampAt = [0, h + 0.25, -0.03];
      break;
    }
    case 'wardrobe': {
      box(w, h, d, M.mat(TEX.shade(P.wood, 0.3), 0.5), 0, h / 2, 0, 0.01);
      const n = Math.max(2, Math.round(w / 0.5));
      for (let i = 1; i < n; i++) box(0.006, h - 0.04, 0.004, M.mat('#000', 0.6), -w / 2 + i * w / n, h / 2, d / 2 + 0.002);
      for (let i = 0; i < n; i++) box(0.012, 0.3, 0.02, metal, -w / 2 + (i + 0.5) * w / n + (i % 2 ? -1 : 1) * (w / n / 2 - 0.05), 1.05, d / 2 + 0.012);
      break;
    }
    case 'desk': {
      box(w, 0.03, d, wood, 0, h - 0.015, 0, 0.01); for (const sx of [-1, 1]) box(0.03, h - 0.03, d - 0.06, metal, sx * (w / 2 - 0.05), (h - 0.03) / 2, 0);
      box(0.55, 0.32, 0.02, M.mat('#111', 0.3), 0, h + 0.28, -d / 2 + 0.12); box(0.06, 0.12, 0.06, metal, 0, h + 0.06, -d / 2 + 0.12);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.29), M.screen); scr.position.set(0, h + 0.28, -d / 2 + 0.131); g.add(scr);
      // 椅子
      const cz = d / 2 + 0.18; box(0.46, 0.06, 0.46, fabD, 0, 0.46, cz, 0.03); box(0.44, 0.48, 0.05, fabD, 0, 0.74, cz + 0.22, 0.03);
      cyl(0.025, 0.025, 0.4, metal, 0, 0.23, cz, 8); cyl(0.25, 0.25, 0.02, metal, 0, 0.03, cz, 5);
      break;
    }
    case 'dresser': box(w, 0.03, d, wood, 0, h, 0); box(w, h - 0.1, d * 0.4, wood, 0, (h - 0.1) / 2 + 0.1, -d * 0.3); legs4(w, d, h, 0.04, 0.014);
      { const mi = new THREE.Mesh(new THREE.CircleGeometry(0.32, 40), M.mirror); mi.position.set(0, h + 0.45, -d / 2 + 0.03); g.add(mi); }
      box(0.42, 0.05, 0.42, fab, 0, 0.45, d / 2 + 0.15, 0.02); break;
    case 'dining': {
      box(w, 0.04, d, wood, 0, h - 0.02, 0, 0.015); legs4(w, d, h - 0.04, 0.08, 0.025);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const c = new THREE.Group(); c.position.set(sx * w * 0.22, 0, sz * (d / 2 + 0.16)); c.rotation.y = sz > 0 ? Math.PI : 0;
        const mk = (bw, bh, bd, m, x, y, z) => { const o = new THREE.Mesh(M.rbox(bw, bh, bd, 0.02), m); o.position.set(x, y, z); o.castShadow = true; c.add(o); };
        mk(0.44, 0.05, 0.44, fab, 0, 0.46, 0); mk(0.42, 0.36, 0.04, fab, 0, 0.7, 0.2);
        for (const lx of [-1, 1]) for (const lz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.44, 8), legs); l.position.set(lx * 0.19, 0.22, lz * 0.19); c.add(l); }
        g.add(c);
      }
      cyl(0.12, 0.08, 0.06, M.mat('#e9e4da', 0.4), 0, h + 0.03, 0, 24); sph(0.05, M.mat('#e2a33b', 0.6), 0.03, h + 0.08, 0); sph(0.05, M.mat('#c94f3d', 0.6), -0.04, h + 0.08, 0.03);
      break;
    }
    case 'counter': {
      box(w, h - 0.1, d - 0.04, M.mat(P.cabinet || '#f2efe9', 0.45), 0, (h - 0.1) / 2 + 0.1, -0.02);
      box(w - 0.02, 0.1, d - 0.1, M.mat('#2a2a2a', 0.8), 0, 0.05, -0.05);
      box(w + 0.01, 0.03, d + 0.01, M.mat(P.stone, 0.3), 0, h + 0.015, 0);
      const n = Math.max(1, Math.round(w / 0.6));
      for (let i = 1; i < n; i++) box(0.004, h - 0.14, 0.003, M.mat('#000', 0.6), -w / 2 + i * w / n, (h - 0.1) / 2 + 0.1, d / 2 - 0.038);
      // 吊柜
      box(w, 0.7, 0.35, M.mat(P.cabinet || '#f2efe9', 0.45), 0, 1.85, -d / 2 + 0.175, 0.01);
      if (it.opt === 'sink') { box(0.52, 0.02, 0.4, M.mat('#c8cdd2', 0.2, 0.9), 0, h + 0.031, -0.02); cyl(0.012, 0.012, 0.3, M.mat('#ccc', 0.2, 1), 0, h + 0.17, -d / 2 + 0.08, 8); }
      if (it.opt === 'hob') { box(0.74, 0.012, 0.44, M.mat('#0e0e10', 0.1), 0, h + 0.036, 0); box(0.8, 0.36, 0.45, M.mat('#c7c9cc', 0.25, 0.9), 0, 1.7, -d / 2 + 0.225); }
      break;
    }
    case 'fridge': box(w, h, d, M.mat('#d9dde2', 0.25, 0.6), 0, h / 2, 0, 0.03); box(w - 0.02, 0.004, 0.002, M.mat('#333', 0.5), 0, h * 0.62, d / 2 + 0.001); box(0.02, 0.5, 0.03, metal, w / 2 - 0.08, h * 0.8, d / 2 + 0.015); box(0.02, 0.5, 0.03, metal, w / 2 - 0.08, h * 0.4, d / 2 + 0.015); break;
    case 'pendant': { const y = 2.05; cyl(0.004, 0.004, 0.7, metal, 0, y + 0.4, 0, 6); const sh = cyl(0.03, w / 2, 0.22, M.mat(P.accent, 0.5, 0.3), 0, y, 0, 32); sh.material = M.mat('#222', 0.4, 0.4); const bulb = sph(0.05, M.bulb, 0, y - 0.1, 0); bulb.castShadow = false; g.userData.lampAt = [0, y - 0.15, 0]; break; }
    case 'toilet': { box(w, 0.4, 0.2, white, 0, 0.55, -d / 2 + 0.1, 0.03); const b = sph(0.2, white, 0, 0.3, 0.1, 1, 1.0, 1.35); b.position.y = 0.25; box(0.36, 0.04, 0.48, white, 0, 0.41, 0.1, 0.02); break; }
    case 'basin': box(w, 0.5, d, wood, 0, 0.55, 0, 0.01); box(w, 0.04, d, M.mat('#f4f3f0', 0.25), 0, 0.82, 0); { const bw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); bw.rotation.x = Math.PI; bw.scale.set(1, 0.4, 0.75); bw.position.set(0, 0.92, 0.02); g.add(bw); }
      { const mi = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 0.75), M.mirror); mi.position.set(0, 1.45, -d / 2 + 0.01); g.add(mi); }
      cyl(0.012, 0.012, 0.2, M.mat('#ccc', 0.2, 1), 0, 0.95, -d / 2 + 0.06, 8); break;
    case 'shower': {
      box(w, 0.05, d, white, 0, 0.025, 0);
      for (const [x, z, bw, bd] of [[0, d / 2, w, 0.01], [w / 2, 0, 0.01, d]]) box(bw, h - 0.05, bd, M.glass, x, (h - 0.05) / 2 + 0.05, z).castShadow = false;
      cyl(0.012, 0.012, 1.9, M.mat('#bbb', 0.2, 1), -w / 2 + 0.06, 1.0, -d / 2 + 0.06, 8); cyl(0.12, 0.12, 0.015, M.mat('#bbb', 0.2, 1), -w / 2 + 0.2, 1.95, -d / 2 + 0.2, 24);
      break;
    }
    case 'bathtub': box(w, h, d, white, 0, h / 2, 0, 0.12); box(w - 0.12, 0.02, d - 0.12, M.mat('#bfe0ee', 0.05, 0.1), 0, h - 0.06, 0, 0.1); break;
    case 'washer': box(w, h, d, M.mat('#f1f3f5', 0.3), 0, h / 2, 0, 0.03); { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 10, 32), M.mat('#9aa6b1', 0.3, 0.7)); r.position.set(0, 0.42, d / 2 + 0.01); g.add(r); const gl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), M.mat('#3b4a57', 0.1, 0.3)); gl.position.set(0, 0.42, d / 2 + 0.005); g.add(gl); } break;
    case 'plant': {
      cyl(0.16, 0.12, 0.34, M.mat(P.pot || '#e7e1d6', 0.6), 0, 0.17, 0, 24);
      const leaf = [M.mat('#5c8f4a', 0.8), M.mat('#76a85d', 0.8), M.mat('#4b7a3d', 0.8)];
      for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.08 + (i % 3) * 0.06, y = 0.55 + (i / 9) * 0.65; const s = sph(0.16 + (i % 2) * 0.05, leaf[i % 3], Math.cos(a) * r, y, Math.sin(a) * r, 1, 0.7, 1); s.material.flatShading = true; }
      cyl(0.012, 0.012, 0.5, M.mat('#5b4632', 0.8), 0, 0.55, 0, 6);
      break;
    }
    case 'floorlamp': { cyl(0.15, 0.17, 0.03, metal, 0, 0.015, 0, 24); cyl(0.012, 0.012, 1.45, metal, 0, 0.74, 0, 8); const sh = cyl(0.13, 0.2, 0.28, M.lampShade, 0, 1.52, 0, 28); sh.castShadow = false; g.userData.lampAt = [0, 1.48, 0]; break; }
    case 'shoe': box(w, h - 0.15, d, M.mat(TEX.shade(P.wood, 0.25), 0.5), 0, (h - 0.15) / 2 + 0.15, 0, 0.01); box(w - 0.04, 0.02, d - 0.02, wood, 0, h - 0.15 + 0.01, 0);
      cyl(0.06, 0.05, 0.18, M.mat('#c9b18f', 0.5), w / 2 - 0.15, h - 0.04, 0, 16); break;
    case 'cattree': {
      const sisal = M.mat('#c8ab7d', 1), plush = M.mat('#efe6d6', 1);
      cyl(0.04, 0.04, 1.4, sisal, -0.15, 0.7, -0.15, 12); cyl(0.04, 0.04, 0.9, sisal, 0.15, 0.45, 0.15, 12);
      box(w, 0.04, d, plush, 0, 0.02, 0, 0.02); box(0.36, 0.04, 0.36, plush, 0.15, 0.92, 0.15, 0.03); box(0.4, 0.04, 0.4, plush, -0.12, 1.42, -0.12, 0.03);
      box(0.34, 0.3, 0.34, plush, -0.12, 0.45, -0.12, 0.05);
      // 一只小黑足猫趴在顶上
      const cat = M.mat('#c9a77a', 0.9), dark = M.mat('#2a2018', 0.9);
      sph(0.1, cat, -0.12, 1.5, -0.12, 1.3, 0.7, 0.9); sph(0.065, cat, -0.02, 1.55, -0.04); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 8), cat); e.position.set(-0.02 + s * 0.03, 1.61, -0.04); g.add(e); }
      sph(0.022, dark, -0.06, 1.47, -0.04); sph(0.022, dark, -0.17, 1.47, -0.06);
      break;
    }
  }
  return g;
}
