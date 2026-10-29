(() => {
'use strict';
const SP = (() => {
/*PHYSICS_START*/
const WW = 1000, WH = 600, FL = 70, FR = 930, FT = 55, FB = 545, CX = 500, CY = 300, GW = 190, GD = 44;
const R_DISC = 27, R_BALL = 13;
const mT = CY - GW / 2, mB = CY + GW / 2;
const SEGS = [
  [FL,FT,FR,FT],[FL,FB,FR,FB],
  [FL,FT,FL,mT],[FL,mB,FL,FB],[FR,FT,FR,mT],[FR,mB,FR,FB],
  [FL,mT,FL-GD,mT],[FL,mB,FL-GD,mB],[FL-GD,mT,FL-GD,mB],
  [FR,mT,FR+GD,mT],[FR,mB,FR+GD,mB],[FR+GD,mT,FR+GD,mB]
];
const E_DISC = .86, E_BALL = .92, E_WALL = .78, E_WALL_BALL = .88;
const DT = 1 / 120;
let LOG = false; const HITS = [];

function mk(x, y, team) {
  const ball = team < 0;
  return { x, y, vx: 0, vy: 0, r: ball ? R_BALL : R_DISC, m: ball ? 1 : 4, k: ball ? 1.6 : 2.7,
           stop: ball ? 10 : 14, max: ball ? 2200 : 1900, team, ball, rot: 0 };
}
const cloneB = B => B.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, m: b.m, k: b.k, stop: b.stop, max: b.max, team: b.team, ball: b.ball, rot: b.rot }));
const moving = B => { for (const b of B) if (b.vx || b.vy) return true; return false; };

function segHit(b, s) {
  const x1 = s[0], y1 = s[1], ex = s[2] - x1, ey = s[3] - y1;
  let t = ((b.x - x1) * ex + (b.y - y1) * ey) / (ex * ex + ey * ey);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = x1 + ex * t, py = y1 + ey * t;
  let dx = b.x - px, dy = b.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= b.r * b.r) return;
  let d = Math.sqrt(d2), nx, ny;
  if (d < 1e-6) { nx = CX - b.x; ny = CY - b.y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; d = 0; }
  else { nx = dx / d; ny = dy / d; }
  b.x = px + nx * b.r; b.y = py + ny * b.r;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    const e = b.ball ? E_WALL_BALL : E_WALL;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    if (LOG && vn < -80) HITS.push([1, -vn, b.x, b.y]);
  }
}
function sub(B, h) {
  for (const b of B) {
    b.x += b.vx * h; b.y += b.vy * h;
    const f = Math.exp(-b.k * h); b.vx *= f; b.vy *= f;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < b.stop) { b.vx = 0; b.vy = 0; }
    else { if (sp > b.max) { const c = b.max / sp; b.vx *= c; b.vy *= c; } if (b.ball) b.rot += sp * h / b.r; }
  }
  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      for (let j = i + 1; j < B.length; j++) {
        const c = B[j];
        const dx = c.x - a.x, dy = c.y - a.y, rr = a.r + c.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-9) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = rr - d;
        const im1 = 1 / a.m, im2 = 1 / c.m, sm = im1 + im2;
        a.x -= nx * ov * im1 / sm; a.y -= ny * ov * im1 / sm;
        c.x += nx * ov * im2 / sm; c.y += ny * ov * im2 / sm;
        const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (vn < 0) {
          const e = (a.ball || c.ball) ? E_BALL : E_DISC, jj = -(1 + e) * vn / sm;
          a.vx -= jj * nx * im1; a.vy -= jj * ny * im1; c.vx += jj * nx * im2; c.vy += jj * ny * im2;
          if (LOG && vn < -60) HITS.push([0, -vn, (a.x + c.x) / 2, (a.y + c.y) / 2]);
        }
      }
      if (a.x > FL + a.r && a.x < FR - a.r && a.y > FT + a.r && a.y < FB - a.r) continue;
      for (let s = 0; s < SEGS.length; s++) segHit(a, SEGS[s]);
    }
  }
  const ball = B[0];
  if (ball.y > mT && ball.y < mB) {
    if (ball.x + ball.r < FL) return 2;    // ball in left goal  -> right team (1) scores
    if (ball.x - ball.r > FR) return 1;    // ball in right goal -> left team (0) scores
  }
  return 0;
}
function advance(B, dt) {
  let mx = 0;
  for (const b of B) { const s = b.vx * b.vx + b.vy * b.vy; if (s > mx) mx = s; }
  const n = Math.max(1, Math.ceil(Math.sqrt(mx) * dt / 8)), h = dt / n;
  for (let k = 0; k < n; k++) { const ev = sub(B, h); if (ev) return ev; }
  return 0;
}
function simulate(B, maxSteps) {
  for (let i = 0; i < maxSteps; i++) {
    const ev = advance(B, DT); if (ev) return ev;
    if (!moving(B)) return 0;
  }
  return 0;
}

  return { mk, advance, moving, FL, FR, FT, FB, CX, CY, GW, GD, DT, WW, WH };
})();

const rnd = a => a[Math.floor(Math.random() * a.length)];
function shade(hex, p) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = p < 0 ? 0 : 255, k = Math.abs(p);
  return `rgb(${Math.round((t - r) * k + r)},${Math.round((t - g) * k + g)},${Math.round((t - b) * k + b)})`; }
