// The salsa, danced in the browser.
//
// Seven steps captured in a motion capture studio, baked to plain numbers in
// data/salsa.js: nineteen joints, three angles each per frame, and where the
// pelvis is. This file reads them, strings steps into a choreography, keeps
// the dance on the counts of a song or of a tempo slider, and draws the
// figure with WebGL2. Everything in here is the portfolio's own code; the
// numbers are the capture's.
//
// Two figures can dance it. A figure of spheres, built from the nineteen
// joints, which is always there. And his own body, a scan skinned to a rig
// of fifty joints, which arrives as rig/rig.glb with its own bake of the
// same steps in rig/salsa-rig.js, as quaternions in the rig's joint space.
// The spheres dance until the scan has loaded, and dance alone if it never
// does. The step logic, the clocks and the panel do not care which.
//
// How a step plays: a step is a run of frames and a number of counts. The
// clock runs in counts. When the step has used its counts the next one in
// the queue starts, and for most of a count the two are crossfaded, each
// angle taking the short way round, because a spin ends a whole turn from
// where it began. A step may only begin on a 1 or a 5, the strong counts.
(() => {
  const SALSA = window.SALSA, SONGS = window.SONGS || [];
  if (!SALSA) return;

  const $ = (id) => document.getElementById(id);
  const canvas = $("dance");
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) { $("stage").classList.add("no-gl"); return; }

  // ---- what the figures are made of ----
  const METRES = 0.80;          // the capture is in metres; the sphere figure is drawn at 0.8 of that
  const BLEND_COUNTS = 0.9;     // how long one step takes to become the next
  const AHEAD = 3;              // the step dancing and the two after it
  const WANDER = 0.03;          // a little drift on every angle of the sphere figure, so a loop never repeats exactly

  const C_BODY  = [0.84, 0.86, 0.90];
  const C_JOINT = [0.36, 0.86, 1.00];   // the site's accent
  const C_HAND  = [0.70, 0.73, 0.80];

  // ---- matrices, column major ----
  const I4 = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  const mul = (a, b, o = new Float32Array(16)) => {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    return o;
  };
  const T = (x, y, z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
  const S = (x, y, z) => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
  const RX = (t) => { const c = Math.cos(t), s = Math.sin(t); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; };
  const RY = (t) => { const c = Math.cos(t), s = Math.sin(t); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; };
  const RZ = (t) => { const c = Math.cos(t), s = Math.sin(t); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; };
  // T(t) times R(q), written straight into o
  const TRq = (t, q, o) => {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const xx = x*x, yy = y*y, zz = z*z, xy = x*y, xz = x*z, yz = y*z, wx = w*x, wy = w*y, wz = w*z;
    o[0] = 1 - 2*(yy + zz); o[1] = 2*(xy + wz);     o[2] = 2*(xz - wy);     o[3] = 0;
    o[4] = 2*(xy - wz);     o[5] = 1 - 2*(xx + zz); o[6] = 2*(yz + wx);     o[7] = 0;
    o[8] = 2*(xz + wy);     o[9] = 2*(yz - wx);     o[10] = 1 - 2*(xx + yy); o[11] = 0;
    o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1;
    return o;
  };
  const perspective = (fovy, aspect, n, f) => {
    const t = 1 / Math.tan(fovy / 2);
    return new Float32Array([t/aspect,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]);
  };
  const lookAt = (e, a, up) => {
    let z = [e[0]-a[0], e[1]-a[1], e[2]-a[2]]; let l = Math.hypot(...z); z = z.map(v => v / l);
    let x = [up[1]*z[2]-up[2]*z[1], up[2]*z[0]-up[0]*z[2], up[0]*z[1]-up[1]*z[0]]; l = Math.hypot(...x); x = x.map(v => v / l);
    const y = [z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0]];
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]), -(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]), -(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]), 1]);
  };
  // the inverse transpose of the upper 3x3, for normals under non uniform scale
  const normalMat = (m) => {
    const a00 = m[0], a01 = m[1], a02 = m[2], a10 = m[4], a11 = m[5], a12 = m[6], a20 = m[8], a21 = m[9], a22 = m[10];
    const b01 = a22*a11 - a12*a21, b11 = -a22*a10 + a12*a20, b21 = a21*a10 - a11*a20;
    let det = a00*b01 + a01*b11 + a02*b21; if (!det) return [1,0,0, 0,1,0, 0,0,1]; det = 1 / det;
    return [b01*det, (-a22*a01 + a02*a21)*det, (a12*a01 - a02*a11)*det,
            b11*det, (a22*a00 - a02*a20)*det, (-a12*a00 + a02*a10)*det,
            b21*det, (-a21*a00 + a01*a20)*det, (a11*a00 - a01*a10)*det];
  };

  // ---- shaders: two lights and a rim, in view space; one plain, one skinned and textured ----
  const LIGHT = `
  vec3 lit(vec3 base, vec3 N, vec3 V, float gloss, float keep) {
    vec3 L1 = normalize(vec3(-.45, .80, .55)), L2 = normalize(vec3(.70, .10, .40));
    float d = max(dot(N, L1), 0.) * .95 + max(dot(N, L2), 0.) * .35;
    float s = pow(max(dot(N, normalize(L1 + V)), 0.), 48.) * gloss;
    float rim = pow(1. - max(dot(N, V), 0.), 3.) * .35;
    return base * (keep + (1. - keep) * (.16 + d)) + vec3(s) + vec3(.36, .86, 1.) * rim * .5;
  }`;
  const VS = `#version 300 es
  in vec3 aPos; in vec3 aNor;
  uniform mat4 uProj, uView, uModel; uniform mat3 uNormal;
  out vec3 vN; out vec3 vP;
  void main() {
    vec4 p = uView * uModel * vec4(aPos, 1.);
    vP = p.xyz; vN = uNormal * aNor;
    gl_Position = uProj * p;
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec3 vP;
  uniform vec3 uColor; uniform float uGloss; uniform float uAlpha;
  out vec4 o;
  ${LIGHT}
  void main() {
    vec3 c = lit(uColor, normalize(vN), normalize(-vP), uGloss, 0.);
    o = vec4(pow(c, vec3(1. / 2.2)) * uAlpha, uAlpha);
  }`;
  const VS_SKIN = `#version 300 es
  in vec3 aPos; in vec3 aNor; in vec2 aUV; in uvec4 aJoints; in vec4 aWeights; in vec3 aFlags;
  uniform mat4 uProj, uView, uModel; uniform mat4 uJoints[64];
  out vec3 vN; out vec3 vP; out vec2 vUV; out vec3 vRest; out vec3 vFlags;
  void main() {
    mat4 skin = aWeights.x * uJoints[aJoints.x] + aWeights.y * uJoints[aJoints.y]
              + aWeights.z * uJoints[aJoints.z] + aWeights.w * uJoints[aJoints.w];
    mat4 mv = uView * uModel * skin;
    vec4 p = mv * vec4(aPos, 1.);
    vP = p.xyz; vN = mat3(mv) * aNor; vUV = aUV; vRest = aPos; vFlags = aFlags;
    gl_Position = uProj * p;
  }`;
  const FS_SKIN = `#version 300 es
  precision highp float;
  in vec3 vN; in vec3 vP; in vec2 vUV; in vec3 vRest; in vec3 vFlags;
  uniform sampler2D uTex; uniform float uHasTex; uniform float uDebug;
  out vec4 o;
  ${LIGHT}
  void main() {
    // The scan joined the arms to the body where they hung close: inner arm to
    // the chest, hand to the thigh. When the arm leaves, those triangles pull
    // into threads. Each vertex carries three flags: body, forearm or hand,
    // and arm below the armpit. Where a flag changes across a triangle, the
    // triangle joins two groups. Body joined to a forearm, a hand or an arm
    // below the armpit is never a real seam, so it goes. The shoulder joins
    // body to the top of the arm and stays. Anything else goes only when it
    // has stretched to many times its size at rest: at three times, the
    // sleeve at the shoulder tore where the weights change hands.
    vec3 fw = fwidth(vFlags);
    float sx = (length(dFdx(vP)) + 1e-5) / (length(dFdx(vRest)) + 1e-5);
    float sy = (length(dFdy(vP)) + 1e-5) / (length(dFdy(vRest)) + 1e-5);
    int cut = fw.x > .01 && fw.y > .01 ? 1 : fw.x > .01 && fw.z > .01 ? 2 : max(sx, sy) > 8.0 ? 3 : 0;
    if (uDebug > .5) {   // the lab: show what would go, one colour per rule
      if (cut == 1) { o = vec4(1., 0., 1., 1.); return; }
      if (cut == 2) { o = vec4(1., .6, 0., 1.); return; }
      if (cut == 3) { o = vec4(0., 1., 1., 1.); return; }
    } else if (cut > 0) discard;
    // The scan's texture is a photograph of him: it has its own light baked in.
    // Lit again, with a highlight and a rim, he looked wet. So it is shown as it
    // is, with only a faint darkening on the faces turned away from the camera,
    // to keep the volume readable against the dark room.
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    vec3 base = mix(vec3(.62, .64, .70), texture(uTex, vUV).rgb, uHasTex);
    float facing = .82 + .18 * max(dot(N, normalize(-vP)), 0.);
    o = vec4(pow(base * facing, vec3(1. / 2.2)), 1.);
  }`;
  const program = (vs, fs) => {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ""); u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  const plain = program(VS, FS), skinned = program(VS_SKIN, FS_SKIN);

  // ---- one unit sphere; every part of the sphere figure is this, scaled ----
  const sphere = (() => {
    const M = 28, N = 14, pos = [], idx = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= M; i++) {
      const u = i / M * Math.PI * 2, v = j / N * Math.PI - Math.PI / 2;
      pos.push(Math.cos(u) * Math.cos(v), Math.sin(v), Math.sin(u) * Math.cos(v));
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < M; i++) {
      const a = j * (M + 1) + i, b = a + M + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(plain.p, "aPos"), aNor = gl.getAttribLocation(plain.p, "aNor");
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: idx.length };
  })();

  let view = I4();
  const drawBall = (model, color, gloss = 0.5, alpha = 1) => {
    const mv = mul(view, model);
    gl.uniformMatrix4fv(plain.u.uModel, false, model);
    gl.uniformMatrix3fv(plain.u.uNormal, false, normalMat(mv));
    gl.uniform3fv(plain.u.uColor, color); gl.uniform1f(plain.u.uGloss, gloss); gl.uniform1f(plain.u.uAlpha, alpha);
    gl.drawElements(gl.TRIANGLES, sphere.n, gl.UNSIGNED_SHORT, 0);
  };

  // ---- the sphere figure's skeleton, from the data ----
  const J = SALSA.joints, NJ = J.length;
  const jointOf = {}; J.forEach((n, i) => jointOf[n] = i);
  const parentOf = SALSA.parents.map(p => p === null ? -1 : jointOf[p]);
  const offsets = SALSA.offsets;

  // what hangs from each joint, in the joint's own frame after its turn:
  // balls at the joints, limbs hanging down, lumps for the trunk and head
  const ball = (r) => ({ m: S(r, r, r), c: C_JOINT, g: 0.9 });
  const limb = (half, r) => ({ m: mul(T(0, -half, 0), S(r, half, r)), c: C_BODY, g: 0.45 });
  const lump = (x, y, z, c = C_BODY) => ({ m: S(x, y, z), c, g: 0.35 });
  const at = (x, y, z, sx, sy, sz, c) => ({ m: mul(T(x, y, z), S(sx, sy, sz)), c, g: 0.4 });
  const PARTS = {
    pelvis: [lump(0.095, 0.080, 0.070)],
    waist:  [ball(0.042), lump(0.085, 0.100, 0.065)],
    chest:  [ball(0.046), lump(0.125, 0.150, 0.080)],
    neck:   [ball(0.035)],
    head:   [lump(0.090, 0.105, 0.090)],
    clavicleL: [], clavicleR: [],
    shoulderL: [ball(0.050), limb(0.135, 0.045)], shoulderR: [ball(0.050), limb(0.135, 0.045)],
    elbowL: [ball(0.038), limb(0.135, 0.035)],   elbowR: [ball(0.038), limb(0.135, 0.035)],
    wristL: [ball(0.030), at(0, -0.040, 0, 0.018, 0.042, 0.046, C_HAND), at(0, -0.095, 0, 0.014, 0.030, 0.040, C_HAND)],
    wristR: [ball(0.030), at(0, -0.040, 0, 0.018, 0.042, 0.046, C_HAND), at(0, -0.095, 0, 0.014, 0.030, 0.040, C_HAND)],
    hipL:   [ball(0.050), limb(0.180, 0.055)], hipR: [ball(0.050), limb(0.180, 0.055)],
    kneeL:  [ball(0.045), limb(0.180, 0.042)], kneeR: [ball(0.045), limb(0.180, 0.042)],
    ankleL: [ball(0.035), at(0, -0.018, 0.018, 0.032, 0.020, 0.034, C_HAND), at(0, -0.020, 0.062, 0.028, 0.016, 0.034, C_HAND)],
    ankleR: [ball(0.035), at(0, -0.018, 0.018, 0.032, 0.020, 0.034, C_HAND), at(0, -0.020, 0.062, 0.028, 0.016, 0.034, C_HAND)],
  };

  // ---- the choreography ----
  const steps = SALSA.steps, frames = SALSA.frames, roots = SALSA.rootLocal || SALSA.root;
  const stepClass = (name) => "s-" + name.toLowerCase().replace(/ /g, "-");
  let queue = [];
  const invent = () => queue.push({ s: Math.floor(Math.random() * steps.length), mine: false });
  const addStep = (n) => {
    for (let i = queue.length - 1; i > 0 && queue.length >= AHEAD; i--)
      if (!queue[i].mine) queue.splice(i, 1);     // a made up one gives way
    queue.push({ s: n, mine: true });
  };

  // where inside a step a moment falls: the two captured frames round it and the way between them
  const locate = (n, countsIn) => {
    const st = steps[n];
    let u = countsIn / st.beats; u = u < 0 ? 0 : u > 1 ? 1 : u;
    const f = st.start + u * (st.end - 1 - st.start);
    const i0 = Math.floor(f);
    return [i0, i0 + 1 < st.end ? i0 + 1 : i0, f - i0];
  };
  // the sphere figure's angles at a moment inside a step
  const readStep = (n, countsIn, out) => {
    const [i0, i1, v] = locate(n, countsIn);
    const a = frames[i0], b = frames[i1];
    for (let k = 0; k < a.length; k++) out[k] = a[k] + v * (b[k] - a[k]);
    const ra = roots[i0], rb = roots[i1];
    for (let k = 0; k < 3; k++) out[a.length + k] = METRES * (ra[k] + v * (rb[k] - ra[k]));
  };
  const shortest = (a, b, u) => { let d = b - a; d -= 2 * Math.PI * Math.floor(d / (2 * Math.PI) + 0.5); return a + u * d; };

  let step = 0, stepStart = 0, oldStep = -1, oldStart = 0, resync = false, nextStrong = 0, fade = 1;
  const bufA = new Float64Array(NJ * 3 + 3), bufB = new Float64Array(NJ * 3 + 3);
  const pose = new Float64Array(NJ * 3); const root = [0, 0, 0];

  // pick the step that is dancing, move on when it has used its counts, and
  // say how far into the crossfade from the one before we are
  const advance = (counts) => {
    if (resync) { stepStart = nextStrong; oldStep = -1; }
    while (queue.length < AHEAD) invent();
    for (let g = 0; g < 64 && counts - stepStart >= steps[queue[0].s].beats; g++) {
      oldStep = queue[0].s; oldStart = stepStart; stepStart += steps[queue[0].s].beats;
      queue.shift(); while (queue.length < AHEAD) invent();
    }
    step = queue[0].s;
    fade = (counts - stepStart) / BLEND_COUNTS; fade = fade < 0 ? 0 : fade;
  };
  const readDance = (counts) => {
    readStep(step, counts - stepStart, bufA);
    if (oldStep >= 0 && fade < 1) {
      readStep(oldStep, counts - oldStart, bufB);
      for (let k = 0; k < NJ * 3; k++) bufA[k] = shortest(bufB[k], bufA[k], fade);
      for (let k = NJ * 3; k < NJ * 3 + 3; k++) bufA[k] = bufB[k] + fade * (bufA[k] - bufB[k]);
    }
    for (let k = 0; k < NJ * 3; k++) pose[k] = bufA[k];
    for (let k = 0; k < 3; k++) root[k] = bufA[NJ * 3 + k];
  };

  // ---- his own body: the scan, skinned to its rig ----
  // rig/rig.glb and rig/salsa-rig.js, both optional. ?rig= points at another folder, for the lab.
  const RIG_BASE = new URLSearchParams(location.search).get("rig") || "rig/";
  const DEBUG_CUTS = new URLSearchParams(location.search).has("cuts");   // paint the dropped triangles instead of dropping them
  // The finger curl is off: the light mesh has too few triangles in the hands
  // to bend without creasing, and the scan's own open hands read better. ?fingers turns it on.
  const NO_FINGERS = !new URLSearchParams(location.search).has("fingers");
  let rig = null;   // { vao, n, indexType, tex, joints, NR, parent, bind, drivenAt, frames, roots, inv, world, mats }

  const readGLB = (buf) => {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error("not a glb");
    let off = 12, json = null, bin = null;
    while (off < buf.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true); off += 8;
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, len)));
      else if (type === 0x004E4942) bin = buf.slice(off, off + len);
      off += len;
    }
    const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const accessor = (i) => {
      const a = json.accessors[i], bv = json.bufferViews[a.bufferView], A = COMP[a.componentType], n = SIZE[a.type];
      const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
      if (bv.byteStride && bv.byteStride !== n * A.BYTES_PER_ELEMENT) {   // interleaved: pull it apart
        const out = new A(a.count * n), src = new DataView(bin);
        for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
          const at = start + k * bv.byteStride + c * A.BYTES_PER_ELEMENT;
          out[k * n + c] = A === Float32Array ? src.getFloat32(at, true) : A === Uint16Array ? src.getUint16(at, true) : A === Uint32Array ? src.getUint32(at, true) : src.getUint8(at);
        }
        return { data: out, type: a.componentType, n };
      }
      return { data: new A(bin, start, a.count * n), type: a.componentType, n };
    };
    const image = (i) => { const im = json.images[i], bv = json.bufferViews[im.bufferView]; return new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType }); };
    return { json, accessor, image };
  };

  const smoothNormals = (pos, idx) => {
    const n = new Float32Array(pos.length);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t+1] * 3, c = idx[t+2] * 3;
      const ux = pos[b]-pos[a], uy = pos[b+1]-pos[a+1], uz = pos[b+2]-pos[a+2], vx = pos[c]-pos[a], vy = pos[c+1]-pos[a+1], vz = pos[c+2]-pos[a+2];
      const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
      for (const i of [a, b, c]) { n[i] += nx; n[i+1] += ny; n[i+2] += nz; }
    }
    for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i+1], n[i+2]) || 1; n[i] /= l; n[i+1] /= l; n[i+2] /= l; }
    return n;
  };

  const loadRig = async () => {
    const [glb] = await Promise.all([
      fetch(RIG_BASE + "rig.glb").then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
      new Promise((ok, no) => { const s = document.createElement("script"); s.src = RIG_BASE + "salsa-rig.js"; s.onload = ok; s.onerror = () => no(new Error("no bake")); document.head.appendChild(s); }),
    ]);
    // a top level const in a classic script is not on window; it is reachable by name
    const R = typeof SALSA_RIG !== "undefined" ? SALSA_RIG : window.SALSA_RIG; if (!R) throw new Error("no SALSA_RIG");
    const { json, accessor, image } = readGLB(glb);
    const mesh = json.meshes.find(m => m.primitives.some(p => p.attributes.JOINTS_0)) || json.meshes[0];
    const prim = mesh.primitives.find(p => p.attributes.JOINTS_0) || mesh.primitives[0];
    const A = prim.attributes;
    const pos = accessor(A.POSITION).data, uv = A.TEXCOORD_0 !== undefined ? accessor(A.TEXCOORD_0).data : new Float32Array(pos.length / 3 * 2);
    const idxA = prim.indices !== undefined ? accessor(prim.indices) : null;
    const idx = idxA ? idxA.data : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
    const nor = A.NORMAL !== undefined ? accessor(A.NORMAL).data : smoothNormals(pos, idx);
    const jnt = accessor(A.JOINTS_0), wgt = accessor(A.WEIGHTS_0).data;
    const joints16 = jnt.type === 5123 ? jnt.data : Uint16Array.from(jnt.data);

    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const attrib = (name, data, size, integer) => {
      const loc = gl.getAttribLocation(skinned.p, name); if (loc < 0) return;
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      if (integer) gl.vertexAttribIPointer(loc, size, gl.UNSIGNED_SHORT, 0, 0); else gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attrib("aPos", pos, 3); attrib("aNor", nor, 3); attrib("aUV", uv, 2); attrib("aJoints", joints16, 4, true); attrib("aWeights", wgt, 4);
    // which part of him each vertex mostly belongs to: body, forearm and hand,
    // or arm below the armpit. The clavicle counts as arm, or the sleeve round
    // the shoulder tears. The armpit is twelve centimetres under the shoulder
    // joint, whose bind position is the sum of the chain above it.
    const names = (json.skins[0].joints).map(n => json.nodes[n].name || "");
    const parentNode = new Map(); json.nodes.forEach((nd, i) => (nd.children || []).forEach(c => parentNode.set(c, i)));
    const headY = (i) => { let y = 0; for (let k = i; k !== undefined; k = parentNode.get(k)) y += (json.nodes[k].translation || [0, 0, 0])[1]; return y; };
    const shoulderY = { Left: headY(names.indexOf("LeftArm")), Right: headY(names.indexOf("RightArm")) };
    const flags = new Float32Array(pos.length / 3 * 3);
    for (let v = 0; v < pos.length / 3; v++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) if (wgt[v*4+k] > bw) { bw = wgt[v*4+k]; best = joints16[v*4+k]; }
      const n = names[best] || "";
      const lower = /ForeArm|Hand/.test(n), upper = /^(Left|Right)(Arm(Half)?|Shoulder)$/.test(n);
      const side = n.startsWith("Left") ? "Left" : "Right";
      flags[v*3] = lower || upper ? 0 : 1;
      flags[v*3+1] = lower ? 1 : 0;
      flags[v*3+2] = upper && pos[v*3+1] < shoulderY[side] - 0.12 ? 1 : 0;
    }
    attrib("aFlags", flags, 3);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    const idx32 = idx instanceof Uint32Array ? idx : (idx instanceof Uint16Array ? idx : Uint32Array.from(idx));
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx32, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    // the skin: the bake names the joints in the glb's order, so joint i is node i
    const skin = json.skins[0];
    const NR = R.joints.length;
    const invRaw = accessor(skin.inverseBindMatrices).data;
    const inv = []; for (let j = 0; j < NR; j++) inv.push(invRaw.subarray(j * 16, j * 16 + 16));
    const of = {}; R.joints.forEach((n, i) => of[n] = i);
    const parent = R.parents.map(p => p === null ? -1 : of[p]);
    const bind = R.joints.map(n => R.bind[n] || R.bind[of[n]] || [0, 0, 0]);
    const drivenAt = new Int16Array(NR).fill(-1); R.driven.forEach((n, k) => drivenAt[of[n]] = k);
    // The capture has no fingers, so they move on their own: a slow curl
    // towards the palm, each finger a little behind the one before, the
    // thumb on its own rhythm. The curl turns each phalanx about the axis
    // that bends it towards the palm, which at bind faces the thigh: minus x
    // on his left, plus x on his right. The bind rotations are identity, so
    // that axis is the joint's own.
    const fingers = [];
    for (const side of ["Left", "Right"]) {
      const pn = side === "Left" ? [-1, 0, 0] : [1, 0, 0];
      ["Thumb", "Index", "Middle", "Ring", "Pinky"].forEach((f, fi) => {
        const j1 = of[side + "Hand" + f + "1"], j2 = of[side + "Hand" + f + "2"];
        if (j1 === undefined || j2 === undefined) return;
        const d = bind[j2]; const l = Math.hypot(d[0], d[1], d[2]) || 1; const fd = [d[0] / l, d[1] / l, d[2] / l];
        let ax = [fd[1] * pn[2] - fd[2] * pn[1], fd[2] * pn[0] - fd[0] * pn[2], fd[0] * pn[1] - fd[1] * pn[0]];
        const al = Math.hypot(ax[0], ax[1], ax[2]) || 1; ax = ax.map(v => v / al);
        const phase = fi * 0.7 + (side === "Left" ? 0 : 1.9), thumb = f === "Thumb";
        fingers.push({ j: j1, ax, phase, base: thumb ? 0.10 : 0.18, amp: thumb ? 0.25 : 0.42 });
        fingers.push({ j: j2, ax, phase: phase + 0.4, base: thumb ? 0.08 : 0.14, amp: thumb ? 0.20 : 0.38 });
      });
    }
    const fingerOf = new Array(NR).fill(null); fingers.forEach(f => fingerOf[f.j] = f);

    const out = { vao, n: idx.length, indexType: idx32 instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, tex: null,
      joints: R.joints, NR, parent, bind, drivenAt, fingerOf, frames: R.frames, roots: R.root, inv,
      world: Array.from({ length: NR }, () => new Float32Array(16)), local: new Float32Array(16), mats: new Float32Array(NR * 16),
      qA: new Float32Array(R.driven.length * 4), qB: new Float32Array(R.driven.length * 4), rA: [0, 0, 0], rB: [0, 0, 0], hips: of.Hips ?? 0 };
    rig = out;

    // the texture last: the mesh dances in grey until it is in
    if (json.images && json.images.length) {
      const bmp = await createImageBitmap(image(json.textures?.[0]?.source ?? 0), { colorSpaceConversion: "none" });
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      out.tex = tex;
    }
  };
  loadRig().catch((e) => { rig = null; if (e && e.message !== "404") console.warn("[salsa] no rig:", e.message); });

  // the rig's rotations at a moment inside a step, blended between the two frames round it
  const readStepRig = (n, countsIn, q, r) => {
    const [i0, i1, v] = locate(n, countsIn);
    const a = rig.frames[i0], b = rig.frames[i1];
    for (let k = 0; k < q.length; k += 4) {
      // sign continuous inside a step, so a plain blend and a normalise are enough
      let x = a[k] + v * (b[k] - a[k]), y = a[k+1] + v * (b[k+1] - a[k+1]), z = a[k+2] + v * (b[k+2] - a[k+2]), w = a[k+3] + v * (b[k+3] - a[k+3]);
      const l = Math.hypot(x, y, z, w) || 1; q[k] = x / l; q[k+1] = y / l; q[k+2] = z / l; q[k+3] = w / l;
    }
    const ra = rig.roots[i0], rb = rig.roots[i1];
    for (let k = 0; k < 3; k++) r[k] = ra[k] + v * (rb[k] - ra[k]);
  };
  const readRig = (counts) => {
    const { qA, qB, rA, rB } = rig;
    readStepRig(step, counts - stepStart, qA, rA);
    if (oldStep >= 0 && fade < 1) {
      readStepRig(oldStep, counts - oldStart, qB, rB);
      for (let k = 0; k < qA.length; k += 4) {
        // across steps the signs may disagree: take the short way round
        let d = qB[k]*qA[k] + qB[k+1]*qA[k+1] + qB[k+2]*qA[k+2] + qB[k+3]*qA[k+3], s = d < 0 ? -1 : 1;
        let x = qB[k] + fade * (s*qA[k] - qB[k]), y = qB[k+1] + fade * (s*qA[k+1] - qB[k+1]), z = qB[k+2] + fade * (s*qA[k+2] - qB[k+2]), w = qB[k+3] + fade * (s*qA[k+3] - qB[k+3]);
        const l = Math.hypot(x, y, z, w) || 1; qA[k] = x / l; qA[k+1] = y / l; qA[k+2] = z / l; qA[k+3] = w / l;
      }
      for (let k = 0; k < 3; k++) rA[k] = rB[k] + fade * (rA[k] - rB[k]);
    }
    // the hierarchy: local = T(bind) R(q), world = parent world times local, skin = world times inverse bind
    const ID = [0, 0, 0, 1], t = [0, 0, 0], fq = [0, 0, 0, 1];
    const now = performance.now() / 1000;
    for (let j = 0; j < rig.NR; j++) {
      const d = rig.drivenAt[j]; let q = d < 0 ? ID : rig.qA.subarray(d * 4, d * 4 + 4);
      const fg = d < 0 && !NO_FINGERS ? rig.fingerOf[j] : null;
      if (fg) {
        const a = fg.base + fg.amp * (0.5 + 0.5 * Math.sin(now * 1.6 + fg.phase)), sn = Math.sin(a / 2);
        fq[0] = fg.ax[0] * sn; fq[1] = fg.ax[1] * sn; fq[2] = fg.ax[2] * sn; fq[3] = Math.cos(a / 2); q = fq;
      }
      const b = rig.bind[j];
      if (j === rig.hips) { t[0] = b[0] + rA[0]; t[1] = b[1] + rA[1]; t[2] = b[2] + rA[2]; } else { t[0] = b[0]; t[1] = b[1]; t[2] = b[2]; }
      TRq(t, q, rig.local);
      const p = rig.parent[j];
      if (p < 0) rig.world[j].set(rig.local); else mul(rig.world[p], rig.local, rig.world[j]);
      mul(rig.world[j], rig.inv[j], rig.mats.subarray(j * 16, j * 16 + 16));
    }
  };

  // ---- the two clocks: a tempo, or a song's own counts ----
  const player = $("player"), tempo = $("tempo");
  let song = -1, newSong = false, songAt = 0, songLoops = 0, songTime = 0;
  let sliderCounts = 0, lastClock = null, wasPlaying = false;
  const playing = () => song >= 0 && !player.paused;

  const playSong = (n) => {
    song = n; player.volume = 0.4; player.src = SONGS[n].file; player.currentTime = 0;
    newSong = true; player.play().catch(() => { song = -1; markSongs(); });
    tempo.value = SONGS[n].countsPerMinute; markSongs();
  };
  const stopSong = () => { song = -1; player.pause(); markSongs(); };

  const clock = (now) => {
    let counts, shown;
    if (playing()) {
      const cs = SONGS[song].counts, t = player.currentTime;
      if (newSong) { songAt = songLoops = 0; songTime = 0; resync = true; newSong = false; }
      else if (t < songTime - 1) { songLoops++; songAt = 0; resync = true; }
      songTime = t;
      while (songAt + 1 < cs.length && cs[songAt + 1] <= t) songAt++;
      while (songAt > 0 && cs[songAt] > t) songAt--;
      const c0 = cs[songAt], c1 = songAt + 1 < cs.length ? cs[songAt + 1] : c0 + 60 / SONGS[song].countsPerMinute;
      counts = songLoops * cs.length + songAt + (t - c0) / (c1 - c0);
      shown = (SONGS[song].first - 1 + songAt) % 8 + 1;
      const k = (SONGS[song].first - 1 + songAt) % 4;
      nextStrong = songLoops * cs.length + songAt + (k === 0 ? 0 : 4 - k);
    } else {
      const bpm = parseFloat(tempo.value);
      if (lastClock !== null) sliderCounts += (now - lastClock) * bpm / 60;
      counts = sliderCounts; shown = Math.floor(counts) % 8 + 1;
      nextStrong = Math.ceil(counts / 4) * 4;
    }
    lastClock = now;
    const p = playing();
    if (p !== wasPlaying) { resync = true; wasPlaying = p; }
    return { counts, shown };
  };

  // ---- the panel ----
  const order = steps.map((s, n) => n).sort((a, b) => steps[a].name.localeCompare(steps[b].name));
  $("steps").innerHTML = order.map(n => `<button type="button" class="step ${stepClass(steps[n].name)}" data-step="${n}"><em>+</em>${steps[n].name}</button>`).join("");
  $("steps").addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (b) addStep(parseInt(b.dataset.step, 10)); });
  $("counts").innerHTML = [1,2,3,4,5,6,7,8].map(n => `<i class="${n === 1 || n === 5 ? "strong" : "weak"}">${n}</i>`).join("");
  const markSongs = () => { const kids = $("songs").children; for (let k = 0; k < kids.length; k++) kids[k].classList.toggle("on", k === song + 1); $("tempo-row").classList.toggle("hidden", playing()); };
  if (SONGS.length) {
    $("songs").innerHTML = `<button type="button" class="song quiet" data-song="-1"><em>&#9723;</em>No music</button>`
      + SONGS.map((s, n) => `<button type="button" class="song" data-song="${n}"><em>&#9654;</em>${s.name}</button>`).join("");
    $("songs").addEventListener("click", (e) => { const b = e.target.closest("[data-song]"); if (!b) return; const n = parseInt(b.dataset.song, 10); n < 0 ? stopSong() : playSong(n); });
    player.addEventListener("pause", markSongs); player.addEventListener("play", markSongs);
    markSongs();
  } else { $("songs-block").hidden = true; }

  let shownQueue = "", litCount = 0, litBpm = -1;
  const say = (counts, shown) => {
    const key = queue.map(q => q.s + (q.mine ? "m" : "")).join(",");
    if (key !== shownQueue) {
      $("queue").innerHTML = queue.map((q, i) => `<li class="${i ? "wait" : "now"}${q.mine ? " mine" : ""} ${stepClass(steps[q.s].name)}"><span>${steps[q.s].name}</span></li>`).join("");
      shownQueue = key;
    }
    $("bar").style.width = (100 * (counts - stepStart) / steps[step].beats) + "%";
    $("bar").className = stepClass(steps[step].name);
    if (shown !== litCount) { const c = $("counts").children; for (let n = 0; n < 8; n++) c[n].classList.toggle("lit", n === shown - 1); litCount = shown; }
    let bpm;
    if (playing()) { const cs = SONGS[song].counts, lo = Math.max(1, songAt - 4), hi = Math.min(cs.length - 1, songAt + 4), gaps = [];
      for (let i = lo; i <= hi; i++) gaps.push(cs[i] - cs[i - 1]); gaps.sort((p, q) => p - q); bpm = Math.round(60 / gaps[gaps.length >> 1]); }
    else bpm = Math.round(parseFloat(tempo.value));
    if (bpm !== litBpm) { $("bpm").textContent = bpm; litBpm = bpm; }
  };

  // ---- the frame ----
  const noise = (x) => Math.sin(x * 1.7) * 0.5 + Math.sin(x * 2.9 + 1.3) * 0.3 + Math.sin(x * 5.1 + 0.7) * 0.2;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const local = new Float32Array(16), world = new Array(NJ);
  const frame = (ms) => {
    const now = ms / 1000;
    const { counts, shown } = clock(now);
    advance(counts);
    if (rig) readRig(counts); else { readDance(counts); for (let k = 0; k < NJ * 3; k++) pose[k] += WANDER * noise(0.5 * now + k * 0.37); }
    resync = false;

    resize();
    canvas.dataset.figure = rig ? (rig.tex ? "rig" : "rig-untextured") : "spheres";   // for the lab's eyes
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const aspect = canvas.width / canvas.height;
    const sway = Math.sin(now * 0.12) * 0.22;                 // the camera drifts a little round the figure
    // the scan stands on the floor in metres; the sphere figure hangs from its pelvis at the origin
    const look = rig ? [0, 0.90, 0] : [0, -0.06, 0], dist = rig ? 4.6 : 3.9;
    view = lookAt([Math.sin(sway) * dist, look[1] + 0.16, Math.cos(sway) * dist], look, [0, 1, 0]);
    const proj = perspective(0.46, aspect, 0.1, 20);

    gl.useProgram(plain.p); gl.bindVertexArray(sphere.vao);
    gl.uniformMatrix4fv(plain.u.uProj, false, proj); gl.uniformMatrix4fv(plain.u.uView, false, view);

    if (rig) {
      gl.useProgram(skinned.p); gl.bindVertexArray(rig.vao);
      gl.uniformMatrix4fv(skinned.u.uProj, false, proj); gl.uniformMatrix4fv(skinned.u.uView, false, view);
      gl.uniformMatrix4fv(skinned.u.uModel, false, I4());
      gl.uniformMatrix4fv(skinned.u.uJoints, false, rig.mats);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rig.tex); gl.uniform1i(skinned.u.uTex, 0); gl.uniform1f(skinned.u.uHasTex, rig.tex ? 1 : 0);
      gl.uniform1f(skinned.u.uDebug, DEBUG_CUTS ? 1 : 0);
      gl.drawElements(gl.TRIANGLES, rig.n, rig.indexType, 0);
    } else {
      // the sphere figure, from the pelvis out
      for (let j = 0; j < NJ; j++) {
        const o = offsets[j], ax = pose[j*3], ay = pose[j*3+1], az = pose[j*3+2];
        let m = mul(T(o[0], o[1], o[2]), RY(ay)); m = mul(m, RX(ax)); m = mul(m, RZ(az));
        const base = parentOf[j] < 0 ? T(root[0], root[1], root[2]) : world[parentOf[j]];
        world[j] = mul(base, m);
        for (const part of PARTS[J[j]] || []) drawBall(mul(world[j], part.m, local), part.c, part.g);
      }
    }
    say(counts, shown);
  };

  // runs only while it can be seen: a page is not for burning a battery under the fold.
  // Two conditions, kept apart: on screen, and the tab in front. Folded into one
  // flag they latched, and the figure froze for good after the first tab switch.
  // On waking with a song on, the song has moved and the next step starts on a
  // strong count; the slider clock simply did not advance, so it carries on.
  // It starts as on screen and lets the observer say otherwise: if a browser
  // never reported the intersection, the worst case is a demo that runs too
  // much, not one that never moves.
  let raf = 0, onScreen = true;
  const visible = () => onScreen && !document.hidden;
  const loop = (ms) => { frame(ms); raf = visible() ? requestAnimationFrame(loop) : 0; };
  const wake = () => { if (visible() && !raf) { lastClock = null; resync = playing(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; canvas.dataset.onscreen = onScreen; wake(); }, { threshold: 0.05 }).observe(canvas);
  document.addEventListener("visibilitychange", wake);
  frame(0);
})();
