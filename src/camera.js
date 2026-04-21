import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import renderer from './renderer.js'
import { CAMERA } from './config.js'

const camera = new THREE.PerspectiveCamera(
  CAMERA.fov,
  window.innerWidth / window.innerHeight,
  CAMERA.near,
  CAMERA.far
)
camera.position.set(0, 0, CAMERA.radius)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableZoom = false
controls.enablePan = false
controls.enableDamping = true
controls.dampingFactor = 0.14
controls.rotateSpeed = 0.22
controls.minDistance = CAMERA.radius
controls.maxDistance = CAMERA.radius
controls.minPolarAngle = Math.PI * 0.1
controls.maxPolarAngle = Math.PI * 0.9
controls.target.set(0, 0, 0)
controls.update()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

export { camera, controls }
