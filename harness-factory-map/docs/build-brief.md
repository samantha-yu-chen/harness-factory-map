# Build Brief — Enterprise Agent Factory

This is what the engineering harness team picks up. It sequences the twenty-nine components in `specs/components/` into four delivery waves and states what "done" means for each.

The platform has two loops. Waves 1 and 2 build the **factory** — the path from a request to an agent that is proven and approved. Wave 3 opens the **runtime loop**, where a published agent is invoked by the people who need it. Wave 4 lets it run unattended and closes the learning loop.

The component specifications are authoritative for behaviour. This document is authoritative for order and placement.

## Where the work lands

Three repositories, not twenty-nine and not one. Each split names the forcing function that pays for it; everything else is a module in the host.

| Repository | Why separate | Modules | Boundaries | Waves |
| --- | --- | --- | --- | --- |
| `harness-execution` | **FF3** fault isolation — this is the only unit that runs untrusted code and touches enterprise systems. A crash here must not reach anything else. FF1 supports it: a genuinely different compute profile. | `orchestration`, `runtime`, `egress`, `isolation` | 5 | 1–2 |
| `harness-control` | **FF4** regulatory boundary — the evidence trail carries retention and immutability obligations the rest of the platform does not, and the permission model is what a security review actually reads. It calls nobody, so its availability is a floor rather than a function. | `identity`, `policy`, `audit` | 3 | 1–2 |
| `harness-platform-core` | **Host.** No forcing function applies to any of the six modules inside it. Splitting them would turn roughly ninety-six in-process calls into versioned network contracts, and buy nothing this year. | `intake`, `knowledge`, `governance`, `publication`, `assurance`, `learning` | 21 | 1–4 |

### How much each wave costs each team

| Wave | `harness-execution` | `harness-control` | `harness-platform-core` |
| --- | --- | --- | --- |
| 1 | 4 | 2 | 6 |
| 2 | 1 | 1 | 5 |
| 3 | — | — | 6 |
| 4 | — | — | 4 |

Waves 1 and 2 are the only ones where three teams work in parallel. From wave 3 the execution and control repositories are in maintenance, and everything new lands in the host. Staff accordingly: the split is expensive at the start and cheap afterwards, which is the opposite of how it is usually budgeted.

### What crosses a repository boundary

81 relationships cross; 92 stay inside one repository and cost nothing to change.

| From | To | Contracts |
| --- | --- | --- |
| `harness-platform-core` | `harness-control` | 31 |
| `harness-execution` | `harness-platform-core` | 15 |
| `harness-platform-core` | `harness-execution` | 15 |
| `harness-execution` | `harness-control` | 9 |
| `harness-control` | `harness-platform-core` | 8 |
| `harness-control` | `harness-execution` | 3 |

Every one is declared on both sides: the provider publishes the operation in `api_contract`, the consumer names it in `consumes`, and the generator fails if a provider stops publishing something a consumer still names. That check is the whole reason a three-way split is affordable — inside a repository the compiler catches a broken call, and across repositories nothing else does.

The concentration on `harness-control` is expected and is not a smell: 22 of those 31 are the same audit-record call, and 5 more are token introspection. One contract, many callers.

### The rule that keeps the split available

No file outside a module directory imports from that module's internals. Every module ships one public port and one test that exercises it only through that port, with collaborators injected. When `knowledge` eventually reaches FF1 on index size, extracting it is a directory move and a transport change rather than an excavation.

## What has to be right the first time

This is a nought-to-one build, and the cheapest way to lose it is to design all twenty-nine boundaries for a scale that does not exist yet. Every operation therefore states what changing it later costs, and only two of the three classes are worth design time now.

| Class | Operations | What it means | Design it now? |
| --- | --- | --- | --- |
| `rewrite` | 4 | Callers would have to be redesigned around a different model. No migration recovers it. | Yes — this is the shortlist |
| `migration` | 32 | Available later, but stored data has to be rewritten or backfilled first. | Yes, at the level of the stored shape |
| `refactor` | 58 | Callers change and nothing stored moves. | **No.** Build the small version |

The four that cannot be recovered:

| Operation | Why it cannot be migrated |
| --- | --- |
| `audit-log` · `POST /v1/audit/records` | A tamper-evident chain is the one store that cannot be rewritten, by definition. Every reader of the record shape is stuck with the first one. |
| `identity-access` · `POST /v1/identity/task-token` | Scope binding is the model every downstream authorisation reads. Moving from task-bound to anything else is not a field change. |
| `outcome-ledger` · `POST /v1/outcomes` | A dimension nobody recorded cannot be backfilled from the dimensions they did. |
| `outcome-ledger` · `POST /v1/runs` | Same reason. Decide what a run is attributed to before the first run, or the first quarter of data answers nothing. |

Everything else is deferrable on purpose. Hardening a refactor-class operation against imagined volume is the more common failure of the two and the more expensive one, because nothing fails — the walking skeleton simply never ships.

### The one overrun the map currently holds

