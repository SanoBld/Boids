'use strict';

// ============================================================
//  VECTOR CLASS
// ============================================================
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v)   { return new Vector(this.x + v.x, this.y + v.y); }
  sub(v)   { return new Vector(this.x - v.x, this.y - v.y); }
  mul(s)   { return new Vector(this.x * s, this.y * s); }
  div(s)   { return s !== 0 ? new Vector(this.x / s, this.y / s) : new Vector(); }
  mag()    { return Math.hypot(this.x, this.y); }
  norm()   { const m = this.mag(); return m > 0 ? this.div(m) : new Vector(); }
  limit(m) { const mg = this.mag(); return mg > m ? this.norm().mul(m) : this.copy(); }
  dist(v)  { return Math.hypot(this.x - v.x, this.y - v.y); }
  copy()   { return new Vector(this.x, this.y); }
  iadd(v)  { this.x += v.x; this.y += v.y; return this; }
  dot(v)   { return this.x * v.x + this.y * v.y; }
}

// ============================================================
//  BOID DESIGNS
// ============================================================
const DESIGNS = {
  arrow(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r * 2.5, 0);
    ctx.lineTo(-r, r * 0.95);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r, -r * 0.95);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  },
  bird(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r * 2.2, 0); ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r * 0.9, 0); ctx.lineTo(0, -r * 0.45);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    const prev = ctx.globalAlpha; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(-r * 0.4, -r * 1.7); ctx.lineTo(-r, -r * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(-r * 0.4, r * 1.7); ctx.lineTo(-r, r * 0.3); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = prev;
  },
  dot(ctx, r, color) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r * 2.8, 0);
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  },
  diamond(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r * 2.3, 0); ctx.lineTo(0, r * 1.1);
    ctx.lineTo(-r * 1.1, 0); ctx.lineTo(0, -r * 1.1);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  },
  dart(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r * 3.2, 0); ctx.lineTo(-r * 0.4, r * 0.5);
    ctx.lineTo(r * 0.5, 0); ctx.lineTo(-r * 0.4, -r * 0.5);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  },
  ring(ctx, r, color) {
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.lineTo(r * 2.8, 0);
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  },
  fish(ctx, r, color) {
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.0, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(-r * 1.6, 0);
    ctx.lineTo(-r * 3.0, -r * 1.0);
    ctx.lineTo(-r * 3.0,  r * 1.0);
    ctx.closePath();
    const prev = ctx.globalAlpha; ctx.globalAlpha = 0.65;
    ctx.fill(); ctx.globalAlpha = prev;
  },
  cross(ctx, r, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r * 2.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 1.1); ctx.lineTo(r * 0.5, r * 1.1); ctx.stroke();
  },
};

// ============================================================
//  PARAMS
// ============================================================
const params = {
  cohesionWeight:   1.0,
  alignmentWeight:  1.0,
  separationWeight: 1.5,
  foodWeight:       0.8,
  preyWeight:       1.2,
  cohesionRadius:   80,
  alignmentRadius:  60,
  separationRadius: 30,
  fovAngle:         270,
  maxSpeed:         3.5,
  maxForce:         0.12,
  trailAlpha:       0.15,
  design:           'arrow',
  borderMode:       'wrap',
  boidSize:         1.0,
  speedVariation:   true,
  predictiveAvoid:  true,
  boidColor:        null,   // null = random, string = all same
};

const COLORS = [
  '#22d3ee','#818cf8','#86efac','#fb7185',
  '#fbbf24','#c084fc','#38bdf8','#f472b6',
];

// ============================================================
//  SPATIAL GRID — O(n) neighbor lookup
// ============================================================
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  _key(cx, cy) { return (cx & 0xFFFF) | ((cy & 0xFFFF) << 16); }
  clear() { this.cells.clear(); }
  insert(boid) {
    const cx = Math.floor(boid.pos.x / this.cellSize);
    const cy = Math.floor(boid.pos.y / this.cellSize);
    const k = this._key(cx, cy);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(boid);
  }
  query(x, y, radius) {
    const results = [];
    const r = Math.ceil(radius / this.cellSize);
    const cx0 = Math.floor(x / this.cellSize);
    const cy0 = Math.floor(y / this.cellSize);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const k = this._key(cx0 + dx, cy0 + dy);
        const cell = this.cells.get(k);
        if (cell) for (const b of cell) results.push(b);
      }
    }
    return results;
  }
}

const grid = new SpatialGrid(100);

// ============================================================
//  BOID CLASS
// ============================================================
class Boid {
  constructor(x, y) {
    this.pos   = new Vector(x, y);
    const a    = Math.random() * Math.PI * 2;
    const spd  = 1 + Math.random() * 2;
    this.vel   = new Vector(Math.cos(a) * spd, Math.sin(a) * spd);
    this.acc   = new Vector();
    this.r     = 4.5;
    this.color = params.boidColor || COLORS[Math.floor(Math.random() * COLORS.length)];
    this._dCoh = 0; this._dAli = 0; this._dSep = 0; this._dNeighbors = 0;
    this.comfortSpeed = params.maxSpeed * (0.75 + Math.random() * 0.5);
  }

  _inFov(otherPos) {
    if (params.fovAngle >= 360) return true;
    const halfFov = (params.fovAngle * Math.PI / 180) / 2;
    const myHeading = Math.atan2(this.vel.y, this.vel.x);
    const toOther = Math.atan2(otherPos.y - this.pos.y, otherPos.x - this.pos.x);
    let diff = toOther - myHeading;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return Math.abs(diff) <= halfFov;
  }

  flock(obstacles, foodTargets, preys, w, h) {
    const maxR = Math.max(params.cohesionRadius, params.alignmentRadius, params.separationRadius);
    const neighbors = grid.query(this.pos.x, this.pos.y, maxR);

    const coh  = this._cohesion(neighbors);
    const ali  = this._alignment(neighbors);
    const sep  = this._separation(neighbors);
    const obs  = params.predictiveAvoid
      ? this._predictiveAvoidObstacles(obstacles)
      : this._avoidObstacles(obstacles);
    const food = foodTargets.length ? this._seekNearest(foodTargets.map(f => f.pos || f)) : null;
    const prey = preys.length ? this._seekNearest(preys.map(p => p.pos)) : null;

    this._dCoh = coh.mag();
    this._dAli = ali.mag();
    this._dSep = sep.mag();

    this.acc.iadd(coh.mul(params.cohesionWeight));
    this.acc.iadd(ali.mul(params.alignmentWeight));
    this.acc.iadd(sep.mul(params.separationWeight));
    if (obs)  this.acc.iadd(obs);
    if (food) this.acc.iadd(food.mul(params.foodWeight));
    if (prey) this.acc.iadd(prey.mul(params.preyWeight));
    if (params.borderMode === 'soft') this.acc.iadd(this._softWalls(w, h));
  }

