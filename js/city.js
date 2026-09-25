// city.js — procedurally lays out a small top-down city: roads, blocks,
// buildings, park, and one graffiti alley (a nod to the box + hot-dog alley).
'use strict';

const City = {
  worldW: 0,
  worldH: 0,
  blocks: [],      // {x,y,w,h,kind}
  buildings: [],   // solid AABB obstacles {x,y,w,h,color,roofColor}
  props: [],       // decorative + solid small obstacles {type,x,y,r,solid}
  spawnPoints: [], // walkable points for pedestrians/cops
  playerSpawn: { x: 0, y: 0 },
  hideBox: null,   // the cardboard box hideout {x,y,r}
  cols: 6,
  rows: 6,
  blockSize: 340,
  roadWidth: 84,

  generate() {
    this.blocks = [];
    this.buildings = [];
    this.props = [];
    this.spawnPoints = [];

    const { cols, rows, blockSize, roadWidth } = this;
    this.worldW = cols * (blockSize + roadWidth) + roadWidth;
    this.worldH = rows * (blockSize + roadWidth) + roadWidth;

    let alleyPlaced = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = roadWidth + c * (blockSize + roadWidth);
        const by = roadWidth + r * (blockSize + roadWidth);
        let kind = Utils.pick(['building', 'building', 'building', 'park', 'lot']);
        if (!alleyPlaced && r === Math.floor(rows / 2) && c === Math.floor(cols / 2)) {
          kind = 'alley';
          alleyPlaced = true;
        }
        const block = { x: bx, y: by, w: blockSize, h: blockSize, kind };
        this.blocks.push(block);
        this._populateBlock(block);
      }
    }

    // player starts near the alley (matches the reference photo's vibe)
    const alley = this.blocks.find(b => b.kind === 'alley');
    this.playerSpawn = { x: alley.x + alley.w / 2, y: alley.y + alley.h / 2 - 50 };
  },

  _sidewalk: 18,

  _populateBlock(block) {
    const pad = this._sidewalk;
    const ix = block.x + pad, iy = block.y + pad;
    const iw = block.w - pad * 2, ih = block.h - pad * 2;

    if (block.kind === 'building') {
      // split into 1-3 building lots with gaps (sidewalk in between)
      const splitH = Math.random() < 0.5;
      const n = Utils.randInt(1, 2);
      const palette = ['#8a6d5b', '#6e7f8f', '#9c7f4a', '#7a8a6a', '#8f6a7d', '#5f7a8a'];
      if (n === 1) {
        this._addBuilding(ix, iy, iw, ih, Utils.pick(palette));
      } else if (splitH) {
        const gap = 20;
        const h1 = (ih - gap) * Utils.rand(0.4, 0.6);
        this._addBuilding(ix, iy, iw, h1, Utils.pick(palette));
        this._addBuilding(ix, iy + h1 + gap, iw, ih - h1 - gap, Utils.pick(palette));
      } else {
        const gap = 20;
        const w1 = (iw - gap) * Utils.rand(0.4, 0.6);
        this._addBuilding(ix, iy, w1, ih, Utils.pick(palette));
        this._addBuilding(ix + w1 + gap, iy, iw - w1 - gap, ih, Utils.pick(palette));
      }
      // spawn points around the building's sidewalk ring
      this._ringSpawns(block, 6);
    } else if (block.kind === 'park') {
      const treeCount = Utils.randInt(5, 9);
      for (let i = 0; i < treeCount; i++) {
        const x = Utils.rand(ix + 20, ix + iw - 20);
        const y = Utils.rand(iy + 20, iy + ih - 20);
        this.props.push({ type: 'tree', x, y, r: 13, solid: true });
      }
      const benchCount = Utils.randInt(1, 3);
      for (let i = 0; i < benchCount; i++) {
        this.props.push({
          type: 'bench',
          x: Utils.rand(ix + 30, ix + iw - 30),
          y: Utils.rand(iy + 30, iy + ih - 30),
          rot: Utils.pick([0, Math.PI / 2]),
          r: 16, solid: true
        });
      }
      this._ringSpawns(block, 8);
      for (let i = 0; i < 4; i++) {
        this.spawnPoints.push({
          x: Utils.rand(ix + 20, ix + iw - 20),
          y: Utils.rand(iy + 20, iy + ih - 20)
        });
      }
    } else if (block.kind === 'lot') {
      this.props.push({ type: 'dumpster', x: ix + 30, y: iy + 30, r: 20, solid: true });
      if (Math.random() < 0.7) {
        this.props.push({ type: 'hydrant', x: ix + iw - 24, y: iy + ih - 24, r: 8, solid: true });
      }
      this._ringSpawns(block, 5);
    } else if (block.kind === 'alley') {
      // graffiti walls on two sides, framing an open lane — the cardboard hideout lives here
      const wallT = 26;
      this.buildings.push({ x: ix, y: iy, w: iw, h: wallT, color: '#3a3a44', graffiti: true, roofColor: '#26262e' });
      this.buildings.push({ x: ix, y: iy + ih - wallT, w: iw, h: wallT, color: '#3a3a44', graffiti: true, roofColor: '#26262e' });
      const cx = block.x + block.w / 2, cy = block.y + block.h / 2;
      this.hideBox = { x: cx, y: cy, r: 26 };
      this.props.push({ type: 'box', x: cx, y: cy, r: 24, solid: false, isHideout: true });
      this.props.push({ type: 'jumprope', x: cx, y: cy + 70, r: 26, solid: false });
      this.props.push({ type: 'hydrant', x: ix + 20, y: iy + ih / 2, r: 8, solid: true });
      for (let i = 0; i < 5; i++) {
        this.spawnPoints.push({
          x: Utils.rand(ix + 20, ix + iw - 20),
          y: Utils.rand(iy + wallT + 20, iy + ih - wallT - 20)
        });
      }
    }
  },

  _addBuilding(x, y, w, h, color) {
    if (w < 20 || h < 20) return;
    this.buildings.push({ x, y, w, h, color, roofColor: this._shade(color, -30) });
  },

  _shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Utils.clamp(r, 0, 255); g = Utils.clamp(g, 0, 255); b = Utils.clamp(b, 0, 255);
    return `rgb(${r},${g},${b})`;
  },

  _ringSpawns(block, count) {
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const perim = 2 * (block.w + block.h);
      const d = t * perim;
      let x, y;
      const m = 10;
      if (d < block.w) { x = block.x + d; y = block.y + m; }
      else if (d < block.w + block.h) { x = block.x + block.w - m; y = block.y + (d - block.w); }
      else if (d < 2 * block.w + block.h) { x = block.x + block.w - (d - block.w - block.h); y = block.y + block.h - m; }
      else { x = block.x + m; y = block.y + block.h - (d - 2 * block.w - block.h); }
      this.spawnPoints.push({ x, y });
    }
  },

  // ---- collision ----
  isInsideAnyBuilding(x, y, r) {
    for (const b of this.buildings) {
      if (Utils.circleRectOverlap(x, y, r, b.x, b.y, b.w, b.h)) return true;
    }
    return false;
  },

  resolveCollisions(x, y, r) {
    for (const b of this.buildings) {
      const res = Utils.resolveCircleRect(x, y, r, b.x, b.y, b.w, b.h);
      x = res.x; y = res.y;
    }
    for (const p of this.props) {
      if (!p.solid) continue;
      const res = Utils.resolveCircleRect(x, y, r, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      x = res.x; y = res.y;
    }
    x = Utils.clamp(x, r, this.worldW - r);
    y = Utils.clamp(y, r, this.worldH - r);
    return { x, y };
  },

  randomWalkableNear(x, y, radius) {
    for (let i = 0; i < 20; i++) {
      const tx = Utils.clamp(x + Utils.rand(-radius, radius), 20, this.worldW - 20);
      const ty = Utils.clamp(y + Utils.rand(-radius, radius), 20, this.worldH - 20);
      if (!this.isInsideAnyBuilding(tx, ty, 10)) return { x: tx, y: ty };
    }
    return { x, y };
  },

  // ---- rendering ----
  draw(ctx, cam, viewW, viewH, t) {
    // ground (asphalt) fill
    ctx.fillStyle = '#4a4d52';
    ctx.fillRect(0, 0, this.worldW, this.worldH);

    // road lane markings across the whole grid
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([18, 16]);
    ctx.lineWidth = 2;
    const { cols, rows, blockSize, roadWidth } = this;
    for (let c = 0; c <= cols; c++) {
      const x = roadWidth / 2 + c * (blockSize + roadWidth);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.worldH); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = roadWidth / 2 + r * (blockSize + roadWidth);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.worldW, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // block interiors (sidewalk / grass) under buildings
    for (const b of this.blocks) {
      if (b.kind === 'park') ctx.fillStyle = '#3f7a4a';
      else if (b.kind === 'alley') ctx.fillStyle = '#5a5860';
      else ctx.fillStyle = '#8a8d92';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // buildings
    for (const bl of this.buildings) {
      ctx.fillStyle = bl.roofColor;
      ctx.fillRect(bl.x - 3, bl.y - 3, bl.w + 6, bl.h + 6);
      ctx.fillStyle = bl.color;
      ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
      if (bl.graffiti) {
        this._drawGraffiti(ctx, bl);
      } else {
        // windows grid
        ctx.fillStyle = 'rgba(255, 240, 180, 0.55)';
        const cols2 = Math.max(1, Math.floor(bl.w / 26));
        const rows2 = Math.max(1, Math.floor(bl.h / 26));
        for (let i = 0; i < cols2; i++) {
          for (let j = 0; j < rows2; j++) {
            if ((i + j + Math.floor(bl.x + bl.y)) % 5 === 0) continue; // some dark windows
            const wx = bl.x + 10 + i * 26;
            const wy = bl.y + 10 + j * 26;
            if (wx + 10 < bl.x + bl.w && wy + 8 < bl.y + bl.h) ctx.fillRect(wx, wy, 10, 8);
          }
        }
      }
    }

    // props
    for (const p of this.props) {
      if (p.type === 'tree') Sprites.drawTree(ctx, p.x, p.y, t * 0.6 + p.x);
      else if (p.type === 'bench') Sprites.drawBench(ctx, p.x, p.y, p.rot);
      else if (p.type === 'dumpster') Sprites.drawDumpster(ctx, p.x, p.y);
      else if (p.type === 'hydrant') Sprites.drawHydrant(ctx, p.x, p.y);
      else if (p.type === 'box') Sprites.drawCardboardBox(ctx, p.x, p.y, false);
      else if (p.type === 'jumprope') Sprites.drawJumpRope(ctx, p.x, p.y, t * 3);
    }
  },

  _drawGraffiti(ctx, bl) {
    const stripes = ['#ff5f6d', '#ffc371', '#47cf73', '#4fa3ff', '#c56cff'];
    ctx.save();
    ctx.beginPath();
    ctx.rect(bl.x, bl.y, bl.w, bl.h);
    ctx.clip();
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = Utils.pick(stripes);
      ctx.save();
      ctx.translate(bl.x + (i * bl.w) / 6, bl.y + bl.h / 2);
      ctx.rotate(0.5);
      ctx.fillRect(-40, -60, 22, 140);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'italic bold 14px sans-serif';
    ctx.fillText('DGTA', bl.x + bl.w / 2 - 20, bl.y + bl.h / 2 + 5);
    ctx.restore();
  }
};
