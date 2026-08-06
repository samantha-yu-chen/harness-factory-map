# Enterprise Agent Factory — specification map

A local application that turns Markdown specifications into an inspectable map of an enterprise agent platform: one governed path from any employee's request to a delivered outcome, with a named human accountable at every decision point.

It is a specification map. It runs no agents, holds no credentials, and calls no cloud service.

## Run it

```bash
npm install
npm run generate
npm run dev
```

## Two views, one source

**Executive** — the decision flow, the three execution routes and what each costs, what leadership is actually approving, the monthly run cost split between infrastructure and model spend, and every decision still open.

**Engineering** — the eight stages, twenty-six components, each component's API contract with a named caller and worker per operation, its boundary and authoritative data, its failure behaviour and SLO, its Azure placement and cost, plus the build waves, the coverage check, and the deduplicated service rollup.

Both read the same generated map, so they cannot drift apart.

## What is in the map

| | |
| --- | --- |
| Stages | 8 — an always-on platform band plus the seven-stage flow |
| Components | 26, each with a contract, an owner, a failure behaviour, and a cost |
| Delivery waves | 4 — waves 1 and 2 are the MVP |
| Reference coverage | Every element of the target workflow is claimed by a specified component |

## How it stays honest

The generator validates every specification and fails the build on an invalid schema, an unresolved relationship, two components claiming the same authoritative data object, or a claim on a reference-workflow element that no stage declares.

It reports — rather than fails on — a coverage gap, because a genuine gap between the target workflow and the specified components is something leadership needs to see.

## Layout

```
specs/stages/       the eight stages of the target workflow
specs/components/   the twenty-six components, with contracts and costs
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
