// A turning 3D hand drawn as glyph tiles, inside a field of dust streaking toward the camera.
//
// Per frame:
//   1. SHAPE  ray-marches the hand into a tiny buffer, one texel per glyph cell (brightness + hit).
//   2. TILE   turns each texel into a coloured glyph tile, drawn into an off-screen picture.
//   3. DUST   adds perspective streaks on top of that picture.
//   4. FINISH puts the picture on screen with glow and red/blue colour fringing.
//
// The camera swings with the cursor and dollies in on first view; holding the mouse speeds time up.

import { TILES, VERT, makeAtlas } from './engine'

const CELL = 12 // css px per tile
const FOV_TAN = Math.tan((45 * Math.PI) / 360)
const CAM_Z = 10
const DUST = 450
const MAX_SPEED = 20

const SHAPE = `
precision highp float;
varying vec2 uv;
uniform float aspect, time;
uniform vec3 eye, right, up, fwd;

float capsule(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)) - r;
}
float rbox(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b;
  return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r;
}
float smin(float a, float b, float k){
  float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
  return mix(b, a, h) - k * h * (1. - h);
}
// three joints, each bending a little further forward
float finger(vec3 p, vec3 base, float len, float spread, float curl, float r){
  vec3 b = base + normalize(vec3(spread, 1., curl * .3)) * len * .42;
  vec3 c = b + normalize(vec3(spread, 1., curl)) * len * .32;
  vec3 e = c + normalize(vec3(spread, .9, curl * 1.9)) * len * .26;
  float d = capsule(p, base, b, r);
  d = smin(d, capsule(p, b, c, r * .92), .02);
  return smin(d, capsule(p, c, e, r * .84), .02);
}
float hand(vec3 p){
  float curl = .3 + .12 * sin(time * .8);
  float d = rbox(p, vec3(.32, .37, .04), .15);
  d = smin(d, finger(p, vec3(-.31, .44, 0.), .68, -.10, curl, .098), .07);
  d = smin(d, finger(p, vec3(-.10, .48, 0.), .76, -.03, curl * .9, .102), .07);
  d = smin(d, finger(p, vec3(.11, .46, 0.), .70, .04, curl, .096), .07);
  d = smin(d, finger(p, vec3(.31, .40, 0.), .54, .12, curl * 1.2, .085), .07);
  float thumb = capsule(p, vec3(-.30, -.30, .06), vec3(-.66, -.04, .16), .125);
  thumb = smin(thumb, capsule(p, vec3(-.66, -.04, .16), vec3(-.84, .24, .24), .105), .03);
  d = smin(d, thumb, .1);
  vec3 w = vec3(p.x, p.y, p.z * 1.4);
  return smin(d, capsule(w, vec3(0., -.5, 0.), vec3(0., -6., 0.), .3), .12);
}
vec3 turn(vec3 p, float a){
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
// the hand rises from below the frame: its wrist sits just under the centre of the view
const float SCALE = 2.5;
float map(vec3 p){ return hand(turn((p - vec3(0., -1.9, 0.)) / SCALE, time * .65)) * SCALE; }

float lamp(vec3 p, vec3 n, vec3 at, float power){
  return max(dot(n, normalize(at - p)), 0.) * power;
}

void main(){
  vec2 ndc = uv * 2. - 1.;
  vec3 rd = normalize(fwd + right * ndc.x * aspect * ${FOV_TAN.toFixed(5)} + up * ndc.y * ${FOV_TAN.toFixed(5)});
  float t = 0., hit = 0.;
  for (int i = 0; i < 80; i++) {
    float d = map(eye + rd * t);
    if (d < .006) { hit = 1.; break; }
    t += d * .85;
    if (t > 90.) break;
  }
  if (hit < .5) { gl_FragColor = vec4(0.); return; }
  vec3 p = eye + rd * t;
  vec2 e = vec2(.012, 0.);
  vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
  // one strong lamp overhead, one to the side, a weak one from below
  float lum = lamp(p, n, vec3(3., 16., 4.), .95) + lamp(p, n, vec3(-12., 2., 3.), .5) + lamp(p, n, vec3(0., -8., 6.), .22) + lamp(p, n, vec3(4., 5., 14.), .62);
  gl_FragColor = vec4(clamp(lum, 0., .999), 0., 0., 1.);
}`

