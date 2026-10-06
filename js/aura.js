// The light, and the clock that runs the whole arrival.
//
// The shape of it, taken from the reference: the capture turns up standing
// idle, the air charges around it, a point of light builds at the chest and
// lets go, and inside that white the pose changes to the meditating one. When
// the light clears the figure condenses behind it and stays.
//
// The burst is the whole trick. The reference never transitions, it cuts
// inside a flash: the frame goes white and comes back with a different world
// in it. Nothing here has to turn into anything else.
//
// This file owns the motes, the flash, the atmosphere and the timing.
// js/deity.js owns the figure. splat-stage.js owns the capture and the camera
// and hands the scene over through the "splat-stage" event.
(() => {
  window.addEventListener("splat-stage", (e) => build(e.detail), { once: true });

  // ---- where the figure stands ----
  const DEPTH  = 2.10;  // how far behind the capture, in subject heights
  const LIFT   = 0.52;  // how far above the capture's middle
  const SIZE   = 1.15;  // overall scale, in subject heights
  const FOLLOW = 2.40;  // how fast it swings round to the camera. lower lags more

  // ---- the beats, in seconds from the moment the idle pose lands ----
  const T_BUILD = 0.70;  // the air starts to charge
  const T_SPARK = 3.20;  // a point of light at the chest
  const T_BURST = 3.90;  // it lets go
  const T_PEAK  = 4.25;  // the frame is white
  const T_SWAP  = 4.45;  // the pose changes, under the white
  const T_CLEAR = 5.60;  // the flash has gone
  const T_OPEN  = 5.00;  // the figure starts to condense
  const T_SET   = 7.20;  // it is all there
  const T_FAN   = 7.90;  // the arms have finished opening

  function build(scene) {
    const { app, camera, el } = scene;

    // ---- light. Only the meshes care; the splat is unlit. ----
    const key = new pc.Entity("aura-key");
    key.addComponent("light", { type: "directional", intensity: 1.1, color: new pc.Color(1, .93, .80) });
    key.setEulerAngles(38, 150, 0);
    app.root.addChild(key);

    const warm = new pc.Entity("aura-warm");
    warm.addComponent("light", {
      type: "omni", intensity: 2.0, range: 12, color: new pc.Color(1, .66, .22),
    });
    app.root.addChild(warm);

    const deity = window.makeDeity(app);
    app.root.addChild(deity.root);
    deity.reveal(0);
    deity.spread(0);

    // ---- the motes ----
    const dot = dotTexture(app.graphicsDevice, 64);
    const drift = makeParticles(app, dot, {
      numParticles: 140, lifetime: 3.4, rate: .022, rate2: .05,
      size: .05, radius: .45, rise: [.10, .40], loop: true, autoPlay: true,
      colour: [[0, 1], [0, .80], [0, .42]],
    });
    // The charge is cold and pulls inward, so the burst reads as a change of
    // temperature and not only of brightness.
    const charge = makeParticles(app, dot, {
      numParticles: 240, lifetime: 1.5, rate: .004, rate2: .010,
      size: .07, radius: 1.30, rise: [-.05, .10], radial: [-1.9, -.30],
      loop: true, autoPlay: false,
      colour: [[0, .86, 1, 1], [0, .92, 1, .78], [0, 1.0, 1, .38]],
    });

    // ---- the flash ----
    const flash = document.createElement("div");
    flash.className = "splat-flash";
    flash.setAttribute("aria-hidden", "true");
    el.appendChild(flash);

    // ---- the clock ----
    let t = -1;                  // seconds since the idle pose landed
    let charging = false, swapped = false;
    let yaw = 0, aimed = false;
    const pos = new pc.Vec3();

    // Adding ?fast to the url starts the clock just before the spark, so the
    // burst and everything after it can be worked on without sitting through
    // the charge every time. It changes nothing for a visitor.
    const SKIP = location.search.indexOf("fast") >= 0 ? T_SPARK - 0.4 : 0;
    scene.onReady(() => { t = SKIP; });

    app.on("update", (dt) => {
      const pivot = scene.pivot();
      const h = scene.height();
      const cam = camera.getPosition();

      // Where the camera stands, as an angle around the figure.
      const want = Math.atan2(cam.x - pivot.x, cam.z - pivot.z);
      if (!aimed) { yaw = want; aimed = true; }
      let d = want - yaw;
      while (d >  Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      yaw += d * (1 - Math.exp(-dt * FOLLOW));

      // Where it stands comes from where the camera actually is, so it holds
      // the back of the frame. Only the way it faces is allowed to arrive
      // late, which is what gives it weight when the view is dragged. Letting
      // the position lag as well slides it off centre, because the view turns
      // without ever stopping and the lag never gets a chance to catch up.
      const bx = Math.sin(want), bz = Math.cos(want);
      pos.set(pivot.x - bx * h * DEPTH, pivot.y + h * LIFT, pivot.z - bz * h * DEPTH);
      deity.root.setPosition(pos);
      deity.root.setLocalScale(h * SIZE, h * SIZE, h * SIZE);
      const sx = Math.sin(yaw), sz = Math.cos(yaw);
      deity.root.lookAt(pos.x + sx * 10, pos.y, pos.z + sz * 10);

      warm.setPosition(pos.x, pos.y, pos.z);
      drift.setPosition(pivot.x, pivot.y, pivot.z);
      drift.setLocalScale(h, h, h);
      charge.setPosition(pivot.x, pivot.y, pivot.z);

      if (t < 0) return;
      t += dt;

      // ---- the charge: the cloud tightens as it builds ----
      if (!charging && t >= T_BUILD) { charging = true; charge.particlesystem.play(); }
      if (charging && t >= T_BURST) { charging = false; charge.particlesystem.stop(); }
      const tight = 1 - .55 * clamp(norm(t, T_BUILD, T_BURST), 0, 1);
      charge.setLocalScale(h * tight, h * tight, h * tight);
      el.dataset.charge = clamp(norm(t, T_BUILD, T_BURST), 0, 1).toFixed(3);

      // ---- the flash: a point of light, then the whole frame ----
      let fs = 0, fo = 0;
      if (t >= T_SPARK && t < T_BURST) {
        const k = norm(t, T_SPARK, T_BURST);
        fs = .03 + k * k * .26;
        fo = k * .9;
      } else if (t >= T_BURST && t < T_PEAK) {
        const k = ease(norm(t, T_BURST, T_PEAK));
        fs = .29 + k * 2.5;
        fo = 1;
      } else if (t >= T_PEAK && t < T_CLEAR) {
        const k = norm(t, T_PEAK, T_CLEAR);
        fs = 2.79 + k * .9;
        fo = 1 - k * k;
      }
      flash.style.transform = "translate(-50%, -50%) scale(" + fs.toFixed(3) + ")";
      flash.style.opacity = fo.toFixed(3);

      // The room warms up under the flash, so when the light clears the world
      // behind the capture is already a different one.
      el.dataset.glow = clamp(norm(t, T_BURST, T_PEAK), 0, 1).toFixed(3);

      // ---- the pose changes while nobody can see ----
      if (!swapped && t >= T_SWAP) { swapped = scene.swap() || t > T_CLEAR; }

      // ---- the figure condenses ----
      deity.reveal(clamp(norm(t, T_OPEN, T_SET), 0, 1));
      deity.spread(clamp(norm(t, T_SET - .6, T_FAN), 0, 1));
      deity.heat(1 - clamp(norm(t, T_SET, T_SET + 1.8), 0, 1));
    });
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const norm = (v, a, b) => (v - a) / (b - a);
  const ease = (k) => { const c = clamp(k, 0, 1); return c * c * (3 - 2 * c); };

  function makeParticles(app, tex, o) {
    const e = new pc.Entity();
    const cfg = {
      numParticles: o.numParticles,
      lifetime: o.lifetime,
      rate: o.rate, rate2: o.rate2,
      startAngle: 0, startAngle2: 360,
      emitterShape: pc.EMITTERSHAPE_SPHERE,
      emitterRadius: o.radius,
      colorMap: tex,
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      loop: o.loop,
      preWarm: o.autoPlay,
      autoPlay: o.autoPlay,
      scaleGraph: new pc.Curve([0, o.size, 1, o.size * .15]),
      alphaGraph: new pc.Curve([0, 0, .25, 1, 1, 0]),
      colorGraph: new pc.CurveSet(o.colour),
      velocityGraph: new pc.CurveSet([[0, 0], [0, o.rise[0]], [0, 0]]),
      velocityGraph2: new pc.CurveSet([[0, 0], [0, o.rise[1]], [0, 0]]),
    };
    if (o.radial) cfg.radialSpeedGraph = new pc.Curve([0, o.radial[0], 1, o.radial[1]]);
    e.addComponent("particlesystem", cfg);
    app.root.addChild(e);
    return e;
  }

  function dotTexture(device, s) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(.3, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new pc.Texture(device, { width: s, height: s, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    t.setSource(cv);
    return t;
  }
})();
