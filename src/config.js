// Berlin coordinates
const LAT = 52.52
const LON = 13.405
export const API_URL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${import.meta.env.VITE_API_KEY}`

// Normalization ceilings (μg/m³) — maps "very poor" air quality to 1.0
export const NORMALIZATION = {
  pm25: 75,
  pm10: 200,
  no2:  200,
  co:   10000
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