const TILE = `
precision highp float;
varying vec2 uv;
uniform sampler2D shape, atlas;
uniform vec2 cells;

void main(){
  vec2 at = uv * cells;
  vec4 s = texture2D(shape, (floor(at) + .5) / cells);
  if (s.a < .5) { gl_FragColor = vec4(0.); return; }

  // darkest to brightest: plus, pink tile, dot, hollow square, lavender tile
  float shade = floor(s.r * 5.);
  float tile; vec3 col;
  if (shade < .5)       { tile = 0.; col = vec3(.5); }
  else if (shade < 1.5) { tile = 4.; col = vec3(1., .38, .68); }
  else if (shade < 2.5) { tile = 1.; col = vec3(.78); }
  else if (shade < 3.5) { tile = 2.; col = vec3(.95); }
  else                  { tile = 4.; col = vec3(.58, .45, .82); }

  vec2 q = fract(at);
  float e = 1. / ${CELL}.;
  vec2 inner = (q - e) / (1. - 2. * e);
  float inside = step(0., inner.x) * step(inner.x, 1.) * step(0., inner.y) * step(inner.y, 1.);
  float glyph = texture2D(atlas, vec2((tile + clamp(inner.x, .02, .98)) / ${TILES}., inner.y)).r * inside;
  gl_FragColor = vec4(col * glyph, glyph);
}`

// each mote is a tapered quad from its head back along the direction it is flying
const DUST_VERT = `
attribute vec4 seed;   // phase, speed, x, y
attribute vec2 corner; // 0 head .. 1 tail, and -1..1 across
uniform mat4 vp;
uniform float time, opening, stretch, aspect;
varying vec2 vCorner;
varying vec3 vCol;

void main(){
  float pace = max(.1, seed.y * .35) * 2.;
  float life = fract((time + seed.x) * pace * .5 + seed.x);
  vec3 head = vec3(mix(-8., 8., seed.z), mix(-6., 6., seed.w), mix(-12., 12., life));
  vec3 tail = head - vec3(0., 0., (.2 + pace * .9) * stretch);
  vec4 a = vp * vec4(head, 1.), b = vp * vec4(tail, 1.);
  vCorner = corner;
  vCol = mix(.5 + .5 * cos(6.2832 * (seed.z * 5. + seed.w * 3. + vec3(0., .33, .67))), vec3(1.), .25);
  if (a.w < .15) { gl_Position = vec4(2., 2., 2., 1.); return; }

  vec2 sa = a.xy / a.w, sb = b.xy / b.w;
  vec2 along = (sa - sb) * vec2(aspect, 1.);
  vec2 dir = length(along) > 1e-5 ? normalize(along) : vec2(0., 1.);
  vec2 side = vec2(-dir.y, dir.x);
  float size = (.022 + .034 * fract(seed.x * 91.7)) * smoothstep(0., .2, life) * opening * ${(1 / FOV_TAN).toFixed(4)};
  float width = mix(size / a.w, size * .3 / b.w, smoothstep(0., .12, corner.x));
  width = min(width, .028); // motes passing right by the camera stay slender
  vec2 pos = mix(sa, sb, corner.x) * vec2(aspect, 1.) + side * corner.y * width + dir * width * (1. - corner.x);
  gl_Position = vec4(pos / vec2(aspect, 1.), 0., 1.);
}`
const DUST_FRAG = `
precision highp float;
varying vec2 vCorner;
varying vec3 vCol;
void main(){
  float a = smoothstep(1., .35, abs(vCorner.y)) * pow(1. - vCorner.x, 1.2);
  gl_FragColor = vec4(vCol * a, a);
}`

const FINISH = `
precision highp float;
varying vec2 uv;
uniform sampler2D scene;
uniform float fringe; // how far red and blue split, as a fraction of the frame

void main(){
  vec2 d = uv - .5;
  vec3 col = vec3(texture2D(scene, uv + d * fringe).r, texture2D(scene, uv).g, texture2D(scene, uv - d * fringe).b);
  vec3 glow = texture2D(scene, uv, 3.).rgb * .4 + texture2D(scene, uv, 5.).rgb * .3;
  gl_FragColor = vec4(col + glow, 1.);
}`

