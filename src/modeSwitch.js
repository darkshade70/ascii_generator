// ── Mode switcher — VIDEO / IMAGE pill toggle ─────────────────────────────
// Positioned below the video picker tab at top-center.

let currentMode = 'video'   // 'video' | 'image'
let onChangeCallback = null

export function initModeSwitch(onChange) {
  onChangeCallback = onChange
  injectStyles()

  const bar = document.createElement('div')
  bar.id = 'mode-switch'
  bar.innerHTML = `
    <button class="mode-btn active" data-mode="video">▶ VIDEO</button>
    <button class="mode-btn"        data-mode="image">⬛ IMAGE</button>
  `
  document.body.appendChild(bar)

  bar.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode
      if (mode === currentMode) return
      currentMode = mode
      bar.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode))
      onChangeCallback?.(mode)
    })
  })
}

export function getMode() { return currentMode }

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    #mode-switch {
      position: fixed;
      top: 36px;   /* sits just below the video picker tab */
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 1px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 2px;
      z-index: 890;
    }
    .mode-btn {
      font-family: "Geist Mono", monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      color: #555;
      background: transparent;
      border: none;
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
      white-space: nowrap;
    }
    .mode-btn:hover { color: #aaa; }
    .mode-btn.active {
      background: #2a2a2a;
      color: #fff;
    }
  `
  document.head.appendChild(style)
}
