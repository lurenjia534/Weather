# Gemini 3 Weather Card

An immersive, English-first weather capsule inspired by the Gemini 3 LLM. It blends a 3D scene, cinematic gradients, and a generative audio engine that shifts with each weather mode.

## Features
- Interactive card with mouse parallax and animated weather switching (sunny, rainy, snowy, windy)
- Three.js scene via `@react-three/fiber` and `@react-three/drei` with volumetric effects and custom particle systems for rain and snow
- Generative ambient music built with Tone.js that adapts scales, ambience, and sound effects to the selected weather
- Lightweight global state with Zustand to sync UI, scene, and audio toggles
- Tailwind CSS v4 utility styling and Geist font via `next/font`

## Tech Stack
- Next.js 16 (App Router) + React 19
- Three.js + @react-three/postprocessing for bloom, god rays, chromatic aberration, and vignette
- Tone.js for audio graph and scheduling
- Zustand for client state
- Biome for linting/formatting

## Getting Started
Install dependencies (Node 18+ recommended):
```bash
npm install
```

Run the dev server:
```bash
npm run dev
```
Then open http://localhost:3000. Click the start overlay once to enable audio (required by browsers).

## Scripts
- `npm run dev` – start the Next.js dev server
- `npm run build` – production build
- `npm run start` – start the built app
- `npm run lint` – Biome checks
- `npm run format` – Biome formatting

## Project Structure
- `src/app/page.tsx` – main UI shell with weather controls and layout
- `src/components/Scene.tsx` – 3D weather scene (clouds, particles, post-processing)
- `src/components/AudioEngine.tsx` – Tone.js graph and weather-aware generative loop
- `src/store/weatherStore.ts` – Zustand store for weather/mute/start state
- `src/app/globals.css` – Tailwind v4 base and theme tokens

## Notes
- Audio is muted until you click the overlay to comply with autoplay policies; use the in-card mute button to silence after starting.
- Tailwind v4 uses the new `@import "tailwindcss"` and `@theme inline` syntax—no separate config is required beyond `postcss.config.mjs`.
