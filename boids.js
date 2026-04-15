'use strict';

// ============================================================
//  VECTOR
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
}

// ============================================================
//  DESIGNS
// ============================================================
const DESIGNS = {
  arrow(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r * 2.5, 0); ctx.lineTo(-r, r * 0.95);
    ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r, -r * 0.95);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  },
  bird(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r * 2.2, 0); ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r * 0.9, 0); ctx.lineTo(0, -r * 0.45);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    const prev = ctx.globalAlpha; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(r*.4,0); ctx.lineTo(-r*.4,-r*1.7); ctx.lineTo(-r,-r*.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r*.4,0); ctx.lineTo(-r*.4, r*1.7); ctx.lineTo(-r, r*.3); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = prev;
  },
  dot(ctx, r, color) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r * 2.8, 0);
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  },
  diamond(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r*2.3,0); ctx.lineTo(0,r*1.1); ctx.lineTo(-r*1.1,0); ctx.lineTo(0,-r*1.1);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  },
  dart(ctx, r, color) {
    ctx.beginPath();
    ctx.moveTo(r*3.2,0); ctx.lineTo(-r*.4,r*.5); ctx.lineTo(r*.5,0); ctx.lineTo(-r*.4,-r*.5);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  },
  ring(ctx, r, color) {
    ctx.beginPath(); ctx.arc(0,0,r*1.4,0,Math.PI*2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*1.4,0); ctx.lineTo(r*2.8,0);
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,1.5,0,Math.PI*2); ctx.fillStyle = color; ctx.fill();
  },
  fish(ctx, r, color) {
    ctx.beginPath(); ctx.ellipse(0,0,r*2,r*.8,0,0,Math.PI*2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r*1.6,0); ctx.lineTo(-r*3,-r); ctx.lineTo(-r*3,r);
    ctx.closePath(); const p = ctx.globalAlpha; ctx.globalAlpha=.65; ctx.fill(); ctx.globalAlpha=p;
  },
  cross(ctx, r, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r,0); ctx.lineTo(r*2.5,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*.5,-r*1.1); ctx.lineTo(r*.5,r*1.1); ctx.stroke();
  },
};

// ============================================================
//  THEMES
// ============================================================
const THEMES = {
  cosmic: { label:'Cosmic',  bg:'#06080f', trail:.13, accent:'#818cf8',
    palette:['#818cf8','#c084fc','#38bdf8','#f472b6','#22d3ee','#a78bfa'] },
  ocean:  { label:'Ocean',   bg:'#020d14', trail:.12, accent:'#0ea5e9',
    palette:['#06b6d4','#0ea5e9','#22d3ee','#67e8f9','#38bdf8','#7dd3fc'] },
  forest: { label:'Forest',  bg:'#030c05', trail:.14, accent:'#4ade80',
    palette:['#4ade80','#86efac','#a3e635','#34d399','#6ee7b7','#bbf7d0'] },
  ember:  { label:'Ember',   bg:'#0f0600', trail:.11, accent:'#f97316',
    palette:['#f97316','#fb923c','#fbbf24','#ef4444','#f43f5e','#fde047'] },
  mono:   { label:'Mono',    bg:'#090909', trail:.16, accent:'#94a3b8',
    palette:['#e2e8f0','#94a3b8','#cbd5e1','#64748b','#f1f5f9','#475569'] },
  neon:   { label:'Neon',    bg:'#04000f', trail:.09, accent:'#f0abfc',
    palette:['#f0abfc','#a78bfa','#818cf8','#34d399','#fbbf24','#fb7185'] },
};

// ============================================================
//  PARAMS
// ============================================================
const params = {
  cohesionWeight:   1.0,
  alignmentWeight:  1.0,
  separationWeight: 1.5,
  cohesionRadius:   80,
  alignmentRadius:  60,
  separationRadius: 30,
  fovAngle:         270,
  maxSpeed:         3.5,
  maxForce:         0.12,
  trailAlpha:       0.13,
  design:           'arrow',
  borderMode:       'wrap',
  boidSize:         1.0,
  speedVariation:   true,
  theme:            'cosmic',
  customColor:      null,
};

let currentTheme = THEMES.cosmic;

