// The ASUS booth at Adobe MAX as a gaussian splat, with the two colleagues who
// asked to be scanned standing in it. Drag turns the view, the wheel comes
// closer, and each person can be dragged across the floor.
// PlayCanvas is vendored in ../js/vendor, so nothing is fetched from anyone else.
// The three files are the stage's own frame turned to y up: metres, the floor
// at y = 0 (effects/web_ply.py in the splatlab repo).
(() => {
  const stage = document.getElementById("booth-stage");
  const canvas = document.getElementById("booth-canvas");
  const note = document.getElementById("booth-note");
  const hint = document.getElementById("booth-hint");
  const tag = document.getElementById("booth-tag");
  const ring = document.getElementById("booth-ring");
  if (!stage || !canvas || typeof pc === "undefined") return;

  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { alpha: false, antialias: false },
  });
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const FOV = 60;
  const camera = new pc.Entity("camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0.03, 0.03, 0.04, 1),
    fov: FOV, nearClip: 0.1, farClip: 200,
  });
  app.root.addChild(camera);
  app.start();

  // Where the booth's own page starts: in front of the ProArt counter, a little above.
  const pivot = new pc.Vec3(-0.585, 1.07, -0.68);
  let yaw = -165.6, pitch = 14.7, dist = 6.4;
  const place = () => {
    const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
    camera.setPosition(pivot.x + dist * Math.cos(p) * Math.sin(y), pivot.y + dist * Math.sin(p),
                       pivot.z + dist * Math.cos(p) * Math.cos(y));
    camera.lookAt(pivot);
  };
  const resize = () => { app.resizeCanvas(stage.clientWidth, stage.clientHeight); };
  new ResizeObserver(resize).observe(stage);
  resize();
  place();

  const load = (url, onProgress) => new Promise((resolve) => {
    const a = new pc.Asset(url, "gsplat", { url });
    if (onProgress) a.on("progress", onProgress);
    a.once("load", () => resolve(a));
    a.once("error", (err) => { console.error("[booth]", url, err); resolve(null); });
    app.assets.add(a);
    app.assets.load(a);
  });
  const add = (asset, name, x, z) => {
    const e = new pc.Entity(name);
    e.addComponent("gsplat", { asset });
    e.setPosition(x, 0, z);
    app.root.addChild(e);
    return e;
  };

  // The people, where they stood when the picture for this page was taken.
  const people = [];
  const say = (t) => { if (note) note.textContent = t; };
  const HINT = "Scroll to come closer. Kevin and Alice can be dragged across the floor.";
  let got = [0, 0, 0];
  const SIZES = [30.0, 8.9, 6.2];
  const progress = (i) => (received, total) => {
    got[i] = total ? received / total : 0;
    const done = got.reduce((s, g, k) => s + g * SIZES[k], 0) / SIZES.reduce((s, v) => s + v, 0);
    say("Loading the booth: " + Math.round(done * 100) + "%");
  };
  say("Loading the booth: 0%");
  Promise.all([
    load("splats/booth.ply", progress(0)),
    load("splats/kevin.ply", progress(1)),
    load("splats/alice.ply", progress(2)),
  ]).then(([booth, kevin, alice]) => {
    if (!booth) { say("The booth could not be loaded."); return; }
    add(booth, "booth", 0, 0);
    if (kevin) people.push({ name: "Kevin", e: add(kevin, "kevin", -0.305, -2.989), tall: 1.86 });
    if (alice) people.push({ name: "Alice", e: add(alice, "alice", -1.124, -2.779), tall: 1.69 });
    stage.classList.add("is-ready");
    say(HINT);
  });

  // The floor under the pointer, or null when the pointer is over the sky.
  const floorAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const sx = cx - r.left, sy = cy - r.top;      // the camera's screen is the canvas in CSS pixels
    const a = camera.camera.screenToWorld(sx, sy, 0.1), b = camera.camera.screenToWorld(sx, sy, 100);
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-6) return null;
    const t = -a.y / dy;
    if (t <= 0 || t > 1) return null;
    return new pc.Vec3(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
  };
  // The person under the pointer: inside the box their body makes on the screen.
  const personAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const kx = 1, ky = 1;
    let best = null, bestDepth = 1e9;
    for (const p of people) {
      const at = p.e.getPosition();
      const feet = camera.camera.worldToScreen(new pc.Vec3(at.x, 0, at.z));
      const head = camera.camera.worldToScreen(new pc.Vec3(at.x, p.tall, at.z));
      if (feet.z <= 0 || head.z <= 0) continue;
      const fx = r.left + feet.x * kx, fy = r.top + feet.y * ky, hx = r.left + head.x * kx, hy = r.top + head.y * ky;
      const half = Math.abs(fy - hy) * 0.2;
      if (cy >= Math.min(hy, fy) && cy <= Math.max(hy, fy) && Math.abs(cx - (fx + hx) / 2) <= half && feet.z < bestDepth) {
        best = p; bestDepth = feet.z;
      }
    }
    return best;
  };

  // Who can be moved is shown where they stand: a ring on the floor round their feet and their
  // name over their head, while the pointer is on them and while they are being carried.
  let marked = null;
  const mark = (p) => {
    marked = p;
    if (!tag || !ring) return;
    if (!p) { tag.style.opacity = "0"; ring.style.opacity = "0"; return; }
    const at = p.e.getPosition();
    const feet = camera.camera.worldToScreen(new pc.Vec3(at.x, 0, at.z));
    const head = camera.camera.worldToScreen(new pc.Vec3(at.x, p.tall + 0.08, at.z));
    const side = camera.camera.worldToScreen(new pc.Vec3(at.x + camera.right.x * 0.42, 0, at.z + camera.right.z * 0.42));
    if (feet.z <= 0) { tag.style.opacity = "0"; ring.style.opacity = "0"; return; }
    const w = 2 * Math.hypot(side.x - feet.x, side.y - feet.y);
    const h = Math.max(6, w * Math.sin(pitch * Math.PI / 180));
    ring.style.width = w + "px"; ring.style.height = h + "px";
    ring.style.left = (feet.x - w / 2) + "px"; ring.style.top = (feet.y - h / 2) + "px";
    ring.style.opacity = "1";
    tag.textContent = p.name;
    tag.style.left = head.x + "px"; tag.style.top = head.y + "px";
    tag.style.opacity = "1";
  };
  app.on("update", () => { if (marked) mark(marked); });

  let mode = null, lastX = 0, lastY = 0, held = null, grab = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (hint) hint.classList.add("is-gone");
    lastX = e.clientX; lastY = e.clientY;
    held = personAt(e.clientX, e.clientY);
    if (held) {
      const f = floorAt(e.clientX, e.clientY), at = held.e.getPosition();
      grab = f ? new pc.Vec3(at.x - f.x, 0, at.z - f.z) : new pc.Vec3();
      mode = "person";
      mark(held);
      canvas.style.cursor = "grabbing";
    } else {
      mode = "look";
    }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (mode === "person") {
      const f = floorAt(e.clientX, e.clientY);
      if (f) {
        // Kept within reach of the booth, so nobody is lost across the hall.
        const x = Math.max(-9, Math.min(9, f.x + grab.x)), z = Math.max(-9, Math.min(9, f.z + grab.z));
        held.e.setPosition(x, 0, z);
      }
    } else if (mode === "look") {
      yaw -= (e.clientX - lastX) * 0.3;
      pitch = Math.max(2, Math.min(75, pitch + (e.clientY - lastY) * 0.3));
      place();
    } else {
      const over = personAt(e.clientX, e.clientY);
      canvas.style.cursor = over ? "grab" : "default";
      if (over !== marked) mark(over);
    }
    lastX = e.clientX; lastY = e.clientY;
  });
  const release = (e) => {
    mode = null; held = null;
    const over = e && e.clientX !== undefined ? personAt(e.clientX, e.clientY) : null;
    canvas.style.cursor = over ? "grab" : "default";
    mark(over);
  };
  canvas.addEventListener("pointerleave", () => { if (!mode) mark(null); });
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    dist = Math.max(1.5, Math.min(12, dist * Math.exp(e.deltaY * 0.001)));
    place();
  }, { passive: false });
})();
