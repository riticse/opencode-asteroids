'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyC'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
const SHIP_SKINS = [
  {
    name: 'CLASICA',
    stroke: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    shape: 'classic',
  },
  {
    name: 'NEON',
    stroke: '#64f7ff',
    fill: 'rgba(100,247,255,0.12)',
    flame: 'rgba(255, 45, 230, 0.9)',
    glow: '#64f7ff',
    shape: 'dart',
  },
  {
    name: 'INTERCEPTOR',
    stroke: '#ffdd6e',
    fill: 'rgba(255,221,110,0.10)',
    flame: 'rgba(255, 90, 35, 0.9)',
    shape: 'interceptor',
  },
  {
    name: 'RETRO',
    stroke: '#80ff72',
    flame: 'rgba(120, 255, 90, 0.85)',
    shape: 'retro',
  },
];

let currentSkin = 0;

function nextShipSkin() {
  currentSkin = (currentSkin + 1) % SHIP_SKINS.length;
}

function drawShipShape(skin, scale = 1) {
  ctx.strokeStyle = skin.stroke;
  ctx.fillStyle = skin.fill || 'transparent';
  ctx.lineWidth = 1.5 * scale;
  ctx.lineJoin = 'round';

  if (skin.glow) {
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 10 * scale;
  }

  ctx.beginPath();
  if (skin.shape === 'dart') {
    ctx.moveTo(22 * scale, 0);
    ctx.lineTo(-10 * scale, -11 * scale);
    ctx.lineTo(-4 * scale, -4 * scale);
    ctx.lineTo(-14 * scale, 0);
    ctx.lineTo(-4 * scale, 4 * scale);
    ctx.lineTo(-10 * scale, 11 * scale);
  } else if (skin.shape === 'interceptor') {
    ctx.moveTo(21 * scale, 0);
    ctx.lineTo(2 * scale, -7 * scale);
    ctx.lineTo(-14 * scale, -10 * scale);
    ctx.lineTo(-9 * scale, 0);
    ctx.lineTo(-14 * scale, 10 * scale);
    ctx.lineTo(2 * scale, 7 * scale);
  } else if (skin.shape === 'retro') {
    ctx.moveTo(19 * scale, 0);
    ctx.lineTo(-13 * scale, -10 * scale);
    ctx.lineTo(-9 * scale, -3 * scale);
    ctx.lineTo(-16 * scale, 0);
    ctx.lineTo(-9 * scale, 3 * scale);
    ctx.lineTo(-13 * scale, 10 * scale);
  } else {
    ctx.moveTo(20 * scale, 0);
    ctx.lineTo(-12 * scale, -9 * scale);
    ctx.lineTo(-7 * scale, 0);
    ctx.lineTo(-12 * scale, 9 * scale);
  }
  ctx.closePath();
  if (skin.fill) ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (skin.shape === 'interceptor') {
    ctx.beginPath();
    ctx.moveTo(-2 * scale, -5 * scale);
    ctx.lineTo(8 * scale, 0);
    ctx.lineTo(-2 * scale, 5 * scale);
    ctx.stroke();
  }
}

function drawShipFlame(skin, scale = 1) {
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -4 * scale);
  ctx.lineTo((-8 - rand(6, 14)) * scale, 0);
  ctx.lineTo(-8 * scale, 4 * scale);
  ctx.strokeStyle = skin.flame;
  ctx.stroke();
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño
const SHOOTING_STAR_POINTS = 150;

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class ShootingStarAsteroid extends Asteroid {
  constructor(x, y) {
    super(x, y, 2);
    this.ttl = 5;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(180, 260);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-3.5, 3.5);
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() {
    return [];
  }

  draw() {
    const alpha = Math.max(0.25, Math.min(1, this.ttl / 5));

    ctx.save();
    ctx.strokeStyle = `rgba(255,230,130,${alpha.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x - this.vx * 0.16, this.y - this.vy * 0.16);
    ctx.lineTo(this.x - this.vx * 0.04, this.y - this.vy * 0.04);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255,245,190,${alpha.toFixed(2)})`;
    ctx.fillStyle = 'rgba(255,210,80,0.14)';
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (speedTimer > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);

    if (tripleShotTimer > 0) {
      return [-8, 0, 8].map(offset => new Bullet(
        this.x + dx * (NOSE + offset),
        this.y + dy * (NOSE + offset),
        this.angle
      ));
    }

    return [new Bullet(this.x + dx * NOSE, this.y + dy * NOSE, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;
    const skin = SHIP_SKINS[currentSkin];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    drawShipShape(skin);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      drawShipFlame(skin);
    }

    ctx.restore();
  }
}

// ── Power-up: Velocidad ──────────────────────────────────────────────────────
class SpeedPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.dead = false;
    this.pulse = 0;
  }

  update(dt) {
    this.pulse += dt * 6;
  }

  draw() {
    const glow = Math.sin(this.pulse) * 0.25 + 0.75;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = `rgba(70,180,255,${glow.toFixed(2)})`;
    ctx.fillStyle = 'rgba(70,180,255,0.12)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9de4ff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VEL', 0, 1);
    ctx.restore();
  }
}

