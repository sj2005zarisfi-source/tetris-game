/* Cartoon art for the lawn-defence game (drawn with canvas, no images). Shared by the game and the hub preview. */
(function (G) {
'use strict';
const W = 960, H = 720, X0 = 50, Y0 = 100, CW = 95, CH = 118, COLS = 9, ROWS = 5, OUT = '#14310c', TAU = Math.PI * 2;
const BAR = { x: 8, y: -6, w: 536, h: 110 }, PK = { x0: 106, w: 62, step: 71, y: 8, h: 90 }, SHOVEL = { x: 552, y: -6, w: 84, h: 110 }, BANK = { x: 52, y: 50, r: 38 };

function ell(c, x, y, rx, ry, f, s, lw, rot) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, TAU); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw || 2; c.stroke(); } }
function rg(c, x, y, r, a, b) { const g = c.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r * 1.05); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function poly(c, pts, f, s, lw) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw || 2; c.lineJoin = 'round'; c.stroke(); } }
function limb(c, x1, y1, x2, y2, w, col) { c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function eye(c, x, y, r, px, py) { ell(c, x, y, r, r * 1.1, '#fff', '#222', 1.4); ell(c, x + px, y + py, r * .42, r * .5, '#111'); ell(c, x + px - r * .15, y + py - r * .22, r * .14, r * .14, '#fff'); }
function leaf(c, x, y, tx, ty, col) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + tx) / 2 - 6, (y + ty) / 2 - 12, tx, ty); c.quadraticCurveTo((x + tx) / 2 + 6, (y + ty) / 2 + 8, x, y); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(); }
function stem(c, x0, y0, x1, y1, cx, cy, w) { c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 4; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); c.strokeStyle = '#3f9a24'; c.lineWidth = w; c.stroke(); }

