// The figure that arrives behind the capture.
//
// It owns its geometry and its materials and nothing else. It does not know
// where the camera is, which pose is on screen, or when anything happens.
// js/aura.js builds it, puts it where it belongs, and drives three numbers:
//
//   reveal(0 to 1)  how much of it has condensed out of the light
//   spread(0 to 1)  how far the fan of arms has opened
//   heat(0 to 1)    how hot the gold runs, which falls away once it has landed
//
// Built from primitives on purpose. Chibi is mostly a question of proportion,
// and primitives cannot do anything but simple shapes.
window.makeDeity = (app) => {
  const ARMS = 10;

  // ---- a noise map, so the figure condenses rather than pops ----
  const noise = noiseTexture(app.graphicsDevice, 256);

  // Flat, not metal. Lit metal breaks the figure into separate shiny beads;
  // what the references have is one continuous field of gold, so the colour
  // comes from emission and the lighting only shades it slightly.
  const gold = new pc.StandardMaterial();
  gold.diffuse = new pc.Color(.10, .06, .02);
  gold.emissive = new pc.Color(.95, .60, .14);
  gold.useMetalness = false;
  gold.gloss = .2;
  gold.opacityMap = noise;
  gold.opacityMapChannel = "r";
  gold.alphaTest = 1.0;          // starts fully dissolved
  gold.update();

  const dark = gold.clone();
  dark.diffuse = new pc.Color(.04, .02, .01);
  dark.emissive = new pc.Color(.10, .05, .01);
  dark.update();

  const root = new pc.Entity("deity");
  const fan = new pc.Entity("fan");     // the arms, so they can open on their own
  root.addChild(fan);

  const part = (type, pos, scale, euler, mat, parent) => {
    const e = new pc.Entity();
    e.addComponent("render", { type, material: mat || gold, castShadows: false, receiveShadows: false });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalScale(scale[0], scale[1], scale[2]);
    if (euler) e.setLocalEulerAngles(euler[0], euler[1], euler[2]);
    (parent || root).addChild(e);
    return e;
  };

  // Head first and biggest.
  part("torus", [0, .55, -.34], [1.18, 1.18, 1.18], [90, 0, 0]);   // halo
  part("sphere", [0, .55, 0], [.72, .76, .68]);                    // head
  part("sphere", [0, 1.00, 0], [.26, .22, .26]);                   // ushnisha
  part("sphere", [0, 1.14, 0], [.13, .15, .13]);
  part("sphere", [-.40, .47, 0], [.09, .30, .07]);                 // long ears
  part("sphere", [ .40, .47, 0], [.09, .30, .07]);

  part("sphere", [-.21, .60, -.30], [.14, .035, .04], null, dark); // closed eyes
  part("sphere", [ .21, .60, -.30], [.14, .035, .04], null, dark);
  part("sphere", [0, .74, -.31], [.05, .05, .03], null, dark);     // urna
  part("sphere", [0, .38, -.30], [.11, .028, .03], null, dark);    // mouth

  part("cylinder", [0, .16, 0], [.18, .10, .18]);                  // neck
  part("sphere", [0, -.08, 0], [.66, .48, .52]);                   // body
  part("sphere", [0, -.42, .02], [.92, .24, .60]);                 // crossed legs
  part("cylinder", [0, -.58, 0], [.90, .06, .90]);                 // lotus

  // The fan of arms. It opens to the sides and skips straight up, so the head
  // keeps the top of the frame.
  const PER = Math.max(1, Math.round(ARMS / 2));
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < PER; i++) {
      const ang = side * (46 + (i / Math.max(1, PER - 1)) * 104);
      const rad = (ang * Math.PI) / 180;
      const r0 = .44, len = .44, pivotY = .10;
      const mid = r0 + len * .5;
      const sx = Math.sin(rad), cy = Math.cos(rad);
      part("capsule", [sx * mid, pivotY + cy * mid, -.06],
           [.050, len * .42, .050], [0, 0, -ang], null, fan);
      const pr = r0 + len + .13;
      part("sphere", [sx * pr, pivotY + cy * pr, -.06],
           [.19, .22, .05], [0, 0, -ang], null, fan);              // palm
      for (let f = 0; f < 3; f++) {
        const off = (f - 1) * .085, fr = pr + .19;
        part("sphere", [sx * fr - cy * off, pivotY + cy * fr + sx * off, -.06],
             [.040, .075, .035], [0, 0, -ang], null, fan);         // fingers
      }
    }
  }

  let lastCut = -1, lastGlow = -1;

  return {
    root,

    reveal(v) {
      const cut = Math.max(.01, 1 - ease(v));
      if (Math.abs(cut - lastCut) < .002) return;
      lastCut = cut;
      gold.alphaTest = cut;
      dark.alphaTest = cut;
      gold.update();
      dark.update();
    },

    spread(v) {
      const s = .18 + ease(v) * .82;
      fan.setLocalScale(s, s, s);
    },

    heat(v) {
      // A slow breath on top, so it never sits perfectly still.
      const g = .78 + v * .60 + .05 * Math.sin(performance.now() / 900);
      if (Math.abs(g - lastGlow) < .004) return;
      lastGlow = g;
      gold.emissive.set(g * 1.00, g * .63, g * .15);
      gold.update();
    },
  };

  function ease(k) { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); }

  // Value noise, smoothed. It only has to be lumpy enough that the dissolve
  // reads as the figure condensing rather than fading.
  function noiseTexture(device, s) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const ctx = cv.getContext("2d");
    const cells = 16, grid = [];
    for (let i = 0; i < (cells + 1) * (cells + 1); i++) grid.push(Math.random());
    const at = (x, y) => grid[(y % (cells + 1)) * (cells + 1) + (x % (cells + 1))];
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const fx = (x / s) * cells, fy = (y / s) * cells;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        let tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        const top = a + (b - a) * tx, bot = c + (d - c) * tx;
        const v = top + (bot - top) * ty;
        const px = (y * s + x) * 4, n = Math.round(v * 255);
        img.data[px] = n; img.data[px + 1] = n; img.data[px + 2] = n; img.data[px + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new pc.Texture(device, { width: s, height: s, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.setSource(cv);
    return t;
  }
};
