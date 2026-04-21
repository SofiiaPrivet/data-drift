import * as THREE from 'three'
import scene from './scene.js'
import vertSrc from './shaders/organism.vert.glsl?raw'
import fragSrc from './shaders/organism.frag.glsl?raw'

const geometry = new THREE.SphereGeometry(1, 768, 768)

const uniforms = {
  time:        { value: 0 },
  pm25:        { value: 1 },
  pm10:        { value: 1 },
  no2:         { value: 0 },
  co:          { value: 0 },
  sensitivity: { value: 1 }
}

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite:  true,
  side:        THREE.BackSide,
  depthTest:   true,
  uniforms,
  vertexShader:   vertSrc,
  fragmentShader: fragSrc
})

const mesh = new THREE.Mesh(geometry, material)
mesh.frustumCulled = false
scene.add(mesh)

export { mesh, uniforms, material }
