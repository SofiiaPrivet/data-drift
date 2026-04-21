precision highp float;

uniform float time;
uniform float pm25;
uniform float pm10;
uniform float no2;
uniform float sensitivity;

varying float vDetail;
varying vec3  vNormal;
varying vec3  vViewDir;
varying float vThickness;
varying float vStress;
varying vec3  vWorldPos;
varying vec3  vSurfacePos;

vec3 hash33(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7,  74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
          dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
      mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
          dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x),
      u.y),
    mix(
      mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
          dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
      mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
          dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x),
      u.y),
    u.z);
}

vec3 rotateNoise(vec3 p) {
  const float c1 = 0.8660254;
  const float s1 = 0.5;
  const float c2 = 0.9659258;
  const float s2 = 0.2588190;
  p.xy = vec2(p.x * c1 - p.y * s1, p.x * s1 + p.y * c1);
  p.yz = vec2(p.y * c2 - p.z * s2, p.y * s2 + p.z * c2);
  return p;
}

float getMacroDisplacement(vec3 p) {

  vec3 n = normalize(p);

  // ── WRINKLE DENSITY ───────────────────────────────────────────────────
  float density = 0.6;

  // ── FLOW DIRECTION (singularity-safe) ────────────────────────────────
  float fa = time * 0.05;
  float fb = time * 0.031;
  vec3 axisA = vec3(cos(fa) * 0.8 + 0.2, sin(fa * 0.6) * 0.8 + 0.2, sin(fa * 0.4 + 1.0) * 0.8 + 0.2);
  vec3 axisB = vec3(cos(fb * 0.7 + 2.0) * 0.8 + 0.2, sin(fb * 0.5 + 1.0) * 0.8 + 0.2, cos(fb * 0.6 + 3.0) * 0.8 + 0.2);
  axisA = normalize(axisA);
  axisB = normalize(axisB);
  axisA = axisA - n * dot(axisA, n);
  axisB = axisB - n * dot(axisB, n);
  float lenA = length(axisA);
  float lenB = length(axisB);
  axisA = lenA > 0.001 ? axisA / lenA : vec3(0,0,1);
  axisB = lenB > 0.001 ? axisB / lenB : vec3(0,1,0);
  float flowBlend = noise(n * 1.8 + time * 0.02) * 0.5 + 0.5;
  flowBlend = flowBlend * 0.7 + 0.15;
  vec3 mixed = mix(axisA, axisB, flowBlend);
  float lenM = length(mixed);
  vec3 flow = lenM > 0.001 ? mixed / lenM : axisA;

  // perpendicular to flow — folds run along this axis
  vec3 fup  = abs(flow.y) < 0.9 ? vec3(0,1,0) : vec3(1,0,0);
  vec3 ftan = normalize(cross(flow, fup));

  // ── ANISOTROPIC DOMAIN ────────────────────────────────────────────────
  float along  = dot(n, flow);
  float across = dot(n, ftan);
  float depth  = dot(n, cross(flow, ftan));

  vec3 aniso =
    flow             * along  * 2.2 +
    ftan             * across * 0.4 +
    cross(flow,ftan) * depth  * 0.85;

  // slow drift — the streaming movement
  float drift  = time * (0.1 + pm25 * 0.1);
  vec3 domain = aniso * 2.0 + flow * drift + 2.0;

  float t = time * 0.035;

  // ── TENSION FIELD ─────────────────────────────────────────────────────
  float tens1 = noise(n * 1.3 + time * 0.018) * 0.5 + 0.5;
  float tens2 = noise(n * 2.6 - time * 0.013) * 0.5 + 0.5;
  float tension = pow(smoothstep(0.32, 0.70, tens1 * 0.6 + tens2 * 0.4), 1.3);

  // ── MACRO LAYER (large bulges, defines overall shape) ─────────────────
  float nA    = noise(domain * 0.55 + t);
  float nB    = noise(domain * 1.05 - t * 0.65);
  float macro = nA * 0.6 + nB * 0.4;
  macro = 1.0 - abs(macro);
  macro = pow(macro, 2.2);
  macro = smoothstep(0.22, 0.68, macro);

  // ── MID LAYER (main folds — the gyri) ────────────────────────────────
  vec3 midDomain = domain + vec3(1.618, 2.718, 1.414);
  float nC  = noise(midDomain * 2.1 * density + t * 0.75);
  float nD  = noise(midDomain * 3.4 * density - t * 0.52);
  float mid = nC * 0.55 + nD * 0.45;
  mid = 1.0 - abs(mid);
  mid = pow(mid, 2.6);
  mid = smoothstep(0.28, 0.70, mid);
  mid *= macro * 0.8 + 0.2;
  mid *= mix(0.45, 1.55, tension);

  // ── MICRO LAYER (fine sulcus lines) ──────────────────────────────────
  vec3 microDomain = domain + vec3(3.141, 1.732, 2.236);
  float nE    = noise(microDomain * 5.8 * density + t * 1.05);
  float nF    = noise(microDomain * 8.9 * density - t * 0.75);
  float micro = nE * 0.52 + nF * 0.48;
  micro = 1.0 - abs(micro);
  micro = pow(micro, 3.0);
  micro *= mid * (macro * 0.55 + 0.45);
  micro *= mix(0.3, 1.4, tension);

  // ── COMBINE ───────────────────────────────────────────────────────────
  float dispMacro = macro * (0.28 + pm10 * 0.18);
  float dispMid   = mid   * (0.22 + pm25 * 0.14);
  float dispMicro = micro * 0.08;

  float combined = dispMacro + dispMid + dispMicro;
  combined = clamp(combined, 0.0, 0.85);
  combined = pow(combined, 1.12);

  float compression = smoothstep(0.02, 0.92, combined);
  float disp = combined * mix(0.08, 0.22, pm25) * compression;
  return disp / (1.0 + disp * 0.28);
}

