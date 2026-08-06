---
id: agent-factory-system
name: Enterprise Agent Factory
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: human-approves
data_classification: confidential
description: The whole system — one governed path from any employee's request to a delivered outcome, with human accountability at every decision point.
exec_summary: One front door for the whole company, three ways to get work done, and a named person accountable for every decision the system makes.
business_value: Turns ungoverned, invisible AI usage into a measurable capability that leadership can fund, steer, audit, and switch off.
owner: harness-platform
human_accountable: Head of Platform Engineering
tags:
  - system
  - overview
  - fde
depends_on: []
connects_to:
  - request-intake
  - work-classifier
  - governance-board
  - team-orchestrator
  - outcome-ledger
reference_map: []
responsibilities:
  - Accept work from anyone, through the channels they already use
  - Route each request to the cheapest responsible execution path
  - Keep a named human accountable for every decision
  - Deliver outcomes with evidence and disclosed cost
  - Improve on evidence, without changing its own guardrails
owns:
  - The end-to-end governed path
does_not_own:
  - The enterprise systems it acts on
  - The business decisions its outcomes inform
inputs:
  - Employee requests
  - Approved enterprise knowledge
outputs:
  - Delivered outcomes with evidence, cost, and an audit trail
permissions:
  - Operate within the scope leadership has approved, per team
restrictions:
  - No agent widens its own scope, permissions, budget, or lifetime
  - No autonomous change to policy, permissions, prompts, or model routing
  - No decision takes effect that could not be recorded
failure_behaviour:
  - Every control fails closed; the platform stops visibly rather than proceeding unrecorded or unauthorised
  - Every degradation is named to the requester rather than hidden behind a plausible result
open_questions:
  - Which business unit hosts the first dedicated agent team, and who is its named owner?
  - What is the agreed first-year budget envelope, and which of the four waves does it actually cover?
---

# Enterprise Agent Factory

## What this map is

This is the build brief. It is what an engineering harness team picks up to build the platform, and what a leadership team reads to decide whether to fund it.

The Markdown files under `specs/` are the working material — editable, reviewable, argued over. The generated map is the deliverable: a validated, cross-checked view of twenty-nine components across thirteen stages, each with a boundary, a contract, a named accountable human, and a cost.

Nothing here runs. There is no Azure connection, no agent, no credential. The prototype simulates the shape of the system so that the shape can be argued about before it is expensive to change.

## Two loops, and why that distinction is the whole design

The reference diagram covers one of them. It shows a request arriving, being clarified, classified, governed, and executed — ending with an approved agent team and a delivered outcome. That is the **factory loop**, and it runs once per solution.

What it does not show is what happens next. An approved agent team is not a finished piece of work; it is a **capability that then runs, repeatedly, for whoever needs it**. That is the **runtime loop**, and it is where the value is actually collected.

| | Factory loop (stages 1–6) | Runtime loop (stages 8–12) |
| --- | --- | --- |
| Question it answers | Should this exist, and does it work | Do the work, now |
| Runs | Once per solution | Every time someone needs the outcome |
| Started by | A person with a problem | A person with a job to do, or a schedule |
| Governed by | Stage 5 leadership decision | The deployment envelope, checked per run |
| Ends with | A verified, registered, deployed agent | A delivered outcome and a run record |
| Cost each | $5 – $40 | $0.40 – $4.00 |

The two are joined by one handoff: an approved team is bound to a package version, a business unit, an owner, and a budget, and published. From then on a request the deployment already covers **never re-enters the factory** — which is the only reason building an agent pays for itself.

Stage 7, learning, sits outside both and closes both.

## The FDE agent team

The unit of delivery is a **forward-deployed agent team**: a small set of agent roles, deployed against one business unit's work, running a fixed seven-step loop under a named human owner.

Once published, that team is what an employee actually meets. They find it in a catalogue, see what it does and what a run costs, and run it themselves — or it runs on a schedule and the outcome simply arrives. Neither surface requires an engineer, and that is the point.

Two flavours, one loop:

| | Harness Agent Team | Dedicated Agent Team |
| --- | --- | --- |
| Lifetime | Assembled per task, dissolved at close | Registered, versioned, persistent |
| Approval | None; the standing capability | Stage 5, leadership decision |
| Owner | The platform team | A named business owner |
| Budget | Shared platform envelope | Its own monthly ceiling |
| Suits | One-off or complex work | Repeatable, high-value work |
| Reviewed | Per task | Per task, plus a scheduled team review |

