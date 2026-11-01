// 3D 视图：场景构建、轨道相机、日照、灯光、拾取拖拽、漫游、全景、出图
const V3 = (() => {
  const mm = v => v / 1000;
  let renderer, scene, camera, root, el, labelsEl, dirty = true, W = 1, H = 1;
  let sun, hemi, sunPath, ground, sky;
  const MOBILE = matchMedia('(pointer:coarse)').matches || innerWidth < 820;
  const st = { mode: 'orbit', intro: 0, night: 0, lightsAuto: true };
  const wallObjs = new Map(), itemObjs = new Map(), opObjs = new Map(), roomLights = [], lampMeshes = [], ceilings = [];
  let wallMeshesForRay = [];
  let S = null; // 当前 state 引用

  // —— 材质工厂 ——
  const M = {
    _c: {}, pal: null,
    mat(color, rough = 0.7, metal = 0) { const k = color + rough + metal; return this._c[k] || (this._c[k] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })); },
    box: null, sphere: null, _rb: {},
    rbox(w, h, d, r) {
      const k = [w, h, d, r].map(v => v.toFixed(3)).join(); if (this._rb[k]) return this._rb[k];
      const g = new THREE.BoxGeometry(w, h, d, 10, 10, 10), p = g.attributes.position, v = new THREE.Vector3(), hw = [w / 2, h / 2, d / 2];
      r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); const a = [v.x, v.y, v.z];
        for (let j = 0; j < 3; j++) { const t = a[j] / hw[j]; const at = Math.abs(t); a[j] = at > 0.6 ? Math.sign(t) * (hw[j] - r + r * (at - 0.6) / 0.4) : t / 0.6 * (hw[j] - r); }
        const inner = a.map((c, j) => Math.max(-(hw[j] - r), Math.min(hw[j] - r, c))); const n = a.map((c, j) => c - inner[j]); const L = Math.hypot(...n);
        if (L > 1e-6) for (let j = 0; j < 3; j++) a[j] = inner[j] + n[j] / L * r;
        p.setXYZ(i, a[0], a[1], a[2]);
      }
      g.computeVertexNormals(); return this._rb[k] = g;
    },
  };
  function initMaterials() {
    M.box = new THREE.BoxGeometry(1, 1, 1); M.sphere = new THREE.SphereGeometry(1, 20, 14);
    M.glass = new THREE.MeshPhysicalMaterial({ color: '#cfe6f2', roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    M.mirror = new THREE.MeshStandardMaterial({ color: '#dfe9ef', roughness: 0.05, metalness: 0.95 });
    M.lampShade = new THREE.MeshStandardMaterial({ color: '#fff4dc', roughness: 0.6, emissive: '#ffcf87', emissiveIntensity: 0 });
    M.bulb = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffd59a', emissiveIntensity: 0 });
    const c = document.createElement('canvas'); c.width = 256; c.height = 144; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, '#1d2b64'); gr.addColorStop(0.5, '#6a3093'); gr.addColorStop(1, '#f8b26a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 144);
    x.fillStyle = 'rgba(255,255,255,.85)'; x.font = 'bold 30px sans-serif'; x.fillText('HOME', 86, 84);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    M.screenOn = new THREE.MeshBasicMaterial({ map: tex }); M.screenOff = new THREE.MeshStandardMaterial({ color: '#0b0c0f', roughness: 0.15, metalness: 0.5 });
    M.screen = M.screenOff;
    M.wallCap = new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.8 });
    M.frame = new THREE.MeshStandardMaterial({ color: '#4a4f57', roughness: 0.4, metalness: 0.6 });
    M.door = new THREE.MeshStandardMaterial({ color: '#efe9df', roughness: 0.5 });
    M.entry = new THREE.MeshStandardMaterial({ color: '#2f3238', roughness: 0.4, metalness: 0.3 });
    M.ceiling = new THREE.MeshStandardMaterial({ color: '#fbfaf8', roughness: 0.95 });
    M.slab = new THREE.MeshStandardMaterial({ color: '#d9d4cc', roughness: 0.9 });
  }
  const floorMats = {};
  function floorMat(name) {
    if (floorMats[name]) return floorMats[name];
    const d = TEX.DEF[name] || TEX.DEF.oak; const t = new THREE.CanvasTexture(TEX.canvas(name));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / mm(d.size), 1 / mm(d.size)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return floorMats[name] = new THREE.MeshStandardMaterial({ map: t, roughness: name.includes('marble') ? 0.25 : 0.75 });
  }
  const wallMats = {};
  function wallMat(fin, len, h) {
    if (!fin || fin === 'paint') { const k = 'p' + M.pal.wall; return wallMats[k] || (wallMats[k] = new THREE.MeshStandardMaterial({ color: M.pal.wall, roughness: 0.92 })); }
    const d = TEX.DEF[fin]; const t = new THREE.CanvasTexture(TEX.canvas(fin)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(Math.max(0.3, len / mm(d.size)), h / mm(d.size));
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  }

  // —— 初始化 ——
  function init(container, labels) {
    el = container; labelsEl = labels;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.75 : 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400);
    initMaterials();
    hemi = new THREE.HemisphereLight('#eef5ff', '#c9b9a3', 1.1); scene.add(hemi);
    sun = new THREE.DirectionalLight('#fff2dd', 2.6); sun.castShadow = true;
    const sm = MOBILE ? 1536 : 2048; sun.shadow.mapSize.set(sm, sm); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    const sc = sun.shadow.camera; sc.left = sc.bottom = -11; sc.right = sc.top = 11; sc.near = 1; sc.far = 60;
    scene.add(sun, sun.target);
    // 地面 + 天空
    const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d');
    const rg = gx.createRadialGradient(256, 256, 30, 256, 256, 256); rg.addColorStop(0, '#f4f1ec'); rg.addColorStop(0.55, '#e9e4dc'); rg.addColorStop(1, 'rgba(233,228,220,0)');
    gx.fillStyle = rg; gx.fillRect(0, 0, 512, 512);
    ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.16; ground.receiveShadow = true; scene.add(ground);
    sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color('#9fc4ec') }, bot: { value: new THREE.Color('#f3efe8') } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float t = smoothstep(-0.05,0.6,vp.y); gl_FragColor = vec4(mix(bot,top,t),1.); }',
    }));
    scene.add(sky);
    root = new THREE.Group(); scene.add(root);
    orbit.attach(renderer.domElement);
    new ResizeObserver(resize).observe(el); resize();
    loop();
  }
  function resize() {
    W = el.clientWidth || 1; H = el.clientHeight || 1;
    renderer.setSize(W, H, true); camera.aspect = W / H; camera.updateProjectionMatrix(); dirty = true;
    if (!userMoved && st.mode === 'orbit' && st.introDone && W > 50) orbit.set({ dist: fitDist() });
  }

  // —— 构建场景 ——
  let center = new THREE.Vector3(), radius = 10, userMoved = false;
  function build(state, opts) {
    S = state; M.pal = STYLES[state.style] || STYLES.cream; M._c = {};
    for (const k in wallMats) delete wallMats[k];
    const keepRemoved = opts && opts.removedWall ? wallObjs.get(opts.removedWall) : null;
    if (keepRemoved) root.remove(keepRemoved);
    root.clear(); wallObjs.clear(); itemObjs.clear(); opObjs.clear(); roomLights.length = 0; lampMeshes.length = 0; ceilings.length = 0; wallMeshesForRay = [];
    M.screen = st.tvOn ? M.screenOn : M.screenOff;
    // 底板
    const all = state.rooms.flatMap(r => r.poly); const bb = G.bbox(all.length ? all : [[0, 0], [1, 1]]);
    center.set(mm(bb.x0 + bb.x1) / 2, 0, mm(bb.y0 + bb.y1) / 2); radius = Math.max(mm(bb.x1 - bb.x0), mm(bb.y1 - bb.y0)) * 0.75;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(mm(bb.x1 - bb.x0) + 0.6, 0.15, mm(bb.y1 - bb.y0) + 0.6), M.slab);
    slab.position.set(center.x, -0.08, center.z); slab.receiveShadow = true; root.add(slab);
    // 地面
    for (const r of state.rooms) {
      const shp = new THREE.Shape(r.poly.map(p => new THREE.Vector2(mm(p[0]), -mm(p[1]))));
      const g = new THREE.ShapeGeometry(shp); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, floorMat(r.floor || 'oak')); m.position.y = r.kind === 'balcony' ? -0.015 : 0.002; m.receiveShadow = true; m.userData.room = r.id; root.add(m);
      // 天花（只从下方可见，鸟瞰时自动看不见）
      const cg = new THREE.ShapeGeometry(shp); cg.rotateX(Math.PI / 2); const cm = new THREE.Mesh(cg, M.ceiling); cm.position.y = 2.8; cm.visible = st.mode !== 'orbit'; root.add(cm); ceilings.push(cm);
      // 吸顶灯 + 室内光
      const c = G.labelPoint(r.poly);
      const L = new THREE.PointLight('#ffd7a3', 0, 7.5, 1.6); L.position.set(mm(c[0]), 2.45, mm(c[1])); L.userData.room = r.id; root.add(L); roomLights.push(L);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), M.bulb); disc.position.set(mm(c[0]), 2.78, mm(c[1])); disc.visible = st.mode !== 'orbit'; root.add(disc); ceilings.push(disc);
    }
    // 墙
    for (const w of state.walls) { const g = buildWall(w); wallObjs.set(w.id, g); root.add(g); }
    // 家具
    for (const it of state.items) addItem(it);
    if (keepRemoved) { root.add(keepRemoved); crumble(keepRemoved); }
    if (st.sunCells) paintSunCells(st.sunCells);
    if (st.mepOn) buildMEP3D();
    if (st.notesOn !== false) buildNotes();
    updateSun(); dirty = true;
    if (opts && opts.intro) startIntro();
  }
  function addItem(it) {
    const f = FURN[it.type]; if (!f) return;
    const g = buildItem3D(it, M); g.position.set(mm(it.x), 0, mm(it.y)); g.rotation.y = -it.rot * Math.PI / 180;
    g.userData.item = it.id; g.traverse(o => { o.userData.item = it.id; });
    if (g.userData.lampAt) { lampMeshes.push(g); const L = new THREE.PointLight('#ffc98a', 0, 3.5, 2); L.position.set(...g.userData.lampAt); g.add(L); g.userData.light = L; }
    root.add(g); itemObjs.set(it.id, g); return g;
  }
  function buildWall(w) {
    const g = new THREE.Group(); g.userData.wall = w.id;
    const L = G.wallLen(w), d = G.wallDir(w), ang = Math.atan2(d[1], d[0]);
    g.position.set(mm(w.a[0]), 0, mm(w.a[1])); g.rotation.y = -ang;
    const T = mm(w.t), Hh = mm(w.h);
    const fin = S.wallFinish[w.id];
    const mat = w.kind === 'rail' ? null : wallMat(fin, mm(L), Hh);
    const mats = mat ? [mat, mat, M.wallCap, mat, mat, mat] : null;
    const seg = (s, e, y0, y1, extS, extE) => {
      const a = mm(s) - extS, b = mm(e) + extE; if (b - a < 0.005 || y1 - y0 < 0.005) return;
      const m = new THREE.Mesh(M.box, mats); m.scale.set(b - a, y1 - y0, T); m.position.set((a + b) / 2, (y0 + y1) / 2, 0);
      m.castShadow = m.receiveShadow = true; m.userData.wall = w.id; g.add(m); wallMeshesForRay.push(m);
    };
    if (w.kind === 'rail') {
      const gl = new THREE.Mesh(M.box, M.glass); gl.scale.set(mm(L), Hh - 0.05, 0.02); gl.position.set(mm(L) / 2, (Hh - 0.05) / 2, 0); g.add(gl);
      const top = new THREE.Mesh(M.box, M.frame); top.scale.set(mm(L) + 0.04, 0.05, 0.06); top.position.set(mm(L) / 2, Hh, 0); top.castShadow = true; g.add(top);
      return g;
    }
    for (const sp of G.spans(w)) {
      const extS = sp.s <= 1 ? T / 2 : 0, extE = sp.e >= L - 1 ? T / 2 : 0;
      if (!sp.op) { seg(sp.s, sp.e, 0, Hh, extS, extE); continue; }
      const o = sp.op, y0 = mm(o.sill), y1 = Math.min(Hh, mm(o.sill + o.h));
      seg(sp.s, sp.e, 0, y0, extS, extE); seg(sp.s, sp.e, y1, Hh, extS, extE);
      const og = new THREE.Group(); og.position.set(mm(o.pos), 0, 0); g.add(og); opObjs.set(o.id, og); og.userData.op = o.id;
      const ow = mm(o.w), oh = y1 - y0;
      if (o.type === 'window' || o.type === 'bay') {
        const gl = new THREE.Mesh(M.box, M.glass); gl.scale.set(ow, oh, 0.02); gl.position.y = y0 + oh / 2; og.add(gl);
        const fr = (fw, fh, x, y) => { const m = new THREE.Mesh(M.box, M.frame); m.scale.set(fw, fh, 0.07); m.position.set(x, y, 0); og.add(m); };
        fr(ow, 0.05, 0, y0 + 0.025); fr(ow, 0.05, 0, y1 - 0.025); fr(0.05, oh, -ow / 2 + 0.025, y0 + oh / 2); fr(0.05, oh, ow / 2 - 0.025, y0 + oh / 2);
        const n = Math.max(1, Math.round(ow / 0.9)); for (let i = 1; i < n; i++) fr(0.035, oh, -ow / 2 + i * ow / n, y0 + oh / 2);
        if (o.type === 'bay') { const sill = new THREE.Mesh(M.box, M.mat('#e8e2d8', 0.4)); sill.scale.set(ow, 0.04, T + 0.08); sill.position.y = y0 + 0.02; sill.receiveShadow = true; og.add(sill); }
        else { const sill = new THREE.Mesh(M.box, M.mat('#e8e2d8', 0.4)); sill.scale.set(ow + 0.06, 0.03, T + 0.06); sill.position.y = y0 + 0.015; og.add(sill); }
      } else if (o.type === 'slide') {
        const n = ow > 1.6 ? 4 : 2, pw = ow / n + 0.03;
        for (let i = 0; i < n; i++) {
          const p = new THREE.Group(); const z = (i % 2 ? 1 : -1) * 0.025;
          const gl = new THREE.Mesh(M.box, M.glass); gl.scale.set(pw, oh - 0.04, 0.012); gl.position.y = oh / 2; p.add(gl);
          for (const [fw, fh, x, y] of [[pw, 0.04, 0, 0.02], [pw, 0.04, 0, oh - 0.02], [0.04, oh, -pw / 2, oh / 2], [0.04, oh, pw / 2, oh / 2]]) { const m = new THREE.Mesh(M.box, M.frame); m.scale.set(fw, fh, 0.03); m.position.set(x, y, 0); p.add(m); }
          p.position.set(-ow / 2 + (i + 0.5) * ow / n, y0, z); p.userData.base = p.position.x; p.userData.i = i; p.userData.n = n; og.add(p);
        }
        og.userData.kind = 'slide'; og.userData.ow = ow;
      } else {
        // 平开门：铰链在一侧
        const hinge = new THREE.Group(); const flip = o.flip ? -1 : 1; hinge.position.set(-ow / 2 * flip, y0, 0); og.add(hinge);
        const leaf = new THREE.Mesh(M.box, o.type === 'entry' ? M.entry : M.door); leaf.scale.set(ow - 0.02, oh - 0.01, 0.045); leaf.position.set(ow / 2 * flip, oh / 2, 0); leaf.castShadow = true; hinge.add(leaf);
        const hd = new THREE.Mesh(M.box, M.frame); hd.scale.set(0.12, 0.02, 0.07); hd.position.set((ow - 0.12) * flip, 1.0, 0); hinge.add(hd);
        og.userData.kind = 'door'; og.userData.hinge = hinge; og.userData.flip = flip;
        const fr = new THREE.Mesh(M.box, M.frame); fr.scale.set(ow + 0.04, 0.04, T + 0.02); fr.position.y = y1 - 0.02; og.add(fr);
      }
      applyOpen(o);
    }
    return g;
  }
  function applyOpen(o) {
    const og = opObjs.get(o.id); if (!og) return;
    if (og.userData.kind === 'door') og.userData.hinge.rotation.y = -o.open * Math.PI * 0.5 * og.userData.flip;
    if (og.userData.kind === 'slide') og.children.forEach(p => { if (p.userData.n) { const half = p.userData.i < p.userData.n / 2 ? 1 : -1; p.position.x = p.userData.base + (p.userData.i % 2 ? 0 : o.open * og.userData.ow / p.userData.n * half * 0.95); } });
    dirty = true;
  }
  function crumble(g) {
    const t0 = performance.now();
    const meshes = []; g.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); meshes.push({ o, v: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2) }); } });
    anims.push(t => {
      const k = (t - t0) / 900; if (k >= 1) { root.remove(g); return false; }
      for (const m of meshes) { m.o.position.addScaledVector(m.v, 0.02); m.v.y -= 0.12; const mats = Array.isArray(m.o.material) ? m.o.material : [m.o.material]; mats.forEach(x => { x.transparent = true; x.opacity = 1 - k; }); m.o.rotation.x += 0.03; }
      return true;
    });
  }

  // —— 开场动画：墙从地里长出来，家具落下 ——
  function fitDist(k) { return Math.min(110, radius * (k || 0.92) / Math.tan(camera.fov * Math.PI / 360) / Math.min(1, camera.aspect)); }
  function startIntro() {
    const t0 = performance.now();
    const ws = [...wallObjs.values()], its = [...itemObjs.values()];
    ws.forEach(g => g.scale.y = 0.001); its.forEach(g => { g.userData.y0 = 0; g.position.y = 3; g.visible = false; });
    orbit.set({ theta: -0.35, phi: 0.25, dist: fitDist(1.6) }, true);
    orbit.set({ theta: 0.55, phi: 0.78, dist: fitDist() });
    anims.push(t => {
      const k = (t - t0) / 1000;
      ws.forEach((g, i) => { const p = Math.min(1, Math.max(0, (k - 0.2 - i * 0.012) / 0.6)); g.scale.y = Math.max(0.001, 1 - Math.pow(1 - p, 3)); });
      its.forEach((g, i) => { const p = Math.min(1, Math.max(0, (k - 1.0 - i * 0.025) / 0.45)); g.visible = p > 0; const e = p < 1 ? 1 - Math.pow(1 - p, 2) : 1; g.position.y = 3 * (1 - e) + (p < 1 ? 0 : 0); });
      return k < 2.6;
    });
  }

  // —— 日照 ——
  const sunState = { city: SUN.cities[0], m: 10, d: 15, hour: 10.5, north: 0 };
  function setSun(o) { Object.assign(sunState, o); updateSun(); }
  function updateSun() {
    const s = SUN.pos(sunState.city.lat, sunState.city.lon, sunState.m, sunState.d, sunState.hour);
    const az = (s.az - sunState.north) * Math.PI / 180, alt = s.alt * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt));
    sun.position.copy(center).addScaledVector(dir, 30); sun.target.position.copy(center);
    const day = Math.max(0, Math.min(1, (s.alt + 4) / 14)); // 0 夜 → 1 白天
    const warm = Math.max(0, Math.min(1, 1 - s.alt / 25));
    sun.intensity = s.alt > 0 ? 3.4 * Math.min(1, s.alt / 10) : 0;
    sun.color.setHSL(0.09, 0.8 * warm + 0.1, 0.65 + 0.25 * (1 - warm));
    hemi.intensity = 0.22 + 0.95 * day;
    const top = new THREE.Color().setHSL(0.6, 0.55, 0.08 + 0.58 * day), bot = new THREE.Color().setHSL(0.08, 0.5 * warm * day + 0.05, 0.1 + 0.8 * day);
    if (day < 1 && day > 0) bot.lerp(new THREE.Color('#ffb27a'), 0.5 * (1 - Math.abs(day - 0.5) * 2));
    sky.material.uniforms.top.value.copy(top); sky.material.uniforms.bot.value.copy(bot);
    ground.material.color.setScalar(0.25 + 0.75 * day);
    st.night = 1 - day;
    updateLights();
    // 太阳轨迹
    if (sunPath) scene.remove(sunPath);
    const pts = []; for (let h = 4; h <= 20; h += 0.25) { const q = SUN.pos(sunState.city.lat, sunState.city.lon, sunState.m, sunState.d, h); if (q.alt < -2) continue; const a2 = (q.az - sunState.north) * Math.PI / 180, b2 = q.alt * Math.PI / 180; pts.push(new THREE.Vector3(Math.sin(a2) * Math.cos(b2), Math.sin(b2), -Math.cos(a2) * Math.cos(b2)).multiplyScalar(radius * 1.9).add(center)); }
    sunPath = new THREE.Group();
    if (pts.length > 1 && st.showSunPath) {
      sunPath.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#ffb547', dashSize: 0.3, gapSize: 0.2 })).computeLineDistances());
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffcc55' }));
      ball.position.copy(center).addScaledVector(dir, radius * 1.9); if (s.alt > -2) sunPath.add(ball);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffb547', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(3); glow.position.copy(ball.position); if (s.alt > -2) sunPath.add(glow);
    }
    scene.add(sunPath);
    dirty = true; return s;
  }
  let _glow; function glowTex() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,220,150,.5)'); g.addColorStop(1, 'rgba(255,200,100,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return _glow = new THREE.CanvasTexture(c); }
  // 灯光：夜晚自动开 + 智能中控覆盖
  const lightOverride = {}; // roomId -> true/false
  function updateLights() {
    const autoOn = st.lightsAuto && st.night > 0.55;
    for (const L of roomLights) { const o = lightOverride[L.userData.room]; const on = o === undefined ? autoOn : o; L.intensity = on ? 9 : 0; }
    const anyOn = roomLights.some(L => L.intensity > 0);
    M.bulb.emissiveIntensity = anyOn ? 2.5 : 0; M.lampShade.emissiveIntensity = anyOn ? 1.6 : 0;
    for (const g of lampMeshes) g.userData.light.intensity = anyOn ? 1.6 : 0;
    dirty = true;
  }
  function setRoomLight(id, on) { if (on === null) delete lightOverride[id]; else lightOverride[id] = on; updateLights(); }
  function allLights(on) { for (const L of roomLights) lightOverride[L.userData.room] = on; updateLights(); }

  // —— 日照热力图贴到地面 ——
  let sunOverlay = null;
  function paintSunCells(res) {
    st.sunCells = res; if (sunOverlay) root.remove(sunOverlay);
    if (!res) { sunOverlay = null; dirty = true; return; }
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(mm(res.grid) * 0.96, mm(res.grid) * 0.96); geo.rotateX(-Math.PI / 2);
    const mats = {};
    for (const c of res.cells) {
      const col = heatColor(c.h, res.to - res.from); const k = col;
      const m = new THREE.Mesh(geo, mats[k] || (mats[k] = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.72, depthWrite: false })));
      m.position.set(mm(c.x), 0.03, mm(c.y)); g.add(m);
    }
    sunOverlay = g; root.add(g); dirty = true;
  }

  // —— 水电 3D ——
  function buildMEP3D() {
    const mep = S.mepData; if (!mep) return;
    const g = new THREE.Group(); g.userData.mep = 1;
    for (const l of mep.lines) {
      const pts = l.pts.map(p => new THREE.Vector3(mm(p[0]), 0.05 + Object.keys(MEP_KINDS).indexOf(l.k) * 0.012, mm(p[1])));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: MEP_KINDS[l.k].c, transparent: true, opacity: 0.95, depthTest: false })));
    }
    for (const p of mep.pts) {
      const d = MEP_POINTS[p.t]; const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshBasicMaterial({ color: MEP_KINDS[d.k].c, depthTest: false }));
      m.position.set(mm(p.x), mm(Math.min(d.h, 2700)), mm(p.y)); m.renderOrder = 5; g.add(m);
      const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(mm(p.x), 0.05, mm(p.y)), m.position.clone()]), new THREE.LineBasicMaterial({ color: MEP_KINDS[d.k].c, transparent: true, opacity: 0.5, depthTest: false }));
      g.add(stem);
    }
    g.traverse(o => o.renderOrder = 4);
    root.add(g);
  }
  // 批注：3D 里浮起来的小牌子（HTML 叠层）
  function buildNotes() { }

  // —— 房间标签（HTML 叠层）——
  function updateLabels() {
    if (!labelsEl || !S) return;
    const show = st.mode === 'orbit' && st.labels !== false && st.introDone;
    if (!show) { if (labelsEl.childElementCount) labelsEl.innerHTML = ''; return; }
    const want = S.rooms.length + S.notes.length;
    if (labelsEl.childElementCount !== want) {
      labelsEl.innerHTML = S.rooms.map(r => `<div class="lbl3" data-r="${r.id}"><b>${esc(r.name)}</b><span>${G.m2(G.area(r.poly))}㎡</span></div>`).join('') +
        S.notes.map(n => `<div class="lbl3 note3"><b>📌</b><span>${esc(n.text || '批注')}</span></div>`).join('');
    }
    const v = new THREE.Vector3(); const kids = labelsEl.children;
    const place = (el, x, y, z) => { v.set(x, y, z).project(camera); if (v.z > 1) { el.style.display = 'none'; return; } el.style.display = ''; el.style.transform = `translate(-50%,-50%) translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px)`; };
    S.rooms.forEach((r, i) => { const c = G.labelPoint(r.poly); place(kids[i], mm(c[0]), 2.9, mm(c[1])); });
    S.notes.forEach((n, i) => place(kids[S.rooms.length + i], mm(n.x), 2.2, mm(n.y)));
  }

  // —— 轨道相机（鼠标 + 触摸）——
  const orbit = (() => {
    const cur = { theta: 0.6, phi: 0.95, dist: 22, tx: 0, tz: 0 }, goal = { ...cur };
    let ptrs = new Map(), last = null, pinch0 = null, dragItem = null, downAt = null;
    const o = {
      cur, goal, enabled: true,
      set(v, snap) { Object.assign(goal, v); if (snap) Object.assign(cur, goal); dirty = true; },
      attach(dom) {
        dom.addEventListener('pointerdown', e => {
          if (st.mode === 'walk') return; dom.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
          downAt = { x: e.clientX, y: e.clientY, t: performance.now(), btn: e.button };
          if (ptrs.size === 1 && st.mode === 'orbit' && e.button === 0) {
            const hit = pick(e); if (hit && hit.item && hit.item === V3.selected) { dragItem = { id: hit.item, off: null }; }
          }
          if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: goal.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; dragItem = null; }
          last = { x: e.clientX, y: e.clientY };
        });
        dom.addEventListener('pointermove', e => {
          if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (ptrs.size === 2 && pinch0) {
            const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (st.mode === 'orbit') { goal.dist = Math.max(3, Math.min(120, pinch0.dist * pinch0.d / d)); userMoved = true; }
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; panBy(mx - pinch0.mx, my - pinch0.my); pinch0.mx = mx; pinch0.my = my; return;
          }
          const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
          if (dragItem) { const p = floorPoint(e); if (p) { const it = S.items.find(i => i.id === dragItem.id); if (!dragItem.off) dragItem.off = [it.x - p[0], it.y - p[1]]; V3.onDragItem && V3.onDragItem(it, p[0] + dragItem.off[0], p[1] + dragItem.off[1]); } return; }
          if (st.mode === 'pano') { goal.theta -= dx * 0.005; goal.phi = Math.max(0.15, Math.min(2.95, goal.phi - dy * 0.005)); return; }
          userMoved = true;
          if (downAt.btn === 2 || e.shiftKey) panBy(dx, dy);
          else { goal.theta -= dx * 0.006; goal.phi = Math.max(0.08, Math.min(1.5, goal.phi - dy * 0.006)); }
        });
        const up = e => {
          if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
          if (dragItem && ptrs.size === 0) { V3.onDragEnd && V3.onDragEnd(); dragItem = null; }
          if (downAt && ptrs.size === 0 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && performance.now() - downAt.t < 400) onTap(e);
          if (ptrs.size < 2) pinch0 = null;
        };
        dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
        dom.addEventListener('contextmenu', e => e.preventDefault());
        dom.addEventListener('wheel', e => { e.preventDefault(); userMoved = true; if (st.mode === 'pano') { camera.fov = Math.max(35, Math.min(95, camera.fov + e.deltaY * 0.04)); camera.updateProjectionMatrix(); dirty = true; return; } goal.dist = Math.max(3, Math.min(120, goal.dist * Math.pow(1.0015, e.deltaY))); }, { passive: false });
      },
      update() {
        let moving = false;
        for (const k in cur) { const dv = goal[k] - cur[k]; if (Math.abs(dv) > 1e-4) { cur[k] += dv * 0.16; moving = true; } else cur[k] = goal[k]; }
        if (st.mode === 'orbit') {
          const t = new THREE.Vector3(center.x + cur.tx, 0.6, center.z + cur.tz);
          camera.position.set(t.x + cur.dist * Math.sin(cur.phi) * Math.sin(cur.theta), t.y + cur.dist * Math.cos(cur.phi), t.z + cur.dist * Math.sin(cur.phi) * Math.cos(cur.theta));
          camera.lookAt(t);
        } else if (st.mode === 'pano') {
          const p = st.panoAt; camera.position.set(p.x, 1.5, p.z);
          const d = new THREE.Vector3(Math.sin(cur.phi) * Math.sin(cur.theta), Math.cos(cur.phi), Math.sin(cur.phi) * Math.cos(cur.theta));
          if (gyro.q) camera.quaternion.copy(gyro.q); else camera.lookAt(camera.position.clone().add(d));
        }
        return moving;
      },
    };
    function panBy(dx, dy) { const s = goal.dist * 0.0012; const c = Math.cos(cur.theta), sn = Math.sin(cur.theta); goal.tx += (-dx * c - dy * sn * 1) * s; goal.tz += (dx * sn - dy * c) * s; }
    return o;
  })();
  function onTap(e) {
    const hit = pick(e);
    if (st.mode === 'pano') return;
    if (hit && hit.op) { const o = findOp(hit.op); if (o) { o.open = o.open > 0.5 ? 0 : 1; animateOpen(o); } return; }
    V3.onPick && V3.onPick(hit);
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setNDC(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); }
  function pick(e) {
    setNDC(e);
    const hits = ray.intersectObjects(root.children, true);
    for (const h of hits) {
      let o = h.object; if (!o.visible || o.type === 'Line') continue;
      while (o && !o.userData.item && !o.userData.op && !o.userData.room && !o.userData.wall) o = o.parent;
      if (!o) continue;
      if (o.userData.item) return { item: o.userData.item };
      if (o.userData.op) return { op: o.userData.op };
      if (o.userData.wall) return { wall: o.userData.wall };
      if (o.userData.room) return { room: o.userData.room };
    }
    return null;
  }
  function floorPoint(e) { setNDC(e); const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? [p.x * 1000, p.z * 1000] : null; }
  function findOp(id) { for (const w of S.walls) for (const o of w.ops) if (o.id === id) return o; return null; }
  function animateOpen(o) {
    const from = o._anim ?? (o.open > 0.5 ? 0 : 1), to = o.open, t0 = performance.now();
    anims.push(t => { const k = Math.min(1, (t - t0) / 450); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; const real = o.open; o.open = from + (to - from) * e; applyOpen(o); o.open = real; return k < 1; });
  }
  function moveItem(it) { const g = itemObjs.get(it.id); if (!g) return; g.position.set(mm(it.x), g.position.y, mm(it.y)); g.rotation.y = -it.rot * Math.PI / 180; dirty = true; }
  function highlight(id) {
    for (const [k, g] of itemObjs) g.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { if (k === id) { if (!o.userData.hl) { o.userData.hl = o.material; o.material = o.material.clone(); o.material.emissive = new THREE.Color('#2f7cf6'); o.material.emissiveIntensity = 0.25; } } else if (o.userData.hl) { o.material = o.userData.hl; delete o.userData.hl; } } });
    dirty = true;
  }

  // —— 漫游 ——
  const walk = { pos: new THREE.Vector3(), yaw: 0, pitch: -0.1, vy: 0, feet: 0, keys: {}, avatar: null, kind: 'cat', fp: false, joy: null, look: null, t: 0, speed: 0 };
  function buildAvatar(kind) {
    const g = new THREE.Group();
    if (kind === 'cat') {
      // 黑足猫：浅沙色，四只黑脚，黑色斑点
      const fur = new THREE.MeshStandardMaterial({ color: '#d4b48a', roughness: 0.95 }), dark = new THREE.MeshStandardMaterial({ color: '#1f1712', roughness: 0.9 }), eye = new THREE.MeshStandardMaterial({ color: '#b9d84a', emissive: '#4a5d10', roughness: 0.3 });
      const s = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(M.sphere, m); o.scale.set(r * sx, r * sy, r * sz); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
      const body = s(0.13, fur, 0, 0.2, 0, 0.85, 0.8, 1.45);
      const head = new THREE.Group(); head.position.set(0, 0.33, 0.2); g.add(head);
      const hs = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(M.sphere, m); o.scale.set(r * sx, r * sy, r * sz); o.position.set(x, y, z); o.castShadow = true; head.add(o); return o; };
      hs(0.1, fur, 0, 0, 0, 1.1, 0.95, 1); hs(0.045, fur, 0, -0.03, 0.08, 1.2, 0.8, 0.8);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), fur); e.position.set(sx * 0.06, 0.1, -0.01); e.rotation.z = -sx * 0.25; head.add(e); hs(0.016, eye, sx * 0.042, 0.02, 0.088); hs(0.008, dark, sx * 0.042, 0.02, 0.1); }
      hs(0.012, new THREE.MeshStandardMaterial({ color: '#c97a7a' }), 0, -0.01, 0.125);
      for (let i = 0; i < 5; i++) s(0.03, dark, (i % 2 ? 1 : -1) * 0.09, 0.22 + (i % 3) * 0.03, -0.12 + i * 0.06, 0.6, 0.9, 0.7); // 斑点
      const legs = [];
      for (const [x, z] of [[-0.06, 0.12], [0.06, 0.12], [-0.06, -0.12], [0.06, -0.12]]) {
        const lg = new THREE.Group(); lg.position.set(x, 0.17, z); g.add(lg);
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.15, 8), fur); l.position.y = -0.075; l.castShadow = true; lg.add(l);
        const foot = new THREE.Mesh(M.sphere, dark); foot.scale.set(0.028, 0.02, 0.034); foot.position.set(0, -0.155, 0.006); lg.add(foot); legs.push(lg);
      }
      const tail = new THREE.Group(); tail.position.set(0, 0.24, -0.18); g.add(tail);
      for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(M.sphere, i > 3 ? dark : fur); t.scale.setScalar(0.024 - i * 0.001); t.position.set(0, i * 0.025, -i * 0.03); tail.add(t); }
      g.userData = { legs, tail, head, eye: 0.3, r: 0.15, jump: 5.6, h: 0.3 };
    } else {
      const skin = new THREE.MeshStandardMaterial({ color: '#f1d6c0', roughness: 0.7 }), cloth = new THREE.MeshStandardMaterial({ color: '#4f7cff', roughness: 0.6 }), pants = new THREE.MeshStandardMaterial({ color: '#3a3f4b', roughness: 0.7 });
      const body = new THREE.Mesh(M.rbox(0.36, 0.55, 0.22, 0.1), cloth); body.position.y = 1.1; body.castShadow = true; g.add(body);
      const head = new THREE.Group(); head.position.y = 1.55; g.add(head);
      const hm = new THREE.Mesh(M.sphere, skin); hm.scale.setScalar(0.14); hm.castShadow = true; head.add(hm);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: '#2b2220' })); hair.position.y = 0.01; hair.rotation.x = -0.25; head.add(hair);
      const legs = [];
      for (const x of [-0.09, 0.09]) { const lg = new THREE.Group(); lg.position.set(x, 0.82, 0); g.add(lg); const l = new THREE.Mesh(M.rbox(0.13, 0.8, 0.14, 0.05), pants); l.position.y = -0.4; l.castShadow = true; lg.add(l); legs.push(lg); }
      for (const x of [-0.24, 0.24]) { const lg = new THREE.Group(); lg.position.set(x, 1.35, 0); g.add(lg); const l = new THREE.Mesh(M.rbox(0.1, 0.55, 0.11, 0.04), cloth); l.position.y = -0.26; l.castShadow = true; lg.add(l); legs.push(lg); }
      g.userData = { legs, head, eye: 1.6, r: 0.22, jump: 4.3, h: 1.7 };
    }
    return g;
  }
  function enterWalk(kind) {
    walk.kind = kind || walk.kind; st.mode = 'walk';
    if (walk.avatar) scene.remove(walk.avatar);
    walk.avatar = buildAvatar(walk.kind); scene.add(walk.avatar);
    const lr = S.rooms.find(r => r.kind === 'living') || S.rooms[0]; const c = G.labelPoint(lr.poly);
    walk.pos.set(mm(c[0]), 0, mm(c[1])); walk.feet = 0; walk.vy = 0; walk.yaw = Math.PI; walk.pitch = -0.12; walk.avatar.rotation.y = walk.yaw;
    ceilings.forEach(c => c.visible = true); camera.fov = 70; camera.updateProjectionMatrix();
    if (sunPath) sunPath.visible = false; dirty = true;
  }
  function exitWalk() {
    st.mode = 'orbit'; if (walk.avatar) scene.remove(walk.avatar); walk.avatar = null;
    ceilings.forEach(c => c.visible = false); camera.fov = 40; camera.updateProjectionMatrix(); if (sunPath) sunPath.visible = true; dirty = true;
  }
  function itemTop(it) { const f = FURN[it.type]; if (!f || f.ceil || it.type === 'rug') return null; const h = (it.h || f.h); const seat = { sofa: 450, armchair: 450, lounger: 450, desk: 750, dining: 750, toilet: 420, shower: 0 }; return mm(seat[it.type] ?? h); }
  function stepWalk(dt) {
    const k = walk.keys, A = walk.avatar.userData;
    let fx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), fz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (walk.joy) { fx = walk.joy.x; fz = -walk.joy.y; }
    const run = k.ShiftLeft || k.ShiftRight || (walk.joy && Math.hypot(walk.joy.x, walk.joy.y) > 0.9);
    const sp = (A.r < 0.2 ? 2.4 : 2.0) * (run ? 1.8 : 1);
    const mag = Math.min(1, Math.hypot(fx, fz));
    const fwd = new THREE.Vector3(Math.sin(walk.yaw), 0, Math.cos(walk.yaw)), right = new THREE.Vector3(-Math.cos(walk.yaw), 0, Math.sin(walk.yaw));
    const mv = fwd.multiplyScalar(fz).add(right.multiplyScalar(fx)); if (mv.lengthSq() > 0) mv.normalize().multiplyScalar(sp * mag * dt);
    const np = [walk.pos.x + mv.x, walk.pos.z + mv.z];
    // 碰撞：墙
    const r = A.r;
    for (let iter = 0; iter < 3; iter++) for (const w of S.walls) {
      for (const sp2 of G.spans(w)) {
        const o = sp2.op; if (o && (o.type === 'door' || o.type === 'entry' || o.type === 'slide') && o.open > 0.5) continue;
        if (o && (o.type === 'window' || o.type === 'bay') && walk.feet > mm(o.sill) + 0.05) continue;
        if (w.kind === 'rail' && walk.feet > 1.15) continue;
        const a = G.at(w, sp2.s), b = G.at(w, sp2.e); const am = [mm(a[0]), mm(a[1])], bm = [mm(b[0]), mm(b[1])];
        const dx = bm[0] - am[0], dz = bm[1] - am[1], L2 = dx * dx + dz * dz || 1; let t = ((np[0] - am[0]) * dx + (np[1] - am[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
        const cx = am[0] + t * dx, cz = am[1] + t * dz, ddx = np[0] - cx, ddz = np[1] - cz, dist = Math.hypot(ddx, ddz), min = mm(w.t) / 2 + r;
        if (dist < min && dist > 1e-6) { np[0] = cx + ddx / dist * min; np[1] = cz + ddz / dist * min; }
      }
    }
    // 家具：可以跳上去
    let groundH = 0;
    for (const it of S.items) {
      const top = itemTop(it); if (top === null) continue; const f = FURN[it.type];
      const loc = G.toLocal(it, [np[0] * 1000, np[1] * 1000]); const hw = (it.w || f.w) / 2 + r * 1000, hd = (it.d || f.d) / 2 + r * 1000;
      if (Math.abs(loc[0]) < hw && Math.abs(loc[1]) < hd) {
        const innerIn = Math.abs(loc[0]) < hw - r * 1000 && Math.abs(loc[1]) < hd - r * 1000;
        if (walk.feet >= top - 0.08) { if (innerIn) groundH = Math.max(groundH, top); }
        else if (top > 0.12) {
          // 推出去
          const px = hw - Math.abs(loc[0]), pz = hd - Math.abs(loc[1]);
          if (px < pz) loc[0] = Math.sign(loc[0]) * hw; else loc[1] = Math.sign(loc[1]) * hd;
          const back = G.rot(loc, it.rot); np[0] = (it.x + back[0]) / 1000; np[1] = (it.y + back[1]) / 1000;
        }
      }
    }
    walk.pos.x = np[0]; walk.pos.z = np[1];
    walk.vy -= 13 * dt; walk.feet += walk.vy * dt;
    if (walk.feet <= groundH) { walk.feet = groundH; walk.vy = 0; walk.onGround = true; } else walk.onGround = false;
    if (k.Space && walk.onGround) { walk.vy = A.jump; k.Space = false; }
    // 角色朝向 + 走路动画
    const av = walk.avatar; av.position.set(walk.pos.x, walk.feet, walk.pos.z);
    if (mv.lengthSq() > 1e-8) { const tgt = Math.atan2(mv.x, mv.z); let dy = tgt - av.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); av.rotation.y += dy * Math.min(1, dt * 12); walk.t += dt * sp * 4; }
    const sw = Math.sin(walk.t) * (mv.lengthSq() > 1e-8 ? 0.6 : 0);
    A.legs.forEach((l, i) => l.rotation.x = (i % 2 ? sw : -sw) * (i > 1 && A.r < 0.2 ? -1 : 1));
    if (A.tail) A.tail.rotation.x = -0.6 + Math.sin(performance.now() / 300) * 0.15;
    av.visible = !walk.fp;
    // 相机
    const eye = new THREE.Vector3(walk.pos.x, walk.feet + A.eye, walk.pos.z);
    const look = new THREE.Vector3(Math.sin(walk.yaw) * Math.cos(walk.pitch), Math.sin(walk.pitch), Math.cos(walk.yaw) * Math.cos(walk.pitch));
    if (walk.fp) { camera.position.copy(eye); camera.lookAt(eye.clone().add(look)); }
    else {
      const back = A.r < 0.2 ? 1.5 : 2.6; const want = eye.clone().addScaledVector(look, -back).add(new THREE.Vector3(0, A.r < 0.2 ? 0.35 : 0.3, 0));
      const dir = want.clone().sub(eye); const len = dir.length(); dir.normalize();
      const rc = new THREE.Raycaster(eye, dir, 0, len); const h = rc.intersectObjects(wallMeshesForRay, false)[0];
      camera.position.copy(h ? eye.clone().addScaledVector(dir, Math.max(0.15, h.distance - 0.12)) : want); camera.lookAt(eye.clone().addScaledVector(look, 1));
    }
    dirty = true;
  }
  function interact() {
    const p = [walk.pos.x * 1000, walk.pos.z * 1000]; let best = null, bd = 1500;
    for (const w of S.walls) for (const o of w.ops) { if (!['door', 'entry', 'slide'].includes(o.type)) continue; const d = G.len(p, G.at(w, o.pos)); if (d < bd) { bd = d; best = o; } }
    if (best) { best.open = best.open > 0.5 ? 0 : 1; animateOpen(best); return '门 ' + (best.open ? '已打开' : '已关上'); }
    const r = S.rooms.find(r => G.inPoly(p, r.poly)); if (r) { const L = roomLights.find(l => l.userData.room === r.id); setRoomLight(r.id, !(L && L.intensity > 0)); return r.name + ' 灯 ' + (L && L.intensity > 0 ? '开' : '关'); }
    return '';
  }

  // —— 全景 ——
  const gyro = { q: null, on: false };
  function enterPano(roomId) {
    const r = S.rooms.find(x => x.id === roomId) || S.rooms.find(x => x.kind === 'living'); const c = G.labelPoint(r.poly);
    st.mode = 'pano'; st.panoAt = { x: mm(c[0]), z: mm(c[1]) }; ceilings.forEach(c => c.visible = true); camera.fov = 75; camera.updateProjectionMatrix();
    orbit.set({ theta: Math.PI, phi: Math.PI / 2 }, true); if (sunPath) sunPath.visible = false; dirty = true; return r.name;
  }
  function exitPano() { st.mode = 'orbit'; gyro.q = null; gyro.on = false; ceilings.forEach(c => c.visible = false); camera.fov = 40; camera.updateProjectionMatrix(); if (sunPath) sunPath.visible = true; orbit.set({ theta: 0.6, phi: 0.95 }, true); dirty = true; }
  function onOrient(e) {
    if (!gyro.on || e.alpha == null) return;
    const z = THREE.MathUtils.degToRad(e.alpha), x = THREE.MathUtils.degToRad(e.beta), y = THREE.MathUtils.degToRad(e.gamma), orient = THREE.MathUtils.degToRad(screen.orientation ? screen.orientation.angle : (window.orientation || 0));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, z, -y, 'YXZ'));
    q.multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient));
    gyro.q = q; dirty = true;
  }
  async function toggleGyro() {
    if (gyro.on) { gyro.on = false; gyro.q = null; return false; }
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false; } catch (e) { return false; } }
    addEventListener('deviceorientation', onOrient); gyro.on = true; return true;
  }
  // 导出等距柱状全景图
  function panoImage() {
    const size = MOBILE ? 1024 : 2048;
    const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType }); const cc = new THREE.CubeCamera(0.05, 200, rt);
    cc.position.set(st.panoAt.x, 1.5, st.panoAt.z); scene.add(cc); cc.update(renderer, scene); scene.remove(cc);
    const W2 = size * 2, H2 = size; const out = new THREE.WebGLRenderTarget(W2, H2);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { env: { value: rt.texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'uniform samplerCube env; varying vec2 vUv; void main(){ float lon=(vUv.x-.5)*6.2831853; float lat=(vUv.y-.5)*3.1415926; vec3 d=vec3(cos(lat)*sin(lon), sin(lat), -cos(lat)*cos(lon)); gl_FragColor = textureCube(env, vec3(-d.x,d.y,d.z)); #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }' }));
    const sc = new THREE.Scene(); sc.add(q); const oc = new THREE.Camera();
    renderer.setRenderTarget(out); renderer.render(sc, oc); renderer.setRenderTarget(null);
    const px = new Uint8Array(W2 * H2 * 4); renderer.readRenderTargetPixels(out, 0, 0, W2, H2, px);
    const c = document.createElement('canvas'); c.width = W2; c.height = H2; const x = c.getContext('2d'); const id = x.createImageData(W2, H2);
    for (let y = 0; y < H2; y++) id.data.set(px.subarray((H2 - 1 - y) * W2 * 4, (H2 - y) * W2 * 4), y * W2 * 4);
    x.putImageData(id, 0, 0); rt.dispose(); out.dispose(); dirty = true;
    return c.toDataURL('image/jpeg', 0.9);
  }
  // 高清出图
  function snapshot(w, h) {
    const oldPR = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/jpeg', 0.92);
    renderer.setPixelRatio(oldPR); resize(); renderer.render(scene, camera); return url;
  }

  // —— 主循环 ——
  const anims = []; let lastT = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    const t = performance.now(), dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    if (!el.offsetParent) return;
    let busy = false;
    for (let i = anims.length - 1; i >= 0; i--) { if (!anims[i](t)) anims.splice(i, 1); busy = true; }
    if (st.mode === 'walk' && walk.avatar) stepWalk(dt);
    else if (orbit.update()) busy = true;
    if (st.sunPlay) { busy = true; }
    if (busy || dirty) { renderer.render(scene, camera); updateLabels(); dirty = false; }
    if (!st.introDone && !anims.length) { st.introDone = true; dirty = true; }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return {
    init, build, st, orbit, setSun, sunState, updateSun, moveItem, highlight, addItem, paintSunCells, setRoomLight, allLights, updateLights, lightOverride, roomLights,
    enterWalk, exitWalk, walk, interact, enterPano, exitPano, toggleGyro, panoImage, snapshot, applyOpen, animateOpen, crumble,
    redraw() { dirty = true; }, get camera() { return camera; }, get renderer() { return renderer; }, MOBILE, selected: null,
    tv(on) { st.tvOn = on; M.screen = on ? M.screenOn : M.screenOff; for (const g of itemObjs.values()) g.traverse(o => { if (o.material === M.screenOn || o.material === M.screenOff) o.material = M.screen; }); dirty = true; },
    frame(view) { const v = { iso: { theta: 0.6, phi: 0.78 }, top: { theta: 0, phi: 0.05 }, front: { theta: 0, phi: 1.2 } }[view]; userMoved = false; orbit.set(Object.assign({ dist: fitDist(), tx: 0, tz: 0 }, v)); }, fitDist,
  };
})();

function heatColor(h, max) {
  const t = Math.max(0, Math.min(1, h / Math.max(1, Math.min(max, 6))));
  if (h <= 0.01) return '#5b6b8c';
  const stops = [[0, [91, 140, 255]], [0.33, [64, 200, 170]], [0.66, [255, 196, 61]], [1, [255, 99, 71]]];
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const a = stops[i - 1], b = stops[i], k = (t - a[0]) / (b[0] - a[0]); const c = a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; }
  return 'rgb(255,99,71)';
}
