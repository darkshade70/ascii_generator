import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import { config, initSettings } from './settings.js'
import { VIDEOS } from './videos.js'
import { initPicker } from './picker.js'
import { initEffects, renderEffects, hideOverlayCanvas, showOverlayCanvas } from './effects.js'
import { initScrubber } from './scrubber.js'
import { initImageMode, imageToSegments, showDropZone, hideDropZone, getImageSegments, setOnCopy, showCopyBtn, hideCopyBtn } from './imageMode.js'
import { initModeSwitch, getMode } from './modeSwitch.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const TEXT_ROWS     = 40
const LOGICAL_WIDTH = 1000
const FPS           = 30

// Brightness levels: each maps to a char set + CSS color.
// colorType from frames.bin is normalized into these 6 slots.
// Level 0 is always skipped (darkest/background).
const LEVEL_DEFS = [
  null,                                              // 0: skip
  { chars: " .'`",      color: '#232323' },          // 1: very dark
  { chars: '.,:-',      color: '#474747' },          // 2: dark
  { chars: '+;!~^',     color: '#787878' },          // 3: mid
  { chars: 'IltfJ1',   color: '#b4b4b4' },          // 4: light
  { chars: '@#$%WMB',  color: '#ffffff' },           // 5: bright (uses fgChars from settings)
]

// ── State ─────────────────────────────────────────────────────────────────────
let canvas, ctx, audio
let frameOffsets   = []
let uint16Data     = null
let preparedLevels = []   // index matches LEVEL_DEFS
let started        = false
let animId         = null
let continuousCursors = null   // array of cursors, one per level
let currentVideo   = VIDEOS[0]
let currentImage   = null      // loaded Image element for image mode
let imageSegments  = null      // cached segments for current image + row count

// ── Font ──────────────────────────────────────────────────────────────────────
function makeFont(size) {
  return `${config.fontWeight} ${size}px "Geist Mono", monospace`
}

function getDisplayRows() {
  return Math.min(config.rows ?? TEXT_ROWS, TEXT_ROWS)
}

function getFontSize() {
  const scale = config.displayScale ?? 1
  return Math.max(4, Math.floor((canvas.height / getDisplayRows()) * scale))
}

function buildTextStream(chars) {
  const c = chars.length > 0 ? chars : '?'
  return c.repeat(Math.ceil(8000 / c.length) + 1)
}

function freshCursors() {
  return LEVEL_DEFS.map(() => ({ segmentIndex: 0, graphemeIndex: 0 }))
}

function rebuildPrepared() {
  imageSegments = null  // invalidate image cache when font size changes
  const font = makeFont(getFontSize())
  preparedLevels = LEVEL_DEFS.map((def, i) => {
    if (!def) return null
    // Top level uses the user's custom fgChars, others use their fixed char set
    const chars = i === LEVEL_DEFS.length - 1 ? config.fgChars : def.chars
    return {
      prepared: prepareWithSegments(buildTextStream(chars), font),
      color: def.color,
    }
  })
  continuousCursors = freshCursors()
}

// Normalize a raw colorType (0..video.levels-1) into a LEVEL_DEFS index (0..5).
// In binary mode any non-zero level maps straight to the top (full bright).
// In shaded mode the full tonal range is used.

function toDisplayLevel(colorType, videoLevels) {
  if (videoLevels <= 1) return 0
  if (colorType === 0) return 0
  const normalized = colorType / (videoLevels - 1)  // 0.0 → 1.0
  if (config.shadingMode === 'binary') {
    // Only the top ~33% brightness renders — gives clean positive/negative separation
    return normalized >= 0.67 ? LEVEL_DEFS.length - 1 : 0
  }
  return Math.round(normalized * (LEVEL_DEFS.length - 1))
}