  _softWalls(w, h) {
    const margin = 90, str = 0.55;
    const f = new Vector();
    if (this.pos.x < margin)     f.x += (margin - this.pos.x) / margin * str;
    if (this.pos.x > w - margin) f.x -= (this.pos.x - (w - margin)) / margin * str;
    if (this.pos.y < margin)     f.y += (margin - this.pos.y) / margin * str;
    if (this.pos.y > h - margin) f.y -= (this.pos.y - (h - margin)) / margin * str;
    return f;
  }

  update(w, h) {
    let targetSpeed = params.maxSpeed;
    if (params.speedVariation) {
      if (this._dNeighbors === 0)      targetSpeed = params.maxSpeed * 0.55;
      else if (this._dNeighbors > 3)   targetSpeed = params.maxSpeed;
      else                             targetSpeed = params.maxSpeed * 0.8;
    }

    this.vel = this.vel.add(this.acc).limit(targetSpeed);
    const spd = this.vel.mag();
    if (spd < 0.3 && spd > 0) this.vel = this.vel.norm().mul(0.3);

    this.pos = this.pos.add(this.vel);
    this.acc = new Vector();

    switch (params.borderMode) {
      case 'wrap':
        if (this.pos.x < 0) this.pos.x += w;
        if (this.pos.x > w) this.pos.x -= w;
        if (this.pos.y < 0) this.pos.y += h;
        if (this.pos.y > h) this.pos.y -= h;
        break;
      case 'bounce':
        if (this.pos.x <= 0) { this.pos.x = 0; this.vel.x =  Math.abs(this.vel.x); }
        if (this.pos.x >= w) { this.pos.x = w; this.vel.x = -Math.abs(this.vel.x); }
        if (this.pos.y <= 0) { this.pos.y = 0; this.vel.y =  Math.abs(this.vel.y); }
        if (this.pos.y >= h) { this.pos.y = h; this.vel.y = -Math.abs(this.vel.y); }
        break;
      case 'soft':
        this.pos.x = Math.max(0, Math.min(w, this.pos.x));
        this.pos.y = Math.max(0, Math.min(h, this.pos.y));
        break;
    }
  }

  show(ctx, isSelected) {
    const angle = Math.atan2(this.vel.y, this.vel.x);
    const r = this.r * params.boidSize;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);
    ctx.shadowBlur  = isSelected ? 22 : 9;
    ctx.shadowColor = isSelected ? '#fff' : this.color;
    DESIGNS[params.design](ctx, r, this.color);
    ctx.restore();

    if (isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, 16 * Math.max(0.6, params.boidSize), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  showRadii(ctx) {
    const rings = [
      { r: params.cohesionRadius,   fill: 'rgba(34,211,238,0.06)',  stroke: 'rgba(34,211,238,0.35)' },
      { r: params.alignmentRadius,  fill: 'rgba(134,239,172,0.06)', stroke: 'rgba(134,239,172,0.3)' },
      { r: params.separationRadius, fill: 'rgba(251,113,133,0.08)', stroke: 'rgba(251,113,133,0.45)' },
    ];
    for (const { r, fill, stroke } of rings) {
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    }

    if (params.fovAngle < 360) {
      const halfFov = (params.fovAngle * Math.PI / 180) / 2;
      const heading = Math.atan2(this.vel.y, this.vel.x);
      const maxR = Math.max(params.cohesionRadius, params.alignmentRadius);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.arc(this.pos.x, this.pos.y, maxR, heading - halfFov, heading + halfFov);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  _cohesion(candidates) {
    const center = new Vector(); let count = 0;
    for (const b of candidates) {
      if (b === this) continue;
      if (this.pos.dist(b.pos) < params.cohesionRadius && this._inFov(b.pos)) {
        center.iadd(b.pos); count++;
      }
    }
    this._dNeighbors = count;
    if (count === 0) return new Vector();
    return this._steerTo(center.div(count));
  }

  _alignment(candidates) {
    const avg = new Vector(); let count = 0;
    for (const b of candidates) {
      if (b === this) continue;
      if (this.pos.dist(b.pos) < params.alignmentRadius && this._inFov(b.pos)) {
        avg.iadd(b.vel); count++;
      }
    }
    if (count === 0) return new Vector();
    return avg.div(count).norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce);
  }

  _separation(candidates) {
    const steer = new Vector(); let count = 0;
    for (const b of candidates) {
      if (b === this) continue;
      const d = this.pos.dist(b.pos);
      if (d > 0 && d < params.separationRadius) {
        steer.iadd(this.pos.sub(b.pos).norm().div(d)); count++;
      }
    }
    if (count === 0) return new Vector();
    return steer.div(count).norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce);
  }

  // Simple proximity repulsion (fallback)
  _avoidObstacles(obstacles) {
    if (!obstacles.length) return null;
    const steer = new Vector(); let any = false;
    for (const obs of obstacles) {
      const f = obs.getRepulsion(this.pos);
      if (f) { steer.iadd(f); any = true; }
    }
    if (!any) return null;
    return steer.norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce * 5);
  }

