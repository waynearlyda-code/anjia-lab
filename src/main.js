// 主程序：状态、撤销、界面面板、模式切换、开场
const STYLES = {
  cream: { n: '奶油风', d: '米白 + 浅橡木，软糯温柔', wall: '#f4ede3', fabric: '#efe4d3', wood: '#d6b089', accent: '#c99f7a', rug: '#eadcca', stone: '#f2eee8', cabinet: '#f3ece2', leg: '#c8a47e', pot: '#efe6d8', floors: { living: 'oakLight', dining: 'oakLight', hall: 'oakLight', bed: 'oak', kitchen: 'tileWhite', bath: 'terrazzo', balcony: 'tileTerra' } },
  wood: { n: '原木风', d: '白蜡木 + 绿植，日系清爽', wall: '#f7f3ec', fabric: '#e6ded0', wood: '#c39b6c', accent: '#7f9874', rug: '#dccdb4', stone: '#ece6dc', cabinet: '#dcc39d', leg: '#b48a5e', pot: '#d9cbb3', floors: { living: 'ash', dining: 'ash', hall: 'ash', bed: 'ash', kitchen: 'tileGrey', bath: 'hexTile', balcony: 'tileTerra' } },
  modern: { n: '现代极简', d: '灰白黑 + 微水泥，干净利落', wall: '#eef0f2', fabric: '#8b9099', wood: '#3c3f45', accent: '#1f2937', rug: '#c9cdd3', stone: '#e5e7eb', cabinet: '#f4f4f3', leg: '#1f2937', pot: '#3c3f45', floors: { living: 'concrete', dining: 'concrete', hall: 'concrete', bed: 'greyOak', kitchen: 'tileGrey', bath: 'concrete', balcony: 'tileGrey' } },
  luxe: { n: '轻奢', d: '大理石 + 丝绒 + 香槟金', wall: '#f2efeb', fabric: '#3d4250', wood: '#2c2c2e', accent: '#c9a45c', rug: '#d8d1c6', stone: '#f1eee9', cabinet: '#ebe6df', leg: '#c9a45c', pot: '#2c2c2e', floors: { living: 'marble', dining: 'marble', hall: 'marble', bed: 'herring', kitchen: 'marble', bath: 'darkMarble', balcony: 'tileGrey' } },
  chinese: { n: '新中式', d: '胡桃木 + 朱砂红，沉稳雅致', wall: '#f3eee5', fabric: '#cbb796', wood: '#5b3a27', accent: '#8c2f2f', rug: '#b99f7b', stone: '#efe9df', cabinet: '#5b3a27', leg: '#3d2618', pot: '#2f4a3b', floors: { living: 'walnut', dining: 'walnut', hall: 'walnut', bed: 'walnut', kitchen: 'tileGrey', bath: 'terrazzo', balcony: 'tileTerra' } },
  wabi: { n: '侘寂', d: '微水泥 + 亚麻 + 旧木，安静克制', wall: '#e7e0d4', fabric: '#d5cab9', wood: '#9d8164', accent: '#6f6455', rug: '#ccc0ad', stone: '#d9d2c6', cabinet: '#d7cdbd', leg: '#7b6650', pot: '#b9ab96', floors: { living: 'concrete', dining: 'concrete', hall: 'concrete', bed: 'oak', kitchen: 'concrete', bath: 'concrete', balcony: 'terrazzo' } },
};
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'anjia-lab-v2';
const MOB = matchMedia('(max-width:820px)').matches;
if (MOB || matchMedia('(pointer:coarse)').matches) document.body.classList.add('mob');

// —— 状态 + 撤销 ——
let S;
function fresh() { const s = buildDefaultPlan(); applyStyleFloors(s, s.style); return s; }
function applyStyleFloors(s, k) { const st = STYLES[k]; for (const r of s.rooms) if (!r.floorLocked) r.floor = st.floors[r.kind] || 'oak'; }
try { const raw = localStorage.getItem(KEY); S = raw ? JSON.parse(raw) : fresh(); if (!S.walls || S.v !== 2) S = fresh(); } catch (e) { S = fresh(); }
const hist = { list: [JSON.stringify(S)], i: 0 };
let saveT = 0;
function commit(label, rebuild, opts) {
  hist.list = hist.list.slice(0, hist.i + 1); hist.list.push(JSON.stringify(S)); if (hist.list.length > 80) hist.list.shift(); hist.i = hist.list.length - 1;
  P2.draw(); if (rebuild) V3.build(S, opts); refreshProps();
  clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }, 400);
}
function restore(i) {
  hist.i = i; S = JSON.parse(hist.list[i]); P2.setState(S); P2.st.sel = null; V3.build(S); refreshProps();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
}
// —— 存档位（最多 6 个，存在浏览器里）——
const SLOT_KEY = 'anjia-lab-slots-v1', SLOT_MAX = 6;
const slotsLoad = () => { try { return JSON.parse(localStorage.getItem(SLOT_KEY)) || []; } catch (e) { return []; } };
function slotsSave(list) { try { localStorage.setItem(SLOT_KEY, JSON.stringify(list)); return true; } catch (e) { toast('浏览器存储空间满了，先删掉一个旧存档'); return false; } }
function slotThumb() { try { return V3.snapshot(384, 216).replace(/^data:image\/jpeg/, 'data:image/jpeg'); } catch (e) { return ''; } }
const fmtTime = t => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const undo = () => { if (hist.i > 0) { restore(hist.i - 1); toast('已撤销'); } }, redo = () => { if (hist.i < hist.list.length - 1) { restore(hist.i + 1); toast('已重做'); } };
let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

// —— 初始化视图 ——
P2.init($('#cv2')); P2.setState(S);
V3.init($('#v3d'), $('#labels'));
P2.cb.commit = commit; P2.cb.toast = toast;
P2.cb.select = s => { V3.selected = s && s.item; V3.highlight(s && s.item); refreshProps(); if (MOB && s) openSheet('props'); };
let lastMove = 0;
P2.cb.itemMoved = it => V3.moveItem(it);
P2.cb.opMoved = () => { const t = performance.now(); if (t - lastMove > 120) { lastMove = t; V3.build(S); } };
P2.cb.editNote = () => { refreshProps(); setTimeout(() => { const t = $('#noteText'); t && t.focus(); }, 50); };
P2.cb.draftChanged = () => refreshProps();
V3.onPick = hit => { if (hit && hit.item) P2.select({ item: hit.item }); else if (hit && hit.room) P2.select({ room: hit.room }); else if (hit && hit.wall) P2.select({ wall: hit.wall }); else P2.select(null); };
V3.onDragItem = (it, x, y) => { it.x = G.snap(x, 10); it.y = G.snap(y, 10); V3.moveItem(it); P2.draw(); };
V3.onDragEnd = () => commit('移动');

// —— 模式 ——
let mode = '3d';
function setMode(m) {
  if (mode === 'walk' && m !== 'walk') V3.exitWalk();
  if (document.body.classList.contains('mpano')) exitPano();
  mode = m; document.body.className = document.body.className.replace(/\bm(2d|3d|split|walk|pano)\b/g, '').trim() + ' m' + m;
  $$('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#tag3').textContent = m === 'walk' ? '3D · 漫游' : '3D · 鸟瞰';
  if (m === 'walk') { V3.enterWalk(); closeFloat(); toast(MOB ? '左下拖动走路 · 右边滑动看 · 「跳」能跳上沙发和床' : 'WASD 走 · 拖动鼠标看 · 空格跳 · E 开门'); }
  renderTools();
  setTimeout(() => { P2.resize(); if (m === '2d' || m === 'split') P2.fit(); if (m !== 'walk') V3.frame('iso'); V3.redraw(); }, 60);
}
$$('#modes button').forEach(b => b.onclick = () => setMode(b.dataset.m));