function applyTheme(key) {
  params.theme = key;
  currentTheme = THEMES[key];
  params.trailAlpha = currentTheme.trail;
  document.getElementById('trailLength').value = currentTheme.trail;
  document.getElementById('trailLengthVal').textContent = currentTheme.trail.toFixed(2);
  if (!params.customColor) reassignBoidColors();
  // Update accent dot colors in theme picker
  document.querySelectorAll('.theme-chip').forEach(c => {
    c.classList.toggle('active-chip', c.dataset.theme === key);
  });
}

function boidColor() {
  if (params.customColor) return params.customColor;
  const p = currentTheme.palette;
  return p[Math.floor(Math.random() * p.length)];
}
function reassignBoidColors() { for (const b of boids) b.color = boidColor(); }

// ============================================================
//  SPATIAL GRID
// ============================================================
class SpatialGrid {
  constructor(cs) { this.cs = cs; this.cells = new Map(); }
  _k(cx,cy) { return (cx & 0xFFFF) | ((cy & 0xFFFF) << 16); }
  clear() { this.cells.clear(); }
  insert(b) {
    const cx = Math.floor(b.pos.x/this.cs), cy = Math.floor(b.pos.y/this.cs);
    const k = this._k(cx,cy);
    if (!this.cells.has(k)) this.cells.set(k,[]);
    this.cells.get(k).push(b);
  }
  query(x,y,r) {
    const res=[], rc=Math.ceil(r/this.cs), cx0=Math.floor(x/this.cs), cy0=Math.floor(y/this.cs);
    for (let dx=-rc;dx<=rc;dx++) for (let dy=-rc;dy<=rc;dy++) {
      const c = this.cells.get(this._k(cx0+dx,cy0+dy));
      if (c) for (const b of c) res.push(b);
    }
    return res;
  }
}
const grid = new SpatialGrid(100);

// ============================================================
//  BOID
// ============================================================
class Boid {
  constructor(x,y) {
    this.pos = new Vector(x,y);
    const a = Math.random()*Math.PI*2;
    this.vel = new Vector(Math.cos(a)*(1+Math.random()*2), Math.sin(a)*(1+Math.random()*2));
    this.acc = new Vector();
    this.r   = 4.5;
    this.color = boidColor();
    this._dCoh=0; this._dAli=0; this._dSep=0; this._dNeighbors=0;
  }

  _inFov(op) {
    if (params.fovAngle >= 360) return true;
    const half = (params.fovAngle*Math.PI/180)/2;
    const head = Math.atan2(this.vel.y, this.vel.x);
    const to   = Math.atan2(op.y-this.pos.y, op.x-this.pos.x);
    let d = to-head;
    while(d> Math.PI) d-=2*Math.PI;
    while(d<-Math.PI) d+=2*Math.PI;
    return Math.abs(d)<=half;
  }

  flock(w,h) {
    const maxR = Math.max(params.cohesionRadius,params.alignmentRadius,params.separationRadius);
    const nb   = grid.query(this.pos.x,this.pos.y,maxR);
    const coh  = this._cohesion(nb);
    const ali  = this._alignment(nb);
    const sep  = this._separation(nb);
    this._dCoh=coh.mag(); this._dAli=ali.mag(); this._dSep=sep.mag();
    this.acc.iadd(coh.mul(params.cohesionWeight));
    this.acc.iadd(ali.mul(params.alignmentWeight));
    this.acc.iadd(sep.mul(params.separationWeight));
    if (params.borderMode==='soft') this.acc.iadd(this._softWalls(w,h));
  }

  _softWalls(w,h) {
    const m=90,s=.55,f=new Vector();
    if (this.pos.x<m)     f.x+=(m-this.pos.x)/m*s;
    if (this.pos.x>w-m)   f.x-=(this.pos.x-(w-m))/m*s;
    if (this.pos.y<m)     f.y+=(m-this.pos.y)/m*s;
    if (this.pos.y>h-m)   f.y-=(this.pos.y-(h-m))/m*s;
    return f;
  }

