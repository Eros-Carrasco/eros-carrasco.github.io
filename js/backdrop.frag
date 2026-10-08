#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uSize;
uniform float uLoad;    // how much of the capture has arrived, 0 to 1
uniform float uCharge;  // the air gathering on him, cold, before anything happens
uniform float uCover;   // the steam filling the whole box, for the change of pose
uniform float uCool;    // the violet night with its stars, once the steam has gone
uniform float uSwell;   // a breath inside the night
uniform float uMeteor;  // a falling star: 0 when there is none, else how far across
uniform float uField;   // the night turning vivid as the serpent climbs

in  vec3 vPos;
out vec4 fragColor;

// Atmosphere only; the figure is a mesh in the 3D scene (js/serpent.js). The
// piece in this box: a dark room while the steam gathers on his outline, the
// same steam thickening until it fills the box, the pose changing under it,
// the steam thinning into a violet night full of stars, a star falling, and
// the night turning vivid as the serpent climbs.
//
// This replaces an explosion: a spark, a blow with streaks, a white frame, a
// fire collapsing into a star, a warm volume with rays and cloud banks. All
// of it was built against the reference and all of it is gone on his call:
// the steam was the part that worked, so the steam is now the whole change.
//
// One uniform per beat, written onto the stage by js/aura.js and forwarded by
// js/backdrop.js. A uniform nothing sends arrives as zero, so a beat that is
// not wired simply does not happen.

const float HAZE = 0.55;   // how thick the air is before anything happens

