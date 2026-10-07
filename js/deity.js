// The figure that arrives behind the capture.
//
// Fifth attempt, and the first one that builds a mesh. The four before it
// parented stock primitives together, spheres for the head, capsules for the
// arms, and every one of them read as a toy, because a sphere stuck on a
// capsule is a sphere stuck on a capsule however it is lit. There was also one
// pass that drew the thing flat in the backdrop shader, the way the reference
// actually draws it. That does not transfer either: the reference's camera
// never moves and ours orbits without stopping, so a drawing pinned to the
// screen behind it is a sticker by construction.
//
// So: real vertex and index buffers. The body is one surface lofted through a
// stack of rings whose radius and offset come from a profile, so the shoulders,
// the waist and the crossed legs are the same continuous skin. The arms are
// tubes swept along a curve with a radius that narrows to the wrist. The head
// is part of the same loft, with a topknot on it.
//
// The material matters as much as the shape. Flat emissive gold is what made
// the earlier passes read as stickers: with no variation across the surface
// there is nothing for the eye to read form from, and the camera turning does
// not help because nothing changes as it turns. This one shades from the
// normal, so the surface darkens as it faces away and carries a hot rim where
// it turns from the view, which is what makes it read as an object when the
// view moves.
(() => {
  const SEG = 24;           // segments around each ring
  const ARMS = 9;           // arms a side
  const ARM_SEG = 14;       // rings along each arm
  const ARM_SIDES = 8;

  // The body's profile, bottom to top: [height, radius, how far it leans back].
  // Read as a seated figure: a wide base where the legs cross, a waist, a
  // chest, shoulders, a short neck and a head with a knot on it.
  const PROFILE = [
    [-0.95, 0.04, 0.00],
    [-0.88, 0.52, 0.02],
    [-0.78, 0.78, 0.03],
    [-0.66, 0.84, 0.02],
    [-0.52, 0.72, 0.00],
    [-0.36, 0.56, -0.02],
    [-0.18, 0.48, -0.03],
    [ 0.00, 0.50, -0.03],
    [ 0.18, 0.56, -0.02],
    [ 0.34, 0.60, 0.00],
    [ 0.46, 0.54, 0.01],
    [ 0.54, 0.34, 0.02],
    [ 0.60, 0.22, 0.02],
    [ 0.70, 0.30, 0.02],
    [ 0.84, 0.32, 0.01],
    [ 0.96, 0.26, 0.00],
    [ 1.04, 0.16, 0.00],
    [ 1.10, 0.14, 0.00],
    [ 1.17, 0.09, 0.00],
    [ 1.21, 0.00, 0.00],
  ];

  // Flattened front to back, because a seated figure is not a column.
  const SQUASH = 0.62;

  const lerp = (a, b, t) => a + (b - a) * t;

  // One ring of vertices at a height, with a radius and a lean.
  const ring = (pos, nrm, h, r, lean, squash) => {
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const c = Math.cos(a), si = Math.sin(a);
      pos.push(c * r, h, si * r * squash + lean);
      nrm.push(c, 0, si * squash);   // fixed up once the surface is known
    }
  };

  const body = () => {
    const pos = [], nrm = [], idx = [];
    for (const [h, r, lean] of PROFILE) ring(pos, nrm, h, r, lean, SQUASH);
    const rows = PROFILE.length;
    for (let i = 0; i < rows - 1; i++) {
      for (let s = 0; s < SEG; s++) {
        const a = i * SEG + s, b = i * SEG + (s + 1) % SEG;
        const c = a + SEG, d = b + SEG;
        idx.push(a, c, b, b, c, d);
      }
    }
    return { pos, nrm, idx };
  };

  // An arm: a tube swept along a curve from a shoulder out to a hand, its
  // radius narrowing the whole way. The curve bends so the arms arc rather
  // than spoke straight out, which is most of what makes a fan of them read as
  // arms and not as rays.
  const arm = (out, side, i) => {
    const t0 = i / (ARMS - 1);
    // Broken up on purpose. Evenly spaced arms of an even length came out as a
    // pair of wings rather than as many arms: the eye reads a regular fan as
    // one feathered thing, not as a count of limbs.
    const jitter = Math.sin(i * 2.399) * 0.5 + 0.5;
    const spread = lerp(0.22, 2.35, t0) + (jitter - 0.5) * 0.17;
    const len = lerp(1.50, 0.92, Math.abs(t0 - 0.30)) * (0.82 + jitter * 0.34);
    const lift = lerp(0.46, -0.34, t0);
    const base = out.pos.length / 3;

    for (let k = 0; k <= ARM_SEG; k++) {
      const u = k / ARM_SEG;
      // the curve: out along the spread, arcing up then settling
      const ang = spread + Math.sin(u * Math.PI) * 0.34;
      const d = u * len;
      const cx = side * (0.38 + Math.sin(ang) * d);
      const cy = 0.30 + lift + Math.cos(ang) * d * 0.72 + Math.sin(u * Math.PI) * 0.16;
      const cz = -0.10 - u * 0.42 - i * 0.055;        // each rank further back
      // radius: shoulder to wrist, then a hand on the end
      let r = lerp(0.115, 0.035, u);
      if (u > 0.88) r = lerp(0.035, 0.085, (u - 0.88) / 0.12);
      for (let s = 0; s < ARM_SIDES; s++) {
        const a = (s / ARM_SIDES) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        // the tube's cross section, laid across the sweep direction
        const nx = ca * Math.cos(ang), ny = -ca * Math.sin(ang), nz = sa;
        out.pos.push(cx + nx * r, cy + ny * r, cz + nz * r);
        out.nrm.push(nx * side, ny, nz);
      }
    }
    for (let k = 0; k < ARM_SEG; k++) {
      for (let s = 0; s < ARM_SIDES; s++) {
        const a = base + k * ARM_SIDES + s;
        const b = base + k * ARM_SIDES + (s + 1) % ARM_SIDES;
        const c = a + ARM_SIDES, d = b + ARM_SIDES;
        if (side > 0) idx6(out.idx, a, c, b, b, c, d);
        else idx6(out.idx, a, b, c, b, d, c);
      }
    }
  };

  const idx6 = (idx, a, b, c, d, e, f) => idx.push(a, b, c, d, e, f);

  // Normals from the faces themselves, so the loft and the tubes light the
  // same way and the seams between them do not show.
  const reNormal = (pos, idx) => {
    const n = new Float32Array(pos.length);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const o of [a, b, c]) { n[o] += nx; n[o + 1] += ny; n[o + 2] += nz; }
    }
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
    }
    return Array.from(n);
  };

  window.makeDeity = (app) => {
    const b = body();
    const out = { pos: b.pos, nrm: b.nrm, idx: b.idx };
    for (let i = 0; i < ARMS; i++) { arm(out, 1, i); arm(out, -1, i); }
    out.nrm = reNormal(out.pos, out.idx);

    const mesh = new pc.Mesh(app.graphicsDevice);
    mesh.setPositions(out.pos);
    mesh.setNormals(out.nrm);
    mesh.setIndices(out.idx);
    mesh.update(pc.PRIMITIVE_TRIANGLES);

    const mat = new pc.StandardMaterial();
    // Gold that is lit, not gold that glows. The emissive is kept low and the
    // diffuse does the work, so the surface has somewhere to be dark. With the
    // emissive carrying it there is no variation anywhere and the thing reads
    // as a cut out shape however the view turns.
    mat.diffuse = new pc.Color(0.92, 0.70, 0.22);
    mat.specular = new pc.Color(1.0, 0.86, 0.52);
    mat.gloss = 0.62;
    mat.useMetalness = true;
    mat.metalness = 0.85;
    mat.emissive = new pc.Color(0.52, 0.36, 0.08);
    mat.emissiveIntensity = 0.55;
    mat.opacity = 0;
    mat.blendType = pc.BLEND_NORMAL;
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();

    const root = new pc.Entity("deity");
    const node = new pc.Entity("deity-mesh");
    node.addComponent("render", {
      meshInstances: [new pc.MeshInstance(mesh, mat)],
      castShadows: false, receiveShadows: false,
    });
    root.addChild(node);

    // Its own light, raking from the front and one side, so the form reads.
    // Lit only by the scene's own light it came out evenly bright, which is
    // the same failure as the emissive.
    const key = new pc.Entity("deity-key");
    key.addComponent("light", {
      type: "directional", color: new pc.Color(1.0, 0.93, 0.74),
      intensity: 2.6, castShadows: false,
    });
    key.setEulerAngles(28, 34, 0);
    root.addChild(key);
    const fill = new pc.Entity("deity-fill");
    fill.addComponent("light", {
      type: "directional", color: new pc.Color(0.52, 0.40, 0.78),
      intensity: 1.1, castShadows: false,
    });
    fill.setEulerAngles(-18, -140, 0);
    root.addChild(fill);

    let spreadT = 0;
    return {
      root,
      reveal(v) {
        mat.opacity = Math.max(0, Math.min(1, v));
        mat.update();
      },
      spread(v) {
        spreadT = Math.max(0, Math.min(1, v));
        // the arms open outward as it settles
        node.setLocalScale(1 + spreadT * 0.16, 1 + spreadT * 0.04, 1);
      },
      heat(v) {
        mat.emissiveIntensity = 0.55 + Math.max(0, Math.min(1, v)) * 1.5;
        mat.update();
      },
    };
  };
})();