// ── Video loading ─────────────────────────────────────────────────────────────
async function loadVideo(video) {
  currentVideo = video
  frameOffsets = []
  cancelAnimationFrame(animId)
  audio.pause()
  document.getElementById('end-screen').style.display = 'none'

  let framesBuffer
  try {
    const res = await fetch(video.framesPath)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    framesBuffer = await res.arrayBuffer()
  } catch (e) {
    showError(`Could not load ${video.title}\n${e.message}`)
    return
  }

  uint16Data = new Uint16Array(framesBuffer)
  let ptr = 0
  while (ptr < uint16Data.length) {
    frameOffsets.push(ptr)
    const numSegments = uint16Data[ptr]
    ptr += 1 + numSegments * 4
  }

  audio.src = video.audioPath
  audio.load()
  rebuildPrepared()

  const sub = document.getElementById('overlay-subtitle')
  if (sub) sub.textContent = `${video.title.toUpperCase()} // ASCII`

  if (started && getMode() === 'video') {
    audio.play()
    audio.addEventListener('ended', onEnded, { once: true })
    animId = requestAnimationFrame(render)
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  canvas = document.getElementById('canvas')
  ctx    = canvas.getContext('2d')
  audio  = document.getElementById('audio')

  await document.fonts.load(`16px "Geist Mono"`)

  initSettings(({ rebuildText, rebuildFont } = {}) => {
    if (rebuildText || rebuildFont) rebuildPrepared()
  })
  initPicker(VIDEOS, currentVideo, (v) => loadVideo(v))
  initEffects(audio)
  initScrubber(audio)
  initModeSwitch((mode) => {
    if (mode === 'image') {
      // Stop everything video-related
      audio.pause()
      cancelAnimationFrame(animId)
      animId = null
      // Clear both canvases
      ctx.fillStyle = config.bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      hideOverlayCanvas()
      // Hide video UI
      document.getElementById('overlay').style.display = 'none'
      document.getElementById('end-screen').style.display = 'none'
      document.getElementById('scrubber').style.display = 'none'
      if (currentImage) showCopyBtn(); else showDropZone()
    } else {
      // Stop any image render loop
      cancelAnimationFrame(animId)
      animId = null
      currentImage  = null
      imageSegments = null
      hideDropZone()
      hideCopyBtn()
      showOverlayCanvas()
      document.getElementById('scrubber').style.display = ''
      // Clear canvas so no image residue remains
      ctx.fillStyle = config.bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (started) {
        audio.play()
        audio.addEventListener('ended', onEnded, { once: true })
        animId = requestAnimationFrame(render)
      } else {
        document.getElementById('overlay').style.display = 'block'
      }
    }
  })
  initImageMode((img) => {
    currentImage  = img
    imageSegments = null   // invalidate cache so it rebuilds on next render
    // Start render loop in image mode
    cancelAnimationFrame(animId)
    animId = requestAnimationFrame(renderImage)
  })
  setOnCopy(generateAsciiText)

  setCanvasSize()
  window.addEventListener('resize', setCanvasSize)

  await loadVideo(currentVideo)

  canvas.addEventListener('click', () => { if (getMode() === 'video') start() })
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && getMode() === 'video') start() })
}

function start() {
  if (started) return
  started = true
  document.getElementById('overlay').style.display = 'none'
  audio.play()
  animId = requestAnimationFrame(render)
  audio.addEventListener('ended', onEnded, { once: true })
}

function restart() {
  document.getElementById('end-screen').style.display = 'none'
  audio.currentTime = 0
  continuousCursors = freshCursors()
  audio.play()
  animId = requestAnimationFrame(render)
  audio.addEventListener('ended', onEnded, { once: true })
}

function onEnded() {
  if (currentVideo.loop) {
    audio.currentTime = 0
    continuousCursors = freshCursors()
    audio.play()
    audio.addEventListener('ended', onEnded, { once: true })
    return
  }
  cancelAnimationFrame(animId)
  document.getElementById('end-screen').style.display = 'flex'
}

// ── Canvas sizing ─────────────────────────────────────────────────────────────
function setCanvasSize() {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  if (preparedLevels.length) rebuildPrepared()
}

