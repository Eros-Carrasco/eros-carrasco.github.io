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
  // Where the coil starts round him, and how far it goes, are set by the
  // camera and not by taste. The camera spins at a known rate and resets to
  // the front at the swap, so its angle at the second the head appears and
  // at the second it lands are both fixed numbers. PHASE puts the first
  // heading in profile to that first angle, snout toward screen right, which
  // is the diagonal he drew; without it the snout pointed straight down the
  // view and the first half second showed a disc of feathers with no head in
  // it. TURNS, inside the one and a half to two he left open, is the count
  // that brings the last heading round to face the camera where it is at the
  // landing, so the settle has almost nothing left to turn.
  const PHASE = -1.36;
  const TURNS = 1.45;
  // Tall and narrow, but not tight. Built as wide as it was high the view sat
  // inside the coil; built at this radius times two thirds it crossed his
  // chest and his hands at every turn and he was furniture inside it. Here it
  // passes clear of his body on both sides, which is what lets the wrap be
  // read at all: you can see the near half in front of him and the far half
  // going behind.
  // Measured off his silhouette: his shoulders reach about 0.52 of a unit
  // out from the axis in this space, so a coil ending at 0.34 put the head
  // inside his shoulder and in front of his face. It ends just outside now.
  const RAD_MIN = 0.56;
  const RAD_MAX = 0.88;
  // The head rides at the top of this, so it ends below the frame's edge
  // rather than at it.
  const Y0 = -1.50, Y1 = 0.72;

  const TAU = Math.PI * 2;

  // The head is a model and the body is generated, which is the right split:
  // the body is the part that animates, winding on from the tail, and a carved
  // head is the part code is worst at. Six attempts at building one proved
  // that, and a turntable of all eight angles proved it rather than one frame
  // of the running sequence proving nothing.
  const HEAD_URL = "assets/models/quetzalcoatl.glb";

  const HEAD = 3.75;                // head size against the neck's thickness

  // Where the body is at u along its length, 0 at the tail, 1 at the head.
  // The radius breathes a little so the coil is not a lathe part, and it draws
  // in as it climbs, so the head ends up closer than the tail.
  // Before the coil there is a straight rise from below the bottom edge of
  // the box, which is the floor as far as the frame is concerned. The head
  // comes up out of it with neck already behind it, instead of appearing in
  // the air as a head on its own, which he said looked very strange, and he
  // was right. u runs from -RISE to 1: the rise, then the helix.
  const RISE = 0.12, DROP = 0.90;
  const curve = (u) => {
    if (u < 0) {
      const h0 = helix(0);
      // not clamped: what is further back than the rise is simply deeper
      const f = -u / RISE;
      return [h0[0], h0[1] - DROP * f, h0[2]];
    }
    return helix(u);
  };
  const helix = (u) => {
    const a = PHASE + u * TURNS * TAU;
    const r = RAD_MAX + (RAD_MIN - RAD_MAX) * u + Math.sin(u * 7.1) * 0.055;
    const y = Y0 + (Y1 - Y0) * (u * 0.82 + u * u * 0.18) + Math.sin(a * 2.0) * 0.045;
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  };

  // How thick the body is at u, where u runs from the tail at 0 to the neck at
  // 1. Thickest where it leaves the head and thinning the whole way down to the
  // tail, which is how a snake is built. It used to swell through the middle
  // and taper at both ends, so the fattest part of the animal was its waist.
  // Thickness by distance from the head, 0 at the nape and 1 at the tail. It
  // used to be a function of where on the path a ring sat, so the body was
  // thin behind the head for the whole climb and only fattened once the head
  // reached the top: a string tied to a mask, which is what he saw. The neck
  // is a bit over half the head's width, which is what a snake has.
  const girthS = (d) => 0.018 + 0.235 * Math.pow(Math.max(0, Math.min(1, 1 - d)), 1.45);

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

  // The serpent is a fixed length that slides along the path, head at k and
  // tail one body length behind it, which at the start is below the floor.
  // It used to be the path itself, drawn from its start up to wherever the
  // head had got to, which is why the body behind the head was a thread and
  // why the scales crawled: they were painted on the path and the animal
  // slid through them. Rebuilding the tube for each frame costs a few
  // thousand vertices, which is nothing.
  //
  // Frames are carried along the curve rather than rebuilt from a fixed up
  // vector, because a coil passes through vertical and a fixed up makes the
  // cross section flip over when it does.
  const L = 1 + RISE;
  const headAt = (e) => -RISE + Math.min(1, Math.max(0, e)) * L;
  // The last stretch of body leaves the centre of the back of the head, in
  // line with the head, whatever the head is doing. The path alone does not
  // give that: where the head turns off the path, to face the viewer, the neck
  // would carry straight on along the path and the two would meet at a kink.
  // So the centres nearest the head are pulled onto a straight line behind the
  // head's own facing, and the frames are then taken from the centres rather
  // than from the path, so the rings follow the bend.
  const NECK = 0.10;
  // where the head last looked, which the neck has to leave in line with
  let lastAim = [0, 0, 1];
  const buildBody = (e) => {
    const k = headAt(e);
    const nape = curve(k);
    const back = [-lastAim[0], -lastAim[1], -lastAim[2]];
    const centres = [];
    for (let i = 0; i <= RINGS; i++) {
      const sb = i / RINGS;                 // 0 at the tail, 1 at the head
      const d = 1 - sb;                     // distance from the head, as a share
      const u = k - d * L;
      const c = curve(u);
      if (d < NECK) {
        const dist = Math.hypot(c[0] - nape[0], c[1] - nape[1], c[2] - nape[2]);
        const t = [nape[0] + back[0] * dist, nape[1] + back[1] * dist, nape[2] + back[2] * dist];
        const x = (NECK - d) / NECK, w = x * x * (3 - 2 * x);
        centres.push([c[0] + (t[0] - c[0]) * w, c[1] + (t[1] - c[1]) * w, c[2] + (t[2] - c[2]) * w]);
      } else {
        centres.push(c);
      }
    }
    const pos = [], nrm = [], uv = [], idx = [];
    let up = [0, 1, 0];
    for (let i = 0; i <= RINGS; i++) {
      const sb = i / RINGS;
      const c = centres[i];
      const ahead = centres[Math.min(RINGS, i + 1)], behind = centres[Math.max(0, i - 1)];
      const tan = norm(sub(ahead, behind));
      let side = cross(tan, up);
      if (Math.hypot(side[0], side[1], side[2]) < 1e-4) side = cross(tan, [1, 0, 0]);
      side = norm(side);
      up = norm(cross(side, tan));
      const g = girthS(1 - sb);
      for (let sd = 0; sd < SIDES; sd++) {
        const a2 = (sd / SIDES) * TAU;
        const ca = Math.cos(a2), sa = Math.sin(a2);
        // The belly is flatter than the back, the way a snake's is.
        const squash = 0.78 + 0.22 * Math.abs(ca);
        const nx = side[0] * ca + up[0] * sa;
        const ny = side[1] * ca + up[1] * sa;
        const nz = side[2] * ca + up[2] * sa;
        pos.push(c[0] + nx * g * squash, c[1] + ny * g * squash, c[2] + nz * g * squash);
        nrm.push(nx, ny, nz);
        uv.push(sb, sd / SIDES);
      }
    }
    for (let i = 0; i < RINGS; i++) {
      for (let sd = 0; sd < SIDES; sd++) {
        const a2 = i * SIDES + sd, b2 = i * SIDES + (sd + 1) % SIDES;
        idx.push(a2, a2 + SIDES, b2, b2, a2 + SIDES, b2 + SIDES);
      }
    }
    return { pos, nrm, uv, idx };
  };

  // The feathers: leaf blades standing off the spine in two ranks, each at a
  // fixed distance behind the head, so they travel with the body.
  const N_FEATHERS = 46;
  const buildFeathers = (e) => {
    const k = headAt(e);
    const pos = [], nrm = [], uv = [], idx = [];
    let up = [0, 1, 0];
    for (let i = 0; i < N_FEATHERS; i++) {
      const d = 0.05 + (i / N_FEATHERS) * 0.90;     // distance from the head
      const u = k - d * L;
      const c = curve(u);
      const tan = norm(sub(curve(u + .004), curve(u - .004)));
      let side = norm(cross(tan, up));
      up = norm(cross(side, tan));
      const g = girthS(d);
      const len = (0.07 + 0.16 * Math.sin((1 - d) * Math.PI * 0.9)) * (0.50 + 0.95 * ((i * 0.618) % 1));
      // Splayed, and not the same pair twice. Two blades at a fixed angle the
      // whole way along is a fin; the lean walks so they fan out.
      const splay = 0.30 + 0.45 * ((i * 0.382) % 1);
      for (const lean of [-splay, splay]) {
        const bx = side[0] * lean + up[0], by = side[1] * lean + up[1], bz = side[2] * lean + up[2];
        const bv = norm([bx, by, bz]);
        const root = [c[0] + bv[0] * g * .8, c[1] + bv[1] * g * .8, c[2] + bv[2] * g * .8];
        const tip = [root[0] + bv[0] * len, root[1] + bv[1] * len, root[2] + bv[2] * len];
        // A leaf, not a spike: narrow at the root, widest at a third, tapered.
        const w = g * 0.62;
        const base = pos.length / 3;
        const along = (t2) => [root[0] + (tip[0] - root[0]) * t2, root[1] + (tip[1] - root[1]) * t2, root[2] + (tip[2] - root[2]) * t2];
        const SHAPE = [[0, .22], [.34, 1.0], [.72, .72], [1, 0]];
        for (const [t2, half] of SHAPE) {
          const c2 = along(t2);
          pos.push(c2[0] - tan[0] * w * half, c2[1] - tan[1] * w * half, c2[2] - tan[2] * w * half);
          pos.push(c2[0] + tan[0] * w * half, c2[1] + tan[1] * w * half, c2[2] + tan[2] * w * half);
          nrm.push(bv[0], bv[1], bv[2]); nrm.push(bv[0], bv[1], bv[2]);
          uv.push(0, t2); uv.push(1, t2);
        }
        for (let q = 0; q < SHAPE.length - 1; q++) {
          const a0 = base + q * 2;
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

  // A feather. Dark olive at the root, the carving's ochre through the vane,
  // its red at the tip, a dark shaft down the middle and faint barbs off it.
  // The blades were flat cards in one ochre with a hard edge, which is what
  // made them look cheap beside a painted head. u runs across the blade and v
  // along it from root to tip.
  const featherTexture = (device) => {
    const W = 64, H = 256;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0.00, "#1f331f");
    g.addColorStop(0.28, "#5e4323");
    g.addColorStop(0.70, "#6f4a22");
    g.addColorStop(1.00, "#4e1b12");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // Dark at both edges of the vane. At twenty pixels across, a feather is
    // its outline and its shaft and nothing finer; the barbs of the first pass
    // did not survive the size, and a pale edge made them read as sweets.
    const e = c.createLinearGradient(0, 0, W, 0);
    e.addColorStop(0.00, "rgba(10,8,4,0.70)");
    e.addColorStop(0.22, "rgba(10,8,4,0.0)");
    e.addColorStop(0.78, "rgba(10,8,4,0.0)");
    e.addColorStop(1.00, "rgba(10,8,4,0.70)");
    c.fillStyle = e;
    c.fillRect(0, 0, W, H);
    // the shaft, root to just short of the tip
    c.strokeStyle = "rgba(16,10,5,0.92)";
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H * 0.92); c.stroke();
    const t = new pc.Texture(device, { width: W, height: H, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.addressU = t.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
    t.setSource(cv);
    return t;
  };

  // Scales. Rows of overlapping arcs, offset every other row, dark at the belly
  // and light along the back, which is the v axis of the tube.
  const scaleTexture = (device, s) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const c = cv.getContext("2d");
    // Every colour here was read out of the head's own texture rather than
    // chosen: emerald at hue 150 is 30 percent of its painted pixels, the red
    // at hue 9 is 22 and the ochre at hue 30 is 22. Measured again on the
    // emerald itself: its painted pixels between hue 140 and 160 average
    // rgb 31, 71, 51, running from 26, 60, 41 in the shadow to 38, 102, 85 in
    // the light. The scales below run through that same range.
    //
    // Big, and few, and the contrast is in the fill. The map was reaching the
    // mesh the whole time, a red and green test proved it, and the body still
    // read as flat green on the page, because the only contrast in the map
    // was a stroke a pixel and a half wide between scales that were all one
    // value, and the mip chain averaged it away: at the width this tube has
    // on screen, eight rows round a body twenty pixels across are two and a
    // half pixels each. So four rows and six scales a tile, and each scale
    // runs from a light edge where it stands free to a dark base where the
    // next one covers it, over a gap darker than any green on the head.
    const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    c.fillStyle = "#08160e";
    c.fillRect(0, 0, s, s);
    const rows = 4, cols = 6;
    const rh = s / rows, cw = s / cols;
    for (let r = 0; r < rows; r++) {
      // lighter along the back, which is the middle of the v range
      const back = 1 - Math.abs((r + 0.5) / rows - 0.5) * 2;
      const l = 0.70 + 0.45 * back;
      const cy = (r + 0.5) * rh;
      // Drawn toward the head along x, so each scale lands over the base of
      // the one behind it and its free edge faces the tail, as they lie on a
      // snake. The gradient covers exactly the part left showing.
      for (let k = -1; k <= cols; k++) {
        const x0 = (k + (r % 2 ? 0.5 : 0)) * cw;
        const g = c.createLinearGradient(x0 - cw * 0.15, 0, x0 + cw * 0.85, 0);
        // Yellower in the map than the head's paint, because the head is
        // judged as it renders: under the warm key its hue 150 lands at 120,
        // and a body painted at 150 landed at 133 beside it, visibly bluer.
        // A bright free edge against the dark base of the next scale is what
        // reads as scales. Spread evenly across the scale the ramp was lost
        // under the key light's own shading of the tube.
        g.addColorStop(0, rgb(64 * l, 130 * l, 68 * l));
        g.addColorStop(0.30, rgb(40 * l, 90 * l, 46 * l));
        g.addColorStop(0.75, rgb(18 * l, 46 * l, 24 * l));
        g.addColorStop(1, rgb(9 * l, 24 * l, 13 * l));
        c.beginPath();
        c.ellipse(x0 + cw * 0.5, cy, cw * 0.64, rh * 0.46, 0, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = "rgba(6,16,10,0.95)";
        c.lineWidth = 4;
        c.stroke();
      }
    }
    const t = new pc.Texture(device, { width: s, height: s, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.addressU = t.addressV = pc.ADDRESS_REPEAT;
    // Sampled anisotropically, or none of the above survives: the v axis of
    // the map is wrapped round a tube twenty pixels wide, so across the tube
    // it is minified ten to one and more at the edges, and an isotropic mip
    // chain takes the length of the body down by the same factor. Shot at
    // 13.0 without this, with the big scales already in the map: still a
    // smooth tube.
    t.anisotropy = Math.min(16, device.maxAnisotropy || 16);
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
    const body = mesh(app, buildBody(0));
    const plume = mesh(app, buildFeathers(0));
    const refresh = (m2, d) => {
      m2.setPositions(d.pos); m2.setNormals(d.nrm); m2.setUvs(0, d.uv);
      m2.update(pc.PRIMITIVE_TRIANGLES);
    };

    // Quetzal green into gold, shifting with the angle of view, which is what
    // makes a feathered thing read as feathered rather than as painted.
    const mat = new pc.StandardMaterial();
    // At one, not 0.8: the map's greens were measured off the head, and a
    // multiplier under one was darkening them by a fifth before the light
    // touched them.
    mat.diffuse = new pc.Color(1, 1, 1);
    mat.diffuseMap = scaleTexture(app.graphicsDevice, 256);
    mat.diffuseMapTiling = new pc.Vec2(5, 1);
    mat.specular = new pc.Color(0.20, 0.19, 0.14);
    // Matte, like the head. At metalness 0.72 and gloss 0.8 the map only had
    // 28 percent of the surface and the rest was one bright line of highlight
    // down a dark tube, so no scale could read whatever was drawn in it, and
    // the head beside it is painted stone with no metal in its material at
    // all. Shot at 13.0 with the new map and the old material: still a flat
    // tube.
    // Matte, like the head, which is painted stone with no shine on it. At
    // gloss 0.80 the body was polished plastic beside it and at 0.55 still
    // read as wet. He said the two did not look like one animal; this is why.
    mat.gloss = 0.30;
    mat.useMetalness = false;
    // The head's own hue, 150, not the teal this was. It is the colour of the
    // shadow side and of the glow on arrival, and at hue 173 it was pulling
    // the whole body colder than the head.
    mat.emissive = new pc.Color(0.025, 0.085, 0.058);
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
    matF.diffuse = new pc.Color(1, 1, 1);
    matF.diffuseMap = featherTexture(app.graphicsDevice);
    matF.diffuseMapTiling = new pc.Vec2(1, 1);
    matF.specular = new pc.Color(0.16, 0.14, 0.10);
    matF.gloss = 0.28;
    matF.useMetalness = false;
    matF.emissive = new pc.Color(0.06, 0.04, 0.02);
    matF.emissiveIntensity = 0.35;
    matF.blendType = pc.BLEND_NONE;
    matF.depthWrite = true;
    matF.cull = pc.CULLFACE_NONE;
    matF.update();
    // what heat() scales from
    const baseGlow = mat.emissiveIntensity, baseGlowF = matF.emissiveIntensity;

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
      intensity: 1.6, castShadows: false,
    });
    key.setEulerAngles(24, 38, 0);
    root.addChild(key);

    // ---- the head ----
    // Built, not loaded. It hangs off a socket at the end of the curve.
    const socket = new pc.Entity("serpent-head");
    root.addChild(socket);

    // The head leads and the body comes out behind it, which is how a snake
    // arrives and is not what this did at first: the tail wrote itself up the
    // coil and the head only turned up at the end, on top of a serpent that was
    // already all there. So the socket rides the leading edge rather than
    // sitting at the end of the curve, and the reveal moves it.
    let camYaw = null;
    let hhS = null, lastP = 0;
    // One rule. The head looks the way it is moving, taken from its own
    // velocity along the path, and when it is not moving sideways, which is
    // while it rises straight up out of the floor and once it has come to rest
    // on his shoulder, it looks at the viewer. That one rule replaced four
    // overlapping fixes, one for the birth, one for the start, one for the
    // landing and one for a snap between two of them, and he was right that
    // without it this was never going to stop being guesswork.
    //
    // The heading is smoothed in progress rather than in wall time so the
    // measuring page, which steps the climb without a clock, gets the same
    // behaviour as the running page.
    const placeHead = (pIn) => {
      const pr = Math.min(1, Math.max(0, pIn));
      const e = 1 - Math.pow(1 - pr, 2.0);
      const k = headAt(e);
      const c = curve(k);
      const dd = 0.006;
      const v = sub(curve(k + dd), curve(k - dd));
      const vl = Math.hypot(v[0], v[1], v[2]) || 1e-6;
      const dir = [v[0] / vl, v[1] / vl, v[2] / vl];
      // speed along the path per unit of progress, with the ease folded in
      const speed = (vl / (2 * dd)) * L * 2 * (1 - pr);
      const flat = Math.hypot(dir[0], dir[2]);
      const hspeed = speed * flat;
      const camHead = camYaw === null ? 0 : camYaw * Math.PI / 180;
      const ha = flat > 1e-3 ? Math.atan2(dir[0], dir[2]) : camHead;
      // rest goes to one as sideways movement dies away, which happens on the
      // rise and in the last tenth of the climb and nowhere else
      const xr = Math.min(1, hspeed / 1.5);
      const rest = 1 - xr * xr * (3 - 2 * xr);
      let dA = camHead - ha;
      while (dA > Math.PI) dA -= TAU;
      while (dA < -Math.PI) dA += TAU;
      const want = ha + dA * rest;
      // the smoothing, by progress
      if (hhS === null || pr < lastP) hhS = want;
      let dS = want - hhS;
      while (dS > Math.PI) dS -= TAU;
      while (dS < -Math.PI) dS += TAU;
      hhS += dS * (1 - Math.exp(-(pr - lastP) / 0.05));
      lastP = pr;
      // Never still. Three slow waves at frequencies that do not divide into
      // each other, so it casts about instead of tracking like a bead on a
      // wire. Quieter when it is at rest, so the settle reads as a settle.
      const w = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
      const calm = 1 - 0.6 * rest;
      const sway = [(Math.sin(w * 0.83) * 0.20 + Math.sin(w * 0.37 + 2.1) * 0.09) * calm,
                    (Math.sin(w * 0.61 + 1.7) * 0.13) * calm,
                    (Math.cos(w * 0.71 + 0.4) * 0.20 + Math.cos(w * 0.29 + 0.8) * 0.08) * calm];
      const pitch = dir[1] * (1 - rest) * 0.85 + 0.18 * rest - 0.05;
      const pl = Math.max(0.35, flat * (1 - rest) + 0.9 * rest);
      const aim = norm([Math.sin(hhS) * pl + sway[0], pitch + sway[1], Math.cos(hhS) * pl + sway[2]]);
      socket.setLocalPosition(c[0], c[1], c[2]);
      socket.lookAt(c[0] + aim[0], c[1] + aim[1], c[2] + aim[2]);
      lastAim = aim;
      // Fixed. It had read the body's girth at wherever the head happened to
      // be, so it grew and shrank as it travelled. Heads do not do that.
      const g = girthS(0.05);
      socket.setLocalScale(g * HEAD, g * HEAD, g * HEAD);
    };
    placeHead(0);

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
        // Pushed forward by half its own depth, so the back of the head sits
        // on the socket, which is where the body ends. Centred on the socket
        // the body ran into the middle of the skull and read as coming out
        // of somewhere lower down. The scan is 0.74 deep for 1.0 across.
        inner.setLocalPosition(0, 0, -0.37);
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
      reveal(v, yawDeg) {
        camYaw = (yawDeg === undefined || yawDeg === null) ? null : yawDeg;
        const k = Math.max(0, Math.min(1, v));
        root.enabled = k > 0.001;
        // the smoothed heading starts fresh with the climb, so the first
        // visible frame is not easing out of wherever the head was built
        if (!root.enabled) { hhS = null; return; }
        if (mat.opacity !== 1) { mat.opacity = 1; matF.opacity = 1; mat.update(); matF.update(); }
        // Eased out: it comes up out of the floor at speed and slows into the
        // shoulder. Eased both ways it sat underground for most of a second,
        // and a settle that arrives at a crawl is the right end of the two.
        const e = 1 - Math.pow(1 - k, 2.0);
        placeHead(k);
        refresh(body, buildBody(e));
        refresh(plume, buildFeathers(e));
      },
      // Scales what the materials already carry. It used to write fixed
      // numbers over them every frame, and the feathers' was 2.05, which is
      // why they glowed yellow whatever their texture said.
      heat(v) {
        const k = Math.max(0, Math.min(1, v));
        mat.emissiveIntensity = baseGlow * (1 + 0.8 * k);
        matF.emissiveIntensity = baseGlowF * (1 + 0.6 * k);
        mat.update(); matF.update();
      },
    };
  };
})();
