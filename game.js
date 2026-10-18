(() => {
'use strict';
const COLS = 10, ROWS = 20, SIZE = 30;
const COLORS = {I:'#00e5ff',O:'#ffd600',T:'#b388ff',S:'#69f0ae',Z:'#ff5252',J:'#448aff',L:'#ffab40'};
const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O:[[1,1],[1,1]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]]
};
const LINE_SCORES = [0, 100, 300, 500, 800];

const $ = id => document.getElementById(id);
const ctx = $('board').getContext('2d');
const hctx = $('hold').getContext('2d');
const nctx = $('next').getContext('2d');
const overlay = $('overlay');

let board, piece, hold, canHold, queue, bag;
let score, lines, level, best = +(localStorage.getItem('tetris-best') || 0);
let state = 'idle'; // idle | playing | paused | over
let dropCounter = 0, lastTime = 0;

const emptyBoard = () => Array.from({length: ROWS}, () => Array(COLS).fill(null));
const rotCW  = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
const rotCCW = m => m[0].map((_, i) => m.map(r => r[r.length - 1 - i]));

function refill() {
  const types = Object.keys(SHAPES);
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  bag.push(...types);
}
function nextType() {
  while (queue.length < 5) { if (!bag.length) refill(); queue.push(bag.shift()); }
  return queue.shift();
}
function spawn(type) {
  type = type || nextType();
  const m = SHAPES[type].map(r => [...r]);
  piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
  if (collide(piece.m, piece.x, piece.y)) gameOver();
  while (queue.length < 5) { if (!bag.length) refill(); queue.push(bag.shift()); }
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
function ghostY() {
  let y = piece.y;
  while (!collide(piece.m, piece.x, y + 1)) y++;
  return y;
}
function lock() {
  piece.m.forEach((row, r) => row.forEach((v, c) => {
    if (v) { const y = piece.y + r; if (y >= 0) board[y][piece.x + c] = piece.type; }
  }));
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(Boolean)) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); cleared++; r++; }
  }
  if (cleared) {
    score += LINE_SCORES[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
  }
  canHold = true;
  spawn();
  updateHUD();
}
function move(dx) {
  if (state !== 'playing') return;
  if (!collide(piece.m, piece.x + dx, piece.y)) piece.x += dx;
}
function softDrop() {
  if (state !== 'playing') return;
  if (!collide(piece.m, piece.x, piece.y + 1)) { piece.y++; score += 1; updateHUD(); }
  else lock();
  dropCounter = 0;
}
function hardDrop() {
  if (state !== 'playing') return;
  const y = ghostY();
  score += (y - piece.y) * 2;
  piece.y = y;
  lock();
  dropCounter = 0;
}
function rotate(dir) {
  if (state !== 'playing' || piece.type === 'O') return;
  const m = dir > 0 ? rotCW(piece.m) : rotCCW(piece.m);
  for (const [dx, dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1]]) {
    if (!collide(m, piece.x + dx, piece.y + dy)) {
      piece.m = m; piece.x += dx; piece.y += dy; return;
    }
  }
}
function holdPiece() {
  if (state !== 'playing' || !canHold) return;
  const cur = piece.type;
  if (hold) spawn(hold); else spawn();
  hold = cur;
  canHold = false;
}
function dropInterval() { return Math.max(70, 1000 * Math.pow(0.85, level - 1)); }

