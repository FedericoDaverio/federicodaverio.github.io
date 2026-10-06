// Particle shape that rotates and morphs between forms. Click or drag to interact.
(function () {
  const canvas = document.getElementById('hero');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const N = 1600;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Target shapes, each returns N points in [-1,1]^3
  const shapes = [
    i => { // sphere (fibonacci)
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996;
      return [Math.cos(t) * r, y, Math.sin(t) * r];
    },
    i => { // torus
      const u = (i / N) * Math.PI * 2 * 40, v = (i / N) * Math.PI * 2;
      const R = .7, r = .28;
      return [(R + r * Math.cos(u)) * Math.cos(v), r * Math.sin(u), (R + r * Math.cos(u)) * Math.sin(v)];
    },
    i => { // wave surface
      const g = Math.ceil(Math.sqrt(N)), x = (i % g) / (g - 1) * 2 - 1, z = Math.floor(i / g) / (g - 1) * 2 - 1;
      return [x, Math.sin(x * 3) * Math.cos(z * 3) * .35, z];
    },
    i => { // double helix
      const t = (i / N) * Math.PI * 8, s = i % 2 ? Math.PI : 0;
      return [Math.cos(t + s) * .45, (i / N) * 2 - 1, Math.sin(t + s) * .45];
    },
    i => { // cube surface
      const f = i % 6, a = Math.random() * 2 - 1, b = Math.random() * 2 - 1, s = .75;
      const p = [[1, a, b], [-1, a, b], [a, 1, b], [a, -1, b], [a, b, 1], [a, b, -1]][f];
      return p.map(c => c * s);
    }
  ];
  const labels = [
    ['Sphere', '<i>x</i><sup>2</sup> + <i>y</i><sup>2</sup> + <i>z</i><sup>2</sup> = 1'],
    ['Torus', '(&radic;<span class="ov"><i>x</i><sup>2</sup> + <i>z</i><sup>2</sup></span> &minus; <i>R</i>)<sup>2</sup> + <i>y</i><sup>2</sup> = <i>r</i><sup>2</sup>'],
    ['Wave surface', '<i>y</i> = <i>A</i> sin(3<i>x</i>) cos(3<i>z</i>)'],
    ['Double helix', '(<i>x</i>, <i>y</i>, <i>z</i>) = (<i>a</i> cos(<i>t</i> + <i>k</i>&pi;), <i>b t</i>, <i>a</i> sin(<i>t</i> + <i>k</i>&pi;)),&ensp;<i>k</i> &isin; {0, 1}'],
    ['Cube', 'max(|<i>x</i>|, |<i>y</i>|, |<i>z</i>|) = <i>s</i>']
  ];
  const nameEl = document.getElementById('shape-name'), eqEl = document.getElementById('shape-eq');
  const targets = shapes.map(fn => Array.from({ length: N }, (_, i) => fn(i)));
  let cur = 0, from = targets[0], t = 1;
  const pts = targets[0].map(p => p.slice());

  let rotY = 0, rotX = -.35, vY = .004, drag = null, last = performance.now(), sinceMorph = 0;
  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--agave').trim() || '#2F6B57';

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function next() { from = pts.map(p => p.slice()); cur = (cur + 1) % targets.length; t = 0; sinceMorph = 0;
    if (nameEl) { nameEl.textContent = labels[cur][0]; eqEl.innerHTML = labels[cur][1]; } }
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  function frame(now) {
    const dt = Math.min(now - last, 50); last = now;
    if (!reduce) {
      if (!drag) rotY += vY * dt / 16;
      sinceMorph += dt;
      if (sinceMorph > 4500 && t >= 1) next();
    }
    if (t < 1) {
      t = Math.min(1, t + dt / 1400); const e = ease(t), tg = targets[cur];
      for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) pts[i][k] = from[i][k] + (tg[i][k] - from[i][k]) * e;
    }
    const w = canvas.clientWidth, h = canvas.clientHeight, s = Math.min(w, h) * .38;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = color();
    const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    for (const [x, y, z] of pts) {
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const persp = 2.6 / (2.6 + z2);
      ctx.globalAlpha = .25 + .6 * (1 - (z2 + 1) / 2);
      ctx.fillRect(w / 2 + x1 * s * persp, h / 2 + y1 * s * persp, 1.8 * persp, 1.8 * persp);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    rotY += dx * .01; rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * .01));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', () => { if (drag && !drag.moved) next(); drag = null; });
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });

  window.addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();
