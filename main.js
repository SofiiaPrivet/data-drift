import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0e12)
scene.fog = new THREE.Fog(0x0a0e12, 2.0, 6)
scene.fog.color.setRGB(0.04, 0.05, 0.06)

// ------------------------
//  PARTICLE SYSTEM
// ------------------------
const particleCount = 1000

const positions = new Float32Array(particleCount * 3)

for (let i = 0; i < particleCount; i++) {
  const radius = Math.random() * 0.90  

  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)

  positions[i * 3 + 0] =
    radius * Math.sin(phi) * Math.cos(theta)

  positions[i * 3 + 1] =
    radius * Math.sin(phi) * Math.sin(theta)

  positions[i * 3 + 2] =
    radius * Math.cos(phi)
}

const particleGeometry = new THREE.BufferGeometry()
particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3)
)

// ------------------------
// PARTICLE MATERIAL (SOFT)
// ------------------------
const textureLoader = new THREE.TextureLoader()

const particleTexture = textureLoader.load( 'Assets/light_01.png'
  //'https://threejs.org/examples/textures/sprites/disc.png'
)

const particleMaterial = new THREE.PointsMaterial({
  color: new THREE.Color ('#5c7391'),
  size: 0.005, // slightly smaller
  alphaMap: particleTexture, // FIX → round shape
  //alphaTest: 0.001,
  // depthTest: false,
  // blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  blending: THREE.AdditiveBlending
})

const particles = new THREE.Points(particleGeometry, particleMaterial)
scene.add(particles)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 0, 0.2)


// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMappingExposure = 1.5
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Controls 
const controls = new OrbitControls(camera, renderer.domElement);

controls.enableZoom = false;
controls.enablePan = false;

controls.enableDamping = true;
controls.dampingFactor = 0.14;

controls.rotateSpeed = 0.22;

controls.minDistance = 0.2;
controls.maxDistance = 0.2;

controls.minPolarAngle = Math.PI * 0.1;
controls.maxPolarAngle = Math.PI * 0.9;

controls.target.set(0, 0, 0);

controls.update();



// Geometry
const geometry = new THREE.SphereGeometry(1, 768, 768)
 
