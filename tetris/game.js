(() => {
'use strict';

/* ================= constants ================= */
const COLS = 10, ROWS = 20, SIZE = 30, W = COLS * SIZE, H = ROWS * SIZE;

// darker, slightly muted brick colours
const COLORS = {I:'#1b9bb0', O:'#bf9a17', T:'#7a55bd', S:'#37a06a', Z:'#b53a3a', J:'#3560bb', L:'#c87825'};
// brighter colours for the floating background blocks
const BG_COLORS = ['#2ad4c3','#b77ad8','#e0414f','#f2c230','#3b78e0','#f08a2a','#5fd06a'];

const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O:[[1,1],[1,1]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]]
};

// NES-style gravity: frames per row at 60fps, indexed by level-1
const FRAMES = [48,43,38,33,28,23,18,13,8,6,5,5,5,4,4,4,3,3,3,2,2,2,2,2,2,2,2,2,2,1];
const LINE_POINTS = [0, 40, 100, 300, 1200];          // x level  (points come ONLY from cleared lines)
const NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'];
const LINES_PER_LEVEL = 10;
const MAX_START_LEVEL = 15;

const LOCK_MS = 500, LOCK_MS_SOFT = 150, MAX_LOCK_RESETS = 15;
const DAS = 170, ARR = 55, SOFT_MS = 40, CLEAR_MS = 450;

/* ================= helpers / DOM ================= */
const $ = id => document.getElementById(id);
const pad = (n, l) => String(n).padStart(l, '0');
const ctx = $('board').getContext('2d');
const hctx = $('hold').getContext('2d');
const nctx = $('next').getContext('2d');
const overlay = $('overlay'), frame = $('frame'), toastEl = $('toast');

const shadeCache = {};
function shade(hex, p) {
  const key = hex + p;
  if (shadeCache[key]) return shadeCache[key];
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, k = Math.abs(p);
  r = Math.round((t - r) * k + r); g = Math.round((t - g) * k + g); b = Math.round((t - b) * k + b);
  return (shadeCache[key] = `rgb(${r},${g},${b})`);
}

/* ================= state ================= */
let board, piece, held, canHold, queue, bag;
let score = 0, lines = 0, level = 1, startLevel = 1;
let best = +(localStorage.getItem('tetris-best-v2') || 0);
let state = 'idle';                       // idle | playing | paused | clearing | over
let elapsed = 0, lastSec = -1;
let gravAcc = 0, lockTimer = 0, lockResets = 0, lowestY = 0;
let clearRows = [], clearTimer = 0;
let softHeld = false;
let lastTime = 0, clock = 0;

const emptyBoard = () => Array.from({length: ROWS}, () => Array(COLS).fill(null));
const rotCW  = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
const rotCCW = m => m[0].map((_, i) => m.map(r => r[r.length - 1 - i]));
const gravityMs = () => FRAMES[Math.min(level, FRAMES.length) - 1] * 1000 / 60;