function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ================= TETRIS (auto-playing, same look as the game) ================= */
function tetris() {
  const COL = { I: '#1b9bb0', O: '#bf9a17', T: '#7a55bd', S: '#37a06a', Z: '#b53a3a', J: '#3560bb', L: '#c87825' };
  const SH = { I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], O: [[1,1],[1,1]], T: [[0,1,0],[1,1,1],[0,0,0]], S: [[0,1,1],[1,1,0],[0,0,0]], Z: [[1,1,0],[0,1,1],[0,0,0]], J: [[1,0,0],[1,1,1],[0,0,0]], L: [[0,0,1],[1,1,1],[0,0,0]] };
  const TY = Object.keys(SH), BGC = ['#2ad4c3', '#b77ad8', '#e0414f', '#f2c230', '#3b78e0', '#f08a2a', '#5fd06a'];
  const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
  let bd, cur, next, wait = 0, flash = 0, rows = [], score = 0, lines = 0, over = 0, rt = 0, mt = 0, clock = 0;
  const stars = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6 }));
  const tun = Array.from({ length: 16 }, () => ({ t: Math.random(), a: Math.random() * 6.283, m: SH[rnd(TY)], c: rnd(BGC), r: Math.random() * 6, v: .05 + Math.random() * .05 }));
  const collide = (m, x, y) => { for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) { if (!m[r][c]) continue; const nx = x + c, ny = y + r; if (nx < 0 || nx >= 10 || ny >= 20) return true; if (ny >= 0 && bd[ny][nx]) return true; } return false; };
  function reset() { bd = Array.from({ length: 20 }, () => Array(10).fill(null)); for (let r = 13; r < 20; r++) { const hole = Math.floor(Math.random() * 10); for (let c = 0; c < 10; c++) if (c !== hole && Math.random() < .92) bd[r][c] = rnd(TY); }
    score = 1240 + Math.floor(Math.random() * 8000); lines = 12 + Math.floor(Math.random() * 40); over = 0; next = rnd(TY); spawn(); }
  function plan(t) {
    let best = -1e9, bp = { rot: 0, x: 3 }, m = SH[t].map(r => [...r]);
    for (let k = 0; k < 4; k++) {
      for (let x = -2; x < 10; x++) {
        if (collide(m, x, -2)) continue; let y = -2; while (!collide(m, x, y + 1)) y++;
        const g = bd.map(r => r.slice()); let top = false;
        m.forEach((row, r) => row.forEach((v, c) => { if (v) { if (y + r < 0) top = true; else g[y + r][x + c] = 'x'; } })); if (top) continue;
        let full = 0, holes = 0, agg = 0, bump = 0, prev = 0; const hs = [];
        for (let r = 0; r < 20; r++) if (g[r].every(Boolean)) full++;
        for (let c = 0; c < 10; c++) { let h = 0, seen = false; for (let r = 0; r < 20; r++) { if (g[r][c]) { if (!seen) { h = 20 - r; seen = true; } } else if (seen) holes++; } hs.push(h); agg += h; }
        for (let c = 1; c < 10; c++) bump += Math.abs(hs[c] - hs[c - 1]);
        const sc = -.51 * agg + .76 * full - .36 * holes - .18 * bump; if (sc > best) { best = sc; bp = { rot: k, x }; }
      }
      m = rot(m);
    }
    return bp;
  }
  function spawn() { const t = next; next = rnd(TY); const m = SH[t].map(r => [...r]); cur = { t, m, x: 3, y: t === 'I' ? -1 : 0, fy: 0 };
    if (collide(m, cur.x, cur.y)) { over = 1; wait = 1; return; } const p = plan(t); cur.rl = p.rot; cur.tx = p.x; rt = 0; mt = 0; }
  function lock() {
    cur.m.forEach((row, r) => row.forEach((v, c) => { const y = cur.y + r; if (v && y >= 0) bd[y][cur.x + c] = cur.t; }));
    rows = []; for (let r = 0; r < 20; r++) if (bd[r].every(Boolean)) rows.push(r); cur = null;
    if (rows.length) flash = .32; else spawn();
  }
  reset();
  function cellDraw(g, x, y, s, color) {
    const b = Math.max(1, Math.round(s / 9)); g.fillStyle = color; g.fillRect(x, y, s, s); g.fillStyle = shade(color, .38); g.fillRect(x, y, s, b); g.fillRect(x, y, b, s);
    g.fillStyle = shade(color, -.42); g.fillRect(x, y + s - b, s, b); g.fillRect(x + s - b, y, b, s); g.fillStyle = shade(color, .15); g.fillRect(x + b * 2, y + b * 2, s - b * 4, s - b * 4);
  }
  function box(g, x, y, w, h, title, val, fs) {
    g.fillStyle = 'rgba(0,0,0,.88)'; g.fillRect(x, y, w, h); g.strokeStyle = '#dfe6ea'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${fs}px "Courier New",monospace`; g.fillText(title, x + w / 2, y + fs * 1.3); if (val != null) g.fillText(val, x + w / 2, y + h - fs * 1.25);
  }
  return { frame(g, w, h, dt) {
    clock += dt;
    if (over) { wait -= dt; if (wait <= 0) reset(); }
    else if (flash > 0) { flash -= dt; if (flash <= 0) { for (const r of rows) { bd.splice(r, 1); bd.unshift(Array(10).fill(null)); } const n = rows.length; lines += n; score += [0, 40, 100, 300, 1200][n] * (1 + Math.floor(lines / 10)); rows = []; spawn(); } }
    else if (cur) {
      rt += dt; mt += dt;
      if (cur.rl > 0 && rt > .08) { rt = 0; const m = rot(cur.m); if (!collide(m, cur.x, cur.y)) cur.m = m; cur.rl--; }
      if (cur.x !== cur.tx && mt > .06) { mt = 0; const d = Math.sign(cur.tx - cur.x); if (!collide(cur.m, cur.x + d, cur.y)) cur.x += d; else cur.tx = cur.x; }
      const aligned = cur.x === cur.tx && cur.rl <= 0; cur.fy += (aligned ? 34 : 7) * dt;
      while (cur.fy >= 1) { cur.fy--; if (!collide(cur.m, cur.x, cur.y + 1)) cur.y++; else { lock(); break; } }
    }
    // background: space + tunnel of floating blocks
    g.fillStyle = '#02040a'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, mr = Math.hypot(w, h) * .6;
    for (const p of tun) { p.t += p.v * dt; p.r += dt * .4; if (p.t > 1) { p.t = 0; p.a = Math.random() * 6.283; p.c = rnd(BGC); } }
    for (const p of tun.slice().sort((a, b) => a.t - b.t)) { const e = Math.pow(p.t, 1.7), d = e * mr + 10, s = 3 + e * 20, n = p.m.length;
      g.save(); g.globalAlpha = Math.min(1, p.t * 4) * .8; g.translate(cx + Math.cos(p.a) * d, cy + Math.sin(p.a) * d * .9); g.rotate(p.r);
      p.m.forEach((row, r) => row.forEach((v, c) => { if (v) { const x = (c - n / 2) * s, y = (r - n / 2) * s; g.fillStyle = p.c; g.fillRect(x, y, s - 1, s - 1); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, y, s - 1, s * .17); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + s * .83, s - 1, s * .17); } })); g.restore(); }
    const vg = g.createRadialGradient(cx, cy, 10, cx, cy, mr * .75); vg.addColorStop(0, 'rgba(0,0,0,.92)'); vg.addColorStop(.55, 'rgba(0,0,0,.6)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    // board + frame
    const s = Math.max(6, Math.floor((h - 18) / 20)), bw = s * 10, bh = s * 20, x0 = Math.round((w - bw) / 2), y0 = Math.round((h - bh) / 2);
    const fg = g.createLinearGradient(x0 - 5, y0 - 5, x0 + bw + 5, y0 + bh + 5); fg.addColorStop(0, '#a9bbc0'); fg.addColorStop(.2, '#51636a'); fg.addColorStop(.45, '#1c262b'); fg.addColorStop(.6, '#7a8c92'); fg.addColorStop(.8, '#27333a'); fg.addColorStop(1, '#98aab0');
    g.fillStyle = fg; g.beginPath(); rr(g, x0 - 5, y0 - 5, bw + 10, bh + 10, 5); g.fill();
    const bgG = g.createLinearGradient(0, y0, 0, y0 + bh); bgG.addColorStop(0, '#070b19'); bgG.addColorStop(1, '#03050b'); g.fillStyle = bgG; g.fillRect(x0, y0, bw, bh);
    for (const st of stars) { g.fillStyle = `rgba(190,215,255,${.25 + .35 * Math.abs(Math.sin(clock / .9 + st.p))})`; g.fillRect(x0 + st.x * bw, y0 + st.y * bh, 1, 1); }
    for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) if (bd[r][c]) cellDraw(g, x0 + c * s, y0 + r * s, s, COL[bd[r][c]]);
    if (flash > 0) { const on = Math.floor(flash / .07) % 2 === 0; g.fillStyle = on ? 'rgba(255,245,170,.95)' : 'rgba(255,255,255,.25)'; for (const r of rows) g.fillRect(x0, y0 + r * s, bw, s); }
    if (cur) cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) cellDraw(g, x0 + (cur.x + c) * s, y0 + (cur.y + r) * s, s, COL[cur.t]); }));
    // HUD boxes like the game
    const bwid = Math.min(64, x0 - 14), fs = Math.max(6, Math.min(9, bwid / 7));
    if (bwid > 36) {
      box(g, x0 - bwid - 12, y0, bwid, fs * 4.4, 'LINES', String(lines).padStart(3, '0'), fs);
      box(g, x0 - bwid - 12, y0 + fs * 5.6, bwid, fs * 4.4, 'TIME', '03:' + String(Math.floor(clock) % 60).padStart(2, '0'), fs);
      box(g, x0 + bw + 12, y0, bwid, fs * 4.4, 'SCORE', String(score).padStart(7, '0'), fs * .9);
      box(g, x0 + bw + 12, y0 + fs * 5.6, bwid, fs * 8, 'NEXT', null, fs);
      const nm = SH[next], ns = Math.max(5, Math.floor(bwid / 7)); const nb = { r0: 9, r1: -1, c0: 9, c1: -1 };
      nm.forEach((row, r) => row.forEach((v, c) => { if (v) { nb.r0 = Math.min(nb.r0, r); nb.r1 = Math.max(nb.r1, r); nb.c0 = Math.min(nb.c0, c); nb.c1 = Math.max(nb.c1, c); } }));
      const px = x0 + bw + 12 + bwid / 2 - (nb.c1 - nb.c0 + 1) * ns / 2, py = y0 + fs * 5.6 + fs * 4.6 - (nb.r1 - nb.r0 + 1) * ns / 2;
      nm.forEach((row, r) => row.forEach((v, c) => { if (v) cellDraw(g, px + (c - nb.c0) * ns, py + (r - nb.r0) * ns, ns, COL[next]); }));
    }
  } };
}

/* ================= DISC FOOTBALL (night stadium, mini match) ================= */
function soccer() {
  const { mk, advance, moving, FL, FR, FT, FB, CX, CY, GW, GD, DT, WW, WH } = SP;
  const FORM = [[60, 0], [190, -120], [190, 120], [335, -75], [335, 75]];
  const SPONS = [['HARFS BAND', '#c79a2b', '#2a1b05', '#fff0b8'], ['صنعت مس Hosi', '#c8692a', '#4e230a', '#fff1de'], ['MoonBanana \u{1F34C}', '#f6dc1a', '#786300', '#1a1400'],
    ['\u26A1 آذرخش \u26A1', '#1f45e0', '#07123f', '#ffe34d'], ['TURBO BANK', '#1e88e5', '#0d3b7a', '#ffffff'], ['DISC STARS', '#ff6f00', '#5a2500', '#ffffff']];
  const TEAM = [{ f1: '#2a64e0', f2: '#12338a', rim: '#e8edf5' }, { f1: '#e0434d', f2: '#8f1621', rim: '#f6dc86' }];
  let B, acc = 0, wait = 1, flash = 0, turn = 0, clock = 0, who = 0;
  const crowd = []; for (let y = -22; y < 640; y += 15) for (let x = -40; x < 1050; x += 15) { if (x > FL - 50 && x < FR + 50 && y > FT - 50 && y < FB + 12) continue; crowd.push({ x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 6, c: Math.floor(Math.random() * 5), p: Math.random() * 6 }); }
  const CC = ['#e53935', '#1e88e5', '#fdd835', '#ffffff', '#ab47bc'];
  function build() { B = [mk(CX, CY, -1)]; for (let t = 0; t < 2; t++) for (const p of FORM) B.push(mk(t ? FR - p[0] : FL + p[0], CY + p[1], t)); }
  build();
  function disc(g, x, y, r, t) {
    const T = TEAM[t]; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 3, y + 6, r, r * .92, 0, 0, 7); g.fill();
    let k = g.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); k.addColorStop(0, '#fff'); k.addColorStop(1, T.rim); g.fillStyle = k; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    k = g.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r * .8); k.addColorStop(0, T.f1); k.addColorStop(1, T.f2); g.fillStyle = k; g.beginPath(); g.arc(x, y, r * .8, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.95)';
    if (t === 0) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .22 : r * .5; g.lineTo(x + Math.cos(a) * q, y + 1 + Math.sin(a) * q); } g.closePath(); g.fill(); }
    else { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-r * .27, -r * .27, r * .54, r * .54); g.restore(); }
  }
  return { frame(g, w, h, dt, t) {
    clock = t;
    if (flash > 0) { flash -= dt; if (flash <= 0) build(); }
    else {
      acc += dt; while (acc >= DT) { acc -= DT; const ev = advance(B, DT); if (ev) { flash = 1.4; who = ev === 1 ? 0 : 1; break; } }
      if (!moving(B)) { wait -= dt; if (wait <= 0) {
        const team = turn; turn = 1 - turn; const ball = B[0]; let best = null, bd = 1e9;
        for (const b of B) if (b.team === team) { const d = Math.hypot(b.x - ball.x, b.y - ball.y) + Math.random() * 120; if (d < bd) { bd = d; best = b; } }
        const gx = team === 0 ? FR : FL; let ax = ball.x - best.x, ay = ball.y - best.y;
        if (Math.random() < .5) { ax = (ball.x - (gx - ball.x) * .15) - best.x; ay = (ball.y - (CY - ball.y) * .15) - best.y; }
        const a = Math.atan2(ay, ax) + (Math.random() - .5) * .28, sp = (.62 + Math.random() * .38) * 1750; best.vx = Math.cos(a) * sp; best.vy = Math.sin(a) * sp; wait = .9;
      } }
    }
    const mx0 = -40, my0 = -22, s = Math.min(w / 1090, h / 650), ox = (w - 1090 * s) / 2 - mx0 * s, oy = (h - 650 * s) / 2 - my0 * s;
    g.fillStyle = '#04070f'; g.fillRect(0, 0, w, h); g.save(); g.translate(ox, oy); g.scale(s, s);
    g.fillStyle = '#0a1020'; g.fillRect(-60, -40, 1120, 690);
    for (let c = 0; c < 5; c++) { g.fillStyle = CC[c]; g.globalAlpha = .75; g.beginPath(); for (const d of crowd) if (d.c === c) { const by = Math.sin(clock * 5 + d.p) * 2; g.rect(d.x - 3, d.y + by - 3, 6, 6); } g.fill(); } g.globalAlpha = 1;
    g.fillStyle = 'rgba(2,5,14,.45)'; g.fillRect(-60, -40, 1120, 690);
    // LED sponsor boards
    const bx = [60, 360, 660]; g.font = 'bold 19px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let side = 0; side < 2; side++) for (let i = 0; i < 3; i++) {
      const sp = SPONS[(i + side * 3 + Math.floor(clock / 5)) % SPONS.length], x = bx[i], y = side ? 556 : 8, wd = 280, ht = 32;
      const gr = g.createLinearGradient(x, y, x + wd, y); gr.addColorStop(0, sp[1]); gr.addColorStop(1, sp[2]); g.fillStyle = '#000'; g.fillRect(x - 3, y - 3, wd + 6, ht + 6); g.fillStyle = gr; g.fillRect(x, y, wd, ht);
      g.save(); g.beginPath(); g.rect(x, y, wd, ht); g.clip(); g.fillStyle = sp[3]; g.fillText(sp[0], x + wd / 2, y + ht / 2 + 1); g.restore();
    }
    // pitch
    const n = 12, sw = (FR - FL) / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#2f9b47' : '#41bb59'; g.fillRect(FL + i * sw, FT, sw + .5, FB - FT); }
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.rect(FL, FT, FR - FL, FB - FT); g.moveTo(CX, FT); g.lineTo(CX, FB); g.stroke();
    g.beginPath(); g.arc(CX, CY, 78, 0, 7); g.stroke(); g.strokeRect(FL, CY - 130, 120, 260); g.strokeRect(FR - 120, CY - 130, 120, 260);
    for (const side of [0, 1]) { const x0 = side ? FR : FL - GD; g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, CY - GW / 2, GD, GW); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); for (let x = x0; x <= x0 + GD; x += 11) { g.moveTo(x, CY - GW / 2); g.lineTo(x, CY + GW / 2); } for (let y = CY - GW / 2; y <= CY + GW / 2; y += 11) { g.moveTo(x0, y); g.lineTo(x0 + GD, y); } g.stroke(); }
    g.strokeStyle = '#dfe6ea'; g.lineWidth = 5; g.beginPath(); g.moveTo(FL, CY - GW / 2); g.lineTo(FL - GD, CY - GW / 2); g.lineTo(FL - GD, CY + GW / 2); g.lineTo(FL, CY + GW / 2); g.moveTo(FR, CY - GW / 2); g.lineTo(FR + GD, CY - GW / 2); g.lineTo(FR + GD, CY + GW / 2); g.lineTo(FR, CY + GW / 2); g.stroke();
    const sorted = B.slice().sort((a, b) => a.y - b.y);
    for (const b of sorted) {
      if (b.ball) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(b.x + 2, b.y + 4, b.r, b.r * .9, 0, 0, 7); g.fill(); const k = g.createRadialGradient(b.x - 4, b.y - 5, 1, b.x, b.y, b.r); k.addColorStop(0, '#fff'); k.addColorStop(1, '#c9ced3'); g.fillStyle = k; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.clip(); for (let i = 0; i < 4; i++) { const an = b.rot + i * 1.57, px = b.x + Math.cos(an) * b.r * .62, py = b.y + Math.sin(an) * b.r * .62; g.save(); g.translate(px, py); g.rotate(an); g.scale(.7, 1); g.fillStyle = '#1d46b8'; g.strokeStyle = '#d6b25a'; g.lineWidth = 1.2; g.beginPath(); for (let q = 0; q < 10; q++) { const aa = -Math.PI / 2 + q * Math.PI / 5, rr2 = q % 2 ? b.r * .22 : b.r * .5; g.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } g.closePath(); g.fill(); g.stroke(); g.restore(); } g.restore(); }
      else disc(g, b.x, b.y, b.r, b.team);
    }
    const vg = g.createRadialGradient(CX, CY, 260, CX, CY, 640); vg.addColorStop(0, 'rgba(0,10,20,0)'); vg.addColorStop(1, 'rgba(0,10,20,.55)'); g.fillStyle = vg; g.fillRect(-60, -40, 1120, 690);
    if (flash > 0) { g.font = 'bold 74px Arial'; g.fillStyle = `rgba(255,230,120,${Math.min(1, flash * 2)})`; g.strokeStyle = '#7a3b00'; g.lineWidth = 6; g.strokeText('GOAL!', CX, CY); g.fillText('GOAL!', CX, CY); }
    g.restore();
  } };
}

/* ================= 2048 (self-playing) ================= */
function g2048() {
  const COL = { 2: ['#eee4da', '#776e65'], 4: ['#ede0c8', '#776e65'], 8: ['#f2b179', '#f9f6f2'], 16: ['#f59563', '#f9f6f2'], 32: ['#f67c5f', '#f9f6f2'], 64: ['#f65e3b', '#f9f6f2'], 128: ['#edcf72', '#f9f6f2'], 256: ['#edcc61', '#f9f6f2'], 512: ['#edc850', '#f9f6f2'], 1024: ['#edc53f', '#f9f6f2'], 2048: ['#edc22e', '#f9f6f2'] };
  const START = [[4, 2, 0, 0], [8, 4, 0, 0], [32, 8, 4, 2], [64, 16, 8, 4]];
  let G, tiles, dying, score, wait = .8, mt = 1, popT = 0, clock = 0, hold = 0, pops = [];
  function init() { tiles = []; G = Array.from({ length: 4 }, () => Array(4).fill(null)); score = 532; START.forEach((row, r) => row.forEach((v, c) => { if (v) { const t = { v, r, c, fr: r, fc: c, born: -9 }; G[r][c] = t; tiles.push(t); } })); dying = []; hold = 0; }
  function move(dir) {
    const horiz = dir === 1 || dir === 3, rev = dir === 1 || dir === 2; let moved = false; const N2 = Array.from({ length: 4 }, () => Array(4).fill(null)); const merges = [];
    for (const t of tiles) { t.fr = t.r; t.fc = t.c; }
    for (let k = 0; k < 4; k++) {
      const idx = [0, 1, 2, 3]; if (rev) idx.reverse(); const line = idx.map(i => horiz ? G[k][i] : G[i][k]).filter(Boolean); let p = 0;
      for (let i = 0; i < line.length; i++) {
        const t = line[i], n2 = line[i + 1], pos = idx[p], nr = horiz ? k : pos, nc = horiz ? pos : k;
        if (n2 && n2.v === t.v) { n2.r = nr; n2.c = nc; merges.push([t, n2]); t.v *= 2; score += t.v; i++; moved = true; }
        if (t.r !== nr || t.c !== nc) moved = true; t.r = nr; t.c = nc; N2[nr][nc] = t; p++;
      }
    }
    if (!moved) { for (const t of tiles) { t.fr = t.r; t.fc = t.c; } return false; }
    G = N2; mt = 0; dying = merges.map(m => m[1]); tiles = tiles.filter(t => !dying.includes(t)); pops = merges.map(m => m[0]);
    const empty = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!G[r][c]) empty.push([r, c]);
    if (empty.length) { const [r, c] = rnd(empty); const t = { v: Math.random() < .9 ? 2 : 4, r, c, fr: r, fc: c, born: clock + .1 }; G[r][c] = t; tiles.push(t); }
    return true;
  }
  const canMove = () => { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { if (!G[r][c]) return true; if (c < 3 && G[r][c + 1] && G[r][c + 1].v === G[r][c].v) return true; if (r < 3 && G[r + 1][c] && G[r + 1][c].v === G[r][c].v) return true; } return false; };
  init();
  return { frame(g, w, h, dt, t) {
    clock = t; mt = Math.min(1, mt + dt / .12);
    if (hold > 0) { hold -= dt; if (hold <= 0) init(); }
    else { wait -= dt; if (wait <= 0 && mt >= 1) { wait = .5; const order = [3, 2, 3, 2, 1, 0].sort(() => Math.random() - .5); let ok = false; for (const d of [rnd([3, 2]), ...order]) { if (move(d)) { ok = true; break; } } if (!ok || !canMove()) { if (!canMove()) hold = 1.6; } } }
    g.fillStyle = '#faf8ef'; g.fillRect(0, 0, w, h);
    const bs = Math.min(h - 18, w * .56), bx = w - bs - 14, by = (h - bs) / 2, gap = bs * .03, cs = (bs - gap * 5) / 4;
    g.fillStyle = '#bbada0'; g.beginPath(); rr(g, bx, by, bs, bs, 6); g.fill();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = 'rgba(238,228,218,.35)'; g.beginPath(); rr(g, bx + gap + c * (cs + gap), by + gap + r * (cs + gap), cs, cs, 4); g.fill(); }
    const e = 1 - Math.pow(1 - mt, 3), drawT = (tl, scale) => { const r = tl.fr + (tl.r - tl.fr) * e, c = tl.fc + (tl.c - tl.fc) * e; let sc = scale == null ? 1 : scale;
      const x = bx + gap + c * (cs + gap), y = by + gap + r * (cs + gap), col = COL[tl.v] || ['#3c3a32', '#f9f6f2']; g.save(); g.translate(x + cs / 2, y + cs / 2); g.scale(sc, sc);
      g.fillStyle = col[0]; g.beginPath(); rr(g, -cs / 2, -cs / 2, cs, cs, 4); g.fill(); g.fillStyle = col[1]; g.font = `bold ${cs * (tl.v > 99 ? .38 : .5)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tl.v, 0, cs * .03); g.restore(); };
    for (const d of dying) if (mt < 1) drawT(d);
    for (const tl of tiles) { let sc = 1; const age = clock - tl.born; if (age < 0) continue; if (age < .18) sc = age / .18; if (mt >= .85 && pops.includes(tl)) sc = 1 + .18 * Math.sin((mt - .85) / .15 * Math.PI); drawT(tl, sc); }
    // header like the game
    const lw = bx - 22, ls = Math.min(lw, 46);
    if (lw > 40) {
      g.fillStyle = '#edc22e'; g.beginPath(); rr(g, 12, by, ls, ls, 5); g.fill(); g.fillStyle = '#fff'; g.font = `800 ${ls * .3}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('2048', 12 + ls / 2, by + ls / 2);
      const bh = 30, bw2 = Math.min(lw, 92); [['SCORE', score], ['BEST', 69600]].forEach(([l, v], i) => { const y = by + ls + 8 + i * (bh + 5); g.fillStyle = '#6f655b'; g.beginPath(); rr(g, 12, y, bw2, bh, 4); g.fill(); g.fillStyle = '#eee4da'; g.font = 'bold 8px Arial'; g.fillText(l, 12 + bw2 / 2, y + 9); g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.fillText(v, 12 + bw2 / 2, y + 24); });
      g.fillStyle = '#f65e3b'; g.beginPath(); rr(g, 12, by + bs - 30, bw2 * .5 - 2, 28, 4); g.fill(); g.beginPath(); rr(g, 12 + bw2 * .5 + 2, by + bs - 30, bw2 * .5 - 2, 28, 4); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.fillText('NEW', 12 + bw2 * .25, by + bs - 16); g.fillText('UNDO', 12 + bw2 * .75, by + bs - 16);
    }
  } };
}

/* ================= MINESWEEPER (auto reveal, theme cycling) ================= */
function mines() {
  const TH = [{ bg: '#04070f', tile: '#2f80ff', fg: '#eaf1ff' }, { bg: '#050206', tile: '#d04fb0', fg: '#ffffff' }, { bg: '#353230', tile: '#f08023', fg: '#ffffff' }, { bg: '#040a06', tile: '#2fb24a', fg: '#ecfff0' }, { bg: '#07040d', tile: '#8b5cf6', fg: '#f3edff' }];
  const C = 9, R = 13, N = C * R; let ti = 0, mine, adj, rev, revT, flag, flagT, clock = 0, phase = 0, pt = 0, theme0 = 0, themeT = 1;
  const nb = i => { const r = (i / C) | 0, c = i % C, o = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const rr2 = r + a, cc = c + b; if (rr2 >= 0 && rr2 < R && cc >= 0 && cc < C) o.push(rr2 * C + cc); } return o; };
  function gen() {
    mine = new Uint8Array(N); adj = new Uint8Array(N); rev = new Uint8Array(N); flag = new Uint8Array(N); revT = new Float64Array(N); flagT = new Float64Array(N);
    const st = Math.floor(R * .55) * C + Math.floor(C / 2), ban = new Set([st, ...nb(st)]); let k = 0; while (k < 17) { const i = Math.floor(Math.random() * N); if (!mine[i] && !ban.has(i)) { mine[i] = 1; k++; } }
    for (let i = 0; i < N; i++) if (!mine[i]) adj[i] = nb(i).reduce((s, n) => s + mine[n], 0);
    phase = 0; pt = 0; start = st;
  }
  let start = 0; gen();
  function floodReveal(now) { const q = [[start, 0]]; rev[start] = 1; revT[start] = now; while (q.length) { const [k, d] = q.shift(); if (adj[k] === 0) for (const n of nb(k)) if (!rev[n] && !mine[n]) { rev[n] = 1; revT[n] = now + (d + 1) * .09; q.push([n, d + 1]); } } }
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, cl = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const f = s => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return `rgb(${f(16)},${f(8)},${f(0)})`; };
  return { frame(g, w, h, dt, t) {
    clock = t; pt += dt; if (themeT < 1) themeT = Math.min(1, themeT + dt / .6);
    if (phase === 0 && pt > .9) { floodReveal(t); phase = 1; pt = 0; }
    else if (phase === 1 && pt > 2.4) { let n = 0; for (let i = 0; i < N && n < 4; i++) if (mine[i] && !rev[i] && Math.random() < .3 && nb(i).some(j => rev[j])) { flag[i] = 1; flagT[i] = t + n * .25; n++; } phase = 2; pt = 0; }
    else if (phase === 2 && pt > 3) { theme0 = ti; ti = (ti + 1) % TH.length; themeT = 0; gen(); }
    const a = TH[theme0], b = TH[ti], bg = mix(a.bg, b.bg, themeT), tile = mix(a.tile, b.tile, themeT), fg = themeT < .5 ? a.fg : b.fg;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // theme dots bar (like the app)
    const dr = 6, dg = 7, dw = TH.length * (dr * 2 + dg) - dg, dx = (w - dw) / 2 + dr; TH.forEach((th, i) => { g.fillStyle = th.bg; g.beginPath(); g.arc(dx + i * (dr * 2 + dg), 12, dr, 0, 7); g.fill(); g.strokeStyle = i === ti ? fg : 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.stroke(); g.fillStyle = th.tile; g.beginPath(); g.arc(dx + i * (dr * 2 + dg), 12, dr * .5, 0, 7); g.fill(); });
    const s = Math.floor(Math.min((w - 20) / C, (h - 34) / R)), ox = Math.round((w - s * C) / 2), oy = Math.round(26 + (h - 26 - s * R) / 2), rad = s * .24;
    g.save(); g.translate(ox, oy);
    const solid = i => !flag[i] && (!rev[i] || t < revT[i]);
    g.fillStyle = tile; g.beginPath(); for (let i = 0; i < N; i++) { if (!solid(i)) continue; const c = i % C, r = (i / C) | 0, x = c * s, y = r * s; rr(g, x, y, s, s, rad); if (c + 1 < C && solid(i + 1)) g.rect(x + s / 2, y, s, s); if (r + 1 < R && solid(i + C)) g.rect(x, y + s / 2, s, s); } g.fill();
    for (let i = 0; i < N; i++) {
      const x = (i % C) * s, y = ((i / C) | 0) * s;
      if (rev[i]) { const p = (t - revT[i]) / .3; if (p < 0) continue; if (p < 1) { const k = 1 - ease(p), ww = s * k; g.globalAlpha = .4 + .6 * k; g.fillStyle = tile; g.beginPath(); rr(g, x + (s - ww) / 2, y + (s - ww) / 2, ww, ww, rad * k); g.fill(); g.globalAlpha = 1; }
        const al = cl((p - .3) / .7); if (al > 0 && adj[i] && !mine[i]) { g.globalAlpha = al; g.fillStyle = fg; g.font = `400 ${Math.round(s * .56)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(adj[i], x + s / 2, y + s / 2 + s * .03); g.globalAlpha = 1; } }
      else if (flag[i] && t >= flagT[i]) { const k = Math.min(1, (t - flagT[i]) / .25), sc = .5 + .5 * k; g.save(); g.translate(x + s / 2, y + s / 2); g.scale(sc, sc); g.fillStyle = 'rgba(255,255,255,.26)'; g.beginPath(); rr(g, -s * .43, -s * .43, s * .86, s * .86, s * .22); g.fill(); g.fillStyle = fg; g.fillRect(-s * .12, -s * .24, s * .06, s * .5); g.beginPath(); g.moveTo(-s * .08, -s * .24); g.lineTo(s * .2, -s * .12); g.lineTo(-s * .08, 0); g.closePath(); g.fill(); g.restore(); }
    }
    g.restore();
    g.fillStyle = 'rgba(10,10,14,.85)'; g.beginPath(); g.arc(w - 26, h - 24, 15, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.stroke(); g.fillStyle = '#fff'; g.fillRect(w - 29, h - 32, 2, 16); g.beginPath(); g.moveTo(w - 27, h - 32); g.lineTo(w - 19, h - 29); g.lineTo(w - 27, h - 25); g.fill();
  } };
}


