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
    const step = SPIN_DEG_PER_SEC * dt;
    yaw -= step;
    turned += step;
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

  // The pieces, shown one after another. Each gets one full turn, then the
  // next takes over. The next one is fetched while the current one is spinning,
  // so the swap has nothing to wait for.
  const PIECES = [
    "assets/eros-splat.ply",
    "assets/eros-splat-2.ply",
  ];

  let current = null;          // the entity on screen
  let turned = 0;              // degrees travelled on this piece
  let index = -1;

  const frameOn = (resource) => {
    // The capture's own bounds run wide: floating scan noise inflates them, so
    // framing straight off the box pushes the camera too far back. Treat the
    // subject as a standing figure and frame on that instead.
    const b = resource.aabb;
    const height = b.halfExtents.y * 2;
    pivot = new pc.Vec3(b.center.x, b.center.y + height * 0.03, b.center.z);
    dist = (height * 0.5) / Math.tan((32 * Math.PI) / 360) * 1.15;
    place();
  };

  const loadPiece = (url) => new Promise((resolve) => {
    const a = new pc.Asset(url, "gsplat", { url });
    a.once("load", () => resolve(a));
    a.once("error", (err) => { console.error("[splat]", url, err); resolve(null); });
    app.assets.add(a);
    app.assets.load(a);
  });

  const show = (asset) => {
    if (current) { current.destroy(); current = null; }
    const e = new pc.Entity();
    e.addComponent("gsplat", { asset });
    app.root.addChild(e);
    current = e;
    frameOn(asset.resource);
    turned = 0;
  };

  (async () => {
    if (app.scene.gsplat) app.scene.gsplat.alphaClip = 0.4;

    let next = await loadPiece(PIECES[0]);
    if (!next) { say("failed"); return; }
    index = 0;
    show(next);
    say("ready");
    stage.classList.add("is-ready");

    // Keep one piece ahead of the viewer at all times.
    while (true) {
      const upcoming = PIECES[(index + 1) % PIECES.length];
      const loaded = await loadPiece(upcoming);
      await new Promise((r) => {
        const tick = () => { if (turned >= 360) { app.off("update", tick); r(); } };
        app.on("update", tick);
      });
      if (loaded) { index = (index + 1) % PIECES.length; show(loaded); }
      else { turned = 0; }
    }
  })();
})();