// ── Render loop ───────────────────────────────────────────────────────────────
function render() {
  const frameIndex = Math.min(
    Math.floor(audio.currentTime * FPS),
    frameOffsets.length - 1
  )

  const scale       = config.displayScale ?? 1
  const displayRows = getDisplayRows()
  const baseScaleX  = canvas.width  / LOGICAL_WIDTH
  const baseLH      = canvas.height / displayRows
  const scaleX      = baseScaleX * scale
  const lineHeight  = baseLH     * scale
  const offsetX     = (canvas.width  - LOGICAL_WIDTH * scaleX)    / 2
  const offsetY     = (canvas.height - displayRows   * lineHeight) / 2
  const font        = makeFont(getFontSize())

  // Pre-compute which data rows to render and their display Y positions.
  // When displayRows < TEXT_ROWS we evenly sample TEXT_ROWS → displayRows.
  const rowMap = new Map()  // logicalY → displayY (pixel)
  for (let d = 0; d < displayRows; d++) {
    const srcRow = Math.round(d / displayRows * TEXT_ROWS)
    if (!rowMap.has(srcRow)) rowMap.set(srcRow, d * lineHeight + offsetY)
  }
  const perFrame   = config.cursorMode === 'per-frame'

  ctx.fillStyle = config.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = font
  ctx.textBaseline = 'top'

  const cursors = perFrame ? freshCursors() : continuousCursors

  let ptr = frameOffsets[frameIndex]
  const numSegments = uint16Data[ptr++]

  for (let s = 0; s < numSegments; s++) {
    const logicalY  = uint16Data[ptr++]
    const colorType = uint16Data[ptr++]
    const startX    = uint16Data[ptr++] * scaleX + offsetX
    const endX      = uint16Data[ptr++] * scaleX + offsetX
    const segWidth  = endX - startX

    // Skip rows not in the current resolution sample
    if (!rowMap.has(logicalY)) continue

    const realY  = rowMap.get(logicalY)
    const binary = config.shadingMode === 'binary'

    // In binary mode skip very narrow segments — they create single-char clutter
    const minWidth = binary ? Math.max(getFontSize() * 0.6, 4) : 1
    if (segWidth < minWidth) continue

    const levelIdx = toDisplayLevel(colorType, currentVideo.levels ?? 2)
    const levelDef = preparedLevels[levelIdx]
    if (!levelDef) continue   // level 0 = skip

    // In binary mode use a single shared cursor so text flows as one continuous stream
    // across all foreground segments in the row (no double-stacking)
    const cursorKey = binary ? LEVEL_DEFS.length - 1 : levelIdx

    let line = layoutNextLine(levelDef.prepared, cursors[cursorKey], segWidth)
    if (line === null) {
      cursors[cursorKey] = { segmentIndex: 0, graphemeIndex: 0 }
      line = layoutNextLine(levelDef.prepared, cursors[cursorKey], segWidth)
    }
    if (line && line.text.length > 0) {
      ctx.fillStyle = binary ? config.fgColor : levelDef.color
      ctx.fillText(line.text, startX, realY)
      cursors[cursorKey] = line.end
    }
  }

  if (!perFrame) continuousCursors = cursors

  renderEffects(currentVideo.id)

  animId = requestAnimationFrame(render)
}

