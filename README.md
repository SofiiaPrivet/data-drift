# Data Drift

**An atmospheric organism driven by real-time urban air quality data.**

Three.js · GLSL · WebGL · OpenWeatherMap API · Vite

---

## Concept

Humans continuously adapt to invisible environmental conditions. Over time, exposure does not produce visible collapse — only gradual desensitization.

Air Drift places the viewer inside a responsive atmospheric organism. The organism does not resist pollution. It adapts. Responsiveness slowly decreases as exposure accumulates. When pollution decreases, recovery occurs — but gradually. The system never fully loses sensitivity.

The tragedy is not destruction. The tragedy is normalization.

---

## How It Works

Live air quality data (NOx, PM₂.₅, PM₁₀, CO) is pulled from the OpenWeatherMap API and translated into spatial behavior through a custom behavioral model:

| Pollutant | Behavioral Layer |
|-----------|-----------------|
| NO₂ | Membrane tension |
| PM₂.₅ | Particle density |
| PM₁₀ | Vibration field |
| CO | Light temperature |

Three processes run simultaneously:
- **Baseline respiration** — constant atmospheric movement representing vitality
- **Immediate pollution response** — real-time data modifies organism behavior
- **Adaptive memory** — accumulated exposure gradually reduces system sensitivity over time

---

## Spatial Structure

The environment consists of a responsive membrane, suspended particle fields, volumetric light conditions, and subtle vibration dynamics. There are no data interfaces or numerical displays — only spatial behavior communicates system state. The viewer is located inside the organism.

**Visual tone:** Blade Runner 2049, Dune (2021), Tarkovsky's Stalker. Membrane boundary between biological skin and natural phenomena — storm currents, river surfaces, dunes.

---

## Stack

- [Three.js](https://threejs.org/) — 3D rendering
- Custom GLSL vertex and fragment shaders — membrane behavior
- [OpenWeatherMap Air Pollution API](https://openweathermap.org/api/air-pollution) — live data source
- Vite — build tooling

---

## Run Locally

```bash
# Clone the repo
git clone https://github.com/SofiiaPrivet/data-drift.git
cd data-drift

# Install dependencies
npm install

# Add your API key
echo "VITE_API_KEY=your_openweathermap_key" > .env

# Start dev server
npm run dev
```

Get a free API key at [openweathermap.org](https://openweathermap.org/api).

---

## Status

In active development. Live demo coming soon.

---

*Sofiia Savytska — [sofiiasavytska.com](https://sofiiasavytska.com)*
