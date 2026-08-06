# Enterprise Agent Factory — specification map

A local application that turns Markdown specifications into an inspectable map of an enterprise agent platform: a governed path from any employee's request to an agent that is built, published, and then run — repeatedly, by the people who need it — with a named human accountable at every decision point.

It is a specification map. It runs no agents, holds no credentials, and calls no cloud service.

## Run it

```bash
npm install
npm run generate
npm run dev
```

## Two views, one source

**Executive** — the two loops and the handoff between them, the three execution routes and what each costs, what leadership is actually approving, the monthly run cost split three ways, what adoption does to that number, and every decision still open.

**Engineering** — the thirteen stages, twenty-nine components, each component's API contract with a named caller and worker per operation, its boundary and authoritative data, its failure behaviour and SLO, its Azure placement and cost, plus the build waves, the coverage check, and the deduplicated service rollup.

Both read the same generated map, so they cannot drift apart.

## What is in the map

| | |
| --- | --- |
| Loops | 2 — a factory loop that runs once per solution, a runtime loop that runs on every invocation |
| Stages | 13 — an always-on platform band, six factory stages, five runtime stages, and the learning band |
| Components | 29, each with a contract, an owner, a failure behaviour, and a cost |
| Delivery waves | 4 — wave 3 is when an employee can serve themselves |
| Reference coverage | Every element of the target workflow is claimed by a specified component |

## How it stays honest

The generator validates every specification and fails the build on an invalid schema, an unresolved relationship, two components claiming the same authoritative data object, or a claim on a reference-workflow element that no stage declares.

It reports — rather than fails on — a coverage gap, because a genuine gap between the target workflow and the specified components is something leadership needs to see.

The reference diagram covers the factory only. The runtime stages are this map's extension beyond it, declare no reference elements, and the generator rejects any reference claim they make — so the boundary between "what the diagram said" and "what we added" stays visible rather than blurring.

## Layout

```
specs/stages/       the thirteen stages across both loops
specs/components/   the twenty-nine components, with contracts and costs
specs/system/       system overview, cost model, and this application
schemas/            the front-matter contract every specification must meet
scripts/            the generator and its validation
src/                the two views
```

## Commands

```bash
npm run generate    # validate specs and rebuild src/generated
npm run lint
npm run typecheck
npm test
npm run build
npm run check       # all of the above
```
