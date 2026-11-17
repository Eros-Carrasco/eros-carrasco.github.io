// The ASUS page: a letter for the people it is sent to, with the booth at Adobe MAX as a gaussian
// splat in it and the two colleagues who asked to be scanned standing there. Drag turns the view,
// the wheel comes closer, and each person can be dragged across the floor.
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

  // The booth, once the letter is on the page and its canvas exists.
  const viewer = (password) => {
    const stage = document.getElementById("booth-stage");
    const canvas = document.getElementById("booth-canvas");
    const note = document.getElementById("booth-note");
    const hint = document.getElementById("booth-hint");
    const tag = document.getElementById("booth-tag");
    if (!stage || !canvas) return;

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

    const load = async (name, password, onProgress) => {
      try {
        const plain = await open(await fetchAll("splats/" + name + ".ply.enc", onProgress), password);
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
    const HINT = "Scroll to zoom in. Kevin and Alice are here too: feel free to move them around!";
    const SIZES = [29.2, 8.9, 6.2];
    const show = (password) => {
      const got = [0, 0, 0];
      const progress = (i) => (received, total) => {
        got[i] = total ? received / total : 0;
        const done = got.reduce((s, g, k) => s + g * SIZES[k], 0) / SIZES.reduce((s, v) => s + v, 0);
        say("Loading the booth: " + Math.round(done * 100) + "%");
      };
      say("Loading the booth: 0%");
      Promise.all([
        load("booth", password, progress(0)),
        load("kevin", password, progress(1)),
        load("alice", password, progress(2)),
      ]).then(([booth, kevin, alice]) => {
        if (!booth) { say("The booth could not be loaded."); return; }
        add(booth, "booth", 0, 0);
        if (kevin) people.push(person("Kevin", kevin, -0.305, -2.989, 1.86, [1.0, 0.72, 0.42]));
        if (alice) people.push(person("Alice", alice, -1.124, -2.779, 1.69, [0.42, 0.88, 1.0]));
        stage.classList.add("is-ready");
        canvas.style.cursor = "grab";
        say(HINT);
      });
    };

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
        canvas.style.cursor = "grabbing";
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
        canvas.style.cursor = over ? "pointer" : "grab";
        if (over !== marked) mark(over);
      }
      lastX = e.clientX; lastY = e.clientY;
    });
    const release = (e) => {
      mode = null; held = null;
      const over = e && e.clientX !== undefined ? personAt(e.clientX, e.clientY) : null;
      canvas.style.cursor = over ? "pointer" : "grab";
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

    show(password);
  };

  // The door: a password, tried on a few bytes before anything else is fetched. It is kept for
  // this tab only, so a reload does not ask again, and it is never sent anywhere.
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
      try { sessionStorage.removeItem("booth-password"); } catch (err) { /* private mode */ }
      if (wrong) wrong.textContent = quiet ? "" : "That is not the password.";
      return;
    }
    try { sessionStorage.setItem("booth-password", password); } catch (err) { /* private mode */ }
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
  if (door && letter) {
    door.addEventListener("submit", (e) => { e.preventDefault(); enter(field.value, false); });
    let kept = null;
    try { kept = sessionStorage.getItem("booth-password"); } catch (err) { /* private mode */ }
    if (kept) enter(kept, true);
  }
})();
