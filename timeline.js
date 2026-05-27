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
const RIVER_STATE = { pathInfo: null };

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

    const totalLen = path.getTotalLength();
    path.style.strokeDasharray = totalLen;
    path.style.strokeDashoffset = totalLen;

    // Pre-sample main path with positions + normals — basis for sine waves
    const samples = [];
    const N = 220;
    for (let i = 0; i <= N; i++) {
      const arc = (i / N) * totalLen;
      const p = path.getPointAtLength(arc);
      // tangent estimate
      const p2 = path.getPointAtLength(Math.min(totalLen, arc + 0.6));
      const tx = p2.x - p.x;
      const ty = p2.y - p.y;
      const len = Math.hypot(tx, ty) || 1;
      // unit normal (perpendicular to tangent)
      samples.push({ x: p.x, y: p.y, nx: -ty / len, ny: tx / len, arc });
    }

    // Multi-wave sinusoidal layer — elegant palette, breathing amplitude
    const waveSpecs = [
      { freq: 0.045, baseAmp: 22, phase: 0,             speed:  0.012, cls: 'wave wave-1' },
      { freq: 0.070, baseAmp: 14, phase: Math.PI,       speed: -0.018, cls: 'wave wave-2' },
      { freq: 0.055, baseAmp: 18, phase: Math.PI / 2,   speed:  0.009, cls: 'wave wave-3' },
      { freq: 0.085, baseAmp: 10, phase: -Math.PI / 3,  speed:  0.022, cls: 'wave wave-4' },
    ];
    const waves = waveSpecs.map(spec => {
      const el = document.createElementNS(SVG_NS, 'path');
      el.setAttribute('class', spec.cls);
      el.setAttribute('fill', 'none');
      svg.appendChild(el);
      return { el, ...spec };
    });

    RIVER_STATE.pathInfo = { path, totalLen, pts, W, H, samples, waves };
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
   WAVES — animate multi-color sinusoidal waves along the path
   ========================================================= */