const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: true,
  side: THREE.BackSide,
  depthTest: true,
 
  uniforms: {
    time:        { value: 0 },
    pm25:        { value: 1 },
    pm10:        { value: 1 },
    no2:         { value: 0 },
    co:          { value: 0 },
    sensitivity: { value: 1 }
  },
 
  // ─────────────────────────────────────────────
  // VERTEX SHADER
  // ─────────────────────────────────────────────
  vertexShader: `
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
varying vec3  vWorldPos;   // NEW — needed for fragment noise
varying vec3  vSurfacePos; // NEW — stable surface coordinate

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

  // ── FLOW DIRECTION ────────────────────────────────────────────────────
  
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
  // Stretch along flow: long folds
  // Compress across flow: tight ridges
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
  // Slow spatial mask: high = compressed wrinkles, low = smooth/relaxed
  float tens1 = noise(n * 1.3 + time * 0.018) * 0.5 + 0.5;
  float tens2 = noise(n * 2.6 - time * 0.013) * 0.5 + 0.5;
  float tension = pow(smoothstep(0.32, 0.70, tens1 * 0.6 + tens2 * 0.4), 1.3);

  // ── MACRO LAYER (large bulges, defines overall shape) ─────────────────
  float nA    = noise(domain * 0.55 + t);
  float nB    = noise(domain * 1.05 - t * 0.65);
  float macro = nA * 0.6 + nB * 0.4;
  // ridge extraction — zero-crossings become ridges
  macro = 1.0 - abs(macro);
  macro = pow(macro, 2.2);
  macro = smoothstep(0.22, 0.68, macro);

  // ── MID LAYER (main folds — the gyri) ────────────────────────────────
  // Offset domain breaks symmetry with macro
  vec3 midDomain = domain + vec3(1.618, 2.718, 1.414);
  float nC  = noise(midDomain * 2.1 * density + t * 0.75);
  float nD  = noise(midDomain * 3.4 * density - t * 0.52);
  float mid = nC * 0.55 + nD * 0.45;
  mid = 1.0 - abs(mid);
  mid = pow(mid, 2.6);
  mid = smoothstep(0.28, 0.70, mid);
  // mid only exists where macro structure supports it
  mid *= macro * 0.8 + 0.2;
  // tension compresses mid folds tighter
  mid *= mix(0.45, 1.55, tension);

  // ── MICRO LAYER (fine sulcus lines) ──────────────────────────────────
  // Only appears inside established fold regions
  vec3 microDomain = domain + vec3(3.141, 1.732, 2.236);
  float nE    = noise(microDomain * 5.8 * density + t * 1.05);
  float nF    = noise(microDomain * 8.9 * density - t * 0.75);
  float micro = nE * 0.52 + nF * 0.48;
  micro = 1.0 - abs(micro);
  micro = pow(micro, 3.0);
  // locked to mid — no floating micro detail in smooth zones
  micro *= mid * (macro * 0.55 + 0.45);
  micro *= mix(0.3, 1.4, tension);

 // ── COMBINE ───────────────────────────────────────────────────────────
  float dispMacro = macro * (0.28 + pm10 * 0.18);
  float dispMid   = mid   * (0.22 + pm25 * 0.14);
  float dispMicro = micro * 0.08;

  float combined = dispMacro + dispMid + dispMicro;
  combined = clamp(combined, 0.0, 0.85); // hard cap before pow
  combined = pow(combined, 1.12);

  float compression = smoothstep(0.02, 0.92, combined);
  float disp = combined * mix(0.08, 0.22, pm25) * compression;
  return disp / (1.0 + disp * 0.28);
}

void main() {

  vec3 pos = position;

  // surface coordinate — passed to fragment for noise domain
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

  // ── DISPLACEMENT ─────────────────────────────────────────────────────
  // ── LARGE-SCALE IMPERFECTION ──────────────────────────────────────────
vec3 bumpDomain = normalize(pos) * 0.9 + 7.3; // far offset = no overlap
float bump1 = noise(bumpDomain + time * 0.008);
float bump2 = noise(bumpDomain * 1.7 - time * 0.005);
float bump3 = noise(bumpDomain * 2.8 + time * 0.006);
// combine into a smooth large-scale field
float bulge = bump1 * 0.55 + bump2 * 0.30 + bump3 * 0.15;
bulge = bulge * 0.5 + 0.5;          // remap to 0..1
bulge = smoothstep(0.2, 0.8, bulge); // soften transitions
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

  // basin gets gentle swell only — detail comes from fragment
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
  // Wider epsilon = stable normals, no faceting
  float eps = 0.006;

  vec3 up = abs(normal.y) < 0.9
    ? vec3(0.0, 1.0, 0.0)
    : vec3(1.0, 0.0, 0.0);

  vec3 tT = normalize(cross(normal, up));
  vec3 tB = normalize(cross(normal, tT));

  float d  = getMacroDisplacement(pos);
  float dx = getMacroDisplacement(pos + tT * eps);
  float dy = getMacroDisplacement(pos + tB * eps);

  // apply basin mix to all three samples
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
`,
 
  // ─────────────────────────────────────────────
  // FRAGMENT SHADER — unchanged from original
  // ─────────────────────────────────────────────


 fragmentShader: `
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
  // Three explicit zones — peak, slope, valley
  // Each gets distinct colour, light and scatter treatment

  float peakZone   = smoothstep(0.48, 0.80, d);
  peakZone         = pow(peakZone, 1.2);

  float valleyZone = smoothstep(0.36, 0.06, d);
  valleyZone       = pow(valleyZone, 1.4);

  float slopeZone  = clamp(1.0 - peakZone - valleyZone, 0.0, 1.0);

  // ── COLOUR PALETTE ────────────────────────────────────────────────────
  // ── COLOUR PALETTE (milky organic) ───────────────────────────────────
  vec3 colPeak      = vec3(0.96, 0.96, 0.95);  // cool near-white milk
  vec3 colSlope     = vec3(0.78, 0.80, 0.84);  // soft blue-grey slope
  vec3 colValley    = vec3(0.28, 0.32, 0.42);  // muted blue-indigo valley
  vec3 colSSS_peak  = vec3(0.94, 0.92, 0.96);  // cool lavender peak scatter
  vec3 colSSS_deep  = vec3(0.35, 0.42, 0.62);  // deep blue valley glow
  vec3 colRim       = vec3(0.98, 0.98, 1.00);  // pure cool white rim

  // direct zone colour assignment — no single flattening base
  vec3 color = colPeak   * peakZone
             + colSlope  * slopeZone
             + colValley * valleyZone;

  // ── LIGHTING SETUP ────────────────────────────────────────────────────
  vec3  lightDir  = normalize(vec3(0.5, 0.8, 0.6));
  vec3  lightDir2 = normalize(vec3(-0.4, -0.2, -0.5));  // soft fill from opposite

  float NdL1 = clamp(dot(normal, lightDir),  0.0, 1.0);
  float NdL2 = clamp(dot(normal, lightDir2), 0.0, 1.0);

  // main light — hits peaks, barely reaches valleys
  float light1 = pow(NdL1, 1.1);
  // fill light — slightly warm, softens shadow side
  float light2 = pow(NdL2, 2.0) * 0.25;

  // light is stronger on peaks, attenuated in valleys
  float lightZoneMask = peakZone * 1.0 + slopeZone * 0.55 + valleyZone * 0.08;
  color *= 0.40 + (light1 * lightZoneMask + light2) * 1.15;

  // ── SPECULAR — sharp on peak crests ───────────────────────────────────
  vec3  halfV   = normalize(lightDir + view);
  float NdH     = clamp(dot(normal, halfV), 0.0, 1.0);

  // narrow specular — tight highlight on ridge crest
  float specNarrow = pow(NdH, 48.0) * peakZone;
  // broad specular — soft sheen across upper slopes
  float specBroad  = pow(NdH, 12.0) * (peakZone * 0.5 + slopeZone * 0.3);

  color += colRim    * specNarrow * 0.80;
  color += colPeak   * specBroad  * 0.22;

  // ── SUBSURFACE SCATTERING — PEAKS ─────────────────────────────────────
  // Light penetrates the thin crest and scatters warm amber from inside
  // Strongest where the fold is thin (low thickness) and faces the light
  float sss_peak =
    pow(NdL1, 0.6) *                    // lit side
    (1.0 - thickness) * 0.7 +           // thin areas scatter more
    pow(1.0 - facing, 1.4) * 0.3;       // glancing angles catch scatter

  sss_peak *= peakZone * 0.8 + slopeZone * 0.3;
  sss_peak  = clamp(sss_peak, 0.0, 1.0);

  color = mix(color, colSSS_peak, sss_peak * 0.45);

  // ── SUBSURFACE SCATTERING — VALLEYS ───────────────────────────────────
  // Deep crevices trap and re-emit deep red-amber light
  // This gives colour depth — valleys aren't just dark, they glow darkly
  float sss_valley =
    (1.0 - NdL1) *                      // shadow side
    valleyZone *                         // only in deep zones
    (0.5 + vStress * 0.3);              // stress increases deep scatter

  sss_valley = pow(sss_valley, 1.3);
  sss_valley = clamp(sss_valley, 0.0, 1.0);

  // valley SSS adds warmth without lifting brightness too much
  color += colSSS_deep * sss_valley * 0.35;

  // ── CAVITY DEPTH ─────────────────────────────────────────────────────
  // Final darkening pass — valleys go very dark
  // Separate from SSS so scatter and depth are independent
  float valleyDepth = pow(valleyZone, 1.5);
  color *= 1.0 - valleyDepth * 0.58;

  // ── EDGE / RIM LIGHT ──────────────────────────────────────────────────
  // Backlit silhouette glow — the fibrous translucency quality
  float rim = pow(1.0 - facing, 2.5);

  // bright rim on peaks
  color += colRim     * rim * peakZone  * 0.38;
  // warm amber rim on slopes — like light bleeding through material
  color += colSSS_peak * pow(1.0 - facing, 3.5) * slopeZone * 0.22;

  // ── MEMBRANE ZONES ────────────────────────────────────────────────────
  float inMembrane = (1.0 - smoothstep(0.04, 0.18, d)) * smoothstep(0.0, 0.04, d);
   vec3  colMembrane = vec3(0.82, 0.84, 0.88);
  color = mix(color, colMembrane, inMembrane * 0.35);
  // membrane gets gentle scatter too
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
  // High pollution — peaks get slightly more red, valleys go darker
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
`
})






