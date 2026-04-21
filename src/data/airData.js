import { API_URL, NORMALIZATION } from '../config.js'

const state = { pm25: 0.3, pm10: 0.3, no2: 0.3, co: 0.3 }

async function fetchAirData() {
  try {
    const response = await fetch(API_URL)
    const data = await response.json()

    if (data.list && data.list[0]) {
      const c = data.list[0].components
      state.pm25 = Math.min(c.pm2_5 / NORMALIZATION.pm25, 1)
      state.pm10 = Math.min(c.pm10  / NORMALIZATION.pm10, 1)
      state.no2  = Math.min(c.no2   / NORMALIZATION.no2,  1)
      state.co   = Math.min(c.co    / NORMALIZATION.co,   1)

      const timestamp = new Date().toLocaleTimeString()
      console.group(`Air Quality — ${timestamp}`)
      console.log('PM2.5 :', state.pm25.toFixed(3))
      console.log('PM10  :', state.pm10.toFixed(3))
      console.log('NO2   :', state.no2.toFixed(3))
      console.log('CO    :', state.co.toFixed(3))
      console.groupEnd()
    }
  } catch (e) {
    console.log('Data fetch error:', e)
  }
}

function startPolling(intervalMs = 10000) {
  fetchAirData()
  setInterval(fetchAirData, intervalMs)
}

function getAirData() {
  return state
}

export { startPolling, getAirData }