  // Predictive avoidance with LATERAL STEERING — boids go AROUND obstacles
  _predictiveAvoidObstacles(obstacles) {
    if (!obstacles.length) return null;

    const LOOK_AHEAD = 50 + this.vel.mag() * 12;
    const fwd = this.vel.norm();
    const ahead  = this.pos.add(fwd.mul(LOOK_AHEAD));
    const ahead2 = this.pos.add(fwd.mul(LOOK_AHEAD * 0.5));

    for (const obs of obstacles) {
      const hitFull = obs.containsPoint(ahead.x, ahead.y);
      const hitHalf = obs.containsPoint(ahead2.x, ahead2.y);

      if (hitFull || hitHalf) {
        // Compute right perpendicular to forward direction
        const right = new Vector(-fwd.y, fwd.x);
        // Vector from boid to obstacle center
        const toObs = new Vector(obs.x - this.pos.x, obs.y - this.pos.y);
        // If obstacle is to our right, steer left (and vice-versa)
        const side = toObs.dot(right) > 0 ? -1 : 1;
        const lateralDir = new Vector(fwd.y * side, -fwd.x * side);

        // Blend lateral steering with a component pushing away from center
        const awayFromObs = new Vector(this.pos.x - obs.x, this.pos.y - obs.y).norm();
        // Weighted blend: 70% lateral (goes around), 30% away (avoids getting stuck)
        const blended = lateralDir.mul(0.7).add(awayFromObs.mul(0.3)).norm();

        const urgency = hitFull ? params.maxForce * 12 : params.maxForce * 6;
        return blended.mul(urgency);
      }
    }

    // Fall back to proximity repulsion when nothing in lookahead
    return this._avoidObstacles(obstacles);
  }

  // Seek nearest point from a list of Vector positions
  _seekNearest(positions) {
    if (!positions.length) return new Vector();
    let nearest = null, nearestDist = Infinity;
    for (const pos of positions) {
      const d = this.pos.dist(pos);
      if (d < nearestDist) { nearestDist = d; nearest = pos; }
    }
    if (!nearest) return new Vector();
    const desired = nearest.sub(this.pos).norm().mul(params.maxSpeed);
    return desired.sub(this.vel).limit(params.maxForce * 2);
  }

  _steerTo(target) {
    return target.sub(this.pos).norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce);
  }
}

// ============================================================
//  PREY CLASS — a mobile target that flees boids
// ============================================================
class Prey {
  constructor(x, y) {
    this.pos = new Vector(x, y);
    const a = Math.random() * Math.PI * 2;
    this.vel = new Vector(Math.cos(a) * 2.5, Math.sin(a) * 2.5);
    this.acc = new Vector();
    this.maxSpeed = 3.2;
    this.maxForce = 0.2;
    this.fleeRadius = 130;
  }

  update(boids, obstacles, w, h) {
    // Flee from nearby boids
    const flee = new Vector();
    let count = 0;
    for (const b of boids) {
      const d = this.pos.dist(b.pos);
      if (d < this.fleeRadius) {
        // Stronger flee the closer the boid
        flee.iadd(this.pos.sub(b.pos).norm().mul(1 / Math.max(d, 1)));
        count++;
      }
    }

    if (count > 0) {
      const desired = flee.norm().mul(this.maxSpeed);
      this.acc.iadd(desired.sub(this.vel).limit(this.maxForce * 5));
    } else {
      // Gentle wander when no boids nearby
      const wander = new Vector(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      this.acc.iadd(wander);
    }

    // Avoid obstacles too
    for (const obs of obstacles) {
      const f = obs.getRepulsion(this.pos);
      if (f) this.acc.iadd(f.mul(2));
    }

    this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
    const spd = this.vel.mag();
    if (spd < 0.2 && spd > 0) this.vel = this.vel.norm().mul(0.2);
    this.pos = this.pos.add(this.vel);
    this.acc = new Vector();

    // Wrap borders
    if (this.pos.x < 0) this.pos.x += w;
    if (this.pos.x > w) this.pos.x -= w;
    if (this.pos.y < 0) this.pos.y += h;
    if (this.pos.y > h) this.pos.y -= h;
  }

  draw(ctx) {
    const angle = Math.atan2(this.vel.y, this.vel.x);
    const t = Date.now() / 400;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);
    ctx.shadowBlur = 14 + Math.sin(t) * 4;
    ctx.shadowColor = '#f43f5e';
    // Body
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-5, 0);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    // Tail fin
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-11, -5);
    ctx.lineTo(-11,  5);
    ctx.closePath();
    const prev = ctx.globalAlpha; ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = prev;
    ctx.restore();

    // Pulsing flee-radius indicator (subtle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.fleeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244,63,94,${0.05 + Math.sin(t * 0.6) * 0.03})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ============================================================
//  POINT-IN-POLYGON
// ============================================================
function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

// ============================================================
//  OBSTACLE CLASS
// ============================================================
class Obstacle {
  constructor(type, x, y, opts = {}) {
    this.type  = type;
    this.x     = x;
    this.y     = y;
    this.scale = opts.scale || 1.0;
    this.angle = opts.angle || 0;
    switch (type) {
      case 'circle': this.baseR = 35; break;
      case 'square': this.baseW = 60; this.baseH = 60; break;
      case 'rect':   this.baseW = 110; this.baseH = 45; break;
      case 'tube':   this.baseR = 14; this.baseLen = 90; break;
      case 'polygon':
        this.points = opts.points ? opts.points.map(p => ({ x: p.x, y: p.y })) : [];
        this._computeCentroid(); break;
    }
  }

  _computeCentroid() {
    if (!this.points || !this.points.length) return;
    let cx = 0, cy = 0;
    for (const p of this.points) { cx += p.x; cy += p.y; }
    this.x = cx / this.points.length;
    this.y = cy / this.points.length;
  }

  get r()   { return (this.baseR   || 35) * this.scale; }
  get w()   { return (this.baseW   || 60) * this.scale; }
  get h()   { return (this.baseH   || 45) * this.scale; }
  get len() { return (this.baseLen || 90) * this.scale; }

  _toLocal(px, py) {
    const c = Math.cos(-this.angle), s = Math.sin(-this.angle);
    const dx = px - this.x, dy = py - this.y;
    return { lx: c * dx - s * dy, ly: s * dx + c * dy };
  }

  _toWorld(lx, ly) {
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    return { wx: c * lx - s * ly, wy: s * lx + c * ly };
  }

  _scaledPoints() {
    return this.points.map(p => ({
      x: this.x + (p.x - this.x) * this.scale,
      y: this.y + (p.y - this.y) * this.scale,
    }));
  }

