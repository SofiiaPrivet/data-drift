import { API_URL, NORMALIZATION } from '../config.js'

const state = { pm25: 0.3, pm10: 0.3, no2: 0.3, co: 0.3 }

async function fetchAirData() {
  try {
    const response = await fetch(API_URL)
    const data = await response.json()

    if (data.status === 'ok') {
      const iaqi = data.data.iaqi
      state.pm25 = iaqi.pm25 ? Math.min(iaqi.pm25.v / NORMALIZATION.pm25, 1) : state.pm25
      state.pm10 = iaqi.pm10 ? Math.min(iaqi.pm10.v / NORMALIZATION.pm10, 1) : state.pm10
      state.no2  = iaqi.no2  ? Math.min(iaqi.no2.v  / NORMALIZATION.no2,  1) : state.no2
      state.co   = iaqi.co   ? Math.min(iaqi.co.v   / NORMALIZATION.co,   1) : state.co

      console.log('Pollution ---',
        'PM2.5:', state.pm25.toFixed(2),
        'PM10:',  state.pm10.toFixed(2),
        'NO2:',   state.no2.toFixed(2),
        'CO:',    state.co.toFixed(2)
      )
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
