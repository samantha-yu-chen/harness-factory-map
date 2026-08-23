# Historical 3D-prototype brief

> **Superseded for current work.** Claude must read `AGENTS.md` and
> `CURRENT-DIRECTION.md` first. This file records an older presentation brief;
> it does not authorise rebuilding the current specification map as a 3D Agent
> Factory or extending that ontology.

## Mission

Build a local interactive 3D prototype that visually explains an enterprise Harness Agent Factory.

This is a presentation simulation, not a production harness and not a production-grade application.

## Primary outcome

A user can:

- open the app locally
- rotate and zoom an isometric 3D factory
- click stations to read Markdown specifications
- start a simulated ticket
- watch a robot collect and move the ticket
- pause, step through, and reset the workflow

## Priorities

1. Visual clarity
2. Interactivity
3. Smooth robot movement
4. Clear workflow storytelling
5. Clickable specifications
6. Simple maintainable code

## Do

- Use React, TypeScript, Vite, React Three Fiber, and Drei.
- Use basic geometry instead of external models.
- Use predefined station coordinates and waypoints.
- Keep the simulation deterministic.
- Keep Markdown as the descriptive content source.
- Optimise for a laptop demonstration.
- Use bright, game-like colours.
- Keep implementation small.

## Do not

- Build a backend.
- Connect real agents or external services.
- Implement production orchestration.
- Add authentication or a database.
- Add PWA or native-mobile support.
- Add physics or pathfinding.
- Add Blender or downloaded model dependencies.
- Add extensive tests.
- Add production-grade security infrastructure.
- Over-engineer abstractions.
- Spend time making the architecture schema comprehensive.

## Completion criteria

The task is complete when:

- the app starts locally
- the 3D factory renders
- camera rotation and zoom work
- stations are clickable
- Markdown details open
- one robot carries one ticket through the happy-path workflow
- Start, Pause, Next Step, and Reset work
- the simulation ends at Delivery
- a visible simulation disclaimer is present
- the production build succeeds

Only run the checks required to confirm the app builds and launches.