  containsPoint(px, py) {
    const MARGIN = 28;
    if (this.type === 'polygon') {
      const pts = this._scaledPoints();
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i+1) % pts.length];
        const abx = b.x - a.x, aby = b.y - a.y;
        const apx = px - a.x, apy = py - a.y;
        const lenSq = abx*abx + aby*aby;
        const t = lenSq > 0 ? Math.max(0, Math.min(1, (apx*abx + apy*aby)/lenSq)) : 0;
        const nx = a.x + t*abx, ny = a.y + t*aby;
        if (Math.hypot(px-nx, py-ny) < MARGIN) return true;
      }
      return pointInPolygon(px, py, pts);
    }
    const { lx, ly } = this._toLocal(px, py);
    switch (this.type) {
      case 'circle': return Math.hypot(lx, ly) < this.r + MARGIN;
      case 'square': case 'rect':
        return Math.abs(lx) < this.w/2 + MARGIN && Math.abs(ly) < this.h/2 + MARGIN;
      case 'tube': {
        const hw = this.len/2;
        const cx = Math.max(-hw, Math.min(lx, hw));
        return Math.hypot(lx-cx, ly) < this.r + MARGIN;
      }
    }
    return false;
  }

  getRepulsion(pos) {
    const FIELD = 45;
    if (this.type === 'polygon') {
      const pts = this._scaledPoints();
      let minDist = Infinity, repX = 0, repY = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const abx = b.x - a.x, aby = b.y - a.y;
        const apx = pos.x - a.x, apy = pos.y - a.y;
        const lenSq = abx*abx + aby*aby;
        const t = lenSq > 0 ? Math.max(0, Math.min(1, (apx*abx + apy*aby)/lenSq)) : 0;
        const nx = a.x + t*abx, ny = a.y + t*aby;
        const dx = pos.x - nx, dy = pos.y - ny;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist < minDist) { minDist = dist; repX = dx/dist; repY = dy/dist; }
      }
      if (pointInPolygon(pos.x, pos.y, pts)) return new Vector(repX*3, repY*3);
      if (minDist < FIELD) { const f = (FIELD - minDist)/FIELD; return new Vector(repX*f, repY*f); }
      return null;
    }
    const { lx, ly } = this._toLocal(pos.x, pos.y);
    let ldx, ldy, dist, f;
    switch (this.type) {
      case 'circle': {
        dist = Math.hypot(lx, ly) || 0.001;
        const edge = dist - this.r;
        if (edge < FIELD) {
          f = Math.max(0, (FIELD - edge)/FIELD);
          const { wx, wy } = this._toWorld(lx/dist*f, ly/dist*f);
          return new Vector(wx, wy);
        }
        return null;
      }
      case 'square': case 'rect': {
        const nx2 = Math.max(-this.w/2, Math.min(lx, this.w/2));
        const ny2 = Math.max(-this.h/2, Math.min(ly, this.h/2));
        ldx = lx-nx2; ldy = ly-ny2;
        dist = Math.hypot(ldx, ldy) || 0.001;
        if (dist < FIELD) {
          f = (FIELD-dist)/FIELD;
          const { wx, wy } = this._toWorld(ldx/dist*f, ldy/dist*f);
          return new Vector(wx, wy);
        }
        return null;
      }
      case 'tube': {
        const hw = this.len/2;
        const cx2 = Math.max(-hw, Math.min(lx, hw));
        ldx = lx-cx2; ldy = ly;
        dist = Math.hypot(ldx, ldy) || 0.001;
        const edge = dist - this.r;
        if (edge < FIELD) {
          f = Math.max(0, (FIELD-edge)/FIELD);
          const { wx, wy } = this._toWorld(ldx/dist*f, ldy/dist*f);
          return new Vector(wx, wy);
        }
        return null;
      }
    }
    return null;
  }

  draw(ctx, hovered, selected) {
    if (this.type === 'polygon') { this._drawPolygon(ctx, hovered, selected); return; }
    const fill   = selected ? 'rgba(92,112,240,0.18)' : hovered ? 'rgba(251,113,133,0.18)' : 'rgba(255,255,255,0.07)';
    const stroke = selected ? 'rgba(92,112,240,0.9)'  : hovered ? 'rgba(251,113,133,0.9)'  : 'rgba(200,210,240,0.3)';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = selected ? 2 : 1.5;
    switch (this.type) {
      case 'circle':
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.fill(); ctx.stroke(); break;
      case 'square': case 'rect':
        ctx.beginPath(); roundRect(ctx, -this.w/2, -this.h/2, this.w, this.h, 4); ctx.fill(); ctx.stroke(); break;
      case 'tube': {
        const hw = this.len/2, r = this.r;
        ctx.beginPath();
        ctx.moveTo(-hw, -r); ctx.lineTo(hw, -r);
        ctx.arc(hw, 0, r, -Math.PI/2, Math.PI/2);
        ctx.lineTo(-hw, r);
        ctx.arc(-hw, 0, r, Math.PI/2, -Math.PI/2);
        ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      }
    }
    ctx.restore();
  }

  _drawPolygon(ctx, hovered, selected) {
    const pts = this._scaledPoints();
    if (pts.length < 2) return;
    const fill   = selected ? 'rgba(92,112,240,0.18)' : hovered ? 'rgba(251,113,133,0.18)' : 'rgba(255,255,255,0.07)';
    const stroke = selected ? 'rgba(92,112,240,0.9)'  : hovered ? 'rgba(251,113,133,0.9)'  : 'rgba(200,210,240,0.3)';
    ctx.save();
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = selected ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  distToCenter(px, py) { return Math.hypot(px - this.x, py - this.y); }
  resize(delta) { this.scale = Math.max(0.15, Math.min(6, this.scale + delta)); }

  duplicate(offsetX = 35, offsetY = 35) {
    if (this.type === 'polygon') {
      return new Obstacle('polygon', 0, 0, {
        scale: this.scale,
        points: this.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
      });
    }
    return new Obstacle(this.type, this.x + offsetX, this.y + offsetY, { scale: this.scale, angle: this.angle });
  }
}

