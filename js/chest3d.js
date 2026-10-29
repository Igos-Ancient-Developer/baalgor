// Настоящий 3D-сундук на three.js (js/vendor/three.module.min.js): корпус с досками или обивкой, окантовка, замок с камнем, откидывающаяся крышка на петле,
// внутри золото и самоцветы, свет из сундука, искры, магический круг на полу. Рисуется в прозрачный canvas поверх затемнённого экрана.
// Состояния: drop → idle → charge → burst → got. Если WebGL недоступен, createChest3D вернёт null и окно откроется на запасной (плоской) сцене.
import * as THREE from './vendor/three.module.min.js?v=20261029213125';

const PAL = {
  wood: { body: 0xffffff, trim: 0x474b55, trimMet: 0.5, trimRough: 0.62, gem: 0x2f2a28, lock: 0x575c68, glow: 0xffb35a, roughness: 0.85, metal: 0.0, cross: 3 },
  silver: { body: 0xb8c4d2, trim: 0x8d9aaa, trimMet: 0.85, trimRough: 0.4, gem: 0x14c8d8, lock: 0x9aa7b6, glow: 0xa9dcff, roughness: 0.4, metal: 0.55, cross: 1 },
  gold: { body: 0xc9a2a8, trim: 0xe0a826, trimMet: 1.0, trimRough: 0.26, gem: 0xff3252, lock: 0xf0c040, glow: 0xffd24a, roughness: 0.7, metal: 0.08, cross: 1 },
};
const ease = { out: (u) => 1 - Math.pow(1 - u, 3), inn: (u) => u * u * u };
const canvasTex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };

// текстуры: корпус (вертикальные доски / стальные филёнки / бархатные филёнки), крышка, тиснение на окантовке
const WOODS = ['#6d4627', '#5f3c20', '#74502c', '#5a381d', '#69431f'];
function scroll(g, x, y, sx, sy, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + sx * 26, y, x + sx * 34, y + sy * 18, x + sx * 20, y + sy * 26); g.bezierCurveTo(x + sx * 8, y + sy * 32, x + sx * 6, y + sy * 14, x + sx * 16, y + sy * 14); g.stroke(); }
function bodyTexture(theme) {
  if (theme === 'wood') return canvasTex(256, 256, (g, w, h) => {
    const n = 4; for (let i = 0; i < n; i++) { const x = (i * w) / n, bw = w / n; g.fillStyle = WOODS[i]; g.fillRect(x, 0, bw, h);
      for (let k = 0; k < 22; k++) { g.strokeStyle = `rgba(30,14,5,${0.1 + Math.random() * 0.16})`; g.lineWidth = 1 + Math.random(); const xx = x + 4 + Math.random() * (bw - 8); g.beginPath(); g.moveTo(xx, 0); g.bezierCurveTo(xx + (Math.random() - 0.5) * 8, h * 0.3, xx + (Math.random() - 0.5) * 8, h * 0.7, xx, h); g.stroke(); }
      g.fillStyle = 'rgba(12,6,2,.9)'; g.fillRect(x + bw - 3, 0, 3, h); g.fillStyle = 'rgba(255,200,140,.16)'; g.fillRect(x, 0, 3, h); }
  });
  const silver = theme === 'silver', base = silver ? ['#6d86a0', '#4a617b'] : ['#9a1832', '#6a0e22'], lo = silver ? 'rgba(14,26,42,.75)' : 'rgba(40,0,10,.75)', hi = silver ? 'rgba(225,238,252,.7)' : 'rgba(255,205,90,.85)';
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (!silver) for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = (i + 0.5) * (w / 5), y = (j + 0.5) * (h / 5), rg = g.createRadialGradient(x, y, 1, x, y, 24); rg.addColorStop(0, 'rgba(255,100,120,.3)'); rg.addColorStop(1, 'rgba(60,0,12,.28)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill(); }
    g.strokeStyle = lo; g.lineWidth = 4; g.strokeRect(20, 20, w - 40, h - 40); g.strokeStyle = hi; g.lineWidth = 2.4; g.strokeRect(14, 14, w - 28, h - 28); g.strokeRect(28, 28, w - 56, h - 56);
    for (const [x, y, sx, sy] of [[34, 34, 1, 1], [w - 34, 34, -1, 1], [34, h - 34, 1, -1], [w - 34, h - 34, -1, -1]]) { scroll(g, x, y, sx, sy, hi, 3); }
    g.fillStyle = hi; g.beginPath(); g.moveTo(w / 2, 96); g.lineTo(w / 2 + 16, 128); g.lineTo(w / 2, 160); g.lineTo(w / 2 - 16, 128); g.closePath(); g.globalAlpha = 0.5; g.fill();
  });
}
function lidTexture(theme) {
  if (theme === 'wood') return canvasTex(256, 256, (g, w, h) => {
    const n = 5; for (let i = 0; i < n; i++) { const y = (i * h) / n, bh = h / n; g.fillStyle = WOODS[i]; g.fillRect(0, y, w, bh);
      for (let k = 0; k < 22; k++) { g.strokeStyle = `rgba(30,14,5,${0.1 + Math.random() * 0.16})`; g.lineWidth = 1 + Math.random(); const yy = y + 3 + Math.random() * (bh - 6); g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + (Math.random() - 0.5) * 6, w * 0.7, yy + (Math.random() - 0.5) * 6, w, yy); g.stroke(); }
      g.fillStyle = 'rgba(12,6,2,.9)'; g.fillRect(0, y + bh - 3, w, 3); g.fillStyle = 'rgba(255,200,140,.16)'; g.fillRect(0, y, w, 3); }
  });
  const silver = theme === 'silver', c0 = silver ? '#6a849f' : '#961830', c1 = silver ? '#4c647e' : '#68102a';
  return canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, c1); gr.addColorStop(0.5, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = silver ? 'rgba(225,238,252,.45)' : 'rgba(255,205,90,.55)'; g.lineWidth = 2; for (const y of [26, h - 26]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
}
const trimTexture = (theme) => theme === 'wood' ? null : canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,40,0,.35)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) scroll(g, 14 + i * 28, 40 + (i % 2) * 26, 0.7, i % 2 ? -1 : 1, 'rgba(70,40,0,.4)', 2.4); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); });
const glowTex = () => canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const runeTex = (col) => canvasTex(512, 512, (g, w, h) => {
  g.translate(w / 2, h / 2); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 14;
  for (const [r, lw] of [[236, 6], [214, 2], [150, 3]]) { g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
  for (let i = 0; i < 36; i++) { g.save(); g.rotate((i / 36) * Math.PI * 2); g.lineWidth = 3; g.beginPath(); g.moveTo(0, -222); g.lineTo(0, -(i % 3 ? 232 : 246)); g.stroke(); if (i % 3 === 0) { g.fillRect(-4, -208, 8, 12); } g.restore(); }
  g.lineWidth = 3; for (const n of [3, 5]) { g.beginPath(); for (let i = 0; i <= n; i++) { const a = (i * (n === 5 ? 2 : 1) / n) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * 148, Math.sin(a) * 148); } g.stroke(); }
});