/* ================= audio ================= */
let actx = null, muted = localStorage.getItem('tetris-muted') === '1';
function audio() {
  if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function bell(freq, t0, vol, dur) {
  const a = actx;
  const master = a.createGain();
  master.gain.value = vol;
  master.connect(a.destination);
  // glassy / metallic partials, higher ones die faster
  [[1, 1], [2.76, .55], [5.4, .3], [8.93, .15]].forEach(([mul, g], i) => {
    const o = a.createOscillator(), og = a.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(g, t0 + .004);
    og.gain.exponentialRampToValueAtTime(.0001, t0 + dur / (1 + i * .9));
    o.connect(og); og.connect(master);
    o.start(t0); o.stop(t0 + dur + .05);
  });
}
function chime() {                                // "jingle" for a TETRIS
  if (muted) return;
  const a = audio(); if (!a) return;
  const t = a.currentTime + .01;
  [1318.5, 1568, 1975.5, 2637, 3136, 3951].forEach((f, i) => bell(f, t + i * .065, .1, 1.9));
}
function setMuted(m) {
  muted = m; localStorage.setItem('tetris-muted', m ? '1' : '0');
  $('bSound').textContent = m ? 'MUTED' : 'SOUND';
}

/* ================= game logic ================= */
function refill() {
  const t = Object.keys(SHAPES);
  for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
  bag.push(...t);
}
function nextType() {
  while (queue.length < 2) { if (!bag.length) refill(); queue.push(bag.shift()); }
  return queue.shift();
}
function spawn(type) {
  type = type || nextType();
  const m = SHAPES[type].map(r => [...r]);
  piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
  gravAcc = 0; lockTimer = 0; lockResets = 0; lowestY = piece.y;
  while (queue.length < 2) { if (!bag.length) refill(); queue.push(bag.shift()); }
  if (collide(piece.m, piece.x, piece.y)) gameOver();
}
function collide(m, x, y) {
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  return false;
}
const onGround = () => collide(piece.m, piece.x, piece.y + 1);
function ghostY() { let y = piece.y; while (!collide(piece.m, piece.x, y + 1)) y++; return y; }
function nudgeLock() { if (onGround() && lockResets < MAX_LOCK_RESETS) { lockTimer = 0; lockResets++; } }
function descend() {
  piece.y++; lockTimer = 0;
  if (piece.y > lowestY) { lowestY = piece.y; lockResets = 0; }
}

function lockPiece() {
  let out = false;
  piece.m.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    const y = piece.y + r;
    if (y < 0) out = true; else board[y][piece.x + c] = piece.type;
  }));
  piece = null;
  if (out) return gameOver();
  canHold = true;
  const rows = [];
  for (let r = 0; r < ROWS; r++) if (board[r].every(Boolean)) rows.push(r);
  if (rows.length) {
    state = 'clearing'; clearRows = rows; clearTimer = 0;
    if (rows.length === 4) { chime(); shake(); }
  } else spawn();
}
function finishClear() {
  const n = clearRows.length;
  for (const r of clearRows) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); }
  const gained = LINE_POINTS[n] * level;
  score += gained; lines += n;
  let msg = NAMES[n] + '  +' + gained;
  const newLevel = startLevel + Math.floor(lines / LINES_PER_LEVEL);
  if (newLevel > level) { level = newLevel; msg += '\nLEVEL ' + pad(level, 2); }
  toast(msg, n === 4);
  clearRows = []; state = 'playing';
  updateHUD();
  spawn();
}

function move(dx) {
  if (state !== 'playing') return;
  if (!collide(piece.m, piece.x + dx, piece.y)) { piece.x += dx; nudgeLock(); }
}
function rotate(dir) {
  if (state !== 'playing' || piece.type === 'O') return;
  const m = dir > 0 ? rotCW(piece.m) : rotCCW(piece.m);
  for (const [dx, dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]]) {
    if (!collide(m, piece.x + dx, piece.y + dy)) { piece.m = m; piece.x += dx; piece.y += dy; nudgeLock(); return; }
  }
}
function hardDrop() {
  if (state !== 'playing') return;
  piece.y = ghostY();
  lockPiece();
}
function holdPiece() {
  if (state !== 'playing' || !canHold) return;
  const cur = piece.type;
  if (held) spawn(held); else spawn();
  held = cur; canHold = false;
}

