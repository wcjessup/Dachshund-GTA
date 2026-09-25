// game.js — main controller: state machine, camera, spawning, scoring, HUD.
'use strict';

const STEAL_RADIUS = 34;
const STEAL_TIME = 0.65;
const ALERT_RADIUS = 260;
const TIME_LIMIT = 120;
const NUM_PEDS = 16;
const NUM_COPS = 4;
const NUM_PICKUPS = 9;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewW = 960; this.viewH = 600;
    this.state = 'title'; // title | playing | paused | gameover
    this.t = 0;
    this.lastTime = 0;

    this.cam = { x: 0, y: 0, shake: 0 };
    this.pedestrians = [];
    this.cops = [];
    this.pickups = [];
    this.particles = [];

    this.money = 0;
    this.heat = 0;
    this.timeLeft = TIME_LIMIT;
    this.stealTarget = null;
    this.stealProgress = 0;
    this.lastTheftAt = -999;
    this.alertPulseTimer = 0;
    this.jumpropeTriggered = false;
    this.toastTimer = 0;
    this.hintTimer = 0;

    this.highScore = Number(localStorage.getItem('dgta_highscore') || 0);

    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.viewW = Math.max(320, Math.round(rect.width));
    this.viewH = Math.max(240, Math.round(rect.height));
    this.canvas.width = Math.round(this.viewW * dpr);
    this.canvas.height = Math.round(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    City.generate();
    this.player = new Player(City.playerSpawn.x, City.playerSpawn.y);
    this.pedestrians = [];
    this.cops = [];
    this.pickups = [];
    this.particles = [];
    this.money = 0;
    this.heat = 0;
    this.timeLeft = TIME_LIMIT;
    this.jumpropeTriggered = false;

    const spawns = City.spawnPoints;
    for (let i = 0; i < NUM_PEDS; i++) {
      const p = Utils.pick(spawns);
      this.pedestrians.push(new Pedestrian(p.x, p.y));
    }
    for (let i = 0; i < NUM_COPS; i++) {
      const p = Utils.pick(spawns);
      this.cops.push(new Cop(p.x, p.y));
    }
    for (let i = 0; i < NUM_PICKUPS; i++) {
      this.pickups.push(this._makePickup());
    }

    this.state = 'playing';
    this._setHud(true);
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('titleScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    Sound.setHeat(0);
  }

  _makePickup() {
    const p = Utils.pick(City.spawnPoints);
    const kinds = ['cash', 'donut', 'watch', 'hotdog'];
    const type = Utils.pick(kinds);
    const values = { cash: 25, donut: 12, watch: 55, hotdog: 10 };
    return new Pickup(p.x, p.y, type, values[type]);
  }

  _setHud(show) {
    document.getElementById('hud').classList.toggle('hidden', !show);
    document.getElementById('utilBar').classList.toggle('hidden', !show);
    document.getElementById('touchControls').classList.toggle('hidden', !show);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    document.getElementById('pauseScreen').classList.remove('hidden');
  }
  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    document.getElementById('pauseScreen').classList.add('hidden');
  }

  quitToTitle() {
    this.state = 'title';
    this._setHud(false);
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('titleScreen').classList.remove('hidden');
    document.getElementById('highScoreVal').textContent = Utils.formatMoney(this.highScore);
  }

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    void el.offsetWidth;
    this.toastTimer = 1.8;
  }

  hint(msg) {
    const el = document.getElementById('hint');
    el.textContent = msg;
    el.classList.toggle('show', !!msg);
  }

  run() { requestAnimationFrame(this._loop); }

  _loop(ts) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (ts - (this.lastTime || ts)) / 1000);
    this.lastTime = ts;
    this.t += dt;

    if (this.state === 'playing') this._update(dt);
    this._draw();
  }

  _update(dt) {
    const world = City;
    const { moving, wantSprint } = this.player.update(dt, Input, world);
    if (wantSprint && Math.random() < dt * 3) Sound.playSprintPuff();

    // camera follow
    const targetX = Utils.clamp(this.player.x - this.viewW / 2, 0, Math.max(0, world.worldW - this.viewW));
    const targetY = Utils.clamp(this.player.y - this.viewH / 2, 0, Math.max(0, world.worldH - this.viewH));
    this.cam.x = Utils.lerp(this.cam.x, targetX, Math.min(1, dt * 8));
    this.cam.y = Utils.lerp(this.cam.y, targetY, Math.min(1, dt * 8));
    if (this.cam.shake > 0) this.cam.shake -= dt;

    // timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this._endGame(); return; }

    // pedestrians
    for (const p of this.pedestrians) p.update(dt, world, this.player);
    // cops
    for (const c of this.cops) c.update(dt, world, this.player, this.heat);

    // pickups
    for (const pk of this.pickups) {
      if (!pk.alive) continue;
      if (Utils.dist(this.player.x, this.player.y, pk.x, pk.y) < this.player.r + pk.r) {
        this.money += pk.value;
        Sound.playPickup();
        this._spawnParticle(pk.x, pk.y - 10, '+' + Utils.formatMoney(pk.value), '#7CFC9A');
        pk.alive = false;
        setTimeout(() => {
          const np = this._makePickup();
          pk.x = np.x; pk.y = np.y; pk.type = np.type; pk.value = np.value; pk.alive = true;
        }, Utils.rand(4000, 9000));
      }
    }

    // jump-rope easter egg
    if (!this.jumpropeTriggered) {
      const jr = world.props.find(pr => pr.type === 'jumprope');
      if (jr && Utils.dist(this.player.x, this.player.y, jr.x, jr.y) < 34) {
        this.jumpropeTriggered = true;
        this.money += 10;
        Sound.playBark();
        this.toast('🐾 You found the jump rope! Good dog. (+$10)');
        this._spawnParticle(jr.x, jr.y - 20, 'Yip!', '#ffdd66');
      }
    }

    // steal logic
    this._updateSteal(dt);

    // bark
    if (Input.consumeBark()) {
      Sound.playBark();
      for (const p of this.pedestrians) {
        if (Utils.dist(this.player.x, this.player.y, p.x, p.y) < 70 && p.state !== 'flee') {
          p.state = 'flee'; p.stateTimer = 0.8;
        }
      }
    }

    // heat decay / alert pulses
    this._updateHeat(dt);

    // busted check
    if (this.player.invuln <= 0) {
      for (const c of this.cops) {
        if (c.state === 'chase' && Utils.dist(c.x, c.y, this.player.x, this.player.y) < c.r + this.player.r + 2) {
          this._busted(c);
          break;
        }
      }
    }

    // particles
    this.particles = this.particles.filter(pt => pt.life > 0);
    for (const pt of this.particles) pt.update(dt);

    if (this.player.carryTimer > 0) this.player.carryTimer -= dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) document.getElementById('toast').classList.add('hidden');
    }

    this._updateHud();
  }

  _updateSteal(dt) {
    let nearest = null, nd = Infinity;
    for (const p of this.pedestrians) {
      if (p.state !== 'wander' || !p.item) continue;
      const d = Utils.dist(this.player.x, this.player.y, p.x, p.y);
      if (d < STEAL_RADIUS && d < nd) { nearest = p; nd = d; }
    }

    if (nearest !== this.stealTarget) { this.stealTarget = nearest; this.stealProgress = 0; }

    if (this.stealTarget) {
      if (Input.actionHeld) {
        this.stealProgress += dt;
        this.hint(`Stealing ${this.stealTarget.item.type}… hold still!`);
        if (this.stealProgress >= STEAL_TIME) this._doSteal(this.stealTarget);
      } else {
        this.stealProgress = 0;
        this.hint('Hold E / ✋ to steal');
      }
    } else {
      this.stealProgress = 0;
      this.hint('');
    }
    Input.consumeAction();
  }

  _doSteal(ped) {
    const item = ped.item;
    this.money += item.value;
    this.player.carrying = item.type;
    this.player.carryTimer = 0.7;
    Sound.playSteal();
    this._spawnParticle(ped.x, ped.y - 14, '+' + Utils.formatMoney(item.value), '#7CFC9A');
    ped.onStolenFrom();
    this.stealTarget = null;
    this.stealProgress = 0;
    this.lastTheftAt = this.t;

    const heatGain = item.value >= 70 ? 0.9 : item.value >= 40 ? 0.6 : 0.35;
    this._addHeat(heatGain);

    for (const c of this.cops) {
      if (c.state !== 'chase' && Utils.dist(c.x, c.y, this.player.x, this.player.y) < ALERT_RADIUS) {
        c.state = 'chase';
      }
    }
  }

  _addHeat(v) {
    const before = Math.ceil(this.heat);
    this.heat = Utils.clamp(this.heat + v, 0, 5);
    const after = Math.ceil(this.heat);
    if (after > before) Sound.playHeatUp();
    Sound.setHeat(this.heat);
  }

  _updateHeat(dt) {
    const anyChasing = this.cops.some(c => c.state === 'chase');
    if (!anyChasing && (this.t - this.lastTheftAt) > 4) {
      this.heat = Utils.clamp(this.heat - dt * (this.player.hidden ? 0.55 : 0.14), 0, 5);
    } else if (this.player.hidden) {
      this.heat = Utils.clamp(this.heat - dt * 0.5, 0, 5);
      if (this.heat <= 0.01) for (const c of this.cops) if (c.state === 'chase') c.state = 'patrol';
    }
    Sound.setHeat(this.heat);

    if (this.heat <= 0) {
      for (const c of this.cops) if (c.state === 'chase') c.state = 'patrol';
      return;
    }
    this.alertPulseTimer -= dt;
    if (this.alertPulseTimer <= 0) {
      this.alertPulseTimer = Utils.lerp(4.2, 1.4, this.heat / 5);
      if (this.heat >= 2.2) {
        let best = null, bd = Infinity;
        for (const c of this.cops) {
          if (c.state === 'chase') continue;
          const d = Utils.dist(c.x, c.y, this.player.x, this.player.y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best && !this.player.hidden) best.state = 'chase';
      }
    }
  }

  _busted(cop) {
    Sound.playBusted();
    this.player.invuln = 1.6;
    this.player.hurtFlash = 0.4;
    this.cam.shake = 0.4;
    const loss = Math.round(this.money * 0.25);
    this.money = Math.max(0, this.money - loss);
    this.heat = Utils.clamp(this.heat - 2, 0, 5);
    this.timeLeft = Math.max(0, this.timeLeft - 6);
    cop.state = 'patrol';
    for (const c of this.cops) c.state = 'patrol';

    const away = Utils.angle(cop.x, cop.y, this.player.x, this.player.y);
    const kb = world_resolveKnockback(this.player, away, City);
    this.player.x = kb.x; this.player.y = kb.y;

    const banner = document.getElementById('bustedBanner');
    banner.classList.remove('hidden');
    void banner.offsetWidth;
    banner.style.animation = 'none'; void banner.offsetWidth; banner.style.animation = '';
    setTimeout(() => banner.classList.add('hidden'), 900);
  }

  _spawnParticle(x, y, text, color) {
    this.particles.push(new Particle(x, y, text, color));
  }

  _endGame() {
    this.state = 'gameover';
    Sound.playGameOver(this.money >= this.highScore);
    this._setHud(false);
    const isNew = this.money > this.highScore;
    if (isNew) { this.highScore = this.money; localStorage.setItem('dgta_highscore', String(this.highScore)); }
    document.getElementById('finalMoney').textContent = Utils.formatMoney(this.money);
    document.getElementById('newHighScore').textContent = isNew ? '🏆 New High Score!' : `Best: ${Utils.formatMoney(this.highScore)}`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  _updateHud() {
    document.getElementById('moneyVal').textContent = Utils.formatMoney(this.money);
    document.getElementById('timeVal').textContent = Utils.formatTime(this.timeLeft);
    document.getElementById('staminaBar').style.width = (this.player.stamina * 100) + '%';

    const starsEl = document.getElementById('stars');
    if (starsEl.childElementCount !== 5) {
      starsEl.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        s.className = 'star'; s.textContent = '★';
        starsEl.appendChild(s);
      }
    }
    const filled = Math.ceil(this.heat - 0.001);
    [...starsEl.children].forEach((el, i) => el.classList.toggle('on', i < filled));
    document.getElementById('heatPill').classList.toggle('pulsing', this.heat >= 3);
  }

  _draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    if (this.state === 'title' || this.state === 'gameover') {
      ctx.fillStyle = '#1b1c24';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.restore();
      return;
    }

    let camX = this.cam.x, camY = this.cam.y;
    if (this.cam.shake > 0) {
      camX += Utils.rand(-6, 6) * this.cam.shake;
      camY += Utils.rand(-6, 6) * this.cam.shake;
    }

    ctx.translate(-camX, -camY);
    City.draw(ctx, this.cam, this.viewW, this.viewH, this.t);

    // draw hideout ring indicator
    if (City.hideBox) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,120,0.5)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(City.hideBox.x, City.hideBox.y, City.hideBox.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const pk of this.pickups) if (pk.alive) pk.draw(ctx, this.t);

    // steal progress ring
    if (this.stealTarget && this.stealProgress > 0) {
      const p = this.stealTarget;
      ctx.save();
      ctx.strokeStyle = '#ffdd55';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 22, 10, -Math.PI / 2, -Math.PI / 2 + (this.stealProgress / STEAL_TIME) * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // depth-sorted characters
    const drawables = [...this.pedestrians, ...this.cops, this.player];
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(ctx);

    // cop light glow when chasing, drawn above
    for (const c of this.cops) {
      if (c.state === 'chase') {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(this.t * 12) * 0.3;
        ctx.fillStyle = Math.sin(this.t * 12) > 0 ? '#ff3b3b' : '#3b6bff';
        ctx.beginPath(); ctx.arc(c.x, c.y - 26, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    for (const pt of this.particles) pt.draw(ctx);

    if (this.player.hidden) {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffdd88';
      ctx.textAlign = 'center';
      ctx.fillText('hiding…', this.player.x, this.player.y - 44);
      ctx.restore();
    }

    ctx.restore();
  }
}

function world_resolveKnockback(player, angle, world) {
  const nx = player.x + Math.cos(angle) * 40;
  const ny = player.y + Math.sin(angle) * 40;
  return world.resolveCollisions(nx, ny, player.r);
}
