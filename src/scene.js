import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0e12)
scene.fog = new THREE.Fog(0x0a0e12, 2.0, 6)
scene.fog.color.setRGB(0.04, 0.05, 0.06)

export default scene