function updateHUD() {
  if (score > best) { best = score; localStorage.setItem('tetris-best-v2', best); }
  $('score').textContent = pad(score, 7);
  $('lines').textContent = 'LINES-' + pad(lines, 3);
  $('level').textContent = pad(level, 2);
  $('best').textContent = pad(best, 7);
}
function updateTime() {
  const s = Math.floor(elapsed / 1000);
  if (s === lastSec) return;
  lastSec = s;
  $('time').textContent = pad(Math.floor(s / 60) % 100, 2) + ':' + pad(s % 60, 2);
}
function toast(text, big) {
  toastEl.textContent = text;
  toastEl.className = 'toast' + (big ? ' big' : '');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
}
function shake() { frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake'); }

function showOverlay(title, text, btn, opts) {
  $('ovTitle').textContent = title;
  $('ovText').textContent = text;
  $('startBtn').textContent = btn;
  $('lvWrap').style.display = opts && opts.level ? '' : 'none';
  $('ovRules').style.display = opts && opts.rules ? '' : 'none';
  overlay.classList.remove('hidden');
}
function reset() {
  board = emptyBoard(); held = null; canHold = true; queue = []; bag = []; piece = null;
  score = 0; lines = 0; elapsed = 0; lastSec = -1; clearRows = [];
  level = startLevel;
  updateHUD(); updateTime();
}
function start() {
  audio();
  startLevel = +$('startLevel').value || 1;
  reset();
  state = 'playing';
  overlay.classList.add('hidden');
  spawn();
}
function gameOver() {
  state = 'over'; piece = null; releaseAll();
  const rec = score > 0 && score >= best;
  showOverlay('GAME OVER', `امتیاز: ${score} · خط‌ها: ${lines} · سطح: ${level}` + (rec ? '\n🏆 رکورد جدید!' : ''), 'بازی دوباره', {level: true});
  $('ovText').style.whiteSpace = 'pre-line';
}
function togglePause() {
  if (state === 'playing') {
    releaseAll(); state = 'paused';
    showOverlay('PAUSE', 'برای ادامه دکمه را بزنید', 'ادامه');
  } else if (state === 'paused') {
    state = 'playing'; overlay.classList.add('hidden');
  }
}

/* ================= input (keyboard + touch share this) ================= */
const active = {};                        // source -> {a, t, i}
function fire(a) {
  audio();
  if (state !== 'playing') return;
  switch (a) {
    case 'left': move(-1); break;
    case 'right': move(1); break;
    case 'down': if (!onGround()) { descend(); gravAcc = 0; } break;
    case 'rotate': rotate(1); break;
    case 'rotateCCW': rotate(-1); break;
    case 'hard': hardDrop(); break;
    case 'hold': holdPiece(); break;
  }
}
function release(src) {
  const r = active[src]; if (!r) return;
  clearTimeout(r.t); clearInterval(r.i); delete active[src];
  softHeld = Object.values(active).some(x => x.a === 'down');
}
function press(src, a) {
  release(src);
  if (a === 'left' || a === 'right') {
    const opp = a === 'left' ? 'right' : 'left';
    Object.keys(active).forEach(k => { if (active[k].a === opp) release(k); });
  }
  const rec = active[src] = { a };
  fire(a);
  if (a === 'left' || a === 'right') rec.t = setTimeout(() => { rec.i = setInterval(() => fire(a), ARR); }, DAS);
  softHeld = Object.values(active).some(x => x.a === 'down');
}
function releaseAll() { Object.keys(active).forEach(release); softHeld = false; }

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down' };
document.addEventListener('keydown', e => {
  audio();
  const k = e.key;
  if ((k === 'Enter') && (state === 'idle' || state === 'over')) { start(); return; }
  if ((k === 'Enter') && state === 'paused') { togglePause(); return; }
  if (KEYS[k]) { e.preventDefault(); if (!e.repeat) press('k:' + k, KEYS[k]); return; }
  if (e.repeat && k !== ' ') return;
  switch (k) {
    case 'ArrowUp': case 'x': case 'X': e.preventDefault(); fire('rotate'); break;
    case 'z': case 'Z': fire('rotateCCW'); break;
    case ' ': e.preventDefault(); if (!e.repeat) fire('hard'); break;
    case 'c': case 'C': case 'Shift': fire('hold'); break;
    case 'p': case 'P': case 'Escape': togglePause(); break;
    case 'm': case 'M': setMuted(!muted); break;
  }
});
document.addEventListener('keyup', e => { if (KEYS[e.key]) release('k:' + e.key); });
window.addEventListener('blur', () => { releaseAll(); if (state === 'playing') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseAll(); if (state === 'playing') togglePause(); } });
document.addEventListener('contextmenu', e => e.preventDefault());

$('startBtn').addEventListener('click', () => { if (state === 'paused') togglePause(); else start(); });

// ---- on-screen controls ----
function bindBtn(el, onDown, onUp) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.classList.add('pressed'); onDown();
  });
  const up = () => { el.classList.remove('pressed'); if (onUp) onUp(); };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
bindBtn($('bRot'), () => fire('rotate'));
bindBtn($('bFast'), () => press('btnFast', 'down'), () => release('btnFast'));
bindBtn($('bHold'), () => fire('hold'));
bindBtn($('bPause'), () => togglePause());
bindBtn($('bSound'), () => setMuted(!muted));