/* ---------------- plants (origin = centre of the tile) ---------------- */
function shooter(c, t, snow) {
  const sw = Math.sin(t * 3) * 1.6, hx = -6 + sw, hy = -14 + Math.sin(t * 3) * 1.2;
  stem(c, -2, 54, hx, hy + 14, -10, 30, 7); leaf(c, -3, 52, -36, 42, '#45a82a'); leaf(c, 1, 54, 32, 44, '#3a9422');
  if (snow) { for (let i = 0; i < 5; i++) { const a = Math.PI * (.6 + i * .2); poly(c, [[hx + Math.cos(a) * 18, hy + Math.sin(a) * 18], [hx + Math.cos(a - .18) * 40, hy + Math.sin(a - .18) * 40 - 4], [hx + Math.cos(a + .2) * 22, hy + Math.sin(a + .2) * 22]], '#bfeaff', '#2d86c9', 1.6); } }
  else { leaf(c, hx - 4, hy - 18, hx - 20, hy - 44, '#59b52e'); leaf(c, hx + 2, hy - 20, hx + 6, hy - 46, '#4aa326'); }
  ell(c, hx, hy, 24, 22, rg(c, hx, hy, 24, snow ? '#e8faff' : '#c9f367', snow ? '#4ba8e8' : '#4a9a1a'), OUT, 2.6);
  ell(c, hx + 25, hy - 4, 17, 15, rg(c, hx + 25, hy - 4, 17, snow ? '#d3f2ff' : '#b6ea4a', snow ? '#3f9ade' : '#478f17'), OUT, 2.6);
  ell(c, hx + 38, hy - 4, 6, 11, '#16260e', OUT, 1.5); eye(c, hx + 6, hy - 9, 7.5, 2, 0);
}
function sunflower(c, t) {
  const sw = Math.sin(t * 2) * 1.5, hy = -18;
  stem(c, 0, 56, sw, hy + 16, -6, 30, 7); leaf(c, 0, 52, -34, 44, '#45a82a'); leaf(c, 2, 54, 34, 46, '#3a9422');
  for (let k = 0; k < 2; k++) for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + t * .1 + k * .22, r = 30 - k * 3; ell(c, Math.cos(a) * r + sw, hy + Math.sin(a) * r, 13, 7, k ? '#ffd21f' : '#ffb400', '#b86a00', 1.4, a); }
  ell(c, sw, hy, 23, 23, rg(c, sw, hy, 23, '#b9743a', '#4e2a0c'), OUT, 2.6);
  ell(c, sw - 8, hy - 5, 3.2, 5, '#1a0d03'); ell(c, sw + 8, hy - 5, 3.2, 5, '#1a0d03'); ell(c, sw - 8, hy - 7, 1, 1.4, '#fff'); ell(c, sw + 8, hy - 7, 1, 1.4, '#fff');
  c.strokeStyle = '#1a0d03'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.arc(sw, hy + 3, 9, .25, Math.PI - .25); c.stroke();
}
function cherry(c, t, fuse) {
  const s = 1 + (fuse || 0) * .28 + Math.sin(t * 20) * (fuse ? .03 : 0); c.save(); c.scale(s, s);
  c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 8; c.beginPath(); c.moveTo(-18, -8); c.quadraticCurveTo(-14, -36, 2, -44); c.moveTo(18, -6); c.quadraticCurveTo(16, -34, 2, -44); c.stroke();
  c.strokeStyle = '#3f9a24'; c.lineWidth = 4.5; c.stroke(); leaf(c, 2, -44, 26, -52, '#4aa326');
  [[-18, 10], [18, 12]].forEach(([x, y], i) => {
    ell(c, x, y, 23, 23, rg(c, x, y, 23, '#ff7878', '#a40e1b'), OUT, 2.6); eye(c, x - 6, y - 3, 6, 1.5, 0); eye(c, x + 6, y - 3, 6, 1.5, 0);
    c.strokeStyle = '#111'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - 12, y - 11); c.lineTo(x - 2, y - 7); c.moveTo(x + 12, y - 11); c.lineTo(x + 2, y - 7); c.stroke();
    ell(c, x, y + 11, 6, 3.4 + (fuse ? 2 : 0), '#4a0710');
  });
  c.restore();
}
function wallnut(c, t, hf) {
  c.save(); c.rotate(Math.sin(t * 1.6) * .025 + (hf < .33 ? .05 : 0));
  ell(c, 0, 4, 33, 45, rg(c, 0, 4, 45, '#e4b062', '#86561b'), OUT, 3);
  c.strokeStyle = 'rgba(255,235,190,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(-4, 2, 30, Math.PI * 1.05, Math.PI * 1.45); c.stroke();
  eye(c, -11, -10, 8, 1.5, 1); eye(c, 8, -10, 8, 1.5, 1);
  c.strokeStyle = '#3a2208'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(0, 8, 8, .3, Math.PI - .3); c.stroke();
  c.strokeStyle = '#40260a'; c.lineWidth = 2.4;
  if (hf < .66) { c.beginPath(); c.moveTo(-6, -30); c.lineTo(-12, -20); c.lineTo(-6, -12); c.lineTo(-14, -2); c.stroke(); }
  if (hf < .33) { c.beginPath(); c.moveTo(14, -24); c.lineTo(8, -14); c.lineTo(18, -4); c.lineTo(10, 8); c.stroke(); c.beginPath(); c.moveTo(-18, 20); c.lineTo(-6, 26); c.lineTo(-12, 36); c.stroke(); }
  c.restore();
}
function potato(c, t, armed, arm) {
  if (!armed) { const k = .55 + .1 * Math.sin(t * 3); ell(c, 0, 38, 30, 14, rg(c, 0, 38, 30, '#9a7640', '#5b3f1a'), OUT, 2.4); ell(c, -8, 34, 4, 2, '#4a3214'); ell(c, 12, 40, 5, 2.5, '#4a3214'); if (arm > 0) { c.strokeStyle = '#7a8a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 28); c.lineTo(0, 22 - arm * 4); c.stroke(); } return; }
  ell(c, 0, 30, 36, 21, rg(c, 0, 30, 36, '#d3a55a', '#7a5224'), OUT, 3);
  c.strokeStyle = '#d5d8dc'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -10); c.stroke(); c.strokeStyle = '#555'; c.lineWidth = 1; c.stroke();
  const on = Math.sin(t * 6) > 0; ell(c, 0, -14, 7, 7, on ? rg(c, 0, -14, 7, '#ff9a9a', '#e0121f') : '#7a1018', '#400', 1.6);
  eye(c, -11, 24, 5.5, 1, 0); eye(c, 8, 24, 5.5, 1, 0); c.strokeStyle = '#2a1a08'; c.lineWidth = 2; c.beginPath(); c.arc(-1, 34, 6, .3, Math.PI - .3); c.stroke();
}
function plant(c, type, t, o) {
  o = o || {};
  if (type === 'peashooter') shooter(c, t, false); else if (type === 'snowpea') shooter(c, t, true);
  else if (type === 'sunflower') sunflower(c, t); else if (type === 'cherry') cherry(c, t, o.fuse);
  else if (type === 'wallnut') wallnut(c, t, o.hf == null ? 1 : o.hf); else if (type === 'potato') potato(c, t, o.armed, o.arm);
}

/* ---------------- zombies (origin = feet, facing left) ---------------- */
function zombie(c, type, t, o) {
  o = o || {}; const eat = o.eat, p = t * (type === 'pole' && !o.jumped ? 6.5 : 3.4), sh = type === 'pole' && !o.jumped ? 14 : 8;
  c.save();
  if (o.dead) { const k = Math.min(1, o.dead); c.translate(0, 0); c.rotate(k * 1.45); c.globalAlpha = 1 - Math.max(0, k - .6) * 2.5; }
  if (o.jump != null) { c.translate(0, -Math.sin(Math.PI * o.jump) * 78); c.rotate(-Math.sin(Math.PI * o.jump) * .35); }
  const bob = eat ? Math.sin(t * 9) * 2.5 : Math.abs(Math.sin(p)) * 2, lean = eat ? -5 : 0;
  c.translate(lean, 0);
  // legs
  const f1 = Math.sin(p) * sh, f2 = Math.sin(p + Math.PI) * sh, lift1 = Math.max(0, Math.cos(p)) * 5, lift2 = Math.max(0, -Math.cos(p)) * 5;
  const pants = '#56638a';
  limb(c, 4, -38, 6 + f2, -lift2 - 4, 13, pants); ell(c, 4 + f2 - 5, -lift2 - 3, 13, 6, '#3a2a1a', OUT, 2);
  limb(c, -6, -38, -4 + f1, -lift1 - 4, 13, pants); ell(c, -4 + f1 - 5, -lift1 - 3, 13, 6, '#3a2a1a', OUT, 2);
  // back arm
  limb(c, 6, -70 + bob, 12, -48 + bob, 9, '#8aa57e');
  // torso
  const tor = type === 'pole' ? '#c62b2b' : '#7b5236';
  c.save(); c.translate(0, bob); poly(c, [[-16, -74], [16, -74], [18, -38], [-16, -38]], tor, OUT, 2.6);
  if (type !== 'pole') { poly(c, [[-3, -74], [8, -74], [6, -46], [-4, -46]], '#ddd8c8', OUT, 1.6); poly(c, [[0, -72], [5, -72], [6, -52], [2, -46], [-2, -52]], '#c0262b', OUT, 1.4); poly(c, [[-16, -74], [-3, -74], [-8, -58]], '#9a6a46', OUT, 1.2); }
  else { ell(c, 0, -72, 16, 4, '#8aa57e'); ell(c, 0, -60, 7, 7, '#fff', null); c.fillStyle = '#c62b2b'; c.font = 'bold 9px Arial'; c.textAlign = 'center'; c.fillText('D', 0, -57); }
  c.restore();
  // head
  const hx = -6 + lean * .3, hy = -90 + bob + (eat ? Math.sin(t * 9 + 1) * 1.5 : 0);
  ell(c, hx + 4, hy + 18, 6, 7, '#9fb894', OUT, 1.6);
  ell(c, hx, hy, 18, 20, rg(c, hx, hy, 20, '#c7d8b8', '#8aa57e'), OUT, 2.6);
  c.strokeStyle = '#2a2a1a'; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(hx - 6 + i * 4, hy - 18); c.lineTo(hx - 8 + i * 4 - 2, hy - 26 - (i % 2) * 3); c.stroke(); }
  if (type === 'pole') { ell(c, hx, hy - 12, 18, 7, '#e8c64a'); c.fillStyle = '#2d4fb8'; c.fillRect(hx - 18, hy - 7, 36, 6); c.strokeStyle = OUT; c.lineWidth = 1.5; c.strokeRect(hx - 18, hy - 7, 36, 6); }
  eye(c, hx - 8, hy - 3, 7, -2, 1); eye(c, hx + 5, hy - 2, 6, -2, 1);
  c.fillStyle = '#2a1008'; c.beginPath(); c.moveTo(hx - 11, hy + 9); c.quadraticCurveTo(hx - 3, hy + 17 + (eat ? Math.abs(Math.sin(t * 9)) * 4 : 0), hx + 8, hy + 8); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = '#f2ecd6'; c.fillRect(hx - 8, hy + 9, 3, 4); c.fillRect(hx - 2, hy + 9, 3, 4); c.fillRect(hx + 4, hy + 8, 3, 3.5);
  // hats
  if (type === 'cone' && o.hat) { poly(c, [[hx - 16, hy - 12], [hx + 16, hy - 12], [hx + 1, hy - 50]], '#f08a1a', OUT, 2.4); poly(c, [[hx - 10, hy - 24], [hx + 10, hy - 24], [hx + 7, hy - 32], [hx - 7, hy - 32]], '#fff', null); poly(c, [[hx - 16, hy - 12], [hx + 16, hy - 12], [hx + 14, hy - 17], [hx - 14, hy - 17]], '#fff'); }
  if (type === 'bucket' && o.hat) { poly(c, [[hx - 17, hy - 8], [hx + 17, hy - 8], [hx + 14, hy - 42], [hx - 14, hy - 42]], '#9aa3ab', OUT, 2.4); ell(c, hx, hy - 42, 14, 4, '#c6ccd2', OUT, 1.6); c.strokeStyle = '#6a737b'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx - 16, hy - 20); c.lineTo(hx + 16, hy - 20); c.moveTo(hx - 15, hy - 32); c.lineTo(hx + 15, hy - 32); c.stroke(); }
  // flag
  if (type === 'flag') { c.strokeStyle = '#7a5a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(18, -4); c.lineTo(18, -128); c.stroke(); const w2 = Math.sin(t * 6) * 4; c.beginPath(); c.moveTo(18, -126); c.quadraticCurveTo(34, -130 + w2, 52, -122); c.quadraticCurveTo(36, -114 - w2, 52, -104); c.quadraticCurveTo(34, -108 + w2, 18, -102); c.closePath(); c.fillStyle = '#c62b2b'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.8; c.stroke(); ell(c, 32, -114, 7, 6, '#f0a0b0', '#7a2a3a', 1.2); }
  // front arm (reaching)
  const ah = bob + (eat ? Math.sin(t * 9) * 3 : 0), lost = o.armLost, ex = -26 + Math.sin(p) * 2, ey = -64 + ah;
  limb(c, -12, -68 + bob, ex, ey, 11, tor);
  if (!lost) { limb(c, ex, ey, ex - 20, ey - 2 + (eat ? -6 : 0), 8, '#9fb894'); ell(c, ex - 24, ey - 2 + (eat ? -6 : 0), 6, 5.5, '#9fb894', OUT, 1.6); }
  if (type === 'pole' && !o.jumped) { c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(-60, -66); c.lineTo(48, -74); c.stroke(); c.strokeStyle = '#e6d6a8'; c.lineWidth = 3.4; c.stroke(); }
  if (type === 'pole' && o.jump != null) { c.strokeStyle = '#e6d6a8'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-40, 78); c.lineTo(-30, -60); c.stroke(); }
  if (o.slow > 0) { ell(c, -4, -60, 30, 62, 'rgba(120,200,255,.28)'); }
  c.restore();
}