// ============================================================
//  POLYGON DRAWING STATE
// ============================================================
const polygonDraw = {
  points: [],
  reset() { this.points = []; },
  canClose() { return this.points.length >= 3; },
  isNearFirst(x, y, threshold = 18) {
    if (!this.points.length) return false;
    return Math.hypot(x - this.points[0].x, y - this.points[0].y) < threshold;
  },
  addPoint(x, y) { this.points.push({ x, y }); },
  close(obstacles) {
    if (this.canClose()) obstacles.push(new Obstacle('polygon', 0, 0, { points: this.points.slice() }));
    this.reset();
  },
  drawPreview(ctx, mx, my) {
    if (!this.points.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(251,113,133,0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const isFirst = i === 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isFirst ? 5.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isFirst ? 'rgba(251,113,133,1)' : 'rgba(251,113,133,0.7)';
      ctx.fill();
    }
    if (this.canClose() && this.isNearFirst(mx, my)) {
      ctx.beginPath();
      ctx.arc(this.points[0].x, this.points[0].y, 13, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251,113,133,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
};

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

// ============================================================
//  MINI CHARTS
// ============================================================
const CHART_LEN = 120;
const chartSpeedData    = new Array(CHART_LEN).fill(0);
const chartPolarityData = new Array(CHART_LEN).fill(0);

function pushChart(data, val) { data.push(val); if (data.length > CHART_LEN) data.shift(); }

function drawMiniChart(canvasEl, data, color, maxVal) {
  const w = canvasEl.width, h = canvasEl.height;
  const dctx = canvasEl.getContext('2d');
  dctx.clearRect(0, 0, w, h);
  dctx.strokeStyle = 'rgba(255,255,255,0.05)';
  dctx.lineWidth = 1;
  dctx.beginPath(); dctx.moveTo(0, h/2); dctx.lineTo(w, h/2); dctx.stroke();
  if (!data.length) return;
  const mx = maxVal || Math.max(...data) || 1;
  const step = w / (CHART_LEN - 1);
  const grad = dctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');
  dctx.beginPath();
  dctx.moveTo(0, h);
  for (let i = 0; i < data.length; i++) {
    dctx.lineTo(i * step, h - (data[i] / mx) * h);
  }
  dctx.lineTo((data.length - 1) * step, h);
  dctx.closePath();
  dctx.fillStyle = grad;
  dctx.fill();
  dctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = i * step, y = h - (data[i] / mx) * h;
    i === 0 ? dctx.moveTo(x, y) : dctx.lineTo(x, y);
  }
  dctx.strokeStyle = color;
  dctx.lineWidth = 1.5;
  dctx.stroke();
}

// ============================================================
//  SIMULATION STATE
// ============================================================
const canvas = document.getElementById('boidsCanvas');
const ctx    = canvas.getContext('2d');

let boids          = [];
let obstacles      = [];
let foodTargets    = [];   // Array of Vector
let preys          = [];   // Array of Prey
let selectedBoid   = null;
let selectedObsIdx = -1;
let obstacleMode   = null;
let foodMode       = false;
let preyMode       = false;
let hoveredObs     = -1;
let mousePos       = { x: 0, y: 0 };
let lastInfoUpdate  = 0;
let lastChartUpdate = 0;

const INIT_COUNT = 80;

function resize() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

function spawnBoid(x, y) {
  boids.push(new Boid(
    x !== undefined ? x : Math.random() * canvas.width,
    y !== undefined ? y : Math.random() * canvas.height
  ));
  updateAgentBadge();
}

function updateAgentBadge() {
  document.getElementById('agentCount').textContent = boids.length;
}

function setBoidCount(n) {
  n = Math.max(1, Math.round(n));
  while (boids.length < n) spawnBoid();
  while (boids.length > n) {
    const removed = boids.pop();
    if (removed === selectedBoid) { selectedBoid = null; hideInfo(); }
  }
  updateAgentBadge();
  const slider = document.getElementById('boidCountSlider');
  slider.value = Math.min(n, parseInt(slider.max));
  document.getElementById('boidCountInput').value = n;
}

function reset() {
  boids = []; obstacles = []; foodTargets = []; preys = [];
  selectedBoid = null; selectedObsIdx = -1;
  polygonDraw.reset();
  for (let i = 0; i < INIT_COUNT; i++) spawnBoid();
  hideInfo(); hideObsInfo();
  setObstacleMode(null);
  setFoodMode(false);
  setPreyMode(false);
  document.getElementById('boidCountSlider').value = INIT_COUNT;
  document.getElementById('boidCountInput').value  = INIT_COUNT;
  updateAgentBadge();
  updateFoodCount();
  updatePreyCount();
}

function updateFoodCount() {
  document.getElementById('foodCount').textContent = foodTargets.length;
}
function updatePreyCount() {
  document.getElementById('preyCount').textContent = preys.length;
}

// ============================================================
//  MAIN LOOP
// ============================================================
function loop() {
  // Trail effect
  ctx.fillStyle = `rgba(12,14,20,${params.trailAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border indicator
  if (params.borderMode === 'bounce') {
    ctx.save();
    ctx.strokeStyle = 'rgba(92,112,240,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width-2, canvas.height-2);
    ctx.restore();
  } else if (params.borderMode === 'soft') {
    const m = 90;
    ctx.save();
    ctx.strokeStyle = 'rgba(92,112,240,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(m, m, canvas.width-m*2, canvas.height-m*2);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw food targets
  const t = Date.now() / 600;
  for (const ft of foodTargets) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ft.x, ft.y, 10 + Math.sin(t) * 3, 0, Math.PI*2);
    ctx.fillStyle   = 'rgba(251,191,36,0.18)';
    ctx.strokeStyle = 'rgba(251,191,36,0.85)';
    ctx.lineWidth = 1.8;
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(ft.x, ft.y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = '#fbbf24'; ctx.fill();
    const ringR = 18 + Math.sin(t * 0.8) * 5;
    ctx.beginPath();
    ctx.arc(ft.x, ft.y, ringR, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(251,191,36,${0.2 + Math.sin(t)*0.1})`;
    ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // Update & draw preys
  for (const p of preys) {
    p.update(boids, obstacles, canvas.width, canvas.height);
    p.draw(ctx);
  }

  // Obstacles
  for (let i = 0; i < obstacles.length; i++) {
    obstacles[i].draw(ctx, i === hoveredObs, i === selectedObsIdx);
  }

  // Polygon drawing preview
  if (obstacleMode === 'polygon') {
    polygonDraw.drawPreview(ctx, mousePos.x, mousePos.y);
  }

  // Ghost preview for obstacles
  if (obstacleMode && obstacleMode !== 'polygon' && canvas.matches(':hover')) {
    const preview = new Obstacle(obstacleMode, mousePos.x, mousePos.y);
    ctx.save(); ctx.globalAlpha = 0.4;
    preview.draw(ctx, false, false);
    ctx.restore();
  }

  // Rebuild spatial grid each frame
  grid.clear();
  for (const b of boids) grid.insert(b);

  // Selected boid radii (behind boids)
  if (selectedBoid && boids.includes(selectedBoid)) {
    selectedBoid.showRadii(ctx);
  }

  // Boids
  for (const b of boids) {
    b.flock(obstacles, foodTargets, preys, canvas.width, canvas.height);
    b.update(canvas.width, canvas.height);
    b.show(ctx, b === selectedBoid);
  }

  // Chart updates ~15fps
  const now = performance.now();
  if (now - lastChartUpdate > 66) {
    updateCharts();
    lastChartUpdate = now;
  }

  // Agent info panel ~30fps
  if (now - lastInfoUpdate > 33 && selectedBoid) {
    if (boids.includes(selectedBoid)) updateInfoPanel(selectedBoid);
    else { selectedBoid = null; hideInfo(); }
    lastInfoUpdate = now;
  }

  requestAnimationFrame(loop);
}

function updateCharts() {
  if (!boids.length) return;

  let sumSpeed = 0;
  for (const b of boids) sumSpeed += b.vel.mag();
  const avgSpeed = sumSpeed / boids.length;
  pushChart(chartSpeedData, avgSpeed);
  document.getElementById('chartSpeedVal').textContent = avgSpeed.toFixed(2);

  let sx = 0, sy = 0;
  for (const b of boids) {
    const m = b.vel.mag() || 1;
    sx += b.vel.x / m; sy += b.vel.y / m;
  }
  const polarity = Math.hypot(sx, sy) / boids.length;
  pushChart(chartPolarityData, polarity);
  document.getElementById('chartPolarityVal').textContent = Math.round(polarity * 100) + '%';

  const cSpd = document.getElementById('chartSpeed');
  const cPol = document.getElementById('chartPolarity');
  const dpr = window.devicePixelRatio || 1;
  cSpd.width  = cSpd.offsetWidth  * dpr;
  cSpd.height = cSpd.offsetHeight * dpr;
  cPol.width  = cPol.offsetWidth  * dpr;
  cPol.height = cPol.offsetHeight * dpr;
  drawMiniChart(cSpd, chartSpeedData,    '#22d3ee', params.maxSpeed);
  drawMiniChart(cPol, chartPolarityData, '#86efac', 1);
}

// ============================================================
//  AGENT INFO PANEL
// ============================================================
function showInfo(boid) {
  selectedBoid = boid;
  document.getElementById('infoSection').hidden = false;
}
function hideInfo() {
  selectedBoid = null;
  document.getElementById('infoSection').hidden = true;
}
function updateInfoPanel(b) {
  const spd     = b.vel.mag();
  const heading = Math.round((Math.atan2(b.vel.y, b.vel.x) * 180 / Math.PI + 360) % 360);
  document.getElementById('infoSpeed').textContent     = spd.toFixed(2);
  document.getElementById('infoHeading').textContent   = heading + '°';
  document.getElementById('infoNeighbors').textContent = b._dNeighbors;
  document.getElementById('infoPos').textContent       = `${Math.round(b.pos.x)}, ${Math.round(b.pos.y)}`;
  const scale = params.maxForce || 0.01;
  const pct   = v => Math.min(100, (v / scale) * 100).toFixed(1) + '%';
  document.getElementById('barCoh').style.width = pct(b._dCoh);
  document.getElementById('barAli').style.width = pct(b._dAli);
  document.getElementById('barSep').style.width = pct(b._dSep);
  document.getElementById('numCoh').textContent = b._dCoh.toFixed(3);
  document.getElementById('numAli').textContent = b._dAli.toFixed(3);
  document.getElementById('numSep').textContent = b._dSep.toFixed(3);
}

// ============================================================
//  OBSTACLE INFO PANEL
// ============================================================
function showObsInfo(idx) {
  selectedObsIdx = idx;
  const obs = obstacles[idx];
  const scaleFmt = obs.scale.toFixed(2);
  document.getElementById('obsInfoSection').hidden  = false;
  document.getElementById('obsType').textContent         = obs.type;
  document.getElementById('obsScaleDisplay').textContent = scaleFmt + '×';
  document.getElementById('obsSize').value                = obs.scale;
  document.getElementById('obsSizeVal').textContent       = scaleFmt;
  const showRot = obs.type === 'square' || obs.type === 'rect' || obs.type === 'tube';
  document.getElementById('obsRotRow').style.display = showRot ? '' : 'none';
  if (showRot) {
    const deg = Math.round(obs.angle * 180 / Math.PI);
    document.getElementById('obsAngle').value           = deg;
    document.getElementById('obsAngleVal').textContent  = deg + '°';
  }
}
function hideObsInfo() {
  selectedObsIdx = -1;
  document.getElementById('obsInfoSection').hidden = true;
}
function syncObsInfoScale(obs) {
  document.getElementById('obsScaleDisplay').textContent = obs.scale.toFixed(2) + '×';
  document.getElementById('obsSize').value               = obs.scale;
  document.getElementById('obsSizeVal').textContent      = obs.scale.toFixed(2);
}

// ============================================================
//  MODE MANAGEMENT
// ============================================================
const modePill = document.getElementById('modePill');

function setModePill(text, cls = '') {
  modePill.textContent = text || '';
  modePill.classList.toggle('show', !!text);
  modePill.classList.toggle('polygon-mode', cls === 'polygon');
  modePill.classList.toggle('food-mode',    cls === 'food');
  modePill.classList.toggle('prey-mode',    cls === 'prey');
}

function updateModePill() {
  if (preyMode) {
    setModePill('Click canvas to place a prey · Esc to cancel', 'prey');
  } else if (foodMode) {
    setModePill('Click canvas to place food · Esc to cancel', 'food');
  } else if (obstacleMode === 'polygon') {
    const n = polygonDraw.points.length;
    if (n === 0) setModePill('Polygon · Click to place first point', 'polygon');
    else if (n < 3) setModePill(`Polygon · ${n} point${n>1?'s':''} — need ${3-n} more`, 'polygon');
    else setModePill(`Polygon · ${n} pts · Click 1st point or ↵ to close · Esc to cancel`, 'polygon');
  } else if (obstacleMode) {
    setModePill(`Placing ${obstacleMode} · Esc to cancel`);
  } else {
    setModePill(null);
  }
}

function setObstacleMode(shape) {
  obstacleMode = shape;
  polygonDraw.reset();
  canvas.style.cursor = shape ? 'cell' : 'crosshair';
  document.querySelectorAll('.obs-grid .chip').forEach(b => {
    b.classList.toggle('active-obs', b.dataset.shape === shape);
  });
  updateModePill();
}

function setFoodMode(on) {
  foodMode = on;
  if (on) { preyMode = false; document.getElementById('placePreyBtn').classList.remove('active-prey'); }
  canvas.style.cursor = on ? 'crosshair' : (obstacleMode ? 'cell' : 'crosshair');
  document.getElementById('placeFoodBtn').classList.toggle('active-food', on);
  updateModePill();
}

function setPreyMode(on) {
  preyMode = on;
  if (on) { foodMode = false; document.getElementById('placeFoodBtn').classList.remove('active-food'); }
  canvas.style.cursor = on ? 'crosshair' : (obstacleMode ? 'cell' : 'crosshair');
  document.getElementById('placePreyBtn').classList.toggle('active-prey', on);
  updateModePill();
}

// ============================================================
//  CANVAS EVENTS
// ============================================================
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (preyMode) {
    preys.push(new Prey(mx, my));
    setPreyMode(false);
    updatePreyCount();
    return;
  }

  if (foodMode) {
    foodTargets.push(new Vector(mx, my));
    setFoodMode(false);
    updateFoodCount();
    return;
  }

  if (obstacleMode === 'polygon') {
    if (polygonDraw.canClose() && polygonDraw.isNearFirst(mx, my)) {
      polygonDraw.close(obstacles);
    } else {
      polygonDraw.addPoint(mx, my);
    }
    updateModePill(); return;
  }

  if (obstacleMode) {
    obstacles.push(new Obstacle(obstacleMode, mx, my));
    return;
  }

  // Try to select obstacle
  let nearObs = -1, nearObsDist = 60;
  for (let i = 0; i < obstacles.length; i++) {
    const d = obstacles[i].distToCenter(mx, my);
    if (d < nearObsDist) { nearObsDist = d; nearObs = i; }
  }
  if (nearObs !== -1) {
    if (nearObs === selectedObsIdx) hideObsInfo();
    else { selectedBoid = null; hideInfo(); showObsInfo(nearObs); }
    return;
  }

  // Try to select boid
  let closest = null, bestDist = 22;
  for (const b of boids) {
    const d = b.pos.dist(new Vector(mx, my));
    if (d < bestDist) { bestDist = d; closest = b; }
  }
  if (closest) {
    if (selectedObsIdx !== -1) hideObsInfo();
    closest === selectedBoid ? hideInfo() : showInfo(closest);
    return;
  }

  if (selectedObsIdx !== -1) { hideObsInfo(); return; }
  if (selectedBoid)           { hideInfo();    return; }

  spawnBoid(mx, my);
  setBoidCount(boids.length);
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (obstacleMode === 'polygon' && polygonDraw.points.length > 0) {
    polygonDraw.reset(); updateModePill(); return;
  }

  // Remove nearest food target
  let nearFoodIdx = -1, nearFoodDist = 30;
  for (let i = 0; i < foodTargets.length; i++) {
    const ft = foodTargets[i];
    const d = Math.hypot(mx - ft.x, my - ft.y);
    if (d < nearFoodDist) { nearFoodDist = d; nearFoodIdx = i; }
  }
  if (nearFoodIdx !== -1) {
    foodTargets.splice(nearFoodIdx, 1);
    updateFoodCount(); return;
  }

  // Remove nearest prey
  let nearPreyIdx = -1, nearPreyDist = 30;
  for (let i = 0; i < preys.length; i++) {
    const d = preys[i].pos.dist(new Vector(mx, my));
    if (d < nearPreyDist) { nearPreyDist = d; nearPreyIdx = i; }
  }
  if (nearPreyIdx !== -1) {
    preys.splice(nearPreyIdx, 1);
    updatePreyCount(); return;
  }

  // Remove nearest obstacle
  let nearestIdx = -1, nearestDist = 90;
  for (let i = 0; i < obstacles.length; i++) {
    const d = obstacles[i].distToCenter(mx, my);
    if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
  }
  if (nearestIdx !== -1) {
    if (nearestIdx === selectedObsIdx) hideObsInfo();
    obstacles.splice(nearestIdx, 1);
    if (selectedObsIdx >= obstacles.length) selectedObsIdx = -1;
  }
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
  hoveredObs = -1;
  for (let i = 0; i < obstacles.length; i++) {
    if (obstacles[i].distToCenter(mousePos.x, mousePos.y) < 70) { hoveredObs = i; break; }
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const idx = selectedObsIdx !== -1 ? selectedObsIdx : hoveredObs;
  if (idx === -1) return;
  obstacles[idx].resize(e.deltaY > 0 ? -0.05 : 0.05);
  if (idx === selectedObsIdx) syncObsInfoScale(obstacles[idx]);
}, { passive: false });

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === 'Escape') {
    if (preyMode) { setPreyMode(false); return; }
    if (foodMode) { setFoodMode(false); return; }
    if (obstacleMode === 'polygon' && polygonDraw.points.length) {
      polygonDraw.reset(); updateModePill();
    } else if (obstacleMode) {
      setObstacleMode(null);
    } else if (selectedBoid) {
      hideInfo();
    } else if (selectedObsIdx !== -1) {
      hideObsInfo();
    }
  }

  if (e.key === 'Enter' && obstacleMode === 'polygon' && polygonDraw.canClose()) {
    polygonDraw.close(obstacles); updateModePill();
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObsIdx !== -1) {
    obstacles.splice(selectedObsIdx, 1);
    hideObsInfo();
  }
});