void main() {

  vec3 pos = position;

  vSurfacePos = normalize(pos);

  // ── DOMAIN ───────────────────────────────────────────────────────────
  vec3 warped = normalize(pos);
  warped += 2.0;

  // ── STRESS ───────────────────────────────────────────────────────────
  float stressGlobal = pm25 * 0.6 + pm10 * 0.3 + no2 * 0.4;

  vec3 flowDir = normalize(vec3(0.3, 0.6, 1.0));
  vec3 advectedPos = warped + flowDir * time * 0.05;

  float spatial =
    noise(advectedPos * 2.0) * 0.6 +
    noise(advectedPos * 4.0 - time * 0.02) * 0.4;
  spatial = spatial * 0.5 + 0.5;

  float trail = noise(warped * 1.5 - time * 0.02) * 0.5 + 0.5;
  spatial = mix(spatial, trail, 0.3);

  float directional = dot(normalize(warped), normalize(vec3(0.3, 0.6, 1.0))) * 0.5 + 0.5;
  float infection = smoothstep(0.55, 0.75, spatial);
  infection = pow(infection, 1.5);

  float stress = stressGlobal * mix(0.3, 1.3, infection * directional);
  stress = clamp(stress, 0.0, 1.0);
  vStress = stress;

  // ── LARGE-SCALE IMPERFECTION ──────────────────────────────────────────
  vec3 bumpDomain = normalize(pos) * 0.9 + 7.3;
  float bump1 = noise(bumpDomain + time * 0.008);
  float bump2 = noise(bumpDomain * 1.7 - time * 0.005);
  float bump3 = noise(bumpDomain * 2.8 + time * 0.006);
  float bulge = bump1 * 0.55 + bump2 * 0.30 + bump3 * 0.15;
  bulge = bulge * 0.5 + 0.5;
  bulge = smoothstep(0.2, 0.8, bulge);
  float bulgeAmp = bulge * 0.09;

  float displacement = getMacroDisplacement(pos) + bulgeAmp;

  // rupture
  float rupture = smoothstep(0.6, 0.85, vStress);
  rupture = pow(rupture, 1.5);
  displacement *= 1.0 - rupture * 0.4;
  displacement = mix(displacement, smoothstep(0.0, 1.0, displacement), 0.25);

  // ── BASIN MASK ───────────────────────────────────────────────────────
  float poleY = normalize(pos).y;
  float basinMask = smoothstep(-1.0, 0.6, poleY);

  vec3 bn = normalize(pos) + 2.0;
  float swell =
    noise(bn * 1.1 + time * 0.04) * 0.6 +
    noise(bn * 2.2 - time * 0.03) * 0.4;
  swell = swell * 0.5 + 0.5;
  swell = pow(swell, 1.8);
  float basinDisp = swell * 0.035;

  displacement = mix(basinDisp, displacement, basinMask);

  // ── ORGANIC BREATHING ────────────────────────────────────────────────
  float t = time * 0.25;
  float breathe = sin(t);
  breathe = sign(breathe) * pow(abs(breathe), 1.6);
  breathe = breathe * 0.5 + 0.5;
  breathe += sin(t * 0.7) * 0.05;
  breathe = clamp(breathe, 0.0, 1.0);
  float breatheAmp = mix(0.0, 0.07, breathe);
  breatheAmp = mix(breatheAmp * 1.2, breatheAmp, basinMask);

  vThickness = displacement + breatheAmp * 0.5;
  vDetail    = displacement;
  vWorldPos  = (modelMatrix * vec4(pos, 1.0)).xyz;

  // ── NORMAL RECOMPUTATION ─────────────────────────────────────────────
  float eps = 0.006;

  vec3 up = abs(normal.y) < 0.9
    ? vec3(0.0, 1.0, 0.0)
    : vec3(1.0, 0.0, 0.0);

  vec3 tT = normalize(cross(normal, up));
  vec3 tB = normalize(cross(normal, tT));

  float d  = getMacroDisplacement(pos);
  float dx = getMacroDisplacement(pos + tT * eps);
  float dy = getMacroDisplacement(pos + tB * eps);

  float pY2 = normalize(pos + tT * eps).y;
  float pY3 = normalize(pos + tB * eps).y;
  float bm2 = smoothstep(-1.0, 0.6, pY2);
  float bm3 = smoothstep(-1.0, 0.6, pY3);

  float sw2 = pow((noise((normalize(pos+tT*eps)+2.0)*1.1+time*0.04)*0.6+noise((normalize(pos+tT*eps)+2.0)*2.2-time*0.03)*0.4)*0.5+0.5, 1.8)*0.035;
  float sw3 = pow((noise((normalize(pos+tB*eps)+2.0)*1.1+time*0.04)*0.6+noise((normalize(pos+tB*eps)+2.0)*2.2-time*0.03)*0.4)*0.5+0.5, 1.8)*0.035;

  dx = mix(sw2, dx, bm2);
  dy = mix(sw3, dy, bm3);
  d  = mix(basinDisp, d, basinMask);

  vec3 p0 = pos + normal * d  * sensitivity;
  vec3 px = (pos + tT * eps) + normal * dx * sensitivity;
  vec3 py = (pos + tB * eps) + normal * dy * sensitivity;

  vec3 newNormal = normalize(cross(px - p0, py - p0));
  vNormal = normalize(normalMatrix * newNormal);

  vec3 newPosition = pos + normal * (displacement * sensitivity + breatheAmp);

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewDir = normalize(-mvPosition.xyz);

  gl_Position = projectionMatrix * mvPosition;
}