  update(w,h) {
    let top = params.maxSpeed;
    if (params.speedVariation) {
      if      (this._dNeighbors===0) top*=.55;
      else if (this._dNeighbors>3)   top*=1.0;
      else                           top*=.8;
    }
    this.vel = this.vel.add(this.acc).limit(top);
    if (this.vel.mag()<.3) this.vel = this.vel.norm().mul(.3);
    this.pos = this.pos.add(this.vel);
    this.acc = new Vector();
    switch(params.borderMode) {
      case 'wrap':
        if(this.pos.x<0) this.pos.x+=w; if(this.pos.x>w) this.pos.x-=w;
        if(this.pos.y<0) this.pos.y+=h; if(this.pos.y>h) this.pos.y-=h; break;
      case 'bounce':
        if(this.pos.x<=0){this.pos.x=0;this.vel.x= Math.abs(this.vel.x);}
        if(this.pos.x>=w){this.pos.x=w;this.vel.x=-Math.abs(this.vel.x);}
        if(this.pos.y<=0){this.pos.y=0;this.vel.y= Math.abs(this.vel.y);}
        if(this.pos.y>=h){this.pos.y=h;this.vel.y=-Math.abs(this.vel.y);} break;
      case 'soft':
        this.pos.x=Math.max(0,Math.min(w,this.pos.x));
        this.pos.y=Math.max(0,Math.min(h,this.pos.y)); break;
    }
  }

  show(ctx, sel) {
    const angle = Math.atan2(this.vel.y,this.vel.x);
    const r = this.r * params.boidSize;
    ctx.save();
    ctx.translate(this.pos.x,this.pos.y); ctx.rotate(angle);
    ctx.shadowBlur  = sel ? 26 : 8;
    ctx.shadowColor = sel ? '#fff' : this.color;
    DESIGNS[params.design](ctx,r,this.color);
    ctx.restore();
    if (sel) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.pos.x,this.pos.y,20*Math.max(.6,params.boidSize),0,Math.PI*2);
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.5;
      ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
  }

  showRadii(ctx) {
    const rings=[
      {r:params.cohesionRadius,   fill:'rgba(34,211,238,0.05)',   stroke:'rgba(34,211,238,0.3)'},
      {r:params.alignmentRadius,  fill:'rgba(134,239,172,0.05)',  stroke:'rgba(134,239,172,0.25)'},
      {r:params.separationRadius, fill:'rgba(251,113,133,0.07)',  stroke:'rgba(251,113,133,0.4)'},
    ];
    for (const {r,fill,stroke} of rings) {
      ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,r,0,Math.PI*2);
      ctx.fillStyle=fill; ctx.strokeStyle=stroke; ctx.lineWidth=1;
      ctx.setLineDash([4,5]); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    }
    if (params.fovAngle<360) {
      const half=(params.fovAngle*Math.PI/180)/2;
      const head=Math.atan2(this.vel.y,this.vel.x);
      const maxR=Math.max(params.cohesionRadius,params.alignmentRadius);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(this.pos.x,this.pos.y);
      ctx.arc(this.pos.x,this.pos.y,maxR,head-half,head+half);
      ctx.closePath();
      ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.strokeStyle='rgba(255,255,255,0.14)';
      ctx.lineWidth=1; ctx.setLineDash([3,5]); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
  }

  _cohesion(c) {
    const center=new Vector(); let n=0;
    for (const b of c) {
      if (b===this) continue;
      if (this.pos.dist(b.pos)<params.cohesionRadius && this._inFov(b.pos)) { center.iadd(b.pos); n++; }
    }
    this._dNeighbors=n;
    if (!n) return new Vector();
    return center.div(n).sub(this.pos).norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce);
  }
  _alignment(c) {
    const avg=new Vector(); let n=0;
    for (const b of c) {
      if (b===this) continue;
      if (this.pos.dist(b.pos)<params.alignmentRadius && this._inFov(b.pos)) { avg.iadd(b.vel); n++; }
    }
    if (!n) return new Vector();
    return avg.div(n).norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce);
  }
  _separation(c) {
    const st=new Vector(); let n=0;
    for (const b of c) {
      if (b===this) continue;
      const d=this.pos.dist(b.pos);
      if (d>0 && d<params.separationRadius) { st.iadd(this.pos.sub(b.pos).norm().div(d)); n++; }
    }
    if (!n) return new Vector();
    return st.div(n).norm().mul(params.maxSpeed).sub(this.vel).limit(params.maxForce);
  }
}