// ============================================================
//  UI BINDINGS
// ============================================================
function bindSlider(id, valId, key, parse = parseFloat) {
  const el = document.getElementById(id);
  const ve = document.getElementById(valId);
  el.addEventListener('input', () => {
    params[key] = parse(el.value);
    ve.textContent = parse === parseInt
      ? parseInt(el.value)
      : parseFloat(el.value).toFixed(el.step.includes('.') ? el.step.split('.')[1].length : 0);
  });
}

bindSlider('cohesionWeight',   'cohesionVal',        'cohesionWeight');
bindSlider('alignmentWeight',  'alignmentVal',       'alignmentWeight');
bindSlider('separationWeight', 'separationVal',      'separationWeight');
bindSlider('foodWeight',       'foodVal',            'foodWeight');
bindSlider('preyWeight',       'preyWeightVal',      'preyWeight');
bindSlider('cohesionRadius',   'cohesionRadiusVal',  'cohesionRadius',   parseInt);
bindSlider('alignmentRadius',  'alignmentRadiusVal', 'alignmentRadius',  parseInt);
bindSlider('separationRadius', 'separationRadiusVal','separationRadius', parseInt);
bindSlider('fovAngle',         'fovAngleVal',        'fovAngle',         parseInt);
bindSlider('maxSpeed',         'maxSpeedVal',        'maxSpeed');
bindSlider('trailLength',      'trailLengthVal',     'trailAlpha');
bindSlider('boidSize',         'boidSizeVal',        'boidSize');

