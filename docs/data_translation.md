
The system will control four organism parameters.
1. particle clusters
2. membrane GlSL shader
3. breathing amplitude
4. light temperature

##THE CORE FORMULA OF THE ORGANISM
The organism response will follow a very simple structure:
organism_response =
pollution_intensity × sensitivity

Where:
pollution_intensity = real environmental data
sensitivity = adaptation state

##THE FOUR DATA CHANNELS
Channel 1 — PM2.5
PM2.5 ↑
cluster density ↑
cluster radius ↑
Channel 2 — PM10
PM10 ↑
large particle appearance ↑
Channel 3 — NO₂
NO2 ↑
shader amplitude ↑
breathing amplitude ↓
Channel 4 — CO
CO ↑
light temperature shifts colder

##ADAPTATION SYSTEM (YOUR CORE IDEA)
The organism adapts to exposure.
Over time:
exposure time ↑
sensitivity ↓
Meaning:
reaction_strength = pollution × sensitivity

##RECOVERY MECHANISM
accumulated memory erases slowly during low pollution stages
So we include slow recovery.
clean air duration ↑
sensitivity slowly ↑
But recovery must be much slower than damage.
Example concept:
damage speed = 1
recovery speed = 0.2
This reinforces the idea of long-term environmental stress.

##VISUAL TRANSLATION SUMMARY
The organism behavior becomes:
PM2.5 → cluster density
PM10 → heavy particle presence
NO2 → membrane wrinkles + breathing
CO → atmospheric light tone
All responses are modulated by:
sensitivity(t)

##DECISION LOCKED: DATA STRATEGY
So the system roadmap becomes:
Phase 1
Real-time pollution + exposure memory
Phase 2 (optional test)
Accelerated historical pollution playback

##EXPERIENCE CHOREOGRAPHY
ENTRY
When the viewer opens the scene:
camera inside atmosphere
no dramatic reveal
no cinematic intro
The organism already exists.
It feels like stepping into a living environment.

##INTERACTION
We keep interaction minimal.
Viewer can:
rotate camera
look around
But they cannot control the organism.
The organism responds only to:
environmental pollution
exposure memory