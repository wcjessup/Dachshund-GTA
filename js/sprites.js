// sprites.js — every character/prop is drawn procedurally with canvas paths.
// All "facing up" at (0,0); callers translate+rotate+scale as needed.
'use strict';

const Sprites = {
  // phase: 0..1 walk-cycle progress. speed01: 0 (idle) .. 1 (full stride)
  drawDachshund(ctx, opts) {
    const { phase = 0, body = '#8a4b28', ear = '#5c2f14', belly = '#c98a52',
      speed01 = 0, carrying = null, hurt = false } = opts;
    const bob = Math.sin(phase * Math.PI * 2) * 1.4 * speed01;
    const legSwing = Math.sin(phase * Math.PI * 2) * 5 * speed01;

    ctx.save();
    ctx.translate(0, bob * 0.3);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // tail (wags, drawn behind body, pointing "south" i.e. +y since up is forward)
    ctx.strokeStyle = ear;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 17);
    const tailWag = Math.sin(phase * Math.PI * 4 + 1) * 6;
    ctx.quadraticCurveTo(tailWag, 24, tailWag * 1.4, 30);
    ctx.stroke();

    // hind legs
    ctx.fillStyle = ear;
    ctx.fillRect(-9 + legSwing * 0.2, 12, 4, 7);
    ctx.fillRect(5 - legSwing * 0.2, 12, 4, 7);
    // front legs
    ctx.fillRect(-9 - legSwing * 0.2, -12, 4, 7);
    ctx.fillRect(5 + legSwing * 0.2, -12, 4, 7);

    // body — long capsule (dachshund signature shape)
    ctx.fillStyle = hurt ? '#c0392b' : body;
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(-10, 14);
    ctx.quadraticCurveTo(-10, 20, -4, 20);
    ctx.lineTo(4, 20);
    ctx.quadraticCurveTo(10, 20, 10, 14);
    ctx.lineTo(10, -14);
    ctx.quadraticCurveTo(10, -20, 4, -20);
    ctx.lineTo(-4, -20);
    ctx.quadraticCurveTo(-10, -20, -10, -14);
    ctx.closePath();
    ctx.fill();

    // belly stripe
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // head (toward -y / "up")
    ctx.fillStyle = hurt ? '#c0392b' : body;
    ctx.beginPath();
    ctx.ellipse(0, -22, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // snout
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(0, -28, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.ellipse(0, -31, 1.6, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // floppy ears
    ctx.fillStyle = ear;
    ctx.beginPath();
    ctx.ellipse(-8, -20, 4.5, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, -20, 4.5, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-3, -24, 1.2, 0, Math.PI * 2);
    ctx.arc(3, -24, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (carrying) {
      ctx.save();
      ctx.translate(0, -34);
      Sprites.drawIcon(ctx, carrying, 10);
      ctx.restore();
    }
  },

  drawPedestrian(ctx, opts) {
    const { phase = 0, shirt = '#3070c0', pants = '#333', skin = '#e0ab7a',
      speed01 = 0, item = null, scared = false } = opts;
    const legSwing = Math.sin(phase * Math.PI * 2) * 6 * speed01;
    const armSwing = Math.sin(phase * Math.PI * 2 + Math.PI) * 5 * speed01;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs
    ctx.fillStyle = pants;
    ctx.fillRect(-5, 4 + legSwing * 0.3, 4, 10);
    ctx.fillRect(1, 4 - legSwing * 0.3, 4, 10);

    // arms
    ctx.fillStyle = skin;
    ctx.fillRect(-9, -6 + armSwing * 0.3, 3, 9);
    ctx.fillRect(6, -6 - armSwing * 0.3, 3, 9);

    // torso
    ctx.fillStyle = scared ? '#e74c3c' : shirt;
    ctx.beginPath();
    ctx.roundRect(-7, -10, 14, 16, 4);
    ctx.fill();

    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -16, 6, 0, Math.PI * 2);
    ctx.fill();

    if (scared) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -26);
    }

    ctx.restore();

    if (item) {
      ctx.save();
      ctx.translate(9, -8);
      Sprites.drawIcon(ctx, item, 8);
      ctx.restore();
    }
  },

  drawCop(ctx, opts) {
    const { phase = 0, speed01 = 0, alerted = false } = opts;
    Sprites.drawPedestrian(ctx, {
      phase, speed01,
      shirt: alerted ? '#1b3d8f' : '#274b9e',
      pants: '#16213e',
      skin: '#e0ab7a'
    });
    ctx.save();
    ctx.fillStyle = '#16213e';
    ctx.beginPath();
    ctx.arc(0, -18, 6.4, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f4d35e';
    ctx.beginPath();
    ctx.arc(0, -19, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawCopCar(ctx, opts) {
    const { lightPhase = 0 } = opts;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.roundRect(-16, -32, 32, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-16, -6, 32, 12);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-16, -2, 32, 3);

    // windshield
    ctx.fillStyle = '#8fd3ff';
    ctx.fillRect(-11, -26, 22, 12);
    ctx.fillRect(-11, 14, 22, 12);

    // light bar, flashes
    const on = Math.sin(lightPhase * Math.PI * 8) > 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#2d6bff';
    ctx.fillRect(-9, -3, 8, 6);
    ctx.fillStyle = on ? '#2d6bff' : '#ff2d2d';
    ctx.fillRect(1, -3, 8, 6);
    ctx.restore();
  },

  drawIcon(ctx, type, size) {
    ctx.save();
    ctx.scale(size / 10, size / 10);
    switch (type) {
      case 'cash': {
        ctx.fillStyle = '#2e8b3d';
        ctx.beginPath(); ctx.roundRect(-6, -4, 12, 8, 2); ctx.fill();
        ctx.fillStyle = '#e8f7e8';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);
        break;
      }
      case 'purse': {
        ctx.fillStyle = '#b0339c';
        ctx.beginPath(); ctx.roundRect(-5, -3, 10, 7, 2); ctx.fill();
        ctx.strokeStyle = '#7a1f6c'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, -3, 4, Math.PI, 0); ctx.stroke();
        break;
      }
      case 'wallet': {
        ctx.fillStyle = '#5b3a21';
        ctx.beginPath(); ctx.roundRect(-5, -3.5, 10, 7, 1.5); ctx.fill();
        ctx.fillStyle = '#c9a35a';
        ctx.fillRect(-5, -0.5, 10, 1.2);
        break;
      }
      case 'hotdog': {
        ctx.fillStyle = '#e0a55c';
        ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 2.6, 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 1.3, 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-4, -0.5); ctx.lineTo(4, 1); ctx.stroke();
        break;
      }
      case 'phone': {
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.roundRect(-3, -5.5, 6, 11, 1.5); ctx.fill();
        ctx.fillStyle = '#6cf0ff';
        ctx.fillRect(-2.2, -4.3, 4.4, 7.5);
        break;
      }
      case 'donut': {
        ctx.fillStyle = '#e8b04b';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f4dcc0';
        ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e35fa0';
        ctx.beginPath(); ctx.arc(0, -1, 5, 0.2, Math.PI - 0.2); ctx.fill();
        break;
      }
      case 'watch': {
        ctx.fillStyle = '#c9a227';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'box': {
        ctx.fillStyle = '#c69255';
        ctx.beginPath(); ctx.roundRect(-6, -5, 12, 10, 1); ctx.fill();
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(6, 5); ctx.moveTo(6, -5); ctx.lineTo(-6, 5); ctx.stroke();
        break;
      }
      default: break;
    }
    ctx.restore();
  },

  // ---- static world props (axis aligned, no rotation needed) ----
  drawTree(ctx, x, y, sway = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 6, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -4); ctx.stroke();
    ctx.fillStyle = '#2f6b34';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.sin(sway + i) * 3, -14 - i * 6, 15 - i * 2, 13 - i, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawHydrant(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 4, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d33';
    ctx.beginPath(); ctx.roundRect(-4, -10, 8, 14, 3); ctx.fill();
    ctx.fillRect(-6, -6, 12, 3);
    ctx.restore();
  },

  drawBench(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-16, 4, 32, 6);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-16, -4, 32, 5);
    ctx.fillRect(-16, -10, 32, 4);
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(-16, -10, 3, 14);
    ctx.fillRect(13, -10, 3, 14);
    ctx.restore();
  },

  drawDumpster(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 10, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f6b3f';
    ctx.beginPath(); ctx.roundRect(-20, -14, 40, 26, 3); ctx.fill();
    ctx.fillStyle = '#255230';
    ctx.fillRect(-20, -16, 40, 6);
    ctx.restore();
  },

  drawCardboardBox(ctx, x, y, open) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 10, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c69255';
    ctx.beginPath(); ctx.roundRect(-22, -16, 44, 32, 2); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-22, -16, 44, 32);
    ctx.beginPath();
    ctx.moveTo(-22, -16); ctx.lineTo(0, 0); ctx.lineTo(22, -16);
    ctx.stroke();
    if (open) {
      ctx.fillStyle = '#3a2513';
      ctx.beginPath(); ctx.roundRect(-16, -12, 32, 10, 2); ctx.fill();
    }
    ctx.restore();
  },

  drawJumpRope(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 4, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
    const bow = Math.sin(t) * 10;
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(0, -20 - bow, 22, 0);
    ctx.stroke();
    for (let s = -22; s <= 22; s += 6) {
      const px = s, py = -20 - bow + Math.pow(s / 22, 2) * 20;
      ctx.fillStyle = '#e8916a';
      ctx.beginPath(); ctx.ellipse(px, py, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e8916a';
    ctx.beginPath(); ctx.ellipse(-22, 0, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, 0, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};