`tool-gateway` commits to 80ms of overhead per tool call. The operations it consumes already promise 280ms across four cross-repository round trips: a policy check at 50ms, a token introspection at 30ms, and an audit append at 200ms.

This is not a transport problem and no encoding fixes it. The moves, in order, are: delete the call, merge two questions into one, move it off the synchronous path, and only then make what remains cheaper. The audit append is the largest line and it is a deliberate trade — B5 and B10 mean an unrecorded decision must not take effect — so closing this is a conversation about the recording contract and the shape of the authorisation call, and it is open.

Full reasoning: `docs/architecture-rules.md` § C.

## Before wave 1 starts

Four decisions are needed. Each blocks work rather than merely informing it.

| Decision | Owner | Blocks |
| --- | --- | --- |
| Which business unit hosts the first agent team, and who is its named owner | Leadership sponsor | The whole of wave 1 — there is nothing to build without a first customer |
| Which service desk `ticket-bridge` targets, and whether it exposes closure webhooks | Head of Service Management | `ticket-bridge`, and the stage 4 routing rationale |
| Whether the platform faces the public internet | Network / CISO | `request-intake` — Front Door is removable if it does not, which is $35–70/month |
| Whether an agent acting for a requester inherits that person's data access, or a narrower agreed intersection | CISO with each data owner | `identity-access`, `policy-engine`, `retrieval-service`, and every runtime authorisation |

The remaining open questions are recorded per component under `open_questions` and surface in the executive view. They can be answered during their component's wave.

## Wave 1 — Walking skeleton

**Goal:** one request runs end to end, is reviewed by a human, and is fully audited.

Twelve components. Roughly $385–1,000/month of infrastructure.

| Component | Lands in | Owner | Risk | Operations |
| --- | --- | --- | --- | --- |
| Identity & Access | `harness-control` · `identity/` | platform-security | critical | 4 |
| Audit Log | `harness-control` · `audit/` | platform-security | critical | 3 |
| Team Orchestrator | `harness-execution` · `orchestration/` | harness-platform | critical | 4 |
| Tool Gateway | `harness-execution` · `egress/` | platform-security | critical | 3 |
| Sandbox | `harness-execution` · `isolation/` | platform-security | high | 2 |
| Agent Runtime | `harness-execution` · `runtime/` | harness-platform | critical | 2 |
| Observability | `harness-platform-core` · `assurance/` | harness-platform | medium | 2 |
| Request Intake | `harness-platform-core` · `intake/` | harness-platform | medium | 3 |
| Task Contract | `harness-platform-core` · `intake/` | harness-platform | high | 3 |
| Work Classifier | `harness-platform-core` · `intake/` | harness-platform | high | 3 |
| Human Review Gate | `harness-platform-core` · `assurance/` | harness-platform | critical | 3 |
| Outcome Delivery | `harness-platform-core` · `assurance/` | harness-platform | high | 3 |

**Build order within the wave:** identity and audit first — nothing else can be correct without them. Then the sandbox and tool gateway, because they are what makes running an agent acceptable at all. Then orchestrator, contract, classifier. Then runtime, review, delivery.

**What is deliberately absent:** the policy engine. Wave 1 runs with a hardcoded permission envelope per task, denied by default, reviewed by a person. That is honest for a walking skeleton with one team and one business unit, and it stops `policy-engine` being designed before there is any real traffic to shape it.

**Wave 1 is done when:** a request submitted through the portal produces a delivered outcome with its evidence and cost, a reviewer approved it, and the full decision trace is retrievable from the audit log — with no manual step between.

## Wave 2 — Governed and grounded

**Goal:** the platform can be trusted with more than one team and more than one kind of work.

Seven components. Roughly $185–570/month.

| Component | Lands in | Owner | Risk | Operations |
| --- | --- | --- | --- | --- |
| Policy Engine | `harness-control` · `policy/` | platform-security | critical | 4 |
| Agent Package | `harness-execution` · `runtime/` | harness-platform | high | 3 |
| Budget Guard | `harness-platform-core` · `governance/` | harness-platform | high | 3 |
| Knowledge Ingestion | `harness-platform-core` · `knowledge/` | data-platform | high | 3 |
| Retrieval Service | `harness-platform-core` · `knowledge/` | data-platform | high | 2 |
| Evaluation Service | `harness-platform-core` · `assurance/` | harness-platform | high | 3 |
| Ticket Bridge | `harness-platform-core` · `intake/` | harness-platform | low | 3 |

**Sequence note:** `budget-guard` should land early in this wave, not late. Retrofitting a budget control after the first surprise invoice is a much harder conversation than building it while volume is still small.

**Sequence note:** `knowledge-ingestion` cannot start until at least two of the ten knowledge domains have a named data owner. Building an ingestion pipeline for unowned content produces a search index over a shared drive.

**Wave 2 is done when:** an agent grounds its work in cited enterprise knowledge, every tool call is authorised by versioned rules, a run that exceeds its envelope stops and delivers honestly, and simple work is routed to the service desk instead of an agent.

## Wave 3 — Publish and operate

**Goal:** an employee gets work done without an engineer being involved. This is the wave where the platform stops being a project.

