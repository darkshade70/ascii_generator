// ── Per-video overlay effects ──────────────────────────────────────────────
// Drawn on a second canvas layered on top of the ASCII canvas.
// Each video can register time-windowed effects.

let overlayCanvas, octx
let audioRef = null

// ── Effect registry ─────────────────────────────────────────────────────────
// Map of videoId → array of { start, end, render(ctx, t, progress) }
const effectMap = {}

export function registerEffect(videoId, start, end, renderFn) {
  if (!effectMap[videoId]) effectMap[videoId] = []
  effectMap[videoId].push({ start, end, render: renderFn })
}

export function initEffects(audio) {
  audioRef = audio

  overlayCanvas = document.createElement('canvas')
  overlayCanvas.id = 'overlay-canvas'
  overlayCanvas.style.cssText = `
    position:fixed; inset:0;
    pointer-events:none;
    z-index:10;
  `
  document.body.appendChild(overlayCanvas)
  octx = overlayCanvas.getContext('2d')

  window.addEventListener('resize', resizeOverlay)
  resizeOverlay()

  registerVirtualBoyMass()
}

export function hideOverlayCanvas() {
  overlayCanvas.style.display = 'none'
  octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
}

export function showOverlayCanvas() {
  overlayCanvas.style.display = ''
}

export function renderEffects(videoId) {
  const t = audioRef?.currentTime ?? 0
  const effects = effectMap[videoId]
  if (!effects) { clearOverlay(); return }

  octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

  let anyActive = false
  for (const fx of effects) {
    if (t >= fx.start && t < fx.end) {
      const progress = (t - fx.start) / (fx.end - fx.start)
      fx.render(octx, t, progress, overlayCanvas.width, overlayCanvas.height)
      anyActive = true
    }
  }
  if (!anyActive) clearOverlay()
}

function clearOverlay() {
  octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
}

function resizeOverlay() {
  overlayCanvas.width  = window.innerWidth
  overlayCanvas.height = window.innerHeight
}

// ── Easing ──────────────────────────────────────────────────────────────────
const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2

// ── Virtual Boy "Mass" — ASCII polygon formation + orbit ─────────────────────
function registerVirtualBoyMass() {
  registerEffect('yonezu-mv', 0, 26, drawAsciiMass)
}

// ── Draw a polygon outline by walking edges and stamping chars ───────────────
function drawPolyOutline(ctx, cx, cy, sides, radius, rotation, ch, fs, alpha) {
  if (alpha <= 0 || radius < 2) return
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#fff'
  const step = fs * 0.85
  for (let i = 0; i < sides; i++) {
    const a0 = rotation + (i / sides) * Math.PI * 2
    const a1 = rotation + ((i + 1) / sides) * Math.PI * 2
    const x1 = cx + Math.cos(a0) * radius, y1 = cy + Math.sin(a0) * radius
    const x2 = cx + Math.cos(a1) * radius, y2 = cy + Math.sin(a1) * radius
    const dist  = Math.hypot(x2 - x1, y2 - y1)
    const steps = Math.max(1, Math.round(dist / step))
    for (let s = 0; s <= steps; s++) {
      const tt = s / steps
      ctx.fillText(ch, x1 + (x2 - x1) * tt - fs * 0.35, y1 + (y2 - y1) * tt)
    }
  }
}

// ── Center of mass: concentric ASCII rings radiating outward ─────────────────
function drawMassCore(ctx, cx, cy, t, fs, alpha) {
  if (alpha <= 0) return
  // rings: [char, radius-multiplier, rotation-speed]
  const rings = [
    ['@', 0,    0],
    ['@', 1.1,  0.5],
    ['#', 2.1, -0.4],
    ['#', 3.2,  0.3],
    ['+', 4.6, -0.25],
    ['+', 6.1,  0.2],
    ['*', 8.0, -0.15],
    ['.', 10.2, 0.1],
  ]
  ctx.fillStyle = '#fff'
  for (let ri = 0; ri < rings.length; ri++) {
    const [ch, mult, spd] = rings[ri]
    const r = mult * fs + Math.sin(t * 3.5 - ri * 0.6) * fs * 0.22
    const ringAlpha = alpha * Math.max(0, 1 - ri / rings.length * 0.85)
    ctx.globalAlpha = ringAlpha
    if (r < fs * 0.4) { ctx.fillText(ch, cx - fs * 0.35, cy); continue }
    const count = Math.max(1, Math.round(2 * Math.PI * r / (fs * 0.9)))
    const rot   = t * spd
    for (let i = 0; i < count; i++) {
      const angle = rot + (i / count) * Math.PI * 2
      ctx.fillText(ch, cx + Math.cos(angle) * r - fs * 0.35, cy + Math.sin(angle) * r)
    }
  }
}