// NES style D-pad: slide your thumb between directions
const dpad = $('dpad');
let dpDir = null, dpId = null;
function dirFrom(e) {
  const r = dpad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * .1) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
}
function setDir(d) {
  if (d === dpDir) return;
  release('dpad');
  dpDir = d;
  dpad.className = 'dpad' + (d ? ' on-' + d : '');
  if (!d) return;
  if (d === 'up') fire('rotate');           // up = rotate
  else press('dpad', d);                    // left/right move, down = fast (not instant) fall
}
dpad.addEventListener('pointerdown', e => {
  e.preventDefault(); dpId = e.pointerId;
  try { dpad.setPointerCapture(e.pointerId); } catch (_) {}
  setDir(dirFrom(e));
});
dpad.addEventListener('pointermove', e => { if (e.pointerId === dpId) setDir(dirFrom(e)); });
const dpUp = e => { if (e.pointerId === dpId) { dpId = null; setDir(null); } };
dpad.addEventListener('pointerup', dpUp);
dpad.addEventListener('pointercancel', dpUp);

/* ================= drawing ================= */
function drawCell(c, x, y, color, size, alpha) {
  const px = x * size, py = y * size, b = Math.max(1, Math.round(size / 9));
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.fillStyle = color; c.fillRect(px, py, size, size);
  c.fillStyle = shade(color, .38); c.fillRect(px, py, size, b); c.fillRect(px, py, b, size);
  c.fillStyle = shade(color, -.42); c.fillRect(px, py + size - b, size, b); c.fillRect(px + size - b, py, b, size);
  c.fillStyle = shade(color, .15); c.fillRect(px + b * 2, py + b * 2, size - b * 4, size - b * 4);
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(px + b * 2, py + b * 2, b * 1.5, b * 1.5);
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, size - 1, size - 1);
  c.globalAlpha = 1;
}
function drawMini(c, type, cw, ch, size) {
  c.clearRect(0, 0, cw, ch);
  if (!type) return;
  const m = SHAPES[type];
  let r0 = 9, r1 = -1, c0 = 9, c1 = -1;
  m.forEach((row, r) => row.forEach((v, cc) => { if (v) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, cc); c1 = Math.max(c1, cc); } }));
  const w = (c1 - c0 + 1) * size, h = (r1 - r0 + 1) * size;
  c.save(); c.translate(Math.round((cw - w) / 2), Math.round((ch - h) / 2));
  m.forEach((row, r) => row.forEach((v, cc) => { if (v) drawCell(c, cc - c0, r - r0, COLORS[type], size); }));
  c.restore();
}
const stars = Array.from({length: 46}, () => ({x: Math.random() * W, y: Math.random() * H, s: Math.random() < .2 ? 2 : 1, p: Math.random() * 6}));

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070b19'); g.addColorStop(1, '#03050b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.fillStyle = `rgba(190,215,255,${.25 + .35 * Math.abs(Math.sin(clock / 900 + s.p))})`;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.strokeStyle = 'rgba(120,150,200,.07)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 1; x < COLS; x++) { ctx.moveTo(x * SIZE + .5, 0); ctx.lineTo(x * SIZE + .5, H); }
  for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * SIZE + .5); ctx.lineTo(W, y * SIZE + .5); }
  ctx.stroke();

  board.forEach((row, y) => row.forEach((t, x) => { if (t) drawCell(ctx, x, y, COLORS[t], SIZE); }));

  if (state === 'clearing') {
    const on = Math.floor(clearTimer / 70) % 2 === 0;
    const big = clearRows.length === 4;
    clearRows.forEach(r => {
      ctx.fillStyle = on ? (big ? 'rgba(255,245,170,.95)' : 'rgba(255,255,255,.9)') : 'rgba(255,255,255,.25)';
      ctx.fillRect(0, r * SIZE, W, SIZE);
    });
  }
  if (piece) {
    const gy = ghostY();
    ctx.strokeStyle = COLORS[piece.type]; ctx.lineWidth = 2; ctx.globalAlpha = .55;
    piece.m.forEach((row, r) => row.forEach((v, c) => {
      if (v && gy + r >= 0) ctx.strokeRect((piece.x + c) * SIZE + 3, (gy + r) * SIZE + 3, SIZE - 6, SIZE - 6);
    }));
    ctx.globalAlpha = 1;
    piece.m.forEach((row, r) => row.forEach((v, c) => {
      if (v && piece.y + r >= 0) drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type], SIZE);
    }));
  }
  drawMini(hctx, held, 80, 64, 14);
  drawMini(nctx, queue[0], 80, 64, 14);
}