/* ---------------- small things ---------------- */
function sun(c, x, y, r, t) {
  c.save(); c.translate(x, y); const g = c.createRadialGradient(0, 0, r * .3, 0, 0, r * 1.7); g.addColorStop(0, 'rgba(255,240,120,.9)'); g.addColorStop(.5, 'rgba(255,200,40,.28)'); g.addColorStop(1, 'rgba(255,200,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.7, 0, TAU); c.fill();
  c.rotate(t * .7); for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); poly(c, [[r * .78, -r * .13], [r * 1.38, 0], [r * .78, r * .13]], '#ffc400', '#d88a00', 1.2); }
  ell(c, 0, 0, r, r, rg(c, 0, 0, r, '#fffbb8', '#ffb000'), '#d88a00', 2); c.restore();
}
function pea(c, x, y, snow) { ell(c, x, y, 9, 9, rg(c, x, y, 9, snow ? '#e6faff' : '#c8f26a', snow ? '#3d9fe0' : '#3e8f16'), snow ? '#1f6fae' : OUT, 1.8); ell(c, x - 3, y - 3, 2.6, 2.6, 'rgba(255,255,255,.7)'); }
function mower(c, x, y, t, moving) {
  c.save(); c.translate(x, y); if (moving) c.translate(0, Math.sin(t * 40) * 1);
  limb(c, -22, -8, -38, -30, 4, '#555'); limb(c, -38, -30, -30, -34, 4, '#333');
  c.beginPath(); c.roundRect ? c.roundRect(-26, -22, 52, 26, 7) : c.rect(-26, -22, 52, 26); c.fillStyle = '#c4202a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke();
  c.fillStyle = '#e8585e'; c.fillRect(-20, -18, 32, 6); ell(c, 8, -26, 8, 5, '#aaa', '#333', 1.6);
  [[-16, 6], [16, 6]].forEach(([wx, wy]) => { ell(c, wx, wy, 11, 11, '#222', '#000', 2); ell(c, wx, wy, 5, 5, '#888'); });
  c.restore();
}
function shovel(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.rotate(.6); c.fillStyle = '#7a4a1a'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.rect(-3.5, -34, 7, 40); c.fill(); c.stroke(); c.fillStyle = '#7a4a1a'; c.beginPath(); c.rect(-12, -38, 24, 7); c.fill(); c.stroke(); poly(c, [[-13, 6], [13, 6], [11, 34], [0, 42], [-11, 34]], '#c9ced3', OUT, 2.4); c.restore(); }
function cartoonText(c, s, x, y, size, fill, stroke) { c.font = `900 ${size}px Impact,"Arial Black",Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size * .22; c.strokeStyle = stroke || '#000'; c.strokeText(s, x, y); c.fillStyle = fill || '#fff'; c.fillText(s, x, y); }

/* ---------------- static background + seed bar frame ---------------- */
function bg(c) {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2f7a1f'); g.addColorStop(1, '#3a9227'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // stone path right + bottom
  c.fillStyle = '#d8d2c0'; c.fillRect(X0 + COLS * CW, 40, W - X0 - COLS * CW, H); c.fillRect(0, Y0 + ROWS * CH, W, H - Y0 - ROWS * CH);
  c.strokeStyle = 'rgba(120,110,90,.55)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(X0 + COLS * CW, 70 + i * 74); c.lineTo(W, 74 + i * 74); c.stroke(); } for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(i * 84 + 20, Y0 + ROWS * CH); c.lineTo(i * 84 + 28, H); c.stroke(); }
  // sky + fence (top right)
  g = c.createLinearGradient(0, 0, 0, 60); g.addColorStop(0, '#7fc4ff'); g.addColorStop(1, '#cfe9ff'); c.fillStyle = g; c.fillRect(780, 0, 180, 52); ell(c, 880, 18, 36, 12, '#fff'); ell(c, 905, 14, 24, 10, '#fff');
  for (let i = 0; i < 9; i++) { const x = 640 + i * 36; poly(c, [[x, 96], [x, 24], [x + 14, 10], [x + 28, 24], [x + 28, 96]], '#f4f1ea', '#8a8576', 2.2); } c.fillStyle = '#e6e2d4'; c.fillRect(640, 44, 300, 8); c.fillRect(640, 70, 300, 8); c.strokeStyle = '#8a8576'; c.lineWidth = 1.5; c.strokeRect(640, 44, 300, 8); c.strokeRect(640, 70, 300, 8);
  c.fillStyle = '#2a6a1a'; c.fillRect(0, 92, W, 12);
  // lawn tiles
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { c.fillStyle = (r + q) % 2 ? '#47b533' : '#3ea32c'; c.fillRect(X0 + q * CW, Y0 + r * CH, CW + .5, CH + .5); }
  c.fillStyle = '#3ea32c'; c.fillRect(0, Y0, X0, ROWS * CH);
  // clovers
  for (let i = 0; i < 520; i++) { const x = rnd() * (COLS * CW + X0), y = Y0 + rnd() * ROWS * CH; c.fillStyle = rnd() < .5 ? 'rgba(26,110,20,.35)' : 'rgba(120,220,90,.3)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + Math.cos(k * 2.1) * 3.4, y + Math.sin(k * 2.1) * 3.4, 3, 0, TAU); c.fill(); } }
  // soft vignette on lawn edge
  g = c.createLinearGradient(0, Y0 + ROWS * CH - 22, 0, Y0 + ROWS * CH); g.addColorStop(0, 'rgba(0,60,0,0)'); g.addColorStop(1, 'rgba(0,60,0,.35)'); c.fillStyle = g; c.fillRect(0, Y0 + ROWS * CH - 22, X0 + COLS * CW, 22);
  bar(c);
}
function bar(c) {
  const wood = (x, y, w, h) => { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9a5a2a'); g.addColorStop(.5, '#7a4219'); g.addColorStop(1, '#5a2f10'); c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 14) : c.rect(x, y, w, h); c.fill(); c.strokeStyle = '#2e1606'; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(255,200,140,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 8, y + h - 8); c.lineTo(x + 8, y + 10); c.stroke(); };
  wood(BAR.x, BAR.y, BAR.w, BAR.h); wood(SHOVEL.x, SHOVEL.y, SHOVEL.w, SHOVEL.h);
  ell(c, BANK.x, BANK.y - 4, BANK.r + 4, BANK.r + 4, '#fff6c8', '#5a2f10', 3); ell(c, BANK.x, BANK.y - 4, BANK.r - 3, BANK.r - 3, '#e8dba0');
  c.fillStyle = '#6a3a14'; c.fillRect(26, 80, 52, 22); c.fillStyle = '#f4efd8'; c.beginPath(); c.roundRect ? c.roundRect(22, 76, 60, 26, 6) : c.rect(22, 76, 60, 26); c.fill(); c.strokeStyle = '#5a2f10'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = '#5b3414'; c.fillRect(SHOVEL.x + 10, SHOVEL.y + 12, SHOVEL.w - 20, SHOVEL.h - 24);
}
G.PVZ = { W, H, X0, Y0, CW, CH, COLS, ROWS, BAR, PK, SHOVEL, BANK, ell, poly, rg, plant, zombie, sun, pea, mower, shovel, cartoonText, bg, bar, leaf };
})(typeof window !== 'undefined' ? window : globalThis);
