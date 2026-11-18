// The gaussian splat worlds on the SplatLab page, each in its own viewer: the breakroom near the
// top and the ASUS booth at Adobe MAX 2026 further down. Each stage names its world (data-world).
// Drag turns the view and the wheel (or two fingers) comes closer and goes back. Nothing is
// fetched until a stage comes near the screen, so the booth's file comes only when it is scrolled to.
// PlayCanvas is vendored in ../../js/vendor, so nothing is fetched from anyone else.
// The files are PlayCanvas compressed PLY, in metres (effects/web_ply.py in the splatlab repo).
// In the breakroom some things can be carried across the floor, the room cleared, and a light
// (warm, white or cool) carried through it: the room comes in pieces (effects/web_room.py), the room bare with the floor
// and walls made where things stood, what stays in it, and a small file for each thing.
const worldsViewer = (stage) => {
  const canvas = stage.querySelector("canvas");
  const hint = stage.querySelector(".worlds-hint");
  const picks = [];
  if (!stage || !canvas) return;

  // Each world declares its own frame and view; nothing is guessed from the file.
  //   turn    the turn that brings the file to this page's frame (y up, the floor at y = 0), as
  //           angles about x, y and z in degrees
  //   pivot   what the view turns about; yaw, pitch and dist put the eye round it
  //   zoom    the nearest and farthest the eye may stand, in metres; tilt the lowest and highest pitch
  //   room    for a place seen from inside: its outline on the floor (x, z), how far off its walls
  //           the eye keeps, and the height the eye stays under
  //   solid   for a place seen from outside: the eye keeps off it. A coarse grid of where its
  //           splats are is counted from the file once it is here (cell, in metres); a cell with
  //           at least `dense` of them is a surface, and the eye keeps `keep` metres from every
  //           surface: where it would come nearer it is put farther back until it is clear, so
  //           neither the wheel nor a turn takes it into or up against a counter or a wall
  //   pieces  for a place in pieces: what stays in it (drawn over the room, gone when it is
  //           cleared) and the things that can be carried (things.json: their files, where each
  //           stands, its outline on the floor and its height, and the zone they may be carried in)
  const ALL = {
    // Already y up with its floor at 0. The view is the one the booth has on its own page, and so is
    // the nearest the wheel brings the eye (2.2 m from the pivot). Measured on the file: from 2.2 m
    // the eye still meets the booth's counters and walls in some directions (from the pivot, a
    // counter stands up to 3 m off on one side and a wall from 2.5 to 4 m on another), and in the
    // browser 2.2 m alone put the eye a metre from the screens, drawn softer than the scan holds.
    // So the eye also keeps 0.8 m from any surface; the first view stands clear of that.
    booth: {
      file: "splats/booth.ply",
      turn: [0, 0, 0],
      pivot: [-0.585, 1.07, -0.68], yaw: -165.6, pitch: 14.7, dist: 6.4,
      zoom: [2.2, 12], tilt: [2, 75],
      solid: { cell: 0.2, dense: 10, keep: 0.8 },
    },
    // The pieces are the booth program's room (booth/breakroom-full.toml in the splatlab repo), its
    // frame (x, y, z up, the floor at 0) carried to this one (x, z up, -y) when they were written:
    // already upright here. The pivot's place on the floor, the side the eye starts on and the
    // outline are the ones that program has for this room (its view and its clear_zone).
    // Here the eye stays in the clear air of the room, measured on the file itself: over the tables
    // and chairs (the pivot is 1.2 m up) and under the lamps and panels that hang from 2.5 m (roof).
    // The outline's window side is brought in 1.6 m, past the tall pieces that stand along it.
    breakroom: {
      file: "splats/breakroom/room.ply",
      pieces: { rest: "splats/breakroom/rest.ply", things: "splats/breakroom/things.json" },
      turn: [0, 0, 0],
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
  const shownHere = stage.dataset.world;
  if (!ALL[shownHere]) return;
  const WORLDS = { [shownHere]: ALL[shownHere] };
  for (const key in WORLDS) {
    const w = WORLDS[key];
    w.name = stage.dataset.name || key;
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
  // The solid grid of a place seen from outside, counted from its compressed PLY: per chunk of 256
  // splats a box, per splat a place in that box (11, 10 and 11 bits) and an opacity (the lowest
  // byte of its colour). Splats under 0.3 opacity are left out. Null when the file is not laid out
  // as expected, and only for a world the page draws unturned, so the grid's frame is the page's.
  const solidOf = (buf, cell, dense, keep) => {
    const bytes = new Uint8Array(buf);
    const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
    const end = head.indexOf("end_header\n");
    if (end < 0) return null;
    const lines = head.slice(0, end).split("\n");
    const props = (el) => {
      const at = lines.findIndex((l) => l.startsWith("element " + el + " "));
      if (at < 0) return null;
      let n = 0;
      for (let i = at + 1; i < lines.length && lines[i].startsWith("property "); i++) n++;
      return { count: +lines[at].split(" ")[2], props: n };
    };
    const ch = props("chunk"), vx = props("vertex");
    if (!ch || !vx || ch.props !== 18 || vx.props !== 4 || lines.some((l) => l.startsWith("element sh"))) return null;
    const dv = new DataView(buf);
    const c0 = end + "end_header\n".length, v0 = c0 + ch.count * 72;
    if (v0 + vx.count * 16 > buf.byteLength) return null;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < ch.count; c++) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], dv.getFloat32(c0 + c * 72 + k * 4, true));
        hi[k] = Math.max(hi[k], dv.getFloat32(c0 + c * 72 + 12 + k * 4, true));
      }
    }
    const n = lo.map((l, k) => Math.ceil((hi[k] - l) / cell) + 1);
    const grid = new Uint32Array(n[0] * n[1] * n[2]);
    for (let i = 0; i < vx.count; i++) {
      if ((dv.getUint32(v0 + i * 16 + 12, true) & 255) <= 76) continue;
      const p = dv.getUint32(v0 + i * 16, true), b = c0 + (i >> 8) * 72;
      const f = [(p >>> 21) / 2047, ((p >>> 11) & 1023) / 1023, (p & 2047) / 2047];
      let at = 0;
      for (let k = 0; k < 3; k++) {
        const mn = dv.getFloat32(b + k * 4, true), mx = dv.getFloat32(b + 12 + k * 4, true);
        at = at * n[k] + clamp(Math.floor((mn + f[k] * (mx - mn) - lo[k]) / cell), 0, n[k] - 1);
      }
      grid[at]++;
    }
    // The surface cells, grown by `keep` along each axis in turn: a cell is near when a surface
    // stands within that box round it.
    let near = new Uint8Array(grid.length);
    for (let i = 0; i < grid.length; i++) near[i] = grid[i] >= dense ? 1 : 0;
    const r = Math.round(keep / cell), step = [n[1] * n[2], n[2], 1];
    for (let axis = 0; axis < 3; axis++) {
      const out = new Uint8Array(near.length);
      for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
        const at = (i * n[1] + j) * n[2] + k, c = [i, j, k][axis];
        for (let q = Math.max(0, c - r); q <= Math.min(n[axis] - 1, c + r); q++) {
          if (near[at + (q - c) * step[axis]]) { out[at] = 1; break; }
        }
      }
      near = out;
    }
    // Whether a point is that near a surface; a point outside the grid is in the open.
    const blocked = (x, y, z) => {
      const c = [x, y, z].map((v, k) => Math.floor((v - lo[k]) / cell));
      if (c.some((v, k) => v < 0 || v >= n[k])) return false;
      return near[(c[0] * n[1] + c[1]) * n[2] + c[2]] === 1;
    };
    return { blocked };
  };

  const eyeDist = (w, yaw, pitch, dist) => {
    if (w.grid) {
      const y = yaw * RAD, p = pitch * RAD;
      const dx = Math.cos(p) * Math.sin(y), dy = Math.sin(p), dz = Math.cos(p) * Math.cos(y);
      let d = dist;
      for (let i = 0; i < 200 && d < w.zoom[1] + 4 &&
           w.grid.blocked(w.pivot[0] + d * dx, w.pivot[1] + d * dy, w.pivot[2] + d * dz); i++) d += 0.1;
      return d;
    }
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
    app.on("update", tick);
    app.start();
    const resize = () => { app.resizeCanvas(stage.clientWidth, stage.clientHeight); drawSky(); };
    new ResizeObserver(resize).observe(stage);
    resize();
  };

  // A world's files, fetched once, then handed to the engine from memory. A world that failed is
  // asked for again the next time it is chosen. A world in pieces counts all its files in its wait,
  // so it is shown whole, its things in their places, never the bare room first.
  const toAsset = (name, buf) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([buf]));
    const asset = new pc.Asset(name, "gsplat", { url, filename: name + ".ply" });
    asset.once("load", () => { URL.revokeObjectURL(url); resolve(asset); });
    asset.once("error", (err) => { URL.revokeObjectURL(url); reject(err); });
    app.assets.add(asset);
    app.assets.load(asset);
  });
  const bring = (key) => {
    const w = WORLDS[key];
    if (w.coming) return;
    w.failed = false;
    w.part = 0;
    const got = {}, size = {};
    const counted = (file) => (g, t) => {
      got[file] = g; size[file] = t;
      let G = 0, T = 0;
      for (const f in size) { G += got[f]; T += size[f]; }
      w.part = T ? Math.min(1, G / T) : 0;
      if (key === now) tell();
    };
    w.coming = (async () => {
      let list = null;
      if (w.pieces) {
        const res = await fetch(w.pieces.things);
        if (!res.ok) throw new Error(w.pieces.things + ": " + res.status);
        list = await res.json();
      }
      const dir = w.file.slice(0, w.file.lastIndexOf("/") + 1);
      const files = [w.file].concat(list ? [w.pieces.rest] : [], list ? list.things.map((t) => dir + t.file) : []);
      const bufs = await Promise.all(files.map((f) => fetchAll(f, counted(f))));
      if (w.solid && !w.turn.some((a) => a)) {
        try { w.grid = solidOf(bufs[0], w.solid.cell, w.solid.dense, w.solid.keep); } catch (err) { console.warn("[worlds] no solid grid", err); }
      }
      w.part = 1;
      if (key === now) tell();
      const assets = await Promise.all(bufs.map((buf, i) => toAsset(key + "-" + i, buf)));
      const e = new pc.Entity(key);
      e.setLocalEulerAngles(w.turn[0], w.turn[1], w.turn[2]);
      e.enabled = key === now;
      app.root.addChild(e);
      const part = (name, asset) => {
        const c = new pc.Entity(name);
        c.addComponent("gsplat", { asset });
        e.addChild(c);
        return c;
      };
      const room = part(key + " room", assets[0]);
      if (list) furnish(w, list, room, part(key + " rest", assets[1]), assets.slice(2).map((a, i) => part(list.things[i].file, a)));
      w.entity = e;
    })()
      .catch((err) => {
        console.error("[worlds]", key, err);
        w.coming = null;
        w.failed = true;
      })
      .then(() => { if (key === now) { place(); tell(); tools(); } });
  };

  // ---- The breakroom's things: carried across the floor, the room cleared, a light --------------
  //
  // Every splat of the page goes through one shared, sorted buffer; the engine's hook for changing
  // one entity's splats on their way into it is a work buffer modifier, a few lines of GLSL. Here
  // it lights the splats by a lamp (its colour warm, white or cool, falling off with distance: no
  // normals, so a splat is lit by where it is, not which way it faces), tints a thing under the pointer, and fades a thing
  // out when the room is cleared.
  const PIECE_GLSL = `
    uniform vec3 uLamp;        // where the lamp is, in the world
    uniform float uLampOn;     // 0 off, 1 on
    uniform vec3 uLampColor;   // the lamp's colour, as a multiplier
    uniform float uTint;       // 0 as scanned, 1 marked as the thing under the pointer
    uniform float uFade;       // 1 there, 0 gone
    void modifySplatCenter(inout vec3 center) {}
    void modifySplatRotationScale(vec3 originalCenter, vec3 modifiedCenter, inout vec4 rotation, inout vec3 scale) {
      scale *= uFade;
    }
    void modifySplatColor(vec3 center, inout vec4 color) {
      float d = distance(center, uLamp);
      float lit = 1.0 / (1.0 + 0.9 * d * d);
      vec3 lamp = color.rgb * (0.32 + 2.4 * lit * uLampColor);
      color.rgb = mix(color.rgb, lamp, uLampOn);
      color.rgb = mix(color.rgb, vec3(0.36, 0.86, 1.0), 0.3 * uTint);
      color.a *= uFade;
    }
  `;
  const ALWAYS = pc.WORKBUFFER_UPDATE_ALWAYS !== undefined ? pc.WORKBUFFER_UPDATE_ALWAYS : 2;
  const AUTO = pc.WORKBUFFER_UPDATE_AUTO !== undefined ? pc.WORKBUFFER_UPDATE_AUTO : 0;
  let house = null;          // the breakroom's pieces, once here

  // A splat entity that can be changed: its parameters, and a few frames of redrawing after each change.
  const piece = (e) => {
    const p = { e, fade: 1, tint: 0, settle: 0, ok: false };
    try {
      if (e.gsplat.setWorkBufferModifier && e.gsplat.setParameter) {
        e.gsplat.setWorkBufferModifier({ glsl: PIECE_GLSL });
        p.ok = true;
      }
    } catch (err) {
      console.warn("[worlds] no splat modifier in this engine", err);
    }
    return p;
  };
  const stir = (p) => { p.settle = 4; };
  const send = (p) => {
    if (!p.ok) return;
    const g = p.e.gsplat;
    g.setParameter("uLamp", [lamp.x, lamp.y, lamp.z]);
    g.setParameter("uLampOn", lamp.on);
    g.setParameter("uLampColor", TONES[lamp.tone]);
    g.setParameter("uTint", p.tint);
    g.setParameter("uFade", p.fade);
  };

  // The light: off at first, over the middle of the room, carried by its handle across the floor.
  // Its colour is one of three, each a multiplier of the captured colour (it never adds a hue the
  // room did not have, only tints what is lit): warm as a bulb, white, and cool as daylight.
  const TONES = { warm: [1.0, 0.8, 0.55], white: [1.0, 0.98, 0.94], cool: [0.62, 0.8, 1.0] };
  const lamp = { x: 0, y: 1.5, z: 0, on: 0, want: 0, tone: "warm", dragged: false };
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "worlds-lamp";
  handle.dataset.tone = lamp.tone;
  handle.setAttribute("aria-label", "The light: drag it across the room");
  handle.hidden = true;
  stage.appendChild(handle);
  // Until the light has been carried once, a tip under its handle says it can be.
  const tip = document.createElement("span");
  tip.className = "worlds-lamp-tip";
  tip.textContent = "Drag the light";
  tip.hidden = true;
  stage.appendChild(tip);

  const furnish = (w, list, room, rest, parts) => {
    const zone = list.zone;
    house = {
      w, zone, cleared: false,
      room: piece(room), rest: piece(rest),
      things: parts.map((e, i) => {
        const t = list.things[i];
        e.setLocalPosition(t.at[0], 0, t.at[1]);
        const foot = t.foot.length >= 3 ? t.foot : [[-t.reach, -t.reach], [t.reach, -t.reach], [t.reach, t.reach], [-t.reach, t.reach]];
        return Object.assign(piece(e), { name: t.name, home: t.at.slice(), foot, tall: Math.max(0.3, t.tall) });
      }),
    };
    lamp.x = w.pivot[0]; lamp.z = w.pivot[2];
    for (const p of all()) { send(p); stir(p); }
  };
  const all = () => house ? [house.room, house.rest].concat(house.things) : [];

  const tick = (dt) => {
    if (!house) return;
    const k = Math.min(1, dt * 8);
    const lampWas = lamp.on;
    lamp.on += (lamp.want - lamp.on) * k;
    if (Math.abs(lamp.want - lamp.on) < 0.003) lamp.on = lamp.want;
    const lampMoved = lamp.on !== lampWas || lamp.moved;
    lamp.moved = false;
    const gone = house.cleared ? 0 : 1;
    for (const p of all()) {
      const fadeTo = p === house.room ? 1 : gone;
      const tintTo = p === held || (p === over && !held) ? 1 : 0;
      const was = p.fade + 10 * p.tint;
      p.fade += (fadeTo - p.fade) * k;
      if (Math.abs(fadeTo - p.fade) < 0.003) p.fade = fadeTo;
      p.tint += (tintTo - p.tint) * Math.min(1, dt * 12);
      if (Math.abs(tintTo - p.tint) < 0.003) p.tint = tintTo;
      if (p !== house.room) {
        const there = p.fade > 0;
        if (p.e.enabled !== there) p.e.enabled = there;
      }
      if (lampMoved || p.fade + 10 * p.tint !== was) { send(p); stir(p); }
      if (p.ok) {
        if (p.settle > 0) {
          p.e.gsplat.workBufferUpdate = ALWAYS;
          if (--p.settle === 0) p.e.gsplat.workBufferUpdate = AUTO;
        }
      }
    }
    if (lamp.on > 0 && now === "breakroom") {
      const s = camera.camera.worldToScreen(new pc.Vec3(lamp.x, lamp.y, lamp.z));
      handle.hidden = s.z <= 0;
      handle.style.left = s.x + "px";
      handle.style.top = s.y + "px";
      handle.style.opacity = String(lamp.on);
      tip.hidden = handle.hidden || lamp.dragged || lamp.want === 0;
      if (!tip.hidden) {
        const half = tip.offsetWidth / 2 + 6;          // the tip stays inside the stage
        tip.style.left = clamp(s.x, half, stage.clientWidth - half) + "px";
        tip.style.top = s.y + "px";
      }
    } else {
      handle.hidden = true;
      tip.hidden = true;
    }
  };

  // The pointer's ray, from the eye through a point of the canvas: origin and direction.
  const rayAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const a = camera.camera.screenToWorld(cx - r.left, cy - r.top, 0.1);
    const b = camera.camera.screenToWorld(cx - r.left, cy - r.top, 100);
    const d = new pc.Vec3().sub2(b, a).normalize();
    return { o: a, d };
  };
  // Where a ray meets the level plane at height h, within 25 m, or null.
  const planeAt = (ray, h) => {
    if (Math.abs(ray.d.y) < 1e-6) return null;
    const t = (h - ray.o.y) / ray.d.y;
    if (t <= 0 || t > 25) return null;
    return [ray.o.x + ray.d.x * t, ray.o.z + ray.d.z * t];
  };
  // How far along the ray it first enters a thing: its outline on the floor raised to its height,
  // a convex prism, met plane by plane. Infinity when it misses.
  const enters = (ray, th) => {
    const at = th.e.getLocalPosition();
    let t0 = 0, t1 = 1e9;
    const cut = (num, den) => {            // the half space n . (p - a) <= 0 as num = n . (a - o), den = n . d
      if (Math.abs(den) < 1e-12) return num >= 0;
      const t = num / den;
      if (den < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      return t0 <= t1;
    };
    if (!cut(ray.o.y, -ray.d.y) || !cut(th.tall - ray.o.y, ray.d.y)) return Infinity;     // over the floor, under its top
    const f = th.foot;
    let mx = 0, mz = 0;
    for (const q of f) { mx += q[0]; mz += q[1]; }
    mx /= f.length; mz /= f.length;
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      let nx = b[1] - a[1], nz = -(b[0] - a[0]);
      if (nx * (mx - a[0]) + nz * (mz - a[1]) > 0) { nx = -nx; nz = -nz; }     // outward, away from its middle
      const ax = at.x + a[0], az = at.z + a[1];
      if (!cut(nx * (ax - ray.o.x) + nz * (az - ray.o.z), nx * ray.d.x + nz * ray.d.z)) return Infinity;
    }
    return t0;
  };
  // The thing under the pointer, the nearest one the ray enters; null over the room.
  const thingAt = (cx, cy) => {
    if (!house || house.cleared || now !== "breakroom") return null;
    const ray = rayAt(cx, cy);
    let best = null, near = Infinity;
    for (const th of house.things) {
      if (!th.e.enabled) continue;
      const t = enters(ray, th);
      if (t < near) { near = t; best = th; }
    }
    return best ? { th: best, ray, t: near } : null;
  };

  // How far a point lies outside the zone things may be carried in; 0 inside.
  const inZone = (x, z) => {
    const o = house.zone;
    let inside = false;
    for (let i = 0, j = o.length - 1; i < o.length; j = i++) {
      if ((o[i][1] > z) !== (o[j][1] > z) && x < (o[j][0] - o[i][0]) * (z - o[i][1]) / (o[j][1] - o[i][1]) + o[i][0]) inside = !inside;
    }
    return inside;
  };
  const outside = (x, z) => {
    if (inZone(x, z)) return 0;
    const o = house.zone;
    let near = Infinity;
    for (let i = 0; i < o.length; i++) {
      const a = o[i], b = o[(i + 1) % o.length];
      const ex = b[0] - a[0], ez = b[1] - a[1];
      const s = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez), 0, 1);
      near = Math.min(near, Math.hypot(x - a[0] - s * ex, z - a[1] - s * ez));
    }
    return near;
  };
  // How much of a thing's outline would stand past the zone, were it at (x, z).
  const past = (th, x, z) => th.foot.reduce((sum, q) => sum + outside(x + q[0], z + q[1]), 0);
  // A thing put at (x, z) if it stays in the room there; else slid along whichever axis lets it,
  // else left where it is. One that stood partly past the zone at home may move if it gets no worse.
  const putAt = (th, x, z) => {
    const at = th.e.getLocalPosition();
    const was = past(th, at.x, at.z);
    const ok = (px, pz) => { const p = past(th, px, pz); return p < 1e-3 || p <= was + 1e-6; };
    if (ok(x, z)) th.e.setLocalPosition(x, 0, z);
    else if (ok(x, at.z)) th.e.setLocalPosition(x, 0, at.z);
    else if (ok(at.x, z)) th.e.setLocalPosition(at.x, 0, z);
    else return;
    stir(th);
  };

  let over = null;           // the thing under the pointer
  let held = null;           // the thing being carried: { th, h, grab: [dx, dz] }
  const hold = (hit, pointerId) => {
    const p = hit.ray.o.clone().add(hit.ray.d.clone().mulScalar(hit.t));
    const h = clamp(p.y, 0, hit.th.tall);
    const at = hit.th.e.getLocalPosition();
    const f = planeAt(hit.ray, h);
    held = hit.th;
    held.carry = { h, grab: f ? [at.x - f[0], at.z - f[1]] : [0, 0], pointerId };
  };
  const carry = (cx, cy) => {
    const f = planeAt(rayAt(cx, cy), held.carry.h);
    if (f) putAt(held, f[0] + held.carry.grab[0], f[1] + held.carry.grab[1]);
  };
  const putDown = () => { held = null; };

  // The controls under the breakroom: put everything back, clear the room, the light and, while it
  // is on, its colour.
  const toolbar = document.createElement("div");
  toolbar.className = "worlds-tools";
  const dot = { warm: "#ffc069", white: "#f4f4f0", cool: "#8cc4ff" };
  toolbar.innerHTML = '<button type="button" class="worlds-pick" data-do="reset">Reset</button>' +
    '<button type="button" class="worlds-pick" data-do="clear" aria-pressed="false">Clear the room</button>' +
    '<button type="button" class="worlds-pick" data-do="lamp" aria-pressed="false">Light</button>' +
    '<span class="worlds-tone" role="group" aria-label="Colour of the light" hidden>' +
    Object.keys(TONES).map((t) => '<button type="button" class="worlds-pick" data-tone="' + t + '" aria-pressed="' +
      (t === lamp.tone) + '"><i style="--dot:' + dot[t] + '"></i>' + t[0].toUpperCase() + t.slice(1) + '</button>').join("") +
    '</span>';
  const toneGroup = toolbar.querySelector(".worlds-tone");
  stage.after(toolbar);
  const tools = () => {
    const show = now === "breakroom" && !!house && !!WORLDS.breakroom.entity;
    toolbar.hidden = !show;
    stage.classList.toggle("is-room", show);
    const canLight = show && house.room.ok;
    toolbar.querySelector('[data-do="lamp"]').hidden = !canLight;
    toolbar.querySelector('[data-do="clear"]').setAttribute("aria-pressed", show && house.cleared ? "true" : "false");
    toolbar.querySelector('[data-do="lamp"]').setAttribute("aria-pressed", lamp.want ? "true" : "false");
    toneGroup.hidden = !canLight || !lamp.want;
    toneGroup.querySelectorAll("[data-tone]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tone === lamp.tone ? "true" : "false"));
  };
  toolbar.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tone]");
    if (t && house) {
      lamp.tone = t.dataset.tone;
      handle.dataset.tone = lamp.tone;
      lamp.moved = true;                   // every piece is sent the new colour
      tools();
      return;
    }
    const b = e.target.closest("[data-do]");
    if (!b || !house) return;
    if (b.dataset.do === "reset") {
      for (const th of house.things) { th.e.setLocalPosition(th.home[0], 0, th.home[1]); stir(th); }
      house.cleared = false;
      lamp.want = 0;
      held = over = null;
    } else if (b.dataset.do === "clear") {
      house.cleared = !house.cleared;
      held = over = null;
    } else if (b.dataset.do === "lamp") {
      lamp.want = lamp.want ? 0 : 1;
      if (lamp.want && hint) hint.classList.add("is-gone");     // the light's own tip says what to do now
    }
    tools();
  });

  // The light's handle is carried across the floor at the light's height.
  let lampBy = null;
  handle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    lampBy = e.pointerId;
    lamp.dragged = true;
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* gone already */ }
    if (hint) hint.classList.add("is-gone");
  });
  handle.addEventListener("pointermove", (e) => {
    if (lampBy !== e.pointerId || !house) return;
    const f = planeAt(rayAt(e.clientX, e.clientY), lamp.y);
    if (f && inZone(f[0], f[1])) { lamp.x = f[0]; lamp.z = f[1]; lamp.moved = true; }
  });
  const lampGo = (e) => { if (lampBy === e.pointerId) lampBy = null; };
  handle.addEventListener("pointerup", lampGo);
  handle.addEventListener("pointercancel", lampGo);

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
    tools();
  };
  picks.forEach((b) => b.addEventListener("click", () => choose(b.dataset.world)));

  // One finger or the mouse turns the view; two fingers come closer and go back. In the breakroom,
  // one taken on a thing carries it instead, at the height it was taken by, so it moves as far as
  // the hand does; and the mouse, passing over a thing, marks it.
  const fingers = new Map();
  let spread = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (hint) hint.classList.add("is-gone");
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    spread = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
    if (fingers.size === 1) {
      const hit = thingAt(e.clientX, e.clientY);
      if (hit) hold(hit, e.pointerId);
    } else {
      putDown();                           // a second finger: the two of them zoom
    }
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    const was = fingers.get(e.pointerId);
    if (!was) {
      if (e.pointerType === "mouse" && !fingers.size) {
        const hit = thingAt(e.clientX, e.clientY);
        over = hit ? hit.th : null;
        canvas.style.cursor = over ? "pointer" : "grab";
      }
      return;
    }
    if (!now) return;
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (held && held.carry.pointerId === e.pointerId) {
      carry(e.clientX, e.clientY);
    } else if (fingers.size === 1) {
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
    if (held && held.carry.pointerId === e.pointerId) putDown();
    if (!fingers.size) {
      const hit = e.pointerType === "mouse" ? thingAt(e.clientX, e.clientY) : null;
      over = hit ? hit.th : null;
      canvas.style.cursor = over ? "pointer" : "grab";
    }
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { if (!fingers.size) over = null; });
  // The wheel belongs to the view while it can still move it. Once the eye is as near or as far
  // as it may be, the wheel is the page's again, so scrolling past the stage never gets stuck.
  canvas.addEventListener("wheel", (e) => {
    if (zoomBy(Math.exp(e.deltaY * 0.001))) e.preventDefault();
  }, { passive: false });

  // Nothing is fetched until the stage is near the screen, and nothing is drawn while it is off it.
  const first = shownHere;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      const near = entries[entries.length - 1].isIntersecting;
      if (near && !now) choose(first);
      if (app) app.autoRender = near;
    }, { rootMargin: "300px" }).observe(stage);
  } else {
    choose(first);
  }
};
document.querySelectorAll(".worlds-stage[data-world]").forEach(worldsViewer);
