# Build Brief — Enterprise Agent Factory

This is what the engineering harness team picks up. It sequences the twenty-six components in `specs/components/` into four delivery waves and states what "done" means for each.

The component specifications are authoritative for behaviour. This document is authoritative for order.

## Before wave 1 starts

Four decisions are needed. Each blocks work rather than merely informing it.

| Decision | Owner | Blocks |
| --- | --- | --- |
| Which business unit hosts the first agent team, and who is its named owner | Leadership sponsor | The whole of wave 1 — there is nothing to build without a first customer |
| Which service desk `ticket-bridge` targets, and whether it exposes closure webhooks | Head of Service Management | `ticket-bridge`, and the stage 4 routing rationale |
| Whether the platform faces the public internet | Network / CISO | `request-intake` — Front Door is removable if it does not, which is $35–70/month |
| Whether an agent acting for a requester inherits that person's data access, or a narrower agreed intersection | CISO with each data owner | `identity-access`, `policy-engine`, `retrieval-service` |

The remaining fifty-one open questions are recorded per component under `open_questions` and surface in the executive view. They can be answered during their component's wave.

## Wave 1 — Walking skeleton

**Goal:** one request runs end to end, is reviewed by a human, and is fully audited.

Twelve components. Roughly $385–1,000/month of infrastructure.

| Component | Owner | Risk | Operations |
| --- | --- | --- | --- |
| Identity & Access | platform-security | critical | 3 |
| Audit Log | platform-security | critical | 3 |
| Observability | harness-platform | medium | 2 |
| Request Intake | harness-platform | medium | 3 |
| Task Contract | harness-platform | high | 3 |
| Work Classifier | harness-platform | high | 3 |
| Team Orchestrator | harness-platform | critical | 4 |
| Tool Gateway | platform-security | critical | 3 |
| Sandbox | platform-security | high | 2 |
| Agent Runtime | harness-platform | critical | 2 |
| Human Review Gate | harness-platform | critical | 3 |
| Outcome Delivery | harness-platform | high | 3 |

**Build order within the wave:** identity and audit first — nothing else can be correct without them. Then the sandbox and tool gateway, because they are what makes running an agent acceptable at all. Then orchestrator, contract, classifier. Then runtime, review, delivery.

**What is deliberately absent:** the policy engine. Wave 1 runs with a hardcoded permission envelope per task, denied by default, reviewed by a person. That is honest for a walking skeleton with one team and one business unit, and it stops `policy-engine` being designed before there is any real traffic to shape it.

**Wave 1 is done when:** a request submitted through the portal produces a delivered outcome with its evidence and cost, a reviewer approved it, and the full decision trace is retrievable from the audit log — with no manual step between.

## Wave 2 — Governed and grounded

**Goal:** the platform can be trusted with more than one team and more than one kind of work.

Seven components. Roughly $185–570/month.

| Component | Owner | Risk | Operations |
| --- | --- | --- | --- |
| Policy Engine | platform-security | critical | 3 |
| Knowledge Ingestion | data-platform | high | 3 |
| Retrieval Service | data-platform | high | 2 |
| Evaluation Service | harness-platform | high | 3 |
| Agent Package | harness-platform | high | 3 |
| Budget Guard | harness-platform | high | 3 |
| Ticket Bridge | harness-platform | low | 3 |

**Sequence note:** `budget-guard` should land early in this wave, not late. Retrofitting a budget control after the first surprise invoice is a much harder conversation than building it while volume is still small.

**Sequence note:** `knowledge-ingestion` cannot start until at least two of the ten knowledge domains have a named data owner. Building an ingestion pipeline for unowned content produces a search index over a shared drive.

**Wave 2 is done when:** an agent grounds its work in cited enterprise knowledge, every tool call is authorised by versioned rules, a run that exceeds its envelope stops and delivers honestly, and simple work is routed to the service desk instead of an agent.

## Wave 3 — Reuse and governance

**Goal:** the platform is governable at scale rather than by memory.

Four components. Roughly $40–115/month.

| Component | Owner | Risk | Operations |
| --- | --- | --- | --- |
| Governance Board | governance-office | critical | 3 |
| Agent Team Registry | harness-platform | high | 4 |
| Solution & Agent Team Registry | harness-platform | medium | 3 |
| Clarification Agent | harness-platform | high | 3 |

Through waves 1 and 2, stage 5 governance runs as a scheduled human review — a template, a meeting, a written decision, filed. That is a legitimate implementation and the right one before proposal volume justifies tooling. This wave systematises it.

`clarification-agent` sits here rather than in wave 1 because the nine-question interview can be a form until request volume makes the form's abandonment rate a real cost.

**Wave 3 is done when:** a dedicated team can only exist against a recorded leadership decision with a named owner, a budget ceiling, and a review date — and the reuse check routes a matching request to that team without a new intake.

## Wave 4 — Learning loop

**Goal:** the platform improves per run instead of only growing.

Three components. Roughly $30–95/month.

| Component | Owner | Risk | Operations |
| --- | --- | --- | --- |
| Outcome Ledger | harness-platform | medium | 3 |
| Improvement Proposal | harness-platform | medium | 3 |
| Team Lifecycle | harness-platform | medium | 3 |

There is nothing to measure before there are outcomes, which is why this wave is last. It should not slip past that — `team-lifecycle` is what stops the register filling with teams nobody remembers approving, and that decay starts the quarter after wave 3 ships.

**Wave 4 is done when:** every registered team has a scheduled review it cannot silently miss, the six platform metrics are published, and an improvement to a prompt or a rubric can be proposed from evidence and approved by a person.

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

## What is not in scope

Stated so nobody rediscovers it mid-build:

- **Autonomous improvement.** The learning loop proposes; humans approve.
- **Multi-region and disaster recovery.** Single region. Recovery is rebuild-from-specification.
- **External-facing agents.** Employees only.
- **Generic tools.** No shell, no arbitrary HTTP. Every tool is typed and reviewed, at roughly a day of engineering each. That is the real unit cost of a capability.
- **Fine-tuning.** Prompt and retrieval engineering first. Revisit only against a measured ceiling.
- **A production environment.** The cost model is one non-production environment. Production with redundancy is roughly two to three times it.