export type SceneHud = (speed: number, elapsed: number) => void

export function mountScene(canvas: HTMLCanvasElement, host: HTMLElement, still: boolean, hud?: SceneHud): () => void {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false })
  if (!gl) return () => {}

  const program = (vert: string, frag: string, attribs: string[]) => {
    const prog = gl.createProgram()!
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vert],
      [gl.FRAGMENT_SHADER, frag],
    ] as const) {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
      gl.attachShader(prog, sh)
    }
    attribs.forEach((name, i) => gl.bindAttribLocation(prog, i, name))
    gl.linkProgram(prog)
    return { prog, u: (name: string) => gl.getUniformLocation(prog, name) }
  }
  type Program = ReturnType<typeof program>
  let shape: Program, tile: Program, dust: Program, finish: Program
  try {
    shape = program(VERT, SHAPE, ['p'])
    tile = program(VERT, TILE, ['p'])
    dust = program(DUST_VERT, DUST_FRAG, ['seed', 'corner'])
    finish = program(VERT, FINISH, ['p'])
  } catch (err) {
    console.warn('dither scene disabled:', err)
    return () => {}
  }

  // one full-screen triangle, and six vertices per dust mote
  const screen = gl.createVertexArray()!
  gl.bindVertexArray(screen)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const motes = gl.createVertexArray()!
  gl.bindVertexArray(motes)
  const quad = [0, -1, 0, 1, 1, -1, 1, -1, 0, 1, 1, 1]
  const data = new Float32Array(DUST * 6 * 6)
  for (let i = 0; i < DUST; i++) {
    const seed = [Math.random(), Math.random(), Math.random(), Math.random()]
    for (let v = 0; v < 6; v++) data.set([...seed, quad[v * 2], quad[v * 2 + 1]], (i * 6 + v) * 6)
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16)

  const texture = (min: number, mag: number) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag)
    return t
  }
  const atlas = texture(gl.LINEAR, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeAtlas())
  const grid = texture(gl.NEAREST, gl.NEAREST)
  const gridFbo = gl.createFramebuffer()!
  const picture = texture(gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR)
  const pictureFbo = gl.createFramebuffer()!

  let cols = 1,
    rows = 1,
    width = 1,
    height = 1
  const resize = () => {
    width = host.clientWidth
    height = host.clientHeight
    if (!width || !height) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    cols = Math.ceil(width / CELL)
    rows = Math.ceil(height / CELL)
    gl.bindTexture(gl.TEXTURE_2D, grid)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, gridFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, grid, 0)
    gl.bindTexture(gl.TEXTURE_2D, picture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, pictureFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, picture, 0)
    if (!raf) draw()
  }

  // ---- state
  const mouse = { x: 0, y: 0 } // -1..1 across the band, y up
  const smooth = { x: 0, y: 0 }
  let holding = false
  let wanted = 1 // speed the visitor is asking for
  let speed = 1
  let elapsed = still ? 6 : 0
  let opening = still ? 1 : 0 // 0 = camera far away, 1 = arrived
  let openedAt = 0
  let raf = 0
  let visible = false
  let prev = 0

  const draw = () => {
    // camera: swings with the cursor, pushes in toward the edges, always looks at the centre
    const settle = Math.sin((opening * Math.PI) / 2)
    const eye = [smooth.x * 4, (smooth.y - 0.5) * 4, CAM_Z - Math.abs(smooth.x) - Math.abs(smooth.y) + (1 - settle) * 50]
    const len = Math.hypot(eye[0], eye[1], eye[2])
    const f = [-eye[0] / len, -eye[1] / len, -eye[2] / len]
    const rl = Math.hypot(f[2], f[0])
    const r = [-f[2] / rl, 0, f[0] / rl]
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    const aspect = width / height
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const near = 0.1,
      far = 200,
      k = 1 / FOV_TAN
    const view = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1]
    const proj = [k / aspect, 0, 0, 0, 0, k, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]
    const vp = new Float32Array(16)
    for (let c = 0; c < 4; c++)
      for (let row = 0; row < 4; row++) {
        let sum = 0
        for (let i = 0; i < 4; i++) sum += proj[i * 4 + row] * view[c * 4 + i]
        vp[c * 4 + row] = sum
      }

    // the tile grid is a whole number of cells, so it can overhang the band slightly
    const gridW = Math.round((cols * CELL * canvas.width) / width)
    const gridH = Math.round((rows * CELL * canvas.height) / height)

    // 1. the hand, one texel per tile
    gl.bindVertexArray(screen)
    gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, gridFbo)
    gl.viewport(0, 0, cols, rows)
    gl.useProgram(shape.prog)
    gl.uniform1f(shape.u('aspect'), (cols * CELL) / height)
    gl.uniform1f(shape.u('time'), elapsed)
    gl.uniform3fv(shape.u('eye'), eye)
    gl.uniform3fv(shape.u('right'), r)
    gl.uniform3fv(shape.u('up'), u)
    gl.uniform3fv(shape.u('fwd'), f)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // 2. tiles into the off-screen picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, pictureFbo)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.03, 0.03, 0.03, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(tile.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, grid)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, atlas)
    gl.uniform1i(tile.u('shape'), 0)
    gl.uniform1i(tile.u('atlas'), 1)
    gl.uniform2f(tile.u('cells'), cols, rows)
    gl.viewport(0, Math.round((canvas.height - gridH) / 2), gridW, gridH)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.viewport(0, 0, canvas.width, canvas.height)

    // 3. dust streaks, added on top
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.bindVertexArray(motes)
    gl.useProgram(dust.prog)
    gl.uniformMatrix4fv(dust.u('vp'), false, vp)
    gl.uniform1f(dust.u('time'), elapsed)
    gl.uniform1f(dust.u('opening'), settle)
    gl.uniform1f(dust.u('stretch'), 1 + (speed - 1) * 0.35)
    gl.uniform1f(dust.u('aspect'), aspect)
    gl.drawArrays(gl.TRIANGLES, 0, DUST * 6)

    // 4. to the screen, with glow and colour fringing that grows with speed
    gl.disable(gl.BLEND)
    gl.bindVertexArray(screen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(finish.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, picture)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.uniform1i(finish.u('scene'), 0)
    gl.uniform1f(finish.u('fringe'), (1.1 + (speed - 1) * 0.45) * 0.004)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const frame = (now: number) => {
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    const k = dt * 60 // 1 at 60 fps

    // hold to accelerate: slow to start, then it runs away; release snaps the target back
    if (holding) {
      const ramp = Math.min(Math.max((speed - 4) / 4, 0), 1)
      wanted = Math.min(wanted + (0.02 + 0.58 * ramp * ramp * (3 - 2 * ramp)) * k, MAX_SPEED)
    } else wanted = 1
    speed += (wanted - speed) * (1 - Math.exp(-dt * 2.2))
    if (Math.abs(speed - wanted) < 0.005) speed = wanted
    elapsed += dt * speed

    const ease = 1 - Math.pow(1 - 0.09, k * speed)
    smooth.x += (mouse.x - smooth.x) * ease
    smooth.y += (mouse.y - smooth.y) * ease
    if (openedAt) opening = Math.min((now - openedAt) / 2000, 1)

    draw()
    hud?.(speed, elapsed)
    raf = visible ? requestAnimationFrame(frame) : 0
  }
  const start = () => {
    if (raf || still) return
    prev = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const onMove = (e: PointerEvent) => {
    const box = host.getBoundingClientRect()
    mouse.x = Math.min(Math.max(((e.clientX - box.left) / box.width) * 2 - 1, -1), 1)
    mouse.y = Math.min(Math.max(1 - ((e.clientY - box.top) / box.height) * 2, -1), 1)
  }
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button === 0) holding = true
  }
  const onUp = () => {
    holding = false
  }

  // run only while the band is on screen; the dolly-in plays the first time it appears
  const watch = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible && !openedAt && !still) openedAt = performance.now()
      if (visible) start()
      else holding = false
    },
    { threshold: 0.25 },
  )
  watch.observe(host)
  const sizes = new ResizeObserver(resize)
  sizes.observe(host)
  resize()
  hud?.(speed, elapsed)

  window.addEventListener('pointermove', onMove, { passive: true })
  host.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  window.addEventListener('blur', onUp)

  return () => {
    cancelAnimationFrame(raf)
    watch.disconnect()
    sizes.disconnect()
    window.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('blur', onUp)
  }
}
