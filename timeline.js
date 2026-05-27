/* =========================================================
   Sahayak — Memory Lane
   Constellation background + river-path between milestones.
   ========================================================= */

// Mark JS as available — CSS uses this to apply hide-then-reveal animations.
// Without this class, milestones are visible by default (progressive enhancement).
document.documentElement.classList.add('js');

// `reducedMotion` is already declared at the top of script.js (loaded first).
// Reusing that constant — don't redeclare or we collide and crash the file.
const tlReducedMotion = (typeof reducedMotion !== 'undefined')
  ? reducedMotion
  : window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    if (!tlReducedMotion) t += 0.012;
    requestAnimationFrame(draw);
  };
  draw();
})();

/* =========================================================
   RIVER — SVG path winding through milestones + glowing streaks
   ========================================================= */
const RIVER_STATE = { pathInfo: null, streaks: [] };

(() => {
  const svg = document.getElementById('river-svg');
  const milestones = document.querySelectorAll('.milestone');
  const track = document.querySelector('.timeline-track');
  if (!svg || !milestones.length || !track) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const build = () => {
    const trackRect = track.getBoundingClientRect();
    const W = track.offsetWidth;
    const H = track.offsetHeight;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // Milestone centers relative to track
    const pts = [];
    milestones.forEach(m => {
      const card = m.querySelector('.milestone-card');
      const cardRect = card.getBoundingClientRect();
      const x = (cardRect.left - trackRect.left) + cardRect.width / 2;
      const y = (cardRect.top - trackRect.top) + cardRect.height / 2;
      pts.push({ x, y });
    });
    if (pts.length < 2) return;

    // Smooth path with cubic Beziers
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

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'path-main');
    svg.appendChild(path);

    // Static nodes at each milestone
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

    // Glowing streaks — pulses traveling along the path
    const streaks = [];
    const N = 7;
    for (let i = 0; i < N; i++) {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('r', 9);
      halo.setAttribute('class', 'streak-halo');
      svg.appendChild(halo);

      const core = document.createElementNS(SVG_NS, 'circle');
      core.setAttribute('r', 2);
      core.setAttribute('class', 'streak-core');
      svg.appendChild(core);

      streaks.push({
        halo, core,
        pos: i / N,
        speed: 0.00045 + Math.random() * 0.0006,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const totalLen = path.getTotalLength();
    path.style.strokeDasharray = totalLen;
    path.style.strokeDashoffset = totalLen;

    RIVER_STATE.pathInfo = { path, totalLen, pts, W, H };
    RIVER_STATE.streaks = streaks;
  };

  build();

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(build, 150);
  });

  // Scroll-driven reveal of the path
  const onScroll = () => {
    if (!RIVER_STATE.pathInfo) return;
    const r = track.getBoundingClientRect();
    const winH = window.innerHeight;
    const scrolled = winH - r.top;
    const total = r.height + winH;
    const p = Math.max(0, Math.min(1, scrolled / total));
    RIVER_STATE.pathInfo.path.style.strokeDashoffset = RIVER_STATE.pathInfo.totalLen * (1 - p);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Re-trigger after layout settles
  setTimeout(() => { build(); onScroll(); }, 600);
  setTimeout(() => { build(); onScroll(); }, 2000);
})();

/* =========================================================
   STREAKS — animate glowing pulses along the path
   ========================================================= */
(() => {
  if (tlReducedMotion) return;
  let lastT = 0;
  const tick = (now) => {
    const pi = RIVER_STATE.pathInfo;
    if (pi && RIVER_STATE.streaks.length) {
      const dt = lastT ? (now - lastT) : 16;
      lastT = now;
      const t = now * 0.001;
      for (const s of RIVER_STATE.streaks) {
        s.pos += s.speed * (dt / 16);
        if (s.pos > 1) s.pos -= 1;
        try {
          const pt = pi.path.getPointAtLength(s.pos * pi.totalLen);
          const flicker = 0.4 + Math.sin(t * 1.4 + s.phase) * 0.45;
          s.halo.setAttribute('cx', pt.x);
          s.halo.setAttribute('cy', pt.y);
          s.halo.setAttribute('opacity', Math.max(0, flicker * 0.5));
          s.core.setAttribute('cx', pt.x);
          s.core.setAttribute('cy', pt.y);
          s.core.setAttribute('opacity', Math.max(0, flicker));
        } catch (_) { /* path replaced mid-frame, skip */ }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* =========================================================
   MILESTONE DEEP-DIVES — modal popup with full content
   ========================================================= */
const milestoneData = {
  '1': {
    numeral: 'I',
    date: 'XXVI · MAY · MMXXVI <span class="moment">— first light</span>',
    title: 'A Question Was Put on Paper',
    sections: [
      {
        label: 'What surfaced',
        body: 'A question, written on lined paper: how to deliver things in India when nothing else can. Heavy rain. Forty-degree heat. Two-in-the-morning silence. The moment when riders <em>cannot, will not, or should not.</em>'
      },
      {
        label: 'What was sketched',
        body: 'Three use-cases — delivery of things, assistance to an assembly line, spraying of medicine on fields. Six areas of operation — fields, factories, tech parks, campuses, labs. The shape was wider than what would survive.'
      },
      {
        label: 'What was deferred',
        body: 'No name. No geography. No form factor. The page was deliberately broad — <em>a question, not yet an answer.</em>'
      },
      {
        label: 'What came next',
        body: 'The same afternoon, the question began to narrow into a shape.'
      }
    ],
    tags: ['ideation', 'problem', 'exploration']
  },
  '2': {
    numeral: 'II',
    date: 'XXVI · MAY · MMXXVI <span class="moment">— mid-afternoon</span>',
    title: 'A Name Surfaced',
    sections: [
      {
        label: 'What surfaced',
        body: 'Six names were weighed. <em>Vayu</em>, the wind. <em>Dhruv</em>, the steadfast star. <em>Saathi</em>, the companion. <em>Mitra</em>, the friend. <em>Yantra</em>, the machine. And then <span class="devanagari-inline">सहायक</span> — <em>"assistant"</em> — surfaced as the closest match to what the robot would actually be. Not master. Not servant. A helper.'
      },
      {
        label: 'What was decided',
        body: 'The name. The city — Bangalore, where the founder network lives. The crew — two hands. The funding path — bootstrap, no outside money until unit-economics earn it. The form factor — <em>ground, never air.</em>'
      },
      {
        label: 'What was let go',
        body: 'Drones. Multi-segment ambitions. The notion that one form could serve every market. Sahayak would be a thing on wheels.'
      },
      {
        label: 'What came next',
        body: 'By dusk, the question of <em>where</em> and <em>who</em> would become urgent. The shape would narrow again.'
      }
    ],
    tags: ['name', 'place', 'crew', 'funding', 'form']
  },
  '3': {
    numeral: 'III',
    date: 'XXVI · MAY · MMXXVI <span class="moment">— dusk</span>',
    title: 'The Gate Opened',
    sections: [
      {
        label: 'What surfaced',
        body: 'A finding from elsewhere, and an observation closer to home. <em>Elsewhere:</em> Starship Technologies — across sixty-five American campuses — had earned ninety-seven percent approval and ten million deliveries. <em>Closer:</em> Indian mess kitchens close at nine. Students stay awake until two. Outside vendors are blocked at the hostel gate. Five dark hours, every night, with no food, no logistics, no help.'
      },
      {
        label: 'What was decided',
        body: 'The beachhead would be <em>campuses first</em>. Not tech parks, not gated communities, not airports. Campuses — paved, bounded, awake at night, full of payers and users in the same place.'
      },
      {
        label: 'What was let go',
        body: 'The instinct to chase the most-fundable segment. The temptation to start where competitors already stood. Campuses were not the glamorous choice. They were the <em>truer</em> one.'
      },
      {
        label: 'What came next',
        body: 'The next morning, requirements would be written down. The shape of the answer began to acquire edges.'
      }
    ],
    tags: ['beachhead', 'campus', 'pivot', 'validation']
  },
  '4': {
    numeral: 'IV',
    date: 'XXVII · MAY · MMXXVI <span class="moment">— morning</span>',
    title: 'Ten Lines on a Board',
    sections: [
      {
        label: 'What surfaced',
        body: 'Ten requirements were lined up on a whiteboard, each one a defense against an India-specific failure. <em>Routing</em>, for paths that curve and double back. <em>Obstacles</em>, including monkeys (named explicitly) and dogs (also named). <em>Road conditions</em>, in three sizes of pothole. <em>Weather</em> — wet, hot, blind. <em>Safety</em>, of people and of cargo. <em>Privacy</em>, of order and of presence. <em>Operational maintenance.</em> And, added later: <em>monitoring of the robot\'s own sensors.</em>'
      },
      {
        label: 'What was acknowledged',
        body: 'Twelve categories were not yet on the board: hardware basics, perception, compute, comms, user interface, multilingual UI, hand-off recovery, cargo internals, anti-theft, compliance, multi-floor, acoustic depth. <em>Twelve gaps, knowingly deferred.</em>'
      },
      {
        label: 'What was let go',
        body: 'The instinct to write everything at once. The board would grow. The thinking would be ringed, not exhausted.'
      },
      {
        label: 'What came next',
        body: 'By evening, the flat list would dissolve into a shape — boxes, lines, connections.'
      }
    ],
    tags: ['requirements', 'india-specific', 'v0']
  },
  '5': {
    numeral: 'V',
    date: 'XXVII · MAY · MMXXVI <span class="moment">— evening</span>',
    title: 'The Architecture Drew Itself',
    sections: [
      {
        label: 'What surfaced',
        body: 'A topology. <em>People</em>, <em>Environment</em>, and <em>Maintenance</em> — three external entities — surrounded a central <em>Rover</em>. Within the rover, four sub-systems: Structure, Electronics, Computing, Charging.'
      },
      {
        label: 'What was decided',
        body: 'Where two boxes shared a concern, they would be connected by an edge — never collapsed into one. <em>People\'s safety</em>, for example, would be serviced by the rover\'s Electronics (sensors, GPS), Computing (computer vision), and Structure (horn, lights, reflectors). Three connections, not one merger.'
      },
      {
        label: 'What remained open',
        body: 'Vendors, property administrators, fleet operations, regulators — all known to be missing, all flagged for future iterations. The architecture was designed to be <em>extended, not rewritten.</em>'
      },
      {
        label: 'What came next',
        body: 'The same evening, the first hard numbers and the first values were committed.'
      }
    ],
    tags: ['architecture', 'system', 'connections', 'boxes']
  },
  '6': {
    numeral: 'VI',
    date: 'XXVII · MAY · MMXXVI <span class="moment">— same evening</span>',
    title: 'Twenty Kilometres. Three Kilograms.',
    sections: [
      {
        label: 'What was committed',
        body: 'The first hard numbers. <em>Range</em>, twenty kilometres per charge. <em>Payload</em>, three kilograms. The first numerical constraints the rover would have to honour.'
      },
      {
        label: 'What was fastened',
        body: 'Four design values: <em>frugal but functional, max autonomy with minimum manpower, affordability, add value to people.</em> Each one a defense against drift.'
      },
      {
        label: 'How values do their work',
        body: 'When two technical paths score evenly, the path that serves the four anchors more cleanly wins. <em>Affordability</em> — given the bootstrap — breaks the tie at the tie-of-tie.'
      },
      {
        label: 'What was acknowledged',
        body: 'Many derived numbers — speed, weight, battery capacity, cost target, downtime tolerance — were not yet locked. They would be derived from the two committed targets, then validated against real use.'
      },
      {
        label: 'What came next',
        body: 'The river paused. The next whiteboard had not yet been drawn.'
      }
    ],
    tags: ['objectives', 'values', 'anchors']
  },
  '7': {
    numeral: 'VII',
    date: '— · ? · MMXXVI <span class="moment">— to come</span>',
    title: 'The Next Whiteboard',
    sections: [
      {
        label: 'What is known',
        body: 'The architecture will expand to include <em>Vendor, Property administrator, Fleet operations, Regulator.</em> The Charging sub-system will be unpacked. Requirements v0 will become v1, with the twelve gap categories merged in.'
      },
      {
        label: 'What is being prepared',
        body: 'Customer-discovery interviews are being queued. The hardware path — source-and-customize, or design-from-scratch — remains a <em>deliberate non-decision</em>.'
      },
      {
        label: 'What is being held',
        body: 'Speed. Restraint. The willingness to wait for evidence before locking what should be locked.'
      },
      {
        label: 'What will come',
        body: 'Another whiteboard. Then another. <em>The river continues.</em>'
      }
    ],
    tags: ['future', 'next']
  }
};

(() => {
  const modal = document.getElementById('memory-modal');
  if (!modal) return;
  const numeralEl = document.getElementById('modal-numeral');
  const dateEl = document.getElementById('modal-date');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const tagsEl = document.getElementById('modal-tags');
  const closeBtn = modal.querySelector('.modal-close');
  const backdrop = modal.querySelector('.modal-backdrop');

  let lastFocus = null;

  const open = (idx) => {
    const data = milestoneData[idx];
    if (!data) return;
    lastFocus = document.activeElement;

    numeralEl.textContent = data.numeral;
    dateEl.innerHTML = data.date;
    titleEl.innerHTML = data.title;
    bodyEl.innerHTML = data.sections.map(s =>
      `<section><h4>${s.label}</h4><p>${s.body}</p></section>`
    ).join('');
    tagsEl.innerHTML = data.tags.map(t =>
      `<span class="tag">${t}</span>`
    ).join('');

    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-content').scrollTop = 0;
    closeBtn.focus();
  };

  const close = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  // Wire up cards
  document.querySelectorAll('.milestone').forEach(m => {
    const card = m.querySelector('.milestone-card');
    const idx = m.getAttribute('data-index');
    if (!card || !idx) return;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', () => open(idx));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(idx);
      }
    });
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
  });
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