// —— 工具条 ——
const TOOLS = [
  ['select', '↖', '选择'], ['wall', '✏️', '画墙'], ['room', '⬠', '房间'], ['opening', '🚪', '门窗'], ['mep', '⚡', '水电'], ['pipes', '〰️', '管线'],
  ['finish', '🧱', '造型'], ['note', '📌', '批注'], ['measure', '📏', '测量'], ['demolish', '🔨', '拆墙'],
];
const HINTS = { select: '点选家具/房间/墙 · 拖动移动 · 拖空白处平移 · 滚轮缩放', wall: '点击起点、逐点画墙 · 双击/右键结束 · 自动吸附端点和水平垂直', room: '依次点出房间的角 · 点回起点闭合', opening: '先在右侧选类型，再点在墙上', mep: '点平面添加点位，或右侧「一键布置」', pipes: '显示自动生成的强弱电、给水走线', finish: '先在右侧选材质，再点墙（再点一次取消）', note: '点在平面上写批注', measure: '点两下量任意距离', demolish: '点一面墙把它拆掉（可撤销）' };
function renderTools() {
  const show2d = mode === '2d' || mode === 'split';
  let h = '';
  if (MOB) {
    h += `<button data-a="lib"><em>🛋</em>家具</button>`;
    if (show2d) h += TOOLS.map(t => `<button data-t="${t[0]}" class="${P2.st.tool === t[0] ? 'on' : ''}"><em>${t[1]}</em>${t[2]}</button>`).join('');
    h += `<button data-a="props"><em>⚙️</em>属性</button><button data-p="sun"><em>☀️</em>日照</button><button data-p="style"><em>🎨</em>风格</button><button data-p="smart"><em>🏠</em>中控</button><button data-p="shot"><em>📷</em>出图</button><button data-p="save"><em>💾</em>存档</button><button data-a="undo"><em>↶</em>撤销</button><button data-a="redo"><em>↷</em>重做</button><button data-p="check"><em>✅</em>自查</button><button data-p="menu"><em>⋯</em>更多</button>`;
  } else {
    h += TOOLS.map(t => `<button data-t="${t[0]}" class="${P2.st.tool === t[0] ? 'on' : ''}">${t[1]} ${t[2]}</button>`).join('') + `<span class="sp"></span><span class="hint">${HINTS[P2.st.tool]}</span>`;
  }
  $('#tools').innerHTML = h;
}
$('#tools').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.t) { setTool(b.dataset.t); if (MOB && ['opening', 'finish', 'mep', 'pipes', 'wall'].includes(b.dataset.t)) openSheet('props'); }
  if (b.dataset.a === 'lib') openSheet('lib'); if (b.dataset.a === 'props') openSheet('props'); if (b.dataset.a === 'undo') undo(); if (b.dataset.a === 'redo') redo();
  if (b.dataset.p) openFloat(b.dataset.p);
});
function setTool(t) {
  P2.setTool(t); P2.st.sel = null;
  if (t === 'mep' || t === 'pipes') { if (!S.mepData) { S.mepData = autoMEP(S); commit('水电布置'); toast('已按家具位置自动布置水电点位和走线'); } P2.st.layers.mep = true; if (t === 'pipes') P2.st.layers.pipes = true; }
  renderTools(); refreshProps(); P2.draw();
}

// —— 家具库 ——
let libTab = 'living';
function thumb(type) {
  const c = document.createElement('canvas'); c.width = 112; c.height = 88; const x = c.getContext('2d'); const f = FURN[type];
  const s = Math.min(100 / f.w, 76 / f.d); x.translate(56, 44); x.scale(s, s); drawItem2D(x, { type, x: 0, y: 0, rot: 0, opt: type === 'counter' ? 'hob' : '' }, STYLES[S.style] || STYLES.cream);
  return c.toDataURL();
}
const thumbCache = {};
function renderLib() {
  const tabs = CATS.map(c => `<button data-c="${c.k}" class="${libTab === c.k ? 'on' : ''}">${c.n}</button>`).join('') + `<button data-c="floor" class="${libTab === 'floor' ? 'on' : ''}">铺装</button><button data-c="wallf" class="${libTab === 'wallf' ? 'on' : ''}">墙面</button>`;
  let body = '';
  if (libTab === 'floor' || libTab === 'wallf') {
    const cat = libTab === 'floor' ? 'floor' : 'wall';
    body = `<div class="sw">${Object.entries(TEX.DEF).filter(([k, d]) => d.cat === cat).map(([k, d]) => `<button data-mat="${k}"><span style="background-image:url(${matThumb(k)})"></span>${d.label}</button>`).join('')}</div>
      <p style="font-size:12px;color:var(--sub);margin-top:12px">${cat === 'floor' ? '先点选一个房间，再点材质换地面。' : '会切到「造型」工具，点墙就贴上。'}</p>`;
  } else {
    body = `<div class="grid">${Object.entries(FURN).filter(([k, f]) => f.c === libTab).map(([k, f]) => `<div class="card" data-add="${k}"><img src="${thumbCache[k + S.style] || (thumbCache[k + S.style] = thumb(k))}" style="width:56px;height:44px">${f.n}</div>`).join('')}</div>
      <p style="font-size:12px;color:var(--sub);margin-top:12px">点一下放进房间，或${MOB ? '' : '按住'}拖到平面图上。</p>`;
  }
  $('#libBody').innerHTML = `<div class="sec"><h4>素材库</h4><div class="tabs">${tabs}</div>${body}</div>`;
}
const matThumbC = {}; function matThumb(k) { return matThumbC[k] || (matThumbC[k] = (() => { const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(TEX.canvas(k), 0, 0, 96, 96); return c.toDataURL(); })()); }
$('#libBody').addEventListener('click', e => {
  const t = e.target.closest('[data-c]'); if (t) { libTab = t.dataset.c; renderLib(); return; }
  const m = e.target.closest('[data-mat]'); if (m) {
    const k = m.dataset.mat; if (TEX.DEF[k].cat === 'floor') { const r = P2.st.sel && P2.st.sel.room && S.rooms.find(r => r.id === P2.st.sel.room); if (!r) return toast('先点选一个房间'); r.floor = k; r.floorLocked = true; commit('换地面', true); toast(`${r.name} 换成了${TEX.DEF[k].label}`); }
    else { P2.st.finish = k; if (mode === '3d') setMode('split'); setTool('finish'); toast('点墙贴上「' + TEX.DEF[k].label + '」'); }
    return;
  }
  const a = e.target.closest('[data-add]'); if (a && !dragging) addFurniture(a.dataset.add);
});
function addFurniture(type, at) {
  const f = FURN[type]; let p = at;
  if (!p) { const sel = P2.st.sel && P2.st.sel.room && S.rooms.find(r => r.id === P2.st.sel.room); if (sel) p = G.labelPoint(sel.poly); else if (mode === '2d' || mode === 'split') p = P2.centerWorld(); else { const lr = S.rooms.find(r => r.kind === 'living'); p = G.labelPoint(lr.poly); } }
  const it = { id: uid('i'), type, x: G.snap(p[0], 10), y: G.snap(p[1], 10), rot: 0 }; if (type === 'counter') it.opt = '';
  S.items.push(it); commit('添加' + f.n, true); P2.select({ item: it.id }); toast(`已放入${f.n}，拖动摆放位置`);
  if (MOB) closeSheets();
}
// 拖拽放置（桌面）
let dragging = null;
$('#libBody').addEventListener('pointerdown', e => {
  const a = e.target.closest('[data-add]'); if (!a || MOB) return;
  const ghost = a.cloneNode(true); ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:99;opacity:.85;width:80px;transform:translate(-50%,-50%)';
  let started = false; const sx = e.clientX, sy = e.clientY;
  const mv = ev => { if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { started = true; dragging = a.dataset.add; document.body.appendChild(ghost); } if (started) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; } };
  const upf = ev => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', upf); ghost.remove();
    if (started) { const r = $('#cv2').getBoundingClientRect(); if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom && $('#v2d').offsetParent) { const v = P2.view; addFurniture(dragging, [(ev.clientX - r.left - v.x) / v.s, (ev.clientY - r.top - v.y) / v.s]); } setTimeout(() => dragging = null, 0); }
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', upf);
});

