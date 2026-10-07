// Quetzalcoatl, coiling.
//
// What goes behind the capture, after four attempts at a many armed deity and
// one at drawing it flat. The problem every one of them ran into is that the
// camera here orbits and never stops, so anything with a front and a back shows
// its back once a turn. A figure standing behind him has that problem. A disc
// facing the camera solves it by being flat, which also makes it scenery.
//
// A serpent wound around him does not have the problem at all. A helix is
// distributed through every direction by construction, so there is serpent at
// any yaw you look from, and unlike the disc it is in the same space he is
// rather than pinned behind him.
//
// It also gives the beat something to do. The reference's climax is not that a
// deity is present, it is that the arms unfold. This one winds on from the tail
// and climbs, so the arrival is an event and not a fade.
//
// The head is the one part not generated here. A carved serpent head is the
// thing code is worst at and a scan is best at, so it loads separately and this
// file leaves it a socket at the end of the curve.
(() => {
  const RINGS = 260;        // steps along the body
  const SIDES = 10;         // around the tube
  // Chosen so the last turn lands the head out in front and to one side.
  // At 2.35 it finished round the back, where his own head covered it.
  const TURNS = 2.12;
  // Tall and narrow, but not tight. Built as wide as it was high the view sat
  // inside the coil; built at this radius times two thirds it crossed his
  // chest and his hands at every turn and he was furniture inside it. Here it
  // passes clear of his body on both sides, which is what lets the wrap be
  // read at all: you can see the near half in front of him and the far half
  // going behind.
  const RAD_MIN = 0.62;
  const RAD_MAX = 0.88;
  // The head rides at the top of this, so it ends below the frame's edge
  // rather than at it.
  const Y0 = -1.50, Y1 = 1.05;

  const TAU = Math.PI * 2;

  const HAND_MADE = true;           // false goes back to the scan
  const HEAD_URL = "quetzalcoatl.glb";
  const HEAD = 7.2;                 // head size against the neck's thickness
  // The scan's snout runs along its own Y and the ruff lies in XZ, so it is
  // turned a quarter round X to put the snout down the curve. Which way round
  // that quarter goes was not guessable and was not guessed: at -90 the open
  // back faced the camera and all that showed was the plug.
  const HEAD_ROT = [90, 0, 0];

  // Where the body is at u along its length, 0 at the tail, 1 at the head.
  // The radius breathes a little so the coil is not a lathe part, and it draws
  // in as it climbs, so the head ends up closer than the tail.
  const curve = (u) => {
    const a = u * TURNS * TAU;
    const r = RAD_MAX + (RAD_MIN - RAD_MAX) * u + Math.sin(u * 7.1) * 0.055;
    const y = Y0 + (Y1 - Y0) * (u * 0.82 + u * u * 0.18) + Math.sin(a * 2.0) * 0.045;
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  };

  // How thick the body is at u. Thin at the tail, thickest around a third of
  // the way along, tapering again into the neck.
  const girth = (u) => {
    const t = Math.min(1, u / 0.34);
    const swell = Math.sin(Math.min(1, u) * Math.PI) * 0.55 + 0.45;
    // Thin enough that he stays the subject. At twice this the coil crossed
    // his chest and he was furniture inside it.
    return (0.030 + 0.092 * t) * swell;
  };

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const norm = (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };

  // The tube. Frames are carried along the curve rather than rebuilt from a
  // fixed up vector, because a coil passes through vertical and a fixed up
  // makes the cross section flip over when it does.
  const build = () => {
    const pos = [], nrm = [], uv = [], idx = [];
    let up = [0, 1, 0];
    for (let i = 0; i <= RINGS; i++) {
      const u = i / RINGS;
      const c = curve(u);
      const ahead = curve(Math.min(1, u + 1 / RINGS));
      const behind = curve(Math.max(0, u - 1 / RINGS));
      const tan = norm(sub(ahead, behind));
      let side = cross(tan, up);
      if (Math.hypot(side[0], side[1], side[2]) < 1e-4) side = cross(tan, [1, 0, 0]);
      side = norm(side);
      up = norm(cross(side, tan));
      const g = girth(u);
      for (let s = 0; s < SIDES; s++) {
        const a = (s / SIDES) * TAU;
        const ca = Math.cos(a), sa = Math.sin(a);
        // The belly is flatter than the back, the way a snake's is.
        const squash = 0.78 + 0.22 * Math.abs(ca);
        const nx = side[0] * ca + up[0] * sa;
        const ny = side[1] * ca + up[1] * sa;
        const nz = side[2] * ca + up[2] * sa;
        pos.push(c[0] + nx * g * squash, c[1] + ny * g * squash, c[2] + nz * g * squash);
        nrm.push(nx, ny, nz);
        // u along the body is what the reveal reads, so it travels in the
        // shader rather than needing the buffer rebuilt every frame.
        uv.push(u, s / SIDES);
      }
    }
    for (let i = 0; i < RINGS; i++) {
      for (let s = 0; s < SIDES; s++) {
        const a = i * SIDES + s, b = i * SIDES + (s + 1) % SIDES;
        idx.push(a, a + SIDES, b, b, a + SIDES, b + SIDES);
      }
    }
    return { pos, nrm, uv, idx };
  };

  // The feathers: flat blades standing off the spine, laid in two ranks, every
  // one carrying the same u so they appear with the length of body they sit on.
  const feathers = () => {
    const pos = [], nrm = [], uv = [], idx = [];
    // Few enough to be separate. At 86 they overlapped into one continuous
    // sawtooth band running the length of the body, which reads as a crest or
    // a ribbon, not as plumes. The carving has gaps between every feather.
    const N = 46;
    let up = [0, 1, 0];
    for (let i = 0; i < N; i++) {
      const u = 0.06 + (i / N) * 0.90;
      const c = curve(u);
      const tan = norm(sub(curve(Math.min(1, u + .004)), curve(Math.max(0, u - .004))));
      let side = norm(cross(tan, up));
      up = norm(cross(side, tan));
      const g = girth(u);
      const len = (0.07 + 0.16 * Math.sin(u * Math.PI)) * (0.50 + 0.95 * ((i * 0.618) % 1));
      // Splayed, and not the same pair twice. Two blades at a fixed angle the
      // whole way along is a fin; the lean walks so they fan out.
      const splay = 0.30 + 0.45 * ((i * 0.382) % 1);
      for (const lean of [-splay, splay]) {
        const bx = side[0] * lean + up[0], by = side[1] * lean + up[1], bz = side[2] * lean + up[2];
        const b = norm([bx, by, bz]);
        const root = [c[0] + b[0] * g * .8, c[1] + b[1] * g * .8, c[2] + b[2] * g * .8];
        const tip = [root[0] + b[0] * len, root[1] + b[1] * len, root[2] + b[2] * len];
        // A leaf, not a spike. The feathers on the carved head are rounded
        // blades that swell away from the root and come to a point, and a
        // ruff of triangles standing straight off the spine read as a
        // stegosaurus instead. Narrow at the root, widest at a third, tapered.
        const w = g * 0.62;
        const base = pos.length / 3;
        const along = (k) => [
          root[0] + (tip[0] - root[0]) * k,
          root[1] + (tip[1] - root[1]) * k,
          root[2] + (tip[2] - root[2]) * k,
        ];
        const SHAPE = [[0, .22], [.34, 1.0], [.72, .72], [1, 0]];
        for (const [k, half] of SHAPE) {
          const c2 = along(k);
          pos.push(c2[0] - tan[0] * w * half, c2[1] - tan[1] * w * half, c2[2] - tan[2] * w * half);
          pos.push(c2[0] + tan[0] * w * half, c2[1] + tan[1] * w * half, c2[2] + tan[2] * w * half);
          nrm.push(b[0], b[1], b[2]); nrm.push(b[0], b[1], b[2]);
          uv.push(u, k); uv.push(u, k);
        }
        for (let k = 0; k < SHAPE.length - 1; k++) {
          const a0 = base + k * 2;
          idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
        }
      }
    }
    return { pos, nrm, uv, idx };
  };

  // ---- the head, built rather than scanned ----
  //
  // The scan was a stand in. This one is possible where a Buddha's head was not,
  // and the reason is the carving itself: a Teotihuacan serpent head is made of
  // geometric solids by design. A box for the snout, a slab for each jaw, cones
  // for the teeth, concentric rings for the eye, a swept tube for the spiral at
  // the temple, leaf blades for the ruff. There is no organic surface anywhere
  // in it and no face to get wrong. That is the whole difference.
  //
  // Built with the snout down -Z and up at +Y, which is what the socket wants,
  // so it drops into the same place the scan did.

  // A box. Eight corners, six quads, flat normals, which is right for a thing
  // that is carved rather than grown.
  const box = (o, c, h, skewTop) => {
    const b = o.pos.length / 3;
    const st = skewTop || 0;
    const X = [-h[0], h[0]];
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      // the top face narrows toward the snout, so the muzzle tapers
      const k = sy > 0 ? 1 - st * (sz < 0 ? 1 : 0) : 1;
      o.pos.push(c[0] + sx * h[0] * k, c[1] + sy * h[1], c[2] + sz * h[2]);
      o.nrm.push(sx, sy, sz);
      o.uv.push(0, 0);
    }
    const q = (a, b2, c2, d) => o.idx.push(b + a, b + b2, b + c2, b + a, b + c2, b + d);
    q(0,1,3,2); q(4,6,7,5); q(0,4,5,1); q(2,3,7,6); q(0,2,6,4); q(1,5,7,3);
    void X;
  };

  // A cone, for a tooth.
  const cone = (o, c, r, hgt, dir) => {
    const b = o.pos.length / 3, N = 6;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      o.pos.push(c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r);
      o.nrm.push(Math.cos(a), 0, Math.sin(a)); o.uv.push(0, 0);
    }
    o.pos.push(c[0], c[1] + hgt * dir, c[2]); o.nrm.push(0, dir, 0); o.uv.push(0, 1);
    for (let i = 0; i < N; i++) o.idx.push(b + i, b + (i + 1) % N, b + N);
  };

  // A flat ring, for the eye and for the spiral's coils.
  const ring = (o, c, r0, r1, nz) => {
    const b = o.pos.length / 3, N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      o.pos.push(c[0] + ca * r0, c[1] + sa * r0, c[2]);
      o.nrm.push(0, 0, nz); o.uv.push(0, 0);
      o.pos.push(c[0] + ca * r1, c[1] + sa * r1, c[2]);
      o.nrm.push(0, 0, nz); o.uv.push(0, 0);
    }
    for (let i = 0; i < N; i++) {
      const a = b + i * 2, d = b + ((i + 1) % N) * 2;
      o.idx.push(a, a + 1, d, d, a + 1, d + 1);
    }
  };

  const headMesh = () => {
    const o = { pos: [], nrm: [], uv: [], idx: [] };
    // the muzzle, tapering toward the snout
    box(o, [0, 0.10, -0.42], [0.20, 0.13, 0.42], 0.22);
    // the brow, wider and squarer, where the ruff sits behind it
    box(o, [0, 0.14, 0.02], [0.25, 0.17, 0.16], 0);
    // the lower jaw, set forward and a shade narrower
    box(o, [0, -0.17, -0.46], [0.175, 0.085, 0.40], 0.14);
    // the lip over the jaw, the raised band in the carving
    box(o, [0, -0.06, -0.80], [0.19, 0.035, 0.08], 0);
    // the block on the snout tip
    box(o, [0, 0.235, -0.78], [0.075, 0.045, 0.085], 0);
    // teeth, upper pointing down and lower pointing up
    for (let i = 0; i < 4; i++) {
      const z = -0.30 - i * 0.16;
      for (const sx of [-1, 1]) {
        cone(o, [sx * 0.125, -0.02, z], 0.035, 0.085, -1);
        cone(o, [sx * 0.115, -0.11, z - 0.07], 0.030, 0.075, 1);
      }
    }
    // the eye: a ring with a ball in it, on each cheek
    for (const sx of [-1, 1]) {
      const n = sx;
      ring(o, [sx * 0.205, 0.17, -0.20], 0.055, 0.095, n);
      ring(o, [sx * 0.215, 0.17, -0.20], 0.0, 0.050, n);
      // the spiral at the temple, drawn as three rings stepping inward
      ring(o, [sx * 0.205, 0.12, 0.00], 0.085, 0.115, n);
      ring(o, [sx * 0.212, 0.13, 0.02], 0.045, 0.072, n);
      ring(o, [sx * 0.218, 0.14, 0.04], 0.0, 0.032, n);
    }
    // the ruff: leaf blades radiating from behind the brow, the same blade the
    // body wears, so the head is not a different object stuck on the end
    const N = 13;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Shorter than the first pass. At three times the muzzle's length the
      // ruff was the whole object and the head was a chip in the middle of it.
      const len = 0.20 + 0.09 * ((i * 0.618) % 1);
      const rootR = 0.185;
      const root = [ca * rootR, 0.12 + sa * rootR, 0.10];
      const tip = [ca * (rootR + len), 0.12 + sa * (rootR + len), 0.13];
      const w = 0.062;
      const px = -sa * w, py = ca * w;
      const b = o.pos.length / 3;
      const SHAPE = [[0, .30], [.36, 1.0], [.74, .70], [1, 0]];
      for (const [k, half] of SHAPE) {
        const c2 = [root[0] + (tip[0] - root[0]) * k, root[1] + (tip[1] - root[1]) * k,
                    root[2] + (tip[2] - root[2]) * k];
        o.pos.push(c2[0] - px * half, c2[1] - py * half, c2[2]);
        o.pos.push(c2[0] + px * half, c2[1] + py * half, c2[2]);
        o.nrm.push(0, 0, 1); o.nrm.push(0, 0, 1);
        o.uv.push(0, 0); o.uv.push(0, 0);
      }
      for (let k = 0; k < SHAPE.length - 1; k++) {
        const a0 = b + k * 2;
        o.idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
      }
    }
    return o;
  };

  const mesh = (app, d) => {
    const m = new pc.Mesh(app.graphicsDevice);
    m.setPositions(d.pos);
    m.setNormals(d.nrm);
    m.setUvs(0, d.uv);
    m.setIndices(d.idx);
    m.update(pc.PRIMITIVE_TRIANGLES);
    return m;
  };

  window.makeSerpent = (app) => {
    const body = mesh(app, build());
    const plumeData = feathers();
    const plume = mesh(app, plumeData);
    const plumeTris = plumeData.idx.length / 3;

    // Quetzal green into gold, shifting with the angle of view, which is what
    // makes a feathered thing read as feathered rather than as painted.
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.045, 0.235, 0.205);
    mat.specular = new pc.Color(0.95, 0.82, 0.35);
    mat.gloss = 0.80;
    mat.useMetalness = true;
    mat.metalness = 0.72;
    mat.emissive = new pc.Color(0.02, 0.105, 0.095);
    mat.emissiveIntensity = 0.7;
    // Opaque, and this is not a style choice. Transparent, it never wrote depth,
    // and neither does the splat pass, so there was nothing for either to test
    // against and whichever drew last won the whole frame. In practice the
    // splat drew last and the serpent vanished behind him everywhere, which is
    // what he spotted: a coil that is supposed to wrap was only ever behind.
    // Writing depth is what makes the near half of the coil cross in front of
    // him and the far half go behind.
    mat.opacity = 1;
    mat.blendType = pc.BLEND_NONE;
    mat.depthWrite = true;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();

    // The head reads as carved stone with gold worked into it, not as the same
    // green as the body: in the carving the head is the stone and the feathers
    // are what carry the colour.
    const matH = mat.clone();
    matH.diffuse = new pc.Color(0.46, 0.42, 0.30);
    matH.specular = new pc.Color(0.70, 0.62, 0.38);
    matH.metalness = 0.35;
    matH.gloss = 0.42;
    matH.emissive = new pc.Color(0.13, 0.115, 0.075);
    matH.emissiveIntensity = 0.8;
    matH.update();

    const matF = mat.clone();
    matF.blendType = pc.BLEND_NONE;
    matF.depthWrite = true;
    matF.diffuse = new pc.Color(0.52, 0.42, 0.10);
    matF.emissive = new pc.Color(0.40, 0.28, 0.05);
    matF.emissiveIntensity = 0.95;
    matF.update();

    const root = new pc.Entity("serpent");
    const bodyE = new pc.Entity("serpent-body");
    bodyE.addComponent("render", {
      meshInstances: [new pc.MeshInstance(body, mat)],
      castShadows: false, receiveShadows: false,
    });
    const plumeE = new pc.Entity("serpent-plume");
    plumeE.addComponent("render", {
      meshInstances: [new pc.MeshInstance(plume, matF)],
      castShadows: false, receiveShadows: false,
    });
    root.addChild(bodyE);
    root.addChild(plumeE);

    // Its own raking light, so the coil has a lit side and a dark one. Lit only
    // by the scene it came out evenly bright, which is what made every earlier
    // figure read as a cut out shape.
    const key = new pc.Entity("serpent-key");
    key.addComponent("light", {
      type: "directional", color: new pc.Color(1.0, 0.95, 0.80),
      intensity: 3.4, castShadows: false,
    });
    key.setEulerAngles(24, 38, 0);
    root.addChild(key);

    // ---- the head ----
    // The one piece not generated. A carved serpent head is what code is worst
    // at and a scan is best at. It hangs off a socket at the end of the curve,
    // so if the file is not there the body still runs.
    //
    // The scan is a temple ornament from the Templo de Quetzalcoatl, made to
    // project from a wall, so its back is open. He saw the hole before I did.
    // It gets a cap, and the neck of the body comes into the same place, so
    // between them nothing shows.
    const socket = new pc.Entity("serpent-head");
    root.addChild(socket);
    {
      const u = 1.0;
      const c = curve(u);
      const tan = norm(sub(curve(u), curve(u - 0.01)));
      socket.setLocalPosition(c[0], c[1], c[2]);
      // Tipped in and down off the tangent. Aimed straight along the curve the
      // snout pointed up and out of the frame, at nothing.
      // Turned in toward the axis and down, not along the curve. Aimed along
      // the tangent the snout points out of the frame, and at whatever yaw the
      // camera happens to be at, away from it. Pointing in and down means the
      // head is seen in profile or three quarters from every angle, which is
      // the only orientation that survives a view that never stops turning.
      const aim = norm([-c[0] * 1.0 + tan[0] * 0.30, -0.52 + tan[1] * 0.25,
                        -c[2] * 1.0 + tan[2] * 0.30]);
      socket.lookAt(c[0] + aim[0], c[1] + aim[1], c[2] + aim[2]);
      const g = girth(0.72);          // the neck, not the tail
      socket.setLocalScale(g * HEAD, g * HEAD, g * HEAD);
    }

    // the cap, a shade darker than the stone so it reads as shadow inside
    const cap = new pc.Entity("serpent-head-cap");
    cap.addComponent("render", { type: "cylinder", castShadows: false, receiveShadows: false });
    const capMat = new pc.StandardMaterial();
    capMat.diffuse = new pc.Color(0.26, 0.25, 0.19);
    capMat.specular = new pc.Color(0.05, 0.05, 0.05);
    capMat.gloss = 0.1;
    capMat.update();
    cap.render.meshInstances[0].material = capMat;
    // Inside the open back, which is at +Z once the head is turned, and small
    // enough to sit within the ruff rather than over it. At full ruff width it
    // was a black disc laid over the carving.
    cap.setLocalEulerAngles(90, 0, 0);
    cap.setLocalScale(0.42, 0.05, 0.42);
    cap.setLocalPosition(0, 0, 0.17);
    cap.enabled = false;
    socket.addChild(cap);

    if (HAND_MADE) {
      const hm = mesh(app, headMesh());
      const he = new pc.Entity("head-built");
      he.addComponent("render", {
        meshInstances: [new pc.MeshInstance(hm, matH)],
        castShadows: false, receiveShadows: false,
      });
      socket.addChild(he);
      cap.enabled = false;              // nothing is open, so nothing to plug
    } else {
      const asset = new pc.Asset("quetzalcoatl", "container", { url: HEAD_URL });
      app.assets.add(asset);
      app.assets.load(asset);
      asset.ready(() => {
        const e = asset.resource.instantiateRenderEntity();
        e.findComponents("render").forEach((r) => {
          r.meshInstances.forEach((m) => {
            const mm = m.material;
            mm.emissive = new pc.Color(0.20, 0.18, 0.13);
            mm.emissiveIntensity = 0.38;
            mm.useMetalness = false;
            mm.gloss = 0.35;
            mm.update();
          });
        });
        const mi = [];
        e.findComponents("render").forEach((r) => mi.push(...r.meshInstances));
        let aabb = null;
        mi.forEach((m) => { aabb = aabb ? (aabb.add(m.aabb), aabb) : m.aabb.clone(); });
        if (aabb) {
          const c = aabb.center, h = aabb.halfExtents;
          const span = Math.max(h.x, h.y, h.z) * 2;
          const inner = new pc.Entity("head-fit");
          inner.addChild(e);
          e.setLocalPosition(-c.x / span, -c.y / span, -c.z / span);
          inner.setLocalScale(1 / span, 1 / span, 1 / span);
          inner.setLocalEulerAngles(HEAD_ROT[0], HEAD_ROT[1], HEAD_ROT[2]);
          socket.addChild(inner);
        } else {
          socket.addChild(e);
        }
        cap.enabled = true;
      });
      asset.on("error", () => console.warn("[serpent] no " + HEAD_URL));
    }

    return {
      root,
      // How much of the body exists, measured from the tail. It has to travel
      // along the length, not fade the whole thing up at once, or the arrival
      // is a dissolve and the coiling is never seen, which was the only reason
      // to choose a serpent over a disc.
      //
      // Both meshes are generated tail first, so the triangles for the first
      // stretch of body are the first ones in the index buffer. Drawing fewer
      // of them is the whole animation: no shader, no rebuilding the buffers,
      // just how far down the list to stop.
      reveal(v) {
        const k = Math.max(0, Math.min(1, v));
        root.enabled = k > 0.001;
        if (!root.enabled) return;
        if (mat.opacity !== 1) { mat.opacity = 1; matF.opacity = 1; mat.update(); matF.update(); }
        // eased so it rushes on and settles, rather than arriving at a crawl
        const e = k * k * (3 - 2 * k);
        const seg = Math.max(1, Math.round(e * RINGS));
        body.primitive[0].count = seg * SIDES * 6;
        // the feathers follow the body they sit on, a little behind it
        const fe = Math.max(0, e * 1.12 - 0.12);
        plume.primitive[0].count = Math.round(fe * plumeTris) * 3;
      },
      heat(v) {
        const k = Math.max(0, Math.min(1, v));
        mat.emissiveIntensity = 0.7 + k * 0.8;
        matF.emissiveIntensity = 0.95 + k * 1.1;
        mat.update(); matF.update();
      },
    };
  };
})();