const organism = new THREE.Mesh(geometry, material);
organism.frustumCulled = false; 
scene.add(organism);


// Light
const ambient = new THREE.AmbientLight(0xffffff, 1.6)
scene.add(ambient)

const light = new THREE.DirectionalLight(0xffffff, 5.2)
light.position.set(5, 10, 7)
scene.add(light)

const backLight = new THREE.DirectionalLight(0xffffff, 0.8)
backLight.position.set(-5, -5, -5)
scene.add(backLight)

const innerLight = new THREE.PointLight(0xffffff, 14, 10)
innerLight.position.set(0.5, 0.3, 0.2)
scene.add(innerLight)

const rimLight = new THREE.DirectionalLight(0xffffff, 2)
rimLight.position.set(-3, 2, -5)
scene.add(rimLight)


// Position 
//-const basePositions = geometry.attributes.position.array.slice()

// --- MEMORY (persistent deformation)
//-const memory = new Float32Array(basePositions.length).fill(0)

// --- Adaptation memory ---
let adaptation = 0.0

let time = 0.5

// ------------------------
// REAL POLLUTION DATA (4 CHANNELS)
// ------------------------

let pm25 = 0.3
let pm10 = 0.3
let no2 = 0.3
let co = 0.3

async function fetchAirData() {
  try {
    const response = await fetch(
      "https://api.waqi.info/feed/berlin/?token=demo"
    )

    const data = await response.json()

    if (data.status === "ok") {
      const iaqi = data.data.iaqi

      // normalize safely (0 → 1 ranges)
      pm25 = iaqi.pm25 ? Math.min(iaqi.pm25.v / 100, 1) : pm25
      pm10 = iaqi.pm10 ? Math.min(iaqi.pm10.v / 100, 1) : pm10
      no2  = iaqi.no2  ? Math.min(iaqi.no2.v  / 100, 1) : no2
      co   = iaqi.co   ? Math.min(iaqi.co.v   / 10,  1) : co

      console.log( "Pollution --- ", 
        "PM2.5:", pm25.toFixed(2),
        "PM10:", pm10.toFixed(2),
        "NO2:", no2.toFixed(2),
        "CO:", co.toFixed(2)
      )
    }

  } catch (e) {
    console.log("Data fetch error:", e)
  }
}

