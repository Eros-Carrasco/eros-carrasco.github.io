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
  // Laid out for a camera in front and a scene that is not turning, which is
  // how he asked for it to be judged, against his drawing. The coil begins at
  // his right side, where the diagonal lead in delivers the head, climbs away
  // behind him, crosses in front of his torso once, and arrives beside his
  // left shoulder moving toward the viewer. That last part is the point: the
  // head reaches the shoulder already facing front because that is the way it
  // is travelling, so there is no turn to make on arrival. An earlier layout
  // ended moving sideways and the head swung ninety degrees on the spot,
  // which was the extreme turn he kept seeing. Start at ninety degrees; one
  // and seven twelfths of a turn brings the end to three hundred.
  const PHASE = 1.571;
  // His drawing: one wide turn climbing on a diagonal, crossing in front of
  // his torso once and finishing at his shoulder. It had been 1.45 tight
  // turns, which he said felt cramped now that the animal is bigger. The
  // count no longer has to deliver the final heading, since the head faces
  // the viewer whenever it stops moving, so it is free to follow the drawing.
  const TURNS = 1.583;
  // Tall and narrow, but not tight. Built as wide as it was high the view sat
  // inside the coil; built at this radius times two thirds it crossed his
  // chest and his hands at every turn and he was furniture inside it. Here it
  // passes clear of his body on both sides, which is what lets the wrap be
  // read at all: you can see the near half in front of him and the far half
  // going behind.
  // Measured off his silhouette: his shoulders reach about 0.52 of a unit
  // out from the axis in this space, so a coil ending at 0.34 put the head
  // inside his shoulder and in front of his face. It ends just outside now.
  const RAD_MIN = 0.72;
  const RAD_MAX = 1.04;
  // The head rides at the top of this, so it ends below the frame's edge
  // rather than at it.
  const Y0 = -1.50, Y1 = 0.72;

  const TAU = Math.PI * 2;

  // The head is a model and the body is generated, which is the right split:
  // the body is the part that animates, winding on from the tail, and a carved
  // head is the part code is worst at. Six attempts at building one proved
  // that, and a turntable of all eight angles proved it rather than one frame
  // of the running sequence proving nothing.
  // Root absolute, so the lab pages under _notes/tools/ find it as well.
  const HEAD_URL = "/assets/models/quetzalcoatl.glb";

  const HEAD = 3.75;                // head size against the neck's thickness

  // Where the body is at u along its length, 0 at the tail, 1 at the head.
  // The radius breathes a little so the coil is not a lathe part, and it draws
  // in as it climbs, so the head ends up closer than the tail.
  // Before the coil there is a straight rise from below the bottom edge of
  // the box, which is the floor as far as the frame is concerned. The head
  // comes up out of it with neck already behind it, instead of appearing in
  // the air as a head on its own, which he said looked very strange, and he
  // was right. u runs from -RISE to 1: the rise, then the helix.
  // The lead in is a diagonal, not a vertical: it comes up out of the floor
  // rising to the right and joins the coil at his right side. That is the
  // right hand panel of his drawing, body from the lower left, head up and to
  // the right in profile. A vertical rise had the head's first move going
  // away into the depth, which from the front showed the back of the ruff.
  const RISE = 0.14, DROP = 0.90, DRIFT = 0.80;
  const curve = (u) => {
    if (u < 0) {
      const h0 = helix(0);
      // not clamped: what is further back than the rise is simply deeper
      const f = -u / RISE;
      return [h0[0] - DRIFT * f, h0[1] - DROP * f, h0[2]];
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
    const c0 = curve(k);
    // The straight line the neck leaves along starts a little inside the
    // head, not at its back face: the ruff reaches further back than the
    // plate the neck meets, so a neck that stopped at the socket showed a
    // sliver of gap under the feathers.
    const nape = [c0[0] + lastAim[0] * 0.10, c0[1] + lastAim[1] * 0.10, c0[2] + lastAim[2] * 0.10];
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

  // What the body is made of was settled by a reference and not by taste: a
  // Cleveland Museum feathered serpent in basalt, public domain. Its body has
  // no scales at all. It is plumes, long ones, carved in low relief and laid
  // over each other like tiles along the coils, each with a ridge down its
  // middle, in matte grainy stone. The head he generated reads as painted
  // stone, and this is the same stone, painted the green of its ruff.
  //
  // The relief is real: a height field is drawn once, the colour comes from
  // it, and a normal map is derived from it, so the plumes catch the key
  // light the way carving does rather than being a flat pattern.
  const plumeMaps = (device) => {
    const W = 512, H = 256;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    // the stone, low and grainy
    c.fillStyle = "#808080";
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 9; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const v = 110 + Math.random() * 40;
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(x, y, 1.5, 1.5);
    }
    // the plumes, four rows round the body, long along it, overlapping by
    // half, laid from the tail end forward so each sits on the one behind it
    // Big enough to read: three rows round the body and three plumes to a
    // tile, with the tile a third of the body. At four rows and five to a
    // tile they were twenty pixels long on the page and read as scratches.
    // Shorter and more of them, overlapping along the body by a third. Long
    // ones read as segments of cane; these read as plumage.
    const rows = 4, per = 5;
    const rh = H / rows, pl = W / per * 1.35, pw = rh * 1.05;
    for (let r = 0; r < rows; r++) {
      const cy = (r + 0.5) * rh;
      for (let k = per + 1; k >= -1; k--) {
        const cx = (k + (r % 2 ? 0.5 : 0)) * (W / per);
        // the groove round it, carved into the stone
        c.beginPath();
        c.ellipse(cx, cy, pl / 2 + 3, pw / 2 + 3, 0, 0, Math.PI * 2);
        c.fillStyle = "#262626";
        c.fill();
        // the plume, highest along its ridge, falling to its edges, and
        // falling away toward its tip
        const g = c.createLinearGradient(0, cy - pw / 2, 0, cy + pw / 2);
        g.addColorStop(0.00, "#585858");
        g.addColorStop(0.50, "#e6e6e6");
        g.addColorStop(1.00, "#585858");
        c.beginPath();
        c.ellipse(cx, cy, pl / 2, pw / 2, 0, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
        const tipFade = c.createLinearGradient(cx - pl / 2, 0, cx + pl / 2, 0);
        tipFade.addColorStop(0.0, "rgba(60,60,60,0.55)");
        tipFade.addColorStop(0.35, "rgba(60,60,60,0.0)");
        tipFade.addColorStop(1.0, "rgba(60,60,60,0.0)");
        c.fillStyle = tipFade;
        c.fill();
        // the shaft, a fine ridge
        c.strokeStyle = "rgba(235,235,235,0.9)";
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx - pl * 0.42, cy); c.lineTo(cx + pl * 0.46, cy); c.stroke();
      }
    }
    const hgt = c.getImageData(0, 0, W, H).data;
    const hAt = (x, y) => hgt[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;

    // colour from the height: paint sits in the hollows, the stone shows on
    // the ridges where it has worn. Taken from the head's palette.
    const col = document.createElement("canvas");
    col.width = W; col.height = H;
    const cc = col.getContext("2d");
    const img = cc.createImageData(W, H);
    // The stone is the cream grey of the head's face, the paint is the teal
    // of its ruff, and the paint sits in the plumes with the stone showing
    // between them and worn through on their ridges, which is what the head
    // looks like up close.
    const paint = [0.13, 0.40, 0.31], stone = [0.58, 0.54, 0.44], ochre = [0.44, 0.30, 0.17];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hAt(x, y);
      // groove and stone ground below 0.3, paint on the plume body, stone
      // worn through above 0.9 at the ridge
      const onPlume = Math.min(1, Math.max(0, (h - 0.30) / 0.12));
      const wear = Math.max(0, (h - 0.88) / 0.12);
      const grain = 0.86 + Math.random() * 0.28;
      const o = Math.random() < 0.010 ? 1 : 0;
      const i = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const painted = paint[ch] * (0.70 + 0.55 * h);
        const ground = stone[ch] * (0.55 + 0.60 * h);
        let v = (ground * (1 - onPlume) + painted * onPlume) * (1 - wear) + stone[ch] * 1.05 * wear;
        v = v * (1 - o) + ochre[ch] * o;
        img.data[i + ch] = Math.min(255, v * grain * 255);
      }
      img.data[i + 3] = 255;
    }
    cc.putImageData(img, 0, 0);

    // normals from the height, tangent space, +Y up
    const nrm = document.createElement("canvas");
    nrm.width = W; nrm.height = H;
    const nc = nrm.getContext("2d");
    const nimg = nc.createImageData(W, H);
    const STRENGTH = 4.0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * STRENGTH;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * STRENGTH;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      nimg.data[i] = (-dx / l * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
    }
    nc.putImageData(nimg, 0, 0);

    const mk = (src) => {
      const t = new pc.Texture(device, { width: W, height: H, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
      t.addressU = t.addressV = pc.ADDRESS_REPEAT;
      t.setSource(src);
      return t;
    };
    return { diffuse: mk(col), normal: mk(nrm) };
  };

  // A standing feather, the same green stone as the ruff on the head, with a
  // ridge and a darker edge. Two tones, which is all that survives twenty
  // pixels across.
  const featherTexture = (device) => {
    const W = 64, H = 256;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0.00, "#244a3a");
    g.addColorStop(0.55, "#2f6a52");
    g.addColorStop(1.00, "#1f4536");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      const v = Math.random() < 0.5 ? "rgba(140,150,120,0.22)" : "rgba(10,20,12,0.25)";
      c.fillStyle = v;
      c.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
    }
    const e = c.createLinearGradient(0, 0, W, 0);
    e.addColorStop(0.00, "rgba(6,12,8,0.75)");
    e.addColorStop(0.22, "rgba(6,12,8,0.0)");
    e.addColorStop(0.78, "rgba(6,12,8,0.0)");
    e.addColorStop(1.00, "rgba(6,12,8,0.75)");
    c.fillStyle = e;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(205,195,160,0.85)";
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H * 0.92); c.stroke();
    const t = new pc.Texture(device, { width: W, height: H, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.addressU = t.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
    t.setSource(cv);
    return t;
  };

  const mesh = (app, d) => {
    const m = new pc.Mesh(app.graphicsDevice);
    m.setPositions(d.pos);
    m.setNormals(d.nrm);
    m.setUvs(0, d.uv);
    m.setIndices(d.idx);
    // tangents, so the carved plumes can be lit through a normal map
    m.setVertexStream(pc.SEMANTIC_TANGENT, pc.calculateTangents(d.pos, d.nrm, d.uv, d.idx), 4);
    m.update(pc.PRIMITIVE_TRIANGLES);
    return m;
  };

  window.makeSerpent = (app) => {
    const body = mesh(app, buildBody(0));
    const plume = mesh(app, buildFeathers(0));
    const refresh = (m2, d) => {
      m2.setPositions(d.pos); m2.setNormals(d.nrm); m2.setUvs(0, d.uv);
      m2.setVertexStream(pc.SEMANTIC_TANGENT, pc.calculateTangents(d.pos, d.nrm, d.uv, d.idx), 4);
      m2.update(pc.PRIMITIVE_TRIANGLES);
    };

    // Quetzal green into gold, shifting with the angle of view, which is what
    // makes a feathered thing read as feathered rather than as painted.
    const mat = new pc.StandardMaterial();
    // At one, not 0.8: the map's greens were measured off the head, and a
    // multiplier under one was darkening them by a fifth before the light
    // touched them.
    const maps = plumeMaps(app.graphicsDevice);
    mat.diffuse = new pc.Color(1, 1, 1);
    mat.diffuseMap = maps.diffuse;
    mat.diffuseMapTiling = new pc.Vec2(3, 1);
    mat.normalMap = maps.normal;
    mat.normalMapTiling = new pc.Vec2(3, 1);
    mat.bumpiness = 1.6;
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

    // Its own light, and all of it. Nothing else on the page is lit, so the
    // two lamps the room carried for the figure that used to stand behind him
    // lit only this, from the sides the lab never lit it from and one of them
    // orange, and the body judged as carved stone in the lab came back a flat
    // bright green tube. This rig is the lab's, so the lab and the page light
    // it the same way by construction: a key from the front left, a warmer
    // rake from the other side so the coil has a lit side and a dark one, and
    // enough ambient that the dark side is not black. The ambient is set on
    // the scene because only the serpent reads it.
    app.scene.ambientLight = new pc.Color(0.18, 0.18, 0.20);
    // The two lamps hang off a rig that turns with the camera, so the page,
    // where the camera goes round him, lights the serpent at every angle the
    // way the lab lights it with the camera in front. Fixed to the world they
    // would have swept across the coil as the view turned, and nothing in the
    // lab would have said anything about the page.
    const rig = new pc.Entity("serpent-rig");
    root.addChild(rig);
    const key = new pc.Entity("serpent-key");
    key.addComponent("light", {
      type: "directional", color: new pc.Color(1.0, 0.97, 0.92),
      intensity: 1.4, castShadows: false,
    });
    key.setEulerAngles(40, -30, 0);
    rig.addChild(key);
    const rake = new pc.Entity("serpent-rake");
    rake.addComponent("light", {
      type: "directional", color: new pc.Color(1.0, 0.95, 0.80),
      intensity: 1.6, castShadows: false,
    });
    rake.setEulerAngles(24, 38, 0);
    rig.addChild(rake);

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
      const e = 1 - Math.pow(1 - pr, 1.6);
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
      // Where it looks once it has landed: where he looks. He faces +Z, which
      // is heading zero, and the camera starts there. It used to turn to face
      // the camera wherever the camera had got to, which on the page meant it
      // kept turning while he did not, and the two never read as one thing.
      // On the turntable he, the serpent and the light all turn together.
      const hisHead = 0;
      // On the rise the motion is straight up and has no heading, so it takes
      // the heading it will have the moment it joins the coil, and looks up
      // along it: his drawing, a head coming out of the floor looking up on
      // the diagonal it is about to climb. Facing the viewer there instead,
      // which was the first version, meant an eighty degree swing in one step
      // the instant it set off.
      const first = sub(helix(0.02), helix(0));
      const firstHead = Math.atan2(first[0], first[2]);
      const ha = flat > 1e-3 ? Math.atan2(dir[0], dir[2]) : firstHead;
      // rest goes to one as sideways movement dies away, and only counts in
      // the second half, which is to say at the landing
      const xr = Math.min(1, hspeed / 1.5);
      const rest = (1 - xr * xr * (3 - 2 * xr)) * (pr > 0.5 ? 1 : 0);
      let dA = hisHead - ha;
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
      // up on the diagonal through the rise, easing onto the coil's own slope
      const rising = k < 0 ? 1 : Math.max(0, 1 - k / 0.10);
      const pitch = (dir[1] * (1 - rest) * 0.85 + 0.18 * rest - 0.05) * (1 - rising) + 0.62 * rising;
      const pl = Math.max(0.35, flat * (1 - rest) + 0.9 * rest) * (1 - rising) + 0.80 * rising;
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
        inner.setLocalPosition(0, 0, -0.33);
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
        rig.setLocalEulerAngles(0, camYaw === null ? 0 : camYaw, 0);
        const k = Math.max(0, Math.min(1, v));
        root.enabled = k > 0.001;
        // the smoothed heading starts fresh with the climb, so the first
        // visible frame is not easing out of wherever the head was built
        if (!root.enabled) { hhS = null; return; }
        if (mat.opacity !== 1) { mat.opacity = 1; matF.opacity = 1; mat.update(); matF.update(); }
        // Eased out: it comes up out of the floor at speed and slows into the
        // shoulder. Eased both ways it sat underground for most of a second,
        // and a settle that arrives at a crawl is the right end of the two.
        const e = 1 - Math.pow(1 - k, 1.6);
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
