# Process Log

## [21.04.2026]

### What We Did
- Reorganised project into modular folder structure
- Connected real OpenWeatherMap API key via .env
- Set up environment variable through config.js
- Confirmed live PM2.5, PM10, NO2, CO data in console

### What's Working
- Modular structure clean and functioning
- Real Berlin air quality data fetching correctly
- Console logging confirmed in browser dev tools

### Current Blocker
- Visual execution still in progress

### Next Session Goals
- Continue working on visual response to data


## [23.04.2026]

### What We Did
- Rewrote vertex shader geometry: wider fold spacing, elongated anisotropy, removed basin displacement system that caused visible seam
- Added nano detail layer; removed hard smoothstep cutoffs from macro/mid layers
- Fixed inverted pole jitter bug — starburst artefact significantly reduced
- Rebuilt lighting as pollution-driven: clean air = open/milky, heavy pollution = dark/tense
- Added peak glow, recession vignette, iridescent edge sheen
- Switched colour palette to Jupiter atmosphere reference with spatially varying warm/cool geography

### What's Working
- No more basin seam cutting line
- Fold structure covers full sphere without displacement boundary
- Colour palette is spatially variable — warm/cool slopes, teal/umber valleys, iridescence at edges
- Ambient brightness now responds to real pollution data

### Current Blocker
- One slow-moving wave line still visible — caused by macro→mid amplitude coupling at noise zero crossings; no clean fix found yet

### Next Session Goals
- Resolve remaining wave artefact
- Re-enable particles
- Calibrate adaptation system for Berlin's clean air levels