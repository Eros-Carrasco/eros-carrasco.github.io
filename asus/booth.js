// The ASUS page: a letter for the people it is sent to, with the booth at Adobe MAX as a gaussian
// splat in it and the two colleagues who asked to be scanned standing there. Drag turns the view,
// the wheel or two fingers come closer, and each person can be dragged across the floor.
// Nothing of it is published in the clear: the letter (content.html) and the three splats are
// locked files, opened here, in the visitor's browser, with the password they were sent.
// PlayCanvas is vendored in ../js/vendor, so nothing is fetched from anyone else.
// The splats are the stage's own frame turned to y up: metres, the floor at y = 0
// (effects/web_ply.py and web_lock.py in the splatlab repo).
(() => {
  if (typeof pc === "undefined") return;

  // What is published is locked (effects/web_lock.py in the splatlab repo): "SPLK1", a salt,
  // a nonce, then AES-256-GCM of the file, the key drawn from the password by PBKDF2. Without the
  // password what this page fetches is noise. Everything is opened here, in the visitor's browser.
  const ROUNDS = 310000;
  const open = async (buf, password) => {
    const b = new Uint8Array(buf);
    if (new TextDecoder().decode(b.subarray(0, 5)) !== "SPLK1") throw new Error("not a locked file");
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b.subarray(5, 21), iterations: ROUNDS, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.subarray(21, 33) }, key, b.subarray(33));
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

  // The three splats start coming the moment the page is opened, while the password is still being
  // typed. They are locked, so what arrives early is noise until the right password opens it. The
  // booth comes first, since it is shown first; the two people after it.
  const SIZES = { kevin: 8.9, alice: 6.2 };            // megabytes, to count the two people as one wait
  const coming = {};
  const watching = new Set();
  const told = () => watching.forEach((f) => f());
  const fetchSplat = (name) => {
    if (!coming[name]) {
      const c = coming[name] = { part: 0 };
      c.buf = fetchAll("splats/" + name + ".ply.enc", (got, total) => { c.part = total ? got / total : 0; told(); })
        .then((b) => { c.part = 1; told(); return b; });
      c.buf.catch(() => { if (coming[name] === c) delete coming[name]; });      // asked for again when it is needed
    }
    return coming[name];
  };
  const part = (name) => (coming[name] ? coming[name].part : 0);
  const prefetch = () => {
    fetchSplat("booth").buf.then(() => { fetchSplat("kevin"); fetchSplat("alice"); }, () => {});
  };

  // The booth, once the letter is on the page and its canvas exists.
  const viewer = (password) => {
    const stage = document.getElementById("booth-stage");
    const canvas = document.getElementById("booth-canvas");
    const note = document.getElementById("booth-note");
    const hint = document.getElementById("booth-hint");
    const tag = document.getElementById("booth-tag");
    if (!stage || !canvas) return;

    const app = new pc.Application(canvas, {
      graphicsDeviceOptions: { alpha: true, antialias: false },   // the sky shows through, behind the booth
    });
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const FOV = 60;
    const camera = new pc.Entity("camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0, 0, 0, 0),
      fov: FOV, nearClip: 0.1, farClip: 200,
    });
    app.root.addChild(camera);
    app.start();

    // Where the booth's own page starts: in front of the ProArt counter, a little above.
    const pivot = new pc.Vec3(-0.585, 1.07, -0.68);
    let yaw = -165.6, pitch = 14.7, dist = 6.4;
    // Behind the booth, where the hall's neighbours were cut away: a dusk sky with a far skyline,
    // drawn by the page itself (no photograph). It is at infinity, so it turns with the view and
    // nothing else: one degree of yaw moves it one degree across the screen, and the horizon
    // rises and falls with the camera's tilt.
    const sky = document.createElement("div");
    sky.className = "booth-sky";
    const town = document.createElement("div");
    town.className = "booth-town";
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
    const drawSky = () => {
      const W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      const half = Math.tan(FOV * Math.PI / 360);                          // the lens' half height, at one unit away
      const perDeg = W / (2 * Math.atan(half * W / H) * 180 / Math.PI);    // pixels a degree of yaw moves the far sky
      const horizon = H / 2 - Math.tan(pitch * Math.PI / 180) / half * H / 2;
      sky.style.transform = "translateY(" + (horizon - 2 * H) + "px)";    // the sky is four stages tall, its horizon half way down
      town.style.height = (TOWN_DEG * perDeg) + "px";
      town.style.top = (2 * H - TOWN_DEG * perDeg) + "px";
      town.style.backgroundSize = (360 * perDeg) + "px 100%";
      town.style.backgroundPositionX = (yaw * perDeg) + "px";
    };
    // How near the eye may come to a person. Nearer than this a face is drawn larger than its scan holds
    // and loses its sharpness (seen once the stage was made larger, 2026-11-18): the eye backs away
    // instead, and a person cannot be carried closer to it than this.
    const NEAR = 2.6;
    const eyeAt = (d) => {
      const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
      return [pivot.x + d * Math.cos(p) * Math.sin(y), pivot.y + d * Math.sin(p), pivot.z + d * Math.cos(p) * Math.cos(y)];
    };
    const nearest = (eye, x, z) => Math.hypot(eye[0] - x, eye[2] - z, Math.max(0, eye[1] - 1.7));   // to a standing person there, feet to head
    const tooNear = (d) => {
      const eye = eyeAt(d);
      try {                                    // the people are made further down; before that nobody is near
        return people.some((q) => { const at = q.e.getPosition(); return nearest(eye, at.x, at.z) < NEAR; });
      } catch (err) { return false; }
    };
    const place = () => {
      for (let i = 0; i < 80 && dist < 12 && tooNear(dist); i++) dist = Math.min(12, dist + 0.1);
      const eye = eyeAt(dist);
      camera.setPosition(eye[0], eye[1], eye[2]);
      camera.lookAt(pivot);
      drawSky();
    };
    const resize = () => { app.resizeCanvas(stage.clientWidth, stage.clientHeight); drawSky(); };
    new ResizeObserver(resize).observe(stage);
    resize();
    place();

    const load = async (name, password) => {
      try {
        const plain = await open(await fetchSplat(name).buf, password);
        delete coming[name];                           // the locked copy is not needed twice
        const url = URL.createObjectURL(new Blob([plain]));
        return await new Promise((resolve) => {
          const a = new pc.Asset(name, "gsplat", { url, filename: name + ".ply" });
          a.once("load", () => { URL.revokeObjectURL(url); resolve(a); });
          a.once("error", (err) => { console.error("[booth]", name, err); resolve(null); });
          app.assets.add(a);
          app.assets.load(a);
        });
      } catch (err) {
        console.error("[booth]", name, err);
        return null;
      }
    };
    const add = (asset, name, x, z) => {
      const e = new pc.Entity(name);
      e.addComponent("gsplat", { asset });
      e.setPosition(x, 0, z);
      app.root.addChild(e);
      return e;
    };

    // Whoever can be moved turns to points of their own colour under the pointer, as things do in
    // the booth's own program. The engine draws every splat of the page through one shared, sorted
    // buffer; this is its hook for changing one object's splats on their way into that buffer, so
    // a person still stands behind the counter when they are behind it.
    const PICK_GLSL = `
      uniform float uPick;      // 0 as scanned, 1 as points
      uniform vec3 uAccent;
      uniform float uPickTime;
      void modifySplatCenter(inout vec3 center) {}
      void modifySplatRotationScale(vec3 originalCenter, vec3 modifiedCenter, inout vec4 rotation, inout vec3 scale) {
        scale *= mix(1.0, 0.32, uPick);
      }
      void modifySplatColor(vec3 center, inout vec4 color) {
        float wave = 0.5 + 0.5 * sin(center.y * 9.0 - uPickTime * 3.0);
        color.rgb = mix(color.rgb, uAccent, uPick * (0.30 + 0.45 * wave));
      }
    `;
    const person = (name, asset, x, z, tall, accent) => {
      const e = add(asset, name.toLowerCase(), x, z);
      const p = { name, e, tall, accent, pick: 0, want: 0, settle: 0, points: false };
      try {
        if (e.gsplat.setWorkBufferModifier && e.gsplat.setParameter) {
          e.gsplat.setWorkBufferModifier({ glsl: PICK_GLSL });
          e.gsplat.setParameter("uPick", 0);
          e.gsplat.setParameter("uAccent", accent);
          e.gsplat.setParameter("uPickTime", 0);
          p.points = true;
        }
      } catch (err) {
        console.warn("[booth] no point effect in this engine", err);
      }
      return p;
    };
    const ALWAYS = pc.WORKBUFFER_UPDATE_ALWAYS !== undefined ? pc.WORKBUFFER_UPDATE_ALWAYS : 2;
    const AUTO = pc.WORKBUFFER_UPDATE_AUTO !== undefined ? pc.WORKBUFFER_UPDATE_AUTO : 0;
    app.on("update", (dt) => {
      for (const p of people) {
        if (!p.points) continue;
        const moving = p.want > 0 || p.pick > 0.001;
        if (moving) {
          p.pick += (p.want - p.pick) * Math.min(1, dt * 10);
          if (p.want === 0 && p.pick < 0.002) p.pick = 0;
          p.e.gsplat.setParameter("uPick", p.pick);
          p.e.gsplat.setParameter("uPickTime", performance.now() / 1000);
          p.e.gsplat.workBufferUpdate = ALWAYS;
          p.settle = 4;
        } else if (p.settle > 0) {
          // a few frames more, so the last one drawn is the person whole again
          p.e.gsplat.setParameter("uPick", 0);
          if (--p.settle === 0) p.e.gsplat.workBufferUpdate = AUTO;
        }
      }
    });

    // The people, where they stood when the picture for this page was taken.
    const people = [];
    const say = (t) => { if (note) note.textContent = t; };
    // How far the booth is: large, in the middle of where it will stand.
    const wait = document.createElement("div");
    wait.className = "booth-wait";
    wait.setAttribute("role", "status");
    wait.innerHTML = '<span class="booth-wait-num">0%</span><span class="booth-wait-bar"><i></i></span>' +
      '<span class="booth-wait-what">Loading the booth</span>';
    stage.appendChild(wait);
    const num = wait.querySelector(".booth-wait-num"), bar = wait.querySelector("i"), what = wait.querySelector(".booth-wait-what");
    // The booth is shown as soon as it is here; Kevin and Alice walk in after it.
    const show = (password) => {
      let boothIn = false, left = 2;
      const tell = () => {
        if (!boothIn) {
          const p = Math.round(part("booth") * 100);
          num.textContent = p + "%";
          bar.style.width = p + "%";
          what.textContent = p < 100 ? "Loading the booth" : "Opening the booth";
        } else if (left > 0) {
          const p = (part("kevin") * SIZES.kevin + part("alice") * SIZES.alice) / (SIZES.kevin + SIZES.alice);
          say("Kevin and Alice are on their way: " + Math.round(p * 100) + "%");
        }
      };
      watching.add(tell);
      tell();
      const fetched = fetchSplat("booth").buf.catch(() => {});
      const shown = load("booth", password).then((booth) => {
        if (!booth) {
          num.textContent = "";
          wait.querySelector(".booth-wait-bar").style.display = "none";
          what.textContent = "The booth could not be loaded.";
          watching.delete(tell);
          return false;
        }
        add(booth, "booth", 0, 0);
        boothIn = true;
        wait.remove();
        stage.classList.add("is-ready");
        canvas.style.cursor = "grab";
        tell();
        return true;
      });
      const arrive = (name, make) => fetched.then(() => load(name, password)).then((asset) => shown.then((ok) => {
        if (ok && asset) {
          const p = make(asset), at = p.e.getPosition(), to = standAt(at.x, at.z);
          if (to) p.e.setPosition(to[0], 0, to[1]);
          people.push(p);
        }
        if (--left === 0) { say(""); watching.delete(tell); }       // what to do is written under the booth, in the letter
      }));
      arrive("kevin", (a) => person("Kevin", a, -0.305, -2.989, 1.86, [0.72, 0.52, 1.0]));
      arrive("alice", (a) => person("Alice", a, -1.124, -2.779, 1.69, [0.42, 0.88, 1.0]));
    };

    // Where the pointer's ray meets the level plane at height h (the floor at 0), or null when it
    // never does. Too far off is refused too: near the horizon a pixel is metres of floor.
    const floorAt = (cx, cy, h = 0) => {
      const r = canvas.getBoundingClientRect();
      const sx = cx - r.left, sy = cy - r.top;      // the camera's screen is the canvas in CSS pixels
      const a = camera.camera.screenToWorld(sx, sy, 0.1), b = camera.camera.screenToWorld(sx, sy, 100);
      const dy = b.y - a.y;
      if (Math.abs(dy) < 1e-6) return null;
      const t = (h - a.y) / dy;
      if (t <= 0 || t > 0.25) return null;          // within 25 m of the eye
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

    // Who can be moved is shown on themselves: they turn to points of their own colour and their
    // name stands over their head, while the pointer is on them and while they are being carried.
    let marked = null;
    const css = (c) => "rgb(" + c.map((v) => Math.round(v * 255)).join(",") + ")";
    const mark = (p) => {
      if (p !== marked) {
        if (marked) marked.want = 0;
        if (p) p.want = 1;
      }
      marked = p;
      if (!tag) return;
      if (!p) { tag.style.opacity = "0"; return; }
      const at = p.e.getPosition();
      const head = camera.camera.worldToScreen(new pc.Vec3(at.x, p.tall + 0.08, at.z));
      if (head.z <= 0) { tag.style.opacity = "0"; return; }
      tag.textContent = p.name;
      tag.style.color = css(p.accent);
      tag.style.borderColor = css(p.accent);
      tag.style.left = head.x + "px"; tag.style.top = head.y + "px";
      tag.style.opacity = "1";
    };
    app.on("update", () => { if (marked) mark(marked); });

    // Where a person can stand (effects/floor_box.py --map in the splatlab repo, from the booth's own splat):
    // floor, with nothing between ankle and head height within a quarter of a metre, and that far from the
    // floor's edge. A grid of 0.1 m cells in the floor's own axes; each row is its cells as hexadecimal, the
    // first cell in the highest bit.
    const WALK = { o: [-6.9740, -3.4330], u: [0.01944, 0.99981], v: [0.99981, -0.01942], cell: 0.1, n: [86, 117],
      rows: "0000000000000000000000 0000000000000000000000 0000000000000000000000 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffff80003fffffffffe0 1ff80000000fffffffffe0 1fe000000007ffffffffe0 1fc000000007ffffffffe0 1fc000000007ffffffffe0 1fc000000007ffffffffe0 1fc000000007ffffffffe0 1fc000000007ffffffffe0 1fc000000007ffffffffe0 1fc000000007fffcffffe0 1fc000000007fff03fffe0 1fc000000007ffe0003fe0 1fc000000007ffc0000fe0 1fc000000007ff800007e0 1fc000000007ff800007e0 1fc000000007ff800007e0 1fc000000007ff800007e0 1fc000000007ff800007e0 1fc000000007ff800007e0 1fc000000003ff800007e0 1fc000000003ff800007e0 1fc000000003ff800007e0 1fc000008003ff800007e0 1fc000000007ff800007e0 1fc000000007ff800007e0 1fc000000001ff800007e0 1fc000000000ff800007e0 1fc000000000ff800007e0 1fc000000000ff800007e0 1fc000000000ff800007e0 1fe000000000ff800007e0 1fc000000000ff800007e0 1fc000000000ff800007e0 1fc000000000ff800007e0 1fe000000001ff800007e0 1ff000000007ff800007e0 1ffc0018007fff800007e0 1ffffffc007fff800007e0 1ffffffc007fff800007e0 1ff0003e00ffff800007e0 1fc0000f83ffff800007e0 1f800007ffffff800007e0 1f800007ffffff800007e0 1f800007ffffff800007e0 1f800007ffffff800007e0 1f800007ffffff800007e0 1f800007ffffffc0000fe0 1f800007fffffff0003fe0 1f800007ffffffffefffe0 1f800007fff1ffffffffe0 1f800007ffc07fffffffe0 1f800007ff803fffffffe0 1f000007ff001fffffffe0 1e000007ff001fffffffe0 1e000007ff001fffffffe0 1e000007ff001fffffffe0 1e000007ff001fffffffe0 1e000007fc001fffffffe0 1e000007f0001fffffffe0 1e000007e0000fffe03fe0 1f000007e0000fff800fe0 1f800007c0000fe00007e0 1f80000780000f800007e0 1f80000780000f000007e0 1f800007000007000007e0 1f800007000003000007e0 1f800007000001000007e0 1f800007000001000007e0 1f000007800001000007e0 1f000007e00001000007e0 1f000007e00001000007e0 1f800007e00003000007e0 1f80000780000f000007e0 1f800007000007000007e0 1fc0000f000007000007e0 1ff0001f000007000007e0 1ffc001f000006000007e0 1ffc001f000006000007e0 1ffc001f000006000007e0 1ffc001f000007000007e0 1ffc001f000007800007e0 1ffc001f80000fe00007e0 1ffc001fe0003ff00007e0 1ffc001fe0007ff80007e0 1ffc001fc0003ffe0007e0 1ffc001f80003ffe0007e0 1ffc001f80001ffe0007e0 1ffc001000001ffe0007e0 1ffc00000000007e0007e0 1ffc00000000001f000fe0 1ffc00000000000fc03fe0 1ffe000000000007ffffe0 1fff000000000007ffffe0 1fffc00000000007ffffe0 1ffffe800000000fffffe0 1fffffe00000001fffffe0 1ffffff00000003fffffe0 1ffffffc0000007fffffe0 1ffffffffffffdffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 1fffffffffffffffffffe0 0000000000000000000000 0000000000000000000000 0000000000000000000000".split(" ") };
    const freeCell = (i, j) => i >= 0 && j >= 0 && i < WALK.n[0] && j < WALK.n[1] &&
      ((parseInt(WALK.rows[j][i >> 2], 16) >> (3 - (i & 3))) & 1) === 1;
    // The place to stand nearest to (x, z): itself where it is free, else the middle of the nearest free cell.
    const standAt = (x, z) => {
      const dx = x - WALK.o[0], dz = z - WALK.o[1];
      const a = (dx * WALK.u[0] + dz * WALK.u[1]) / WALK.cell, b = (dx * WALK.v[0] + dz * WALK.v[1]) / WALK.cell;
      const i = Math.floor(a), j = Math.floor(b);
      if (freeCell(i, j)) return [x, z];
      let best = null, far = 1e9;
      for (let r = 1; r < 140 && (best === null || r <= Math.sqrt(far) + 1); r++) {
        for (let di = -r; di <= r; di++) {
          for (let dj = -r; dj <= r; dj += (Math.abs(di) === r ? 1 : 2 * r)) {
            if (!freeCell(i + di, j + dj)) continue;
            const d = (i + di + 0.5 - a) ** 2 + (j + dj + 0.5 - b) ** 2;
            if (d < far) { far = d; best = [i + di, j + dj]; }
          }
        }
      }
      if (!best) return null;
      const u = (best[0] + 0.5) * WALK.cell, v = (best[1] + 0.5) * WALK.cell;
      return [WALK.o[0] + u * WALK.u[0] + v * WALK.v[0], WALK.o[1] + u * WALK.u[1] + v * WALK.v[1]];
    };

    // A person is carried by the spot they were taken by: the pointer's ray is met at that spot's
    // own height, not at the floor behind it, so they move as far as the hand does and no farther.
    // They follow the pointer at once, and only over places where a person could stand: over a
    // counter or a wall they wait at the nearest free spot.
    // Two fingers come closer and go back, as the wheel does; a person being carried is put down
    // when the second finger lands (Eros, 2026-11-18: pinch to zoom, as in the breakroom).
    let mode = null, lastX = 0, lastY = 0, held = null, grab = null, grabH = 0;
    const fingers = new Map();
    let spread = 0;
    canvas.addEventListener("pointerdown", (e) => {
      if (hint) hint.classList.add("is-gone");
      fingers.set(e.pointerId, [e.clientX, e.clientY]);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer already gone */ }
      if (fingers.size >= 2) {
        if (held) mark(null);
        mode = "pinch"; held = null; spread = 0;
        return;
      }
      lastX = e.clientX; lastY = e.clientY;
      held = personAt(e.clientX, e.clientY);
      if (held) {
        const at = held.e.getPosition(), r = canvas.getBoundingClientRect();
        const feet = camera.camera.worldToScreen(new pc.Vec3(at.x, 0, at.z));
        const head = camera.camera.worldToScreen(new pc.Vec3(at.x, held.tall, at.z));
        const up = (feet.y - (e.clientY - r.top)) / Math.max(1, feet.y - head.y);     // 0 at the feet, 1 at the head
        grabH = Math.max(0, Math.min(1, up)) * held.tall;
        const f = floorAt(e.clientX, e.clientY, grabH);
        grab = f ? new pc.Vec3(at.x - f.x, 0, at.z - f.z) : new pc.Vec3();
        mode = "person";
        mark(held);
        canvas.style.cursor = "grabbing";
      } else {
        mode = "look";
        canvas.style.cursor = "grabbing";
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, [e.clientX, e.clientY]);
      if (mode === "pinch" || mode === "wait") {
        if (mode === "pinch" && fingers.size === 2) {
          const [a, b] = Array.from(fingers.values());
          const apart = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (spread > 0 && apart > 0) {
            dist = Math.max(2.2, Math.min(12, dist * spread / apart));
            place();
          }
          spread = apart;
        }
        return;
      }
      if (mode === "person") {
        const f = floorAt(e.clientX, e.clientY, grabH);
        if (f) {
          const to = standAt(f.x + grab.x, f.z + grab.z);
          if (to && nearest(eyeAt(dist), to[0], to[1]) >= NEAR) held.e.setPosition(to[0], 0, to[1]);
        }
      } else if (mode === "look") {
        yaw -= (e.clientX - lastX) * 0.3;
        pitch = Math.max(2, Math.min(75, pitch + (e.clientY - lastY) * 0.3));
        place();
      } else {
        const over = personAt(e.clientX, e.clientY);
        canvas.style.cursor = over ? "pointer" : "grab";
        if (over !== marked) mark(over);
      }
      lastX = e.clientX; lastY = e.clientY;
    });
    const release = (e) => {
      fingers.delete(e.pointerId);
      spread = 0;
      if (fingers.size) {                  // one finger of a pinch still down: wait for it, no jump
        mode = "wait"; held = null;
        return;
      }
      mode = null; held = null;
      const over = e && e.clientX !== undefined ? personAt(e.clientX, e.clientY) : null;
      canvas.style.cursor = over ? "pointer" : "grab";
      mark(over);
    };
    canvas.addEventListener("pointerleave", () => { if (!mode) mark(null); });
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    // On a phone a held finger would otherwise start a text selection outside the stage, or the
    // long-press menu; the pointer events above still come (Eros, 2026-11-19).
    canvas.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      dist = Math.max(2.2, Math.min(12, dist * Math.exp(e.deltaY * 0.001)));
      place();
    }, { passive: false });

    show(password);
  };

  // The door: a password, tried on a few bytes. It is kept in this browser, so whoever was sent the
  // page is asked once on each device, and it is never sent anywhere.
  const door = document.getElementById("page-door");
  const field = document.getElementById("page-password");
  const wrong = document.getElementById("page-wrong");
  const letter = document.getElementById("letter");
  const tryPassword = async (password) => {
    try {
      const plain = await open(await fetchAll("splats/check.enc"), password);
      return new TextDecoder().decode(plain) === "splatlab booth";
    } catch (err) {
      return false;
    }
  };
  const enter = async (password, quiet) => {
    if (!window.crypto || !crypto.subtle) { if (wrong) wrong.textContent = "This browser cannot open it (it needs a secure page)."; return; }
    if (wrong) wrong.textContent = quiet ? "" : "Checking...";
    if (!(await tryPassword(password))) {
      try { localStorage.removeItem("booth-password"); } catch (err) { /* private mode */ }
      if (wrong) wrong.textContent = quiet ? "" : "That is not the password.";
      return;
    }
    try { localStorage.setItem("booth-password", password); } catch (err) { /* private mode */ }
    try {
      const html = new TextDecoder().decode(await open(await fetchAll("content.html.enc"), password));
      letter.innerHTML = html;
    } catch (err) {
      console.error("[booth] the letter", err);
      if (wrong) wrong.textContent = "The page could not be opened.";
      return;
    }
    if (door) door.hidden = true;
    letter.hidden = false;
    viewer(password);
  };
  const eye = document.getElementById("page-eye");
  if (eye && field) {
    eye.addEventListener("click", () => {
      const shown = field.type === "text";
      field.type = shown ? "password" : "text";
      eye.setAttribute("aria-pressed", shown ? "false" : "true");
      eye.setAttribute("aria-label", shown ? "Show the password" : "Hide the password");
      field.focus();
    });
  }
  if (door && letter) {
    prefetch();
    door.addEventListener("submit", (e) => { e.preventDefault(); enter(field.value, false); });
    let kept = null;
    try { kept = localStorage.getItem("booth-password"); } catch (err) { /* private mode */ }
    if (kept) enter(kept, true);
  }
})();
