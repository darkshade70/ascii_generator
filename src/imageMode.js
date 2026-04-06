// ── Image → ASCII converter ────────────────────────────────────────────────
// Converts any dropped/pasted/uploaded image into the same segment format
// used by frames.bin so the existing ASCII renderer handles it transparently.

const LOGICAL_WIDTH = 1000
const LEVELS        = 6

let currentSegments = null
let dropZoneEl      = null
let copyBtnEl       = null
let onSegmentsReady = null
let onCopyHandler   = null

export function initImageMode(onReady) {
  onSegmentsReady = onReady
  buildDropZone()
  buildCopyBtn()
}

export function setOnCopy(fn) { onCopyHandler = fn }
export function showCopyBtn() { if (copyBtnEl) copyBtnEl.style.display = '' }
export function hideCopyBtn() { if (copyBtnEl) copyBtnEl.style.display = 'none' }

export function getImageSegments() {
  return currentSegments
}

export function showDropZone() {
  dropZoneEl.style.display = 'flex'
}

export function hideDropZone() {
  dropZoneEl.style.display = 'none'
}

// ── Convert image element → segments array ────────────────────────────────
export function imageToSegments(img, rows) {
  const W = LOGICAL_WIDTH
  const H = rows

  const offscreen = new OffscreenCanvas(W, H)
  const ctx = offscreen.getContext('2d')

  // Fill black first so transparent PNGs have a background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img, 0, 0, W, H)

  const { data } = ctx.getImageData(0, 0, W, H)

  const segments = []
  for (let row = 0; row < H; row++) {
    let startX       = 0
    let currentLevel = -1

    for (let x = 0; x < W; x++) {
      const i          = (row * W + x) * 4
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const level      = Math.min(Math.floor((brightness / 255) ** 0.75 * LEVELS), LEVELS - 1)

      if (level !== currentLevel) {
        if (currentLevel >= 0) segments.push([row, currentLevel, startX, x])
        currentLevel = level
        startX       = x
      }
    }
    if (currentLevel >= 0) segments.push([row, currentLevel, startX, W])
  }

  return segments
}

// ── Drop zone UI ──────────────────────────────────────────────────────────
function buildDropZone() {
  dropZoneEl = document.createElement('div')
  dropZoneEl.id = 'img-drop'
  dropZoneEl.innerHTML = `
    <div id="img-drop-inner">
      <div id="img-drop-icon">⬛</div>
      <div id="img-drop-label">Drop an image here</div>
      <div id="img-drop-sub">or click to browse</div>
      <input type="file" id="img-file-input" accept="image/*" style="display:none" />
    </div>
  `
  dropZoneEl.style.display = 'none'
  document.body.appendChild(dropZoneEl)

  injectStyles()

  // Click to open file picker
  dropZoneEl.addEventListener('click', () => {
    document.getElementById('img-file-input').click()
  })

  document.getElementById('img-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) loadFile(file)
  })

  // Drag and drop
  dropZoneEl.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZoneEl.classList.add('drag-over')
  })
  dropZoneEl.addEventListener('dragleave', () => {
    dropZoneEl.classList.remove('drag-over')
  })
  dropZoneEl.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZoneEl.classList.remove('drag-over')
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) loadFile(file)
  })

  // Paste from clipboard
  window.addEventListener('paste', (e) => {
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'))
    if (item) loadFile(item.getAsFile())
  })
}

function loadFile(file) {
  const url = URL.createObjectURL(file)
  const img  = new Image()
  img.onload = () => {
    currentSegments = img  // store the img element; segments computed per-frame in main
    URL.revokeObjectURL(url)
    onSegmentsReady?.(img)
    hideDropZone()
    showCopyBtn()
  }
  img.src = url
}

function buildCopyBtn() {
  copyBtnEl = document.createElement('button')
  copyBtnEl.id = 'copy-ascii-btn'
  copyBtnEl.textContent = '⎘ COPY ASCII'
  copyBtnEl.style.display = 'none'
  document.body.appendChild(copyBtnEl)

  copyBtnEl.addEventListener('click', async () => {
    if (!onCopyHandler) return
    const text = onCopyHandler()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      const prev = copyBtnEl.textContent
      copyBtnEl.textContent = '✓ COPIED'
      setTimeout(() => { copyBtnEl.textContent = prev }, 1500)
    } catch {
      copyBtnEl.textContent = '✗ FAILED'
      setTimeout(() => { copyBtnEl.textContent = '⎘ COPY ASCII' }, 1500)
    }
  })
}

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    #img-drop {
      position: fixed;
      inset: 0;
      z-index: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.85);
    }
    #img-drop-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      border: 1px dashed #333;
      border-radius: 12px;
      padding: 48px 64px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    #img-drop.drag-over #img-drop-inner {
      border-color: #fff;
      background: rgba(255,255,255,0.04);
    }
    #img-drop-icon {
      font-size: 2.5rem;
      line-height: 1;
      opacity: 0.4;
    }
    #img-drop-label {
      font-family: "Geist Mono", monospace;
      font-size: 13px;
      color: #ccc;
      letter-spacing: 0.05em;
    }
    #img-drop-sub {
      font-family: "Geist Mono", monospace;
      font-size: 10px;
      color: #444;
    }
    #img-drop-inner:hover {
      border-color: #555;
    }
    #copy-ascii-btn {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-family: "Geist Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      color: #fff;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 6px 16px;
      cursor: pointer;
      z-index: 700;
      transition: background 0.15s, border-color 0.15s;
    }
    #copy-ascii-btn:hover {
      background: #2a2a2a;
      border-color: #555;
    }
  `
  document.head.appendChild(style)
}
