#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uSize;
uniform float uLoad;    // how much of the capture has arrived, 0 to 1
uniform float uCharge;  // the air gathering, cold, before anything lets go
uniform float uStar;    // the white drawn back down into a point behind him
uniform float uBlow;    // the quarter second the light lets go in
uniform float uWhite;   // the blown out frame, which is not the fire
uniform float uWarm;    // the volume of light he is left standing inside
uniform float uCool;    // one breath where the room goes cold and starry
uniform float uSwell;   // the rise and fall inside the cold beat
uniform float uField;   // the light flattening into a field for the figure

in  vec3 vPos;
out vec4 fragColor;

// Atmosphere only. The figure moved into the 3D scene (see js/aura.js), so
// this draws the light it stands in and nothing else: cold pressure while the
// air gathers, a warm volume once it lets go, and a slow drift under both.
//
// One uniform per beat, written onto the stage by js/aura.js and forwarded by
// js/backdrop.js. They overlap on purpose: the star is still burning while the
// volume opens, and the cold breath rides on top of the warmth rather than
// replacing it. A uniform nothing sends arrives as zero, so a beat that is not
// wired simply does not happen.

// ---- the knobs ----
const float REACH = 1.15;  // how far the light carries before it dies
const float HAZE  = 0.55;  // how thick the air is
const float SPEED = 1.00;  // multiplies every clock
// -------------------

const vec3 C_FLOOR = vec3(.038, .028, .046);
const vec3 C_AIR   = vec3(.180, .098, .072);
const vec3 C_LIGHT = vec3(1.00, .66, .30);
const vec3 C_COLD  = vec3(.072, .100, .152);  // the air while it gathers
const vec3 C_SPARK = vec3(.55, .82, 1.00);    // what the gathering is lit by
const vec3 C_WARM  = vec3(.44, .29, .16);     // the air it is left standing in
const vec2 HEART   = vec2(.00, .12);          // the chest, where it all goes

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.37, 289.11))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= .5; }
  return v;
}