/* ---- background: tunnel of floating blocks (like the reference) ---- */
const bg = $('bg'), bctx = bg.getContext('2d');
let BW = 0, BH = 0, bgPieces = [];
function newBgPiece(t) {
  const types = Object.keys(SHAPES);
  let m = SHAPES[types[Math.floor(Math.random() * types.length)]].map(r => [...r]);
  return {
    m, t: t == null ? 0 : t, ang: Math.random() * Math.PI * 2, rot: Math.random() * 6.28,
    vr: (Math.random() - .5) * .7, speed: .035 + Math.random() * .05,
    color: BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)], off: Math.random() * .25
  };
}
function resizeBG() {
  BW = bg.width = Math.round(innerWidth * .75); BH = bg.height = Math.round(innerHeight * .75);
  const n = Math.max(18, Math.min(44, Math.round(innerWidth * innerHeight / 22000)));
  bgPieces = Array.from({length: n}, () => newBgPiece(Math.random()));
}
function bgCube(c, x, y, s, color) {
  c.fillStyle = color; c.fillRect(x, y, s, s);
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x, y, s, s * .17);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y + s * .83, s, s * .17); c.fillRect(x + s * .85, y, s * .15, s);
}
function drawBG(dt) {
  bctx.fillStyle = '#000'; bctx.fillRect(0, 0, BW, BH);
  const cx = BW / 2, cy = BH * .48, maxR = Math.hypot(BW, BH) * .62;
  for (const p of bgPieces) {
    p.t += p.speed * dt / 1000; p.rot += p.vr * dt / 1000;
    if (p.t > 1) Object.assign(p, newBgPiece(0));
  }
  bgPieces.sort((a, b) => a.t - b.t);
  for (const p of bgPieces) {
    const e = Math.pow(p.t, 1.7);
    const d = (p.off * 0 + e) * maxR + 20;
    const x = cx + Math.cos(p.ang) * d, y = cy + Math.sin(p.ang) * d * .9;
    const s = 5 + e * 46;
    bctx.save();
    bctx.globalAlpha = Math.min(1, p.t * 4) * (.55 + .45 * Math.min(1, e * 2));
    bctx.translate(x, y); bctx.rotate(p.rot);
    const n = p.m.length;
    p.m.forEach((row, r) => row.forEach((v, c) => { if (v) bgCube(bctx, (c - n / 2) * s, (r - n / 2) * s, s - 1, p.color); }));
    bctx.restore();
  }
}

/* ================= layout ================= */
function fit() {
  const small = innerWidth <= 700;
  const touch = matchMedia('(pointer:coarse), (max-width:700px)').matches;
  const colw = small ? 74 : 120;
  const reserve = (small ? 34 : 42) + 9 * 2 + (touch ? 200 : 0) + 24;
  const hAvail = innerHeight - reserve - 14;
  const wAvail = innerWidth - colw * 2 - (small ? 12 : 20) - 18 - 14;
  let bw = Math.min(wAvail, hAvail / 2, small ? 300 : 360);
  bw = Math.max(110, Math.floor(bw));
  const root = document.documentElement.style;
  root.setProperty('--bw', bw + 'px'); root.setProperty('--colw', colw + 'px');
}

/* ================= main loop ================= */
function update(dt) {
  if (state === 'playing') {
    elapsed += dt;
    const gi = softHeld ? Math.min(gravityMs(), SOFT_MS) : gravityMs();
    if (!onGround()) {
      gravAcc += dt;
      while (gravAcc >= gi && !onGround()) { gravAcc -= gi; descend(); }
    }
    if (piece && onGround()) {
      gravAcc = 0; lockTimer += dt;
      if (lockTimer >= (softHeld ? LOCK_MS_SOFT : LOCK_MS)) lockPiece();
    } else lockTimer = 0;
    updateTime();
  } else if (state === 'clearing') {
    clearTimer += dt;
    if (clearTimer >= CLEAR_MS) finishClear();
  }
}
function loop(t) {
  const dt = Math.min(100, t - lastTime || 16); lastTime = t; clock = t;
  update(dt); draw(); drawBG(dt);
  requestAnimationFrame(loop);
}

/* ================= init ================= */
for (let i = 1; i <= MAX_START_LEVEL; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; $('startLevel').appendChild(o); }
window.addEventListener('resize', () => { fit(); resizeBG(); });
fit(); resizeBG();
setMuted(muted);
reset();
showOverlay('TETRIS', 'برای شروع Enter یا دکمه زیر را بزنید', 'شروع بازی', {level: true, rules: true});
requestAnimationFrame(loop);
})();
