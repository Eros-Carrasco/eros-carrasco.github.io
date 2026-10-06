#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uSize;
uniform float uLoad;    // how much of the capture has arrived, 0 to 1
uniform float uGlow;    // 0 before the burst, 1 after it
in  vec3 vPos;
out vec4 fragColor;

// Atmosphere only. The figure moved into the 3D scene (see js/aura.js), so
// this draws the light it stands in and nothing else: warm haze, a shaft of
// light from above, and a slow drift. Keeping it soft is the point, since the
// hard shapes now have real geometry behind them.

// ---- the knobs ----
const float REACH = 1.15;  // how far the light carries before it dies
const float HAZE  = 0.55;  // how thick the air is
const float SPEED = 1.00;  // multiplies every clock
// -------------------

const vec3 C_FLOOR = vec3(.038, .028, .046);
const vec3 C_AIR   = vec3(.180, .098, .072);
const vec3 C_LIGHT = vec3(1.00, .66, .30);

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
  vec2  p = vPos.xy;
  float t = uTime * SPEED;

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

  // Before the burst this is a dark room with one shaft falling into it.
  // After it, the capture is standing inside the light, so the air carries
  // the colour and a ring of rays opens up behind it.
  float g = clamp(uGlow, 0., 1.);

  float ang  = atan(p.x, p.y);
  float rays = pow(max(0., .5 + .5 * sin(ang * 15. + t * .09)), 5.0);
  rays *= smoothstep(1.35, .15, length(p)) * g;

  vec3 col = C_FLOOR;
  col = mix(col, C_AIR, smoothstep(1.25, .05, length(p * vec2(1.0, .85))) * HAZE * air * (1. + g));
  col += C_LIGHT * lit * (.85 + g * 1.25);
  col += C_LIGHT * rays * .30 * air;

  // Before the capture arrives the room is dimmer, and it comes up as the
  // bytes do, so the box is never a dead rectangle.
  col *= .45 + .55 * clamp(uLoad, 0., 1.);

  // Nothing touches the border, so the box reads as a window.
  col *= 1. - .55 * smoothstep(.72, 1.48, length(p));

  fragColor = vec4(col, 1.0);
}
