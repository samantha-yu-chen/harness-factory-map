# Harness Agent Factory

Harness Agent Factory is a local, interactive 3D presentation prototype. It shows a colourful isometric factory floor where a friendly robot carries one simulated ticket through the happy-path stations.

It is a visual simulation only. It does not execute agents, call external services, or operate a production harness.

## Run locally

```bash
npm install
npm run generate
npm run dev
```

Then open the local Vite URL shown in the terminal. Drag the scene to orbit, scroll to zoom, and click a station to inspect its Markdown specification.

## Prototype controls

- `Start Simulation` begins the deterministic ticket tour.
- `Pause` pauses the robot at its current station.
- `Next Step` advances one station.
- `Reset` returns the factory to its idle state.

The scene uses basic Three.js geometry and predefined station coordinates. Markdown under `specs/` remains the descriptive source for station details.
