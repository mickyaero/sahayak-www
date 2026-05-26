# sahayak-www

Public landing page for **Sahayak** — a ground autonomous platform for India's bounded properties.

→ Live: https://mickyaero.github.io/sahayak-www/

## Stack

- Plain HTML + CSS + JavaScript. No framework. No build.
- Google Fonts: Fraunces (display), Crimson Pro (body), JetBrains Mono (technical), Mukta (Devanagari).
- Hosted on GitHub Pages from `main`.

## Mathematical animation suite

| Section | Math |
|---|---|
| Hero | Phyllotaxis lattice (golden-angle 137.508°) + Lissajous overlay (3:4 ratio) |
| Interlude | 5-petal rose curve `r(θ) = a·cos(5θ + φ)` unfurling on scroll |
| Numbers | Damped harmonic count-up `1 − e^(−5t)·cos(7t·π/4)` |
| Cursor | Saffron breadcrumb trail with linear life decay |

## Edit & redeploy

```bash
# Edit any file, then:
git add -A && git commit -m "Update" && git push
# GitHub Pages redeploys within ~30 seconds.
```

## Files

```
sahayak-www/
├── index.html      # Structure + content
├── style.css       # Typography, layout, color, reveal animations
├── script.js       # Canvas animations + scroll observers
├── .nojekyll       # Tells Pages to skip Jekyll processing
└── README.md       # This file
```

## License

Proprietary. © Merrylin Stewart × Puneet Mahajan, Bangalore, MMXXVI.
