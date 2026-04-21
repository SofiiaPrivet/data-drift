precision highp float;

uniform float time;
uniform float pm25;
uniform float pm10;
uniform float no2;

varying float vDetail;
varying vec3  vNormal;
varying vec3  vViewDir;
varying float vThickness;
varying float vStress;
varying vec3  vWorldPos;
varying vec3  vSurfacePos;

// ── NOISE (pixel-rate — for fine detail only) ─────────────────────────
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

void main() {

  vec3  normal = normalize(vNormal);
  vec3  view   = normalize(vViewDir);

  // ── FRAGMENT-RATE NORMAL PERTURBATION ────────────────────────────────
  float fa = time * 0.05;
  float fb = time * 0.031;
  vec3 flowA = vec3(cos(fa) * 0.8 + 0.2, sin(fa * 0.6) * 0.8 + 0.2, sin(fa * 0.4 + 1.0) * 0.8 + 0.2);
  vec3 flowB = vec3(cos(fb * 0.7 + 2.0) * 0.8 + 0.2, sin(fb * 0.5 + 1.0) * 0.8 + 0.2, cos(fb * 0.6 + 3.0) * 0.8 + 0.2);
  flowA = normalize(flowA);
  flowB = normalize(flowB);
  flowA = flowA - vSurfacePos * dot(flowA, vSurfacePos);
  flowB = flowB - vSurfacePos * dot(flowB, vSurfacePos);
  float lenFA = length(flowA);
  float lenFB = length(flowB);
  flowA = lenFA > 0.001 ? flowA / lenFA : vec3(0,0,1);
  flowB = lenFB > 0.001 ? flowB / lenFB : vec3(0,1,0);
  float flowBlend = noise(vSurfacePos * 1.8 + time * 0.02) * 0.5 + 0.5;
  flowBlend = flowBlend * 0.7 + 0.15;
  vec3 fmixed = mix(flowA, flowB, flowBlend);
  float lenFM = length(fmixed);
  vec3 flow = lenFM > 0.001 ? fmixed / lenFM : flowA;

  vec3 fup  = abs(flow.y) < 0.9 ? vec3(0,1,0) : vec3(1,0,0);
  vec3 ftan = normalize(cross(flow, fup));

  float along  = dot(vSurfacePos, flow);
  float across = dot(vSurfacePos, ftan);
  float depth  = dot(vSurfacePos, cross(flow, ftan));

  vec3 aniso =
    flow             * along  * 2.2 +
    ftan             * across * 0.4 +
    cross(flow,ftan) * depth  * 0.85;

  float drift  = time * (0.08 + pm25 * 0.08);
  vec3  domain = aniso * 2.0 + flow * drift + 2.0;

  float feps = 0.007;
  float density = 0.6;

  vec3  fd1  = domain * 2.1 * density + vec3(1.618, 2.718, 1.414);
  float fnx1 = noise(fd1 + vec3(feps,0,0)) - noise(fd1 - vec3(feps,0,0));
  float fny1 = noise(fd1 + vec3(0,feps,0)) - noise(fd1 - vec3(0,feps,0));
  float fnz1 = noise(fd1 + vec3(0,0,feps)) - noise(fd1 - vec3(0,0,feps));

  vec3  fd2  = domain * 5.8 * density + vec3(3.141, 1.732, 2.236);
  float fnx2 = noise(fd2 + vec3(feps,0,0)) - noise(fd2 - vec3(feps,0,0));
  float fny2 = noise(fd2 + vec3(0,feps,0)) - noise(fd2 - vec3(0,feps,0));
  float fnz2 = noise(fd2 + vec3(0,0,feps)) - noise(fd2 - vec3(0,0,feps));

  vec3 perturbation =
    vec3(fnx1, fny1, fnz1) * 0.85 +
    vec3(fnx2, fny2, fnz2) * 0.50;

  float basinFade = smoothstep(-1.0, 0.6, vSurfacePos.y);
  perturbation *= mix(0.06, 1.0, basinFade);
  perturbation *= 1.0 + vStress * 0.45;

  normal = normalize(normal + perturbation);

  // ── BASE SIGNALS ──────────────────────────────────────────────────────
  float facing    = clamp(dot(normal, view), 0.0, 1.0);
  float thickness = clamp(vThickness * 5.0, 0.0, 1.0);
  float pertMag   = clamp(length(perturbation) * 0.9, 0.0, 1.0);
  float d         = mix(clamp(vDetail * 3.5, 0.0, 1.0), pertMag, 0.82);

  // ── ZONE MASKS ────────────────────────────────────────────────────────
  float peakZone   = smoothstep(0.48, 0.80, d);
  peakZone         = pow(peakZone, 1.2);

  float valleyZone = smoothstep(0.36, 0.06, d);
  valleyZone       = pow(valleyZone, 1.4);

  float slopeZone  = clamp(1.0 - peakZone - valleyZone, 0.0, 1.0);

  // ── COLOUR PALETTE (milky organic) ───────────────────────────────────
  vec3 colPeak      = vec3(0.96, 0.96, 0.95);  // cool near-white milk
  vec3 colSlope     = vec3(0.78, 0.80, 0.84);  // soft blue-grey slope
  vec3 colValley    = vec3(0.28, 0.32, 0.42);  // muted blue-indigo valley
  vec3 colSSS_peak  = vec3(0.94, 0.92, 0.96);  // cool lavender peak scatter
  vec3 colSSS_deep  = vec3(0.35, 0.42, 0.62);  // deep blue valley glow
  vec3 colRim       = vec3(0.98, 0.98, 1.00);  // pure cool white rim

  vec3 color = colPeak   * peakZone
             + colSlope  * slopeZone
             + colValley * valleyZone;

  // ── LIGHTING SETUP ────────────────────────────────────────────────────
  vec3  lightDir  = normalize(vec3(0.5, 0.8, 0.6));
  vec3  lightDir2 = normalize(vec3(-0.4, -0.2, -0.5));

  float NdL1 = clamp(dot(normal, lightDir),  0.0, 1.0);
  float NdL2 = clamp(dot(normal, lightDir2), 0.0, 1.0);

  float light1 = pow(NdL1, 1.1);
  float light2 = pow(NdL2, 2.0) * 0.25;

  float lightZoneMask = peakZone * 1.0 + slopeZone * 0.55 + valleyZone * 0.08;
  color *= 0.40 + (light1 * lightZoneMask + light2) * 1.15;

  // ── SPECULAR — sharp on peak crests ───────────────────────────────────
  vec3  halfV   = normalize(lightDir + view);
  float NdH     = clamp(dot(normal, halfV), 0.0, 1.0);

  float specNarrow = pow(NdH, 48.0) * peakZone;
  float specBroad  = pow(NdH, 12.0) * (peakZone * 0.5 + slopeZone * 0.3);

  color += colRim    * specNarrow * 0.80;
  color += colPeak   * specBroad  * 0.22;

  // ── SUBSURFACE SCATTERING — PEAKS ─────────────────────────────────────
  float sss_peak =
    pow(NdL1, 0.6) *
    (1.0 - thickness) * 0.7 +
    pow(1.0 - facing, 1.4) * 0.3;

  sss_peak *= peakZone * 0.8 + slopeZone * 0.3;
  sss_peak  = clamp(sss_peak, 0.0, 1.0);

  color = mix(color, colSSS_peak, sss_peak * 0.45);

  // ── SUBSURFACE SCATTERING — VALLEYS ───────────────────────────────────
  float sss_valley =
    (1.0 - NdL1) *
    valleyZone *
    (0.5 + vStress * 0.3);

  sss_valley = pow(sss_valley, 1.3);
  sss_valley = clamp(sss_valley, 0.0, 1.0);

  color += colSSS_deep * sss_valley * 0.35;

  // ── CAVITY DEPTH ─────────────────────────────────────────────────────
  float valleyDepth = pow(valleyZone, 1.5);
  color *= 1.0 - valleyDepth * 0.58;

  // ── EDGE / RIM LIGHT ──────────────────────────────────────────────────
  float rim = pow(1.0 - facing, 2.5);

  color += colRim      * rim * peakZone   * 0.38;
  color += colSSS_peak * pow(1.0 - facing, 3.5) * slopeZone * 0.22;

  // ── MEMBRANE ZONES ────────────────────────────────────────────────────
  float inMembrane = (1.0 - smoothstep(0.04, 0.18, d)) * smoothstep(0.0, 0.04, d);
  vec3  colMembrane = vec3(0.82, 0.84, 0.88);
  color = mix(color, colMembrane, inMembrane * 0.35);
  color += colSSS_peak * inMembrane * (1.0 - thickness) * 0.14;

  // ── BASIN ─────────────────────────────────────────────────────────────
  float inBasin = 1.0 - smoothstep(0.005, 0.032, vDetail);
  color = mix(color, vec3(0.88, 0.90, 0.94), inBasin * 0.40);

  // ── FLOW SHADOW ───────────────────────────────────────────────────────
  vec3  flowDirStatic = normalize(vec3(0.3, 0.6, 1.0));
  float flowAlign     = dot(normal, flowDirStatic) * 0.5 + 0.5;
  float flowShadow    = pow(1.0 - flowAlign, 2.0) * valleyZone;
  color *= 1.0 - flowShadow * 0.18;

  // ── STRESS COLOUR ─────────────────────────────────────────────────────
  vec3 colStress = vec3(0.72, 0.75, 0.90);
  color = mix(color, colStress, vStress * peakZone * 0.20);
  color *= 1.0 - vStress * valleyZone * 0.15;

  // ── FINAL GRADE ───────────────────────────────────────────────────────
  float gray = dot(color, vec3(0.333));
  color = mix(vec3(gray), color, 1.22);

  color = (color - 0.5) * 1.28 + 0.5;

  // gamma — cool lift, peaks stay luminous
  color = pow(max(color, 0.0), vec3(0.90, 0.88, 0.84));

  // cool milky tint overall — slightly blue cast
  color *= vec3(0.97, 0.98, 1.02);

  color = clamp(color, 0.0, 1.0);

  // ── ALPHA ─────────────────────────────────────────────────────────────
  float fresnel = pow(1.0 - facing, 2.0);
  float alpha   = mix(0.98, 0.65, fresnel);
  alpha        *= mix(1.0, 0.80, vStress);

  gl_FragColor = vec4(color, alpha);

}