fetchAirData()
setInterval(fetchAirData, 10000)


//Cluters//
const clusters = [
  { x: 0.3, y: 0.2, z: 0.1 },
  { x: -0.4, y: -0.1, z: 0.2 },
  { x: 0.1, y: -0.3, z: -0.4 }
]


// EXPERIENCE TIME
let experienceTime = 0

let lastTime = performance.now();

// ------------------------//
// ANIMATION
// ------------------------//

function animate() {
  requestAnimationFrame(animate)

   time += 0.005
   const slowTime = time * 0.01
// ------------------------
experienceTime += 0.016  // ~seconds
// ------------------------

// EXPERIENCE STAGES
const stage1 = Math.min(experienceTime / 30, 1.0)   // 0–30s
const stage2 = Math.min(Math.max((experienceTime - 30) / 30, 0), 1.0)
const stage3 = Math.min(Math.max((experienceTime - 60) / 60, 0), 1.0)

// ULTRA SLOW CLUSTER SHIFT
// ------------------------
if (Math.random() < 0.002) {
  for (let c of clusters) {
    c.x += (Math.random() - 0.5) * 0.005
    c.y += (Math.random() - 0.5) * 0.0005
    c.z += (Math.random() - 0.5) * 0.0005
  }
}

// DATA MAPPING 
const tension = pm10
const vibration = Math.sin(time * 2) * pm10

// ------------------------
// ADAPTATION (CUMULATIVE EXPOSURE)
// ------------------------

const exposure =
  pm25 * 0.4 +
  pm10 * 0.2 +
  no2  * 0.25 +
  co   * 0.15

// accumulation (damage)
adaptation += exposure * 0.0015

// slow recovery
adaptation *= 0.9996

// clamp
adaptation = Math.min(adaptation, 1.0)

// sensitivity (core concept)
const rawSensitivity = Math.max(0.15, 1.0 - adaptation)

// perception delay
const sensitivity =
  1.0 - (1.0 - rawSensitivity) * stage3

// ------------------------
// NO2 → BREATHING
// ------------------------

const breathingSuppression = 1.0 - no2 * 0.7

const breath =
  1 +
  Math.sin(time * (0.25 + tension * 0.5)) *
  (0.015 + tension * 0.04) *
  sensitivity *
  breathingSuppression *
  (0.6 + stage1 * 0.4)

organism.scale.set(breath, breath, breath)

const pulse =
  Math.sign(breath - 1.0) *
  Math.pow(Math.abs(breath - 1.0), 1.3)

// --- BREATH → SPACE ---
scene.fog.near = (1.0 + co * 0.3) - pulse * 0.6
scene.fog.far  = (4 - co * 2.0) + pulse * 1.0

// ------------------------
// BREATH INFLUENCE
// ------------------------

const breathInfluence = (breath - 1.0) * 0.5


// ------------------------
// PARTICLE SYSTEM (BASELINE STABLE)
// ------------------------

const pPositions = particleGeometry.attributes.position


for (let i = 0; i < particleCount; i++) {
  let x = pPositions.getX(i)
  let y = pPositions.getY(i)
  let z = pPositions.getZ(i)

const prevX = x
const prevY = y
const prevZ = z



// ------------------------
// SMOOTH DRIFT (ANTI-LINE)
// ------------------------

const id = i * 0.001

const driftX =
  Math.sin(y * 1.2 + slowTime * 0.2 + id * 10.0) *
  Math.cos(z * 0.8 + id * 5.0)

const driftY =
  Math.sin(z * 1.2 + slowTime * 0.2 + id * 20.0) *
  Math.cos(x * 0.8 + id * 7.0)

const driftZ =
  Math.sin(x * 1.2 + slowTime * 0.2 + id * 30.0) *
  Math.cos(y * 0.8 + id * 9.0)

const len = Math.sqrt(driftX*driftX + driftY*driftY + driftZ*driftZ) + 0.0001

const speedFactor = 1.0 - co * 0.4

x += (driftX / len) * 0.00015 * speedFactor
y += (driftY / len) * 0.00015 * speedFactor
z += (driftZ / len) * 0.00015 * speedFactor

//optional//ss
x += Math.sin(slowTime + i) * 0.00001
y += Math.cos(slowTime + i * 2) * 0.00001
z += Math.sin(slowTime + i * 3) * 0.00001


// BREATH → PARTICLE COUPLING
x += breathInfluence * 0.0005
y += breathInfluence * 0.0005
z += breathInfluence * 0.0005

// ------------------------
// CLOUD CLUSTERS (CONTROLLED)
// ------------------------

// fixed cluster centers


let closest = 999
let target = null

for (let c of clusters) {
  const dx = x - c.x
  const dy = y - c.y
  const dz = z - c.z

  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)

  if (dist < closest) {
    closest = dist
    target = c
  }
}

// attraction strength
const influence = Math.max(0, 1 - closest * 2)

// ------------------------
// STRONGER CLUSTER COMPRESSION
// ------------------------

const strength = influence * influence  // sharper falloff

// pull toward center
const clusterStrength = 0.0005 + pm10 * 0.001

x += (target.x - x) * strength * clusterStrength
y += (target.y - y) * strength * clusterStrength
z += (target.z - z) * strength * clusterStrength

// compress space inside cluster (KEY)
const compression = 1 - strength * 0.02

x *= compression
y *= compression
z *= compression

// ------------------------
// MEMBRANE → PARTICLE COUPLING
// ------------------------

const membraneField =
  Math.sin(x * 3 + slowTime * 0.2) *
  Math.sin(y * 3 + slowTime * 0.2) *
  Math.sin(z * 3 + slowTime * 0.2)

x += membraneField * 0.0003
y += membraneField * 0.0003
z += membraneField * 0.0003

// ------------------------
// MEMBRANE COLLIDER (STABLE)
// ------------------------

const maxR = 0.90
const r = Math.sqrt(x*x + y*y + z*z) + 0.000001

if (r > maxR) {
  // surface normal
  const nx = x / r
  const ny = y / r
  const nz = z / r

  // project onto surface
  x = nx * maxR
  y = ny * maxR
  z = nz * maxR

  const surfaceProximity = Math.max(0, 1.0 - (maxR - r) * 10.0)

x -= x * surfaceProximity * 0.002
y -= y * surfaceProximity * 0.002
z -= z * surfaceProximity * 0.002

  // ------------------------
  // REAL MOVEMENT VECTOR (KEY FIX)
  // ------------------------

  const vx = x - prevX
  const vy = y - prevY
  const vz = z - prevZ

  // remove outward component
  const dot = vx * nx + vy * ny + vz * nz

  if (dot > 0) {
    x -= nx * dot
    y -= ny * dot
    z -= nz * dot
  }

  // subtle inward pulse (breathing boundary)
const boundaryPulse = Math.sin(time * 2.0) * 0.002

x -= nx * boundaryPulse
y -= ny * boundaryPulse
z -= nz * boundaryPulse

  // small inward bias (stability)
  x *= 0.995
  y *= 0.995
  z *= 0.995
  
// ------------------------
// ORGANISM FIELD INFLUENCE (NEW)
// ------------------------

const organismField =
  Math.sin(x * 4 + slowTime * 0.2) *
  Math.sin(y * 4 + slowTime * 0.2) *
  Math.sin(z * 4 + slowTime * 0.2)

x += organismField * 0.0005
y += organismField * 0.0005
z += organismField * 0.0005
}

  pPositions.setXYZ(i, x, y, z)
}

