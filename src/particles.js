import * as THREE from 'three'
import scene from './scene.js'
import { PARTICLE, CLUSTERS } from './config.js'

const count = PARTICLE.count
const positions = new Float32Array(count * 3)

for (let i = 0; i < count; i++) {
  const radius = Math.random() * PARTICLE.maxRadius
  const theta  = Math.random() * Math.PI * 2
  const phi    = Math.acos(2 * Math.random() - 1)
  positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
  positions[i * 3 + 2] = radius * Math.cos(phi)
}

const geometry = new THREE.BufferGeometry()
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

const texture = new THREE.TextureLoader().load(PARTICLE.texture)

const material = new THREE.PointsMaterial({
  color:      new THREE.Color('#5c7391'),
  size:       0.005,
  alphaMap:   texture,
  transparent: true,
  opacity:    0.5,
  depthWrite: false,
  blending:   THREE.AdditiveBlending
})

const particles = new THREE.Points(geometry, material)
particles.visible = false
scene.add(particles)

// cluster centers — copied so we can drift them without mutating config
const clusters = CLUSTERS.map(c => ({ ...c }))

function update({ pm10, co, breath, slowTime, time }) {
  // ultra-slow cluster drift
  if (Math.random() < 0.002) {
    for (const c of clusters) {
      c.x += (Math.random() - 0.5) * 0.005
      c.y += (Math.random() - 0.5) * 0.0005
      c.z += (Math.random() - 0.5) * 0.0005
    }
  }

  const breathInfluence = (breath - 1.0) * 0.5
  const pPositions = geometry.attributes.position

  for (let i = 0; i < count; i++) {
    let x = pPositions.getX(i)
    let y = pPositions.getY(i)
    let z = pPositions.getZ(i)

    const prevX = x
    const prevY = y
    const prevZ = z

    // smooth drift (anti-line)
    const id = i * 0.001
    const driftX = Math.sin(y * 1.2 + slowTime * 0.2 + id * 10.0) * Math.cos(z * 0.8 + id * 5.0)
    const driftY = Math.sin(z * 1.2 + slowTime * 0.2 + id * 20.0) * Math.cos(x * 0.8 + id * 7.0)
    const driftZ = Math.sin(x * 1.2 + slowTime * 0.2 + id * 30.0) * Math.cos(y * 0.8 + id * 9.0)
    const len = Math.sqrt(driftX*driftX + driftY*driftY + driftZ*driftZ) + 0.0001
    const speedFactor = 1.0 - co * 0.4

    x += (driftX / len) * 0.00015 * speedFactor
    y += (driftY / len) * 0.00015 * speedFactor
    z += (driftZ / len) * 0.00015 * speedFactor

    x += Math.sin(slowTime + i) * 0.00001
    y += Math.cos(slowTime + i * 2) * 0.00001
    z += Math.sin(slowTime + i * 3) * 0.00001

    // breath coupling
    x += breathInfluence * 0.0005
    y += breathInfluence * 0.0005
    z += breathInfluence * 0.0005

    // find closest cluster
    let closest = 999
    let target = clusters[0]
    for (const c of clusters) {
      const dx = x - c.x
      const dy = y - c.y
      const dz = z - c.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < closest) { closest = dist; target = c }
    }

    const influence = Math.max(0, 1 - closest * 2)
    const strength  = influence * influence
    const clusterStrength = 0.0005 + pm10 * 0.001

    x += (target.x - x) * strength * clusterStrength
    y += (target.y - y) * strength * clusterStrength
    z += (target.z - z) * strength * clusterStrength

    const compression = 1 - strength * 0.02
    x *= compression
    y *= compression
    z *= compression

    // membrane field coupling
    const membraneField =
      Math.sin(x * 3 + slowTime * 0.2) *
      Math.sin(y * 3 + slowTime * 0.2) *
      Math.sin(z * 3 + slowTime * 0.2)

    x += membraneField * 0.0003
    y += membraneField * 0.0003
    z += membraneField * 0.0003

    // membrane collider
    const maxR = PARTICLE.maxRadius
    const r    = Math.sqrt(x*x + y*y + z*z) + 0.000001

    if (r > maxR) {
      const nx = x / r
      const ny = y / r
      const nz = z / r

      x = nx * maxR
      y = ny * maxR
      z = nz * maxR

      const surfaceProximity = Math.max(0, 1.0 - (maxR - r) * 10.0)
      x -= x * surfaceProximity * 0.002
      y -= y * surfaceProximity * 0.002
      z -= z * surfaceProximity * 0.002

      const vx  = x - prevX
      const vy  = y - prevY
      const vz  = z - prevZ
      const dot = vx * nx + vy * ny + vz * nz
      if (dot > 0) {
        x -= nx * dot
        y -= ny * dot
        z -= nz * dot
      }

      // breathing boundary pulse
      const boundaryPulse = Math.sin(time * 2.0) * 0.002
      x -= nx * boundaryPulse
      y -= ny * boundaryPulse
      z -= nz * boundaryPulse

      x *= 0.995
      y *= 0.995
      z *= 0.995

      // organism field influence
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
}

export { particles, update }