// ============================================================
//  MINI CHARTS
// ============================================================
const CHART_LEN = 150;
const chartSpeed    = new Array(CHART_LEN).fill(0);
const chartPolarity = new Array(CHART_LEN).fill(0);
const chartDensity  = new Array(CHART_LEN).fill(0);
function pushChart(a,v) { a.push(v); if(a.length>CHART_LEN) a.shift(); }

function drawMiniChart(id, data, color, maxVal) {
  const el = document.getElementById(id);
  if (!el) return;
  const dpr = window.devicePixelRatio||1;
  el.width  = el.offsetWidth*dpr;
  el.height = el.offsetHeight*dpr;
  const w=el.width, h=el.height, dc=el.getContext('2d');
  dc.clearRect(0,0,w,h);
  dc.strokeStyle='rgba(255,255,255,0.04)'; dc.lineWidth=1;
  dc.beginPath(); dc.moveTo(0,h/2); dc.lineTo(w,h/2); dc.stroke();
  if (!data.length) return;
  const mx=maxVal||Math.max(...data)||1, step=w/(CHART_LEN-1);
  const grad=dc.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,color+'44'); grad.addColorStop(1,color+'00');
  dc.beginPath(); dc.moveTo(0,h);
  for (let i=0;i<data.length;i++) dc.lineTo(i*step, h-(data[i]/mx)*h);
  dc.lineTo((data.length-1)*step,h); dc.closePath(); dc.fillStyle=grad; dc.fill();
  dc.beginPath();
  for (let i=0;i<data.length;i++) {
    const x=i*step, y=h-(data[i]/mx)*h;
    i===0?dc.moveTo(x,y):dc.lineTo(x,y);
  }
  dc.strokeStyle=color; dc.lineWidth=1.5; dc.stroke();
}

// ============================================================
//  STATE
// ============================================================
const canvas = document.getElementById('boidsCanvas');
const ctx    = canvas.getContext('2d');
let boids=[], selectedBoid=null, lastInfo=0, lastChart=0;
const INIT_COUNT=80;

function resize() { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; }

function spawnBoid(x,y) {
  boids.push(new Boid(
    x!==undefined?x:Math.random()*canvas.width,
    y!==undefined?y:Math.random()*canvas.height
  ));
  updateBadge();
}
function updateBadge() { document.getElementById('agentCount').textContent=boids.length; }

function setBoidCount(n) {
  n=Math.max(1,Math.round(n));
  while(boids.length<n) spawnBoid();
  while(boids.length>n) {
    const rem=boids.pop();
    if(rem===selectedBoid){selectedBoid=null;hideInfo();}
  }
  updateBadge();
  const sl=document.getElementById('boidCountSlider');
  sl.value=Math.min(n,parseInt(sl.max));
  document.getElementById('boidCountInput').value=n;
}

function reset() {
  boids=[]; selectedBoid=null;
  for(let i=0;i<INIT_COUNT;i++) spawnBoid();
  hideInfo();
  document.getElementById('boidCountSlider').value=INIT_COUNT;
  document.getElementById('boidCountInput').value=INIT_COUNT;
  updateBadge();
}