pPositions.needsUpdate = true


// ------------------------
// PM2.5 → PARTICLE DENSITY + CLOUD MASK
// ------------------------

const density = Math.pow(pm25, 1.5)

// ------------------------
// VISUAL CLOUD STRUCTURE 
// ------------------------

const cloudMask =
  Math.sin(time * 0.05 + camera.position.x * 2) *
  Math.sin(time * 0.08 + camera.position.y * 2) *
  Math.sin(time * 0.06 + camera.position.z * 2)

// normalize 0–1
const cloud = Math.pow((cloudMask + 1) * 0.5, 2.0)

// ------------------------
// APPLY VISUAL LAYER
// ------------------------

// particleMaterial.opacity =
//   (0.1 + density * 0.5) *
//   cloud *
//   (1.0 - co * 0.3) *
//   stage1

// particleMaterial.size =
//   (0.003 + density * 0.008) *
//   (0.7 + cloud * 0.3)



// CO → LIGHT TEMPERATURE
const coldColor = new THREE.Color(0.6, 0.7, 1.0) // bluish
const warmColor = new THREE.Color(1.0, 0.85, 0.7) // warm

innerLight.color.lerpColors(warmColor, coldColor, co * stage2)
innerLight.intensity =
  2.0 + no2 * 2.0 + pulse * 0.3

