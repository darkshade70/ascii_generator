// ── Settings module ───────────────────────────────────────────────────────────
// Manages a live config object, a floating settings panel, and localStorage persistence.

const STORAGE_KEY = 'badapple-settings-v1'

export const DEFAULTS = {
  // Characters
  fgChars: '@#$%&*!?ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz',
  bgChars: '.,;:-~^`\'"_<>|/\\',
  showBg: false,

  // Colors
  fgColor: '#ffffff',
  bgColor: '#000000',
  bgCharColor: '#1e1e1e',

  // Font
  fontWeight: 'normal',

  // Playback
  cursorMode: 'per-frame', // 'per-frame' | 'continuous'

  // Display
  displayScale: 1.0,
  shadingMode: 'binary', // 'binary' | 'shaded'
  rows: 40,              // 5–40: how many character rows to render (fewer = blockier)
}

export let config = { ...DEFAULTS }

let onChangeCallback = null

// ── Persistence ───────────────────────────────────────────────────────────────
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) config = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch (_) {}
}

export function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  flashSave()
}

export function resetSettings() {
  config = { ...DEFAULTS }
  syncPanelToConfig()
  onChangeCallback?.({ rebuildText: true, rebuildFont: true })
}

// ── Public init ───────────────────────────────────────────────────────────────
export function initSettings(onChange) {
  onChangeCallback = onChange
  loadSaved()
  buildPanel()
  return config
}

// ── Panel build ───────────────────────────────────────────────────────────────
let panelEl = null
let visible = false