document.getElementById('boidCountSlider').addEventListener('input', e => {
  setBoidCount(parseInt(e.target.value));
});
document.getElementById('boidCountInput').addEventListener('change', e => {
  const val = parseInt(e.target.value);
  if (!isNaN(val) && val >= 1) setBoidCount(val);
});

document.getElementById('speedVariation').addEventListener('change', e => {
  params.speedVariation = e.target.checked;
});
document.getElementById('predictiveAvoid').addEventListener('change', e => {
  params.predictiveAvoid = e.target.checked;
});

// Border picker
document.getElementById('borderPicker').addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn || !btn.dataset.border) return;
  document.querySelectorAll('#borderPicker .chip').forEach(b => b.classList.remove('active-design'));
  btn.classList.add('active-design');
  params.borderMode = btn.dataset.border;
});

// Design picker
document.getElementById('designPicker').addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn || !btn.dataset.design) return;
  document.querySelectorAll('#designPicker .chip').forEach(b => b.classList.remove('active-design'));
  btn.classList.add('active-design');
  params.design = btn.dataset.design;
});
document.querySelector('#designPicker .chip').classList.add('active-design');

// Color picker
document.getElementById('boidColorPicker').addEventListener('input', e => {
  params.boidColor = e.target.value;
  document.getElementById('randomColorBtn').classList.remove('active');
  for (const b of boids) b.color = params.boidColor;
});
document.getElementById('randomColorBtn').addEventListener('click', () => {
  params.boidColor = null;
  document.getElementById('randomColorBtn').classList.add('active');
  for (const b of boids) b.color = COLORS[Math.floor(Math.random() * COLORS.length)];
});
document.getElementById('randomColorBtn').classList.add('active');

