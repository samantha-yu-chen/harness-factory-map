# Architecture Rules

Two sets of rules: how this repository works, and how the platform it specifies must work.

## A. Repository rules

### A1. Markdown front matter is the only graph source

Stages, components, edges, coverage, and cost all derive from front matter. TypeScript must not define a second canonical graph. The drift this rebuild removed came from exactly that: hand-written station and workflow arrays alongside the generated map.

### A2. Generation is a build step

Parsing and validation run before the build. The browser never touches the filesystem.

### A3. Generated content is disposable

`src/generated` can be deleted and rebuilt from `specs/` at any time.

### A4. No backend

No server, database, authentication provider, or cloud resource.

### A5. Safe Markdown

Raw HTML is never rendered. Specification content never executes.

### A6. Stable identifiers

Entity IDs are immutable machine identifiers. Display names may change.

### A7. Explicit relationships

Dependencies come from metadata, never inferred from prose.

### A8. Relative references only

Generated source references are repository-relative. No absolute paths leak into the map.

### A9. One owner per authoritative data object

Enforced by the generator, not by convention. Two components claiming the same `data_owned` entry fails generation.

### A10. Coverage gaps are reported, not fatal

An unknown `reference_map` claim is a typo and fails the build. An unclaimed reference element is a genuine gap and is reported in the map. Hiding gaps behind a build failure creates the wrong incentive.

### A11. Every cost carries a driver

A monthly range without a stated volume assumption is not reviewable. The schema requires the driver.

## B. Platform design rules

These are represented throughout the map and should govern every specification.

### B1. The control plane owns execution state

Agents report results and recommend transitions. They do not authoritatively mutate workflow state.

### B2. Agent output is untrusted

Schema validation, policy checks, deterministic checks, then human review sized to risk.

### B3. Permission is scoped and temporary

Bounded by task, resource, operation, and time. No agent holds a standing credential. Token TTL is the real containment guarantee, because revocation across a distributed system is best-effort.

### B4. Policy and knowledge are different

A retrieved document *describes* a control. The policy engine *enforces* one, from versioned structured rules. Merging them lets an agent be argued out of a control by a well-phrased prompt.

### B5. Every side effect is attributable

Traceable to request, contract, decision, permission grant, execution, and audit record.

### B6. Failure behaviour is part of the contract

Timeout, retry, duplicate, cancellation, and unavailable-dependency behaviour are specified, not discovered.

### B7. Deterministic checks precede expensive reasoning

Cheaper, faster, reproducible. A model judge is for criteria that genuinely need one.

### B8. Human approval is subject-specific

An approval identifies exactly what was approved: scope, plan, execution, artifact, release, or exception.

### B9. Learning is observational

The platform collects evidence and proposes improvements. It never autonomously changes policy, permissions, prompts, workflow, or model routing. A system that rewrites its own guardrails from its own outcome data will eventually optimise them away, because the fastest route to a good outcome score is usually a wider permission.

### B10. Gates fail closed

Every control — policy, budget, audit, identity, evaluation — denies or halts when it cannot evaluate its condition. Availability of these components is therefore a ceiling on platform availability, and that is the intended trade. A platform that degrades to permissive is least controlled exactly when it is least healthy.

### B11. Suspension is machine-triggered, resumption is human

Anything that can switch itself back on is not a control.

### B12. Incomplete measurement means at-limit

Missing cost telemetry is treated as budget exhausted, never as zero spend. Telemetry gaps correlate with load, and load correlates with spend.