function buildPanel() {
  const panel = document.createElement('div')
  panel.id = 'settings-panel'
  panel.innerHTML = `
    <div id="sp-header">
      <span>SETTINGS</span>
      <button id="sp-close">✕</button>
    </div>

    <div class="sp-section">
      <div class="sp-section-title">CHARACTERS</div>
      <div class="sp-label-row">
        <label class="sp-label">Foreground (silhouette)</label>
        <button class="sp-sel-btn" data-target="sp-fgChars">select all</button>
      </div>
      <textarea class="sp-textarea" id="sp-fgChars" rows="3" spellcheck="false">${config.fgChars}</textarea>

      <div class="sp-label-row" style="margin-top:10px">
        <label class="sp-label">Background</label>
        <button class="sp-sel-btn" data-target="sp-bgChars">select all</button>
      </div>
      <textarea class="sp-textarea" id="sp-bgChars" rows="2" spellcheck="false">${config.bgChars}</textarea>

      <label class="sp-row" style="margin-top:10px">
        <input type="checkbox" id="sp-showBg" ${config.showBg ? 'checked' : ''} />
        <span>Show background chars</span>
      </label>
    </div>

    <div class="sp-section">
      <div class="sp-section-title">COLORS</div>
      <div class="sp-row">
        <label class="sp-label" style="margin:0;flex:1">Foreground</label>
        <input type="color" class="sp-color" id="sp-fgColor" value="${config.fgColor}" />
      </div>
      <div class="sp-row" style="margin-top:8px">
        <label class="sp-label" style="margin:0;flex:1">Background fill</label>
        <input type="color" class="sp-color" id="sp-bgColor" value="${config.bgColor}" />
      </div>
      <div class="sp-row" style="margin-top:8px">
        <label class="sp-label" style="margin:0;flex:1">BG char color</label>
        <input type="color" class="sp-color" id="sp-bgCharColor" value="${config.bgCharColor}" />
      </div>
    </div>

    <div class="sp-section">
      <div class="sp-section-title">FONT</div>
      <label class="sp-label">Weight</label>
      <div class="sp-radio-group">
        <label class="sp-radio">
          <input type="radio" name="fontWeight" value="normal" ${config.fontWeight === 'normal' ? 'checked' : ''} />
          <span>Regular</span>
        </label>
        <label class="sp-radio">
          <input type="radio" name="fontWeight" value="bold" ${config.fontWeight === 'bold' ? 'checked' : ''} />
          <span>Bold</span>
        </label>
      </div>
    </div>

    <div class="sp-section">
      <div class="sp-section-title">PLAYBACK</div>
      <label class="sp-label">Cursor mode</label>
      <div class="sp-radio-group">
        <label class="sp-radio">
          <input type="radio" name="cursorMode" value="per-frame" ${config.cursorMode === 'per-frame' ? 'checked' : ''} />
          <span>Reset per frame</span>
        </label>
        <label class="sp-radio">
          <input type="radio" name="cursorMode" value="continuous" ${config.cursorMode === 'continuous' ? 'checked' : ''} />
          <span>Continuous</span>
        </label>
      </div>
    </div>

    <div class="sp-section">
      <div class="sp-section-title">DISPLAY</div>
      <div class="sp-label-row">
        <label class="sp-label" style="margin:0">Zoom</label>
        <span id="sp-scaleVal" style="font-size:10px;color:#888">${config.displayScale.toFixed(2)}x</span>
      </div>
      <input type="range" class="sp-slider" id="sp-displayScale"
        min="0.4" max="2.0" step="0.05" value="${config.displayScale}" />

      <div class="sp-label-row" style="margin-top:12px">
        <label class="sp-label" style="margin:0">Resolution</label>
        <span id="sp-rowsVal" style="font-size:10px;color:#888">${config.rows} rows</span>
      </div>
      <input type="range" class="sp-slider" id="sp-rows"
        min="5" max="40" step="1" value="${config.rows}" />
    </div>

    <div id="sp-footer">
      <button class="sp-btn sp-btn-ghost" id="sp-reset">Reset</button>
      <button class="sp-btn sp-btn-primary" id="sp-save">Save</button>
    </div>
  `
  document.body.appendChild(panel)
  panelEl = panel

  injectStyles()
  bindEvents()

  // Toggle panel with Tab key
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); togglePanel() }
  })

  // Corner controls: shading toggle + gear
  const corner = document.createElement('div')
  corner.id = 'sp-corner'

  const stopBtn = document.createElement('button')
  stopBtn.id = 'sp-stop'
  stopBtn.textContent = '■'
  stopBtn.title = 'Stop & return to start'
  stopBtn.addEventListener('click', () => {
    window.__stopVideo?.()
    // Update tooltip after mode-aware action
    const inImage = document.querySelector('.mode-btn.active')?.dataset?.mode === 'image'
    stopBtn.title = inImage ? 'Clear image' : 'Stop & return to start'
  })
  // Keep title in sync with mode changes
  document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('mode-btn')) {
      const inImage = e.target.dataset?.mode === 'image'
      stopBtn.title = inImage ? 'Clear image' : 'Stop & return to start'
    }
  })

  const shadeToggle = document.createElement('button')
  shadeToggle.id = 'sp-shade-toggle'
  shadeToggle.title = 'Toggle shading mode'
  updateShadeToggle(shadeToggle)
  shadeToggle.addEventListener('click', () => {
    config.shadingMode = config.shadingMode === 'binary' ? 'shaded' : 'binary'
    updateShadeToggle(shadeToggle)
    onChangeCallback?.({ rebuildText: false })
  })

  const gear = document.createElement('button')
  gear.id = 'sp-gear'
  gear.textContent = '⚙'
  gear.addEventListener('click', togglePanel)

  corner.appendChild(stopBtn)
  corner.appendChild(shadeToggle)
  corner.appendChild(gear)
  document.body.appendChild(corner)
}

function togglePanel() {
  visible = !visible
  panelEl.style.transform = visible ? 'translateX(0)' : 'translateX(calc(100% + 20px))'
}