Six components. Roughly $80–225/month of infrastructure.

All six land in `harness-platform-core`. From this wave on, the execution and control repositories are in maintenance.

| Component | Module | Owner | Risk | Operations |
| --- | --- | --- | --- | --- |
| Governance Board | `governance/` | governance-office | critical | 3 |
| Agent Team Registry | `governance/` | harness-platform | high | 4 |
| Agent Deployment | `publication/` | harness-platform | critical | 4 |
| Agent Catalogue | `publication/` | harness-platform | high | 3 |
| Solution & Agent Team Registry | `intake/` | harness-platform | medium | 3 |
| Clarification Agent | `intake/` | harness-platform | high | 3 |

**Build order within the wave:** governance and the registry first — nothing may be published that leadership has not approved. Then `agent-deployment`, which is the component that carries the real weight here: it binds a package version to a business unit with an envelope, a ceiling, a risk tier, and a health state. Then the catalogue on top of it. `clarification-agent` last, and only because the nine-question interview can remain a form until abandonment rate becomes a real cost.

**Keep `agent-deployment` and `agent-team-registry` separate.** They look like one record and are not. The registry answers "may this team exist" and changes at governance pace. The deployment answers "which version is live, where, right now" and changes weekly. Merging them is the specific mistake that makes a kill switch stop working, because the thing you need to switch off is the deployment.

Through waves 1 and 2, stage 5 governance runs as a scheduled human review — a template, a meeting, a written decision, filed. That is the right implementation before proposal volume justifies tooling. This wave systematises it.

**Wave 3 is done when:** an employee can open a catalogue, see what an agent does and what a run costs, run it themselves, and get a reviewed outcome back — with the run authorised against the deployment envelope, attributed to their business unit, and the deployment able to suspend itself on cost or health.

## Wave 4 — Unattended and learning

**Goal:** the work happens without anyone starting it, and the platform improves per run instead of only growing.

Four components. Roughly $40–120/month.

All four land in `harness-platform-core`.

| Component | Module | Owner | Risk | Operations |
| --- | --- | --- | --- | --- |
| Schedule Runner | `publication/` | harness-platform | high | 3 |
| Outcome Ledger | `learning/` | harness-platform | medium | 5 |
| Improvement Proposal | `learning/` | harness-platform | medium | 3 |
| Team Lifecycle | `learning/` | harness-platform | medium | 3 |

`schedule-runner` is deliberately last among the runtime components. An attended run has a human already looking at the result — the cheapest oversight the platform will ever have — and scheduling removes it. Before it is safe you need health thresholds calibrated against real outcomes and automatic suspension that has been seen to work, and both come from running attended traffic first.

There is nothing to measure before there are outcomes, which is why the learning components sit here too. That should not slip — `team-lifecycle` is what stops the register filling with teams nobody remembers approving, and that decay starts the quarter after wave 3 ships.

**Wave 4 is done when:** a schedule fires an agent unattended through the same door a person uses, a missed window alarms rather than passing silently, every registered team has a review it cannot silently miss, and an improvement to a prompt or a rubric can be proposed from evidence and approved by a person.

## Definition of done, per component

A component is done when all of the following hold. The generated implementation brief (available from each component's drawer) lists these as a checklist with the component's own specifics filled in.

1. Every operation in its `api_contract` is implemented with the stated idempotency, timeout, and auth behaviour.
2. Every entry in `restrictions` is enforced and covered by a test.
3. Every entry in `failure_behaviour` is observable and covered by a test.
4. Each fail-closed path has two tests: one that goes red if the fail-closed line is removed, and one that feeds an unevaluable input and asserts refusal.
5. The component owns exactly the objects in `data_owned` and no others.
6. Its `human_accountable` role is named in the runbook, not just in the specification.
7. Its telemetry lets `observability` report per-task cost for work it participates in.
8. Its `open_questions` are answered, or explicitly re-deferred with a reason.
9. It lives in the module named in its specification, exposes one public port, and ships a seam test that exercises only that port with collaborators injected.
10. Every entry in its `consumes` is called through the provider's published operation — not a shared table, not a copy of the provider's types.

## What is not in scope

Stated so nobody rediscovers it mid-build:

- **Autonomous improvement.** The learning loop proposes; humans approve.
- **Multi-region and disaster recovery.** Single region. Recovery is rebuild-from-specification.
- **External-facing agents.** Employees only.
- **Generic tools.** No shell, no arbitrary HTTP. Every tool is typed and reviewed, at roughly a day of engineering each. That is the real unit cost of a capability.
- **Fine-tuning.** Prompt and retrieval engineering first. Revisit only against a measured ceiling.
- **A production environment.** The cost model is one non-production environment. Production with redundancy is roughly two to three times it.
- **Event-triggered agents.** A published agent is started by a person or a schedule. Firing on a ticket being created or a file landing is a larger permission conversation than either, and it waits until the platform has operating history on both simpler surfaces.
- **Free-text parameters on published agents.** Declared, enumerated inputs only, until there is an answer to what stops a deployment growing scope through its own input fields.
