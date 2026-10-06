// The gaussian splat under the about card.
// PlayCanvas is vendored in js/vendor, so nothing is fetched from anyone else.
// pc.Application already registers the gsplat system and handler; the engine is
// started before the asset arrives so the component can build its instance.
(() => {
  const stage = document.getElementById("splat-stage");
  const canvas = document.getElementById("splat-canvas");
  if (!stage || !canvas || typeof pc === "undefined") return;

  const say = (msg) => { stage.dataset.status = msg; };
  say("starting");

  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { alpha: true, antialias: false },
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
  });
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  // Without this the canvas draws one device pixel per CSS pixel and the
  // browser upscales it, which reads as a soft, low resolution capture.
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => app.resizeCanvas(stage.clientWidth, stage.clientHeight);
  new ResizeObserver(resize).observe(stage);
  resize();

  const camera = new pc.Entity("camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0, 0, 0, 0),
    fov: 32,
    toneMapping: pc.TONEMAP_ACES,
  });
  app.root.addChild(camera);

  app.start();

  // Orbit. Filled in once the capture's own bounds are known.
  let yaw = 0, pitch = -5, dist = 3, pivot = new pc.Vec3(0, 1, 0);
  const place = () => {
    const q = new pc.Quat().setFromEulerAngles(pitch, yaw, 0);
    const off = q.transformVector(new pc.Vec3(0, 0, dist));
    camera.setPosition(pivot.x + off.x, pivot.y + off.y, pivot.z + off.z);
    camera.lookAt(pivot);
  };
  place();

  // Spin on its own so it reads as a 3D capture rather than a photograph.
  // A drag takes over; the spin picks up again a moment after letting go.
  let spinning = true, resumeAt = 0;
  const SECONDS_PER_TURN = 11;
  const SPIN_DEG_PER_SEC = 360 / SECONDS_PER_TURN;
  app.on("update", (dt) => {
    if (!spinning) {
      if (resumeAt && performance.now() > resumeAt) spinning = true;
      return;
    }
    yaw -= SPIN_DEG_PER_SEC * dt;
    place();
  });

  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; spinning = false; resumeAt = 0;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.35;
    pitch = Math.max(-60, Math.min(60, pitch - (e.clientY - lastY) * 0.35));
    lastX = e.clientX; lastY = e.clientY;
    place();
  });
  const release = () => { dragging = false; resumeAt = performance.now() + 2500; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // Two poses of the same person. The idle one is what the viewer meets. The
  // meditating one takes over later, in the middle of the burst, so the change
  // of pose happens behind the light and is never seen as a cut.
  const PIECES = [
    "assets/eros-idle.ply",
    "assets/eros-meditating.ply",
  ];

  let current = null;          // the entity on screen
  let shell = null;            // the aura copy standing behind it
  let pending = null;          // the next pose, loaded and waiting for its cue
  let index = -1;
  let subjectHeight = 1;       // how tall the captured figure is, in world units
  const watchers = [];         // told whenever a pose takes over
  const ready = [];            // told once the first pose is on screen

  const frameOn = (resource) => {
    // The capture's own bounds run wide: floating scan noise inflates them, so
    // framing straight off the box pushes the camera too far back. Treat the
    // subject as a standing figure and frame on that instead.
    const b = resource.aabb;
    const height = b.halfExtents.y * 2;
    subjectHeight = height;
    pivot = new pc.Vec3(b.center.x, b.center.y + height * 0.03, b.center.z);
    dist = (height * 0.5) / Math.tan((32 * Math.PI) / 360) * 1.15;
    place();
  };

  const loadPiece = (url, onProgress) => new Promise((resolve) => {
    const a = new pc.Asset(url, "gsplat", { url });
    if (onProgress) a.on("progress", onProgress);
    a.once("load", () => resolve(a));
    a.once("error", (err) => { console.error("[splat]", url, err); resolve(null); });
    app.assets.add(a);
    app.assets.load(a);
  });

  // The aura that traces the capture is a second copy of it, drawn first so it
  // sits behind, with every splat pushed out from the middle and forced to one
  // colour. That is the only way to get a contour of the real silhouette:
  // this engine draws splats through one shared renderer that sits outside the
  // normal material and post processing path, so the figure cannot be read
  // back after it is drawn and cannot be tinted from outside. Turning that
  // shared renderer off for this one copy gives it a material of its own.
  const SHELL_CHUNK = `
    uniform vec3  uHeart;
    uniform float uPush;
    uniform float uFade;
    uniform float uWind;
    uniform vec3  uTint;

    float sh(vec3 p) { return fract(sin(dot(p, vec3(12.99, 78.23, 37.71))) * 43758.5453); }
    float sn(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = mix(mix(sh(i), sh(i + vec3(1,0,0)), f.x), mix(sh(i + vec3(0,1,0)), sh(i + vec3(1,1,0)), f.x), f.y);
      float b = mix(mix(sh(i + vec3(0,0,1)), sh(i + vec3(1,0,1)), f.x), mix(sh(i + vec3(0,1,1)), sh(i + vec3(1,1,1)), f.x), f.y);
      return mix(a, b, f.z);
    }

    // How far out this one splat sits and how bright it is. Varying both with
    // noise is what frays the contour; pushing every splat by the same amount
    // gives an even line, and an even line reads as a sticker cut round the
    // figure rather than as light coming off it.
    float frill(vec3 c) {
      vec3 q = c * 9.0;
      return sn(q + vec3(0.0, -uWind * 1.6, uWind * 0.5)) * 0.68
           + sn(q * 2.6 + vec3(uWind * 1.1, -uWind * 2.4, 0.0)) * 0.32;
    }

    // How far out this splat is sent decides everything else about it. The
    // ones that stay close make a near solid white rim sitting on the edge of
    // the body, small and crisp. The ones sent furthest are large, faint and
    // barely there, so what they add is a glow with the body still showing
    // through it. Sending the far ones out at full strength, which is what
    // this did before, gave one even cloud with no rim in it at all.
    // Vapour is many small faint things, not a few large ones. Sending only
    // the tail outward made blobs, because one big gaussian always reads as a
    // patch however little weight it carries. Sending everything outward at
    // full size made a solid wall, because what is nearly invisible alone is
    // opaque forty deep. So all of them travel, none of them grow much, and
    // what is out in the air carries about a two hundredth of the skin.
    void modifySplatCenter(inout vec3 center) {
      float d = frill(center);
      // Lifted as well as pushed out, so the fringe rises off him like heat.
      vec3 dir = normalize(center - uHeart) + vec3(0.0, 0.55, 0.0);
      center += normalize(dir) * uPush * (0.07 + 2.40 * d * d);
    }
    void modifySplatRotationScale(vec3 oc, vec3 mc, inout vec4 rotation, inout vec3 scale) {
      float d = frill(oc);
      scale *= 1.2 + 2.6 * d;
    }
    void modifySplatColor(vec3 center, inout vec4 color) {
      float d = frill(center);
      float near = pow(1.0 - d, 3.4);          // 1 on the skin, 0 way out
      // Two hundred and twenty eight thousand splats, hundreds of them
      // stacked on any one pixel, so what looks like nothing on its own is
      // still a wall when it is summed. The air gets under a thousandth.
      float a = uFade * (0.0008 + 1.05 * near);
      vec3 tint = mix(uTint * 0.86, vec3(1.0), near);
      color = vec4(tint, color.a * a);
    }
`;

  let shellMat = null;

  const addShell = (asset) => {
    const e = new pc.Entity("aura-shell");
    e.addComponent("gsplat", { asset, unified: false });
    app.root.addChild(e);
    const mat = e.gsplat.material;
    if (!mat) return e;
    if (mat.shaderChunks && mat.shaderChunks.glsl && mat.shaderChunks.glsl.set) {
      mat.shaderChunks.glsl.set("gsplatModifyVS", SHELL_CHUNK);
    } else {
      mat.chunks = mat.chunks || {};
      mat.chunks.gsplatModifyVS = SHELL_CHUNK;
    }
    mat.setParameter("uHeart", [pivot.x, pivot.y, pivot.z]);
    mat.setParameter("uPush", 0);
    mat.setParameter("uWind", 0);
    mat.setParameter("uFade", 0);
    mat.setParameter("uTint", [.84, .94, 1.0]);
    mat.update();
    shellMat = mat;
    return e;
  };

  const show = (asset) => {
    if (current) { current.destroy(); current = null; }
    if (shell) { shell.destroy(); shell = null; shellMat = null; }
    shell = addShell(asset);
    const e = new pc.Entity();
    e.addComponent("gsplat", { asset });
    app.root.addChild(e);
    current = e;
    frameOn(asset.resource);
    watchers.forEach((fn) => fn(index));
  };

  // Anything else that draws in this scene picks it up here, so it shares the
  // camera with the capture. js/aura.js is the one that does. The capture
  // itself stays this file's business.
  window.dispatchEvent(new CustomEvent("splat-stage", {
    detail: {
      app,
      camera,
      el: stage,
      pivot: () => pivot,
      height: () => subjectHeight,
      onPiece: (fn) => watchers.push(fn),
      onReady: (fn) => ready.push(fn),
      // How far the aura stands off the silhouette, how strong it is, and what
      // colour it runs. js/aura.js drives all three.
      aura: (push, fade, tint) => {
        if (!shellMat) return;
        shellMat.setParameter("uHeart", [pivot.x, pivot.y, pivot.z]);
        shellMat.setParameter("uPush", push * subjectHeight);
        shellMat.setParameter("uFade", fade);
        shellMat.setParameter("uWind", performance.now() / 1000);
        if (tint) shellMat.setParameter("uTint", tint);
      },
      // Called from inside the flash. Nothing happens if the second pose has
      // not finished downloading, which keeps a slow line from showing a cut.
      swap: () => {
        if (!pending) return false;
        index = 1;
        show(pending);
        pending = null;
        // Face front again. The pose that comes out of the light is the one
        // the piece settles on, so it should be met head on and start its
        // turn from there rather than from wherever the first one left off.
        yaw = 0;
        pitch = -5;
        spinning = true;
        resumeAt = 0;
        place();
        return true;
      },
    },
  }));

  (async () => {
    if (app.scene.gsplat) app.scene.gsplat.alphaClip = 0.4;

    // The first pose reports its own bytes as they arrive. The backdrop reads
    // this off the dataset, so its entrance is timed by the real download.
    const first = await loadPiece(PIECES[0], (loaded, total) => {
      if (total > 0) stage.dataset.load = String(Math.min(1, loaded / total));
    });
    if (!first) { say("failed"); return; }
    index = 0;
    show(first);
    say("ready");
    stage.dataset.load = "1";
    stage.dataset.readyAt = String(performance.now());
    stage.classList.add("is-ready");
    ready.forEach((fn) => fn());

    // The second pose is fetched straight away and then waits for its cue.
    const second = await loadPiece(PIECES[1]);
    if (second) pending = second;
  })();
})();
