#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uSize;
uniform float uLoad;    // how much of the capture has arrived, 0 to 1
uniform float uCharge;  // the air gathering, cold, before anything lets go
uniform float uStar;    // the white drawn back down into a point behind him
uniform float uWarm;    // the volume of light he is left standing inside
uniform float uCool;    // one breath where the room goes cold and starry
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
  float cool  = clamp(uCool, 0., 1.);
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
  float rang = atan(q.x, q.y);
  float rayN = noise(vec2(rang * 2.4, t * .05));
  float rays = pow(max(0., .5 + .5 * sin(rang * 13. + rayN * 10. + t * .09)), 3.0) * .70;
  rays += pow(max(0., .5 + .5 * sin(rang * 5. - rayN * 4. - t * .06)), 2.0) * .70;
  rays *= smoothstep(.02, .40, r) * smoothstep(2.00, .30, r) * g;

  // Cloud drifting through the light, which is what keeps it from reading flat.
  float cloud = fbm(p * vec2(1.05, 1.5) + vec2(-t * .050, t * .018) + 6.2);
  cloud = smoothstep(.34, .86, cloud) * smoothstep(.20, .95, r) * g;

  // A ring standing behind the figure once everything has come to rest.
  float halo = exp(-pow((r - .95) / .30, 2.0)) * g;

  // The blown out middle, strongest while the flash is still up.
  float bloom = exp(-r * 1.7) * g * g;

  // ---- the star: what the white draws back down into ----
  // It stands in for the cut to the wide shot. The whole frame of light
  // becomes one point behind him with long thin rays, and that point is where
  // the figure comes from, so the beat is a cause and not only a pause.
  float sCore = exp(-r * r * 90.) * star;
  float sRay  = pow(max(0., .5 + .5 * sin(rang * 6. + rayN * 3.)), 9.0)
              + pow(max(0., .5 + .5 * sin(rang * 14. - rayN * 5. + 2.1)), 14.0) * .6;
  sRay *= exp(-r * 2.6) * smoothstep(.015, .10, r) * star;

  // ---- the cold breath: the room empties out and the stars come through ----
  // Sparse and soft. One cell in fifty holds a star, placed somewhere inside
  // itself rather than filling it, so the sky does not read as noise on a
  // grid. Filling every cell is what made the earlier pass look like static.
  vec2  sp   = p * 86.;
  vec2  cell = floor(sp);
  float keep = step(.980, hash(cell + 2.2));
  vec2  at   = vec2(hash(cell), hash(cell + 7.7));
  float dd   = length(fract(sp) - at);
  float sky  = keep * exp(-dd * dd * 70.);
  sky *= .35 + .65 * abs(sin(t * 1.6 + hash(cell) * 40.));
  sky *= cool * smoothstep(.08, .80, r);

  // A thin flat ring standing over his head, the way the reference hangs one
  // over the lotus. Squashed hard, so it reads as a disc seen almost edge on.
  vec2  rp  = (p - vec2(.0, .72)) * vec2(1.0, 3.6);
  float ring2 = exp(-pow((length(rp) - .33) / .035, 2.0)) * cool;

  // Before the burst this is a dark room with one shaft falling into it, and
  // it goes colder and closer as the air gathers. After it, the capture is
  // standing inside the light, so the air carries the colour and the rays open
  // up behind it.
  vec3 haze = mix(mix(C_AIR, C_COLD, c), C_WARM, g);

  // The room the gathering happens in is cold. In the reference it is a blue
  // grey canyon at night, and ours was reading warm brown the whole way
  // through, which took the cold out of the charge before it started. So the
  // floor and the one warm light in the room both drain as the air gathers.
  vec3 floorC = mix(C_FLOOR, vec3(.030, .040, .062), c);
  vec3 lampC  = mix(C_LIGHT, vec3(.62, .76, 1.00), c * .85);

  vec3 col = floorC;
  col = mix(col, haze, smoothstep(1.25, .05, length(p * vec2(1.0, .85))) * HAZE * air * (1. + g * 1.4));
  col += lampC * lit * (.85 + g * 1.60) * (1. - .45 * c);

  col += C_SPARK * stream * 2.30 * air;
  col += mix(C_SPARK, vec3(1., .96, .86), smoothstep(.70, 1., c)) * core * .80;

  col += C_LIGHT * rays * (.30 + .85 * g) * air * (1. - .55 * cloud);
  col += vec3(1., .88, .66) * cloud * .20;
  col += C_LIGHT * halo * .16;
  col += vec3(1., .88, .70) * bloom * .55;
  col += vec3(1., .95, .80) * (sCore * 1.5 + sRay * .75);
  // The light wraps under him too, so the floor of the frame is not a hole.
  col += C_LIGHT * g * .09 * smoothstep(.10, -.90, p.y) * air;

  // The cold breath. In the reference this beat goes the whole way: the warmth
  // is gone, not dimmed, and what is left is a violet and magenta field with
  // stars through it. Holding back here is what made it read as the orange
  // merely fading, so the warm light is cut almost to nothing and a nebula is
  // laid in its place.
  float neb = fbm(p * vec2(1.3, 1.1) + vec2(t * .018, -t * .012) + 11.0);
  vec3 cloudA = vec3(.56, .13, .50) * smoothstep(.30, .78, neb);
  vec3 cloudB = vec3(.17, .12, .58) * smoothstep(.24, .72, 1. - neb);
  vec3 night  = vec3(.030, .022, .062) + cloudA + cloudB;
  night *= .55 + .70 * smoothstep(1.35, .10, r);
  vec3 cold = mix(col * .30, night, cool);
  cold += vec3(.86, .80, 1.00) * sky * 1.00 * cool;
  cold += vec3(.92, .84, 1.00) * ring2 * .95;
  col = mix(col, cold, cool);

  // And then the light flattens into a field, which is what the figure comes
  // out of. It stops being a lamp in a room and becomes the room.
  // Kept well short of a solid fill. A flat yellow field is what the
  // reference flattens to, but the figure in front of it here is lit gold
  // too, and if the field reaches the same value the figure stops existing.
  // So the field darkens toward the edges and keeps the middle for the figure.
  vec3 flat_ = vec3(.72, .46, .13) * (.55 + .34 * air) + vec3(1., .93, .74) * rays * .16;
  flat_ *= .55 + .45 * smoothstep(1.25, .25, r);
  col = mix(col, flat_, field * .62);

  // Before the capture arrives the room is dimmer, and it comes up as the
  // bytes do, so the box is never a dead rectangle.
  col *= .45 + .55 * clamp(uLoad, 0., 1.);

  // Nothing touches the border, so the box reads as a window. It closes in as
  // the air gathers and opens back up once the light is out.
  float edge = .55 + .12 * c - .22 * g - .18 * field;
  col *= 1. - edge * smoothstep(.72 - .08 * c, 1.48 - .16 * c, length(p));

  fragColor = vec4(col, 1.0);
}
