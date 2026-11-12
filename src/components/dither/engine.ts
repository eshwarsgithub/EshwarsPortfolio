// Cursor-driven fluid, drawn as a grid of glyph cells.
//
// 1. A small ping-pong buffer holds a fluid field: velocity in RG (0.5 = still), strength in B.
//    Every step it carries itself along its own velocity (plus a little turbulence), fades, and the
//    cursor stamps its direction and speed into it.
// 2. The screen is cut into CELL-sized squares. Each square reads the fluid at its centre and shows
//    one of five glyphs by strength, tinted by the flow direction.

export const CELL = 12 // css px per glyph cell
const SIM_SCALE = 1 / 8 // fluid buffer size relative to the viewport
const STEP = 1000 / 60 // fluid runs at a fixed 60 Hz whatever the display rate
const IDLE = 2500 // ms without input before the loop stops
export const TILES = 5

export const VERT = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`

const SIM = `
precision highp float;
varying vec2 uv;
uniform sampler2D prev, noise;
uniform vec2 mouse, vel, texel;
uniform float aspect, burst, time;

void main(){
  vec2 asp = vec2(aspect, 1.);
  float sp = length(vel);
  vec2 dir = sp > 1e-5 ? vel / sp : vec2(0.);

  // carry the field along its own (slightly blurred) velocity, nudged by turbulence
  vec4 f = texture2D(prev, uv) * .4
    + (texture2D(prev, uv + vec2(texel.x * 1.5, 0.)) + texture2D(prev, uv - vec2(texel.x * 1.5, 0.))
    +  texture2D(prev, uv + vec2(0., texel.y * 1.5)) + texture2D(prev, uv - vec2(0., texel.y * 1.5))) * .15;
  vec2 flow = .5 - f.rg;
  vec2 turb = (.5 - texture2D(noise, uv * vec2(aspect, 1.) * .8 + time * .01).rg) * .012 * f.b * 1.4;
  vec4 h = texture2D(prev, uv + flow * .011 / asp + turb);

  h.rg -= .5;
  h.rg = sign(h.rg) * max(abs(h.rg) * .962 - .0015, 0.);
  h.b = max(h.b * .952 - .0025, 0.);
  if (h.b < 1e-4) h.rg = vec2(0.);
  h.rg += .5;

  // the cursor's stamp: wider and stronger the faster it moves
  float radius = clamp(pow(smoothstep(0., .2, sp), .85), 0., .06);
  float d = distance(uv * asp, mouse * asp);
  float soft = 1. - smoothstep(radius * .2, radius, d);
  float hard = 1. - step(radius, d);
  vec3 stamp = vec3(dir * hard * .5 + .5, clamp(sp * hard * 30., 0., 1.));
  vec3 c = mix(h.rgb, stamp, clamp(sp * soft * 100., 0., 1.));

  // a click sends out a ring
  if (burst > .01) {
    vec2 away = uv * asp - mouse * asp;
    float ring = smoothstep(.02, 0., abs(length(away) - (1. - burst) * .06)) * burst;
    c = mix(c, vec3(normalize(away + 1e-5) * .32 + .5, .85), ring);
  }

  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`

const DRAW = `
precision highp float;
varying vec2 uv;
uniform sampler2D fluid, atlas;
uniform vec2 grid; // one cell, in uv
uniform float time;

void main(){
  vec2 cellUv = (floor(uv / grid) + .5) * grid;
  vec4 f = texture2D(fluid, cellUv);
  float strength = clamp(f.b, 0., 1.);
  vec2 flow = (.5 - f.rg) * 2.;

  float shade = min(floor(strength * ${TILES}.), ${TILES - 1}.);
  vec2 q = fract(uv / grid);
  float e = 1. / ${CELL}.;
  vec2 inner = (q - e) / (1. - 2. * e);
  float inside = step(0., inner.x) * step(inner.x, 1.) * step(0., inner.y) * step(inner.y, 1.);
  float glyph = texture2D(atlas, vec2((shade + clamp(inner.x, .02, .98)) / ${TILES}., inner.y)).r * inside;

  float hue = (flow.x + flow.y) * .9 + time * .04;
  vec3 rainbow = .5 + .5 * cos(6.2832 * (hue + vec3(0., .33, .67)));
  vec3 col = mix(vec3(1.), rainbow, clamp(max(abs(flow.x), abs(flow.y)) * 1.6, 0., .8));

  float a = glyph * smoothstep(.05, .16, strength);
  gl_FragColor = vec4(col * a, a);
}`

// five glyphs in a strip, weakest to strongest: plus, dot, hollow square, heavy square, solid square
export function makeAtlas() {
  const s = 48
  const c = document.createElement('canvas')
  c.width = s * TILES
  c.height = s
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, c.width, s)
  g.fillStyle = g.strokeStyle = '#fff'
  const at = (i: number) => i * s
  g.fillRect(at(0) + s * 0.44, s * 0.18, s * 0.12, s * 0.64)
  g.fillRect(at(0) + s * 0.18, s * 0.44, s * 0.64, s * 0.12)
  g.beginPath()
  g.arc(at(1) + s / 2, s / 2, s * 0.26, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = s * 0.12
  g.strokeRect(at(2) + s * 0.16, s * 0.16, s * 0.68, s * 0.68)
  g.lineWidth = s * 0.24
  g.strokeRect(at(3) + s * 0.2, s * 0.2, s * 0.6, s * 0.6)
  g.fillRect(at(4) + s * 0.06, s * 0.06, s * 0.88, s * 0.88)
  return c
}

// smooth tiling noise in R and G, used to curl the flow
function makeNoise(size = 128) {
  const waves = Array.from({ length: 14 }, () => ({
    fx: Math.round(Math.random() * 8 - 4),
    fy: Math.round(Math.random() * 8 - 4),
    ph: Math.random() * Math.PI * 2,
    ch: Math.random() < 0.5 ? 0 : 1,
  }))
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sum = [0, 0]
      const n = [0, 0]
      for (const w of waves) {
        sum[w.ch] += Math.sin(((w.fx * x + w.fy * y) / size) * Math.PI * 2 + w.ph)
        n[w.ch]++
      }
      const i = (y * size + x) * 4
      data[i] = 127.5 + (127.5 * sum[0]) / Math.max(n[0], 1)
      data[i + 1] = 127.5 + (127.5 * sum[1]) / Math.max(n[1], 1)
      data[i + 3] = 255
    }
  return { data, size }
}

export function mountDither(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })
  if (!gl) return () => {}
  const float = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))

  const program = (frag: string) => {
    const prog = gl.createProgram()!
    for (const [type, src] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, frag],
    ] as const) {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
      gl.attachShader(prog, sh)
    }
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    const u = (name: string) => gl.getUniformLocation(prog, name)
    return { prog, u }
  }
  let sim: ReturnType<typeof program>, draw: ReturnType<typeof program>
  try {
    sim = program(SIM)
    draw = program(DRAW)
  } catch (err) {
    console.warn('dither trail disabled:', err)
    return () => {}
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const texture = (wrap: number, filter: number) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    return t
  }
  const atlas = texture(gl.CLAMP_TO_EDGE, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeAtlas())
  const noise = texture(gl.REPEAT, gl.LINEAR)
  const nz = makeNoise()
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nz.size, nz.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, nz.data)

  const targets = [0, 1].map(() => ({ tex: texture(gl.CLAMP_TO_EDGE, gl.LINEAR), fbo: gl.createFramebuffer()! }))
  let simW = 1,
    simH = 1,
    dpr = 1

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = window.innerWidth,
      h = window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    simW = Math.max(2, Math.round(w * SIM_SCALE))
    simH = Math.max(2, Math.round(h * SIM_SCALE))
    for (const t of targets) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex)
      if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, simW, simH, 0, gl.RGBA, gl.HALF_FLOAT, null)
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0)
      gl.clearColor(0.5, 0.5, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
  resize()

  const target = { x: 0.5, y: 0.5 }
  const smooth = { x: 0.5, y: 0.5 }
  const last = { x: 0.5, y: 0.5 }
  let seen = false
  let burst = 0
  let lastInput = 0
  let raf = 0
  let prevT = 0
  let acc = 0
  let cur = 0

  const step = (now: number) => {
    smooth.x += (target.x - smooth.x) * 0.22
    smooth.y += (target.y - smooth.y) * 0.22
    const vx = (smooth.x - last.x) * 2,
      vy = (smooth.y - last.y) * 2
    last.x = smooth.x
    last.y = smooth.y

    const src = targets[cur],
      dst = targets[1 - cur]
    cur = 1 - cur
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
    gl.viewport(0, 0, simW, simH)
    gl.disable(gl.BLEND)
    gl.useProgram(sim.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, src.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, noise)
    gl.uniform1i(sim.u('prev'), 0)
    gl.uniform1i(sim.u('noise'), 1)
    gl.uniform2f(sim.u('mouse'), smooth.x, smooth.y)
    gl.uniform2f(sim.u('vel'), vx, vy)
    gl.uniform2f(sim.u('texel'), 1 / simW, 1 / simH)
    gl.uniform1f(sim.u('aspect'), simW / simH)
    gl.uniform1f(sim.u('burst'), burst)
    gl.uniform1f(sim.u('time'), now / 1000)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    burst *= 0.82
    if (burst < 0.01) burst = 0
  }

  const render = (now: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(draw.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, atlas)
    gl.uniform1i(draw.u('fluid'), 0)
    gl.uniform1i(draw.u('atlas'), 1)
    gl.uniform2f(draw.u('grid'), (CELL * dpr) / canvas.width, (CELL * dpr) / canvas.height)
    gl.uniform1f(draw.u('time'), now / 1000)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const frame = (now: number) => {
    acc = Math.min(acc + (now - prevT), STEP * 3)
    prevT = now
    while (acc >= STEP) {
      step(now)
      acc -= STEP
    }
    render(now)
    // once the visitor has stopped and the trail has faded, stop drawing entirely
    raf = now - lastInput > IDLE ? 0 : requestAnimationFrame(frame)
  }
  const wake = () => {
    lastInput = performance.now()
    if (!raf) {
      prevT = lastInput
      acc = 0
      raf = requestAnimationFrame(frame)
    }
  }

  const place = (e: PointerEvent) => {
    target.x = e.clientX / window.innerWidth
    target.y = 1 - e.clientY / window.innerHeight
    if (!seen) {
      seen = true
      smooth.x = last.x = target.x
      smooth.y = last.y = target.y
    }
  }
  const onMove = (e: PointerEvent) => {
    place(e)
    wake()
  }
  const onDown = (e: PointerEvent) => {
    place(e)
    smooth.x = last.x = target.x
    smooth.y = last.y = target.y
    burst = 1
    wake()
  }
  const onLost = (e: Event) => {
    e.preventDefault()
    cancelAnimationFrame(raf)
    raf = 0
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('resize', resize)
  canvas.addEventListener('webglcontextlost', onLost)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('resize', resize)
    canvas.removeEventListener('webglcontextlost', onLost)
  }
}