function drawCell(c, x, y, color, size, alpha = 1) {
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  c.fillStyle = 'rgba(0,0,0,.2)';
  c.fillRect(x * size + 1, y * size + size - 5, size - 2, 4);
  c.globalAlpha = 1;
}
function drawMini(c, type, ox, oy, size) {
  const m = SHAPES[type];
  const w = m[0].length * size, h = m.length * size;
  c.save();
  c.translate(ox - w / 2, oy - h / 2);
  m.forEach((row, r) => row.forEach((v, cc) => { if (v) drawCell(c, cc, r, COLORS[type], size); }));
  c.restore();
}
function draw() {
  ctx.clearRect(0, 0, COLS * SIZE, ROWS * SIZE);
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * SIZE, 0); ctx.lineTo(x * SIZE, ROWS * SIZE); ctx.stroke(); }
  for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * SIZE); ctx.lineTo(COLS * SIZE, y * SIZE); ctx.stroke(); }
  board.forEach((row, y) => row.forEach((t, x) => { if (t) drawCell(ctx, x, y, COLORS[t], SIZE); }));
  if (piece && state !== 'idle') {
    const gy = ghostY();
    piece.m.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return;
      if (gy + r >= 0) drawCell(ctx, piece.x + c, gy + r, COLORS[piece.type], SIZE, .25);
    }));
    piece.m.forEach((row, r) => row.forEach((v, c) => {
      if (v && piece.y + r >= 0) drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type], SIZE);
    }));
  }
  hctx.clearRect(0, 0, 96, 96);
  if (hold) drawMini(hctx, hold, 48, 48, 20);
  nctx.clearRect(0, 0, 96, 260);
  queue.slice(0, 3).forEach((t, i) => drawMini(nctx, t, 48, 45 + i * 80, 20));
}
function updateHUD() {
  $('score').textContent = score;
  $('level').textContent = level;
  $('lines').textContent = lines;
  if (score > best) { best = score; localStorage.setItem('tetris-best', best); }
  $('best').textContent = best;
}
function showOverlay(title, text, btn) {
  $('ovTitle').textContent = title;
  $('ovText').textContent = text;
  $('startBtn').textContent = btn;
  overlay.classList.remove('hidden');
}
function reset() {
  board = emptyBoard(); hold = null; canHold = true; queue = []; bag = [];
  score = 0; lines = 0; level = 1; dropCounter = 0;
  updateHUD();
}
function start() {
  reset();
  spawn();
  state = 'playing';
  overlay.classList.add('hidden');
  lastTime = performance.now();
}
function gameOver() {
  state = 'over';
  showOverlay('پایان بازی', `امتیاز شما: ${score}`, 'بازی دوباره');
}
function togglePause() {
  if (state === 'playing') { state = 'paused'; showOverlay('توقف', 'ادامه با P یا دکمه زیر', 'ادامه'); }
  else if (state === 'paused') { state = 'playing'; overlay.classList.add('hidden'); lastTime = performance.now(); }
}
function action(a) {
  switch (a) {
    case 'left': move(-1); break;
    case 'right': move(1); break;
    case 'down': softDrop(); break;
    case 'rotate': rotate(1); break;
    case 'rotateCCW': rotate(-1); break;
    case 'drop': hardDrop(); break;
    case 'hold': holdPiece(); break;
    case 'pause': togglePause(); break;
  }
}
function loop(t) {
  const dt = t - lastTime; lastTime = t;
  if (state === 'playing') {
    dropCounter += dt;
    if (dropCounter > dropInterval()) { dropCounter = 0;
      if (!collide(piece.m, piece.x, piece.y + 1)) piece.y++; else lock(); }
  }
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  const map = {ArrowLeft:'left', ArrowRight:'right', ArrowDown:'down', ArrowUp:'rotate', x:'rotate', X:'rotate',
    z:'rotateCCW', Z:'rotateCCW', ' ':'drop', c:'hold', C:'hold', Shift:'hold', p:'pause', P:'pause', Escape:'pause'};
  if (e.key === 'Enter' && (state === 'idle' || state === 'over')) { start(); return; }
  const a = map[e.key];
  if (a) { e.preventDefault(); if (state === 'paused' && a !== 'pause') return; action(a); }
});
$('startBtn').addEventListener('click', () => {
  if (state === 'paused') togglePause(); else start();
});
document.querySelectorAll('.touch button').forEach(b => {
  const a = b.dataset.a;
  let timer = null;
  const press = e => {
    e.preventDefault();
    action(a);
    if (['left', 'right', 'down'].includes(a)) timer = setInterval(() => action(a), 110);
  };
  const release = () => { clearInterval(timer); timer = null; };
  b.addEventListener('touchstart', press, {passive: false});
  b.addEventListener('touchend', release);
  b.addEventListener('touchcancel', release);
  b.addEventListener('mousedown', press);
  b.addEventListener('mouseup', release);
  b.addEventListener('mouseleave', release);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(); });

reset();
showOverlay('تتریس', 'برای شروع Enter یا دکمه زیر را بزنید', 'شروع بازی');
requestAnimationFrame(loop);
})();
