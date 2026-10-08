// The light, and the clock that runs the whole arrival.
//
// The shape of it, taken from the reference: the capture turns up standing
// idle, the air charges around it, a point of light builds at the chest and
// lets go, and inside that white the pose changes to the meditating one. When
// the light clears the figure condenses behind it and stays.
//
// The burst is the whole trick. The reference never transitions, it cuts
// inside the steam: it fills the box and thins away onto a different world
// in it. Nothing here has to turn into anything else.
//
// This file owns the steam's reach, the atmosphere's signals and the timing.
// js/deity.js owns the figure. splat-stage.js owns the capture and the camera
// and hands the scene over through the "splat-stage" event.
(() => {
  window.addEventListener("splat-stage", (e) => build(e.detail), { once: true });

  // ---- where the figure stands ----
  const SIZE   = 0.33;  // overall scale, in subject heights
  const FOLLOW = 2.40;  // how fast it swings round to the camera. lower lags more

  // ---- the beats, in seconds from the moment the idle pose lands ----
  //
  // The piece is one camera and one box, and it goes: the steam gathers on
  // him for four seconds, which is the part a visitor sees before deciding
  // whether to stay; the same steam thickens until it fills the box; the pose
  // changes under it; the steam thins into a violet night full of stars; a
  // star falls; the serpent climbs out of the floor while the night turns
  // vivid, and comes to rest on his shoulder. An explosion used to stand
  // between the steam and the night, built against a reference clip beat by
  // beat; he liked the steam and not the explosion, so the steam became the
  // whole change.
  // The gathering ran four seconds and he asked for a third less; it is
  // 2.67 now and everything after it moved up by the same 1.33, so the beats
  // keep their shares. The cover is full a quarter second before the swap
  // and holds a third of a second past it, so the pose changes under solid
  // steam and not under the last of it.
  const T_BUILD  = 0.30;  // the air starts to gather on him, cold and thin
  const T_THICK  = 2.97;  // it thickens and spreads
  const T_COVER  = 3.74;  // nothing in the box but steam
  const T_SWAP   = 3.99;  // the pose changes, under it
  const T_CLEAR  = 4.34;  // the steam starts to let go
  const T_NIGHT  = 5.07;  // and the violet night is there, full of stars
  const T_METEOR = 5.57;  // a star falls across it
  const T_DEITY  = 6.27;  // the serpent starts climbing, under the violet
  const T_HELD   = 6.37;  // the violet starts to turn, as slowly as it climbs
  const T_SET    = 9.47;  // the serpent has resolved
  const T_FAN    = 9.87;  // and come to rest on his shoulder

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

    // ---- the clock ----
    let t = -1;                  // seconds since the idle pose landed
    let swapped = false, released = false;
    let yaw = 0, aimed = false;

    // Two debug handles on the url, both no ops for a visitor.
    //   ?fast    starts the clock just before the steam thickens, so the
    //            cover and everything after it can be worked on without
    //            sitting through the gathering every time.
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
    const SKIP = q.has("fast") ? T_THICK - 0.4 : q.has("serpent") ? T_DEITY - 0.5 : 0;
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


      if (t < 0) return;
      if (isNaN(HOLD_AT)) t += dt;
      // Where the piece has got to, for anything watching from outside. A
      // recorder running on software rendering gets a handful of frames a
      // second and the engine caps the step it will take, so a recording runs
      // at a fraction of the real pace. Without this, every preview lies
      // about the timing.
      window.__auraClock = t;

      // ---- the steam ----
      // One thing, in three states. It gathers on his outline, cold and
      // thin. Then it thickens and spreads until there is nothing in the box
      // but steam, and the pose changes under it. Then it lets go, drifting
      // out and up and thinning into the night behind it. The explosion that
      // used to stand between the first and the last of these is gone on his
      // call: the steam was the part that worked.
      const k2 = clamp(norm(t, T_BUILD, T_THICK), 0, 1);
      el.dataset.charge = (k2 * (1 - clamp(norm(t, T_COVER, T_CLEAR), 0, 1))).toFixed(3);
      const flick = .86 + .14 * Math.sin(t * 17.3) * Math.sin(t * 6.1);
      const thick = ease(clamp(norm(t, T_THICK, T_COVER), 0, 1));
      const gone  = ease(clamp(norm(t, T_CLEAR, T_NIGHT + .5), 0, 1));
      // how far off him it stands, in his heights: the gathering's own small
      // reach, then out past the corners of the box, then further as it goes
      const push = (.004 + .150 * Math.pow(k2, 0.85)) + 1.30 * thick + 1.20 * gone;
      // how much it carries: the gathering's flicker, then dense, then nothing
      const fade = Math.min(1, Math.pow(k2, 1.00) * 1.35) * flick * (1 - thick)
                 + 4.5 * thick * (1 - gone);
      const grow = 1 + 2.4 * thick * (1 - .5 * gone);
      const airA = .018 * thick * (1 - gone);
      // whiter as it thickens: at its gathering tint it read as grey smoke
      // against the pale steam the backdrop paints behind it
      scene.aura(push, fade, [.84 + .32 * thick, .94 + .22 * thick, 1.0 + .16 * thick], grow, airA);
      // and the copy in front of him, which is what actually hides the swap.
      // Denser than the one behind: at the same weight he was a ghost under
      // it and the pose changed in plain view.
      // It stays on him rather than spreading with the shell: the backdrop
      // covers the rest of the box by itself, and sent out past the corners
      // the veil left gaps over his own silhouette, which is the one place
      // it is needed. Measured as the mean difference between the frame with
      // him and without him, out of 255: eight spread out, under two here.
      // It goes as soon as the swap is behind it, in a third of a second,
      // while the steam behind him is still nearly whole: he comes out of
      // the steam in the new pose, and the steam then breaks up into the
      // night. Left to thin with the shell it hung on as a white cut out of
      // his own shape over the night.
      const hide = thick * (1 - ease(clamp(norm(t, T_CLEAR, T_CLEAR + .35), 0, 1)));
      scene.veil(.10 + .25 * thick + .60 * (1 - hide), 14.0 * hide, 1 + 4.0 * thick, .12 * hide);

      // ---- what the backdrop is doing, one named signal per beat ----
      const sig = el.dataset;
      // the box filling with steam behind him, breaking up as it thins
      sig.cover = (thick * (1 - ease(clamp(norm(t, T_CLEAR, T_NIGHT), 0, 1)))).toFixed(3);
      // the violet night comes through as the steam thins, holds, and leaves
      // across the serpent's whole climb, so the climb and the colour turning
      // are one movement
      // It is fully there before the steam opens, or the page shows through
      // the gaps; nobody sees it arrive under the cover.
      sig.cool = (ease(clamp(norm(t, T_CLEAR - .3, T_CLEAR + .5), 0, 1))
              * (1 - ease(clamp(norm(t, T_HELD, T_SET - 1.0), 0, 1)))).toFixed(3);
      // and it breathes once while it is there
      sig.swell = Math.pow(Math.sin(clamp(norm(t, T_NIGHT, T_DEITY + .4), 0, 1) * Math.PI), 1.15).toFixed(3);
      // one falling star, while the night is at its fullest
      const mu = norm(t, T_METEOR, T_METEOR + .55);
      sig.meteor = (mu > 0 && mu < 1 ? mu : 0).toFixed(3);
      // the night turning vivid, tied to the serpent's own climb
      sig.field = ease(clamp(norm(t, T_DEITY, T_FAN - .2), 0, 1)).toFixed(3);

      // ---- the pose changes while nobody can see ----
      // Keep asking until it takes. The second pose is six megabytes, so on a
      // slow line it will not be ready at the stroke of T_SWAP, and giving up
      // after one try left the capture standing in the idle pose for good.
      // A swap that lands late is visible for a moment; a swap that never
      // lands loses the whole point of the burst.
      if (!swapped && t >= T_SWAP) {
        swapped = scene.swap();
        // and from here the camera holds still, facing him, until the
        // serpent has come to rest on his shoulder
        if (swapped) scene.hold(true);
      }
      if (swapped && !released && t >= T_FAN) { released = true; scene.hold(false); }

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

})();