void main() {
  float t = uTime * SPEED;

  float c     = clamp(uCharge, 0., 1.);
  float g     = clamp(uWarm, 0., 1.);
  float star  = clamp(uStar, 0., 1.);
  float white = clamp(uWhite, 0., 1.);
  float blow  = clamp(uBlow, 0., 1.);
  float cool  = clamp(uCool, 0., 1.);
  float swell = clamp(uSwell, 0., 1.);
  float field = clamp(uField, 0., 1.);

  // The frame shivers as the pressure comes up, worst in the last moment.
  vec2 p = vPos.xy;
  float shake = c * c * c * .020;
  p += vec2(noise(vec2(t * 37., 4.1)) - .5, noise(vec2(9.3, t * 31.)) - .5) * shake;

  vec2  q = p - HEART;
  float r = length(q);

  // The source sits above and drifts, so the room never settles.
  vec2  src = vec2(sin(t * .07) * .35, 1.05);
  float d   = length(p - src);

  // A broad shaft falling from it, widening as it comes down.
  float spread = .30 + (src.y - p.y) * .55;
  float shaft  = exp(-pow(abs(p.x - src.x) / max(spread, .001), 2.0)) * exp(-d * REACH * .55);

  // Haze, lit by the same source.
  float air = fbm(p * 1.7 + vec2(t * .035, -t * .055));
  air = mix(.55, 1.15, air);

  float lit = shaft * air + exp(-d * 2.4) * .35;
  lit *= 1. - .34 * c;   // the room's own light is swallowed as it gathers

  // ---- before the burst: the air tightens ----
  float ang = atan(q.y, q.x);

  // Vapour running inward in uneven spokes, dying as it reaches the chest.
  // Two passes at different speeds, so it never reads as one rotating wheel.
  float stream = 0.0;   // the gathering is drawn on the capture's own outline now

  // The air itself is uneven, and everything below is cut by it.
  float torn = noise(vec2(ang * 1.9, t * .35)) * .70
             + noise(vec2(ang * 6.1, -t * .50)) * .30;


  // What gathers sits around him rather than inside him, because the capture
  // is in front of this and would swallow anything drawn at the chest. So it
  // reads as a sheath hugging the silhouette, tightening and brightening. The
  // edge of it is eaten away by noise, or it draws as a circle.
  float sheath = smoothstep(mix(1.10, .66, c), mix(.46, .22, c), r)
               * smoothstep(.02, mix(.30, .14, c), r);
  sheath *= .15 + .85 * torn * torn;
  float core   = sheath * c * c * (.18 + .22 * c);
  core += exp(-r * r * mix(300., 52., c)) * c * c * c * .9;

  // ---- after it: the warm volume it leaves behind ----
  // Wide and soft. The reference is not a sunburst with hard spokes in it,
  // it is a volume of pale light with broad blurred shafts through it, so
  // these run at a third of the count and nothing like the contrast.
  float rang = atan(q.x, q.y);
  float rayN = noise(vec2(rang * 1.6, t * .04));
  float rays = pow(max(0., .5 + .5 * sin(rang * 5.5 + rayN * 5. + t * .13)), 2.4) * .72;
  rays += pow(max(0., .5 + .5 * sin(rang * 2.6 - rayN * 2.5 - t * .09)), 1.8) * .55;
  rays *= smoothstep(.02, .22, r) * smoothstep(1.90, .22, r) * g;

  // Cloud drifting through the light, which is what keeps it from reading flat.
  // Cloud banks, which is most of what makes the reference read as weather
  // rather than as a lamp. They sit out at the sides and drift.
  float cloud = fbm(p * vec2(.85, 1.25) + vec2(-t * .040, t * .014) + 6.2);
  cloud = smoothstep(.30, .78, cloud);
  cloud *= smoothstep(.22, .85, abs(p.x)) * .85 + .15;
  cloud *= g;

  // A ring standing behind the figure once everything has come to rest.
  float halo = exp(-pow((r - .95) / .30, 2.0)) * g;

  // The blown out middle, strongest while the flash is still up.
  float bloom = exp(-r * 1.7) * g * g;

  // ---- the star: what the white draws back down into ----
  // It stands in for the cut to the wide shot. The whole frame of light
  // becomes one point behind him with long thin rays, and that point is where
  // the figure comes from, so the beat is a cause and not only a pause.
  // A white hot core with a gold collar, and a crown of thin needles at every
  // length. Six fat spokes read as a sparkle; the reference is closer to a
  // dandelion, dozens of fine spikes with nothing regular about them.
  // The star sits behind his head rather than at the chest, where his own
  // body would swallow it. It stands in for the cut to the wide shot, so it
  // has to be seen.
  // Clear of his head, not behind it. At 0.46 the core landed exactly behind
  // his skull and he swallowed all of it, so what reached the frame was the
  // spikes poking out past his shoulders and nothing else. The thing that
  // stands in for the cut to the wide shot has to be seen.
  vec2  sp2  = p - vec2(.0, .78);
  float sr   = length(sp2);
  float sang = atan(sp2.x, sp2.y);
  // A ball, not a pinprick. In the reference's wide shot the star is a dense
  // bright mass about a sixth of the frame across with the fire packed around
  // it, and the spikes only reach half again as far as the mass itself. At a
  // radius of 0.05 it read as a point with threads coming off it.
  float sCore = (exp(-sr * sr * 110.) + exp(-sr * 7.0) * .16) * star;
  float sRing = exp(-pow((sr - .135) / .045, 2.0)) * star * .40;

  // Two layers. Underneath, fire: tendrils that bend, reach and die back,
  // never still for a frame. On top of that, and only on top, the thin flash
  // of lines. Lines alone read as a lens flare, which is what the last pass
  // looked like, and fire alone has no snap to it.
  float bend = noise(vec2(sang * 2.3, t * .14)) - .5;
  float aw   = sang + bend * .60;
  // Slowly. Fire moves, it does not buzz, and anything past about half a
  // cycle a second reads as vibration rather than as something burning.
  float lob  = noise(vec2(aw * 5.0, t * .20)) * .55
             + noise(vec2(aw * 12.0, -t * .33)) * .30
             + noise(vec2(aw * 26.0, t * .46)) * .15;

  // Each tongue gets its own length, not one blended with its neighbours.
  // Reading the reach straight off smooth noise made every spike almost the
  // length of the one beside it, which is why they came out as an even crown.
  // Cutting the circle into tongues first and hashing each one gives lengths
  // that jump from one to the next, the way the reference does.
  float tcnt = 26.0;
  float ti   = floor(aw / 6.2831853 * tcnt + 40.0);
  float tlen = hash(vec2(ti, 11.3));
  float twid = hash(vec2(ti, 27.9));
  float tgap = step(.22, hash(vec2(ti, 5.1)));   // and some do not fire at all
  float tfr  = fract(aw / 6.2831853 * tcnt + 40.0);
  float taper = pow(1. - abs(tfr * 2. - 1.), 1.2 + twid * 3.4);

  float reach = (.075 + .62 * pow(tlen, 1.8)) * taper * tgap;
  reach = max(reach, .110 + .13 * lob);          // a low collar under them all
  float fire  = pow(clamp((reach - sr) / max(reach, .0001), 0., 1.), 2.4);
  fire *= .30 + .70 * lob;
  // Licked away at the tips, so the tongues end ragged instead of rounded.
  fire *= .55 + .45 * noise(vec2(aw * 9.0 + sr * 11.0, t * .38));

  // The flash of lines, laid over the fire and gone almost as fast.
  float a01  = aw / 6.2831853 + .5;
  // Fewer and wider. Sixty four needles at an exponent of fifty are thinner
  // than a pixel for most of their length, and a line thinner than a pixel
  // does not get thinner, it breaks into a dotted row.
  float idx  = floor(a01 * 38.);
  float h1   = hash(vec2(idx, 3.1));
  float h2   = hash(vec2(idx, 9.7));
  float t01  = fract(a01 * 38.);
  float line = pow(1. - abs(t01 * 2. - 1.), 7. + h2 * 13.);
  line *= exp(-sr / (.11 + .44 * h1 * h1)) * step(.45, h1);

  float sRay = (fire * 2.6 + line * .40) * smoothstep(.008, .050, sr) * star;

  // ---- the cold breath: the room empties out and the stars come through ----
  // Sparse and soft. One cell in eleven holds a star, placed somewhere inside
  // itself rather than filling it, so the sky does not read as noise on a
  // grid. Filling every cell is what made the earlier pass look like static.
  // It was one in fifty, and he asked for more. Shot at 7.0 against one in
  // twenty and one in eight: one in eight starts to tile like grain at the
  // edges of the box, one in eleven still reads as a sky.
  vec2  sp   = p * 86.;
  vec2  cell = floor(sp);
  float keep = step(.910, hash(cell + 2.2));
  vec2  at   = vec2(hash(cell), hash(cell + 7.7));
  float dd   = length(fract(sp) - at);
  float sky  = keep * exp(-dd * dd * 70.);
  sky *= .35 + .65 * abs(sin(t * 1.6 + hash(cell) * 40.));
  sky *= cool * smoothstep(.08, .80, r);

  // A thin flat ring standing over his head, the way the reference hangs one
  // over the lotus. Squashed hard, so it reads as a disc seen almost edge on.
  // The flat ring that used to sit over his head through the cold beat is
  // gone, on his call.

  // Before the burst this is a dark room with one shaft falling into it, and
  // it goes colder and closer as the air gathers. After it, the capture is
  // standing inside the light, so the air carries the colour and the rays open
  // up behind it.
  vec3 haze = mix(mix(C_AIR, C_COLD, c), mix(C_WARM, vec3(.62, .58, .50), .55), g);

  // The room the gathering happens in is cold. In the reference it is a blue
  // grey canyon at night, and ours was reading warm brown the whole way
  // through, which took the cold out of the charge before it started. So the
  // floor and the one warm light in the room both drain as the air gathers.
  vec3 floorC = mix(C_FLOOR, vec3(.030, .040, .062), c);
  vec3 lampC  = mix(C_LIGHT, vec3(.62, .76, 1.00), c * .85);

  // It belongs to the cold half of the piece and gives way to the warmth.
  float cold0 = clamp(1. - g - field, 0., 1.);

  vec3 col = floorC * (1. - cold0);

  col = mix(col, haze, smoothstep(1.25, .05, length(p * vec2(1.0, .85))) * HAZE * air * (1. + g * 1.4) * (1. - .80 * cold0));
  // The lamp itself goes pale as the volume opens, or the whole beat sits
  // under an orange cast the reference does not have.
  // The lamp belongs to the beats after the burst and to nothing before them.
  // This is the last of the room that was built and then taken out on his
  // instruction: a warm orange shaft falling from a source, burning from the
  // very first frame, in a sequence whose first five seconds are a cold night.
  // He saw it before I did. Before the light lets go there is nothing warm in
  // the box at all and the page shows through.
  // Only the warm beat, never the field. Hung off whichever of the two was
  // higher it came back on as the field rose, which is exactly when the
  // serpent arrives.
  float lamp = g;
  col += mix(lampC, vec3(1.00, .92, .76), g * .55) * lit * (.85 + g * .62)
       * (1. - .45 * c) * lamp;

  col += C_SPARK * stream * 2.30 * air;
  col += mix(C_SPARK, vec3(1., .96, .86), smoothstep(.70, 1., c)) * core * .80;

  // Cream, not orange. The volume is almost colourless at its centre.
  vec3 pale = mix(C_LIGHT, vec3(1.00, .93, .76), .40);
  col += pale * rays * (.22 + 1.35 * g) * air * (1. - .25 * cloud);
  col += vec3(1., .94, .84) * cloud * .78;
  col += C_LIGHT * halo * .16;
  col += vec3(1., .90, .74) * bloom * .22;
  // The white itself. In the reference the blown out frame is a wash that
  // fills the picture, not a shape, and the long shafts ride on top of it.
  // That wash is behind the man, so his body blocks it and stands out of it
  // as a dark silhouette the whole time it is up. Ours used to come from a
  // sheet in front of everything, which washed him and the air behind him by
  // the same amount and flattened him out of existence. This is the half that
  // belongs behind him.
  float wash = white * (.56 + .44 * exp(-sr * 1.6));
  col += vec3(1.00, .985, .95) * wash * 1.35;
  col += vec3(1.00, .98, .92) * sCore * 2.3;
  col += vec3(1.00, .80, .30) * sRing * .8;
  col += mix(vec3(1.00, .92, .74), vec3(1.00, .66, .44), smoothstep(.06, .52, sr)) * sRay * 2.6;

  // ---- the blow ----
  // Measured off the reference and it is not what this was doing. At the blow
  // the frame is dark, 0.24 brightness, and torn across by streaks running
  // from the middle out past the corners. Dozens of them, bright against the
  // dark, contrast 0.19 to 0.28. It does not go white until a quarter of a
  // second after that. Ours went white first and skipped the violence
  // entirely.
  //
  // This is the window where the fire is up and the white is not yet, which
  // is exactly that quarter second.
  // Wide and soft, and not many of them. The reference's streaks are a radial
  // blur: wedges with no edge on them, every one a different width. Drawing
  // them as a hundred and fifty thin bright lines gave a vector starburst,
  // and at this size the thin ones alias into dotted rows as well.
  float bidx = floor(a01 * 34.);
  float bh   = hash(vec2(bidx, 17.7));
  float bw   = hash(vec2(bidx, 4.3));
  float bt   = fract(a01 * 34.);
  float bray = pow(1. - abs(bt * 2. - 1.), 1.1 + bw * 2.6);
  // They start off his body and run out past the corner, and the narrow ones
  // run furthest, which is what keeps it from reading as an even fan.
  bray *= smoothstep(.02, .16, sr) * exp(-sr * (.55 + 1.60 * bh)) * step(.15, bh);
  col += mix(vec3(1.00, .96, .84), vec3(1.00, .70, .32), smoothstep(.10, .80, sr))
       * bray * blow * 2.8;
  // and the blown core they come out of, which is most of the light in the
  // reference's frame at this moment.
  float bcore = exp(-sr * sr * 24.) + exp(-sr * 4.0) * .34;
  col += vec3(1.00, .97, .90) * bcore * blow * 1.6;
  // The light wraps under him too, so the floor of the frame is not a hole.
  col += C_LIGHT * g * .09 * smoothstep(.10, -.90, p.y) * air;

  // The cold breath. In the reference this beat goes the whole way: the warmth
  // is gone, not dimmed, and what is left is a violet and magenta field with
  // stars through it. Holding back here is what made it read as the orange
  // merely fading, so the warm light is cut almost to nothing and a nebula is
  // laid in its place.
  float neb = fbm(p * vec2(1.3, 1.1) + vec2(t * .018, -t * .012) + 11.0);
  // Measured against the reference rather than picked: its cold beat sits at
  // 292 degrees of hue, between violet and magenta, at 0.50 saturation. Ours
  // was at 266 and 0.75, a flat blue violet half again as intense as anything
  // in the reference. Both clouds were pulled round to 310 and 275 and their
  // darkest channel lifted, which is what takes the saturation down without
  // moving the hue.
  vec3 cloudA = vec3(.58, .29, .53) * smoothstep(.30, .78, neb);
  vec3 cloudB = vec3(.40, .25, .50) * smoothstep(.24, .72, 1. - neb);
  vec3 night  = vec3(.040, .031, .062) + cloudA + cloudB;
  night *= .55 + .70 * smoothstep(1.35, .10, r);
  // and it rises and falls instead of sitting still
  night *= .62 + .78 * swell;
  vec3 cold = mix(col * .30, night, cool);
  cold += vec3(.86, .80, 1.00) * sky * (.70 + .60 * swell) * cool;
  col = mix(col, cold, cool);

  // The figure is not drawn here. It was, for one pass, as a flat yellow cel
  // with the shape cut out of it, because that is exactly how the reference
  // draws it. It does not transfer: the reference's camera never moves and
  // ours orbits continuously, so a drawing pinned to the screen behind it is a
  // sticker by construction. The reference is not the authority on this one.
  // js/deity.js owns the figure and it is a mesh.
  // The field the figure stands in. It has to stay well under the figure's own
  // gold or the figure stops existing: they were the same yellow for a pass
  // and the arms vanished into it. Dark and warm, so the gold reads against
  // it the way the reference's gold reads against the dark between its arms.
  // The cold beat hands over to this as the serpent climbs, and the two are
  // one closed window, not two. Read off uField alone the field left a gap:
  // the cold was gone by 9.9 and the field, tied to the climb, was only half
  // up at 11.25, so for two seconds the page showed through with the
  // serpent's head arriving inside it. So once the climb has begun the field
  // is at least whatever the cold has given up.
  float dei = max(field, (1. - cool) * step(.001, field));
  // What the violet turns into when the serpent arrives. Taken off the head's
  // own ochre, hue 30, which is 22 percent of its painted pixels, rather than a
  // gold chosen for a figure that no longer exists. It stays dark, because an
  // emerald serpent in front of a bright field stops being a silhouette, which
  // the last figure taught us.
  // Where the violet goes when the serpent arrives. It does not go somewhere
  // else: it deepens and empties, so the room inherits from the beat before it
  // instead of arguing with it, and the serpent ends up the only thing in the
  // box carrying colour. The ochre that was here first was taken off the
  // carving's own palette, which turned out to be the reason it failed: the
  // serpent is already emerald and red and ochre, so the field was competing
  // with the figure in the figure's own colours and flattening it.
  vec3 fieldC = vec3(.052, .048, .115) + vec3(.10, .09, .26) * smoothstep(1.25, .18, r);
  col = mix(col, fieldC, dei * .90);

  // The field used to be laid down again here, in orange, over 62 percent of
  // the frame, because back when the figure was a lit gold object in front of
  // it the field had to stay darker or the object stopped existing. The figure
  // IS the field now, so this was repainting the deity's own yellow 10 degrees
  // of hue toward orange and taking the gaps between its arms with it. The
  // block above owns the field.

  // Before the capture arrives the room is dimmer, and it comes up as the
  // bytes do, so the box is never a dead rectangle.
  col *= .45 + .55 * clamp(uLoad, 0., 1.);

  // Nothing touches the border, so the box reads as a window. It closes in as
  // the air gathers and opens back up once the light is out.
  float edge = (.55 + .12 * c - .44 * g - .18 * field) * (1. - .55 * cold0);
  col *= 1. - edge * smoothstep(.72 - .08 * c, 1.48 - .16 * c, length(p));

  // The box is a window, not a canvas. Everything above is light, so what it
  // is worth is also what covers: where nothing is lit, the page shows
  // through. The two beats that are a whole field rather than a light in a
  // room, the cold one and the flat warm one, are the exceptions and they
  // close the window while they last.
  float a = clamp(max(max(col.r, col.g), col.b) * 2.1, 0., 1.);
  // Their sum, not the larger of the two. They cross in the middle of the
  // handover, and the larger alone opened the window to half at the crossing.
  a = max(a, clamp(cool * .96 + dei * .90, 0., 1.));

  fragColor = vec4(col, a);
}