// ── Power-up: Triple shot ────────────────────────────────────────────────────
class TripleShotPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.dead = false;
    this.pulse = 0;
  }

  update(dt) {
    this.pulse += dt * 6;
  }

  draw() {
    const glow = Math.sin(this.pulse) * 0.25 + 0.75;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = `rgba(255,205,80,${glow.toFixed(2)})`;
    ctx.fillStyle = 'rgba(255,205,80,0.12)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe08a';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x3', 0, 1);
    ctx.restore();
  }
}

// ── Power-up: Escudo ─────────────────────────────────────────────────────────
class ShieldPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.dead = false;
    this.pulse = 0;
  }

  update(dt) {
    this.pulse += dt * 6;
  }

  draw() {
    const glow = Math.sin(this.pulse) * 0.25 + 0.75;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = `rgba(90,255,170,${glow.toFixed(2)})`;
    ctx.fillStyle = 'rgba(90,255,170,0.12)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b6ffd8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ESC', 0, 1);
    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let speedTimer, tripleShotTimer, shieldTimer;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  const SHOOTING_STAR_CHANCE = 0.18;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    if (Math.random() < SHOOTING_STAR_CHANCE)
      asteroids.push(new ShootingStarAsteroid(x, y));
    else
      asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  speedTimer = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  speedTimer = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  speedTimer = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyC')) nextShipSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  if (speedTimer > 0) speedTimer = Math.max(0, speedTimer - dt);
  if (tripleShotTimer > 0) tripleShotTimer = Math.max(0, tripleShotTimer - dt);
  if (shieldTimer > 0) shieldTimer = Math.max(0, shieldTimer - dt);

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  asteroids = asteroids.filter(a => !a.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a instanceof ShootingStarAsteroid ? SHOOTING_STAR_POINTS : POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.2) {
          const powerUpTypes = [SpeedPowerUp, TripleShotPowerUp, ShieldPowerUp];
          const PowerUp = powerUpTypes[randInt(0, powerUpTypes.length - 1)];
          powerUps.push(new PowerUp(a.x, a.y));
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      if (p instanceof TripleShotPowerUp)
        tripleShotTimer = 5;
      else if (p instanceof ShieldPowerUp)
        shieldTimer = 6;
      else
        speedTimer = 5;
      p.dead = true;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    const newAsteroidsFromShield = [];
    let shieldHit = false;
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (shieldTimer > 0) {
          shieldTimer = 0;
          shieldHit = true;
          a.dead = true;
          explode(a.x, a.y, a.size * 5);
          newAsteroidsFromShield.push(...a.split());
        } else {
          killShip();
        }
        break;
      }
    }
    if (shieldHit) {
      asteroids = asteroids.filter(a => !a.dead).concat(newAsteroidsFromShield);
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  drawShipShape(SHIP_SKINS[currentSkin], 0.46);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  const timers = [];
  if (speedTimer > 0) {
    timers.push({ color: '#9de4ff', text: `VELOCIDAD ${speedTimer.toFixed(1)}s` });
  }
  if (tripleShotTimer > 0) {
    timers.push({ color: '#ffe08a', text: `TRIPLE SHOT ${tripleShotTimer.toFixed(1)}s` });
  }
  if (shieldTimer > 0) {
    timers.push({ color: '#b6ffd8', text: `ESCUDO ${shieldTimer.toFixed(1)}s` });
  }

  for (let i = 0; i < timers.length; i++) {
    ctx.fillStyle = timers[i].color;
    ctx.fillText(timers[i].text, W / 2, 48 + i * 22);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '12px monospace';
  ctx.fillText(`SKIN ${SHIP_SKINS[currentSkin].name}  C PARA CAMBIAR`, 14, H - 16);
  ctx.fillStyle = '#fff';

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawShield() {
  if (shieldTimer <= 0 || ship.dead) return;

  const pulse = Math.sin(performance.now() * 0.012) * 2;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.strokeStyle = 'rgba(90,255,170,0.85)';
  ctx.fillStyle = 'rgba(90,255,170,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 27 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  powerUps.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  drawShield();
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