// --- Immersive drift (CONSTRAINED INSIDE) ---
const camRadius = 0.6  // MUST be < membrane (0.9)



// --- BREATH → CAMERA (IMMERSIVE) ---
const camPulse = pulse * 0.04

camera.position.multiplyScalar(1.0 + camPulse)

const camDist = camera.position.length()

if (camDist < 1.0) {
  material.side = THREE.BackSide
} else {
  material.side = THREE.FrontSide
}


//--- Camera orbit (observer) ---
// camera.position.x = Math.sin(time * 0.23) * 0.08
// camera.position.y = Math.sin(time * 0.17) * 0.04
// camera.position.z = 3 + Math.sin(time * 0.19) * 0.08
// camera.lookAt(0, 0, 0)
 

// // --- Membrane deformation ---
//   const position = organism.geometry.attributes.position

//   for (let i = 0; i < position.count; i++) {
//     const ix = i * 3

//     // 🔑 ALWAYS use original positions
//     const x = basePositions[ix]
//     const y = basePositions[ix + 1]
//     const z = basePositions[ix + 2]



// // --- LAYER 1 ---
// const base =
//   Math.sin(x * 4 + time * 0.2) *
//   Math.sin(y * 4 + time * 0.2) *
//   Math.sin(z * 4 + time * 0.2)

  
// // --- LAYER 2 ---
// const folds =
//   Math.sin(
//     x * 8 +
//     Math.sin(y * 4 + time * 0.3) * 2 +
//     Math.cos(z * 4 + time * 0.2) * 2
//   )
// // --- LAYER 3 ---
//   const micro =
//   Math.sin(x * 20 + time * 0.8) *
//   Math.sin(y * 18 + time * 0.6) *
//   Math.sin(z * 22 + time * 0.7)

