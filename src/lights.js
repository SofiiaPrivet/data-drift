import * as THREE from 'three'
import scene from './scene.js'

const ambient = new THREE.AmbientLight(0xffffff, 1.6)
scene.add(ambient)

const mainLight = new THREE.DirectionalLight(0xffffff, 5.2)
mainLight.position.set(5, 10, 7)
scene.add(mainLight)

const backLight = new THREE.DirectionalLight(0xffffff, 0.8)
backLight.position.set(-5, -5, -5)
scene.add(backLight)

const innerLight = new THREE.PointLight(0xffffff, 14, 10)
innerLight.position.set(0.5, 0.3, 0.2)
scene.add(innerLight)

const rimLight = new THREE.DirectionalLight(0xffffff, 2)
rimLight.position.set(-3, 2, -5)
scene.add(rimLight)

export { innerLight }
