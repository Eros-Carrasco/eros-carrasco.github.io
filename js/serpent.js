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
  // which was the extreme turn he kept seeing. Start at thirty degrees, in
  // front of him and to the viewer's right, so the first move the viewer
  // sees is a diagonal across the screen and not straight into the depth;
  // one and three quarter turns brings the end to the same three hundred as
  // before, so the landing did not move when the start did.
  const PHASE = 0.524;
  // His drawing: one wide turn climbing on a diagonal, crossing in front of
  // his torso once and finishing at his shoulder. It had been 1.45 tight
  // turns, which he said felt cramped now that the animal is bigger. The
  // count no longer has to deliver the final heading, since the head faces
  // the viewer whenever it stops moving, so it is free to follow the drawing.
  const TURNS = 1.750;
  // Tall and narrow, but not tight. Built as wide as it was high the view sat
  // inside the coil; built at this radius times two thirds it crossed his
  // chest and his hands at every turn and he was furniture inside it. Here it
  // passes clear of his body on both sides, which is what lets the wrap be
  // read at all: you can see the near half in front of him and the far half
  // going behind.
  // Measured off his silhouette: his shoulders reach about 0.52 of a unit
  // out from the axis in this space, so a coil ending at 0.34 put the head
  // inside his shoulder and in front of his face. At 0.72 the body cleared
  // him by a fiftieth at the top and the head's ruff went through his arm
  // as it settled; opened by an eighth at the top and a twelfth at the
  // bottom, his call, judged by him beside his fixed splat.
  const RAD_MIN = 0.84;
  const RAD_MAX = 1.12;
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
  // The snout sits twelve degrees under the model's axis, measured from its
  // vertices. DROOP lifts the axis by half of that, so the axis rides a
  // little above the path and the snout a little below it: at the full
  // twelve plus six more of LIFT he said the head looked forced upward and
  // not like it was looking where it was going. REST_DOWN is where it looks
  // once it has landed on his shoulder: twenty degrees down toward the
  // viewer, the look he approved (see placeHead for how that number came
  // to be).
  const DROOP = 6 * Math.PI / 180, LIFT = 0, REST_DOWN = -20 * Math.PI / 180;

  // Where the body is at u along its length, 0 at the tail, 1 at the head.
  // The radius breathes a little so the coil is not a lathe part, and it draws
  // in as it climbs, so the head ends up closer than the tail.
  // Before the coil there is a straight rise from below the bottom edge of
  // the box, which is the floor as far as the frame is concerned. The head
  // comes up out of it with neck already behind it, instead of appearing in
  // the air as a head on its own, which he said looked very strange, and he
  // was right. u runs from -RISE to 1, and it is one helix the whole way.
  // A straight diagonal used to come up under the floor and join the coil
  // at floor level, and the join was a corner: a hundred degrees seen from
  // above, with the climb dropping from forty eight degrees to six. The
  // head looks where it is moving, so it turned through all of that in a
  // third of a second, and from the front it read as the animal coming out
  // to the right and reversing. Now the same helix runs on below the floor,
  // steepening as it goes down (DEEP) so the head is out of frame when the
  // climb starts and comes up on a diagonal, with the steepness fading out
  // a little above the floor (DIP) so the climb angle is continuous too.
  // RISE is how much of it starts under the floor: short, so the slow birth
  // is seen and not spent out of frame.
  const RISE = 0.04, DIP = 0.15, DEEP = 12;
  const curve = (u) => helix(u);
  const helix = (u) => {
    const a = PHASE + u * TURNS * TAU;
    const r = RAD_MAX + (RAD_MIN - RAD_MAX) * u + Math.sin(u * 7.1) * 0.055;
    const y = Y0 + (Y1 - Y0) * (u * 0.82 + u * u * 0.18) + Math.sin(a * 2.0) * 0.045
            - (u < DIP ? DEEP * (DIP - u) * (DIP - u) : 0);
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
  // The body is a little shorter than the head's travel, so the tail, and
  // the plume on it, come up out of the floor as the head settles instead of
  // staying under it for good.
  const L_BODY = 0.90;
  const headAt = (e) => -RISE + Math.min(1, Math.max(0, e)) * L;
  // How far along the animal is at progress k: slow out of the floor, slow
  // into the shoulder, quickest through the middle. It used to ease out
  // only, so the birth was the fastest moment of the piece, one and six
  // tenths times the average, on top of the corner that was there then.
  const ease = (k) => 1 - Math.pow(1 - Math.pow(k, 1.4), 1.6);
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
      const u = k - d * L_BODY;
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
    bodyRings = centres;   // the feathers stand on these same rings
    const pos = [], nrm = [], uv = [], idx = [];
    for (let i = 0; i <= RINGS; i++) {
      const sb = i / RINGS;
      const c = centres[i];
      const ahead = centres[Math.min(RINGS, i + 1)], behind = centres[Math.max(0, i - 1)];
      const tan = norm(sub(ahead, behind));
      // The ring's frame is the back and the flank, the same D and S the
      // feathers stand on, so a quarter of the way round the texture is
      // always the back and three quarters is always the belly. It used to
      // be carried along from the tail, and twisted; a painted band could
      // not have stayed on the belly.
      const fr = frameOf(c, tan);
      const g = girthS(1 - sb);
      for (let sd = 0; sd <= SIDES; sd++) {
        const a2 = (sd / SIDES) * TAU;
        const ca = Math.cos(a2), sa = Math.sin(a2);
        // The belly is flatter than the back, the way a snake's is.
        const squash = 0.78 + 0.22 * Math.abs(ca);
        const nx = fr.S[0] * ca + fr.D[0] * sa;
        const ny = fr.S[1] * ca + fr.D[1] * sa;
        const nz = fr.S[2] * ca + fr.D[2] * sa;
        pos.push(c[0] + nx * g * squash, c[1] + ny * g * squash, c[2] + nz * g * squash);
        nrm.push(nx, ny, nz);
        // the last vertex sits on the first, so the texture has a real seam
        // instead of the whole of it squeezed into the closing strip
        uv.push(sb, sd / SIDES);
      }
    }
    const RS = SIDES + 1;
    for (let i = 0; i < RINGS; i++) {
      for (let sd = 0; sd < SIDES; sd++) {
        const a2 = i * RS + sd, b2 = a2 + 1;
        idx.push(a2, a2 + RS, b2, b2, a2 + RS, b2 + RS);
      }
    }
    return { pos, nrm, uv, idx };
  };

  // ---- the feathers ----
  // His call, after leaf blades, a silver accident and a first pass of
  // carved feathers that still read as leaves: feathers like a bird's, alive,
  // on a body of dark stone. What makes a leaf is a symmetric lens with a
  // point, a short stem, a clean edge and the thickness of a board. What
  // makes a feather is a long bare quill, vanes that are not the same width,
  // a rounded tip, barbs that run out from the rachis on a slant and clump
  // and part, and hundreds of them laid over each other. So a feather here
  // is a thin sheet, its shape cut by an atlas in which every barb is drawn
  // as its own stroke, and the crest is three dense rows of them.
  const ALONG = 14, ACROSS = 8;
  // the vane's envelope: a bare quill for the first quarter, then vanes that
  // widen fast, stay wide and round off at the tip
  const envelope = (t) => {
    if (t < 0.25) return 0.05 + (t / 0.25) * 0.30;
    const q = (t - 0.25) / 0.75;
    return Math.max(0.05, Math.pow(Math.sin(Math.PI * Math.pow(q, 0.60)), 0.45));
  };
  const featherTemplate = (ratio) => {
    const P = (sIn, tIn) => {
      const sC = Math.max(-1, Math.min(1, sIn)), tC = Math.max(0, Math.min(1, tIn));
      const w = envelope(tC) * ratio * 1.04;
      const z = -0.22 * tC * tC - 0.06 * sC * sC * w;     // the spine curls back, the vane cups a little
      return [sC * w, tC, z];
    };
    const pos = [], nrm = [], uv = [], idx = [];
    for (let i = 0; i <= ALONG; i++) {
      const t = i / ALONG;
      for (let j = 0; j <= ACROSS; j++) {
        const sv = j / ACROSS * 2 - 1;
        const p = P(sv, t);
        const ds = sub(P(sv + .02, t), P(sv - .02, t));
        const dt = sub(P(sv, t + .02), P(sv, t - .02));
        let n = norm(cross(ds, dt));
        if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
        pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]); uv.push((sv + 1) / 2, t);
      }
    }
    for (let i = 0; i < ALONG; i++) for (let j = 0; j < ACROSS; j++) {
      const a = i * (ACROSS + 1) + j, b = a + ACROSS + 1;
      // wound so the face the normal points out of is the front face: lit on
      // both sides, the engine flips the normal for back faces, and with the
      // winding the other way round the crest came out black
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    return { pos, nrm, uv, idx };
  };
  const TPL = { crest: featherTemplate(0.30), ruff: featherTemplate(0.24), tail: featherTemplate(0.14) };
  const BANDS = 6;   // emerald, deep emerald, orange, gold, cream, blue: the atlas
  let bodyRings = null;
  // The body at a distance d behind the head: its centre, the way it runs
  // (toward the head), and a frame round it. D is the back: away from him,
  // since a snake wound round a man shows its back outward, and tilted up.
  const frameOf = (c, T) => {
    const out = Math.hypot(c[0], c[2]) > 1e-4 ? norm([c[0], 0, c[2]]) : [1, 0, 0];
    const raw = [out[0], out[1] + 0.7, out[2]];
    const dt = raw[0] * T[0] + raw[1] * T[1] + raw[2] * T[2];
    const D = norm([raw[0] - T[0] * dt, raw[1] - T[1] * dt, raw[2] - T[2] * dt]);
    const S = norm(cross(T, D));
    return { D, S };
  };
  const ringAt = (d) => {
    const i = Math.max(1, Math.min(RINGS - 1, Math.round((1 - d) * RINGS)));
    const c = bodyRings[i];
    const T = norm(sub(bodyRings[i + 1], bodyRings[i - 1]));
    const { D, S } = frameOf(c, T);
    return { c, T, D, S, g: girthS(d) };
  };
  const rotAround = (v, axis, ang) => {
    const c = Math.cos(ang), s2 = Math.sin(ang);
    const d = axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2];
    const cr = cross(axis, v);
    return [v[0] * c + cr[0] * s2 + axis[0] * d * (1 - c), v[1] * c + cr[1] * s2 + axis[1] * d * (1 - c), v[2] * c + cr[2] * s2 + axis[2] * d * (1 - c)];
  };
  const mixv = (a, b, ca, cb) => norm([a[0] * ca + b[0] * cb, a[1] * ca + b[1] * cb, a[2] * ca + b[2] * cb]);
  // one feather into the shared buffers: root, across X, along Y, face Z, size, paint
  const place = (out, tpl, root, X, Y, Z, len, band, wide = 1) => {
    const base = out.pos.length / 3;
    const { pos, nrm, uv, idx } = tpl;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i] * len * wide, y = pos[i + 1] * len, z = pos[i + 2] * len * wide;
      out.pos.push(root[0] + X[0] * x + Y[0] * y + Z[0] * z, root[1] + X[1] * x + Y[1] * y + Z[1] * z, root[2] + X[2] * x + Y[2] * y + Z[2] * z);
      const nx = nrm[i], ny = nrm[i + 1], nz = nrm[i + 2];
      out.nrm.push(X[0] * nx + Y[0] * ny + Z[0] * nz, X[1] * nx + Y[1] * ny + Z[1] * nz, X[2] * nx + Y[2] * ny + Z[2] * nz);
    }
    for (let i = 0; i < uv.length; i += 2) out.uv.push(uv[i], (band + uv[i + 1]) / BANDS);
    for (const k of idx) out.idx.push(base + k);
  };
  // Twice the feathers in each row, his call. They are all one mesh, one
  // draw, rebuilt each frame, so the cost is a little more work on the CPU
  // placing them and nothing to speak of on the GPU.
  const N_ROW = 92, N_RUFF = 44, N_TAIL = 10;
  const buildFeathers = (e) => {
    const out = { pos: [], nrm: [], uv: [], idx: [] };
    if (!bodyRings) return out;
    const wT = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    // the crest: three rows laid over each other down the back, the middle
    // one on the spine and one to either side rolled outward, each feather
    // lying back over the next so most of what shows is tips
    for (let row = -1; row <= 1; row++) {
      for (let i = 0; i < N_ROW; i++) {
        const d = 0.06 + ((i + (row === 0 ? 0.5 : 0)) / N_ROW) * 0.88;
        if (d > 0.95) continue;
        const f = ringAt(d);
        // alive: a slow wave runs down the crest, each feather lifting a few
        // degrees and settling, so the plumage moves while the stone does not
        const lift = 0.38 + 0.06 * Math.sin(wT * 1.7 - d * 9.0) + 0.025 * Math.sin(wT * 2.9 + i + row);
        const Y = mixv(f.T, f.D, -Math.cos(lift), Math.sin(lift));
        let Z = mixv(f.D, f.T, Math.cos(lift), Math.sin(lift));
        Z = rotAround(Z, Y, row * 0.55);
        const X = norm(cross(Y, Z));
        const root = [f.c[0] + f.D[0] * f.g * 0.80 + f.S[0] * row * f.g * 0.42,
                      f.c[1] + f.D[1] * f.g * 0.80 + f.S[1] * row * f.g * 0.42,
                      f.c[2] + f.D[2] * f.g * 0.80 + f.S[2] * row * f.g * 0.42];
        // the middle row twice as tall as the two beside it and no wider,
        // his call: twice the size all round it hid the other two rows
        const len = Math.max(0.055, f.g * (row === 0 ? 3.0 : 1.5));
        // green only, in its two shades
        place(out, TPL.crest, root, X, Y, Z, len, (i + row) & 1, row === 0 ? 0.5 : 1);
      }
    }
    // the ruff: two staggered rings round the neck, radiating out and leaning
    // back, the faces toward the head
    for (let i = 0; i < N_RUFF; i++) {
      const ring = i % 2;
      // the second ring almost on top of the first, his call
      const d = 0.045 + ring * 0.006;
      const f = ringAt(d);
      const th = ((i + ring * 0.5) / N_RUFF) * TAU;
      const R = mixv(f.D, f.S, Math.cos(th), Math.sin(th));
      const back = 0.55 + ring * 0.07;
      const Y = mixv(R, f.T, Math.cos(back), -Math.sin(back));
      const Z = mixv(f.T, R, Math.cos(back), Math.sin(back));
      const X = norm(cross(Y, Z));
      const len = f.g * (2.2 - ring * 0.2);
      // rooted so the bare quill, the first quarter, lies inside the body
      // and the vane begins at the skin: rooted on the surface they looked
      // unattached
      const skin = [f.c[0] + R[0] * f.g * 0.9, f.c[1] + R[1] * f.g * 0.9, f.c[2] + R[2] * f.g * 0.9];
      const root = [skin[0] - Y[0] * len * 0.25, skin[1] - Y[1] * len * 0.25, skin[2] - Y[2] * len * 0.25];
      // orange, all of them: the white and the blue went to the body, his call
      place(out, TPL.ruff, root, X, Y, Z, len, 2);
    }
    // the plume at the tail: a few long streamers, like a quetzal's
    for (let i = 0; i < N_TAIL; i++) {
      const layer = i < N_TAIL / 2 ? 0 : 1;
      const j = i % (N_TAIL / 2);
      // two layers, the inner one further up the tail, both rooted inside
      // it and lying along it, so they grow out of the tail instead of
      // standing off its tip
      const d = 0.970 - layer * 0.02 - (j % 2) * 0.006;
      const f = ringAt(d);
      const spread = (j / (N_TAIL / 2 - 1) - 0.5) * 1.0 + (layer ? 0.10 : 0);
      // lying along the tail, lifting only a little, and with the bare quill
      // inside it so the vane begins at the tail: they kept reading as
      // separate from it
      const liftT = 0.42 + 0.20 * Math.abs(spread) + 0.03 * Math.sin(wT * 1.3 + i);
      const R = rotAround(f.D, f.T, spread);
      const Y = mixv(f.T, R, -Math.cos(liftT), Math.sin(liftT));
      const Z = mixv(R, f.T, Math.cos(liftT), Math.sin(liftT));
      const X = norm(cross(Y, Z));
      const len = (0.62 + 0.30 * (1 - Math.abs(spread) / 0.5)) * (layer ? 0.8 : 1);
      const skin = [f.c[0] + R[0] * f.g * 0.6, f.c[1] + R[1] * f.g * 0.6, f.c[2] + R[2] * f.g * 0.6];
      const root = [skin[0] - Y[0] * len * 0.25, skin[1] - Y[1] * len * 0.25, skin[2] - Y[2] * len * 0.25];
      // orange, like the ruff
      place(out, TPL.tail, root, X, Y, Z, len, 2);
    }
    return out;
  };

  // ---- surfaces ----
  // The scan's stone is most of why it reads as carved, and a flat colour is
  // most of why ours reads as plastic. Both of these are drawn once into a
  // canvas and handed over as a map.

  // The body's skin. His calls, in order: not carved plumes laid like tiles
  // (he did not like that design), not grey stone either (too literal), but
  // a dark green, saturated enough to let the crest and the lines stand out;
  // scales were a fine idea, so these are a snake's: small keeled scales in
  // a staggered lattice over the back and flanks, and wide ventral scutes
  // across the belly band. Painted over them, and meant to stand out hard:
  // a cream band along the belly, one white line along each flank and a
  // thinner line of Maya blue between the white and the crest. White is the
  // body's second colour, the blue its third, and there is more white.
  //
  // Round the body: a quarter of the way is the back (under the crest),
  // three quarters is the belly; the flanks sit at the seam and at the half.
  const skinMaps = (device) => {
    const W = 512, H = 256;
    const green = [0.06, 0.30, 0.17], cream = [0.86, 0.82, 0.70], white = [0.96, 0.95, 0.91], maya = [0.46, 0.78, 0.98], ochre = [0.40, 0.27, 0.15];
    const seedF = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
    const smooth = (x, y, sc) => {
      const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const a = seedF(ix, iy), b = seedF(ix + 1, iy), c2 = seedF(ix, iy + 1), d2 = seedF(ix + 1, iy + 1);
      const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
      return (a * (1 - u) + b * u) * (1 - v) + (c2 * (1 - u) + d2 * u) * v;
    };
    // the belly band, in v, and the scutes across it
    const B0 = 0.675, B1 = 0.825, SCUTE = 28;
    // the scales: rows round the body, staggered along it
    const SROW = 24, SLEN = 38;
    const scaleAt = (x, y) => {
      // returns 0..1 inside a scale (1 at the keel), 0 in the groove
      const row = Math.floor(y / SROW);
      const off = (row % 2) * (SLEN / 2);
      const cy = (row + 0.5) * SROW;
      const cx = (Math.floor((x - off) / SLEN) + 0.5) * SLEN + off;
      const dx = (x - cx) / (SLEN * 0.5), dy = (y - cy) / (SROW * 0.5);
      // a rounded diamond, longer along the body, its free edge toward the tail
      const d = Math.pow(Math.abs(dx), 1.6) + Math.pow(Math.abs(dy), 1.6);
      const inside = Math.min(1, Math.max(0, (1.0 - d) / 0.22));
      const keel = Math.exp(-dy * dy * 6.0) * 0.35;
      // and the groove between scales, 1 on the line, for the blue
      const groove = Math.min(1, Math.max(0, 1 - Math.abs(1.0 - d) / 0.13));
      return { sc: inside * (0.65 + keel), groove };
    };
    // Swapped on his call: the straight lines along the body are Maya blue,
    // full strength, and the lines between scales and between scutes are
    // white. Both are meant to stand out.
    const seam = white;
    // Solid, half again as wide as they started, and lit from inside: what
    // he asked for was light, not width, so most of it is in the emissive
    // map they also go into.
    const lines = [
      { v: 0.000, hw: 0.015, col: maya, worn: 0 },
      { v: 0.500, hw: 0.015, col: maya, worn: 0 },
      { v: 0.130, hw: 0.0105, col: maya, worn: 0 },
      { v: 0.370, hw: 0.0105, col: maya, worn: 0 },
    ];
    const emi = document.createElement("canvas"); emi.width = W; emi.height = H;
    const ec = emi.getContext("2d"); const eimg = ec.createImageData(W, H);
    const col = document.createElement("canvas"); col.width = W; col.height = H;
    const cc = col.getContext("2d"); const img = cc.createImageData(W, H);
    const hgt = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = y / H;
      const grain = 0.90 + 0.20 * smooth(x, y, 2.3);
      let h, r, g, b;
      const inBand = v > B0 && v < B1;
      if (inBand) {
        // the scutes: wide plates across the belly, a groove between them
        const along = ((x % SCUTE) + SCUTE) % SCUTE;
        const groove = Math.min(1, Math.max(0, (2.5 - Math.min(along, SCUTE - along)) / 1.5));
        const edge = Math.min(1, Math.max(0, Math.min(v - B0, B1 - v) / 0.012));
        h = 0.58 - 0.22 * groove - 0.10 * (1 - edge);
        const k = grain * (0.80 + 0.20 * edge);
        const gb = groove;
        r = cream[0] * k * (1 - gb) + seam[0] * gb; g = cream[1] * k * (1 - gb) + seam[1] * gb; b = cream[2] * k * (1 - gb) + seam[2] * gb;
      } else {
        const { sc, groove } = scaleAt(x, y);
        h = 0.42 + 0.30 * sc + (smooth(x, y, 3) - 0.5) * 0.05;
        const k = (0.62 + 0.55 * sc) * grain;
        const gb = groove;
        r = green[0] * k * (1 - gb) + seam[0] * gb; g = green[1] * k * (1 - gb) + seam[1] * gb; b = green[2] * k * (1 - gb) + seam[2] * gb;
      }
      if (seedF(x * 3.1, y * 1.7) > 0.994) { r = ochre[0]; g = ochre[1]; b = ochre[2]; }
      let glow = 0;
      for (const ln of lines) {
        const dv = Math.min(Math.abs(v - ln.v), Math.abs(v - ln.v + 1), Math.abs(v - ln.v - 1));
        if (dv > ln.hw + 0.004) continue;
        const edge = Math.min(1, Math.max(0, (ln.hw + 0.004 - dv) / 0.005));
        const wear = smooth(x, y + 300, 9) * 0.6 + smooth(x, y + 900, 37) * 0.4;
        const k = edge * (ln.worn > 0 ? Math.min(1, Math.max(0, (wear - ln.worn) / (1 - ln.worn) * 2.2)) : 1);
        const tone = 0.96 + 0.06 * smooth(x, y + 77, 5);
        r = r * (1 - k) + ln.col[0] * tone * k; g = g * (1 - k) + ln.col[1] * tone * k; b = b * (1 - k) + ln.col[2] * tone * k;
        h -= 0.10 * edge;
        glow = Math.max(glow, k);
      }
      hgt[y * W + x] = h;
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, r * 255); img.data[i + 1] = Math.min(255, g * 255); img.data[i + 2] = Math.min(255, b * 255); img.data[i + 3] = 255;
      eimg.data[i] = maya[0] * glow * 255; eimg.data[i + 1] = maya[1] * glow * 255; eimg.data[i + 2] = maya[2] * glow * 255; eimg.data[i + 3] = 255;
    }
    cc.putImageData(img, 0, 0); ec.putImageData(eimg, 0, 0);
    const hAt = (x, y) => hgt[((y + H) % H) * W + ((x + W) % W)];
    const nrm = document.createElement("canvas"); nrm.width = W; nrm.height = H;
    const nc = nrm.getContext("2d"); const nimg = nc.createImageData(W, H);
    const STRENGTH = 3.0;
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
    return { diffuse: mk(col), normal: mk(nrm), emissive: mk(emi) };
  };

  // The feathers' atlas, six bands: every barb drawn as its own stroke out
  // from the rachis on a slant toward the tip, in clumps that part now and
  // then, thinning at the edge, with down round the base of the quill and
  // the quill itself bare for the first quarter. The alpha is the strokes,
  // so the edge of a feather is barbs and not a line. Each band's colour runs
  // from a darker base to a brighter tip and shifts toward the next hue at
  // the edges, the way a quetzal's green goes blue at the margins.
  const featherAtlas = (device) => {
    const W = 256, BH = 512, H = BH * BANDS;
    const paints = [
      { base: [0.04, 0.26, 0.15], tip: [0.10, 0.62, 0.34], edge: [0.05, 0.40, 0.48] },   // emerald
      { base: [0.03, 0.18, 0.11], tip: [0.07, 0.44, 0.26], edge: [0.04, 0.30, 0.38] },   // deep emerald
      { base: [0.52, 0.17, 0.03], tip: [0.98, 0.54, 0.12], edge: [0.88, 0.30, 0.06] },   // orange
      { base: [0.62, 0.34, 0.06], tip: [0.98, 0.78, 0.26], edge: [0.90, 0.52, 0.12] },   // gold
      { base: [0.70, 0.66, 0.56], tip: [0.95, 0.93, 0.86], edge: [0.80, 0.80, 0.78] },   // cream
      { base: [0.04, 0.18, 0.46], tip: [0.14, 0.44, 0.84], edge: [0.10, 0.30, 0.70] },   // blue
    ];
    const quill = [0.90, 0.85, 0.66];
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    c.clearRect(0, 0, W, H);
    c.lineCap = "round";
    const rgb = (v) => `rgb(${Math.round(Math.min(1, v[0]) * 255)},${Math.round(Math.min(1, v[1]) * 255)},${Math.round(Math.min(1, v[2]) * 255)})`;
    // a seeded hash so every band gets the same barbs and the shapes match
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let band = 0; band < BANDS; band++) {
      const p = paints[band];
      const y0 = band * BH;
      const colAt = (t, sa, k) => {
        const toTip = Math.min(1, Math.max(0, (t - 0.25) / 0.70));
        const out = [0, 0, 0];
        for (let ch = 0; ch < 3; ch++) {
          const along = p.base[ch] + (p.tip[ch] - p.base[ch]) * toTip;
          out[ch] = (along + (p.edge[ch] - along) * Math.pow(sa, 2.0) * 0.75) * k;
        }
        return out;
      };
      seed = 7;
      // the barbs, in clumps
      const NB = 150;
      let clumpLeft = 0, clumpSlant = 0;
      for (let i = 0; i < NB; i++) {
        const t = 0.25 + (i / NB) * 0.72;
        if (clumpLeft <= 0) { clumpLeft = 5 + Math.floor(rnd() * 6); clumpSlant = (rnd() - 0.5) * 0.06; if (rnd() < 0.22) continue; }
        clumpLeft--;
        const yb = y0 + t * BH;
        for (const side of [-1, 1]) {
          const reach = envelope(t) * (side > 0 ? 1.0 : 0.74) * (W / 2 - 2);
          const slant = 0.16 + clumpSlant + (rnd() - 0.5) * 0.02;
          const k = 0.92 + rnd() * 0.16;
          const x1 = W / 2 + side * reach, y1 = yb + slant * BH * reach / (W / 2);
          const g = c.createLinearGradient(W / 2, yb, x1, y1);
          g.addColorStop(0, rgb(colAt(t, 0, k))); g.addColorStop(1, rgb(colAt(t, 1, k)));
          c.strokeStyle = g;
          // full weight for most of its length, thinning at the end
          c.lineWidth = 2.6;
          c.beginPath(); c.moveTo(W / 2, yb); c.lineTo(W / 2 + (x1 - W / 2) * 0.82, yb + (y1 - yb) * 0.82); c.stroke();
          c.lineWidth = 1.3;
          c.beginPath(); c.moveTo(W / 2 + (x1 - W / 2) * 0.80, yb + (y1 - yb) * 0.80); c.lineTo(x1, y1); c.stroke();
        }
      }
      // down round the base of the quill: short, soft, every which way
      c.lineWidth = 1.2;
      for (let i = 0; i < 44; i++) {
        const t = 0.17 + rnd() * 0.14, side = rnd() < 0.5 ? -1 : 1;
        const ang = (0.35 + rnd() * 0.9) * side, len = 12 + rnd() * 26;
        const yb = y0 + t * BH;
        c.strokeStyle = rgb(colAt(0.3, 0.3, 0.75 + rnd() * 0.2));
        c.beginPath(); c.moveTo(W / 2, yb); c.lineTo(W / 2 + Math.sin(ang) * len, yb + Math.cos(ang) * len * 0.6); c.stroke();
      }
      // the rachis: pale, thick at the base, thinning to the tip, grooved
      const rg = c.createLinearGradient(0, y0, 0, y0 + BH);
      rg.addColorStop(0, rgb([quill[0] * 0.9, quill[1] * 0.9, quill[2] * 0.9])); rg.addColorStop(1, rgb(quill));
      for (let seg = 0; seg < 10; seg++) {
        const ta = seg / 10, tb = (seg + 1) / 10;
        c.strokeStyle = rg; c.lineWidth = 6.5 - 5.0 * ta;
        c.beginPath(); c.moveTo(W / 2, y0 + ta * BH * 0.97); c.lineTo(W / 2, y0 + tb * BH * 0.97); c.stroke();
      }
      c.strokeStyle = "rgba(60,45,25,0.55)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(W / 2 - 1, y0 + 2); c.lineTo(W / 2 - 1, y0 + BH * 0.95); c.stroke();
    }
    const t = new pc.Texture(device, { width: W, height: H, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.addressU = t.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
    t.setSource(cv);
    return { diffuse: t };
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
    const refresh = (m2, d, tangents = true) => {
      m2.setPositions(d.pos); m2.setNormals(d.nrm); m2.setUvs(0, d.uv); m2.setIndices(d.idx);
      // the feathers carry no normal map now, so they skip the tangents,
      // which were most of the cost of rebuilding them every frame
      if (tangents) m2.setVertexStream(pc.SEMANTIC_TANGENT, pc.calculateTangents(d.pos, d.nrm, d.uv, d.idx), 4);
      m2.update(pc.PRIMITIVE_TRIANGLES);
    };

    // Quetzal green into gold, shifting with the angle of view, which is what
    // makes a feathered thing read as feathered rather than as painted.
    const mat = new pc.StandardMaterial();
    // At one, not 0.8: the map's greens were measured off the head, and a
    // multiplier under one was darkening them by a fifth before the light
    // touched them.
    const maps = skinMaps(app.graphicsDevice);
    mat.diffuse = new pc.Color(1, 1, 1);
    mat.diffuseMap = maps.diffuse;
    mat.diffuseMapTiling = new pc.Vec2(3, 1);
    mat.normalMap = maps.normal;
    mat.normalMapTiling = new pc.Vec2(3, 1);
    mat.bumpiness = 1.3;
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
    // the blue lines glow a little on their own, through the emissive map;
    // heat() scales this through the climb
    mat.emissiveMap = maps.emissive;
    mat.emissiveMapTiling = new pc.Vec2(3, 1);
    mat.emissive = new pc.Color(1, 1, 1);
    mat.emissiveIntensity = 1.1;
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
    const fmaps = featherAtlas(app.graphicsDevice);
    matF.diffuse = new pc.Color(1, 1, 1);
    matF.diffuseMap = fmaps.diffuse;
    matF.diffuseMapTiling = new pc.Vec2(1, 1);
    // a sheet, lit on both sides, with no relief map: the barbs are drawn
    matF.normalMap = null;
    matF.twoSidedLighting = true;
    // cut to the barbs by the atlas's alpha; still opaque where it is drawn,
    // so it writes depth and wraps round him like the body does. The test
    // sits low because the mip levels blur the strokes and a high one ate
    // the feathers at a distance.
    matF.opacityMap = fmaps.diffuse;
    matF.opacityMapChannel = "a";
    matF.alphaTest = 0.30;
    // a feather's sheen, more than the stone body has, short of plastic
    matF.specular = new pc.Color(0.20, 0.21, 0.18);
    matF.gloss = 0.38;
    matF.useMetalness = false;
    matF.emissive = new pc.Color(0.02, 0.03, 0.02);
    matF.emissiveIntensity = 0.5;
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
      const e = ease(pr);
      const k = headAt(e);
      const c = curve(k);
      const dd = 0.006;
      const v = sub(curve(k + dd), curve(k - dd));
      const vl = Math.hypot(v[0], v[1], v[2]) || 1e-6;
      const dir = [v[0] / vl, v[1] / vl, v[2] / vl];
      const flat = Math.hypot(dir[0], dir[2]);
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
      // rest goes to one through the last quarter of the climb, by progress.
      // It used to be driven by the speed along the path, and once the
      // birth was slowed the speed only died in the last hundredth, so the
      // whole settle, fifty degrees of pitch, happened in one frame.
      const xr = Math.min(1, Math.max(0, (pr - 0.75) / 0.25));
      const rest = xr * xr * (3 - 2 * xr);
      let dA = hisHead - ha;
      while (dA > Math.PI) dA -= TAU;
      while (dA < -Math.PI) dA += TAU;
      const want = ha + dA * rest;
      // the smoothing, by progress
      if (hhS === null || pr < lastP) hhS = want;
      let dS = want - hhS;
      while (dS > Math.PI) dS -= TAU;
      while (dS < -Math.PI) dS += TAU;
      // A fifth of what it was. At 0.05 the head trailed the path by some
      // forty five degrees through the fast part of the coil, looking where
      // it had been going; that much was only needed to hide the corner.
      hhS += dS * (1 - Math.exp(-(pr - lastP) / 0.02));
      lastP = pr;
      // Never still. Three slow waves at frequencies that do not divide into
      // each other, so it casts about instead of tracking like a bead on a
      // wire. Quieter when it is at rest, so the settle reads as a settle.
      const w = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
      const calm = 1 - 0.6 * rest;
      const sway = [(Math.sin(w * 0.83) * 0.20 + Math.sin(w * 0.37 + 2.1) * 0.09) * calm,
                    (Math.sin(w * 0.61 + 1.7) * 0.13) * calm,
                    (Math.cos(w * 0.71 + 0.4) * 0.20 + Math.cos(w * 0.29 + 0.8) * 0.08) * calm];
      // Up or down. Moving: the path's own climb, plus the model's droop,
      // since its snout sits under its axis (measured from its vertices:
      // twelve degrees skull to tip, thirty from the centroid to the tip),
      // so the snout itself points where it is going and not the axis; plus
      // a little more, because the coil's local slope is shallow for most
      // of the way and he wants it reading upward through a climb. It used
      // to take 0.85 of the slope and no droop, and he saw it looking down
      // the whole way up. At rest: the angle he called perfect, untouched.
      const climb = Math.asin(Math.max(-1, Math.min(1, dir[1])));
      const elev = climb + DROOP + LIFT;
      const moveAim = [Math.sin(hhS) * Math.cos(elev), Math.sin(elev), Math.cos(hhS) * Math.cos(elev)];
      const restAim = [Math.sin(hhS) * Math.cos(REST_DOWN), Math.sin(REST_DOWN), Math.cos(hhS) * Math.cos(REST_DOWN)];
      const aim = norm([moveAim[0] * (1 - rest) + restAim[0] * rest + sway[0],
                        moveAim[1] * (1 - rest) + restAim[1] * rest + sway[1],
                        moveAim[2] * (1 - rest) + restAim[2] * rest + sway[2]]);
      socket.setLocalPosition(c[0], c[1], c[2]);
      // lookAt takes world coordinates. It was being given the root's own,
      // and the root stands a metre up and at a third of his height, so
      // every aim came out pointing down by an amount that depended on
      // where the head was: thirty six degrees low early in the climb,
      // twenty at the shoulder. That is the "looking down the whole way up"
      // he saw, and no rule above this line could have fixed it. The twenty
      // at the shoulder is the look he approved, so it is kept on purpose,
      // as REST_DOWN. The root is not rotated, so the direction itself is
      // the same in both spaces.
      const wp = socket.getPosition();
      socket.lookAt(wp.x + aim[0], wp.y + aim[1], wp.z + aim[2]);
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
        const e = ease(k);
        placeHead(k);
        refresh(body, buildBody(e));
        refresh(plume, buildFeathers(e), false);
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
