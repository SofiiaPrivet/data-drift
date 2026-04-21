export const API_URL = `https://api.waqi.info/feed/berlin/?token=${import.meta.env.VITE_API_KEY}`

export const NORMALIZATION = {
  pm25: 100,
  pm10: 100,
  no2:  100,
  co:   10
}

export const ADAPTATION = {
  damageRate:   0.0015,
  recoveryRate: 0.9996,
  floor:        0.15
}

export const PARTICLE = {
  count:     1000,
  maxRadius: 0.90,
  texture:   'Assets/light_01.png'
}

export const CLUSTERS = [
  { x:  0.3,  y:  0.2,  z:  0.1 },
  { x: -0.4,  y: -0.1,  z:  0.2 },
  { x:  0.1,  y: -0.3,  z: -0.4 }
]

export const CAMERA = {
  fov:    75,
  near:   0.1,
  far:    1000,
  radius: 0.2
}