// ── Scattered seed chars that converge into polygon orbit positions ───────────
const SEED_COUNT = 48
const seeds = Array.from({ length: SEED_COUNT }, (_, i) => {
  const angle = (i / SEED_COUNT) * Math.PI * 2 + Math.random() * 0.4
  const dist  = 0.35 + Math.random() * 0.4
  return {
    sx: Math.cos(angle + Math.PI) * dist,   // start offset (normalised to ±1)
    sy: Math.sin(angle + Math.PI) * dist,
    ch: ['*','+','.','#'][i % 4],
  }
})

// ── Orbit ring config ────────────────────────────────────────────────────────
const ORBIT_RINGS = [
  { sides: 3, ch: '@', orbitR: 0.30, orbitSpd:  0.65, polyR: 0.075, spinSpd:  1.1, phase: 0 },
  { sides: 6, ch: '+', orbitR: 0.22, orbitSpd: -0.50, polyR: 0.055, spinSpd: -0.7, phase: Math.PI / 3 },
  { sides: 3, ch: '#', orbitR: 0.36, orbitSpd:  0.40, polyR: 0.065, spinSpd:  0.9, phase: Math.PI },
  { sides: 4, ch: '*', orbitR: 0.18, orbitSpd: -0.85, polyR: 0.045, spinSpd: -1.3, phase: Math.PI * 2 / 3 },
  { sides: 6, ch: '@', orbitR: 0.28, orbitSpd:  0.55, polyR: 0.060, spinSpd:  0.6, phase: Math.PI * 4 / 3 },
  { sides: 3, ch: '#', orbitR: 0.40, orbitSpd: -0.35, polyR: 0.070, spinSpd: -0.5, phase: Math.PI * 5 / 3 },
]

function drawAsciiMass(ctx, t, progress, W, H) {
  const cx = W / 2, cy = H / 2
  // Overlay chars deliberately larger than video chars so they read
  // clearly even when the video background is dense white binary ASCII.
  // Video chars ≈ canvas.height/40 px; we use ~1.8× that.
  const fs  = Math.min(W, H) * 0.032
  const dim = Math.min(W, H)

  ctx.save()
  ctx.font        = `bold ${fs}px "Geist Mono", monospace`
  ctx.textBaseline = 'middle'

  const fadeIn  = Math.min(t / 0.6, 1)
  const fadeOut = 1 - Math.max(0, (progress - 0.88) / 0.12)
  const base    = fadeIn * fadeOut

  // Formation phase 0–9s
  const formProgress = easeOutCubic(Math.min(t / 9, 1))

  // ── Seed particles converging ──────────────────────────────────────────
  if (formProgress < 1) {
    ctx.fillStyle = '#fff'
    for (let i = 0; i < seeds.length; i++) {
      const s     = seeds[i]
      const delay = (i / seeds.length) * 0.5
      const st    = easeOutCubic(Math.max(0, Math.min((t / 9 - delay) / 0.5, 1)))
      const x     = cx + s.sx * dim * 0.5 * (1 - st)
      const y     = cy + s.sy * dim * 0.5 * (1 - st)
      // Fade in, peak at st=0.5, fade out as formProgress grows
      ctx.globalAlpha = base * (1 - formProgress * 0.9) * (Math.sin(st * Math.PI) * 0.8 + 0.15)
      ctx.fillText(s.ch, x - fs * 0.35, y)
    }
  }

  // ── Center of mass core (builds up from t=3s onward) ──────────────────
  const coreAlpha = base * Math.min((t - 3) / 4, 1) * 0.95
  if (coreAlpha > 0) drawMassCore(ctx, cx, cy, t, fs, coreAlpha)

  // ── Orbiting polygon shapes ────────────────────────────────────────────
  for (let i = 0; i < ORBIT_RINGS.length; i++) {
    const cfg = ORBIT_RINGS[i]

    const ringDelay = i / ORBIT_RINGS.length * 0.5
    const ringT     = Math.max(0, Math.min((t / 9 - ringDelay - 0.1) / 0.5, 1))
    const ringEased = easeOutCubic(ringT)

    const orbitAngle = cfg.phase + t * cfg.orbitSpd
    const pulse      = Math.sin(t * 1.9 + cfg.phase * 1.3) * 0.08
    const orbitR     = (cfg.orbitR + pulse) * dim * ringEased

    const px = cx + Math.cos(orbitAngle) * orbitR
    const py = cy + Math.sin(orbitAngle) * orbitR

    const polyPulse = Math.sin(t * 2.8 + i * 1.1) * 0.008
    const polyR     = (cfg.polyR + polyPulse) * dim * ringEased
    const polyRot   = t * cfg.spinSpd + cfg.phase

    // Full opacity so polygons cut through regardless of video mode
    const polyAlpha = base * ringEased

    drawPolyOutline(ctx, px, py, cfg.sides, polyR, polyRot, cfg.ch, fs, polyAlpha)
  }

  ctx.restore()
}
