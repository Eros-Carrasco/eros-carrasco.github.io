#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uSize;
in  vec3 vPos;
out vec4 fragColor;

// Sun rays inside an otherwise empty box. Every earlier attempt washed the
// whole frame; this one is transparent except where a ray actually falls, so
// the card shows through and the splat keeps the frame.

// ---- the knobs ----
const float LIFT  = .70;   // brightest a ray can get
const float RAYS  = 11.0;  // how many spokes
const float SHARP = 7.0;   // higher is thinner, harder edged rays
const float REACH = 1.30;  // how far the rays carry before fading out
const float SPEED = 1.00;  // multiplies every clock
// -------------------

const vec3 C_RAY  = vec3(1.00, .80, .52);
const vec3 C_CORE = vec3(1.00, .93, .78);

void main() {
   vec2 p = vPos.xy;
   float t = uTime * SPEED;

   // The source travels a slow arc across the upper half, in and out of frame.
   vec2 sun = vec2(sin(t * .13) * 1.05, .62 + .22 * sin(t * .09 + 1.4));

   vec2  v   = p - sun;
   float d   = length(v);
   float ang = atan(v.y, v.x);

   // Spokes. Two sets turning at different rates so the pattern never settles.
   float s1 = sin(ang * RAYS + t * .35);
   float s2 = sin(ang * (RAYS * .6) - t * .21 + 1.1);
   float spokes = pow(max(0., .5 + .5 * (s1 * .65 + s2 * .35)), SHARP);

   // They start just off the source and run out with distance.
   float along = smoothstep(.03, .22, d) * exp(-d * REACH);
   float ray   = spokes * along;

   // A small soft core where they all meet.
   float core = exp(-d * 7.5) * .55;

   vec3  rgb = C_RAY * ray + C_CORE * core;
   float a   = ray * .9 + core;

   // Nothing touches the border, so the box reads as a window.
   a *= 1. - smoothstep(.80, 1.35, length(p * .95));

   fragColor = vec4(sqrt(rgb), clamp(a, 0., LIFT));
}