/* ================= SUDOKU (looks like the real game screen, solves itself) ================= */
function sudoku() {
  const TH = [{ bg: '#04070f', tile: '#2f80ff', fg: '#eaf1ff' }, { bg: '#050206', tile: '#d04fb0', fg: '#ffffff' }, { bg: '#353230', tile: '#f08023', fg: '#ffffff' }, { bg: '#040a06', tile: '#2fb24a', fg: '#ecfff0' }, { bg: '#07040d', tile: '#8b5cf6', fg: '#f3edff' }];
  const FA = v => String(v).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  let ti = 0, theme0 = 0, themeT = 1, sol, giv, val, order, step, sel, tick, phase, pops, pt, lastD = 0, lastT = -9, secs = 0;
  const shuf = a => a.slice().sort(() => Math.random() - .5);
  const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const f = s => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return `rgb(${f(16)},${f(8)},${f(0)})`; };
  function gen() {
    const perm = shuf([1, 2, 3, 4, 5, 6, 7, 8, 9]), rm = [], cm = [];
    for (const b of shuf([0, 1, 2])) for (const r of shuf([0, 1, 2])) rm.push(b * 3 + r);
    for (const b of shuf([0, 1, 2])) for (const c of shuf([0, 1, 2])) cm.push(b * 3 + c);
    sol = new Array(81); giv = new Array(81); val = new Array(81).fill(0); pops = new Array(81).fill(-9);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const v = perm[(rm[r] * 3 + Math.floor(rm[r] / 3) + cm[c]) % 9]; sol[r * 9 + c] = v; giv[r * 9 + c] = Math.random() < .44; if (giv[r * 9 + c]) val[r * 9 + c] = v; }
    order = shuf([...Array(81).keys()].filter(i => !giv[i])); step = 0; sel = -1; tick = 0; phase = 0; pt = 0; secs = 0;
  }
  gen();
  function icon(g, k, cx, cy, r, col) {
    g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    if (k === 0) { g.arc(0, 1, r * .55, Math.PI * 1.1, Math.PI * 2.2); g.moveTo(-r * .62, -r * .3); g.lineTo(-r * .55, -r * .72); g.moveTo(-r * .62, -r * .3); g.lineTo(-r * .15, -r * .35); g.stroke(); }
    else if (k === 1) { g.rotate(-.6); g.rect(-r * .6, -r * .25, r * 1.2, r * .5); g.moveTo(-r * .1, -r * .25); g.lineTo(-r * .1, r * .25); g.stroke(); }
    else if (k === 2) { g.rotate(.7); g.rect(-r * .15, -r * .75, r * .3, r * 1.1); g.moveTo(-r * .15, r * .35); g.lineTo(0, r * .75); g.lineTo(r * .15, r * .35); g.stroke(); }
    else { g.arc(0, -r * .15, r * .45, 0, 7); g.moveTo(-r * .2, r * .5); g.lineTo(r * .2, r * .5); g.stroke(); }
    g.restore();
  }
  return { frame(g, w, h, dt, t) {
    tick += dt; pt += dt; secs += dt; if (themeT < 1) themeT = Math.min(1, themeT + dt / .6);
    if (phase === 0 && tick > .2) { tick = 0; if (sel >= 0) { val[sel] = sol[sel]; pops[sel] = t; lastD = sol[sel]; lastT = t; } if (step < order.length) sel = order[step++]; else { sel = -1; phase = 1; pt = 0; } }
    else if (phase === 1 && pt > 2.6) { theme0 = ti; ti = (ti + 1) % TH.length; themeT = 0; gen(); }
    const a = TH[theme0], b = TH[ti], bg = mix(a.bg, b.bg, themeT), tile = mix(a.tile, b.tile, themeT), fg = themeT < .5 ? a.fg : b.fg;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const m = 10, bs = Math.floor(Math.min(h - 2 * m, w * .52)), s = bs / 9, x0 = m, y0 = (h - bs) / 2;
    const sr = sel >= 0 ? Math.floor(sel / 9) : -1, sc = sel >= 0 ? sel % 9 : -1;
    g.strokeStyle = 'rgba(200,210,230,.7)'; g.lineWidth = 2; g.beginPath(); g.rect(x0, y0, bs, bs); g.stroke();
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, x = x0 + c * s, y = y0 + r * s;
      if (sel >= 0 && i !== sel && (r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)))) { g.fillStyle = 'rgba(127,127,127,.14)'; g.fillRect(x, y, s, s); }
      if (i === sel) { g.fillStyle = tile; g.fillRect(x, y, s, s); }
      if (phase === 1) { const wv = pt * 9 - (r + c); if (wv > 0 && wv < 2.5) { g.fillStyle = tile; g.globalAlpha = .55 * Math.sin(wv / 2.5 * Math.PI); g.fillRect(x, y, s, s); g.globalAlpha = 1; } }
      if (val[i]) { const user = !giv[i], pk = user ? Math.max(0, 1 - (t - pops[i]) / .25) : 0; g.save(); g.translate(x + s / 2, y + s / 2); g.scale(1 + pk * .45, 1 + pk * .45); g.fillStyle = user ? tile : fg; g.font = `${user ? 500 : 600} ${Math.round(s * .58)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(val[i], 0, s * .04); g.restore(); }
    }
    for (let k = 1; k < 9; k++) { g.strokeStyle = k % 3 === 0 ? 'rgba(200,210,230,.7)' : 'rgba(200,210,230,.2)'; g.lineWidth = k % 3 === 0 ? 2 : 1; g.beginPath(); g.moveTo(x0 + k * s, y0); g.lineTo(x0 + k * s, y0 + bs); g.moveTo(x0, y0 + k * s); g.lineTo(x0 + bs, y0 + k * s); g.stroke(); }
    // ---- right column: timer, info, number pad, tools (same as the real screen) ----
    const rx = x0 + bs + 16, rw = w - rx - m; if (rw < 90) return; const cx = rx + rw / 2;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.font = '600 16px Arial'; const sec = 200 + Math.floor(secs); g.fillText(FA(String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0')), cx, y0 + 8);
    g.globalAlpha = .7; g.font = '10px Tahoma,Arial'; g.fillText('سختی: سخت  ·  اشتباه‌ها: ' + FA(0), cx, y0 + 28); g.globalAlpha = 1;
    const cnt = new Array(10).fill(0); for (let i = 0; i < 81; i++) if (val[i]) cnt[val[i]]++;
    const gy = y0 + 42, bw = (rw - 10) / 3, bh = Math.min(30, (bs - 42 - 44) / 3 - 4);
    for (let d = 1; d <= 9; d++) {
      const col = (d - 1) % 3, row = Math.floor((d - 1) / 3), x = rx + col * (bw + 5), y = gy + row * (bh + 4), press = Math.max(0, 1 - (t - lastT) / .25) * (lastD === d ? 1 : 0), left = 9 - cnt[d];
      g.globalAlpha = left <= 0 ? .3 : 1; g.fillStyle = press > 0 ? tile : 'rgba(0,0,0,0)'; g.strokeStyle = 'rgba(200,210,230,.4)'; g.lineWidth = 1.2; g.beginPath(); rr(g, x, y, bw, bh, 7); if (press > 0) g.fill(); g.stroke();
      g.fillStyle = fg; g.font = '500 14px Arial'; g.fillText(d, x + bw / 2, y + bh * .38); g.globalAlpha = .55; g.font = '7px Tahoma,Arial'; g.fillText(left > 0 ? FA(left) : '', x + bw / 2, y + bh - 4.5); g.globalAlpha = 1;
    }
    const ty = y0 + bs - 22, labels = ['برگشت', 'پاک‌کن', 'یادداشت', 'راهنما'];
    for (let k = 0; k < 4; k++) { const x = rx + (k + .5) * rw / 4; icon(g, k, x, ty, 9, fg); g.fillStyle = fg; g.globalAlpha = .8; g.font = '8.5px Tahoma,Arial'; g.fillText(labels[k], x, ty + 17); g.globalAlpha = 1; }
  } };
}

/* ================= runner ================= */
const reg = [];
document.querySelectorAll('canvas[data-p]').forEach(cv => {
  const fac = { tetris, soccer, g2048, mines, sudoku }[cv.dataset.p]; if (!fac) return;
  let inst = null; try { inst = fac(); } catch (e) { console.warn('preview failed', e); return; }
  const o = { cv, g: cv.getContext('2d'), w: 0, h: 0, dpr: 1, vis: true, inst, fails: 0 };
  const fit = () => { const r = cv.parentElement.getBoundingClientRect(); o.w = r.width; o.h = r.height; o.dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(o.w * o.dpr); cv.height = Math.round(o.h * o.dpr); };
  fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(cv.parentElement); else window.addEventListener('resize', fit);
  if (window.IntersectionObserver) new IntersectionObserver(e => { o.vis = e[0].isIntersecting; }).observe(cv);
  reg.push(o);
});
let last = 0;
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
  if (!document.hidden) for (const o of reg) if (o.vis && o.w && o.fails < 5) { try { o.g.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); o.inst.frame(o.g, o.w, o.h, dt, t / 1000); } catch (e) { o.fails++; if (o.fails === 1) console.warn('preview error', e); } }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

})();
