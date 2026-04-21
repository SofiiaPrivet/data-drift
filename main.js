import * as THREE from 'three'
import scene from './src/scene.js'
import renderer from './src/renderer.js'
import { camera, controls } from './src/camera.js'
import { innerLight } from './src/lights.js'
import { mesh as organism, uniforms, material } from './src/organism.js'
import { update as updateParticles } from './src/particles.js'
import { startPolling, getAirData } from './src/data/airData.js'
import { update as updateAdaptation, getSensitivity } from './src/data/adaptation.js'

startPolling()

let time           = 0.5
let experienceTime = 0
let lastTime       = performance.now()

const coldColor = new THREE.Color(0.6, 0.7, 1.0)
const warmColor = new THREE.Color(1.0, 0.85, 0.7)

function animate() {
  requestAnimationFrame(animate)

  time           += 0.005
  experienceTime += 0.016

  const slowTime = time * 0.01

  // experience stages (0–30s, 30–60s, 60–120s)
  const stage1 = Math.min(experienceTime / 30, 1.0)
  const stage2 = Math.min(Math.max((experienceTime - 30) / 30, 0), 1.0)
  const stage3 = Math.min(Math.max((experienceTime - 60) / 60, 0), 1.0)

  const airData = getAirData()
  const { pm25, pm10, no2, co } = airData

  updateAdaptation(airData)
  const sensitivity = getSensitivity(stage3)

  // NO2 → breathing suppression
  const tension              = pm10
  const breathingSuppression = 1.0 - no2 * 0.7

  const breath =
    1 +
    Math.sin(time * (0.25 + tension * 0.5)) *
    (0.015 + tension * 0.04) *
    sensitivity *
    breathingSuppression *
    (0.6 + stage1 * 0.4)

  organism.scale.set(breath, breath, breath)

  const pulse = Math.sign(breath - 1.0) * Math.pow(Math.abs(breath - 1.0), 1.3)

  // CO → fog density
  scene.fog.near = (1.0 + co * 0.3) - pulse * 0.6
  scene.fog.far  = (4 - co * 2.0)   + pulse * 1.0

  // CO → light temperature
  innerLight.color.lerpColors(warmColor, coldColor, co * stage2)
  innerLight.intensity = 2.0 + no2 * 2.0 + pulse * 0.3

  // flip membrane side when camera exits sphere
  material.side = camera.position.length() < 1.0 ? THREE.BackSide : THREE.FrontSide

  // breath → camera pulse
  camera.position.multiplyScalar(1.0 + pulse * 0.04)

  updateParticles({ pm10, co, breath, slowTime, time })

  uniforms.time.value        = time
  uniforms.pm25.value        = pm25
  uniforms.pm10.value        = pm10
  uniforms.no2.value         = no2
  uniforms.co.value          = co
  uniforms.sensitivity.value = sensitivity

  organism.rotation.y += 0.0001

  const now   = performance.now()
  const delta = (now - lastTime) / 1000
  lastTime    = now

  controls.update(delta)
  renderer.render(scene, camera)
}

animate()
