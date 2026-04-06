// ── Video scrubber ────────────────────────────────────────────────────────────

let audioRef = null
let dragging = false
let barEl = null
let fillEl = null
let tooltipEl = null
let currentEl = null
let durationEl = null

export function initScrubber(audio) {
  audioRef = audio
  injectStyles()
  buildDOM()
  bindEvents()
  requestAnimationFrame(tick)
}

function buildDOM() {
  const scrubber = document.createElement('div')
  scrubber.id = 'scrubber'
  scrubber.innerHTML = `
    <span id="scrub-current">0:00</span>
    <div id="scrub-track">
      <div id="scrub-fill"></div>
      <div id="scrub-thumb"></div>
      <div id="scrub-tooltip">0:00</div>
    </div>
    <span id="scrub-duration">0:00</span>
  `
  document.body.appendChild(scrubber)

  barEl      = document.getElementById('scrub-track')
  fillEl     = document.getElementById('scrub-fill')
  tooltipEl  = document.getElementById('scrub-tooltip')
  currentEl  = document.getElementById('scrub-current')
  durationEl = document.getElementById('scrub-duration')
}

function bindEvents() {
  barEl.addEventListener('mousedown', (e) => {
    dragging = true
    seek(e)
    e.preventDefault()
  })

  window.addEventListener('mousemove', (e) => {
    if (dragging) seek(e)
    updateTooltip(e)
  })

  window.addEventListener('mouseup', () => { dragging = false })

  barEl.addEventListener('touchstart', (e) => { dragging = true; seek(e.touches[0]); e.preventDefault() }, { passive: false })
  window.addEventListener('touchmove',  (e) => { if (dragging) seek(e.touches[0]) })
  window.addEventListener('touchend',   () => { dragging = false })

  barEl.addEventListener('mouseleave', () => { tooltipEl.style.opacity = '0' })
  barEl.addEventListener('mouseenter', () => { tooltipEl.style.opacity = '1' })
}

function seek(e) {
  const rect = barEl.getBoundingClientRect()
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  audioRef.currentTime = pct * (audioRef.duration || 0)
}

function updateTooltip(e) {
  const rect = barEl.getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right) return
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const t   = pct * (audioRef.duration || 0)
  tooltipEl.textContent = fmt(t)
  tooltipEl.style.left  = `${pct * 100}%`
}

function tick() {
  if (!audioRef.paused && !dragging) {
    const dur = audioRef.duration || 1
    const pct = audioRef.currentTime / dur
    fillEl.style.width = `${pct * 100}%`
    const thumb = document.getElementById('scrub-thumb')
    if (thumb) thumb.style.left = `${pct * 100}%`
    currentEl.textContent  = fmt(audioRef.currentTime)
    durationEl.textContent = fmt(dur)
  }
  requestAnimationFrame(tick)
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    #scrubber {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px 10px;
      background: linear-gradient(transparent, rgba(0,0,0,0.85));
      z-index: 800;
      opacity: 0;
      transition: opacity 0.2s;
      font-family: "Geist Mono", monospace;
      font-size: 10px;
      color: #666;
      user-select: none;
    }
    #scrubber:hover, #scrubber.active { opacity: 1; }
    body:hover #scrubber { opacity: 1; }

    #scrub-track {
      flex: 1;
      height: 3px;
      background: #2a2a2a;
      border-radius: 2px;
      position: relative;
      cursor: pointer;
      padding: 8px 0;
      margin: -8px 0;
      box-sizing: content-box;
    }
    #scrub-fill {
      position: absolute;
      top: 8px;
      left: 0; height: 3px;
      background: #fff;
      border-radius: 2px;
      width: 0%;
      pointer-events: none;
    }
    #scrub-thumb {
      position: absolute;
      top: 50%; left: 0%;
      transform: translate(-50%, -50%);
      width: 10px; height: 10px;
      background: #fff;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
    }
    #scrub-track:hover #scrub-thumb { opacity: 1; }
    #scrub-tooltip {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 0%;
      transform: translateX(-50%);
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 10px;
      color: #fff;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s;
    }
    #scrub-current, #scrub-duration { flex-shrink: 0; color: #555; }
  `
  document.head.appendChild(style)
}