They run identical mechanics. A dedicated team is a Harness Agent Team run that proved itself often enough to be worth freezing, not a different architecture. That equivalence is what makes promotion cheap and demotion possible.

## The three routes, and why routing is the product

| Route | Share of demand to aim for | Marginal cost per request |
| --- | --- | --- |
| Ticket system | The majority | Effectively zero |
| Harness Agent Team | A meaningful minority | Full model spend |
| Dedicated Agent Team | A handful, growing slowly | Model spend plus ownership |

The instinct when building an agent platform is to maximise the second and third rows. That instinct is expensive and, at MVP scale, usually wrong.

The platform's value is *choosing correctly*, not agenting maximally. A request that should have been a ticket and instead consumed eleven dollars of model time and forty minutes of reviewer attention is a failure of the platform even though the outcome was fine.

## What leadership is actually approving

Four things, and they are the four criteria in stage 5:

1. **Strategic fit** — this belongs on the roadmap.
2. **Value and ROI** — the annualised value exceeds build plus run cost.
3. **Risk and compliance** — the exposure is understood and bounded.
4. **Resourcing and ownership** — a named person owns it on an ordinary Tuesday in eight months.

The fourth fails more proposals than the other three combined, and it should.

## Deferred by design

These are conscious omissions for the MVP, not oversights. Each is listed so nobody rediscovers it as a surprise:

- **Autonomous improvement.** The learning loop proposes; humans approve. Nothing rewrites its own guardrails.
- **Multi-region and disaster recovery.** Single region. Recovery is rebuild-from-spec, not warm failover.
- **External-facing agents.** Employees only. No customer-facing surface, which removes an entire class of compliance work from wave 1.
- **Generic tools.** No shell, no arbitrary HTTP. Every tool is typed and reviewed, at roughly a day of engineering each.
- **Fine-tuning and custom models.** Prompt and retrieval engineering first. Revisit only when a measured ceiling is hit.
- **Agent-to-agent negotiation across teams.** One orchestrator, one state machine, one accountable path.

## The four delivery waves

| Wave | Theme | Components | What becomes possible |
| --- | --- | --- | --- |
| 1 | Walking skeleton | 12 | One request runs end to end, reviewed and audited |
| 2 | Governed and grounded | 7 | Policy enforcement, cited knowledge, evaluation, budget ceilings |
| 3 | Publish and operate | 6 | Registered teams, live deployments, the self-serve catalogue |
| 4 | Unattended and learning | 4 | Schedules, metrics, improvement proposals, team retirement |

Waves 1 and 2 build the factory. **Wave 3 is when the platform stops being a project and becomes a service** — it is the first wave where an employee can get work done without an engineer being involved. Wave 4 removes the human from the trigger as well, and adds the loop that stops the whole thing decaying.

Self-serve ships a wave before scheduling on purpose. An attended run has a person already looking at the result, which is the cheapest oversight mechanism that exists. Unattended running removes it, and should not be available until the platform has enough operating history to recognise a bad run without being told.

In waves 1 and 2, stage 5 governance runs as a scheduled human review — a template, a meeting, a written decision. That is a legitimate implementation and the right one before proposal volume justifies tooling. The stage is in the map from day one so the decision is never skipped, only performed by hand.

## The rules that hold the whole thing together

1. **The control plane owns execution state.** Agents report and recommend; they do not mutate workflow state.
2. **Agent output is untrusted.** Schema, policy, deterministic checks, then human review sized by risk.
3. **Permission is scoped and temporary.** Bounded by task, resource, operation, and time. No standing agent credentials.
4. **Policy and knowledge are different.** A retrieved document describes a control; the policy engine enforces one.
5. **Every side effect is attributable.** Request, contract, decision, grant, execution, audit record.
6. **Failure behaviour is part of the contract.** Timeout, retry, duplicate, cancellation, unavailable dependency.
7. **Deterministic checks precede expensive reasoning.** Cheaper, faster, reproducible.
8. **Human approval is subject-specific.** An approval names exactly what was approved.
9. **Learning is observational.** Propose, never apply.
10. **One owner per authoritative object.** Enforced by the generator, not by convention.
11. **Approval to exist is not permission to run.** Governance approves a capability; every individual invocation is authorised on its own against identity, scope, entitlement, and budget.
12. **Suspension is machine-triggered, resumption is human.** Anything that can switch itself back on is not a control.
13. **Production reuses the machinery it was verified on.** No separate production engine, because a divergent one turns every verification into a claim about a system that no longer exists.
