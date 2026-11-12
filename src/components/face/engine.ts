// @ts-nocheck
// Living-portrait engine: a soft stretchy sheet (damped wave equation) in WebGL showing ONE picture at a time.
// Every expression, gaze and blink is a separately generated still of the same face (src/assets/face/<name>.webp);
// the code only decides which one to show and makes the skin move. Missing stills are skipped.
//
// Gaze: the stills cover a handful of measured eye directions. Each frame the still nearest to where the eyes
// should point is chosen, and the small remainder is made up by sliding the iris inside the eye opening
// (a shader warp of that one picture), so the eyes track the cursor continuously instead of in steps.

const SRC_W = 1168, SRC_H = 1696 // size the stills were measured at

// Where things sit on the face, as fractions of the image (u across, v down).
const LAYOUT = {
  cx: 0.52, // face centre line
  eyeV: 0.424, // eye line
  eyeLU: [0.31, 0.45], // left-eye u range (image side)
  eyeRU: [0.59, 0.73],
  browV: 0.39, // above this (and below hairV) = forehead
  hairV: 0.3, // above this = hair
  noseV: 0.56,
  mouthV: [0.57, 0.665],
  headC: [0.52, 0.5],
  headR: [0.3, 0.3],
  // eye openings: [centre u, centre v, half-width, half-height]
  eyeL: [0.378, 0.4235, 0.07, 0.0205],
  eyeR: [0.658, 0.421, 0.07, 0.0205],
  spot: { nose: [0.52, 0.53], brow: [0.52, 0.36], cheekR: [0.68, 0.56], cheekL: [0.36, 0.56], mouth: [0.52, 0.62] },
}

// Gaze stills and where their irises sit relative to the resting picture, in source pixels (+x image-right, +y down).
const GAZE = {
  rest: [0, 0],
  g_r1: [16, 4], g_r2: [20, 0], g_r3: [27, 6], g_r4: [31, 5],
  g_dr1: [15, 12], g_dr2: [29, 17], g_dr3: [24, 19],
  g_l2: [-33, 10], g_dl1: [-14, 14],
  g_d1: [-3, 12], g_d2: [6, 27],
}
const REACH = { x: 33, down: 27, up: 6 } // how far the eyes can travel, source px
const WARP = { x: 17, y: 7 } // the most the iris may be slid on top of a still, source px
const FALLOFF = 900 // cursor distance (source px) at which the eyes are ~3/4 of the way over
// open-eyed, forward-looking expressions whose eyes may keep following the cursor
const FOLLOWS = new Set(['grin', 'fish', 'whistle1', 'whistle2', 'raised', 'gum1', 'gum2', 'sick'])
// stand-ins for expressions that have no still of their own
const ALIAS = { yawn4: 'yawn1', kiss: 'fish', shock: 'raised', ouch: 'sneeze1', scrunch: 'sneeze1', scared: 'yawn2', dizzy: 'stars', laugh: 'grin', angry: 'smug', cross: 'raised', deadpan: 'rest' }

const OVER = 1.7, N = 72, M = N + 1, SPAN = OVER / N, ORIGIN = 0.5 - OVER / 2
const WOBBLE = 2.3 * 2 * Math.PI, REACHN = 0.085 / SPAN, C = REACHN * WOBBLE, GAMMA = 2 * 0.14 * WOBBLE, NU = 0.2 * C