// ============================================================
//  LOOP
// ============================================================
function loop() {
  const bg=currentTheme.bg;
  const r=parseInt(bg.slice(1,3),16), g=parseInt(bg.slice(3,5),16), b=parseInt(bg.slice(5,7),16);
  ctx.fillStyle=`rgba(${r},${g},${b},${params.trailAlpha})`;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (params.borderMode==='bounce') {
    ctx.save(); ctx.strokeStyle='rgba(92,112,240,0.15)'; ctx.lineWidth=2;
    ctx.strokeRect(1,1,canvas.width-2,canvas.height-2); ctx.restore();
  } else if (params.borderMode==='soft') {
    const m=90; ctx.save(); ctx.strokeStyle='rgba(92,112,240,0.1)'; ctx.lineWidth=1;
    ctx.setLineDash([6,6]); ctx.strokeRect(m,m,canvas.width-m*2,canvas.height-m*2);
    ctx.setLineDash([]); ctx.restore();
  }

  grid.clear();
  for (const b of boids) grid.insert(b);
  if (selectedBoid && boids.includes(selectedBoid)) selectedBoid.showRadii(ctx);
  for (const b of boids) { b.flock(canvas.width,canvas.height); b.update(canvas.width,canvas.height); b.show(ctx,b===selectedBoid); }

  const now=performance.now();
  if (now-lastChart>66) { updateCharts(); lastChart=now; }
  if (now-lastInfo>33 && selectedBoid) {
    if (boids.includes(selectedBoid)) updateInfoPanel(selectedBoid);
    else { selectedBoid=null; hideInfo(); }
    lastInfo=now;
  }
  requestAnimationFrame(loop);
}

function updateCharts() {
  if (!boids.length) return;
  let ss=0; for (const b of boids) ss+=b.vel.mag();
  const as=ss/boids.length;
  pushChart(chartSpeed,as);
  document.getElementById('chartSpeedVal').textContent=as.toFixed(2);
  drawMiniChart('chartSpeed',chartSpeed,'#22d3ee',params.maxSpeed);

  let sx=0,sy=0;
  for (const b of boids) { const m=b.vel.mag()||1; sx+=b.vel.x/m; sy+=b.vel.y/m; }
  const pol=Math.hypot(sx,sy)/boids.length;
  pushChart(chartPolarity,pol);
  document.getElementById('chartPolarityVal').textContent=Math.round(pol*100)+'%';
  drawMiniChart('chartPolarity',chartPolarity,'#86efac',1);

  let sn=0; for (const b of boids) sn+=b._dNeighbors;
  const an=sn/boids.length;
  pushChart(chartDensity,an);
  document.getElementById('chartDensityVal').textContent=an.toFixed(1);
  drawMiniChart('chartDensity',chartDensity,'#c084fc',20);
}

// ============================================================
//  INFO PANEL
// ============================================================
function showInfo(boid) { selectedBoid=boid; document.getElementById('infoSection').hidden=false; updateInfoPanel(boid); }
function hideInfo()     { selectedBoid=null; document.getElementById('infoSection').hidden=true; }

function updateInfoPanel(b) {
  const spd=b.vel.mag();
  const heading=Math.round((Math.atan2(b.vel.y,b.vel.x)*180/Math.PI+360)%360);
  document.getElementById('infoSpeed').textContent   = spd.toFixed(2);
  document.getElementById('infoHeading').textContent = heading+'°';
  document.getElementById('infoNeighbors').textContent = b._dNeighbors;
  document.getElementById('infoPos').textContent = `${Math.round(b.pos.x)}, ${Math.round(b.pos.y)}`;
  const maxF=params.maxForce||.01;
  const pct=v=>Math.min(100,(v/maxF)*100).toFixed(1)+'%';
  document.getElementById('barCoh').style.width=pct(b._dCoh);
  document.getElementById('barAli').style.width=pct(b._dAli);
  document.getElementById('barSep').style.width=pct(b._dSep);
  document.getElementById('numCoh').textContent=b._dCoh.toFixed(3);
  document.getElementById('numAli').textContent=b._dAli.toFixed(3);
  document.getElementById('numSep').textContent=b._dSep.toFixed(3);
}

// ============================================================
//  CANVAS EVENTS
// ============================================================
canvas.addEventListener('click', e => {
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  let closest=null, best=22;
  for (const b of boids) { const d=b.pos.dist(new Vector(mx,my)); if(d<best){best=d;closest=b;} }
  if (closest) { closest===selectedBoid?hideInfo():showInfo(closest); return; }
  if (selectedBoid) { hideInfo(); return; }
  spawnBoid(mx,my); setBoidCount(boids.length);
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  let closest=null, best=28;
  for (const b of boids) { const d=b.pos.dist(new Vector(mx,my)); if(d<best){best=d;closest=b;} }
  if (closest) {
    if(closest===selectedBoid) hideInfo();
    boids.splice(boids.indexOf(closest),1);
    setBoidCount(boids.length);
  }
});

