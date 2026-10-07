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

  // The head is a model and the body is generated, which is the right split:
  // the body is the part that animates, winding on from the tail, and a carved
  // head is the part code is worst at. Six attempts at building one proved
  // that, and a turntable of all eight angles proved it rather than one frame
  // of the running sequence proving nothing.
  const HEAD_URL = "assets/models/quetzalcoatl.glb";

  const HEAD = 7.2;                 // head size against the neck's thickness

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

  // ---- surfaces ----
  // The scan's stone is most of why it reads as carved, and a flat colour is
  // most of why ours reads as plastic. Both of these are drawn once into a
  // canvas and handed over as a map.

  // Scales. Rows of overlapping arcs, offset every other row, dark at the belly
  // and light along the back, which is the v axis of the tube.
  const scaleTexture = (device, s) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const c = cv.getContext("2d");
    // Dark between, bright on. The first pass drew green scales on a green
    // ground a few values apart and the whole thing averaged back to flat.
    // The map was reaching the mesh the entire time; it had nothing in it.
    c.fillStyle = "#0d2418";
    c.fillRect(0, 0, s, s);
    // Few per tile, because the tiling multiplies them. At fourteen across
    // and twenty six tiles there were three hundred and sixty scales down a
    // body four hundred pixels long, which averages to a flat colour.
    const rows = 8, cols = 10;
    const rh = s / rows, cw = s / cols;
    for (let r = 0; r < rows; r++) {
      for (let k = -1; k <= cols; k++) {
        const x = (k + (r % 2 ? 0.5 : 0)) * cw, y = r * rh;
        // lighter along the back, which is the middle of the v range
        const back = 1 - Math.abs(y / s - 0.5) * 2;
        const l = 0.42 + 0.95 * back;
        c.beginPath();
        c.ellipse(x + cw / 2, y + rh * 0.35, cw * 0.56, rh * 0.78, 0, 0, Math.PI * 2);
        c.fillStyle = `rgb(${Math.round(38 * l)},${Math.round(150 * l)},${Math.round(104 * l)})`;
        c.fill();
        c.strokeStyle = "rgba(6,20,13,0.9)";
        c.lineWidth = 1.6;
        c.stroke();
      }
    }
    const t = new pc.Texture(device, { width: s, height: s, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.addressU = t.addressV = pc.ADDRESS_REPEAT;
    t.setSource(cv);
    return t;
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
    mat.diffuse = new pc.Color(0.80, 0.80, 0.80);
    mat.diffuseMap = scaleTexture(app.graphicsDevice, 256);
    mat.diffuseMapTiling = new pc.Vec2(5, 1);
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
    // Built, not loaded. It hangs off a socket at the end of the curve.
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


    const asset = new pc.Asset("quetzalcoatl", "container", { url: HEAD_URL });
    app.assets.add(asset);
    app.assets.load(asset);
    asset.ready(() => {
      const e = asset.resource.instantiateRenderEntity();
      // Lifted out of the dark without washing out its own colour, which is
      // most of what it is bringing: it is painted rather than grey stone.
      e.findComponents("render").forEach((r) => {
        r.meshInstances.forEach((m) => {
          m.material.emissive = new pc.Color(0.16, 0.15, 0.12);
          m.material.emissiveIntensity = 0.40;
          m.material.update();
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
        // It faces +Z and the socket looks down -Z, so it is turned about.
        inner.setLocalEulerAngles(0, 180, 0);
        socket.addChild(inner);
      } else {
        socket.addChild(e);
      }
    });
    asset.on("error", () => console.warn("[serpent] no " + HEAD_URL + ", running without a head"));

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
