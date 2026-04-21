import { ADAPTATION } from '../config.js'

let adaptation = 0.0

function update(airData) {
  const exposure =
    airData.pm25 * 0.4 +
    airData.pm10 * 0.2 +
    airData.no2  * 0.25 +
    airData.co   * 0.15

  adaptation += exposure * ADAPTATION.damageRate
  adaptation *= ADAPTATION.recoveryRate
  adaptation  = Math.min(adaptation, 1.0)
}

// stageFactor (0→1) is stage3 from the experience timeline;
// delays the perceptual effect of adaptation during the opening seconds
function getSensitivity(stageFactor = 1.0) {
  const raw = Math.max(ADAPTATION.floor, 1.0 - adaptation)
  return 1.0 - (1.0 - raw) * stageFactor
}

export { update, getSensitivity }
