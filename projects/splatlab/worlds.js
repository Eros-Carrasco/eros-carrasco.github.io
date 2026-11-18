// Two gaussian splat worlds on the SplatLab page, one at a time in one viewer: the ASUS booth at
// Adobe MAX 2026 and the breakroom. Drag turns the view, the wheel (or two fingers) comes closer
// and goes back, and the buttons above the stage change the world. Only the world that is shown
// is fetched: the second file comes when it is chosen, and stays once it is here.
// PlayCanvas is vendored in ../../js/vendor, so nothing is fetched from anyone else.
// The files are PlayCanvas compressed PLY, in metres (effects/web_ply.py in the splatlab repo).
(() => {
  const stage = document.getElementById("worlds-stage");
  const canvas = document.getElementById("worlds-canvas");
  const hint = document.getElementById("worlds-hint");
  const picks = Array.from(document.querySelectorAll(".worlds-pick"));
  if (!stage || !canvas) return;

  // Each world declares its own frame and view; nothing is guessed from the file.
  //   turn    the turn that brings the file to this page's frame (y up, the floor at y = 0), as
  //           angles about x, y and z in degrees
  //   pivot   what the view turns about; yaw, pitch and dist put the eye round it
  //   zoom    the nearest and farthest the eye may stand, in metres; tilt the lowest and highest pitch
  //   room    for a place seen from inside: its outline on the floor (x, z), how far off its walls
  //           the eye keeps, and the height the eye stays under
  const WORLDS = {
    // Already y up with its floor at 0. The view is the one the booth has on its own page.
    booth: {
      file: "splats/booth.ply",
      turn: [0, 0, 0],
      pivot: [-0.585, 1.07, -0.68], yaw: -165.6, pitch: 14.7, dist: 6.4,
      zoom: [1.5, 12], tilt: [2, 75],
    },
    // The capture's up is -y and its floor is at y = 1.47 (its manifest, scenes/breakroom.json in
    // the splatlab repo). The file was moved so the floor is at 0 and the middle of the manifest's
    // box stands over the origin, and is still y down: the half turn about x here puts it upright.
    // The pivot's place on the floor, the side the eye starts on and the outline are the ones the
    // booth program has for this room (booth/breakroom-full.toml: its view and its clear_zone),
    // carried from that program's frame (x, y, z up) to this one (x, z up, -y).
    // Here the eye stays in the clear air of the room, measured on the file itself: over the tables
    // and chairs (the pivot is 1.2 m up) and under the lamps and panels that hang from 2.5 m (roof).
    // The outline's window side is brought in 1.6 m, past the tall pieces that stand along it.
    breakroom: {
      file: "splats/breakroom.ply",
      turn: [180, 0, 0],
      pivot: [-2.5, 1.2, -1.5], yaw: 90, pitch: 12, dist: 5.5,
      zoom: [1, 5.5], tilt: [2, 75],
      room: {
        outline: [[-1.143, -9.177], [6.5, -5.4], [3.4, -3.9], [0.9, 3.1], [0.6, 5.6], [-2.188, 4.59],
                  [-6.247, 2.549]],
        margin: 0.4,
        roof: 2.25,
      },
    },
  };
  for (const key in WORLDS) {
    const w = WORLDS[key];
    const pick = picks.find((b) => b.dataset.world === key);
    w.name = pick ? pick.textContent.trim() : key;
    w.view = { yaw: w.yaw, pitch: w.pitch, dist: w.dist };
    w.part = 0;               // how much of its file is here, 0 to 1
    w.coming = null;          // the fetch, once asked for
    w.entity = null;          // the splat, once it can be drawn
    w.failed = false;
  }
  const RAD = Math.PI / 180;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // How far the eye stands from the pivot. In the open it is the distance asked for. Inside a room
  // it is no farther than the wall behind the eye allows and no higher than under the ceiling, so
  // turning the view never carries the eye out through a wall: the walls and the ceiling of a
  // splat are as solid from behind as from in front, and would hide the room.
  const wallAt = (w, yaw) => {
    const dx = Math.sin(yaw * RAD), dz = Math.cos(yaw * RAD);    // the way from the pivot to the eye, on the floor
    const o = w.room.outline;
    let near = Infinity;
    for (let i = 0; i < o.length; i++) {
      const a = o[i], b = o[(i + 1) % o.length];
      const ex = b[0] - a[0], ez = b[1] - a[1];
      const det = ex * dz - ez * dx;
      if (Math.abs(det) < 1e-9) continue;
      const ax = a[0] - w.pivot[0], az = a[1] - w.pivot[2];
      const t = (ex * az - ez * ax) / det;                       // metres along the way to the eye
      const s = (dx * az - dz * ax) / det;                       // 0 to 1 along this stretch of wall
      if (t > 0 && s >= 0 && s <= 1 && t < near) near = t;
    }
    return near;
  };
  const eyeDist = (w, yaw, pitch, dist) => {
    if (!w.room) return dist;
    const p = pitch * RAD;
    const flat = Math.max(0.2, wallAt(w, yaw) - w.room.margin);
    return Math.min(dist, flat / Math.cos(p), Math.max(0.2, (w.room.roof - w.pivot[1]) / Math.sin(p)));
  };

  // A file fetched whole, telling how far it is as it comes.
  const fetchAll = async (url, onProgress) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ": " + res.status);
    const total = +res.headers.get("Content-Length") || 0;
    if (!res.body || !total) return res.arrayBuffer();
    const reader = res.body.getReader(), parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.length;
      if (onProgress) onProgress(got, total);
    }
    const all = new Uint8Array(got);
    let at = 0;
    for (const part of parts) { all.set(part, at); at += part.length; }
    return all.buffer;
  };

  // Behind the world, where the capture ends: a dusk sky with a far skyline, drawn by the page
  // itself (no photograph), the same one the booth has on its own page. It is at infinity, so it
  // turns with the view and nothing else: one degree of yaw moves it one degree across the
  // screen, and the horizon rises and falls with the eye's tilt.
  const FOV = 60;
  const sky = document.createElement("div");
  sky.className = "worlds-sky";
  const town = document.createElement("div");
  town.className = "worlds-town";
  sky.appendChild(town);
  stage.insertBefore(sky, stage.firstChild);
  const TOWN_DEG = 14;                     // how many degrees of sky the skyline's strip covers
  (() => {
    // The same town every time: a small fixed generator, so it does not change between visits.
    let seed = 20261110;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let shapes = "";
    for (let a = 0; a < 360;) {
      const dense = 0.35 + 0.65 * Math.pow(Math.sin((a / 360) * Math.PI * 3), 2);   // three clusters round the horizon
      const w = 0.5 + rnd() * 1.6, h = (0.4 + rnd() * rnd() * 7.5) * dense;
      if (rnd() < 0.82) shapes += '<rect x="' + a.toFixed(2) + '" y="' + (TOWN_DEG - h).toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '"/>';
      a += w + rnd() * 0.5;
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ' + TOWN_DEG + '" preserveAspectRatio="none">' +
      '<defs><radialGradient id="g" cx="0.5" cy="1" r="1"><stop offset="0" stop-color="#ffe2a8" stop-opacity="0.95"/>' +
      '<stop offset="0.25" stop-color="#ff9a5a" stop-opacity="0.55"/><stop offset="1" stop-color="#ff5a7a" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse cx="205" cy="' + TOWN_DEG + '" rx="26" ry="' + TOWN_DEG + '" fill="url(#g)"/>' +
      '<g fill="#150d2e">' + shapes + '</g></svg>';
    town.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  })();

  // The wait: how far the world is, large, in the middle of where it will stand.
  const wait = document.createElement("div");
  wait.className = "worlds-wait";
  wait.setAttribute("role", "status");
  wait.innerHTML = '<span class="worlds-wait-num"></span><span class="worlds-wait-bar"><i></i></span>' +
    '<span class="worlds-wait-what"></span>';
  wait.hidden = true;
  stage.appendChild(wait);
  const num = wait.querySelector(".worlds-wait-num"), track = wait.querySelector(".worlds-wait-bar");
  const bar = wait.querySelector("i"), what = wait.querySelector(".worlds-wait-what");

  let app = null, camera = null;
  let now = null;                          // the world being shown, by its key
  let shown = 0;                           // how far the eye stands now, after the room's limits
  let broken = "";                         // why nothing can be drawn at all, when it cannot

  const drawSky = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H || !now) return;
    const v = WORLDS[now].view;
    const half = Math.tan(FOV * Math.PI / 360);                          // the lens' half height, at one unit away
    const perDeg = W / (2 * Math.atan(half * W / H) * 180 / Math.PI);    // pixels a degree of yaw moves the far sky
    const horizon = H / 2 - Math.tan(v.pitch * RAD) / half * H / 2;
    sky.style.transform = "translateY(" + (horizon - 2 * H) + "px)";     // the sky is four stages tall, its horizon half way down
    town.style.height = (TOWN_DEG * perDeg) + "px";
    town.style.top = (2 * H - TOWN_DEG * perDeg) + "px";
    town.style.backgroundSize = (360 * perDeg) + "px 100%";
    town.style.backgroundPositionX = (v.yaw * perDeg) + "px";
  };
  const place = () => {
    if (!now) return;
    const w = WORLDS[now], v = w.view;
    const y = v.yaw * RAD, p = v.pitch * RAD;
    shown = eyeDist(w, v.yaw, v.pitch, v.dist);
    if (camera) {
      camera.setPosition(w.pivot[0] + shown * Math.cos(p) * Math.sin(y), w.pivot[1] + shown * Math.sin(p),
                         w.pivot[2] + shown * Math.cos(p) * Math.cos(y));
      camera.lookAt(w.pivot[0], w.pivot[1], w.pivot[2]);
    }
    drawSky();
  };
  // Closer by a factor under 1, farther by one over 1, from where the eye stands now. False when
  // the eye is already as near or as far as it may be.
  const zoomBy = (factor) => {
    if (!now) return false;
    const w = WORLDS[now], was = shown;
    w.view.dist = clamp(shown * factor, w.zoom[0], w.zoom[1]);
    place();
    return Math.abs(shown - was) > 1e-4;
  };

  // What the stage says: the count while a world comes, nothing once it stands there, and plainly
  // when it cannot be shown.
  const tell = () => {
    const w = now ? WORLDS[now] : null;
    const ready = !!(w && w.entity) && !broken;
    stage.classList.toggle("is-ready", ready);
    wait.hidden = ready;
    if (ready || !w) return;
    const stuck = broken || (w.failed ? w.name + " could not be loaded." : "");
    num.hidden = track.hidden = !!stuck;
    if (stuck) { what.textContent = stuck; return; }
    const p = Math.round(w.part * 100);
    num.textContent = p + "%";
    bar.style.width = p + "%";
    what.textContent = w.name;
  };

  const start = () => {
    if (app || broken) return;
    if (typeof pc === "undefined") { broken = "The viewer could not be loaded."; return; }
    try {
      app = new pc.Application(canvas, {
        graphicsDeviceOptions: { alpha: true, antialias: false },   // the sky shows through, behind the world
      });
    } catch (err) {
      console.error("[worlds]", err);
      app = null;
      broken = "This browser cannot draw it here.";
      return;
    }
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    camera = new pc.Entity("camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0, 0, 0, 0),
      fov: FOV, nearClip: 0.1, farClip: 200,
    });
    app.root.addChild(camera);
    app.start();
    const resize = () => { app.resizeCanvas(stage.clientWidth, stage.clientHeight); drawSky(); };
    new ResizeObserver(resize).observe(stage);
    resize();
  };

  // A world's file, fetched once, then handed to the engine from memory. A world that failed is
  // asked for again the next time it is chosen.
  const bring = (key) => {
    const w = WORLDS[key];
    if (w.coming) return;
    w.failed = false;
    w.part = 0;
    w.coming = fetchAll(w.file, (got, total) => { w.part = Math.min(1, got / total); if (key === now) tell(); })
      .then((buf) => new Promise((resolve, reject) => {
        w.part = 1;
        if (key === now) tell();
        const url = URL.createObjectURL(new Blob([buf]));
        const asset = new pc.Asset(key, "gsplat", { url, filename: key + ".ply" });
        asset.once("load", () => { URL.revokeObjectURL(url); resolve(asset); });
        asset.once("error", (err) => { URL.revokeObjectURL(url); reject(err); });
        app.assets.add(asset);
        app.assets.load(asset);
      }))
      .then((asset) => {
        const e = new pc.Entity(key);
        e.addComponent("gsplat", { asset });
        e.setLocalEulerAngles(w.turn[0], w.turn[1], w.turn[2]);
        e.enabled = key === now;
        app.root.addChild(e);
        w.entity = e;
      })
      .catch((err) => {
        console.error("[worlds]", key, err);
        w.coming = null;
        w.failed = true;
      })
      .then(() => { if (key === now) tell(); });
  };

  const choose = (key) => {
    const w = WORLDS[key];
    if (!w) return;
    start();
    if (key !== now) {
      if (now && WORLDS[now].entity) WORLDS[now].entity.enabled = false;
      now = key;
      picks.forEach((b) => b.setAttribute("aria-pressed", b.dataset.world === key ? "true" : "false"));
      canvas.setAttribute("aria-label", w.name);
    }
    if (app) {
      if (w.entity) w.entity.enabled = true;
      else bring(key);
    }
    place();
    tell();
  };
  picks.forEach((b) => b.addEventListener("click", () => choose(b.dataset.world)));

  // One finger or the mouse turns the view; two fingers come closer and go back.
  const fingers = new Map();
  let spread = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (hint) hint.classList.add("is-gone");
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    spread = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    const was = fingers.get(e.pointerId);
    if (!was || !now) return;
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (fingers.size === 1) {
      const w = WORLDS[now], v = w.view;
      v.yaw -= (e.clientX - was[0]) * 0.3;
      v.pitch = clamp(v.pitch + (e.clientY - was[1]) * 0.3, w.tilt[0], w.tilt[1]);
      place();
    } else if (fingers.size === 2) {
      const [a, b] = Array.from(fingers.values());
      const apart = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (spread > 0 && apart > 0) zoomBy(spread / apart);
      spread = apart;
    }
  });
  const release = (e) => {
    fingers.delete(e.pointerId);
    spread = 0;
    if (!fingers.size) canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  // The wheel belongs to the view while it can still move it. Once the eye is as near or as far
  // as it may be, the wheel is the page's again, so scrolling past the stage never gets stuck.
  canvas.addEventListener("wheel", (e) => {
    if (zoomBy(Math.exp(e.deltaY * 0.001))) e.preventDefault();
  }, { passive: false });

  // Nothing is fetched until the stage is near the screen, and nothing is drawn while it is off it.
  const first = picks.length ? picks[0].dataset.world : Object.keys(WORLDS)[0];
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      const near = entries[entries.length - 1].isIntersecting;
      if (near && !now) choose(first);
      if (app) app.autoRender = near;
    }, { rootMargin: "300px" }).observe(stage);
  } else {
    choose(first);
  }
})();