const vec3 C_FLOOR = vec3(.038, .028, .046);
const vec3 C_AIR   = vec3(.180, .098, .072);
const vec3 C_COLD  = vec3(.072, .100, .152);  // the air while it gathers
const vec3 C_SPARK = vec3(.55, .82, 1.00);    // what the gathering is lit by
const vec2 HEART   = vec2(.00, .12);          // the chest, where it all gathers

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
  float t = uTime;

  float c     = clamp(uCharge, 0., 1.);
  float cover = clamp(uCover, 0., 1.);
  float cool  = clamp(uCool, 0., 1.);
  float swell = clamp(uSwell, 0., 1.);
  float field = clamp(uField, 0., 1.);
  float met   = uMeteor;

  // The frame shivers a little as the pressure comes up. It used to shake
  // hard for an explosion that is no longer coming.
  vec2 p = vPos.xy;
  float shake = c * c * c * .010;
  p += vec2(noise(vec2(t * 37., 4.1)) - .5, noise(vec2(9.3, t * 31.)) - .5) * shake;

  vec2  q = p - HEART;
  float r = length(q);

  // Haze, uneven, drifting.
  float air = fbm(p * 1.7 + vec2(t * .035, -t * .055));
  air = mix(.55, 1.15, air);

  // ---- the gathering: the air tightens on him ----
  float ang  = atan(q.y, q.x);
  float torn = noise(vec2(ang * 1.9, t * .35)) * .70
             + noise(vec2(ang * 6.1, -t * .50)) * .30;
  // What gathers sits around him rather than inside him, because the capture
  // is in front of this and would swallow anything drawn at the chest. The
  // edge of it is eaten away by noise, or it draws as a circle.
  float sheath = smoothstep(mix(1.10, .66, c), mix(.46, .22, c), r)
               * smoothstep(.02, mix(.30, .14, c), r);
  sheath *= .15 + .85 * torn * torn;
  float core = sheath * c * c * (.18 + .22 * c);
  core += exp(-r * r * mix(300., 52., c)) * c * c * c * .9;

  // ---- the room before anything: dark, cold, and mostly a window ----
  // The box is a window over the page until a beat fills it. Before the
  // steam, what is here is a faint cold haze and the gathering on him.
  float cold0 = clamp(1. - field, 0., 1.);
  vec3 haze   = mix(C_AIR, C_COLD, c);
  vec3 floorC = mix(C_FLOOR, vec3(.030, .040, .062), c);

  vec3 col = floorC * (1. - cold0);
  col = mix(col, haze, smoothstep(1.25, .05, length(p * vec2(1.0, .85))) * HAZE * air * (1. - .80 * cold0));
  col += mix(C_SPARK, vec3(1., .96, .86), smoothstep(.70, 1., c)) * core * .80;

  // ---- the night: violet, and full of stars ----
  // One cell in eleven holds a star, placed somewhere inside itself rather
  // than filling it, so the sky does not read as noise on a grid. One in
  // sixty of those is a big one with a cross of light on it. He asked for
  // them very bright, so they are: the cores are wider than they were and
  // nothing holds them back near the middle of the box.
  vec2  sp   = p * 86.;
  vec2  cell = floor(sp);
  float keep = step(.910, hash(cell + 2.2));
  vec2  at   = vec2(hash(cell), hash(cell + 7.7));
  vec2  fr   = fract(sp) - at;
  float dd   = length(fr);
  float tw   = .45 + .55 * abs(sin(t * 1.6 + hash(cell) * 40.));
  float sky  = keep * exp(-dd * dd * 34.) * 1.45;
  float big  = keep * step(.983, hash(cell + 5.5));
  float glint = exp(-abs(fr.x) * 20.) * exp(-abs(fr.y) * 2.6)
              + exp(-abs(fr.y) * 20.) * exp(-abs(fr.x) * 2.6);
  sky += big * (exp(-dd * dd * 14.) * 2.2 + glint * .80);
  sky *= tw * smoothstep(.05, .40, r);

  // The nebula. Measured against the reference rather than picked: its cold
  // beat sits at 292 degrees of hue, between violet and magenta, at 0.50
  // saturation. Two clouds, one pulled to 310 and one to 275.
  float neb = fbm(p * vec2(1.3, 1.1) + vec2(t * .018, -t * .012) + 11.0);
  vec3 cloudA = vec3(.58, .29, .53) * smoothstep(.30, .78, neb);
  vec3 cloudB = vec3(.40, .25, .50) * smoothstep(.24, .72, 1. - neb);
  vec3 night  = vec3(.040, .031, .062) + cloudA + cloudB;
  night *= .60 + .45 * smoothstep(1.35, .10, r);
  // and it breathes instead of sitting still. Gently: at the old swing the
  // middle of the box went to a flat pink spotlight behind him.
  night *= .78 + .34 * swell;
  vec3 nightCol = night + vec3(.86, .80, 1.00) * sky * (.90 + .50 * swell) * 1.30;

  // ---- a falling star ----
  // Once, across the top of the night, in half a second. A bright head
  // and a tail that thins behind it, both soft, and it fades in and out so
  // it is never cut off at either end.
  float meteor = 0.;
  if (met > .001 && met < .999) {
    vec2  m0  = vec2(-1.05, .92), m1 = vec2(1.12, .16);   // off the right edge
    vec2  dir = normalize(m1 - m0);
    vec2  hp  = mix(m0, m1, met);
    vec2  rel = p - hp;
    float along = dot(rel, -dir);
    float side  = abs(dot(rel, vec2(-dir.y, dir.x)));
    float tail  = step(0., along) * smoothstep(.60, .0, along) * exp(-side * side * 1400.);
    float head  = exp(-dot(rel, rel) * 900.);
    meteor = (tail * .85 + head * 1.8) * sin(met * 3.14159);
  }
  nightCol += vec3(.95, .95, 1.00) * meteor;

  col = mix(col, nightCol, cool);

  // ---- the night turning vivid as the serpent climbs ----
  // The cold beat hands over to this as the serpent climbs, and the two are
  // one closed window: once the climb has begun the field is at least
  // whatever the cold has given up. The colour itself goes the way he asked:
  // more alive and lighter, the same violet family, not a different room.
  float dei = max(field, (1. - cool) * step(.001, field));
  vec3 fieldC = vec3(.30, .15, .50) + vec3(.22, .13, .30) * smoothstep(1.25, .18, r);
  col = mix(col, fieldC, dei * .90);
  // the stars stay, fainter, through the vivid field
  col += vec3(.92, .88, 1.00) * sky * dei * .55;

  // ---- the steam filling the box ----
  // The same steam that gathered on him, grown until there is nothing but
  // steam, so the pose can change under it. It closes as a whole and breaks
  // up as it goes: the threshold climbs out of the noise's range, so what is
  // left are patches thinning into the night behind them.
  float vap = fbm(p * 2.1 + vec2(t * .05, -t * .09)) * .80
            + fbm(p * 4.6 - vec2(t * .03, t * .14)) * .30;
  float th  = mix(1.05, -.45, cover);
  float cov = smoothstep(th, th + .40, vap);
  // Pale, but not white: an even white over the whole box was too much for
  // the eye. Grey tones through it, moving, with a finer grain on top; the
  // veil over him carries the same grain, so his outline does not show as
  // smooth beside grainy.
  float grain = fbm(p * 9.0 + vec2(-t * .07, t * .11)) - .5;
  vec3 steamC = mix(vec3(.74, .77, .82), vec3(.90, .915, .94), clamp(vap, 0., 1.)) + grain * .07;
  // A thin even haze comes up under the patches as they form, so the holes
  // between them show pale air and not the dark room: with the room showing
  // through, the steam read as black smoke while it was closing.
  col = mix(col, steamC * .80, smoothstep(0., .6, cover) * .85);
  col = mix(col, steamC, cov);

  // Before the capture arrives the room is dimmer, and it comes up as the
  // bytes do, so the box is never a dead rectangle.
  col *= .45 + .55 * clamp(uLoad, 0., 1.);

  // Nothing touches the border, so the box reads as a window. Not while the
  // steam fills it: steam has no vignette.
  float edge = (.55 + .12 * c - .18 * field) * (1. - .55 * cold0) * (1. - cov);
  col *= 1. - edge * smoothstep(.72 - .08 * c, 1.48 - .16 * c, length(p));

  // The box is a window, not a canvas. What is lit is also what covers; where
  // nothing is lit, the page shows through. The beats that are a whole field
  // rather than a light in a room close the window while they last.
  float a = clamp(max(max(col.r, col.g), col.b) * 2.1, 0., 1.);
  a = max(a, clamp(cool * .96 + dei * .90, 0., 1.));
  a = max(a, cov);

  fragColor = vec4(col, a);
}