// ── Image render loop ─────────────────────────────────────────────────────────
function renderImage() {
  if (getMode() !== 'image' || !currentImage) {
    animId = null
    return
  }

  const displayRows = getDisplayRows()
  const scale       = config.displayScale ?? 1
  const scaleX      = canvas.width / LOGICAL_WIDTH * scale
  const lineHeight  = canvas.height / displayRows * scale
  const offsetX     = (canvas.width  - LOGICAL_WIDTH * scaleX)    / 2
  const offsetY     = (canvas.height - displayRows   * lineHeight) / 2
  const binary      = config.shadingMode === 'binary'
  const font        = makeFont(getFontSize())

  // Rebuild segments only when resolution changes
  const cacheKey = `${displayRows}`
  if (!imageSegments || imageSegments._key !== cacheKey) {
    imageSegments = imageToSegments(currentImage, displayRows)
    imageSegments._key = cacheKey
  }

  ctx.fillStyle = config.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = font
  ctx.textBaseline = 'top'

  const cursors = freshCursors()

  for (const [row, colorType, sx, ex] of imageSegments) {
    const startX   = sx * scaleX + offsetX
    const endX     = ex * scaleX + offsetX
    const segWidth = endX - startX
    const realY    = row * lineHeight + offsetY

    const minWidth = binary ? Math.max(getFontSize() * 0.6, 4) : 1
    if (segWidth < minWidth) continue

    const levelIdx = binary
      ? (colorType / (LEVELS - 1) >= 0.67 ? LEVEL_DEFS.length - 1 : 0)
      : Math.round((colorType / (LEVELS - 1)) * (LEVEL_DEFS.length - 1))
    const levelDef = preparedLevels[levelIdx]
    if (!levelDef) continue

    const cursorKey = binary ? LEVEL_DEFS.length - 1 : levelIdx
    let line = layoutNextLine(levelDef.prepared, cursors[cursorKey], segWidth)
    if (line === null) {
      cursors[cursorKey] = { segmentIndex: 0, graphemeIndex: 0 }
      line = layoutNextLine(levelDef.prepared, cursors[cursorKey], segWidth)
    }
    if (line && line.text.length > 0) {
      ctx.fillStyle = binary ? config.fgColor : levelDef.color
      ctx.fillText(line.text, startX, realY)
      cursors[cursorKey] = line.end
    }
  }

  animId = requestAnimationFrame(renderImage)
}

const LEVELS = 6

// ── ASCII text export ─────────────────────────────────────────────────────────
function generateAsciiText() {
  if (!currentImage) return ''

  const COLS   = 120
  const rows   = getDisplayRows()
  const binary = config.shadingMode === 'binary'
  const segs   = imageToSegments(currentImage, rows)

  // Build a grid of spaces, then fill in chars per segment
  const grid = Array.from({ length: rows }, () => new Array(COLS).fill(' '))

  for (const [row, colorType, startX, endX] of segs) {
    const normalized = colorType / (LEVELS - 1)
    const levelIdx   = binary
      ? (normalized >= 0.67 ? LEVEL_DEFS.length - 1 : 0)
      : Math.round(normalized * (LEVEL_DEFS.length - 1))
    if (!LEVEL_DEFS[levelIdx]) continue  // level 0 = background, skip

    const isTop = levelIdx === LEVEL_DEFS.length - 1
    const chars = isTop ? config.fgChars : LEVEL_DEFS[levelIdx].chars
    const ch    = chars[Math.floor(chars.length / 2)] || chars[0] || '@'

    const colStart = Math.floor(startX / LOGICAL_WIDTH * COLS)
    const colEnd   = Math.ceil(endX   / LOGICAL_WIDTH * COLS)
    for (let c = colStart; c < colEnd && c < COLS; c++) grid[row][c] = ch
  }

  return grid.map(r => r.join('')).join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('overlay')
  el.style.color = '#ff4444'
  el.innerHTML = msg.split('\n').map(l => `<span style="opacity:1">${l}</span>`).join('')
}

function stopVideo() {
  cancelAnimationFrame(animId)
  audio.pause()
  audio.currentTime = 0
  started = false
  continuousCursors = freshCursors()
  document.getElementById('end-screen').style.display = 'none'
  document.getElementById('overlay').style.display = 'block'
}

function clearImage() {
  currentImage  = null
  imageSegments = null
  cancelAnimationFrame(animId)
  // Clear canvas
  ctx.fillStyle = config.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  hideCopyBtn()
  showDropZone()
}

// Context-aware stop: clears image in image mode, resets video in video mode
function handleStop() {
  if (getMode() === 'image') {
    clearImage()
  } else {
    stopVideo()
  }
}

window.__restart   = restart
window.__stopVideo = handleStop
init()
