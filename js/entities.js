// entities.js — Player, Pedestrians, Cops, floating loot, and particles.
'use strict';

const ITEM_TYPES = [
  { type: 'cash', value: 40 },
  { type: 'purse', value: 60 },
  { type: 'wallet', value: 35 },
  { type: 'hotdog', value: 15 },
  { type: 'phone', value: 70 },
  { type: 'donut', value: 10 },
  { type: 'watch', value: 90 }
];

class Entity {
  constructor(x, y) { this.x = x; this.y = y; this.angle = -Math.PI / 2; this.phase = 0; this.speed01 = 0; }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.r = 11;
    this.baseSpeed = 138;
    this.sprintMult = 1.65;
    this.stamina = 1; // 0..1
    this.money = 0;
    this.carrying = null;
    this.carryTimer = 0;
    this.invuln = 0;
    this.hidden = false;
    this.hurtFlash = 0;
  }

  update(dt, input, world) {
    let dx = 0, dy = 0;
    if (input.isDown('up')) dy -= 1;
    if (input.isDown('down')) dy += 1;
    if (input.isDown('left')) dx -= 1;
    if (input.isDown('right')) dx += 1;
    if (input.axis) { dx += input.axis.x; dy += input.axis.y; }

    const moving = (dx !== 0 || dy !== 0);
    if (moving) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      this.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }

    const wantSprint = input.isDown('sprint') && this.stamina > 0.05 && moving;
    const speed = this.baseSpeed * (wantSprint ? this.sprintMult : 1);
    if (wantSprint) this.stamina = Utils.clamp(this.stamina - dt * 0.5, 0, 1);
    else this.stamina = Utils.clamp(this.stamina + dt * 0.28, 0, 1);

    const nx = this.x + dx * speed * dt;
    const ny = this.y + dy * speed * dt;
    const resolved = world.resolveCollisions(nx, ny, this.r);
    this.x = resolved.x; this.y = resolved.y;

    this.speed01 = Utils.clamp(Math.hypot(dx, dy) * (wantSprint ? 1 : 0.75), 0, 1);
    if (moving) this.phase += dt * (wantSprint ? 3.4 : 2.2);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    // hideout check
    this.hidden = world.hideBox ? Utils.dist(this.x, this.y, world.hideBox.x, world.hideBox.y) < world.hideBox.r * 0.7 : false;

    return { moving, wantSprint };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.hidden) {
      // peeking out of the box — draw small & low profile
      ctx.globalAlpha = 0.85;
      ctx.scale(0.7, 0.7);
    }
    ctx.rotate(this.angle);
    const flashing = this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0;
    Sprites.drawDachshund(ctx, {
      phase: this.phase, speed01: this.speed01,
      carrying: this.carryTimer > 0 ? this.carrying : null,
      hurt: flashing
    });
    ctx.restore();
  }
}

class Pedestrian extends Entity {
  constructor(x, y) {
    super(x, y);
    this.r = 9;
    this.speed = Utils.rand(28, 46);
    this.target = { x, y };
    this.retarget = 0;
    this.state = 'wander'; // wander | flee | frozen
    this.stateTimer = 0;
    this.item = Utils.pick(ITEM_TYPES);
    this.itemCooldown = 0;
    this.shirt = Utils.pick(['#3070c0', '#c0533f', '#4fae6a', '#c9a227', '#7a5aa8', '#e08ad0']);
    this.alive = true;
  }

  pickNewTarget(world) {
    const p = world.randomWalkableNear(this.x, this.y, 160);
    this.target = p;
  }

