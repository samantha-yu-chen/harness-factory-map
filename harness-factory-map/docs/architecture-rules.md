# Architecture Rules

Three sets of rules: how this repository works, how the platform it specifies must work, and which of those decisions has to be right before the first version ships.

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

### A11. Reuse is declared, never duplicated

A component participating in more than one stage says so with `serves_stages`. Copying a component so each loop has its own is how the two drift apart, and the drift shows up as a production incident rather than a build failure.

### A12. The reference diagram's boundary stays visible

Factory stages declare `reference_elements` and are measured against the diagram. Runtime stages declare none and the generator rejects any they claim. What the diagram specified and what this map added must remain separable, because they carry different levels of external agreement.

### A13. Every cost carries a driver

A monthly range without a stated volume assumption is not reviewable. The schema requires the driver.

### A14. Scheduled work has a stated home

A `build_wave` means somebody is going to write this. They cannot start without knowing which repository it lands in and which directory inside it, so `deployable_unit` and `module` are required alongside the wave and are validated against the unit's declared module list. A wave with no home fails generation.

### A15. A separate repository names its forcing function

A `deployable-unit` specification must state which of FF1–FF5 justifies a process boundary, or declare itself the host. The default is a module in the host, and "we will want to split this one day" is a refactor available later — not a reason to pay for a network contract now.

### A16. Cross-repository calls are declared on both sides

A provider publishes `api_contract`; a consumer names the exact operation in `consumes`. An entry naming an operation the provider does not publish fails generation. Inside one repository the compiler catches a broken call; across repositories nothing does, so the map has to.

### A17. A consumed event has an emitter or an admission

`events_consumed` is checked against every `events_emitted` in the map. A signal that genuinely originates outside the platform goes in `external_events_consumed`, which is an admission rather than a hiding place. This rule found two real breaks the first time it ran.

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

### B13. Approval to exist is not permission to run

Governance approves a capability once. Every individual invocation is authorised on its own against identity, scope, entitlement, and budget. A platform that checks only at approval is correct on day one and progressively wrong from day two, and the drift is invisible because nothing fails.

### B14. Production runs on the machinery it was verified on

A published agent uses the same orchestrator, runtime, gateway, sandbox, and evaluation service the factory proved it against — not equivalent machinery, the same machinery. A separate production engine turns every verification into a claim about a system that no longer exists.

### B15. A deployment is not a registry entry

The registry records that a team may exist, and changes at governance pace. The deployment records which package version is live, in which business unit, under whose ownership, and changes weekly. The thing you switch off is the deployment.

### B16. A module boundary is earned before it becomes a service boundary

Twenty-nine boundaries ship as three repositories, not twenty-nine and not seven. Execution splits on fault isolation, control on the compliance boundary, and the remaining twenty-one stay one host with six modules because none of them clears FF1–FF5.

The measurable reason: the seven-way split by plane leaves 126 relationships crossing a repository boundary against 52 staying inside one. The three-way split inverts that — 81 crossing, 92 inside. Each crossing needs a version, a mock, a timeout policy, and a failure mode; each internal one is a function call. Promoting a module later is a directory move, because every module ships a public port and a seam test.

### B17. One invocation door

Scheduled runs enter through the same endpoint a person's click does. Two entry paths means two places to enforce the input contract, and the less-exercised one would be carrying the unattended traffic — the traffic with nobody watching.

## C. Scale-readiness rules

Nothing in this platform has been built. Everything in section B describes how it must behave; this section is narrower and answers one question: at nought to one, which decisions have to be right the first time so that one to a hundred is a refactor rather than a rewrite.

It deliberately says nothing about cost, volume, or capacity. Those need traffic to model honestly and belong to a later pass. This one is only about which shapes are expensive to change, which is knowable now and gets harder to change every week after the first run lands.

### C1. A port is a signature, not a wire format

A module's public port is a typed function signature. Whether a call across it is an in-process call, JSON over HTTP, or a binary framing is an adapter detail behind that signature, and changing it must not change a single caller.

This is what makes B16 true rather than aspirational: promoting a module to a service is a directory move plus an adapter, because the seam already exists. It is also why this map names no transport anywhere. That choice stays a refactor for as long as the port holds, and a refactor is not a nought-to-one decision.

### C2. A hot path declares its unit of work, its budget, and a count for every call it makes

A component that runs for every step an agent takes says so with `hot_path`: the one thing it does once, and the p95 overhead it commits to for that thing. Every entry in its `consumes` then states `per_action`.

The generator refuses a hot path with an uncounted call, because a budget nobody can add up cannot be checked and will be quietly widened instead of met.

### C3. A per-action operation publishes a latency budget

`frequency: per-action` requires `p95_ms`, and generation fails without it. This is A13 on a different axis: a monthly range with no volume driver is not reviewable, and a hot-path operation with no stated budget is the same omission on the axis that decides whether the platform is usable at all.

The budget is a commitment, not a measurement. It is what callers are entitled to design against, which is precisely why it has to exist before anyone measures anything.

### C4. A budget overrun is closed by removing round trips before making them cheaper

When a hot path commits to more than its budget, the moves are available in this order, and the order is not negotiable:

1. Delete the call.
2. Merge two questions into one call.
3. Move the call off the synchronous path.
4. Make the remaining calls cheaper.

Only the fourth is a transport question, and it is last because it is worth single-digit milliseconds against problems that are usually three-digit. The map currently holds one overrun — `tool-gateway` commits to 80ms of overhead per tool call and the operations it consumes already promise 280ms across four cross-repository round trips. Nothing about that is fixed by an encoding.

The largest single line in it is the audit append, and that is a deliberate trade rather than an oversight: B5 and B10 together mean a decision that has not been recorded must not take effect. Closing this overrun is therefore a conversation about the recording contract and the authorisation call shape, and it is open rather than settled.

### C5. Retrofit cost decides what gets designed now

Every operation states what changing it later costs. `rewrite` means callers would have to be redesigned around a different model. `migration` means stored data has to be rewritten or backfilled. `refactor` means callers change and nothing stored moves.

Only the first two are designed at nought to one. Four operations in this map are `rewrite`, and they are the shortlist for the design attention this platform actually has: the audit append, because a tamper-evident chain is the one store that cannot be migrated by definition; the task token, because scope binding is the model every downstream authorisation reads; and the two ledger writes, because a dimension nobody recorded cannot be backfilled from a dimension nobody recorded.

The other fifty-eight are refactors. Designing one of them for a scale that does not exist is the more common failure of the two, and it is more expensive than under-engineering because it is invisible — nothing fails, the walking skeleton simply never ships.

### C6. This band is settled before a scale model is worth building

Cost, volume, and capacity modelling assume a system whose shape has stopped moving. Doing that work first produces a precise forecast of a design that is about to change, which reads as rigour and is not. The order is: fix what is expensive to change, ship, measure, then model.