// Obstacle picker
document.getElementById('obsPicker').addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn || !btn.dataset.shape) return;
  const shape = btn.dataset.shape;
  setFoodMode(false); setPreyMode(false);
  setObstacleMode(obstacleMode === shape ? null : shape);
});

// Food buttons
document.getElementById('placeFoodBtn').addEventListener('click', () => {
  setObstacleMode(null); setPreyMode(false);
  setFoodMode(!foodMode);
});
document.getElementById('clearFoodBtn').addEventListener('click', () => {
  foodTargets = [];
  setFoodMode(false);
  updateFoodCount();
});

// Prey buttons
document.getElementById('placePreyBtn').addEventListener('click', () => {
  setObstacleMode(null); setFoodMode(false);
  setPreyMode(!preyMode);
});
document.getElementById('clearPreyBtn').addEventListener('click', () => {
  preys = [];
  setPreyMode(false);
  updatePreyCount();
});

// Charts toggle
document.getElementById('chartsToggleBtn').addEventListener('click', () => {
  const sec = document.getElementById('metricsSection');
  const btn = document.getElementById('chartsToggleBtn');
  const hidden = sec.classList.toggle('charts-hidden');
  btn.title = hidden ? 'Show charts' : 'Hide charts';
  btn.querySelector('svg').innerHTML = hidden
    ? '<path d="M1 6s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/><line x1="2" y1="1" x2="14" y2="11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
    : '<path d="M1 6s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/>';
});

// Obstacle controls
document.getElementById('obsSize').addEventListener('input', e => {
  if (selectedObsIdx === -1) return;
  const s = parseFloat(e.target.value);
  obstacles[selectedObsIdx].scale = s;
  document.getElementById('obsSizeVal').textContent      = s.toFixed(2);
  document.getElementById('obsScaleDisplay').textContent = s.toFixed(2) + '×';
});
document.getElementById('obsAngle').addEventListener('input', e => {
  if (selectedObsIdx === -1) return;
  const deg = parseInt(e.target.value);
  obstacles[selectedObsIdx].angle = deg * Math.PI / 180;
  document.getElementById('obsAngleVal').textContent = deg + '°';
});
document.getElementById('obsDeleteBtn').addEventListener('click', () => {
  if (selectedObsIdx === -1) return;
  obstacles.splice(selectedObsIdx, 1);
  hideObsInfo();
});
document.getElementById('obsDuplicateBtn').addEventListener('click', () => {
  if (selectedObsIdx === -1) return;
  const dup = obstacles[selectedObsIdx].duplicate(35, 35);
  obstacles.push(dup);
  showObsInfo(obstacles.length - 1);
});
document.getElementById('clearObsBtn').addEventListener('click', () => {
  obstacles = []; selectedObsIdx = -1;
  hideObsInfo(); setObstacleMode(null);
});

document.getElementById('addBtn').addEventListener('click', () => {
  spawnBoid(); setBoidCount(boids.length);
});
document.getElementById('resetBtn').addEventListener('click', reset);
document.getElementById('infoClose').addEventListener('click', hideInfo);
document.getElementById('obsInfoClose').addEventListener('click', hideObsInfo);

// ============================================================
//  BOOT
// ============================================================
new ResizeObserver(resize).observe(canvas);
resize();
reset();
loop();