// ── Wire all inputs → config ───────────────────────────────────────────────────
function bindEvents() {
  const get = (id) => document.getElementById(id)

  // Select-all buttons and click-to-select on focus
  document.querySelectorAll('.sp-sel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ta = get(btn.dataset.target)
      ta.focus()
      ta.select()
    })
  })
  document.querySelectorAll('.sp-textarea').forEach(ta => {
    ta.addEventListener('focus', () => ta.select())
  })

  // Textareas — live update on input
  get('sp-fgChars').addEventListener('input', (e) => {
    config.fgChars = e.target.value || DEFAULTS.fgChars
    onChangeCallback?.({ rebuildText: true })
  })
  get('sp-bgChars').addEventListener('input', (e) => {
    config.bgChars = e.target.value || DEFAULTS.bgChars
    onChangeCallback?.({ rebuildText: true })
  })

  get('sp-showBg').addEventListener('change', (e) => {
    config.showBg = e.target.checked
    onChangeCallback?.({})
  })

  // Color pickers
  get('sp-fgColor').addEventListener('input', (e) => {
    config.fgColor = e.target.value
    onChangeCallback?.({})
  })
  get('sp-bgColor').addEventListener('input', (e) => {
    config.bgColor = e.target.value
    onChangeCallback?.({})
  })
  get('sp-bgCharColor').addEventListener('input', (e) => {
    config.bgCharColor = e.target.value
    onChangeCallback?.({})
  })

  // Font weight radios
  document.querySelectorAll('input[name="fontWeight"]').forEach(r => {
    r.addEventListener('change', (e) => {
      config.fontWeight = e.target.value
      onChangeCallback?.({ rebuildFont: true })
    })
  })

  // Cursor mode radios
  document.querySelectorAll('input[name="cursorMode"]').forEach(r => {
    r.addEventListener('change', (e) => {
      config.cursorMode = e.target.value
      onChangeCallback?.({})
    })
  })

  // Scale slider
  get('sp-displayScale').addEventListener('input', (e) => {
    config.displayScale = parseFloat(e.target.value)
    document.getElementById('sp-scaleVal').textContent = config.displayScale.toFixed(2) + 'x'
    onChangeCallback?.({ rebuildFont: true })
  })

  // Resolution slider
  get('sp-rows').addEventListener('input', (e) => {
    config.rows = parseInt(e.target.value)
    document.getElementById('sp-rowsVal').textContent = config.rows + ' rows'
    onChangeCallback?.({ rebuildFont: true })
  })

  // Buttons
  get('sp-save').addEventListener('click', saveSettings)
  get('sp-reset').addEventListener('click', resetSettings)
  get('sp-close').addEventListener('click', togglePanel)
}

// Sync all inputs to current config values (used on reset)
function syncPanelToConfig() {
  const get = (id) => document.getElementById(id)
  get('sp-fgChars').value = config.fgChars
  get('sp-bgChars').value = config.bgChars
  get('sp-showBg').checked = config.showBg
  get('sp-fgColor').value = config.fgColor
  get('sp-bgColor').value = config.bgColor
  get('sp-bgCharColor').value = config.bgCharColor
  document.querySelector(`input[name="fontWeight"][value="${config.fontWeight}"]`).checked = true
  document.querySelector(`input[name="cursorMode"][value="${config.cursorMode}"]`).checked = true
  get('sp-displayScale').value = config.displayScale
  document.getElementById('sp-scaleVal').textContent = config.displayScale.toFixed(2) + 'x'
  get('sp-rows').value = config.rows
  document.getElementById('sp-rowsVal').textContent = config.rows + ' rows'
  const st = document.getElementById('sp-shade-toggle')
  if (st) updateShadeToggle(st)
}

function updateShadeToggle(btn) {
  const shaded = config.shadingMode === 'shaded'
  btn.textContent = shaded ? '▓' : '▪'
  btn.title = shaded ? 'Shading: ON — click for binary' : 'Shading: OFF — click for detailed'
  btn.classList.toggle('active', shaded)
}

