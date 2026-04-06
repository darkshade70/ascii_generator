// ── Video picker — slides down from top center ─────────────────────────────

let currentVideo = null
let onSelect = null
let drawerEl = null
let triggerEl = null
let open = false

export function initPicker(videos, active, onSelectCallback) {
  currentVideo = active
  onSelect = onSelectCallback

  injectStyles()

  // Trigger bar at top center
  triggerEl = document.createElement('div')
  triggerEl.id = 'vp-trigger'
  triggerEl.innerHTML = `
    <span id="vp-label">${active.artist} — ${active.title}</span>
    <span id="vp-arrow">▾</span>
  `
  triggerEl.addEventListener('click', toggleDrawer)
  document.body.appendChild(triggerEl)

  // Drawer
  drawerEl = document.createElement('div')
  drawerEl.id = 'vp-drawer'
  buildList(videos)
  document.body.appendChild(drawerEl)

  // Position drawer just below the trigger
  requestAnimationFrame(() => {
    const rect = triggerEl.getBoundingClientRect()
    drawerEl.style.top = `${rect.bottom + 4}px`
    drawerEl.style.transform = 'translateX(-50%) translateY(-8px)'
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (open && !drawerEl.contains(e.target) && !triggerEl.contains(e.target)) {
      closeDrawer()
    }
  })
}

function buildList(videos) {
  drawerEl.innerHTML = videos.map(v => `
    <div class="vp-item ${v.id === currentVideo.id ? 'vp-active' : ''}" data-id="${v.id}">
      <div class="vp-item-title">${v.title}</div>
      <div class="vp-item-artist">${v.artist}</div>
    </div>
  `).join('')

  drawerEl.querySelectorAll('.vp-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      const video = videos[i]
      if (video.id === currentVideo.id) { closeDrawer(); return }
      currentVideo = video
      // Update active state
      drawerEl.querySelectorAll('.vp-item').forEach(e => e.classList.remove('vp-active'))
      el.classList.add('vp-active')
      // Update trigger label
      document.getElementById('vp-label').textContent = `${video.artist} — ${video.title}`
      closeDrawer()
      onSelect(video)
    })
  })
}

function toggleDrawer() {
  open ? closeDrawer() : openDrawer()
}

function openDrawer() {
  open = true
  drawerEl.style.transform = 'translateX(-50%) translateY(0)'
  drawerEl.style.opacity = '1'
  drawerEl.style.pointerEvents = 'all'
  document.getElementById('vp-arrow').textContent = '▴'
}

function closeDrawer() {
  open = false
  drawerEl.style.transform = 'translateX(-50%) translateY(-8px)'
  drawerEl.style.opacity = '0'
  drawerEl.style.pointerEvents = 'none'
  document.getElementById('vp-arrow').textContent = '▾'
}

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    #vp-trigger {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-top: none;
      border-radius: 0 0 8px 8px;
      font-family: "Geist Mono", monospace;
      font-size: 11px;
      color: #aaa;
      cursor: pointer;
      z-index: 900;
      white-space: nowrap;
      max-width: 420px;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.15s, background 0.15s;
      user-select: none;
    }
    #vp-trigger:hover { color: #fff; background: #161616; }
    #vp-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #vp-arrow { flex-shrink: 0; font-size: 10px; color: #555; }

    #vp-drawer {
      position: fixed;
      top: calc(100% + 4px);  /* positioned relative to trigger via JS */
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      width: 360px;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      z-index: 899;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), opacity 0.18s;
      overflow: hidden;
    }
    .vp-item {
      padding: 11px 16px;
      cursor: pointer;
      border-bottom: 1px solid #1a1a1a;
      transition: background 0.1s;
    }
    .vp-item:last-child { border-bottom: none; }
    .vp-item:hover { background: #161616; }
    .vp-item.vp-active { background: #1a1a1a; }
    .vp-item-title {
      font-family: "Geist Mono", monospace;
      font-size: 11px;
      color: #e0e0e0;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .vp-item.vp-active .vp-item-title { color: #fff; }
    .vp-item-artist {
      font-family: "Geist Mono", monospace;
      font-size: 10px;
      color: #555;
    }

    /* Settings gear — solid background so ASCII doesn't bleed through */
    #sp-gear {
      background: #0d0d0d !important;
      border-color: #2a2a2a !important;
    }
    #sp-gear:hover { background: #161616 !important; }
  `
  document.head.appendChild(style)
}