// —— 属性面板 ——
function refreshProps() {
  const s = P2.st.sel, t = P2.st.tool; let h = '';
  const sw = (cat, cur, attr) => `<div class="sw">${Object.entries(TEX.DEF).filter(([k, d]) => d.cat === cat).map(([k, d]) => `<button data-${attr}="${k}" class="${cur === k ? 'on' : ''}"><span style="background-image:url(${matThumb(k)})"></span>${d.label}</button>`).join('')}</div>`;
  if (s && s.item) {
    const it = S.items.find(i => i.id === s.item); if (!it) return; const f = FURN[it.type];
    h = `<div class="sec"><h4>家具</h4><div style="font-size:17px;font-weight:700;margin-bottom:8px">${f.ic} ${f.n}</div>
      <div class="row"><label>宽 mm</label><input type="number" step="10" data-k="w" value="${it.w || f.w}"></div>
      <div class="row"><label>深 mm</label><input type="number" step="10" data-k="d" value="${it.d || f.d}"></div>
      <div class="row"><label>高 mm</label><input type="number" step="10" data-k="h" value="${it.h || f.h}"></div>
      <div class="row"><label>旋转</label><input type="range" min="0" max="359" data-k="rot" value="${it.rot}"><b style="width:36px;text-align:right">${it.rot}°</b></div>
      ${it.type === 'counter' ? `<div class="row"><label>台面</label><select data-k="opt"><option value="">普通</option><option value="sink" ${it.opt === 'sink' ? 'selected' : ''}>水槽</option><option value="hob" ${it.opt === 'hob' ? 'selected' : ''}>灶台+烟机</option></select></div>` : ''}
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="rot90">⟳ 转 90°</button><button class="btn" data-act="dup">⧉ 复制</button><button class="btn red" data-act="del">删除</button></div>
      <div style="margin-top:14px;font-size:12px;color:var(--sub)">${P2.itemDistances(it).map(d => `离墙 ${G.fmt(Math.max(0, d.d))}`).join(' · ')}</div></div>`;
  } else if (s && s.room) {
    const r = S.rooms.find(x => x.id === s.room); if (!r) return; const a = G.area(r.poly) / 1e6;
    h = `<div class="sec"><h4>房间</h4><div class="row"><label>名称</label><input type="text" data-r="name" value="${esc(r.name)}"></div>
      <div class="row"><label>类型</label><select data-r="kind">${[['living', '客厅'], ['dining', '餐厅'], ['bed', '卧室'], ['kitchen', '厨房'], ['bath', '卫生间'], ['hall', '过道'], ['balcony', '阳台']].map(([k, n]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="stat"><div><b>${a.toFixed(2)}㎡</b><span>模型面积</span></div><div><b>${r.label ? r.label + '㎡' : '—'}</b><span>图纸标注</span></div></div>
      <h4 style="margin-top:14px">地面材质</h4>${sw('floor', r.floor, 'floor')}
      <button class="btn full" data-act="pano">🌐 进入这个房间的 720° 全景</button>
      <button class="btn full red" data-act="delroom">删除房间</button></div>`;
  } else if (s && s.wall) {
    const w = S.walls.find(x => x.id === s.wall); if (!w) return;
    h = `<div class="sec"><h4>墙体</h4><div class="stat"><div><b>${G.fmt(G.wallLen(w))}</b><span>长度 mm</span></div><div><b>${w.kind === 'outer' ? '外墙' : w.kind === 'rail' ? '栏杆' : '内墙'}</b><span>${w.kind === 'outer' ? '承重/外围护，别拆' : '类型'}</span></div></div>
      <div class="row"><label>厚度</label><input type="number" step="10" data-w="t" value="${w.t}"></div>
      <h4 style="margin-top:14px">墙面造型</h4>${sw('wall', S.wallFinish[w.id] || 'paint', 'wfin')}
      <button class="btn full red" data-act="demo">🔨 拆掉这面墙</button>
      ${w.kind === 'outer' ? '<p style="font-size:12px;color:#d97706;margin-top:8px">⚠ 外墙一般是承重墙或外围护墙，现实中不能拆。这里只是模拟。</p>' : ''}</div>`;
  } else if (s && s.op) {
    let w, o; for (const x of S.walls) for (const y of x.ops) if (y.id === s.op) { w = x; o = y; } if (!o) return;
    h = `<div class="sec"><h4>门窗</h4>
      <div class="row"><label>类型</label><select data-o="type">${[['door', '平开门'], ['entry', '入户门'], ['slide', '推拉门'], ['window', '窗'], ['bay', '飘窗']].map(([k, n]) => `<option value="${k}" ${o.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="row"><label>宽 mm</label><input type="number" step="10" data-o="w" value="${Math.round(o.w)}"></div>
      <div class="row"><label>高 mm</label><input type="number" step="10" data-o="h" value="${o.h}"></div>
      <div class="row"><label>离地 mm</label><input type="number" step="10" data-o="sill" value="${o.sill}"></div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="openop">${o.open > 0.5 ? '关上' : '打开'}</button><button class="btn" data-act="flip">↔ 换开向</button><button class="btn red" data-act="delop">删除</button></div></div>`;
  } else if (s && s.note) {
    const n = S.notes.find(x => x.id === s.note); if (!n) return;
    h = `<div class="sec"><h4>批注</h4><textarea id="noteText" rows="4" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit;background:#fffbea" placeholder="比如：这里想放钢琴 / 问中介这面墙能不能拆">${esc(n.text)}</textarea>
      <button class="btn full red" data-act="delnote">删除批注</button></div>`;
  } else if (t === 'opening') {
    h = `<div class="sec"><h4>门窗类型</h4><div class="chips">${[['door', '平开门'], ['slide', '推拉门'], ['window', '窗'], ['bay', '飘窗'], ['entry', '入户门']].map(([k, n]) => `<button data-optype="${k}" class="${P2.st.opType === k ? 'on' : ''}">${n}</button>`).join('')}</div><p class="empty" style="padding:10px 0;text-align:left">选好类型，点在墙上就放一个。放好以后可以沿墙拖动。</p></div>`;
  } else if (t === 'finish') {
    h = `<div class="sec"><h4>墙面造型</h4>${sw('wall', P2.st.finish, 'finpick')}<p class="empty" style="padding:10px 0;text-align:left">选材质，点墙贴上。电视背景墙试试「岩板」，卧室床头试试「格栅」。</p></div>`;
  } else if (t === 'wall') {
    h = `<div class="sec"><h4>画墙</h4><div class="row"><label>墙厚</label><select id="wallT"><option value="120">120 轻质隔墙</option><option value="240">240 砖墙</option><option value="80">80 玻璃隔断</option></select></div><p class="empty" style="padding:10px 0;text-align:left">${MOB ? '点一下定起点，再点下一个点。' : '点击定点，双击或右键结束。'}自动吸附已有墙的端点。</p>${P2.st.draft ? '<button class="btn pri full" data-act="finish">完成这段墙</button>' : ''}</div>`;
  } else if (t === 'room') {
    h = `<div class="sec"><h4>划分房间</h4><p class="empty" style="padding:10px 0;text-align:left">依次点出房间的每个角，点回第一个点闭合。</p>${P2.st.draft ? '<button class="btn pri full" data-act="finish">闭合房间</button>' : ''}</div>`;
  } else if (t === 'mep' || t === 'pipes') {
    const st = S.mepData ? mepStats(S.mepData) : { cnt: {}, len: {} };
    h = `<div class="sec"><h4>水电</h4><button class="btn pri full" data-act="automep">⚡ 按家具一键重新布置</button>
      <h4 style="margin-top:16px">手动添加点位</h4><div class="chips">${Object.entries(MEP_POINTS).filter(([k]) => !['panel', 'weakbox'].includes(k)).map(([k, d]) => `<button data-mept="${k}" class="${P2.st.mepType === k ? 'on' : ''}">${d.n}</button>`).join('')}</div>
      <div class="tog"><span>显示走线</span><i class="sw2 ${P2.st.layers.pipes ? 'on' : ''}" data-lay="pipes"></i></div>
      <div class="tog"><span>3D 里显示水电</span><i class="sw2 ${V3.st.mepOn ? 'on' : ''}" data-act="mep3d"></i></div>
      <h4 style="margin-top:16px">统计</h4>
      ${Object.entries(MEP_POINTS).filter(([k]) => st.cnt[k]).map(([k, d]) => `<div class="kv"><span>${d.n}</span><b>${st.cnt[k]} 个</b></div>`).join('')}
      ${Object.entries(MEP_KINDS).filter(([k]) => st.len[k]).map(([k, d]) => `<div class="kv"><span><i style="display:inline-block;width:14px;height:3px;background:${d.c};vertical-align:middle;margin-right:6px"></i>${d.n}</span><b>${(st.len[k] / 1000).toFixed(1)} m</b></div>`).join('')}
      <p style="font-size:11.5px;color:var(--sub);margin-top:10px">点位是按常见做法自动推的，走线是示意。真正施工以水电师傅现场放线为准。</p></div>`;
  } else if (t === 'measure') {
    h = `<div class="sec"><h4>测量</h4><p class="empty" style="padding:10px 0;text-align:left">点两下量距离。量过的都留在图上。</p><button class="btn full" data-act="clrmeasure">清除全部测量（${S.measures.length}）</button></div>`;
  } else if (t === 'demolish') {
    h = `<div class="sec"><h4>拆墙</h4><p class="empty" style="padding:10px 0;text-align:left">点一面墙就拆掉，3D 里会看到它塌下去。拆错了按撤销。<br><br>⚠ 黑色粗线是外墙，现实中一般是承重墙，不能拆。</p></div>`;
  } else if (t === 'note') {
    h = `<div class="sec"><h4>批注</h4><p class="empty" style="padding:10px 0;text-align:left">点在平面上留一条批注，3D 里也会浮起来。适合记「要问中介的事」。</p></div>`;
  } else {
    const net = S.rooms.reduce((s, r) => s + G.area(r.poly), 0) / 1e6;
    const L = P2.st.layers;
    h = `<div class="sec"><h4>这套房子</h4><div class="big">${net.toFixed(1)}㎡</div><div style="color:var(--sub);font-size:12px">套内净面积（12 个空间合计）</div>
      <div class="stat"><div><b>4 室</b><span>卧室 ABC + 套卫主卧</span></div><div><b>2 卫</b><span>主卫 + 公卫</span></div><div><b>2 阳台</b><span>南 11.7㎡ · 北 4.2㎡</span></div><div><b>南北通透</b><span>客厅朝南</span></div></div>
      <h4 style="margin-top:14px">图层</h4>
      ${[['furn', '家具'], ['labels', '房间名'], ['dims', '尺寸标注'], ['mep', '水电点位'], ['pipes', '管线']].map(([k, n]) => `<div class="tog"><span>${n}</span><i class="sw2 ${L[k] ? 'on' : ''}" data-lay="${k}"></i></div>`).join('')}
      <p style="font-size:12px;color:var(--sub);margin-top:14px;line-height:1.7">💡 点选家具、房间、墙、门窗都能改。分屏模式下拖左边的沙发，右边 3D 同步动。</p></div>`;
  }
  $('#propBody').innerHTML = h;
  const wt = $('#wallT'); if (wt) { wt.value = P2.st.wallT || 120; wt.onchange = () => P2.st.wallT = +wt.value; }
  const nt = $('#noteText'); if (nt) nt.oninput = () => { const n = S.notes.find(x => x.id === P2.st.sel.note); n.text = nt.value; P2.draw(); clearTimeout(nt._t); nt._t = setTimeout(() => commit('批注', true), 600); };
}
$('#propBody').addEventListener('input', e => {
  const el = e.target, s = P2.st.sel; if (!s) return;
  if (s.item && el.dataset.k) { const it = S.items.find(i => i.id === s.item); const k = el.dataset.k; if (k === 'opt') it.opt = el.value; else it[k] = Math.max(k === 'rot' ? 0 : 50, +el.value || 0); if (k === 'rot') { el.nextElementSibling.textContent = it.rot + '°'; V3.moveItem(it); P2.draw(); clearTimeout(el._t); el._t = setTimeout(() => commit('旋转'), 300); } else { P2.draw(); clearTimeout(el._t); el._t = setTimeout(() => commit('尺寸', true), 350); } }
  if (s.room && el.dataset.r) { const r = S.rooms.find(x => x.id === s.room); r[el.dataset.r] = el.value; P2.draw(); clearTimeout(el._t); el._t = setTimeout(() => commit('房间', true), 400); }
  if (s.wall && el.dataset.w) { const w = S.walls.find(x => x.id === s.wall); w.t = Math.max(40, +el.value || 120); P2.draw(); clearTimeout(el._t); el._t = setTimeout(() => commit('墙厚', true), 400); }
  if (s.op && el.dataset.o) { for (const w of S.walls) for (const o of w.ops) if (o.id === s.op) { const k = el.dataset.o; o[k] = k === 'type' ? el.value : Math.max(0, +el.value || 0); if (k === 'type') Object.assign(o, { h: OPENING_DEFAULTS[o.type].h, sill: OPENING_DEFAULTS[o.type].sill }); } P2.draw(); clearTimeout(el._t); el._t = setTimeout(() => commit('门窗', true), 350); }
});
$('#propBody').addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-floor],[data-wfin],[data-optype],[data-finpick],[data-mept],[data-lay]'); if (!b) return; const s = P2.st.sel;
  if (b.dataset.lay) { P2.st.layers[b.dataset.lay] = !P2.st.layers[b.dataset.lay]; if ((b.dataset.lay === 'mep' || b.dataset.lay === 'pipes') && !S.mepData) { S.mepData = autoMEP(S); commit('水电'); } P2.draw(); refreshProps(); return; }
  if (b.dataset.floor) { const r = S.rooms.find(x => x.id === s.room); r.floor = b.dataset.floor; r.floorLocked = true; commit('换地面', true); return; }
  if (b.dataset.wfin) { if (b.dataset.wfin === 'paint') delete S.wallFinish[s.wall]; else S.wallFinish[s.wall] = b.dataset.wfin; commit('墙面', true); return; }
  if (b.dataset.optype) { P2.st.opType = b.dataset.optype; refreshProps(); return; }
  if (b.dataset.finpick) { P2.st.finish = b.dataset.finpick; refreshProps(); return; }
  if (b.dataset.mept) { P2.st.mepType = b.dataset.mept; refreshProps(); return; }
  const a = b.dataset.act;
  if (a === 'del') { S.items = S.items.filter(i => i.id !== s.item); P2.st.sel = null; commit('删除', true); }
  if (a === 'dup') { const it = S.items.find(i => i.id === s.item); const n = { ...it, id: uid('i'), x: it.x + 300, y: it.y + 300 }; S.items.push(n); commit('复制', true); P2.select({ item: n.id }); }
  if (a === 'rot90') { const it = S.items.find(i => i.id === s.item); it.rot = (it.rot + 90) % 360; V3.moveItem(it); commit('旋转'); }
  if (a === 'delroom') { S.rooms = S.rooms.filter(r => r.id !== s.room); P2.st.sel = null; commit('删房间', true); }
  if (a === 'pano') enterPano(s.room);
  if (a === 'demo') { const w = S.walls.find(x => x.id === s.wall); S.walls = S.walls.filter(x => x !== w); P2.st.sel = null; commit('拆墙', true, { removedWall: w.id }); toast('墙拆了（可撤销）'); }
  if (a === 'openop' || a === 'flip' || a === 'delop') { for (const w of S.walls) for (const o of w.ops) if (o.id === s.op) { if (a === 'openop') { o.open = o.open > 0.5 ? 0 : 1; V3.animateOpen(o); P2.draw(); commit('开关'); refreshProps(); return; } if (a === 'flip') o.flip = !o.flip; if (a === 'delop') { w.ops = w.ops.filter(x => x !== o); P2.st.sel = null; } } commit('门窗', true); }
  if (a === 'delnote') { S.notes = S.notes.filter(n => n.id !== s.note); P2.st.sel = null; commit('删批注', true); }
  if (a === 'finish') P2.finishDraft();
  if (a === 'automep') { S.mepData = autoMEP(S); commit('水电', V3.st.mepOn); toast('已重新布置'); }
  if (a === 'mep3d') { V3.st.mepOn = !V3.st.mepOn; if (!S.mepData) S.mepData = autoMEP(S); V3.build(S); refreshProps(); }
  if (a === 'clrmeasure') { S.measures = []; commit('清除测量'); }
});

// —— 手机底部抽屉 ——
function openSheet(k) { closeFloat(); $('#lib').classList.toggle('open', k === 'lib' && !$('#lib').classList.contains('open')); $('#props').classList.toggle('open', k === 'props' && !$('#props').classList.contains('open')); if (k === 'lib') renderLib(); }
function closeSheets() { $('#lib').classList.remove('open'); $('#props').classList.remove('open'); }
$$('.sheet-h').forEach(h => h.onclick = closeSheets);

// —— 浮动面板 ——
let floatK = null;
function closeFloat() { $('#fp').classList.remove('show'); floatK = null; $$('[data-p]').forEach(b => b.classList.remove('on')); if (sunPlay) stopSunPlay(); }
function openFloat(k) {
  if (k === 'check') return showCheck();
  if (floatK === k) return closeFloat();
  closeSheets(); floatK = k; $$('[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === k));
  const fp = $('#fp'); fp.classList.add('show'); renderFloat();
}
$$('#top [data-p]').forEach(b => b.onclick = () => openFloat(b.dataset.p));
$('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
const H = (t, ic) => `<h3>${ic} ${t}<button class="x" data-x>✕</button></h3>`;
let sunRes = null, sunPlay = 0, patchOn = false, delAsk = null;
function renderFloat() {
  const fp = $('#fp'), k = floatK; let h = '';
  if (k === 'sun') {
    const ss = V3.sunState, s = SUN.pos(ss.city.lat, ss.city.lon, ss.m, ss.d, ss.hour), rs = SUN.riseSet(ss.city.lat, ss.city.lon, ss.m, ss.d);
    h = H('日照模拟', '☀️') + `<div class="row"><label>城市</label><select id="sCity">${SUN.cities.map((c, i) => `<option value="${i}" ${c === ss.city ? 'selected' : ''}>${c.n}（北纬 ${c.lat.toFixed(1)}°）</option>`).join('')}</select></div>
      <div class="chips">${[['冬至', 12, 21], ['大寒', 1, 20], ['春分', 3, 20], ['夏至', 6, 21], ['秋分', 9, 23], ['今天', new Date().getMonth() + 1, new Date().getDate()]].map(([n, m, d]) => `<button data-date="${m},${d}" class="${ss.m === m && ss.d === d ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="row"><label>月份</label><input type="range" id="sM" min="1" max="12" value="${ss.m}"><b style="width:42px;text-align:right">${ss.m}月${ss.d}日</b></div>
      <div class="row"><label>时间</label><input type="range" id="sH" min="5" max="20" step="0.05" value="${ss.hour}"><b style="width:42px;text-align:right">${SUN.hm(ss.hour)}</b></div>
      <div class="row"><label>正北偏</label><input type="range" id="sN" min="-90" max="90" value="${ss.north}"><b style="width:42px;text-align:right">${ss.north}°</b></div>
      <div class="stat"><div><b>${SUN.dir8(s.az)} ${s.az.toFixed(0)}°</b><span>太阳方位</span></div><div><b>${s.alt.toFixed(1)}°</b><span>太阳高度</span></div><div><b>${SUN.hm(rs.rise)}</b><span>日出</span></div><div><b>${SUN.hm(rs.set)}</b><span>日落</span></div></div>
      <div class="tog"><span>夜晚自动开灯</span><i class="sw2 ${V3.st.lightsAuto ? 'on' : ''}" data-sa="auto"></i></div>
      <div class="tog"><span>平面图显示光斑</span><i class="sw2 ${patchOn ? 'on' : ''}" data-sa="patch"></i></div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" style="flex:1" data-sa="play">${sunPlay ? '⏸ 暂停' : '▶ 日照演示（日出→日落）'}</button></div>
      <button class="btn full" data-sa="heat">🔥 冬至日照分析（每间房晒几小时）</button>
      ${sunRes ? sunReport() : ''}`;
  } else if (k === 'style') {
    h = H('一键换风格', '🎨') + Object.entries(STYLES).map(([k2, st]) => `<button class="style-card ${S.style === k2 ? 'on' : ''}" data-style="${k2}"><div class="pal">${[st.wall, st.fabric, st.wood, st.accent].map(c => `<i style="background:${c}"></i>`).join('')}<i style="background-image:url(${matThumb(st.floors.living)});background-size:cover"></i></div><div><b>${st.n}</b><small>${st.d}</small></div></button>`).join('') +
      `<p style="font-size:12px;color:var(--sub)">换风格会改地面、墙色、家具配色。手动换过地面的房间不会被覆盖。</p>`;
  } else if (k === 'smart') {
    h = H('智能中控', '🏠') + `<div class="scenes">${[['home', '🏡', '回家'], ['movie', '🎬', '观影'], ['sleep', '🌙', '睡眠'], ['morning', '🌅', '清晨']].map(([k2, i, n]) => `<button data-scene="${k2}"><b>${i}</b>${n}</button>`).join('')}</div>
      <div class="tog"><span>💡 全屋灯光</span><span><button class="btn" data-sm="allon">全开</button> <button class="btn" data-sm="alloff">全关</button></span></div>
      ${S.rooms.map(r => { const L = V3.roomLights.find(l => l.userData.room === r.id); const on = L && L.intensity > 0; return `<div class="tog"><span>${esc(r.name)}</span><i class="sw2 ${on ? 'on' : ''}" data-light="${r.id}"></i></div>`; }).join('')}
      <div class="tog"><span>📺 电视</span><i class="sw2 ${V3.st.tvOn ? 'on' : ''}" data-sm="tv"></i></div>
      <div class="tog"><span>🚪 全部门</span><span><button class="btn" data-sm="dooron">全开</button> <button class="btn" data-sm="dooroff">全关</button></span></div>
      <p style="font-size:12px;color:var(--sub)">灯在白天也能开，但晚上看最有感觉：试试「观影」。</p>`;
  } else if (k === 'save') {
    const list = slotsLoad();
    h = H('方案存档', '💾') + `<p style="font-size:12px;color:var(--sub);margin:-4px 0 8px">最多存 ${SLOT_MAX} 个方案，随时读回来对比。名字点一下就能改。</p>
      <button class="btn pri full" data-slot-new ${list.length >= SLOT_MAX ? 'disabled style="opacity:.45"' : ''}>＋ 把当前方案存成新存档（${list.length}/${SLOT_MAX}）</button>
      ${list.map((x, i) => `<div class="slot">${x.thumb ? `<img src="${x.thumb}">` : '<div class="ph"></div>'}<div class="meta"><input data-slotname="${x.id}" value="${esc(x.name)}" maxlength="16"><small>${fmtTime(x.time)} · ${STYLES[x.style]?.n || ''}</small>
        <div class="ops"><button class="pri" data-slot-load="${x.id}">读取</button><button data-slot-over="${x.id}">覆盖</button><button class="red" data-slot-del="${x.id}">${delAsk === x.id ? '确定删？' : '删除'}</button></div></div></div>`).join('') || '<p class="empty">还没有存档。改出一个满意的样子，就点上面存起来。</p>'}
      <div style="border-top:1px solid var(--line);margin-top:12px;padding-top:10px;font-size:12px;color:var(--sub);line-height:1.7">读取存档以后，按「撤销」能回到读取之前的样子。<br>想回到最开始：「⋯ 更多 → 恢复初始方案」。<br>存档存在这台手机/电脑的浏览器里，清缓存会清掉。</div>`;
  } else if (k === 'shot') {
    h = H('出图', '📷') + `<button class="style-card" data-shot="3d"><div style="font-size:26px">🖼</div><div><b>3D 效果图 · ${V3.MOBILE ? '1920×1080' : '2560×1440'}</b><small>按当前视角、当前时间的光照出一张高清图</small></div></button>
      <button class="style-card" data-shot="plan"><div style="font-size:26px">📐</div><div><b>彩色平面图</b><small>带尺寸、面积、家具的平面方案图</small></div></button>
      <button class="style-card" data-shot="pano"><div style="font-size:26px">🌐</div><div><b>720° 全景</b><small>站在房间中间转一圈看，手机可以用体感</small></div></button>`;
  } else if (k === 'menu') {
    h = H('更多', '⋯') + `<button class="style-card" data-menu="export"><div style="font-size:22px">💾</div><div><b>导出方案文件</b><small>存成 .json，发给别人或下次导入</small></div></button>
      <button class="style-card" data-menu="import"><div style="font-size:22px">📂</div><div><b>导入方案文件</b><small>打开之前导出的方案</small></div></button>
      ${PLAN_IMG ? '' : '<!--'}<button class="style-card" data-menu="ref"><div style="font-size:22px">🖼</div><div><b>原图对照</b><small>把原户型图叠在平面上，核对位置</small></div></button>${PLAN_IMG ? '' : '-->'}
      <button class="style-card" data-menu="reset"><div style="font-size:22px">↺</div><div><b>恢复初始方案</b><small>回到刚识别出来的样子（可撤销）</small></div></button>
      <button class="style-card" data-menu="help"><div style="font-size:22px">❓</div><div><b>怎么用</b><small>每个按钮是干什么的</small></div></button>
      <input type="file" id="fileIn" accept=".json,application/json" style="display:none">`;
  }
  fp.innerHTML = h;
}
function sunReport() {
  const rs = [...sunRes.rooms].sort((a, b) => b.avg - a.avg); const max = Math.max(1, ...rs.map(r => r.avg));
  return `<div style="margin-top:14px"><b style="font-size:13px">${sunRes.label}（${sunRes.from}:00–${sunRes.to}:00）平均直射时长</b>
    <div class="legend"></div><div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--sub)"><span>0h</span><span>2h</span><span>4h</span><span>6h+</span></div>
    <div class="bars">${rs.map(r => `<div><span>${esc(r.name)}</span><i style="width:${Math.max(2, r.avg / max * 100) * 0.62}%"></i><em>${r.avg.toFixed(1)}h</em></div>`).join('')}</div>
    <p style="font-size:11.5px;color:var(--sub);line-height:1.6;margin-top:8px">按窗洞和墙体计算的直射阳光，没算楼间距、对面楼和所在楼层的遮挡。低楼层、楼间距小的话实际会更少，看房时最好冬天下午去现场确认。</p>
    <button class="btn full" data-sa="clearheat">清除热力图</button></div>`;
}
$('#fp').addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.slotname; if (!id) return; const list = slotsLoad(), x = list.find(x => x.id === id); if (x) { x.name = e.target.value.trim() || x.name; slotsSave(list); toast('已改名'); } });
$('#fp').addEventListener('input', e => {
  const id = e.target.id, ss = V3.sunState;
  if (id === 'sCity') V3.setSun({ city: SUN.cities[+e.target.value] });
  if (id === 'sM') { V3.setSun({ m: +e.target.value, d: Math.min(ss.d, 28) }); }
  if (id === 'sH') V3.setSun({ hour: +e.target.value });
  if (id === 'sN') { V3.setSun({ north: +e.target.value }); P2.draw(); }
  updatePatches(); updateSunReadout();
});
function updateSunReadout() {
  if (floatK !== 'sun') return; const ss = V3.sunState, s = SUN.pos(ss.city.lat, ss.city.lon, ss.m, ss.d, ss.hour), rs = SUN.riseSet(ss.city.lat, ss.city.lon, ss.m, ss.d);
  const bs = $$('#fp .row b'); if (bs[0]) bs[0].textContent = ss.m + '月' + ss.d + '日'; if (bs[1]) bs[1].textContent = SUN.hm(ss.hour); if (bs[2]) bs[2].textContent = ss.north + '°';
  const st = $$('#fp .stat b'); if (st.length >= 4) { st[0].textContent = SUN.dir8(s.az) + ' ' + s.az.toFixed(0) + '°'; st[1].textContent = s.alt.toFixed(1) + '°'; st[2].textContent = SUN.hm(rs.rise); st[3].textContent = SUN.hm(rs.set); }
  const h = $('#sH'); if (h && document.activeElement !== h) h.value = ss.hour;
}
function updatePatches() {
  if (!patchOn) { P2.st.patches = null; P2.draw(); return; }
  const ss = V3.sunState; P2.st.patches = SUNLIGHT.patches(S, SUN.pos(ss.city.lat, ss.city.lon, ss.m, ss.d, ss.hour), ss.north); P2.draw();
}
function stopSunPlay() { cancelAnimationFrame(sunPlay); sunPlay = 0; V3.st.sunPlay = false; }
$('#fp').addEventListener('click', e => {
  const b = e.target.closest('button,[data-sa],[data-light],[data-sm]'); if (!b || b.disabled) return;
  if (b.dataset.x !== undefined) return closeFloat();
  if (b.hasAttribute('data-slot-new')) {
    const list = slotsLoad(); if (list.length >= SLOT_MAX) return toast(`最多 ${SLOT_MAX} 个，先删掉或覆盖一个`);
    const used = new Set(list.map(x => x.name)); let n = list.length + 1; while (used.has('方案 ' + n)) n++;
    list.push({ id: uid('s'), name: '方案 ' + n, time: Date.now(), style: S.style, thumb: slotThumb(), data: JSON.stringify(S) });
    if (slotsSave(list)) { toast('已存为「方案 ' + n + '」'); renderFloat(); } return;
  }
  if (b.dataset.slotLoad) { const x = slotsLoad().find(x => x.id === b.dataset.slotLoad); if (!x) return; S = JSON.parse(x.data); P2.setState(S); P2.st.sel = null; commit('读取存档', true); P2.fit(); toast('已读取「' + x.name + '」，按撤销可以回去'); return; }
  if (b.dataset.slotOver) { const list = slotsLoad(), x = list.find(x => x.id === b.dataset.slotOver); if (!x) return; Object.assign(x, { time: Date.now(), style: S.style, thumb: slotThumb(), data: JSON.stringify(S) }); if (slotsSave(list)) { toast('已用当前方案覆盖「' + x.name + '」'); renderFloat(); } return; }
  if (b.dataset.slotDel) { const id = b.dataset.slotDel; if (delAsk !== id) { delAsk = id; renderFloat(); setTimeout(() => { if (delAsk === id) { delAsk = null; if (floatK === 'save') renderFloat(); } }, 3000); return; } delAsk = null; slotsSave(slotsLoad().filter(x => x.id !== id)); toast('存档已删除'); renderFloat(); return; }
  if (b.dataset.date) { const [m, d] = b.dataset.date.split(',').map(Number); V3.setSun({ m, d }); renderFloat(); updatePatches(); }
  const sa = b.dataset.sa;
  if (sa === 'auto') { V3.st.lightsAuto = !V3.st.lightsAuto; V3.updateLights(); renderFloat(); }
  if (sa === 'patch') { patchOn = !patchOn; if (patchOn && mode === '3d') setMode('split'); updatePatches(); renderFloat(); }
  if (sa === 'play') {
    if (sunPlay) { stopSunPlay(); renderFloat(); return; }
    const ss = V3.sunState, rs = SUN.riseSet(ss.city.lat, ss.city.lon, ss.m, ss.d); let h = Math.max(rs.rise - 0.4, ss.hour < rs.set - 0.2 && ss.hour > rs.rise ? ss.hour : rs.rise - 0.4); let lt = performance.now(), lp = 0;
    V3.st.sunPlay = true;
    const step = t => { h += (t - lt) / 1000 * 1.1; lt = t; if (h > rs.set + 0.6) { stopSunPlay(); renderFloat(); return; } V3.setSun({ hour: h }); if (t - lp > 120) { lp = t; updatePatches(); updateSunReadout(); } sunPlay = requestAnimationFrame(step); };
    sunPlay = requestAnimationFrame(step); renderFloat();
  }
  if (sa === 'heat') {
    b.textContent = '计算中…';
    setTimeout(() => {
      const ss = V3.sunState; sunRes = SUNLIGHT.hours(S, ss.city, 12, 21, ss.north, 8, 16, 300); sunRes.label = ss.city.n + ' 冬至日';
      P2.st.layers.heat = sunRes; V3.paintSunCells(sunRes); V3.setSun({ m: 12, d: 21, hour: 12 }); P2.draw(); renderFloat();
      const best = [...sunRes.rooms].filter(r => !/阳台/.test(r.name)).sort((a, b) => b.avg - a.avg)[0]; toast(`冬至日室内晒得最久的是「${best.name}」，平均 ${best.avg.toFixed(1)} 小时`);
    }, 30);
  }
  if (sa === 'clearheat') { sunRes = null; P2.st.layers.heat = null; V3.paintSunCells(null); P2.draw(); renderFloat(); }
  if (b.dataset.style) { S.style = b.dataset.style; applyStyleFloors(S, S.style); commit('换风格', true); renderFloat(); if ($('#lib').offsetParent || !MOB) renderLib(); toast('已切换为「' + STYLES[S.style].n + '」'); }
  if (b.dataset.light) { const L = V3.roomLights.find(l => l.userData.room === b.dataset.light); V3.setRoomLight(b.dataset.light, !(L && L.intensity > 0)); renderFloat(); }
  const sm = b.dataset.sm;
  if (sm === 'allon' || sm === 'alloff') { V3.allLights(sm === 'allon'); renderFloat(); }
  if (sm === 'tv') { V3.tv(!V3.st.tvOn); renderFloat(); }
  if (sm === 'dooron' || sm === 'dooroff') { for (const w of S.walls) for (const o of w.ops) if (['door', 'slide', 'entry'].includes(o.type) && (o.open > 0.5) !== (sm === 'dooron')) { o.open = sm === 'dooron' ? 1 : 0; V3.animateOpen(o); } P2.draw(); }
  if (b.dataset.scene) scene(b.dataset.scene);
  if (b.dataset.shot) shot(b.dataset.shot);
  if (b.dataset.menu) menu(b.dataset.menu);
});
function scene(k) {
  const lr = S.rooms.find(r => r.kind === 'living');
  if (k === 'home') { V3.setSun({ hour: 19.5 }); V3.allLights(true); V3.tv(false); toast('回家模式：傍晚，全屋亮灯'); }
  if (k === 'movie') { V3.setSun({ hour: 21 }); V3.allLights(false); V3.tv(true); toast('观影模式：关灯，开电视'); }
  if (k === 'sleep') { V3.setSun({ hour: 23.5 > 20 ? 20 : 23 }); V3.setSun({ hour: 20 }); V3.allLights(false); V3.tv(false); S.rooms.filter(r => r.kind === 'bed').forEach(r => V3.setRoomLight(r.id, false)); toast('睡眠模式：全屋熄灯，晚安'); }
  if (k === 'morning') { V3.setSun({ hour: 7.2 }); for (const id in V3.lightOverride) delete V3.lightOverride[id]; V3.updateLights(); V3.tv(false); toast('清晨模式：阳光从东边照进来'); }
  renderFloat();
}

// —— 出图 ——
function showImage(url, title, fname) {
  $('#mbox').innerHTML = `<h3 style="margin:0 0 12px;display:flex;align-items:center">${title}<button class="x btn" style="margin-left:auto" data-close>✕</button></h3><img src="${url}"><div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap"><a class="btn pri" href="${url}" download="${fname}">⬇ 下载</a><span style="font-size:12px;color:var(--sub)">手机上长按图片保存到相册</span></div>`;
  $('#modal').classList.add('show');
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').classList.remove('show'); });
function shot(k) {
  closeFloat();
  if (k === '3d') { if (mode !== '3d' && mode !== 'split') setMode('3d'); setTimeout(() => { const url = V3.MOBILE ? V3.snapshot(1920, 1080) : V3.snapshot(2560, 1440); showImage(url, '3D 效果图', '安家Lab-效果图.jpg'); }, 80); }
  if (k === 'plan') { const url = P2.exportImage(2400, 1800); showImage(url, '彩色平面图', '安家Lab-平面图.png'); }
  if (k === 'pano') enterPano();
}

// —— 全景 ——
let panoIdx = 0;
function enterPano(roomId) {
  if (mode === 'walk') setMode('3d'); if (mode === '2d') setMode('3d');
  const rooms = S.rooms.filter(r => r.kind !== 'hall'); panoIdx = Math.max(0, rooms.findIndex(r => r.id === roomId)); if (!roomId) panoIdx = rooms.findIndex(r => r.kind === 'living');
  document.body.classList.add('mpano'); $('#pName').textContent = V3.enterPano(rooms[panoIdx].id); closeSheets(); toast('拖动环顾四周 · 滚轮/双指缩放');
}
function exitPano() { document.body.classList.remove('mpano'); V3.exitPano(); $('#pGyro').classList.remove('on'); }
const panoGo = d => { const rooms = S.rooms.filter(r => r.kind !== 'hall'); panoIdx = (panoIdx + d + rooms.length) % rooms.length; $('#pName').textContent = V3.enterPano(rooms[panoIdx].id); };
$('#pPrev').onclick = () => panoGo(-1); $('#pNext').onclick = () => panoGo(1); $('#pExit').onclick = exitPano;
$('#pSave').onclick = () => { toast('正在生成全景图…'); setTimeout(() => showImage(V3.panoImage(), '720° 全景图（可导入全景播放器）', '安家Lab-全景.jpg'), 50); };
$('#pGyro').onclick = async () => { const on = await V3.toggleGyro(); $('#pGyro').textContent = on ? '📱 体感中' : '📱 体感'; toast(on ? '转动手机看四周' : '已关闭体感'); };

// —— 更多 ——
function menu(k) {
  if (k === 'export') { const blob = new Blob([JSON.stringify(S)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '安家Lab-方案.json'; a.click(); toast('已导出方案文件'); }
  if (k === 'import') { const f = $('#fileIn'); f.onchange = () => { const file = f.files[0]; if (!file) return; file.text().then(t => { try { const s = JSON.parse(t); if (!s.walls) throw 0; S = s; P2.setState(S); commit('导入', true); P2.fit(); toast('方案已导入'); closeFloat(); } catch (e) { toast('这个文件不是安家 Lab 的方案'); } }); }; f.click(); }
  if (k === 'ref') toggleRef();
  if (k === 'reset') { S = fresh(); P2.setState(S); P2.st.sel = null; commit('恢复初始', true, { intro: true }); P2.fit(); closeFloat(); toast('已恢复初始方案（可撤销）'); }
  if (k === 'help') { closeFloat(); showHelp(); }
}
function showHelp() {
  $('#mbox').innerHTML = `<h3 style="margin:0 0 10px;display:flex">怎么用<button class="btn" style="margin-left:auto" data-close>✕</button></h3>
  <table><tr><th>模式</th><th></th></tr>
  <tr><td>平面</td><td>编辑户型：选择、画墙、房间、门窗、水电、管线、造型、批注、测量、拆墙</td></tr>
  <tr><td>分屏</td><td>左边平面右边 3D，拖左边的家具，右边同步动</td></tr>
  <tr><td>3D</td><td>拖动旋转，${MOB ? '双指缩放平移' : '滚轮缩放，右键平移'}，点门可以开关，点家具选中后可以直接拖</td></tr>
  <tr><td>漫游</td><td>变成一只小黑足猫（或小人）在屋里走，能跳上沙发和床，靠近门按「开门」</td></tr>
  <tr><th>按钮</th><th></th></tr>
  <tr><td>☀️ 日照</td><td>选城市、日期、时间看阳光怎么照进来；「冬至日照分析」算每间房冬天能晒几小时</td></tr>
  <tr><td>🎨 风格</td><td>一键切换奶油风、原木、极简、轻奢、新中式、侘寂</td></tr>
  <tr><td>🏠 中控</td><td>开关每个房间的灯、电视、所有门，有回家/观影/睡眠/清晨四个场景</td></tr>
  <tr><td>📷 出图</td><td>高清效果图、彩色平面图、720° 全景</td></tr>
  <tr><td>✅ 自查</td><td>检查墙体有没有悬空、房间面积和原图标注差多少</td></tr></table>
  <p style="font-size:12px;color:var(--sub);margin-top:12px">方案自动保存在这台设备的浏览器里。换手机或想发给别人，用「更多 → 导出方案文件」。</p>`;
  $('#modal').classList.add('show');
}
let refImg = null;
function toggleRef() {
  P2.st.ref = !P2.st.ref; if (P2.st.ref && !refImg) { refImg = new Image(); refImg.onload = () => P2.draw(); refImg.src = PLAN_IMG; P2.st.refImg = refImg; }
  P2.st.refImg = refImg; P2.draw(); if (P2.st.ref && mode === '3d') setMode('split'); toast(P2.st.ref ? '原图已叠上（半透明），再点一次取消' : '已取消原图对照');
}
$('#ref2').onclick = toggleRef; if (!PLAN_IMG) $('#ref2').remove(); $('#fit2').onclick = () => P2.fit();
$$('#v3d [data-v]').forEach(b => b.onclick = () => V3.frame(b.dataset.v));
$('#bLbl').onclick = () => { V3.st.labels = V3.st.labels === false; V3.redraw(); };
$('#bPath').onclick = () => { V3.st.showSunPath = !V3.st.showSunPath; V3.updateSun(); };

// —— 自查 ——
function showCheck() {
  closeFloat();
  const walls = S.walls, ops = walls.reduce((s, w) => s + w.ops.length, 0);
  const dangling = []; for (const w of walls) for (const e of [w.a, w.b]) { const ok = walls.some(o => o !== w && G.distSeg(e, o.a, o.b) < Math.max(o.t, w.t)); if (!ok) dangling.push({ w, e }); }
  const opBad = []; for (const w of walls) { const L = G.wallLen(w); for (const o of w.ops) if (o.pos - o.w / 2 < -5 || o.pos + o.w / 2 > L + 5) opBad.push(o); }
  const rows = S.rooms.map(r => { const a = G.area(r.poly) / 1e6; const diff = r.label ? a - r.label : null; const ok = diff === null || Math.abs(diff) <= Math.max(0.6, r.label * 0.08); return { r, a, diff, ok }; });
  const net = rows.reduce((s, x) => s + x.a, 0), lab = S.rooms.reduce((s, r) => s + (r.label || 0), 0);
  const allPts = walls.filter(w => w.kind === 'outer').flatMap(w => [w.a, w.b]); const bb = G.bbox(allPts);
  const okN = rows.filter(x => x.ok).length;
  $('#mbox').innerHTML = `<h3 style="margin:0 0 6px;display:flex;align-items:center">✅ 户型自查报告<button class="btn" style="margin-left:auto" data-close>✕</button></h3>
  <p style="color:var(--sub);font-size:13px;margin:0 0 14px">墙体是从原图上一个像素一个像素扫出来的，比例用图上标的「阳台B 宽 3048mm」校准，再拿 12 个房间的标注面积逐个反算核对。</p>
  <div class="stat" style="grid-template-columns:repeat(4,1fr)"><div><b>${walls.length}</b><span>段墙体</span></div><div><b>${ops}</b><span>处门窗</span></div><div><b>${S.rooms.length}</b><span>个空间</span></div><div><b>${S.items.length}</b><span>件家具</span></div></div>
  <table style="margin:10px 0"><tr><th>检查项</th><th>结果</th></tr>
  <tr><td>悬空墙（端点没接上任何墙）</td><td class="${dangling.length ? 'warn' : 'ok'}">${dangling.length ? dangling.length + ' 处' : '✓ 无'}</td></tr>
  <tr><td>门窗超出墙体</td><td class="${opBad.length ? 'warn' : 'ok'}">${opBad.length ? opBad.length + ' 处' : '✓ 无'}</td></tr>
  <tr><td>房间面积与图纸标注</td><td class="${okN === rows.length ? 'ok' : 'warn'}">${okN}/${rows.length} 间吻合</td></tr>
  <tr><td>外轮廓（模型）</td><td>${G.fmt(bb.x1 - bb.x0)} × ${G.fmt(bb.y1 - bb.y0)} mm</td></tr></table>
  <table><tr><th>空间</th><th>模型</th><th>图纸</th><th>差</th></tr>
  ${rows.map(x => `<tr><td>${esc(x.r.name)}</td><td>${x.a.toFixed(2)}㎡</td><td>${x.r.label ? x.r.label + '㎡' : '—'}</td><td class="${x.ok ? 'ok' : 'warn'}">${x.diff === null ? '' : (x.diff >= 0 ? '+' : '') + x.diff.toFixed(2)}</td></tr>`).join('')}
  <tr><td><b>合计</b></td><td><b>${net.toFixed(2)}㎡</b></td><td><b>${lab.toFixed(1)}㎡</b></td><td>${(net - lab >= 0 ? '+' : '') + (net - lab).toFixed(2)}</td></tr></table>
  <p style="font-size:12px;color:var(--sub);line-height:1.7;margin-top:12px">说明：原图四边的尺寸链彼此有出入（比如顶部合计 10,128、底部 10,815，左边 11,823、右边 11,247），这在中介户型图里很常见，图形本身也不是严格按比例画的。所以这里以图形比例 + 房间面积为准，单个房间误差在几十厘米量级。真要定家具尺寸，以现场实测为准。</p>`;
  $('#modal').classList.add('show');
}

// —— 漫游操控 ——
const keys = V3.walk.keys;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (mode === 'walk') {
    keys[e.code] = true;
    if (e.code === 'KeyE') { const m = V3.interact(); if (m) toast(m); }
    if (e.code === 'KeyV') toggleView();
    if (e.code === 'Escape') setMode('3d');
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  if (mod && e.code === 'KeyY') { e.preventDefault(); redo(); }
  if (e.code === 'Escape') { if (P2.st.draft) P2.finishDraft(); else if (document.body.classList.contains('mpano')) exitPano(); else { P2.select(null); setTool('select'); } $('#modal').classList.remove('show'); }
  if ((e.code === 'Delete' || e.code === 'Backspace') && P2.st.sel) { const s = P2.st.sel; if (s.item) { S.items = S.items.filter(i => i.id !== s.item); P2.st.sel = null; commit('删除', true); } if (s.note) { S.notes = S.notes.filter(n => n.id !== s.note); P2.st.sel = null; commit('删除', true); } }
  if (e.code === 'KeyR' && P2.st.sel && P2.st.sel.item) { const it = S.items.find(i => i.id === P2.st.sel.item); it.rot = (it.rot + 90) % 360; V3.moveItem(it); commit('旋转'); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function toggleView() { V3.walk.fp = !V3.walk.fp; $('#wView').classList.toggle('on', V3.walk.fp); $('#wView').textContent = V3.walk.fp ? '👁 第三人称' : '👁 第一人称'; }
$('#wExit').onclick = () => setMode('3d'); $('#wView').onclick = toggleView;
$('#wCat').onclick = () => { V3.enterWalk('cat'); $('#wCat').classList.add('on'); $('#wMan').classList.remove('on'); };
$('#wMan').onclick = () => { V3.enterWalk('man'); $('#wMan').classList.add('on'); $('#wCat').classList.remove('on'); };
$('#wJump').addEventListener('pointerdown', e => { e.preventDefault(); keys.Space = true; setTimeout(() => keys.Space = false, 150); });
$('#wAct').onclick = () => { const m = V3.interact(); if (m) toast(m); };
// 桌面：拖动鼠标转视角
(() => {
  const cv = V3.renderer.domElement; let last = null;
  cv.addEventListener('pointerdown', e => { if (mode !== 'walk' || MOB) return; last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (mode !== 'walk' || !last) return; V3.walk.yaw -= (e.clientX - last[0]) * 0.005; V3.walk.pitch = Math.max(-1.2, Math.min(1.0, V3.walk.pitch - (e.clientY - last[1]) * 0.004)); last = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', () => last = null);
  // 手机：左边摇杆，右边看
  const joy = $('#joy'), jk = $('#joyk'); let jo = null, jid = null;
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); const r = joy.getBoundingClientRect(); jo = [e.clientX, e.clientY]; jk.style.display = 'block'; jk.style.left = (e.clientX - r.left - 60) + 'px'; jk.style.top = (e.clientY - r.top - 60) + 'px'; jk.firstElementChild.style.transform = ''; });
  joy.addEventListener('pointermove', e => { if (e.pointerId !== jid || !jo) return; let dx = e.clientX - jo[0], dy = e.clientY - jo[1]; const L = Math.hypot(dx, dy), m = 50; if (L > m) { dx *= m / L; dy *= m / L; } jk.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; V3.walk.joy = { x: dx / m, y: dy / m }; });
  const jend = e => { if (e.pointerId !== jid) return; jo = null; V3.walk.joy = null; jk.style.display = 'none'; };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
  const look = $('#look'); let ll = null, lid = null;
  look.addEventListener('pointerdown', e => { lid = e.pointerId; look.setPointerCapture(lid); ll = [e.clientX, e.clientY]; });
  look.addEventListener('pointermove', e => { if (e.pointerId !== lid || !ll) return; V3.walk.yaw -= (e.clientX - ll[0]) * 0.007; V3.walk.pitch = Math.max(-1.2, Math.min(1.0, V3.walk.pitch - (e.clientY - ll[1]) * 0.005)); ll = [e.clientX, e.clientY]; });
  look.addEventListener('pointerup', () => ll = null); look.addEventListener('pointercancel', () => ll = null);
})();

// —— 开场 ——
function intro() {
  const box = $('#intro'), img = $('#introImg'), cv = $('#introCv'), steps = $('#steps');
  if (PLAN_IMG) img.src = PLAN_IMG;
  const wallsN = S.walls.length, opsN = S.walls.reduce((s, w) => s + w.ops.length, 0);
  const list = [['读取户型图', '1440 × 1080'], ['识别尺寸标注', '22 处'], ['提取墙体', wallsN + ' 段'], ['识别门窗', opsN + ' 处'], ['划分空间 · 面积自查', S.rooms.length + ' 间 ✓'], ['生成 3D 模型 · 布置家具', S.items.length + ' 件']];
  steps.innerHTML = list.map(([a, b]) => `<div><span>◆</span><b>${a}</b><em>${b}</em></div>`).join('');
  let done = false;
  const finish = () => { if (done) return; done = true; box.classList.add('hide'); setTimeout(() => box.remove(), 900); V3.build(S, { intro: true }); setTimeout(() => P2.fit(), 50); setTimeout(() => toast(MOB ? '单指旋转 · 双指缩放 · 底部有更多功能' : '拖动旋转 · 滚轮缩放 · 点「漫游」进屋走走'), 2600); };
  $('#skip').onclick = finish;
  const ctx = cv.getContext('2d'); const t0 = performance.now();
  const drawWalls = k => {
    const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; const s = cv.width / 1440;
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.lineCap = 'round';
    if (!PLAN_IMG) drawBase(s);
    const n = Math.floor(S.walls.length * Math.min(1, k));
    S.walls.slice(0, n).forEach((w, i) => {
      const a = [(w.a[0] / PX + OX) * s, (w.a[1] / PX + OY) * s], b = [(w.b[0] / PX + OX) * s, (w.b[1] / PX + OY) * s];
      ctx.strokeStyle = w.kind === 'outer' ? '#7fb2ff' : w.kind === 'rail' ? '#9ae6c8' : '#c4a5ff'; ctx.lineWidth = (w.kind === 'outer' ? 7 : 4) * s * 1.6; ctx.shadowColor = '#6e8bff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    });
    if (k > 1.2) { ctx.shadowBlur = 0; S.rooms.forEach(rm => { ctx.fillStyle = 'rgba(120,150,255,.16)'; ctx.beginPath(); rm.poly.forEach((p, i) => { const q = [(p[0] / PX + OX) * s, (p[1] / PX + OY) * s]; i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.fill(); }); }
  };
  // 公开版没有原图：先画一张线稿户型图当底
  const drawBase = s => {
    const q = p => [(p[0] / PX + OX) * s, (p[1] / PX + OY) * s];
    ctx.fillStyle = '#f5f2ec'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (const rm of S.rooms) { ctx.fillStyle = { bath: '#e3e6ea', kitchen: '#e3e6ea', balcony: '#efe8dc', hall: '#efe5d3' }[rm.kind] || '#e9d9bf'; ctx.beginPath(); rm.poly.forEach((p, i) => i ? ctx.lineTo(...q(p)) : ctx.moveTo(...q(p))); ctx.fill(); }
    ctx.strokeStyle = '#2b2f36'; ctx.shadowBlur = 0;
    for (const w of S.walls) { ctx.lineWidth = (w.kind === 'rail' ? 2 : w.t / PX) * s; ctx.setLineDash(w.kind === 'rail' ? [8 * s, 6 * s] : []); ctx.beginPath(); ctx.moveTo(...q(w.a)); ctx.lineTo(...q(w.b)); ctx.stroke(); }
    ctx.setLineDash([]); ctx.fillStyle = '#4a4f59'; ctx.textAlign = 'center'; ctx.font = `${22 * s}px -apple-system,PingFang SC,sans-serif`;
    for (const rm of S.rooms) { const c = q(G.labelPoint(rm.poly)); ctx.fillText(rm.name, c[0], c[1]); ctx.font = `${17 * s}px -apple-system,sans-serif`; ctx.fillText((rm.label || '') + '㎡', c[0], c[1] + 22 * s); ctx.font = `${22 * s}px -apple-system,PingFang SC,sans-serif`; }
  };
  if (!PLAN_IMG) img.style.display = 'none';
  const tick = t => {
    if (done) return; const e = (t - t0) / 1000;
    const on = Math.min(list.length, Math.floor(e / 0.55) + 1); [...steps.children].forEach((d, i) => d.classList.toggle('on', i < on));
    if (e > 1.2 || !PLAN_IMG) drawWalls(Math.max(0, (e - 1.2) / 1.4));
    if (e > 4.0) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 启动
renderTools(); renderLib(); refreshProps();
setMode(MOB ? '3d' : 'split');
intro();
