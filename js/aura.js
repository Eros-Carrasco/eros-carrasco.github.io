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
  const SIZE   = 0.33;  // overall scale, in subject heights
  const FOLLOW = 2.40;  // how fast it swings round to the camera. lower lags more

  // ---- the beats, in seconds from the moment the idle pose lands ----
  //
  // The reference tells this in five shots and we have one camera, so every
  // cut has to become something that happens inside the same frame. Two of
  // them do. The wide shot of the burst seen from across the valley becomes
  // the white collapsing back down into a compact star behind the capture,
  // which also gives the figure somewhere to come from. The quiet shot of him
  // on the lotus under a flat halo becomes the whole room cooling to violet
  // for a moment, with stars, before the warmth comes back.
  // The gathering runs at twice the reference's share of the whole, on his
  // call. It is the part a visitor actually sees before deciding whether to
  // stay, and at its measured 12.6 percent it was over before it registered.
  // Everything from the burst on carries by the same 2.37 seconds, so the
  // beats after it keep their shares relative to each other.
  //
  // Taken off the reference measured as one continuous run of 39.77 seconds,
  // which is what it is: five files played one after the other with no gap.
  // Its share of the whole goes: gathering 12.6, spark 2.3, blow 0.4, white
  // held 3.5, the fire seen whole 2.8, inside the light 1.6, the cold beat
  // 38.5, the figure 38.2. The first five beats take under a quarter of it
  // and the back half takes three quarters, which is the opposite of how this
  // was built. Scaled here to about sixteen seconds at first, keeping those
  // shares; what it has become since is set out below.
  const T_BUILD = 0.30;  // the air starts to charge, cold and white
  const T_SPARK = 4.30;  // a point of gold at the chest, the first in the piece
  const T_BURST = 5.04;  // it lets go, and the fire is already at full reach
  const T_WHITE = 5.16;  // the frame is white, and it is very quick
  const T_SWAP  = 5.32;  // the pose changes, under the white
  const T_LIFT  = 5.73;  // the white has been held full, and starts to open
  // Four hundredths apart on purpose. That collapses the fire's own beat to
  // nothing without tearing the signals out: the fire still burns through the
  // white, because sig.star starts before T_BURST, and it dies into the violet
  // instead of getting a moment of its own. His words: the fire is the result
  // of the explosion, not a thing that happens after it. With the two a tenth
  // apart and the cold starting after them, the frame measured 0.64 at 5.82,
  // 0.10 at 6.02, 0.74 at 6.27, 0.07 at 6.72 and 0.38 at 7.55: white, dark,
  // gold, dark, violet, a strobe no still of any one beat showed.
  const T_STAR  = 5.74;  // the white opens straight onto the fire
  const T_WARM  = 5.78;  // which is already dying
  const T_COOL  = 5.80;  // the room cools, stars come out
  // The serpent sets off while the room is still violet, and the violet leaves
  // across its whole climb, so the climb and the colour turning are one
  // movement. It used to set off a quarter second after the violet had gone,
  // which left the window open to the page for two seconds with the head
  // arriving inside it. Thirteen and a half seconds became about eleven.
  const T_DEITY = 7.60;  // the serpent starts climbing, under the violet
  const T_HELD  = 7.70;  // the violet starts to leave, as slowly as it climbs
  const T_FIELD = 7.70;  // the tone starts turning, the same instant
  const T_SET   = 10.80; // the serpent has resolved
  const T_FAN   = 11.20; // and come to rest on his shoulder

  // How much light the room keeps once the flash is gone. The backdrop reads
  // this as its resting state, so he is left standing in light rather than in
  // the dark room he started in.
  const SETTLED = 0.58;

  function build(scene) {
    const { app, camera, el } = scene;

    // ---- light ----
    // None of the room's own. The capture is unlit and so are the motes, so
    // the key and the orange lamp the room used to carry lit nothing but the
    // serpent, from the sides the lab never lit it from, and the stone body
    // that was judged there came back a flat bright green tube. The serpent
    // brings its own rig, the lab's, so both pages light it the same way.
    const serpent = window.makeSerpent(app);
    app.root.addChild(serpent.root);
    serpent.reveal(0);

    // ---- the motes ----
    const dot = dotTexture(app.graphicsDevice, 64);
    const drift = makeParticles(app, dot, {
      numParticles: 140, lifetime: 3.4, rate: .022, rate2: .05,
      size: .05, radius: .45, rise: [.10, .40], loop: true, autoPlay: false,
      colour: [[0, 1], [0, .80], [0, .42]],
    });
    // The charge is cold and pulls inward, so the burst reads as a change of
    // temperature and not only of brightness.
    // ---- the flash ----
    const flash = document.createElement("div");
    flash.className = "splat-flash";
    flash.setAttribute("aria-hidden", "true");
    el.appendChild(flash);


    // ---- the clock ----
    let t = -1;                  // seconds since the idle pose landed
    let swapped = false, drifting = false;
    let yaw = 0, aimed = false;

    // Two debug handles on the url, both no ops for a visitor.
    //   ?fast    starts the clock just before the spark, so the burst and
    //            everything after it can be worked on without sitting through
    //            the charge every time.
    //   ?t=5.6   holds the clock at that second forever, which is the only
    //            reliable way to look at one beat: the recorder runs slower
    //            than real time, so guessing which second a frame landed on
    //            costs more than it saves.
    const q = new URLSearchParams(location.search);
    const HOLD_AT = q.has("t") ? parseFloat(q.get("t")) : NaN;
    // ?serpent starts just before the serpent sets off, for the lab page that
    // replays only the climb. The camera then starts from the front rather
    // than from where a full run would have carried it, which is a known
    // difference and the lab says so.
    const SKIP = q.has("fast") ? T_SPARK - 0.4 : q.has("serpent") ? T_DEITY - 0.5 : 0;
    scene.onReady(() => { t = isNaN(HOLD_AT) ? SKIP : HOLD_AT; });

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

      // The serpent is wound round him, so it stands where he stands rather
      // than behind him, and it does not turn to face the camera: a coil has
      // no face to turn, which is the whole reason it was chosen.
      serpent.root.setPosition(pivot.x, pivot.y, pivot.z);
      serpent.root.setLocalScale(h * SIZE, h * SIZE, h * SIZE);

      drift.setPosition(pivot.x, pivot.y, pivot.z);
      drift.setLocalScale(h, h, h);

      if (t < 0) return;
      if (isNaN(HOLD_AT)) t += dt;
      // Where the piece has got to, for anything watching from outside. A
      // recorder running on software rendering gets a handful of frames a
      // second and the engine caps the step it will take, so a recording runs
      // at a fraction of the real pace. Without this, every preview lies
      // about the timing.
      window.__auraClock = t;

      // ---- the charge: the cloud tightens, then rushes, then shivers ----
      const k = clamp(norm(t, T_BUILD, T_BURST), 0, 1);

      // It closes slowly and then all at once, and by the end the whole cloud
      // is shaking, so there is pressure in the second before it lets go.
      const tight = 1 - .18 * Math.pow(k, 1.8);
      const sh = Math.pow(k, 5) * h * .030;
      const jx = Math.sin(t * 61) * sh, jy = Math.cos(t * 47) * sh;
      const wide = 1 - .10 * k;

      // The warm motes are drawn in with everything else, until they are a
      // knot at his chest and the room is cold and empty before it goes.
      const pull = 1 - .80 * Math.pow(k, 1.5);
      drift.setLocalScale(h * pull, h * pull, h * pull);
      el.dataset.charge = k.toFixed(3);

      // ---- the flash: a point, then the frame, then back to a point ----
      // The last stretch is the one that stands in for the cut to the wide
      // shot: the white does not fade where it is, it draws back down into
      // itself until all that is left is a star behind him.
      let fs = 0, fo = 0;
      if (t >= T_SPARK && t < T_BURST) {
        const u = norm(t, T_SPARK, T_BURST);
        fs = .03 + u * u * .34;
        // The point itself is drawn in the shader so it can have points on it.
        // This is only the haze around it, and it gutters.
        fo = u * .45 * (.80 + .20 * Math.sin(t * 34));
      } else if (t >= T_BURST && t < T_WHITE) {
        const u = ease(norm(t, T_BURST, T_WHITE));
        fs = .27 + u * 2.9;
        fo = u * .92;
      } else if (t >= T_WHITE && t < T_LIFT) {
        // Held full. The reference sits on the blown out frame for more than
        // a second before anything opens, and that hold is most of what makes
        // the burst land.
        //
        // Never a lid, except for the few frames the swap needs. Measured off
        // the reference: through the whole of its white his silhouette sits
        // at 60 percent of the brightness of the air around him at first and
        // climbs to 80 by the end, so the body is readable the entire time.
        // A flat sheet at .90 over everything washes him and the light behind
        // him by the same amount, which left ours at 87 percent, flat, no
        // silhouette at all. The reference can do this because its light is
        // behind the man and he blocks it; ours is a layer in front.
        //
        // So the sheet is total only for the fifth of a second around the
        // swap, which is what the swap costs, and open either side of it. The
        // fire underneath carries the brightness while it is open, and his
        // body stands in front of the fire and blocks it, the way it does in
        // the reference.
        // And it closes rather than opens. In the reference the body is at
        // its darkest against the light at the start of the white and fades
        // into it by the end: 63, 60, then 79 percent. Ours ran the other
        // way, flat and then dark, which reads as him stepping out of the
        // light instead of being taken into it.
        const lid = ease(clamp(norm(t, T_SWAP - .07, T_SWAP - .02), 0, 1))
                  * (1 - ease(clamp(norm(t, T_SWAP + .02, T_SWAP + .09), 0, 1)));
        const sheet = .78 + .06 * ease(clamp(norm(t, T_WHITE, T_LIFT), 0, 1));
        fs = 3.17 + norm(t, T_WHITE, T_LIFT) * .25;
        fo = Math.min(.97, sheet + .70 * lid);
      } else if (t >= T_LIFT && t < T_STAR) {
        const u = ease(norm(t, T_LIFT, T_STAR));
        fs = 3.42 - u * 3.20;          // drawn back down to a point
        // It has to clear almost entirely, or the fire it collapses into is
        // still behind a white sheet and nobody sees it. And it has to clear
        // fast: this stands in for a cut, and in the reference the frame goes
        // from blown out to the dark wide shot in four frames. Spread evenly
        // across the beat it left the fire behind a sheet for most of the
        // time it was supposed to be seen.
        fo = .84 * Math.pow(1 - norm(t, T_LIFT, T_STAR), 3.2);
      } else if (t >= T_STAR && t < T_WARM) {
        const u = norm(t, T_STAR, T_WARM);
        fs = .22 + u * .10;
        fo = .07 * Math.pow(1 - u, 1.6);
      }
      flash.style.transform = "translate(-50%, -50%) scale(" + fs.toFixed(3) + ")";
      flash.style.opacity = fo.toFixed(3);

      // ---- what the air is doing, one named signal per beat ----
      const sig = el.dataset;
      // It has to let go as well as build. Leaving it pinned at one after the
      // burst left the frame shivering for the rest of the piece, which is
      // only noticeable once everything else has gone still.
      const chg = clamp(norm(t, T_BUILD, T_BURST), 0, 1)
                * (1 - clamp(norm(t, T_BURST, T_BURST + .22), 0, 1));
      sig.charge = chg.toFixed(3);
      // The four pointed star that used to grow at his chest is gone, on his
      // call. What is left of that beat is the air gathering on his own outline
      // and the light letting go, with nothing drawn on top of him.
      const sk = clamp(norm(t, T_SPARK, T_BURST), 0, 1);
      void sk;

      // The contour on the capture's own outline. It stands further off and
      // burns harder as the air gathers, flickering, and it is gone the
      // instant the light lets go, because after that there is nothing left
      // to trace.
      const k2 = clamp(norm(t, T_BUILD, T_BURST), 0, 1);
      const out = 1 - clamp(norm(t, T_BURST, T_WHITE), 0, 1);
      const flick = .86 + .14 * Math.sin(t * 17.3) * Math.sin(t * 6.1);
      // The exponents came down when the gathering was stretched. They are
      // powers of how far through the window we are, so doubling the window
      // and leaving them alone does not make the steam last longer, it makes
      // it start later: at 1.2 seconds there was six times less of it than
      // before. Halving them puts it back where it appeared and lets it go on
      // building for the whole of the longer beat, which is what was asked
      // for.
      scene.aura(
        (.004 + .150 * Math.pow(k2, 0.85)) * out,
        Math.min(1, Math.pow(k2, 1.00) * 1.35) * flick * out,
        null
      );
      // The fire reaches full size under the white, not after it. When the
      // sheet lifts it is already out to its full reach, which is what makes
      // the burst feel like it happened rather than like it is still happening.
      sig.star = (ease(clamp(norm(t, T_BURST - .14, T_BURST), 0, 1))
              * (1 - ease(clamp(norm(t, T_WARM - .15, T_WARM + .55), 0, 1)))).toFixed(3);
      // The blow is its own window and nothing else's. It is the quarter of a
      // second between the light letting go and the frame going white, and
      // the streaks belong to it alone. Hanging them off the fire instead
      // left them burning through the compact star afterwards, where the
      // reference has a tight ball with short spikes and no wedges at all.
      sig.blow = (ease(clamp(norm(t, T_BURST - .12, T_BURST), 0, 1))
              * Math.pow(1 - clamp(norm(t, T_BURST + .02, T_WHITE + .04), 0, 1), 1.5)).toFixed(3);
      // The white has to be its own signal. Hanging the wash off the fire lit
      // the frame at the blow, and at the blow the reference is dark: 0.24
      // brightness with streaks tearing across it, and it does not go white
      // until a quarter of a second later. Ours was at 0.80 before the blow
      // had even landed, so the violent part of it was never seen.
      // It clears on a clock of its own, not on T_STAR's. With the fire's beat
      // collapsed, T_STAR less the old margin fell before T_LIFT, the window
      // ran backwards and the wash sat at one for the rest of the piece. The
      // fifteen hundredths are what the window measured before that, which is
      // the four frames the reference takes.
      sig.white = (ease(clamp(norm(t, T_BURST + .05, T_WHITE), 0, 1))
              * Math.pow(1 - clamp(norm(t, T_LIFT, T_LIFT + .15), 0, 1), 2.6)).toFixed(3);
      // And it lets go. It used to ramp up and stay at one forever, which was
      // invisible while the cold beat painted over it and then came straight
      // back as a gold starburst the moment the cold lifted, right under the
      // serpent's arrival. Three seconds of the piece were that, and no still
      // of a single beat showed it.
      sig.warm = (ease(clamp(norm(t, T_STAR, T_WARM), 0, 1))
              * (1 - ease(clamp(norm(t, T_COOL, T_COOL + .7), 0, 1)))).toFixed(3);
      // The cold has to hold, not touch and leave. Ramping it up and starting
      // the fade in the same instant is what kept it from ever arriving.
      // And it leaves across the serpent's whole climb, from T_HELD to a second
      // short of the serpent settling, instead of in the half second it used
      // to take. The indigo takes over from it as it goes, in js/backdrop.frag,
      // so the room is turning the entire time the serpent is rising.
      sig.cool = (ease(clamp(norm(t, T_COOL, T_COOL + 1.3), 0, 1))
              * (1 - ease(clamp(norm(t, T_HELD, T_SET - 1.0), 0, 1)))).toFixed(3);
      // The cold beat is the longest thing on the page and ours did not move
      // for the whole of it: hue, saturation and brightness all measured dead
      // flat to three decimals across five seconds. The reference's does move,
      // and by a lot. It opens dark at 0.26, nearly doubles to 0.52 when it
      // reaches the lotus, and comes back down to 0.30. This is that swell.
      sig.swell = Math.pow(Math.sin(clamp(norm(t, T_COOL + .35, T_HELD - .25), 0, 1)
                * Math.PI), 1.15).toFixed(3);
      // Tied to the serpent's own climb, not to a window of its own. It used to
      // finish turning the room in one second while the serpent took three and
      // a half to arrive, so the colour had already landed before the thing it
      // was supposed to be announcing was halfway up. Now the tone travels with
      // the head.
      sig.field = ease(clamp(norm(t, T_DEITY, T_FAN - .2), 0, 1)).toFixed(3);
      // Kept for anything still reading the old single channel.
      sig.glow = sig.warm;

      // The warm motes only exist after the light is out. Before that the
      // whole room is cold, which is what makes the spark land.
      if (!drifting && t >= T_WHITE) { drifting = true; drift.particlesystem.play(); }

      // ---- the pose changes while nobody can see ----
      // Keep asking until it takes. The second pose is six megabytes, so on a
      // slow line it will not be ready at the stroke of T_SWAP, and giving up
      // after one try left the capture standing in the idle pose for good.
      // A swap that lands late is visible for a moment; a swap that never
      // lands loses the whole point of the burst.
      if (!swapped && t >= T_SWAP) swapped = scene.swap();

      // ---- the figure ----
      // It is handed where the camera is, as the stage's yaw in degrees, so the
      // head can come out of the floor facing the viewer and settle facing the
      // viewer, wherever the viewer happens to be by then.
      serpent.reveal(clamp(norm(t, T_DEITY, T_FAN), 0, 1), want * 180 / Math.PI);
      serpent.heat(1 - clamp(norm(t, T_SET, T_SET + 1.8), 0, 1));
      // For one pass it was drawn in js/backdrop.frag. It was four
      // attempts at a lit gold object built from spheres and capsules and
      // every one of them landed between a sticker and a toy. Reading the
      // reference properly says why: there is no lit object in it. The frame
      // is flat yellow and the deity is the shape cut out of it.
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
      emitterShape: o.box ? pc.EMITTERSHAPE_BOX : pc.EMITTERSHAPE_SPHERE,
      emitterExtents: o.box ? new pc.Vec3(o.box[0], o.box[1], o.box[2]) : undefined,
      emitterRadius: o.radius || 0,
      emitterRadiusInner: o.hollow || 0,
      colorMap: tex,
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      loop: o.loop,
      preWarm: o.autoPlay,
      autoPlay: o.autoPlay,
      scaleGraph: new pc.Curve([0, o.size, 1, o.size * .15]),
      alphaGraph: new pc.Curve([0, 0, .25, o.alpha === undefined ? 1 : o.alpha, 1, 0]),
      colorGraph: new pc.CurveSet(o.colour),
      velocityGraph: new pc.CurveSet([[0, 0], [0, o.rise[0]], [0, 0]]),
      velocityGraph2: new pc.CurveSet([[0, 0], [0, o.rise[1]], [0, 0]]),
    };
    if (o.radial) cfg.radialSpeedGraph = new pc.Curve([0, o.radial[0], 1, o.radial[1]]);
    // Drawn along the line it is travelling, which is the difference between
    // a streak of vapour and a bright dot with a tail.
    if (o.along) { cfg.alignToMotion = true; cfg.stretch = .10; }
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
