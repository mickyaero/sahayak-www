/* =========================================================
   Sahayak — Memory Lane
   Constellation background + river-path between milestones.
   ========================================================= */

// Mark JS as available — CSS uses this to apply hide-then-reveal animations.
// Without this class, milestones are visible by default (progressive enhancement).
document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   STARS — drifting constellation background
   ========================================================= */
(() => {
  const canvas = document.getElementById('stars-canvas');
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

  const N = 160;
  const stars = [];
  for (let i = 0; i < N; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.4,
      phase: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      bright: 0.2 + Math.random() * 0.55,
    });
  }

  // Constellation lines — pick random pairs
  const lines = [];
  for (let i = 0; i < 48; i++) {
    const a = Math.floor(Math.random() * N);
    let b;
    do { b = Math.floor(Math.random() * N); } while (b === a);
    lines.push([a, b]);
  }

  let t = 0;
  const draw = () => {
    // Fade wipe
    ctx.fillStyle = 'rgba(14, 13, 11, 0.22)';
    ctx.fillRect(0, 0, w, h);

    // Drift + wrap
    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = w;
      if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h;
      if (s.y > h) s.y = 0;
    }

    // Constellation lines (subtle, distance-dependent)
    ctx.lineWidth = 0.6;
    for (const [a, b] of lines) {
      const A = stars[a], B = stars[b];
      const dx = A.x - B.x, dy = A.y - B.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 320) continue;
      const alpha = (1 - d / 320) * 0.09;
      ctx.strokeStyle = `rgba(200, 117, 51, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    }

    // Stars
    for (const s of stars) {
      const twinkle = 0.5 + Math.sin(t + s.phase) * 0.5;
      const a = s.bright * (0.4 + twinkle * 0.6);
      ctx.fillStyle = `rgba(237, 230, 213, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reducedMotion) t += 0.012;
    requestAnimationFrame(draw);
  };
  draw();
})();

/* =========================================================
   RIVER — SVG path winding through milestones
   ========================================================= */
(() => {
  const svg = document.getElementById('river-svg');
  const milestones = document.querySelectorAll('.milestone');
  const track = document.querySelector('.timeline-track');
  if (!svg || !milestones.length || !track) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let pathInfo = null;

  const build = () => {
    const trackRect = track.getBoundingClientRect();
    const W = track.offsetWidth;
    const H = track.offsetHeight;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // Compute milestone centers relative to track
    const pts = [];
    milestones.forEach(m => {
      const card = m.querySelector('.milestone-card');
      const cardRect = card.getBoundingClientRect();
      const x = (cardRect.left - trackRect.left) + cardRect.width / 2;
      const y = (cardRect.top - trackRect.top) + cardRect.height / 2;
      pts.push({ x, y });
    });

    if (pts.length < 2) return;

    // Build smooth path with cubic Beziers — S-curves between consecutive points
    let d = `M ${W / 2} 0`;
    d += ` Q ${W / 2} ${pts[0].y * 0.35}, ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const midY = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }
    const last = pts[pts.length - 1];
    d += ` Q ${last.x} ${last.y + 90}, ${W / 2} ${H}`;

    // Reset and rebuild SVG
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'path-main');
    svg.appendChild(path);

    // Nodes (with halo behind)
    pts.forEach(p => {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', p.x);
      halo.setAttribute('cy', p.y);
      halo.setAttribute('r', 14);
      halo.setAttribute('class', 'pulse');
      svg.appendChild(halo);

      const node = document.createElementNS(SVG_NS, 'circle');
      node.setAttribute('cx', p.x);
      node.setAttribute('cy', p.y);
      node.setAttribute('r', 5);
      node.setAttribute('class', 'node');
      svg.appendChild(node);
    });

    const totalLen = path.getTotalLength();
    path.style.strokeDasharray = totalLen;
    path.style.strokeDashoffset = totalLen;

    pathInfo = { path, totalLen, pts, W, H };
  };

  build();

  // Debounced rebuild on resize
  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(build, 150);
  });

  // Scroll-driven reveal of the path
  const onScroll = () => {
    if (!pathInfo) return;
    const r = track.getBoundingClientRect();
    const winH = window.innerHeight;
    // 0 when track is fully below viewport, 1 when fully past
    const scrolled = winH - r.top;
    const total = r.height + winH;
    const p = Math.max(0, Math.min(1, scrolled / total));
    pathInfo.path.style.strokeDashoffset = pathInfo.totalLen * (1 - p);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Re-trigger after layout settles (font + image loads)
  setTimeout(() => { build(); onScroll(); }, 600);
  setTimeout(() => { build(); onScroll(); }, 2000);
})();

/* =========================================================
   MILESTONE REVEALS — staggered fade-up on scroll
   ========================================================= */
(() => {
  const items = document.querySelectorAll('.milestone');
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
    { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
  );

  items.forEach((m, i) => {
    m.style.transitionDelay = `${i * 0.08}s`;
    obs.observe(m);
  });

  // Safety net — if anything goes sideways with the observer, force-reveal after 2s.
  setTimeout(() => {
    items.forEach(m => m.classList.add('visible'));
  }, 2000);
})();
