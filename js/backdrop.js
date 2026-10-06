// The animated backdrop behind the splat.
// Same shape as the Computer Graphics assignments: two triangles covering the
// canvas, everything else in the fragment shader. Edit js/backdrop.frag only.
(async () => {
  const stage = document.getElementById("splat-stage");
  const canvas = document.getElementById("backdrop-canvas");
  if (!stage || !canvas) return;

  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: false,
  });
  if (!gl) return;

  const VERT = `#version 300 es
in  vec3 aPos;
out vec3 vPos;
void main() {
   gl_Position = vec4(aPos, 1.);
   vPos = aPos;
}`;

  let FRAG;
  try {
    FRAG = await (await fetch("js/backdrop.frag")).text();
  } catch (e) {
    console.error("[backdrop] could not read js/backdrop.frag", e);
    return;
  }

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src.trim());
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("[backdrop] shader did not compile:\n" + gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[backdrop] link failed:\n" + gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // Two triangles covering the canvas.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0,  1, -1, 0,  -1, 1, 0,
     1, -1, 0,  1,  1, 0,  -1, 1, 0,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "uTime");
  const uSize = gl.getUniformLocation(prog, "uSize");
  // The sequence, written onto the stage by splat-stage.js and js/aura.js, one
  // named signal per beat. A shader that does not declare one gets a null
  // location here and nothing is sent for it, so they can be added and dropped
  // freely on either side.
  const SIGNALS = ["uLoad", "uCharge", "uStar", "uWarm", "uCool", "uField", "uGlow"];
  const signal = SIGNALS
    .map((name) => ({ name, key: name.slice(1).toLowerCase(), at: gl.getUniformLocation(prog, name) }))
    .filter((u) => u.at);
  const uSince = gl.getUniformLocation(prog, "uSince");

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(stage.clientWidth * dpr));
    const h = Math.max(1, Math.round(stage.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    if (uSize) gl.uniform2f(uSize, w, h);
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // The backdrop sits over the card's own background, so it clears to nothing
  // and blends rather than painting a solid rectangle.
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const start = performance.now();
  const frame = () => {
    resize();
    if (uTime) gl.uniform1f(uTime, (performance.now() - start) / 1000);
    for (const u of signal) gl.uniform1f(u.at, parseFloat(stage.dataset[u.key] || "0"));
    if (uSince) {
      const at = parseFloat(stage.dataset.readyAt || "0");
      gl.uniform1f(uSince, at ? (performance.now() - at) / 1000 : 0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
