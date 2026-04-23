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

  // blend toward isotropic near poles to dissolve the convergence artefact
  float poleFade = smoothstep(0.38, 0.85, abs(vSurfacePos.y));
  vec3 aniso =
    flow             * along  * mix(2.2, 1.0, poleFade) +
    ftan             * across * mix(0.4, 1.0, poleFade) +
    cross(flow,ftan) * depth  * mix(0.85, 1.0, poleFade);

  float drift = sin(time * 0.015) * 4.5 + sin(time * 0.009) * 2.2;
  vec3  domain = aniso * 2.0 + flow * drift + 2.0;

  // break pole radial symmetry
  float poleProximity = smoothstep(0.42, 0.90, abs(vSurfacePos.y));
  vec3 domainJitter = vec3(
    noise(vSurfacePos * 3.2 + vec3(1.1, 0.0, 0.0) + time * 0.008),
    noise(vSurfacePos * 3.2 + vec3(0.0, 2.2, 0.0) + time * 0.006),
    noise(vSurfacePos * 3.2 + vec3(0.0, 0.0, 3.3) + time * 0.007)
  );
  domainJitter = domainJitter * 2.0 - 1.0;
  domain += domainJitter * poleProximity * 2.2;

  float feps = 0.007;
  float density = 0.42;

  vec3  fd1  = domain * 2.1 * density + vec3(1.618, 2.718, 1.414);
  float fnx1 = noise(fd1 + vec3(feps,0,0)) - noise(fd1 - vec3(feps,0,0));
  float fny1 = noise(fd1 + vec3(0,feps,0)) - noise(fd1 - vec3(0,feps,0));
  float fnz1 = noise(fd1 + vec3(0,0,feps)) - noise(fd1 - vec3(0,0,feps));

  vec3  fd2  = domain * 5.8 * density + vec3(3.141, 1.732, 2.236);
  float fnx2 = noise(fd2 + vec3(feps,0,0)) - noise(fd2 - vec3(feps,0,0));
  float fny2 = noise(fd2 + vec3(0,feps,0)) - noise(fd2 - vec3(0,feps,0));
  float fnz2 = noise(fd2 + vec3(0,0,feps)) - noise(fd2 - vec3(0,0,feps));

  vec3  fd3  = domain * 12.5 * density + vec3(1.234, 5.678, 3.210);
  float fnx3 = noise(fd3 + vec3(feps,0,0)) - noise(fd3 - vec3(feps,0,0));
  float fny3 = noise(fd3 + vec3(0,feps,0)) - noise(fd3 - vec3(0,feps,0));
  float fnz3 = noise(fd3 + vec3(0,0,feps)) - noise(fd3 - vec3(0,0,feps));

  vec3 perturbation =
    vec3(fnx1, fny1, fnz1) * 0.85 +
    vec3(fnx2, fny2, fnz2) * 0.50 +
    vec3(fnx3, fny3, fnz3) * 0.28;

  perturbation *= 1.0 + vStress * 0.45;

  normal = normalize(normal + perturbation);

  // ── BASE SIGNALS ──────────────────────────────────────────────────────
  float facing    = clamp(dot(normal, view), 0.0, 1.0);
  float thickness = clamp(vThickness * 5.0, 0.0, 1.0);
  float pertMag   = clamp(length(perturbation) * 0.9, 0.0, 1.0);
  float d         = mix(clamp(vDetail * 3.5, 0.0, 1.0), pertMag, 0.40);

  // ── ZONE MASKS ────────────────────────────────────────────────────────
  float peakZone   = smoothstep(0.48, 0.80, d);
  peakZone         = pow(peakZone, 1.2);

  float valleyZone = smoothstep(0.36, 0.06, d);
  valleyZone       = pow(valleyZone, 1.4);

  float slopeZone  = clamp(1.0 - peakZone - valleyZone, 0.0, 1.0);

  // pollution state: 0 = clean Berlin air, 1 = heavy pollution
  float pollutionLevel = clamp(pm25 * 0.5 + pm10 * 0.3 + no2 * 0.2, 0.0, 1.0);
  float cleanness = 1.0 - pollutionLevel;

  // ── SPATIAL COLOUR FIELDS — two slow-moving noise fields give geography
  float cVar1 = noise(vSurfacePos * 1.8 + time * 0.004) * 0.5 + 0.5;
  float cVar2 = noise(vSurfacePos * 0.7 - time * 0.003) * 0.5 + 0.5;
  float cVar  = cVar1 * 0.6 + cVar2 * 0.4;

  // ── COLOUR PALETTE — shifts from milky/open (clean) to dark/tense (polluted)
  vec3 colPeak      = mix(vec3(0.94, 0.96, 1.00), vec3(0.72, 0.76, 0.84), pollutionLevel);

  // slope: warm grey-sand ↔ cool slate-blue, spatially mixed
  vec3 colSlopeWarm = mix(vec3(0.62, 0.58, 0.50), vec3(0.36, 0.32, 0.28), pollutionLevel);
  vec3 colSlopeCool = mix(vec3(0.40, 0.46, 0.60), vec3(0.22, 0.26, 0.40), pollutionLevel);
  vec3 colSlope     = mix(colSlopeCool, colSlopeWarm, cVar);

  // valley: dark teal ↔ dark umber, spatially mixed
  vec3 colValleyA   = vec3(0.05, 0.10, 0.14);  // dark teal
  vec3 colValleyB   = vec3(0.10, 0.07, 0.06);  // dark warm umber
  vec3 colValley    = mix(colValleyA, colValleyB, cVar2 * 0.7);

  vec3 colSSS_peak  = mix(vec3(1.00, 0.95, 0.86), vec3(0.80, 0.88, 0.98), pollutionLevel);
  vec3 colSSS_deep  = mix(vec3(0.45, 0.32, 0.22), vec3(0.30, 0.42, 0.48), cVar1);
  vec3 colRim       = mix(vec3(1.00, 0.98, 0.94), vec3(0.82, 0.90, 1.00), pollutionLevel);

  vec3 color = colPeak   * peakZone
             + colSlope  * slopeZone
             + colValley * valleyZone;

  // ── LIGHTING SETUP ────────────────────────────────────────────────────
  vec3  lightDir  = normalize(vec3(0.5, 0.8, 0.6));
  vec3  lightDir2 = normalize(vec3(-0.4, -0.2, -0.5));

  float NdL1 = clamp(dot(normal, lightDir),  0.0, 1.0);
  float NdL2 = clamp(dot(normal, lightDir2), 0.0, 1.0);

  float light1 = pow(NdL1, 1.1);
  float light2 = pow(NdL2, 1.5) * 0.30;

  // clean air = open ambient (dreamy); polluted = low ambient (heavy/dark)
  float ambientFloor = mix(0.35, 0.12, pollutionLevel);
  float lightZoneMask = peakZone * 1.0 + slopeZone * 0.50 + valleyZone * 0.14;
  color *= ambientFloor + (light1 * lightZoneMask + light2) * 1.20;

  // ── SPECULAR — sharp on peak crests ───────────────────────────────────
  vec3  halfV   = normalize(lightDir + view);
  float NdH     = clamp(dot(normal, halfV), 0.0, 1.0);

  float specNarrow = pow(NdH, 48.0) * peakZone;
  float specBroad  = pow(NdH, 12.0) * (peakZone * 0.5 + slopeZone * 0.3);

  color += colRim    * specNarrow * 2.60;
  color += colPeak   * specBroad  * 0.65;

  // ── PEAK GLOW — warm milky luminosity, strongest at clean air ────────
  float glowFacing = pow(facing, 0.7) * peakZone;
  float glowHalo   = pow(NdH, 5.0) * peakZone;
  float glowStr    = mix(0.32, 0.10, pollutionLevel);
  color += colSSS_peak * (glowFacing * glowStr + glowHalo * mix(0.55, 0.20, pollutionLevel));

  // ── SUBSURFACE SCATTERING — PEAKS ─────────────────────────────────────
  float sss_peak =
    pow(NdL1, 0.6) *
    (1.0 - thickness) * 0.7 +
    pow(1.0 - facing, 1.4) * 0.3;

  sss_peak *= peakZone * 1.0 + slopeZone * 0.08;
  sss_peak  = clamp(sss_peak, 0.0, 1.0);

  // clean air: milky luminous peaks; polluted: SSS fades, form darkens
  float sssMix = mix(0.78, 0.40, pollutionLevel);
  color = mix(color, colSSS_peak, sss_peak * sssMix);

  // ── SUBSURFACE SCATTERING — VALLEYS ───────────────────────────────────
  float sss_valley =
    (1.0 - NdL1) *
    valleyZone *
    (0.5 + vStress * 0.3);

  sss_valley = pow(sss_valley, 1.3);
  sss_valley = clamp(sss_valley, 0.0, 1.0);

  color += colSSS_deep * sss_valley * 0.50;

  // ── CAVITY DEPTH ─────────────────────────────────────────────────────
  float valleyDepth = pow(valleyZone, 1.4);
  color *= 1.0 - valleyDepth * 0.60;

  // ── EDGE / RIM LIGHT ──────────────────────────────────────────────────
  float rim = pow(1.0 - facing, 2.5);

  color += colRim      * rim * peakZone   * 0.38;
  color += colSSS_peak * pow(1.0 - facing, 3.5) * slopeZone * 0.22;

  // ── IRIDESCENT SHEEN — thin-film shimmer at grazing angles ──────────
  float iridAngle = pow(1.0 - facing, 3.0);
  vec3 colIridA = vec3(0.38, 0.62, 0.55);  // teal-green
  vec3 colIridB = vec3(0.52, 0.44, 0.68);  // soft lavender
  vec3 colIrid  = mix(colIridA, colIridB, cVar1);
  color += colIrid * iridAngle * (peakZone * 0.18 + slopeZone * 0.10);

  // ── INNER LIGHT — cool atmospheric glow, always present ─────────────
  vec3 colInnerLife = mix(vec3(0.75, 0.65, 0.50), vec3(0.55, 0.65, 0.82), cVar2);
  float innerLife = pow(1.0 - facing, 2.2) * 0.13;
  color += colInnerLife * innerLife;

  // ── MEMBRANE ZONES ────────────────────────────────────────────────────
  float inMembrane = (1.0 - smoothstep(0.04, 0.18, d)) * smoothstep(0.0, 0.04, d);
  vec3  colMembrane = vec3(0.72, 0.76, 0.85);
  color = mix(color, colMembrane, inMembrane * 0.35);
  color += colSSS_peak * inMembrane * (1.0 - thickness) * 0.14;

  // ── FLOW SHADOW ───────────────────────────────────────────────────────
  vec3  flowDirStatic = normalize(vec3(0.3, 0.6, 1.0));
  float flowAlign     = dot(normal, flowDirStatic) * 0.5 + 0.5;
  float flowShadow    = pow(1.0 - flowAlign, 2.0) * valleyZone;
  color *= 1.0 - flowShadow * 0.18;

  // ── STRESS COLOUR ─────────────────────────────────────────────────────
  vec3 colStress = vec3(0.48, 0.58, 0.52);  // sage-green stress veins
  color = mix(color, colStress, vStress * peakZone * 0.20);
  color *= 1.0 - vStress * valleyZone * 0.15;

  // ── SPATIAL DEPTH — receding surfaces fade, stronger when polluted ───
  float recession = pow(1.0 - facing, 4.0);
  color *= 1.0 - recession * mix(0.14, 0.38, pollutionLevel);

  // ── FINAL GRADE ───────────────────────────────────────────────────────
  float gray = dot(color, vec3(0.333));
  color = mix(vec3(gray), color, 1.22);

  color = (color - 0.5) * 1.18 + 0.5;

  // gamma
  color = pow(max(color, 0.0), vec3(0.88, 0.86, 0.84));

  color = clamp(color, 0.0, 1.0);

  // ── ALPHA ─────────────────────────────────────────────────────────────
  float fresnel = pow(1.0 - facing, 2.0);
  float alpha   = mix(0.98, 0.65, fresnel);
  alpha        *= mix(1.0, 0.80, vStress);

  gl_FragColor = vec4(color, alpha);

}
