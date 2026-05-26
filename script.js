/* =========================================================
   Sahayak — Cartography of Motion
   Mathematical animation suite
   ========================================================= */

const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = (Math.PI * 2) / (PHI * PHI); // ≈ 137.508°

// Respect reduced-motion
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   HERO — phyllotaxis lattice + Lissajous overlay
   ========================================================= */
(() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, cx, cy;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h / 2;
  };
  resize();
  window.addEventListener('resize', resize);

  // Phyllotaxis seeds — golden-angle spiral
  const N = 240;
  const seeds = [];
  for (let i = 1; i <= N; i++) {
    seeds.push({
      i,
      angle: i * GOLDEN_ANGLE,
      r: 6.5 * Math.sqrt(i),
      phase: i * 0.045,
    });
  }

  let t = 0;
  const draw = () => {
    // Slight motion-trail wash
    ctx.fillStyle = 'rgba(14, 13, 11, 0.08)';
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w, h) / 720;

    // Phyllotaxis dots, each on its own phase
    for (const s of seeds) {
      const wobble = Math.sin(t * 0.5 + s.phase) * 6;
      const rr = (s.r + wobble) * scale;
      const x = cx + Math.cos(s.angle + t * 0.038) * rr;
      const y = cy + Math.sin(s.angle + t * 0.038) * rr;
      const a = 0.16 + Math.sin(t * 1.1 + s.phase) * 0.12;
      ctx.fillStyle = `rgba(237, 230, 213, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lissajous overlay — robot trajectory metaphor
    const R = Math.min(w, h) * 0.34;
    ctx.strokeStyle = 'rgba(200, 117, 51, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const segs = 720;
    for (let i = 0; i <= segs; i++) {
      const u = (i / segs) * Math.PI * 2;
      const x = cx + Math.sin(3 * u + t * 0.22) * R;
      const y = cy + Math.sin(4 * u + t * 0.16) * R * 0.78;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (!reducedMotion) t += 0.011;
    requestAnimationFrame(draw);
  };
  draw();
})();

/* =========================================================
   MATH INTERLUDE — rose curve r = a·cos(kθ), unfurling
   ========================================================= */
(() => {
  const canvas = document.getElementById('math-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, cx, cy;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h / 2;
  };
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  let progress = 0;
  let inView = false;

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => (inView = e.isIntersecting)),
    { threshold: 0.18 }
  );
  obs.observe(canvas);

  const draw = () => {
    // Ghost trail — long-lived
    ctx.fillStyle = 'rgba(14, 13, 11, 0.045)';
    ctx.fillRect(0, 0, w, h);

    if (inView && progress < 1) {
      progress = Math.min(1, progress + (reducedMotion ? 1 : 0.0028));
    }

    const k = 5;
    const R = Math.min(w, h) * 0.36;
    const segs = 1400;
    const points = Math.floor(segs * progress);

    // Primary rose
    ctx.strokeStyle = 'rgba(200, 117, 51, 0.82)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const theta = (i / segs) * Math.PI * 4 + t * 0.08;
      const r = R * Math.cos(k * theta);
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary cream rose (k=3, slower drift opposite direction)
    ctx.strokeStyle = 'rgba(237, 230, 213, 0.22)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const theta = (i / segs) * Math.PI * 4 - t * 0.05;
      const r = R * 0.72 * Math.cos(3 * theta);
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (!reducedMotion) t += 0.014;
    requestAnimationFrame(draw);
  };
  draw();
})();

/* =========================================================
   CURSOR BREADCRUMB — saffron dotted trail
   ========================================================= */
(() => {
  const canvas = document.getElementById('cursor-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  let dots = [];
  let lastX = -1, lastY = -1;

  // Skip on touch devices
  const isTouch = 'ontouchstart' in window;
  if (isTouch) return;

  window.addEventListener('mousemove', e => {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (lastX < 0 || dx * dx + dy * dy > 14) {
      dots.push({ x: e.clientX, y: e.clientY, life: 1 });
      lastX = e.clientX;
      lastY = e.clientY;
      if (dots.length > 60) dots.shift();
    }
  });

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.life -= 0.018;
      const a = Math.max(0, d.life);
      ctx.fillStyle = `rgba(200, 117, 51, ${a * 0.55})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    dots = dots.filter(d => d.life > 0);
    requestAnimationFrame(draw);
  };
  draw();
})();

/* =========================================================
   NUMBER COUNT-UPS — damped harmonic, mathematical feel
   ========================================================= */
(() => {
  const nums = document.querySelectorAll('.stat .number');
  if (!nums.length) return;

  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (!e.isIntersecting || e.target.dataset.animated) return;
        e.target.dataset.animated = '1';

        const target = parseInt(e.target.dataset.target, 10);
        const start = performance.now();
        const duration = 1800;

        const step = now => {
          const t = Math.min(1, (now - start) / duration);
          // Damped harmonic curve — 1 - e^(-5t) * cos(7t·π/4)
          // Settles smoothly with subtle springy overshoot.
          const eased = 1 - Math.exp(-5 * t) * Math.cos(7 * t * (Math.PI / 4));
          const v = Math.floor(target * Math.min(1, eased));
          e.target.textContent = Math.max(0, v);
          if (t < 1) requestAnimationFrame(step);
          else e.target.textContent = target;
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.5 }
  );

  nums.forEach(n => obs.observe(n));
})();

/* =========================================================
   SECTION REVEALS
   ========================================================= */
(() => {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach(i => obs.observe(i));

  // Trigger hero reveal immediately
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    requestAnimationFrame(() => heroContent.classList.add('visible'));
  }
})();