  update(dt, world, player) {
    this.itemCooldown = Math.max(0, this.itemCooldown - dt);
    if (!this.item && this.itemCooldown <= 0) {
      this.item = Utils.pick(ITEM_TYPES);
    }

    if (this.state === 'flee') {
      this.stateTimer -= dt;
      const away = Utils.angle(player.x, player.y, this.x, this.y);
      const nx = this.x + Math.cos(away) * this.speed * 2.1 * dt;
      const ny = this.y + Math.sin(away) * this.speed * 2.1 * dt;
      const r = world.resolveCollisions(nx, ny, this.r);
      this.x = r.x; this.y = r.y;
      this.angle = away + Math.PI / 2;
      this.speed01 = 1;
      this.phase += dt * 4;
      if (this.stateTimer <= 0) this.state = 'wander';
      return;
    }

    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.pickNewTarget(world);
      this.retarget = Utils.rand(2, 5);
    }
    const d = Utils.dist(this.x, this.y, this.target.x, this.target.y);
    if (d < 6) {
      this.speed01 = Utils.clamp(this.speed01 - dt * 2, 0, 1);
    } else {
      const ang = Utils.angle(this.x, this.y, this.target.x, this.target.y);
      const nx = this.x + Math.cos(ang) * this.speed * dt;
      const ny = this.y + Math.sin(ang) * this.speed * dt;
      const r = world.resolveCollisions(nx, ny, this.r);
      this.x = r.x; this.y = r.y;
      this.angle = ang + Math.PI / 2;
      this.speed01 = Utils.clamp(this.speed01 + dt * 2, 0, 1);
      this.phase += dt * 2 * this.speed01;
    }
  }

  onStolenFrom() {
    this.item = null;
    this.itemCooldown = Utils.rand(6, 12);
    this.state = 'flee';
    this.stateTimer = Utils.rand(1.5, 2.5);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    Sprites.drawPedestrian(ctx, {
      phase: this.phase, speed01: this.speed01, shirt: this.shirt,
      item: this.item ? this.item.type : null, scared: this.state === 'flee'
    });
    ctx.restore();
  }
}

class Cop extends Entity {
  constructor(x, y) {
    super(x, y);
    this.r = 10;
    this.speed = 112;
    this.chaseSpeed = 150;
    this.state = 'patrol'; // patrol | chase | return
    this.target = { x, y };
    this.retarget = 0;
    this.alertCooldown = 0;
  }

  update(dt, world, player, heat) {
    if (this.state === 'chase') {
      const d = Utils.dist(this.x, this.y, player.x, player.y);
      if (d > 620 || heat <= 0 || player.hidden) {
        this.state = 'patrol';
        this.retarget = 0;
      } else {
        const ang = Utils.angle(this.x, this.y, player.x, player.y);
        const nx = this.x + Math.cos(ang) * this.chaseSpeed * dt;
        const ny = this.y + Math.sin(ang) * this.chaseSpeed * dt;
        const r = world.resolveCollisions(nx, ny, this.r);
        this.x = r.x; this.y = r.y;
        this.angle = ang + Math.PI / 2;
        this.speed01 = 1;
        this.phase += dt * 4.2;
        return;
      }
    }

    // patrol
    this.retarget -= dt;
    if (this.retarget <= 0) {
      const p = world.randomWalkableNear(this.x, this.y, 220);
      this.target = p;
      this.retarget = Utils.rand(3, 6);
    }
    const d = Utils.dist(this.x, this.y, this.target.x, this.target.y);
    if (d < 8) {
      this.speed01 = Utils.clamp(this.speed01 - dt * 2, 0, 1);
    } else {
      const ang = Utils.angle(this.x, this.y, this.target.x, this.target.y);
      const nx = this.x + Math.cos(ang) * this.speed * 0.55 * dt;
      const ny = this.y + Math.sin(ang) * this.speed * 0.55 * dt;
      const r = world.resolveCollisions(nx, ny, this.r);
      this.x = r.x; this.y = r.y;
      this.angle = ang + Math.PI / 2;
      this.speed01 = Utils.clamp(this.speed01 + dt * 2, 0, 1) * 0.6;
      this.phase += dt * 2 * this.speed01;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    Sprites.drawCop(ctx, { phase: this.phase, speed01: this.speed01, alerted: this.state === 'chase' });
    ctx.restore();
  }
}

class Pickup {
  constructor(x, y, type, value) {
    this.x = x; this.y = y; this.type = type; this.value = value; this.r = 12;
    this.bob = Math.random() * Math.PI * 2;
    this.alive = true;
  }
  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(t * 2 + this.bob) * 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 10, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    Sprites.drawIcon(ctx, this.type, 16);
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color || '#ffe066';
    this.life = 1; this.vy = -30;
  }
  update(dt) { this.y += this.vy * dt; this.life -= dt * 0.9; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Utils.clamp(this.life, 0, 1);
    ctx.fillStyle = this.color;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