// // --- LAYER 3.5: fine lines (NEW) ---
// const fine =
//   Math.sin(x * 70 + time * 0.5) *
//   Math.sin(y * 70 + time * 0.4) *
//   Math.sin(z * 70 + time * 0.6)

// // --- LAYER 4: spatial sensitivity (fixed in space) ---
// const zone =
//   Math.sin(x * 2) *
//   Math.cos(y * 2) *
//   Math.sin(z * 2)

// const zoneMask = (zone + 1) / 2
// const activity = 0.6 + zoneMask * 0.6

// // use GLOBAL sensitivity (from adaptation)
// const localSensitivity = sensitivity * (0.5 + zoneMask * 0.5)

// // --- SEPARATED BEHAVIOR ---
// const large = base * (0.4 + pm10 * 0.3)
// const medium = folds * (0.2 + pm25 * 0.4)
// const small = micro * (0.05 + pm25 * 0.2)    

// const combined = large + medium + small + fine * 0.03

// // NO2 → WRINKLE SHARPNESS

// const wrinklePower =
//   1.5 + no2 * 2.0 * stage2

// const sharp =
//   Math.sign(combined) *
//   Math.pow(Math.abs(combined), wrinklePower)

// // --- LAYER 6: directional tension ---
// const direction =
//   Math.sin(x * 2 + time * 0.1) *
//   Math.cos(y * 2 + time * 0.08) *
//   Math.sin(z * 2 + time * 0.12)
  
// // --- LAYER 5: compression ---
// const surfaceCompression =
//   Math.max(1, combined - 0.5) * direction * 1


// // ------------------------
// // PM10 → STRUCTURAL TENSION/ offset
// // ------------------------
// const tensionForce = 1.0 + pm10 * 2.0   // stronger pull
// const tensionBoost = 1.0 + stage2 * 0.5

// const offset =
//   sharp *
//   (0.03 + pm10 * 0.1) *
//   localSensitivity *
//   tensionForce *
//   (1.0 + pulse * 0.8)

// // --- Memory ---
// const delta = offset * 0.1

// memory[ix] += delta

// memory[ix] = Math.max(-0.2, Math.min(0.2, memory[ix]))

// memory[ix] *= 0.97

// const stiffness = 1.5 - pm10 * 0.4   // high PM10 → less movement

// const totalOffset = (offset + memory[ix]) * 0.8 * stiffness

// // --- APPLY ---
// const radius = Math.sqrt(x * x + y * y + z * z)
// const nx = x / radius
// const ny = y / radius
// const nz = z / radius

// // --- TANGENTIAL flow (NEW - THIS CREATES WRINKLES)
// const tx = -y
// const ty = x
// const tz = 0

// // normalize tangent
// const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) + 0.0001
// const tnx = tx / tLen
// const tny = ty / tLen
// const tnz = tz / tLen

// // tangential strength
// const flow = combined * 0.05

// const vib = vibration * 0.002

// // FINAL POSITION
// const newX = x + nx * totalOffset + tnx * flow + vib
// const newY = y + ny * totalOffset + tny * flow + vib
// const newZ = z + nz * totalOffset + tnz * flow + vib

// position.setXYZ(i, newX, newY, newZ)


//   }

  // organism.geometry.computeVertexNormals()

  // position.needsUpdate = true

  // subtle rotation
  organism.rotation.y += 0.0001

material.uniforms.time.value = time
material.uniforms.pm25.value = pm25
material.uniforms.pm10.value = pm10
material.uniforms.no2.value = no2
material.uniforms.co.value = co
material.uniforms.sensitivity.value = sensitivity

  

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  
  controls.update(delta);

  renderer.render(scene, camera);
}


animate()