document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT') return;
  if (e.key==='Escape' && selectedBoid) hideInfo();
});

// ============================================================
//  UI BINDINGS
// ============================================================
function bindSlider(id,valId,key,parse=parseFloat) {
  const el=document.getElementById(id), ve=document.getElementById(valId);
  if (!el||!ve) return;
  el.addEventListener('input',()=>{
    params[key]=parse(el.value);
    const dec=el.step&&el.step.includes('.')?el.step.split('.')[1].length:(parse===parseInt?0:1);
    ve.textContent=parse===parseInt?parseInt(el.value):parseFloat(el.value).toFixed(dec);
  });
}

bindSlider('cohesionWeight',   'cohesionVal',        'cohesionWeight');
bindSlider('alignmentWeight',  'alignmentVal',       'alignmentWeight');
bindSlider('separationWeight', 'separationVal',      'separationWeight');
bindSlider('cohesionRadius',   'cohesionRadiusVal',  'cohesionRadius',  parseInt);
bindSlider('alignmentRadius',  'alignmentRadiusVal', 'alignmentRadius', parseInt);
bindSlider('separationRadius', 'separationRadiusVal','separationRadius',parseInt);
bindSlider('fovAngle',         'fovAngleVal',        'fovAngle',        parseInt);
bindSlider('maxSpeed',         'maxSpeedVal',        'maxSpeed');
bindSlider('maxForce',         'maxForceVal',        'maxForce');
bindSlider('trailLength',      'trailLengthVal',     'trailAlpha');
bindSlider('boidSize',         'boidSizeVal',        'boidSize');

document.getElementById('boidCountSlider').addEventListener('input', e=>setBoidCount(parseInt(e.target.value)));
document.getElementById('boidCountInput').addEventListener('change', e=>{
  const v=parseInt(e.target.value); if(!isNaN(v)&&v>=1) setBoidCount(v);
});
document.getElementById('speedVariation').addEventListener('change', e=>{ params.speedVariation=e.target.checked; });

document.getElementById('borderPicker').addEventListener('click', e=>{
  const btn=e.target.closest('.chip'); if(!btn||!btn.dataset.border) return;
  document.querySelectorAll('#borderPicker .chip').forEach(b=>b.classList.remove('active-chip'));
  btn.classList.add('active-chip'); params.borderMode=btn.dataset.border;
});

document.getElementById('designPicker').addEventListener('click', e=>{
  const btn=e.target.closest('.chip'); if(!btn||!btn.dataset.design) return;
  document.querySelectorAll('#designPicker .chip').forEach(b=>b.classList.remove('active-chip'));
  btn.classList.add('active-chip'); params.design=btn.dataset.design;
});
document.querySelector('#designPicker .chip').classList.add('active-chip');

document.getElementById('themePicker').addEventListener('click', e=>{
  const btn=e.target.closest('.theme-chip'); if(!btn||!btn.dataset.theme) return;
  applyTheme(btn.dataset.theme);
});

document.getElementById('boidColorPicker').addEventListener('input', e=>{
  params.customColor=e.target.value;
  document.getElementById('randomColorBtn').classList.remove('active');
  for (const b of boids) b.color=params.customColor;
});
document.getElementById('randomColorBtn').addEventListener('click', ()=>{
  params.customColor=null;
  document.getElementById('randomColorBtn').classList.add('active');
  reassignBoidColors();
});
document.getElementById('randomColorBtn').classList.add('active');

document.getElementById('chartsToggleBtn').addEventListener('click', ()=>{
  const hidden=document.getElementById('metricsSection').classList.toggle('charts-hidden');
  document.getElementById('chartsToggleBtn').title=hidden?'Show charts':'Hide charts';
});

document.getElementById('addBtn').addEventListener('click', ()=>{ spawnBoid(); setBoidCount(boids.length); });
document.getElementById('resetBtn').addEventListener('click', reset);
document.getElementById('infoClose').addEventListener('click', hideInfo);

// ============================================================
//  BOOT
// ============================================================
new ResizeObserver(resize).observe(canvas);
applyTheme('cosmic');
resize();
reset();
loop();
