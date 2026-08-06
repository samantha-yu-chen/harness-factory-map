# AGENTS.md

## What this repository is

A local specification map for an enterprise agent factory. It reads Markdown under `specs/`, validates it, and renders it for two audiences: a leadership team deciding whether to fund the platform, and an engineering harness team building it.

It is a specification, not a system. Nothing here executes an agent, holds a credential, or calls a cloud service.

## What the deliverable is

The rendered map, not the Markdown. The Markdown files are working material — editable, arguable, expected to change. What the harness team picks up is the validated, cross-checked map: 26 components across 8 stages, each with a boundary, an API contract, a named accountable human, a failure behaviour, and a cost.

A change to `specs/` that does not survive `npm run generate` has not happened.

## Do

- Keep the generator the single source. Nodes, edges, stages, coverage, and cost all derive from front matter.
- Give every component an `api_contract` where each operation names exactly one `caller` and one `worker`.
- Give every component a `cost` envelope with a stated volume `driver`. A number without a driver is not defensible.
- Give every component a `human_accountable` role, not a team alias.
- Record honest unknowns in `open_questions`. They surface in the executive view; hiding them does not make them go away.
- Claim reference-diagram elements with `reference_map` so coverage stays measurable.
- Write specification bodies for someone who has to build the thing. State the failure mode being designed against, not just the happy path.

## Do not

- Do not add a second source of truth in TypeScript. The previous drift came from hand-written station and workflow arrays alongside the generated map.
- Do not add a backend, a database, authentication, or any cloud resource.
- Do not render raw HTML from specifications.
- Do not merge governance approval with the runtime policy engine, the system check with problem intake, or the audit log with the learning loop. Those three merges are the drift this rebuild removed.
- Do not write a cost estimate without its assumed volume.
- Do not let a component own an authoritative data object another component already owns. The generator rejects it.

## What the generator refuses

Generation fails on an invalid schema, an unresolved relationship, a duplicate `data_owned` entry, or a `reference_map` claim naming an element no stage declares.

It reports rather than fails on a coverage gap — an element of the reference workflow that no component claims. Gaps are information the leadership team needs, not build errors.

## Commands

```bash
npm run generate   # validate specs and rebuild src/generated
npm run dev        # local server
npm run check      # generate, lint, typecheck, test, build
```