export function mountFace({ wrap, canvas, fly, hand, fallback, restUrl, urls, hoverSelector }) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true })
  if (!gl) { fallback.src = restUrl; return () => {} } // no WebGL: a plain, open-eyed picture
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const cleanups = []
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }
  let dead = false

  const VS = `attribute vec2 a, d; attribute float s; varying vec2 vUv; varying float vS;
    uniform vec2 lean; uniform float overS;
    void main(){ vUv = a; vS = s; vec2 p = a + d + lean; gl_Position = vec4(vec2(p.x-.5, .5-p.y)*2./overS, 0., 1.); }`
  const FS = `precision highp float; varying vec2 vUv; varying float vS;
    uniform sampler2D faceA, faceB; uniform float fade;
    uniform vec2 gazeA, gazeB; uniform vec4 eyeL, eyeR;
    // 1 inside an eye opening, fading to 0 at its rim, so only the iris and white move and the lids stay put
    float eyeMask(vec2 uv, vec4 e){ return 1. - smoothstep(.62, 1., length((uv - e.xy) / e.zw)); }
    void main(){
      if(vUv.x<0.||vUv.y<0.||vUv.x>1.||vUv.y>1.){ gl_FragColor = vec4(0.); return; }
      float m = max(eyeMask(vUv, eyeL), eyeMask(vUv, eyeR));
      // each picture gets its own iris offset, so both show the iris in the same place while they cross-fade
      vec4 c = mix(texture2D(faceA, vUv - gazeA * m), texture2D(faceB, vUv - gazeB * m), fade);
      if(c.a<.004){ gl_FragColor = vec4(0.); return; }
      gl_FragColor = vec4(c.rgb*vS, c.a);
    }`
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o }
  const pr = gl.createProgram()
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(pr); gl.useProgram(pr)
  const U = { over_: gl.getUniformLocation(pr, 'overS') }
  for (const n of ['lean', 'faceA', 'faceB', 'fade', 'gazeA', 'gazeB', 'eyeL', 'eyeR']) U[n] = gl.getUniformLocation(pr, n)
  gl.uniform1f(U.over_, OVER)
  gl.uniform4f(U.eyeL, ...LAYOUT.eyeL); gl.uniform4f(U.eyeR, ...LAYOUT.eyeR)
  gl.uniform1i(U.faceA, 0); gl.uniform1i(U.faceB, 1)

  // ---- the sheet ----
  const count = M * M, ux = new Float32Array(count), uy = new Float32Array(count), vx = new Float32Array(count), vy = new Float32Array(count)
  const rest = new Float32Array(count * 2), dyn = new Float32Array(count * 3)
  const sx = new Float32Array(count), sy = new Float32Array(count)
  for (let j = 0, k = 0; j < M; j++) for (let i = 0; i < M; i++) { rest[k++] = ORIGIN + i * SPAN; rest[k++] = ORIGIN + j * SPAN }
  const idx = new Uint16Array(N * N * 6)
  for (let j = 0, k = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * M + i, b = a + 1, c = a + M, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, rest, gl.STATIC_DRAW)
  const aa = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0)
  const dynBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf); gl.bufferData(gl.ARRAY_BUFFER, dyn, gl.DYNAMIC_DRAW)
  const ad = gl.getAttribLocation(pr, 'd'), as = gl.getAttribLocation(pr, 's')
  gl.enableVertexAttribArray(ad); gl.vertexAttribPointer(ad, 2, gl.FLOAT, false, 12, 0)
  gl.enableVertexAttribArray(as); gl.vertexAttribPointer(as, 1, gl.FLOAT, false, 12, 8)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0)

  let brush = null
  function takeHold(u, v, radius = 0.22) {
    const list = []
    for (let k = 0; k < count; k++) {
      const dx = rest[k * 2] + ux[k] - u, dy = rest[k * 2 + 1] + uy[k] - v, w = Math.exp(-(dx * dx + dy * dy) / (radius * radius))
      if (w > 0.02) list.push([k, w, ux[k], uy[k]])
    }
    brush = { u, v, list, px: 0, py: 0 }
  }
  // The sheet must never fold over itself (overlapping triangles draw as a comb of cuts): every frame each
  // row and column is forced back into order with a minimum gap between neighbours.
  const GAP = SPAN * 0.34, lineA = new Float32Array(M), lineB = new Float32Array(M), lineP = new Float32Array(M)
  function order(start, stride, field, base) {
    for (let i = 0; i < M; i++) { const k = start + i * stride; lineP[i] = base[k] + field[k] }
    lineA[0] = lineP[0]; for (let i = 1; i < M; i++) lineA[i] = Math.max(lineP[i], lineA[i - 1] + GAP)
    lineB[N] = lineP[N]; for (let i = N - 1; i >= 0; i--) lineB[i] = Math.min(lineP[i], lineB[i + 1] - GAP)
    for (let i = 0; i < M; i++) { const k = start + i * stride; field[k] = (lineA[i] + lineB[i]) / 2 - base[k] }
  }
  const restX = new Float32Array(count), restY = new Float32Array(count)
  for (let k = 0; k < count; k++) { restX[k] = rest[k * 2]; restY[k] = rest[k * 2 + 1] }
  function untangle() {
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < M; j++) order(j * M, 1, sx, restX)
      for (let i = 0; i < M; i++) order(i, M, sy, restY)
    }
  }

  const H = 1 / 240; let simLeft = 0
  function step(dt) {
    const c2 = C * C, wo2 = WOBBLE * WOBBLE
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
      const k = j * M + i, l = k - 1, r = k + 1, t = k - M, b = k + M
      const lx = ux[l] + ux[r] + ux[t] + ux[b] - 4 * ux[k], ly = uy[l] + uy[r] + uy[t] + uy[b] - 4 * uy[k]
      const lvx = vx[l] + vx[r] + vx[t] + vx[b] - 4 * vx[k], lvy = vy[l] + vy[r] + vy[t] + vy[b] - 4 * vy[k]
      vx[k] += (c2 * lx - wo2 * ux[k] - GAMMA * vx[k] + NU * lvx) * dt
      vy[k] += (c2 * ly - wo2 * uy[k] - GAMMA * vy[k] + NU * lvy) * dt
    }
    if (brush) for (const [k, w, u0, v0] of brush.list) {
      const K = 3000 * w, D = 90 * w
      vx[k] += ((u0 + brush.px * w - ux[k]) * K - vx[k] * D) * dt
      vy[k] += ((v0 + brush.py * w - uy[k]) * K - vy[k] * D) * dt
    }
    for (let k = 0; k < count; k++) { ux[k] += vx[k] * dt; uy[k] += vy[k] * dt }
  }
  function poke(u, v, dx, dy, radius = 0.09) {
    for (let k = 0; k < count; k++) {
      const ax = rest[k * 2] - u, ay = rest[k * 2 + 1] - v, w = Math.exp(-(ax * ax + ay * ay) / (radius * radius))
      vx[k] += dx * w; vy[k] += dy * w
    }
  }

  // ---- pictures ----
  const tex = {}
  const param = () => { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR) }
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  const srcOf = name => (name === 'rest' ? restUrl : urls[name])
  const load = name => new Promise(res => {
    const s = srcOf(name); if (!s) return res(null)
    const i = new Image(); i.decoding = 'async'
    i.onload = () => (i.decode ? i.decode().then(() => res(i), () => res(i)) : res(i)); i.onerror = () => res(null); i.src = s
  })
  function upload(name, img) { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); param(); tex[name] = t }
  let alphaMap = null
  function hitMap(img) {
    const a = document.createElement('canvas'); a.width = a.height = 128
    const ac = a.getContext('2d', { willReadFrequently: true }); ac.drawImage(img, 0, 0, 128, 128)
    alphaMap = ac.getImageData(0, 0, 128, 128).data
  }
  // the still to actually show for an expression name: itself, its stand-in, or nothing
  const resolve = n => (tex[n] ? n : ALIAS[n] && (ALIAS[n] === 'rest' || tex[ALIAS[n]]) ? ALIAS[n] : n)

  // ---- what he does ----
  const SPOT = LAYOUT.spot
  // [picture | 'half' | 'closed' | 'look:x,y' (eyes to that offset, source px) | 'look:rest', crossfade ms, hold ms, extras]
  const ACTS = {
    yawn: [['yawn1', 140, 240], ['yawn2', 140, 200], ['yawn', 170, 900], ['yawn2', 150, 130], ['yawn4', 180, 700]],
    whistle: [['whistle1', 150, 700], ['whistle2', 100, 700], ['whistle1', 100, 620], ['whistle2', 100, 620]],
    shifty: [['look:-33,10', 60, 520], ['look:31,5', 60, 600], ['look:-33,10', 60, 400], ['look:rest', 60, 260]],
    sneeze: [['sneeze1', 130, 380], ['half', 90, 120], ['sneeze1', 90, 560], ['sneeze2', 50, 300, { jolt: [0.5, 0.6, 0, 1.5, 0.34], lean: [0, 0.03] }], ['dizzy', 110, 620], ['shy', 140, 650]],
    gum: [['gum1', 130, 800], ['gum2', 180, 460], ['gum3', 200, 760], ['gumpop', 40, 1300, { jolt: [0.5, 0.63, 0, -1.1, 0.3] }], ['deadpan', 200, 700], ['laugh', 130, 700]],
    doze: [['half', 450, 700, { lean: [0.006, 0.006] }], ['closed', 320, 500, { lean: [0.012, 0.012] }], ['half', 200, 340], ['closed', 400, 1100, { lean: [0.02, 0.02] }], ['snore', 260, 3400, { lean: [0.03, 0.03], wake: 1 }], ['shock', 50, 650, { jolt: [0.5, 0.5, 0, -0.9, 0.3] }]],
    flirt: [['smug', 130, 520], ['kiss', 120, 560], ['hearts', 120, 900], ['shy', 160, 620]],
    wow: [['stars', 130, 1000], ['grin', 140, 640]],
    fly: 'fly', tug: 'tug',
  }
  const ROTATION = ['yawn', 'shifty', 'gum', 'fly', 'flirt', 'sneeze', 'tug', 'whistle', 'doze', 'wow']
  const ZONES = {
    hover: { mouth: 'kiss' },
    tap: { brow: 'raised', eyeL: 'ouch', eyeR: 'ouch', nose: 'act:sneeze', mouth: 'whistle2', cheek: 'fish', chin: 'grin', hair: 'stars' },
  }
  const zoneAt = (u, v) => {
    const a = (u - LAYOUT.headC[0]) / LAYOUT.headR[0], b = (v - LAYOUT.headC[1]) / LAYOUT.headR[1]
    if (a * a + b * b > 1 || v < LAYOUT.hairV) return 'hair'
    if (v < LAYOUT.browV) return 'brow'
    if (Math.abs(v - LAYOUT.eyeV) < 0.04 && u > LAYOUT.eyeLU[0] && u < LAYOUT.eyeLU[1]) return 'eyeL'
    if (Math.abs(v - LAYOUT.eyeV) < 0.04 && u > LAYOUT.eyeRU[0] && u < LAYOUT.eyeRU[1]) return 'eyeR'
    if (Math.abs(u - LAYOUT.cx) < 0.055 && v < LAYOUT.noseV) return 'nose'
    if (v > LAYOUT.mouthV[0] && v < LAYOUT.mouthV[1] && Math.abs(u - LAYOUT.cx) < 0.12) return 'mouth'
    return v > LAYOUT.mouthV[1] ? 'chin' : 'cheek'
  }

  // state
  let ready = false, tStart = 0, last = performance.now()
  let pu = 0.5, pv = 0.5, onHead = false, zone = null, zoneSince = 0
  let lastInput = -1e9, awake = false, pressed = false, downAt = 0, downU = 0, downV = 0, lastX = 0, lastY = 0, speed = 0, shake = 0
  let moodFace = null, moodUntil = 0, pulls = [], lookAt = null
  let act = null, actI = 0, actT = 0, rotation = [], nextIdle = 30000
  let faceA = 'rest', faceB = 'rest', fadeT = 0, fadeMs = 1
  let logical = 'rest', logicalMs = 70
  let lids = 'closed', lidsMs = 40 // 'open' | 'half' | 'closed'
  let gazePic = 'rest', gazeSwapT = 0, gzX = 0, gzY = 0 // current gaze still and the smoothed eye offset (source px)
  let nextBlink = 0, blinkStep = -1, blinkT = 0, wakeUntil = 0
  let leanX = 0, leanY = 0, lvX = 0, lvY = 0, wantLean = [0, 0]
  const pullNow = [0, 0]
  let wantLids = null, wantLook = null, handHeld = false, handFrom = [1.4, 0.9], handTo = [1.4, 0.9], flyFrom = [1.4, 0], flyTo = [1.4, 0], moveT = 0, moveMs = 1
  let handGrip = false, flyPos = [1.4, 0], visible = true, scrollUntil = 0, lastScroll = scrollY
  const timers = []

  const setFace = (n, ms) => { logical = resolve(n); logicalMs = ms }
  const setLids = (cell, ms) => { if (cell === 'open' || tex[cell]) { lids = cell; lidsMs = ms } }
  // one picture on screen at a time, always
  function showPic(n, ms, now) {
    if (!tex[n] || n === faceB) return
    faceA = (now - fadeT) / fadeMs > 0.5 ? faceB : faceA; faceB = n; fadeT = now; fadeMs = Math.min(70, Math.max(1, ms))
  }
  function compose(now) {
    if (logical !== 'rest') showPic(logical, logicalMs, now)
    else if (lids !== 'open') showPic(lids, lidsMs, now)
    else showPic(gazePic, lidsMs, now)
  }
  // how far to slide the iris on a given picture so the eyes land on the smoothed target
  const slide = [0, 0]
  function slideFor(name) {
    let rx = 0, ry = 0
    const g = GAZE[name]
    if (g) { rx = gzX - g[0]; ry = gzY - g[1] }
    else if (FOLLOWS.has(name)) { rx = gzX * 0.8; ry = gzY * 0.8 }
    const k = Math.hypot(rx / WARP.x, ry / WARP.y)
    if (k > 1) { rx /= k; ry /= k }
    slide[0] = rx / SRC_W; slide[1] = ry / SRC_H
    return slide
  }

  function startAct(name, now) {
    endAct()
    const a = ACTS[name]
    if (a === 'fly') act = flyAct(); else if (a === 'tug') act = tugAct(); else act = a
    actI = -1; actT = now; advance(now)
  }
  function endAct() {
    act = null; fly.style.opacity = 0; hand.style.opacity = 0; lookAt = null; wantLids = null; wantLook = null; wantLean = [0, 0]
    if (handHeld) { handHeld = false; brush = null; pullNow[0] = pullNow[1] = 0 }
  }
  function advance(now) {
    actI++
    if (!act || actI >= act.length) { endAct(); return }
    const [pic, fade, , x] = act[actI]; actT = now
    if (pic.startsWith('look:')) {
      setFace('rest', fade); wantLids = null
      wantLook = pic === 'look:rest' ? null : pic.slice(5).split(',').map(Number)
    } else if (pic === 'half' || pic === 'closed') { setFace('rest', fade); wantLids = pic; setLids(pic, fade) }
    else { wantLids = null; wantLook = null; setFace(pic, fade) }
    if (x) {
      if (x.jolt) poke(...x.jolt)
      wantLean = x.lean || [0, 0]
      if (x.call) x.call(now)
    } else wantLean = [0, 0]
  }
  const place = (el, u, v) => { el.style.left = ((u - 0.5) * 100 + 50) + '%'; el.style.top = ((v - 0.5) * 100 + 50) + '%' }
  const moveHand = (u, v, ms) => now => { handFrom = handTo; handTo = [u, v]; moveT = now; moveMs = ms }
  const moveFly = (u, v, ms) => now => { flyFrom = flyTo; flyTo = [u, v]; moveT = now; moveMs = ms }

  function flyAct() {
    flyTo = [1.35, 0.02]; fly.style.opacity = 1; lookAt = () => flyPos
    const hop = (u, v, ms) => ['look:rest', 40, ms, { call: moveFly(u, v, ms * 0.9) }]
    return [hop(0.92, 0.2, 620), hop(0.1, 0.32, 680), hop(0.9, 0.66, 640), hop(0.16, 0.62, 600), hop(...SPOT.nose, 520),
      ['cross', 110, 950, { jolt: [SPOT.nose[0], SPOT.nose[1], 0, 0.28, 0.05] }],
      ['whistle1', 90, 340, { call: moveFly(0.5, 0.3, 280) }], ['deadpan', 110, 480, { call: moveFly(...SPOT.nose, 320) }],
      ['cross', 90, 560, { jolt: [SPOT.nose[0], SPOT.nose[1], 0, 0.28, 0.05] }],
      ['whistle2', 90, 620, { call: moveFly(1.5, -0.35, 600) }], ['smug', 120, 600]]
  }
  function tugAct() {
    handTo = [1.3, 0.86]; hand.style.opacity = 1; hand.classList.remove('shut')
    const g = (u, v, ms, pic, grip) => [pic, 90, ms, { call: now => { moveHand(u, v, ms * 0.8)(now); handGrip = grip } }]
    return [g(...SPOT.cheekR, 760, 'look:24,19', false), g(...SPOT.cheekR, 240, 'shock', 'on'),
      g(0.95, 0.5, 620, 'ouch', 'pull'), g(0.86, 0.56, 240, 'ouch', 'pull'), g(0.98, 0.48, 240, 'ouch', 'pull'), g(0.9, 0.52, 260, 'ouch', 'pull'),
      g(1.4, 0.22, 1000, 'dizzy', 'off'), ['angry', 120, 620]]
  }

  // ---- input ----
  const toUv = (x, y) => { const r = canvas.getBoundingClientRect(); return [((x - r.left) / r.width - 0.5) * OVER + 0.5, ((y - r.top) / r.height - 0.5) * OVER + 0.5] }
  const solid = (u, v) => alphaMap && u >= 0 && v >= 0 && u < 1 && v < 1 && alphaMap[((v * 128 | 0) * 128 + (u * 128 | 0)) * 4 + 3] > 40
  function wake(now) {
    lastInput = now
    if (!awake) { awake = true; nextBlink = now + 1600; wakeUntil = now + 120; setLids('half', 90) } // closed -> half -> open
    nextIdle = 30000 + Math.random() * 15000
  }

  on(window, 'pointermove', e => {
    const now = performance.now()
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY
    ;[pu, pv] = toUv(e.clientX, e.clientY)
    speed += Math.hypot(dx, dy) * 0.004
    wake(now)
    if (act && !pressed && act !== ACTS.doze) endAct(); else if (act === ACTS.doze) { actI = act.length - 2; advance(now) }
    onHead = solid(pu, pv)
    const z = onHead ? zoneAt(pu, pv) : null
    if (z !== zone) { zone = z; zoneSince = now }
    wrap.style.cursor = pressed ? 'grabbing' : onHead ? 'grab' : ''
    if (onHead && !pressed) poke(pu, pv, dx * 0.00035, dy * 0.00035, 0.07)
    if (pressed && brush) {
      let px = pu - brush.u, py = pv - brush.v; const L = Math.hypot(px, py), lim = 0.24
      if (L > 0) { const k = lim * (1 - Math.exp(-L / lim)) / L; px *= k; py *= k }
      brush.px = px; brush.py = py
    }
  }, { passive: true })
  on(wrap, 'pointerdown', e => {
    const now = performance.now(), [u, v] = toUv(e.clientX, e.clientY)
    if (!solid(u, v)) return
    wake(now); endAct(); pressed = true; downAt = now; downU = u; downV = v; takeHold(u, v)
    moodFace = null; wrap.setPointerCapture(e.pointerId); e.preventDefault()
  })
  function release() {
    if (!pressed) return
    const now = performance.now(), L = Math.hypot(brush.px, brush.py), z = zoneAt(downU, downV), held = now - downAt
    pressed = false; brush = null; wrap.style.cursor = onHead ? 'grab' : ''
    pulls = pulls.filter(t => now - t < 14000)
    if (L < 0.03 && held < 380) { // a tap
      const r = ZONES.tap[z]
      if (r && r.startsWith('act:')) startAct(r.slice(4), now); else if (r) { moodFace = r; moodUntil = now + 1100 }
      poke(downU, downV, 0, 0.5, 0.06)
      return
    }
    pulls.push(now)
    const n = pulls.length
    moodFace = n >= 8 ? 'sick' : n >= 5 ? 'angry' : L > 0.22 ? 'dizzy' : L > 0.1 ? 'scrunch' : 'deadpan'
    moodUntil = now + (n >= 5 ? 2600 : 700 + L * 2800)
  }
  on(window, 'pointerup', release); on(window, 'pointercancel', release)
  on(document.documentElement, 'pointerleave', () => { zone = null })
  if (hoverSelector) document.querySelectorAll(hoverSelector).forEach(b => {
    on(b, 'pointerenter', () => { moodFace = 'hearts'; moodUntil = performance.now() + 1e7 })
    on(b, 'pointerleave', () => { moodFace = 'grin'; moodUntil = performance.now() + 700 })
  })
  // touch screens have no cursor to wake him, so he opens his eyes on his own
  if (matchMedia('(hover: none)').matches) timers.push(setTimeout(() => wake(performance.now()), 1400))
  on(window, 'scroll', () => { const n = performance.now(); if (Math.abs(scrollY - lastScroll) > 2) { scrollUntil = n + 450; lastScroll = scrollY } wake(n) }, { passive: true })

  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting }, { threshold: 0 }); io.observe(canvas)
  const ro = new ResizeObserver(() => { const r = Math.min(devicePixelRatio || 1, 2), b = canvas.getBoundingClientRect(); canvas.width = b.width * r; canvas.height = b.height * r; gl.viewport(0, 0, canvas.width, canvas.height) }); ro.observe(canvas)

  // ---- frame ----
  let raf = 0
  function frame(now) {
    if (dead) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.04, (now - last) / 1000); last = now
    if (!ready || !visible) return
    const f = r => 1 - Math.exp(-dt * r)

    speed *= Math.exp(-dt * 6); shake += ((speed > 1.5 ? 1 : 0) - shake) * f(speed > 1.5 ? 1.2 : 0.9)

    // acts when the page goes quiet
    if (act) { if (now - actT > act[actI][2]) advance(now) }
    else if (!reduced && !pressed && tStart && now - Math.max(lastInput, tStart) > nextIdle) {
      if (!rotation.length) rotation = [...ROTATION]
      startAct(rotation.shift(), now); lastInput = now; nextIdle = 30000 + Math.random() * 15000
      if (!awake) wake(now)
    }

    // moving props
    const mk = Math.min(1, (now - moveT) / moveMs), me = mk * mk * (3 - 2 * mk)
    flyPos = [flyFrom[0] + (flyTo[0] - flyFrom[0]) * me + Math.sin(now * 0.02) * 0.012 * (1 - (mk >= 1 ? 0.85 : 0)), flyFrom[1] + (flyTo[1] - flyFrom[1]) * me + Math.cos(now * 0.027) * 0.012 * (1 - (mk >= 1 ? 0.85 : 0))]
    place(fly, flyPos[0], flyPos[1])
    const hp = [handFrom[0] + (handTo[0] - handFrom[0]) * me, handFrom[1] + (handTo[1] - handFrom[1]) * me]
    place(hand, hp[0], hp[1])
    if (handGrip === 'on' && !handHeld) { takeHold(hp[0], hp[1], 0.22); handHeld = true; hand.classList.add('shut'); handGrip = 'pull' }
    if (handHeld && brush) { brush.px = hp[0] - brush.u; brush.py = hp[1] - brush.v }
    if (handGrip === 'off' && handHeld) { handHeld = false; brush = null; hand.classList.remove('shut'); handGrip = false }

    // which picture
    let want = 'rest'
    const pull = brush ? Math.hypot(brush.px, brush.py) : 0
    if (act) want = null
    else if (pressed) want = pull > 0.24 ? 'scared' : pull > 0.1 ? 'ouch' : pull > 0.02 ? 'shock' : 'rest'
    else if (moodFace && now < moodUntil) want = moodFace
    else if (shake > 0.92) want = 'sick'
    else if (zone && now - zoneSince > 80 && ZONES.hover[zone]) want = ZONES.hover[zone]
    if (want) setFace(want, want === 'rest' ? 110 : 90)

    // where the eyes should point (source px), eased so they glide rather than snap
    let gx = 0, gy = 0
    if (awake) {
      if (wantLook) { gx = wantLook[0]; gy = wantLook[1] }
      else if (now < scrollUntil && !lookAt) { gx = 0; gy = REACH.down }
      else {
        let dx, dy
        if (lookAt) { const p = lookAt(); dx = (p[0] - LAYOUT.cx) * SRC_W; dy = (p[1] - LAYOUT.eyeV) * SRC_H }
        else { dx = (pu - LAYOUT.cx) * SRC_W; dy = (pv - LAYOUT.eyeV) * SRC_H }
        const hyp = Math.hypot(dx, dy)
        if (hyp > 1) { const t = Math.tanh(hyp / FALLOFF) / hyp; gx = dx * t * REACH.x; gy = dy * t * (dy > 0 ? REACH.down : REACH.up) }
      }
    }
    const ease = f(wantLook ? 22 : 14)
    gzX += (gx - gzX) * ease; gzY += (gy - gzY) * ease

    // the still whose eyes are nearest to that, with a little stickiness so it does not flicker between two
    if (now - gazeSwapT > 90) {
      let best = gazePic, bestD = 1e9
      for (const n in GAZE) {
        if (!tex[n]) continue
        const d = Math.hypot(gzX - GAZE[n][0], (gzY - GAZE[n][1]) * 1.15) - (n === gazePic ? 2.5 : 0)
        if (d < bestD) { bestD = d; best = n }
      }
      if (best !== gazePic) { gazePic = best; gazeSwapT = now }
    }

    // lids: only over the resting face; shut until the visitor first moves
    if (logical === 'rest') {
      if (wantLids) setLids(wantLids, 60)
      else if (!awake) setLids('closed', 200)
      else if (blinkStep >= 0) {
        const s = (now - blinkT) / 62 | 0
        if (s !== blinkStep) { blinkStep = s; if (s === 1) setLids('closed', 20); else if (s === 2) setLids('half', 20); else if (s >= 3) { setLids('open', 30); blinkStep = -1 } }
      } else {
        if (lids !== 'open' && now > wakeUntil) setLids('open', 100)
        if (now > nextBlink) { blinkStep = 0; blinkT = now; setLids('half', 20); nextBlink = now + 2200 + Math.random() * 3400 }
      }
    } else { blinkStep = -1; if (awake) lids = 'open' }

    compose(now)
    let s = slideFor(faceA); gl.uniform2f(U.gazeA, s[0], s[1])
    s = slideFor(faceB); gl.uniform2f(U.gazeB, s[0], s[1])

    // the head leans toward the pull, the cursor, the scroll, and whatever the act asks
    const scrolling = now < scrollUntil ? 0.006 : 0
    const tx = (pressed || handHeld ? (brush ? brush.px * 0.16 : 0) : awake ? Math.max(-1.2, Math.min(1.2, pu - 0.5)) * 0.012 : 0) + wantLean[0] + Math.sin(now * 0.0009) * 0.0015
    const ty = (pressed || handHeld ? (brush ? brush.py * 0.16 : 0) : awake ? Math.max(-1.2, Math.min(1.2, pv - 0.46)) * 0.008 : 0) + wantLean[1] + scrolling + Math.sin(now * 0.0013) * 0.0022
    lvX += ((tx - leanX) * 70 - lvX * 8) * dt; lvY += ((ty - leanY) * 70 - lvY * 8) * dt
    leanX += lvX * dt; leanY += lvY * dt

    // skin
    simLeft += dt
    let steps = 0
    while (simLeft >= H && steps < 9) { step(H); simLeft -= H; steps++ }
    if (steps === 9) simLeft = 0
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const k = j * M + i, edge = i === 0 || j === 0 || i === N || j === N
      sx[k] = edge ? ux[k] : (ux[k] * 4 + ux[k - 1] + ux[k + 1] + ux[k - M] + ux[k + M]) / 8
      sy[k] = edge ? uy[k] : (uy[k] * 4 + uy[k - 1] + uy[k + 1] + uy[k - M] + uy[k + M]) / 8
    }
    untangle()
    for (let k = 0, o = 0; k < count; k++) {
      dyn[o++] = sx[k]; dyn[o++] = sy[k]
      const r = k % M, c = k / M | 0
      let sd = 1
      if (r > 0 && r < N && c > 0 && c < N) sd = Math.max(0.86, Math.min(1.16, 1 - ((sx[k + 1] - sx[k - 1]) + (sy[k + M] - sy[k - M])) * 1.8))
      dyn[o++] = sd
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, dyn)

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[faceA] || tex.rest)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[faceB] || tex.rest)
    gl.uniform1f(U.fade, Math.min(1, (now - fadeT) / fadeMs))
    gl.uniform2f(U.lean, leanX, leanY)
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)
  }

  ;(async () => {
    const base = await load('rest')
    if (!base || dead) return
    upload('rest', base); hitMap(base)
    const take = async n => { const img = await load(n); if (img && !dead) upload(n, img) }
    await take('closed') // he starts asleep, so this must be there before the first frame
    if (dead) return
    if (tex.closed) { faceA = faceB = 'closed' } else { lids = 'open'; awake = true }
    fallback.style.visibility = 'hidden'
    ready = true; tStart = performance.now(); raf = requestAnimationFrame(frame)
    await take('half')
    // gaze stills next (they matter most), then the expressions
    const names = Object.keys(urls).filter(n => !['rest', 'closed', 'half'].includes(n)).sort((a, b) => (GAZE[b] ? 1 : 0) - (GAZE[a] ? 1 : 0))
    let i = 0
    await Promise.all(Array.from({ length: 4 }, async () => { while (i < names.length && !dead) await take(names[i++]) }))
  })()

  return () => {
    dead = true
    cancelAnimationFrame(raf)
    timers.forEach(clearTimeout)
    cleanups.forEach(fn => fn())
    io.disconnect(); ro.disconnect()
    fallback.style.visibility = ''
  }
}