// Brief flash on save button
function flashSave() {
  const btn = document.getElementById('sp-save')
  const orig = btn.textContent
  btn.textContent = 'Saved ✓'
  btn.style.background = '#22c55e'
  setTimeout(() => {
    btn.textContent = orig
    btn.style.background = ''
  }, 1200)
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    #settings-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 280px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      color: #e0e0e0;
      font-family: "Geist Mono", monospace;
      font-size: 11px;
      z-index: 1000;
      transform: translateX(calc(100% + 20px));
      transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
      scrollbar-width: thin;
      scrollbar-color: #333 transparent;
    }
    #sp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px 10px;
      border-bottom: 1px solid #1e1e1e;
      font-size: 10px;
      letter-spacing: 0.15em;
      color: #888;
    }
    #sp-close {
      background: none;
      border: none;
      color: #555;
      cursor: pointer;
      font-size: 13px;
      padding: 0;
      line-height: 1;
    }
    #sp-close:hover { color: #fff; }
    .sp-section {
      padding: 12px 14px;
      border-bottom: 1px solid #1a1a1a;
    }
    .sp-section-title {
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #555;
      margin-bottom: 10px;
    }
    .sp-label {
      display: block;
      font-size: 10px;
      color: #888;
      margin-bottom: 5px;
    }
    .sp-label-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .sp-label-row .sp-label { margin-bottom: 0; }
    .sp-sel-btn {
      background: none;
      border: none;
      color: #444;
      font-family: "Geist Mono", monospace;
      font-size: 9px;
      cursor: pointer;
      padding: 0;
      letter-spacing: 0.05em;
    }
    .sp-sel-btn:hover { color: #888; }
    .sp-textarea {
      width: 100%;
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 4px;
      color: #e0e0e0;
      font-family: "Geist Mono", monospace;
      font-size: 11px;
      padding: 7px 8px;
      resize: vertical;
      line-height: 1.5;
      box-sizing: border-box;
    }
    .sp-textarea:focus {
      outline: none;
      border-color: #444;
    }
    .sp-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #ccc;
      cursor: pointer;
    }
    .sp-row input[type="checkbox"] {
      accent-color: #fff;
      cursor: pointer;
    }
    .sp-color {
      width: 32px;
      height: 24px;
      border: 1px solid #2a2a2a;
      border-radius: 4px;
      background: none;
      cursor: pointer;
      padding: 1px;
    }
    .sp-radio-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sp-radio {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      color: #ccc;
      cursor: pointer;
    }
    .sp-radio input { accent-color: #fff; cursor: pointer; }
    #sp-footer {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
      justify-content: flex-end;
    }
    .sp-btn {
      font-family: "Geist Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.1em;
      padding: 6px 14px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .sp-btn-ghost {
      background: transparent;
      border: 1px solid #2a2a2a;
      color: #666;
    }
    .sp-btn-ghost:hover { border-color: #444; color: #aaa; }
    .sp-btn-primary {
      background: #fff;
      color: #000;
    }
    .sp-btn-primary:hover { background: #ddd; }
    .sp-slider {
      width: 100%;
      accent-color: #fff;
      margin-top: 6px;
      cursor: pointer;
    }
    #sp-corner {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 6px;
      z-index: 999;
    }
    #sp-stop {
      width: 32px;
      height: 32px;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      color: #555;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background 0.15s;
      line-height: 1;
    }
    #sp-stop:hover { color: #ff5555; background: #161616; border-color: #ff5555; }
    #sp-shade-toggle {
      width: 32px;
      height: 32px;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      color: #555;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background 0.15s, border-color 0.15s;
      line-height: 1;
    }
    #sp-shade-toggle:hover { color: #fff; background: #161616; }
    #sp-shade-toggle.active { color: #fff; border-color: #555; }
    #sp-gear {
      position: static;
      width: 32px;
      height: 32px;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      color: #666;
      font-size: 15px;
      cursor: pointer;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background 0.15s;
      line-height: 1;
    }
    #sp-gear:hover { color: #fff; background: #161616; }
  `
  document.head.appendChild(style)
}