(() => {
  if (tlReducedMotion) return;
  const tick = (now) => {
    const pi = RIVER_STATE.pathInfo;
    if (pi && pi.samples && pi.waves) {
      const t = now * 0.001;
      for (let w = 0; w < pi.waves.length; w++) {
        const wave = pi.waves[w];
        // Breathing amplitude — each wave breathes on its own slow phase
        const breath = 0.45 + 0.55 * Math.sin(t * 0.35 + w * 1.3);
        const amp = wave.baseAmp * breath;
        const phase = wave.phase + t * wave.speed * 10;

        let d = '';
        const samples = pi.samples;
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const off = amp * Math.sin(wave.freq * s.arc + phase);
          const x = s.x + s.nx * off;
          const y = s.y + s.ny * off;
          d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        }
        wave.el.setAttribute('d', d);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* =========================================================
   MILESTONE DEEP-DIVES — modal popup with full content
   ========================================================= */
const REPO_BASE = 'https://github.com/mickyaero/sahayak/blob/main/';

// Architecture mini-diagram — used in milestone V
const ARCH_DIAGRAM_SVG = '<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg">'
  + '<g font-family="Fraunces, serif">'
    + '<rect x="20" y="30" width="120" height="46" fill="none" stroke="#C87533" stroke-width="1.1"/>'
    + '<text x="80" y="52" text-anchor="middle" fill="#EDE6D5" font-size="13">People</text>'
    + '<text x="80" y="68" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.15em">SAFETY · PRIVACY · ₹</text>'
    + '<rect x="20" y="110" width="120" height="46" fill="none" stroke="#C87533" stroke-width="1.1"/>'
    + '<text x="80" y="132" text-anchor="middle" fill="#EDE6D5" font-size="13">Environment</text>'
    + '<text x="80" y="148" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.15em">WEATHER · ROAD · ANIMALS</text>'
    + '<rect x="20" y="190" width="120" height="46" fill="none" stroke="#C87533" stroke-width="1.1"/>'
    + '<text x="80" y="212" text-anchor="middle" fill="#EDE6D5" font-size="13">Maintenance</text>'
    + '<text x="80" y="228" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.15em">SENSOR MONITORING</text>'
  + '</g>'
  + '<g>'
    + '<rect x="340" y="110" width="120" height="60" fill="rgba(200,117,51,0.1)" stroke="#C87533" stroke-width="2.2"/>'
    + '<text x="400" y="138" text-anchor="middle" fill="#EDE6D5" font-family="Fraunces, serif" font-size="17">ROVER</text>'
    + '<text x="400" y="158" text-anchor="middle" fill="#C87533" font-family="JetBrains Mono, monospace" font-size="8" letter-spacing="0.3em">CENTRAL</text>'
  + '</g>'
  + '<g font-family="Fraunces, serif">'
    + '<rect x="620" y="20" width="160" height="40" fill="none" stroke="rgba(200,117,51,0.65)" stroke-width="0.9"/>'
    + '<text x="700" y="38" text-anchor="middle" fill="#EDE6D5" font-size="12">Structure</text>'
    + '<text x="700" y="52" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.1em">HORN · LIGHTS · CHASSIS</text>'
    + '<rect x="620" y="80" width="160" height="40" fill="none" stroke="rgba(200,117,51,0.65)" stroke-width="0.9"/>'
    + '<text x="700" y="98" text-anchor="middle" fill="#EDE6D5" font-size="12">Electronics</text>'
    + '<text x="700" y="112" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.1em">CAMERA · SENSOR · GPS</text>'
    + '<rect x="620" y="140" width="160" height="40" fill="none" stroke="rgba(200,117,51,0.65)" stroke-width="0.9"/>'
    + '<text x="700" y="158" text-anchor="middle" fill="#EDE6D5" font-size="12">Computing</text>'
    + '<text x="700" y="172" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.1em">SLAM · CV · FLEET</text>'
    + '<rect x="620" y="200" width="160" height="40" fill="none" stroke="rgba(200,117,51,0.65)" stroke-width="0.9"/>'
    + '<text x="700" y="218" text-anchor="middle" fill="#EDE6D5" font-size="12">Charging</text>'
    + '<text x="700" y="232" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.1em">DOCK · BATTERY</text>'
  + '</g>'
  + '<g stroke="#C87533" stroke-width="0.9" fill="none">'
    + '<line x1="140" y1="53" x2="340" y2="125"/>'
    + '<line x1="140" y1="133" x2="340" y2="138"/>'
    + '<line x1="140" y1="213" x2="340" y2="155"/>'
  + '</g>'
  + '<g stroke="#C87533" stroke-width="0.9" fill="none">'
    + '<line x1="460" y1="124" x2="620" y2="40"/>'
    + '<line x1="460" y1="132" x2="620" y2="100"/>'
    + '<line x1="460" y1="148" x2="620" y2="160"/>'
    + '<line x1="460" y1="156" x2="620" y2="220"/>'
  + '</g>'
  + '<g stroke="rgba(200,117,51,0.4)" stroke-width="0.6" stroke-dasharray="3 3" fill="none">'
    + '<path d="M 140 50 Q 380 60 620 100"/>'
    + '<path d="M 140 130 Q 380 80 620 160"/>'
    + '<path d="M 140 215 Q 380 240 620 110"/>'
  + '</g>'
  + '<g font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="0.18em" fill="#7A746C">'
    + '<line x1="20" y1="265" x2="40" y2="265" stroke="#C87533" stroke-width="0.9"/>'
    + '<text x="48" y="269">DIRECT INTERFACE</text>'
    + '<line x1="220" y1="265" x2="240" y2="265" stroke="rgba(200,117,51,0.4)" stroke-width="0.6" stroke-dasharray="3 3"/>'
    + '<text x="248" y="269">CROSS-CUTTING DEPENDENCY</text>'
  + '</g>'
  + '</svg>';

const milestoneData = {
  '1': {
    numeral: 'I',
    date: 'XXVI · MAY · MMXXVI <span class="moment">— first light</span>',
    title: 'A Question Was Put on Paper',
    lede: 'On lined paper, a question. <em>How to deliver things in India when nothing else can.</em> Heavy rain. Forty-degree heat. Two-in-the-morning silence.',
    diagram: '<svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg"><g transform="translate(300, 92)"><circle r="78" stroke="#C87533" stroke-width="0.6" fill="none" opacity="0.18"/><circle r="58" stroke="#C87533" stroke-width="0.8" fill="none" opacity="0.32"/><circle r="40" stroke="#C87533" stroke-width="1" fill="none" opacity="0.55"/><circle r="24" stroke="#C87533" stroke-width="1.2" fill="none" opacity="0.85"/><text x="0" y="12" text-anchor="middle" fill="#C87533" font-family="Fraunces, serif" font-style="italic" font-size="34">?</text></g><text x="300" y="172" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="0.28em">A QUESTION, RIPPLING</text></svg>',
    diagramCaption: 'The question expands outward — wider than what will survive.',
    decisions: {
      label: 'What was sketched',
      items: [
        '<strong>Problem framed:</strong> "delivery in difficult Indian conditions" — extreme weather, odd times, unavailability of people',
        '<strong>Use-cases considered:</strong> delivery of things, assistance to an assembly-line engineer, spraying of medicine on fields',
        '<strong>Areas of operation listed:</strong> fields, factories, tech parks, campuses, labs',
        '<em>Nothing was locked yet.</em> The page was deliberately broad — a question, not yet an answer.'
      ]
    },
    links: [
      { path: 'BRIEF.md', label: 'broader thesis' },
      { path: 'product/whiteboards/01_2026-05-26_problem-statement.md', label: 'whiteboard digitization' },
      { path: 'product/whiteboards/01_2026-05-26_problem-statement.jpg', label: 'raw image' }
    ],
    coda: 'The same afternoon, the question began to narrow.',
    tags: ['ideation', 'problem', 'exploration']
  },
  '2': {
    numeral: 'II',
    date: 'XXVI · MAY · MMXXVI <span class="moment">— mid-afternoon</span>',
    title: 'A Name Surfaced',
    lede: 'Six names weighed. <em>Vayu. Dhruv. Saathi. Mitra. Yantra.</em> And then — <span class="devanagari-inline">सहायक</span> — surfaced.',
    diagram: '<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg"><g font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="0.22em" fill="#7A746C"><text x="48" y="48">VAYU</text><text x="138" y="32">DHRUV</text><text x="262" y="50">SAATHI</text><text x="392" y="30">MITRA</text><text x="498" y="48">YANTRA</text></g><g stroke="rgba(200,117,51,0.18)" stroke-width="0.6" fill="none"><line x1="70" y1="56" x2="288" y2="142"/><line x1="174" y1="40" x2="298" y2="132"/><line x1="294" y1="58" x2="300" y2="106"/><line x1="416" y1="38" x2="312" y2="132"/><line x1="528" y1="56" x2="320" y2="142"/></g><g transform="translate(300, 140)"><circle r="46" stroke="#C87533" stroke-width="1.2" fill="none"/><circle r="58" stroke="#C87533" stroke-width="0.5" fill="none" opacity="0.4"/><text x="0" y="10" text-anchor="middle" fill="#C87533" font-family="Mukta, sans-serif" font-size="24" font-weight="300">सहायक</text></g></svg>',
    diagramCaption: 'Six candidates. One surfaced as the closest match to what the robot would be — a helper.',
    decisions: {
      label: 'Decisions locked',
      items: [
        '<strong>Name:</strong> Sahayak (<span class="devanagari-inline">सहायक</span> · "assistant")',
        '<strong>HQ city:</strong> Bangalore — for the founder network',
        '<strong>Founders:</strong> Merrylin Stewart + Puneet Mahajan',
        '<strong>Funding path:</strong> Bootstrap-first — no outside money until unit-economics earn it',
        '<strong>Form factor:</strong> <em>Ground vehicle. Not a drone.</em>'
      ]
    },
    links: [
      { path: 'DECISIONS.md', label: 'decision log' },
      { path: 'README.md', label: 'repo overview' }
    ],
    coda: 'By dusk, the question of where would become urgent.',
    tags: ['name', 'place', 'crew', 'funding', 'form']
  },
  '3': {
    numeral: 'III',
    date: 'XXVI · MAY · MMXXVI <span class="moment">— dusk</span>',
    title: 'The Gate Opened',
    lede: 'Indian mess closes at nine. Students stay awake till two. Outside vendors are blocked at hostel gates. <em>Five dark hours.</em>',
    diagram: '<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg"><g transform="translate(300, 100)"><circle r="64" stroke="rgba(237,230,213,0.25)" stroke-width="0.8" fill="none"/><path d="M -64 0 A 64 64 0 0 1 55.4 -32" stroke="#C87533" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.95"/><line x1="0" y1="-64" x2="0" y2="-56" stroke="rgba(237,230,213,0.5)" stroke-width="0.7"/><line x1="64" y1="0" x2="56" y2="0" stroke="rgba(237,230,213,0.5)" stroke-width="0.7"/><line x1="0" y1="64" x2="0" y2="56" stroke="rgba(237,230,213,0.5)" stroke-width="0.7"/><line x1="-64" y1="0" x2="-56" y2="0" stroke="rgba(237,230,213,0.5)" stroke-width="0.7"/><text x="0" y="-72" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="9">12</text><text x="76" y="3" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="9">3</text><text x="0" y="80" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="9">6</text><text x="-78" y="3" text-anchor="middle" fill="#C87533" font-family="JetBrains Mono, monospace" font-size="11" font-weight="bold">9</text><text x="40" y="-50" text-anchor="middle" fill="#C87533" font-family="JetBrains Mono, monospace" font-size="11" font-weight="bold">2</text><text x="0" y="-2" text-anchor="middle" fill="#EDE6D5" font-family="Fraunces, serif" font-style="italic" font-size="13">five-hour</text><text x="0" y="14" text-anchor="middle" fill="#C87533" font-family="JetBrains Mono, monospace" font-size="8" letter-spacing="0.28em">9 PM → 2 AM</text></g></svg>',
    diagramCaption: 'The wedge: the dark window between mess closing and sleep, when nothing else can deliver.',
    decisions: {
      label: 'Decisions locked',
      items: [
        '<strong>Beachhead:</strong> Campus-first (private universities)',
        '<strong>Wave-1 candidates:</strong> Christ, PES, Jain, Reva, Dayananda Sagar — Bangalore',
        '<strong>Anti-wedges (will NOT pursue):</strong> open-sidewalk B2C, pure indoor hospitality, drone B2C',
        '<strong>Validation set:</strong> Starship Technologies — <em>97% approval</em>, 10M+ deliveries across 65 US campuses',
        '<strong>Indian gap is wider than US:</strong> mess closes 3 hours earlier, gate security blocks outside vendors'
      ]
    },
    links: [
      { path: 'CAMPUS_STRATEGY.md', label: 'campus playbook' },
      { path: 'research/competitive_survey_findings.md', label: 'survey data (Starship, Pudu, Aethon)' },
      { path: 'research/concrete_deployments.md', label: 'real-world deployments' }
    ],
    coda: 'The next morning, requirements would acquire edges.',
    tags: ['beachhead', 'campus', 'pivot', 'validation']
  },
  '4': {
    numeral: 'IV',
    date: 'XXVII · MAY · MMXXVI <span class="moment">— morning</span>',
    title: 'Ten Lines on a Board',
    lede: 'Ten requirements lined up on a whiteboard. <em>Each one a defense against an India-specific failure.</em>',
    diagram: '<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg"><g font-family="JetBrains Mono, monospace" font-size="8.5" letter-spacing="0.18em" fill="#EDE6D5"><rect x="20" y="18" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="74" y="38" text-anchor="middle">ROUTING</text><rect x="138" y="18" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="192" y="38" text-anchor="middle">CONTAINER</text><rect x="256" y="18" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="310" y="38" text-anchor="middle">OBSTACLES</text><rect x="374" y="18" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="428" y="38" text-anchor="middle">ROAD COND.</text><rect x="492" y="18" width="88" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="536" y="38" text-anchor="middle">WEATHER</text><rect x="20" y="66" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="74" y="86" text-anchor="middle">SAFETY</text><rect x="138" y="66" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="192" y="86" text-anchor="middle">PRIVACY</text><rect x="256" y="66" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="310" y="86" text-anchor="middle">OPERATIONAL</text><rect x="374" y="66" width="108" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="428" y="86" text-anchor="middle">MAINTENANCE</text><rect x="492" y="66" width="88" height="32" fill="none" stroke="#C87533" stroke-width="0.7"/><text x="536" y="82" text-anchor="middle">ROVER</text><text x="536" y="93" text-anchor="middle">SENSORS</text></g><text x="300" y="130" text-anchor="middle" fill="#7A746C" font-family="JetBrains Mono, monospace" font-size="8.5" letter-spacing="0.3em">— 12 GAP CATEGORIES, KNOWINGLY DEFERRED —</text><g><rect x="60" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="106" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="152" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="198" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="244" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="290" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="336" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="382" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="428" y="148" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="60" y="170" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="106" y="170" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/><rect x="152" y="170" width="36" height="14" fill="none" stroke="rgba(200,117,51,0.3)" stroke-dasharray="2 2"/></g></svg>',
    diagramCaption: '10 requirements (solid). 12 gap categories (dashed) — acknowledged, deferred.',
    decisions: {
      label: 'The ten requirements',
      items: [
        '<strong>1. Routing</strong> — paths that curve, double back, re-cross themselves',
        '<strong>2. Lockable container</strong> — cargo bay secured until authorized unlock',
        '<strong>3. Obstacles on road</strong> — people, vehicles, <em>monkeys, dogs</em> (India-specific)',
        '<strong>4. Road conditions</strong> — potholes (छोटे/बड़े/गड्ढे), speedbreakers, ditches, fallen leaves',
        '<strong>5. Weather</strong> — wet roads, water flow, heat, visibility in rain',
        '<strong>6. Safety</strong> — of people + cargo; horn, lights, reflectors, waterproof, impact-proof',
        '<strong>7. Privacy / Security</strong> — order discretion, anti-misuse',
        '<strong>8. Operational</strong> — self-charging, point maintenance',
        '<strong>9. Maintenance</strong> — service intervals, spare parts',
        '<strong>10. Monitoring of rover sensors</strong> — on-board diagnostics + fleet-side dashboard'
      ]
    },
    links: [
      { path: 'product/requirements_v0.md', label: 'requirements v0 + gap analysis' },
      { path: 'product/whiteboards/02_2026-05-27_requirements.md', label: 'whiteboard digitization' },
      { path: 'product/whiteboards/02_2026-05-27_requirements.jpg', label: 'raw image' }
    ],
    coda: 'By evening, the flat list would dissolve into a shape — boxes, lines, connections.',
    tags: ['requirements', 'india-specific', 'v0']
  },
  '5': {
    numeral: 'V',
    date: 'XXVII · MAY · MMXXVI <span class="moment">— evening</span>',
    title: 'The Architecture Drew Itself',
    lede: 'Three external entities. One central rover. Four sub-systems. <em>And the boxes did not merge — they connected.</em>',
    diagram: ARCH_DIAGRAM_SVG,
    diagramCaption: 'Where two boxes share a concern, they connect by an edge — not collapse into one.',
    decisions: {
      label: 'The architecture',
      items: [
        '<strong>External entities (3):</strong> <em>People</em> (Affordability, Safety, Privacy), <em>Environment</em> (Weather, Road, Animals), <em>Maintenance</em> (sensor monitoring → Camera, Motor, Battery health)',
        '<strong>Rover sub-systems (4):</strong> <em>Structure</em> (horn, lights, frame, suspension, cargo box), <em>Electronics</em> (circuits, camera, sensor, motor, GPS), <em>Computing</em> (mobility, navigation, computer vision, fleet orchestration), <em>Charging</em>',
        '<strong>Rule:</strong> "Don\'t merge overlapping boxes — connect them." Every shared concern is an explicit edge.',
        '<strong>Extensibility built-in:</strong> Vendor, Property administrator, Fleet operations, Regulator queued for next iterations'
      ]
    },
    links: [
      { path: 'product/architecture.md', label: 'live architecture (Mermaid + all box contents)' },
      { path: 'product/whiteboards/03_2026-05-27_architecture.md', label: 'whiteboard digitization' },
      { path: 'product/whiteboards/03_2026-05-27_architecture.jpg', label: 'raw image' }
    ],
    coda: 'The same evening, hard numbers and four design values were committed.',
    tags: ['architecture', 'system', 'connections']
  },
  '6': {
    numeral: 'VI',
    date: 'XXVII · MAY · MMXXVI <span class="moment">— same evening</span>',
    title: 'Twenty Kilometres. Three Kilograms.',
    lede: 'The first hard numbers. The first four anchors. <em>Frugal. Autonomous. Affordable. Of value to people.</em>',
    diagram: '<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg"><g transform="translate(300, 120)"><circle r="92" stroke="rgba(237,230,213,0.22)" stroke-width="0.8" fill="none" stroke-dasharray="3 5"/><circle r="60" stroke="rgba(200,117,51,0.4)" stroke-width="0.8" fill="none"/><text x="0" y="-2" text-anchor="middle" fill="#EDE6D5" font-family="Fraunces, serif" font-weight="400" font-size="32" letter-spacing="-0.02em">20</text><text x="0" y="18" text-anchor="middle" fill="#C87533" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="0.3em">KM / CHARGE</text><text x="0" y="42" text-anchor="middle" fill="#EDE6D5" font-family="Fraunces, serif" font-style="italic" font-size="16">· 3 kg payload ·</text><g font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="0.25em" fill="#C87533"><text x="0" y="-105" text-anchor="middle">FRUGAL</text><text x="115" y="3" text-anchor="middle">AUTONOMOUS</text><text x="0" y="115" text-anchor="middle">AFFORDABLE</text><text x="-115" y="3" text-anchor="middle">OF VALUE</text></g><g stroke="#C87533" stroke-width="0.8"><line x1="0" y1="-92" x2="0" y2="-85"/><line x1="92" y1="0" x2="85" y2="0"/><line x1="0" y1="92" x2="0" y2="85"/><line x1="-92" y1="0" x2="-85" y2="0"/></g></g></svg>',
    diagramCaption: 'Range 20 km. Payload 3 kg. Four values fastened to the rest.',
    decisions: {
      label: 'Decisions locked',
      items: [
        '<strong>Range:</strong> 20 km per charge',
        '<strong>Payload:</strong> 3 kg',
        '<strong>Value 1 — Frugal but functional:</strong> ship cheapest thing that actually works in Indian conditions',
        '<strong>Value 2 — Max autonomy / min manpower:</strong> every minute a human operates the robot is unit-economics drag',
        '<strong>Value 3 — Affordability:</strong> total cost in ₹, decision-doable without a board',
        '<strong>Value 4 — Add value to people:</strong> if it doesn\'t make a real life better, drop it',
        '<em>Tie-of-tie rule:</em> when other values score evenly, <strong>affordability</strong> wins (bootstrap context)'
      ]
    },
    links: [
      { path: 'product/objectives.md', label: 'hard numbers + derived targets' },
      { path: 'product/values.md', label: 'how the four values do their work' }
    ],
    coda: 'The river paused. The next whiteboard had not yet been drawn.',
    tags: ['objectives', 'values', 'anchors']
  },
  '7': {
    numeral: 'VII',
    date: '— · ? · MMXXVI <span class="moment">— to come</span>',
    title: 'The Next Whiteboard',
    lede: '<em>What is queued. What is being prepared. What is being held.</em>',
    diagram: '<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg"><g><line x1="40" y1="60" x2="500" y2="60" stroke="#C87533" stroke-width="1" stroke-dasharray="6 6" opacity="0.85"/><line x1="40" y1="100" x2="520" y2="100" stroke="#C87533" stroke-width="1" stroke-dasharray="6 6" opacity="0.6"/><line x1="40" y1="140" x2="480" y2="140" stroke="#C87533" stroke-width="1" stroke-dasharray="6 6" opacity="0.4"/></g><g font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="0.22em" fill="#EDE6D5"><text x="40" y="52">VENDOR</text><text x="40" y="92">PROPERTY ADMIN</text><text x="40" y="132">FLEET OPS · COMPLIANCE</text></g><g fill="#C87533" font-family="Fraunces, serif" font-style="italic" font-size="26"><text x="538" y="68" text-anchor="middle">?</text><text x="558" y="108" text-anchor="middle">?</text><text x="518" y="148" text-anchor="middle">?</text></g></svg>',
    diagramCaption: 'Three external entities queued for the next architecture iteration.',
    decisions: {
      label: 'Open work',
      items: [
        '<strong>Architecture expansions:</strong> add <em>Vendor</em>, <em>Property administrator</em>, <em>Fleet operations</em>, <em>Regulator</em> as external entities',
        '<strong>Charging sub-system:</strong> unpack — dock, battery chemistry, swap vs charge-in-place',
        '<strong>Requirements v0 → v1:</strong> merge the 12 gap categories into the master list',
        '<strong>Customer discovery:</strong> 15-20 interviews queued (private Bangalore campuses)',
        '<strong>Hardware path:</strong> <em>deliberate non-decision</em> — source-and-customize vs design-ground-up, to be settled with evidence'
      ]
    },
    links: [
      { path: 'product/README.md', label: 'product roadmap' },
      { path: 'product/whiteboards/README.md', label: 'whiteboard timeline index' },
      { path: 'DECISIONS.md', label: 'see "Deferred" section' }
    ],
    coda: 'Another whiteboard. Then another. <em>The river continues.</em>',
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

    let html = '';
    if (data.lede) {
      html += `<p class="modal-lede">${data.lede}</p>`;
    }
    if (data.diagram) {
      html += `<div class="modal-diagram">${data.diagram}`;
      if (data.diagramCaption) {
        html += `<p class="diagram-caption">${data.diagramCaption}</p>`;
      }
      html += `</div>`;
    }
    if (data.decisions && data.decisions.items && data.decisions.items.length) {
      html += `<section class="modal-section">`;
      html += `<h4>${data.decisions.label}</h4>`;
      html += `<ul class="decision-list">`;
      for (const item of data.decisions.items) html += `<li>${item}</li>`;
      html += `</ul></section>`;
    }
    if (data.links && data.links.length) {
      html += `<section class="modal-section">`;
      html += `<h4>Detailed reports — GitHub</h4>`;
      html += `<ul class="link-list">`;
      for (const l of data.links) {
        html += `<li><a href="${REPO_BASE}${l.path}" target="_blank" rel="noopener">`;
        html += `<span class="link-icon">↗</span>`;
        html += `<span class="link-path">${l.path}</span>`;
        if (l.label) html += `<span class="link-label">— ${l.label}</span>`;
        html += `</a></li>`;
      }
      html += `</ul>`;
      html += `<p class="link-note">⚭&nbsp; Private repo · accessible to founders + collaborators</p>`;
      html += `</section>`;
    }
    if (data.coda) {
      html += `<p class="modal-coda">${data.coda}</p>`;
    }
    bodyEl.innerHTML = html;

    tagsEl.innerHTML = data.tags.map(t => `<span class="tag">${t}</span>`).join('');

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