export function createChest3D(host, theme, glowHex) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  const P = PAL[theme] || PAL.wood, glow = new THREE.Color(glowHex || P.glow);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 'cfx-3d'; host.appendChild(cv);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  // окружение для бликов на металле: несколько ярких «софтбоксов»
  { const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene(); env.background = new THREE.Color(0x181220);
    for (const [x, y, z, s, k, c] of [[3, 4, 3, 3, 9, 0xfff0dc], [-4, 2, 2, 2.5, 6, 0xbcd8ff], [0, 5, -4, 4, 7, 0xffe0b0], [0, -3, 4, 5, 2, glow.getHex()], [5, 1, -2, 2, 5, 0xffffff]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); }
    scene.environment = pm.fromScene(env, 0.05).texture; pm.dispose(); }
  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a2418, 0.55));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(3, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(glow, 1.6); rim.position.set(-5, 3, -4); scene.add(rim);
  const inner = new THREE.PointLight(glow, 0, 6, 1.6); inner.position.set(0, 1.25, 0); scene.add(inner);

  const root = new THREE.Group(), tiltG = new THREE.Group(), chest = new THREE.Group(); scene.add(root); root.add(tiltG); tiltG.add(chest);
  const wood = theme === 'wood', bodyMat = new THREE.MeshStandardMaterial({ color: P.body, map: bodyTexture(theme), roughness: P.roughness, metalness: P.metal, envMapIntensity: 1.4 });
  const tmap = trimTexture(theme), trimMat = new THREE.MeshStandardMaterial({ color: P.trim, map: tmap, metalness: P.trimMet, roughness: P.trimRough, envMapIntensity: wood ? 1.1 : theme === 'silver' ? 1.5 : 2.2 });
  const lockMat = new THREE.MeshStandardMaterial({ color: P.lock, metalness: wood ? 0.55 : 0.9, roughness: wood ? 0.5 : 0.3, envMapIntensity: wood ? 1.2 : 2.4 });
  const gemMat = new THREE.MeshStandardMaterial({ color: P.gem, emissive: P.gem, emissiveIntensity: wood ? 0 : 1.1, roughness: 0.15, metalness: 0.1 });
  const box = (w, h, d, mat, x, y, z, par = chest) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); par.add(m); return m; };
  // корпус, нижний и верхний пояс, угловые стойки, ушки-кольца на торцах
  box(2.2, 1.0, 1.4, bodyMat, 0, 0.5, 0); box(2.34, wood ? 0.14 : 0.2, 1.54, trimMat, 0, wood ? 0.07 : 0.1, 0); box(2.3, wood ? 0.12 : 0.18, 1.5, trimMat, 0, 1.0, 0);
  if (wood) for (const x of [-0.74, 0.74]) box(0.2, 1.02, 1.46, trimMat, x, 0.5, 0);
  const cw = wood ? 0.3 : 0.24; for (const x of [-1.12, 1.12]) for (const z of [-0.72, 0.72]) box(cw, 1.12, cw, trimMat, x, 0.54, z);
  if (wood) for (const x of [-0.74, 0.74]) for (const y of [0.25, 0.78]) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lockMat); r.position.set(x, y, 0.75); chest.add(r); }
  for (const sd of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 22), lockMat); ring.rotation.y = Math.PI / 2; ring.position.set(sd * 1.22, 0.58, 0); chest.add(ring); box(0.06, 0.2, 0.2, lockMat, sd * 1.15, 0.7, 0); }
  // замочная накладка на корпусе: сталь с замочной скважиной (дерево), ромб с камнем (сталь, золото)
  if (wood) { box(0.42, 0.5, 0.1, lockMat, 0, 0.78, 0.76); box(0.12, 0.2, 0.05, new THREE.MeshStandardMaterial({ color: 0x0e0e10 }), 0, 0.78, 0.83); }
  else { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.1), lockMat); pl.rotation.z = Math.PI / 4; pl.position.set(0, 0.62, 0.76); chest.add(pl); const kh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x111111 })); kh.rotation.x = Math.PI / 2; kh.position.set(0, 0.62, 0.82); chest.add(kh); }
  // содержимое: монеты и самоцветы (видны, когда крышка откинута)
  const treasure = new THREE.Group(); chest.add(treasure);
  { const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.95, roughness: 0.25, emissive: 0xaa6a00, emissiveIntensity: 0.55 }), cg = new THREE.CylinderGeometry(0.13, 0.13, 0.035, 18), im = new THREE.InstancedMesh(cg, coinMat, 110), d = new THREE.Object3D();
    for (let i = 0; i < 110; i++) { const a = Math.random() * 6.28, r = Math.pow(Math.random(), 0.6); d.position.set(Math.cos(a) * r * 0.9, 1.0 + 0.06 + Math.random() * 0.2 * (1 - r * 0.7), Math.sin(a) * r * 0.5); d.rotation.set((Math.random() - 0.5) * 1.1, Math.random() * 6, (Math.random() - 0.5) * 1.1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    treasure.add(im);
    // кристаллы внутри: та же огранка, что и у игрового кристалла (8 граней, корона и острый павильон), голубой цвет
    const gp = [new THREE.Vector2(0.001, -0.98), new THREE.Vector2(1, 0), new THREE.Vector2(0.52, 0.46), new THREE.Vector2(0.001, 0.46)], ggeo = new THREE.LatheGeometry(gp, 8), gmat = new THREE.MeshStandardMaterial({ color: 0x4fc3ff, emissive: 0x1a7fd0, emissiveIntensity: 0.8, roughness: 0.12, metalness: 0.25, flatShading: true });
    for (const [x, z, sc] of [[-0.55, 0.1, 0.17], [0.3, -0.1, 0.2], [0.72, 0.2, 0.15], [-0.1, 0.25, 0.16], [0.05, -0.2, 0.14]]) { const g = new THREE.Mesh(ggeo, gmat); g.position.set(x, 1.2, z); g.scale.setScalar(sc); g.rotation.set(Math.random() * 0.6, Math.random() * 6, Math.random() * 0.6); treasure.add(g); } }
  const holeGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); holeGlow.rotation.x = -Math.PI / 2; holeGlow.position.y = 1.22; chest.add(holeGlow);
  // крышка на петле у задней кромки
  const lid = new THREE.Group(); lid.position.set(0, 1.05, -0.72); chest.add(lid);
  { const geo = new THREE.CylinderGeometry(0.74, 0.74, 2.2, 36, 1, false, 0, Math.PI); geo.rotateZ(Math.PI / 2); const lidMat = new THREE.MeshStandardMaterial({ color: P.body, map: lidTexture(theme), roughness: P.roughness, metalness: P.metal, envMapIntensity: 1.4, side: THREE.DoubleSide }); const m = new THREE.Mesh(geo, lidMat); m.position.z = 0.74; lid.add(m);
    const arch = (x, w, rad = 0.77) => { const g2 = new THREE.CylinderGeometry(rad, rad, w, 36, 1, true, 0, Math.PI); g2.rotateZ(Math.PI / 2); const mt = trimMat.clone(); mt.side = THREE.DoubleSide; const b = new THREE.Mesh(g2, mt); b.position.set(x, 0, 0.74); lid.add(b); };
    if (wood) { arch(-0.74, 0.2); arch(0.74, 0.2); arch(-1.12, 0.26, 0.78); arch(1.12, 0.26, 0.78); } else { arch(0, 0.46); arch(-0.78, 0.12); arch(0.78, 0.12); arch(-1.12, 0.2, 0.78); arch(1.12, 0.2, 0.78); }
    for (const sd of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(0.74, 36, 0, Math.PI), new THREE.MeshStandardMaterial({ map: bodyMat.map, roughness: P.roughness, metalness: P.metal, side: THREE.DoubleSide })); cap.rotation.y = sd * Math.PI / 2; cap.position.set(sd * 1.095, 0, 0.74); lid.add(cap); }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.3, wood ? 0.1 : 0.14, 0.1), trimMat); edge.position.set(0, 0.03, 1.48); lid.add(edge);
    if (wood) { const tab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.1), lockMat); tab.position.set(0, 0.2, 1.5); lid.add(tab); }
    else { const dp = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.1), lockMat); dp.rotation.z = Math.PI / 4; dp.position.set(0, 0.3, 1.5); dp.rotation.x = 0.4; lid.add(dp); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), gemMat); gem.scale.y = 1.5; gem.position.set(0, 0.32, 1.57); gem.rotation.x = 0.5; lid.add(gem); }
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 12), lockMat); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 0, 0); lid.add(hinge); }
  chest.position.set(0, 0, 0); chest.rotation.y = 0;
  // пол: магический круг и тень
  const circle = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), new THREE.MeshBasicMaterial({ map: runeTex('#' + glow.getHexString()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  circle.rotation.x = -Math.PI / 2; circle.position.y = -0.01; scene.add(circle);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.005; scene.add(shadow);
  // лучи света вверх
  const beams = new THREE.Group(); scene.add(beams);
  for (const [r, w] of [[-0.45, 0.28], [-0.2, 0.2], [0, 0.34], [0.2, 0.2], [0.45, 0.28]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 5.5), new THREE.MeshBasicMaterial({ map: glowTex(), color: glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.set(0, 3.7, 0); m.userData.r = r; beams.add(m); }
  // искры: пул спрайтов
  const gtex = glowTex(), sparks = [];
  for (let i = 0; i < 150; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: i % 3 ? 0xfff0b0 : glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; s.userData = { v: new THREE.Vector3(), life: 0, max: 1 }; scene.add(s); sparks.push(s); }
  let sparkI = 0;
  const emit = (n, speed, up, spread, pos = [0, 1.2, 0], life = 1.4, size = 0.22) => { for (let i = 0; i < n; i++) { const s = sparks[sparkI++ % sparks.length], a = Math.random() * 6.283, sp = speed * (0.35 + Math.random() * 0.8); s.position.set(pos[0] + (Math.random() - 0.5) * 0.4, pos[1], pos[2] + (Math.random() - 0.5) * 0.3); s.userData.v.set(Math.cos(a) * sp * spread, up * (0.5 + Math.random()), Math.sin(a) * sp * spread); s.userData.life = s.userData.max = life * (0.6 + Math.random() * 0.7); s.scale.setScalar(size * (0.5 + Math.random())); s.visible = true; } };

  // ───── состояние и кадр ─────
  const st = { mode: 'hidden', t: 0, y: 7, vy: 0, bounce: 0, spin: 0, lid: 0.02, lidV: 0, lift: 0, shake: 0, tx: 0, ty: 0, camShake: 0, flash: 0, dropDone: null, charge: 1.5, appear: 0 };
  let camD = 9; const setSize = () => { const w = host.clientWidth || 300, h = host.clientHeight || 300; renderer.setSize(w, h, false); cv.style.width = '100%'; cv.style.height = '100%'; camera.aspect = w / h; camD = Math.max(8.5, Math.min(15, 4.1 / (0.536 * camera.aspect))); camera.position.set(0, camD * 0.3, camD); camera.lookAt(0, 0.8, 0); camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(setSize); ro.observe(host); setSize();
  let raf = 0, last = performance.now(), alive = true;
  const frame = (now) => {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
    const m = st.mode;
    if (m === 'drop') {
      st.vy -= 26 * dt; st.y += st.vy * dt;
      if (st.y <= 0) { st.y = 0; if (Math.abs(st.vy) < 2.2 || st.bounce >= 2) { st.mode = 'idle'; st.t = 0; if (st.dropDone) st.dropDone(); } else { st.vy = -st.vy * 0.34; st.bounce++; st.camShake = 0.05 * (3 - st.bounce); } }
      chest.rotation.y += (0.35 - chest.rotation.y) * Math.min(1, dt * 6);
    } else if (m === 'idle') {
      chest.rotation.y = Math.sin(st.t * 0.9) * 0.5; st.y = Math.sin(st.t * 2.1) * 0.05; st.lid = 0.02 + Math.max(0, Math.sin(st.t * 2.4)) * 0.012;
      circle.material.opacity = Math.min(0.9, circle.material.opacity + dt * 1.2); if (Math.random() < dt * 14) emit(1, 0.25, 0.9, 1, [(Math.random() - 0.5) * 2, 0.3, (Math.random() - 0.5) * 1.2], 1.6, 0.1);
    } else if (m === 'charge') {
      const u = Math.min(1, st.t / st.charge), sp = 0.9 + ease.inn(u) * 17;
      st.spin += sp * dt; chest.rotation.y = st.spin; st.lift = ease.out(u) * 1.0; st.y = st.lift + Math.sin(st.t * 40) * 0.025 * u;
      st.shake = u * 0.07; chest.position.x = (Math.random() - 0.5) * st.shake; chest.position.z = (Math.random() - 0.5) * st.shake;
      st.lid = 0.02 + u * 0.13 * Math.abs(Math.sin(st.t * 31 + 1)) ; inner.intensity = ease.inn(u) * 10; holeGlow.material.opacity = u * 0.5; renderer.toneMappingExposure = 1.05 + u * 0.9;
      circle.rotation.z -= dt * (1 + u * 9); circle.material.opacity = 0.9 + u * 0.3; shadow.scale.setScalar(1 - u * 0.25);
      for (const b of beams.children) b.material.opacity = u * 0.55;
      if (Math.random() < dt * (20 + u * 120)) emit(1, 0.9, 1.2, 0.6, [(Math.random() - 0.5) * 2.4, 0.2, (Math.random() - 0.5) * 1.6], 1.2, 0.13);
    } else if (m === 'burst') {
      const k = 120, c = 10; st.lidV += (k * (2.0 - st.lid) - c * st.lidV) * dt; st.lid += st.lidV * dt;
      chest.rotation.y += (Math.round(chest.rotation.y / 6.2832) * 6.2832 - chest.rotation.y) * Math.min(1, dt * 5);
      st.lift += (0.35 - st.lift) * Math.min(1, dt * 3); st.y = st.lift; chest.position.x *= 0.8; chest.position.z *= 0.8;
      st.flash = Math.max(0, st.flash - dt * 1.6); inner.intensity = 3 + st.flash * 16; holeGlow.material.opacity = 0.45 + st.flash * 0.5; renderer.toneMappingExposure = 1.05 + st.flash * 1.4;
      circle.rotation.z -= dt * 1.2; for (const b of beams.children) b.material.opacity = Math.max(0.12, b.material.opacity - dt * 0.5);
      if (Math.random() < dt * 40) emit(1, 1.2, 4.2, 0.9, [(Math.random() - 0.5) * 1.6, 1.15, (Math.random() - 0.5) * 0.9], 1.5, 0.18);
    } else if (m === 'got') {
      st.lift += (0 - st.lift) * Math.min(1, dt * 2); st.y = st.lift; inner.intensity += (2 - inner.intensity) * dt * 2; renderer.toneMappingExposure += (1.05 - renderer.toneMappingExposure) * dt * 2;
      chest.rotation.y += (0.2 - chest.rotation.y) * Math.min(1, dt * 2); st.lid += (1.9 - st.lid) * dt * 3; holeGlow.material.opacity = 0.35;
      circle.rotation.z -= dt * 0.6; for (const b of beams.children) b.material.opacity = Math.max(0.05, b.material.opacity - dt * 0.3);
      if (Math.random() < dt * 10) emit(1, 0.5, 2.4, 0.5, [(Math.random() - 0.5) * 1.4, 1.2, 0], 1.6, 0.12);
    }
    chest.position.y = st.y; lid.rotation.x = -st.lid; tiltG.rotation.x += (st.tx - tiltG.rotation.x) * Math.min(1, dt * 8); tiltG.rotation.y += (st.ty - tiltG.rotation.y) * Math.min(1, dt * 8);
    shadow.position.x = 0; if (m !== 'charge') shadow.scale.setScalar(1 - Math.min(0.3, st.y * 0.2));
    // лучи смотрят на камеру
    for (const b of beams.children) { b.rotation.y = Math.atan2(camera.position.x, camera.position.z); b.rotation.z = -b.userData.r; b.position.x = Math.sin(b.userData.r) * -0.1; }
    for (const s of sparks) { if (!s.visible) continue; const u = s.userData; u.life -= dt; if (u.life <= 0) { s.visible = false; continue; } u.v.y -= 2.6 * dt; s.position.addScaledVector(u.v, dt); s.material.opacity = Math.min(1, u.life / u.max * 1.6); }
    st.camShake = Math.max(0, st.camShake - dt * 0.6); camera.position.x = (Math.random() - 0.5) * st.camShake; camera.position.y = camD * 0.3 + (Math.random() - 0.5) * st.camShake * 0.3;
    camera.lookAt(0, 0.8, 0); renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);
  return {
    canvas: cv,
    drop() { return new Promise((res) => { st.mode = 'drop'; st.t = 0; st.y = 7; st.vy = -2; st.bounce = 0; st.dropDone = res; }); },
    idle() { st.mode = 'idle'; st.t = 0; },
    charge(ms) { st.charge = ms / 1000; st.mode = 'charge'; st.t = 0; st.spin = chest.rotation.y; },
    burst() { st.mode = 'burst'; st.t = 0; st.lidV = 6; st.flash = 1; st.camShake = 0.35; emit(90, 2.2, 5.5, 1.1, [0, 1.2, 0], 1.7, 0.22); emit(30, 3.2, 3, 1.6, [0, 1.2, 0], 1.2, 0.3); },
    got() { st.mode = 'got'; st.t = 0; },
    tilt(x, y) { st.tx = x; st.ty = y; },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); }); } }); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); cv.remove(); },
  };
}
