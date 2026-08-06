---
id: cost-model
name: Cost Model
entity_type: component
plane: governance
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: The consolidated running-cost picture across both loops, and the levers that actually move it.
exec_summary: What this costs to run each month, why building an agent and running one are different bills, and the three decisions that change the total most.
business_value: A platform whose cost cannot be predicted or attributed cannot be approved, and will be switched off after the first surprise invoice.
owner: harness-platform
human_accountable: Financial Controller
tags:
  - cost
  - azure
  - governance
depends_on: []
connects_to:
  - budget-guard
  - work-classifier
  - agent-runtime
  - agent-deployment
  - outcome-ledger
reference_map: []
responsibilities:
  - State the assumed volume for each loop and the resulting monthly range
  - Attribute cost to components so trade-offs are visible
  - Separate the cost of building an agent from the cost of running one
  - Name the levers that actually move the total
owns:
  - The cost assumptions and their volume drivers
does_not_own:
  - Actual spend, which observability measures
  - Budget ceilings, which governance sets per deployment
inputs:
  - Per-component cost envelopes declared in each specification
outputs:
  - A monthly range per loop, a per-build and per-run model cost, and a per-wave rollup
permissions: []
restrictions:
  - These are planning estimates at a stated volume, not quotes or commitments
failure_behaviour:
  - An estimate without a stated volume assumption is not usable and should be rejected in review
open_questions:
  - "Which region, and does data residency force a more expensive service tier for any component?"
  - "Is the enterprise Azure agreement's discount applicable, and at what commitment level?"
  - "What per-deployment monthly ceiling is the default before a business unit has to argue for more?"
---

# Cost Model

## Two loops, two bills

This is the change that matters most for the funding conversation. The platform has one infrastructure bill and **two different variable costs**, and conflating them produces a number nobody can steer.

| | Factory loop (stages 1–7) | Runtime loop (stages 8–12) |
| --- | --- | --- |
| What it costs money for | Turning a request into a proven agent | A published agent doing its job |
| How often | 5–15 solutions a month | Hundreds to thousands of runs a month |
| Model cost each | $5 – $40 | $0.40 – $4.00 |
| Grows with | How many new problems we take on | How much people actually use what we built |
| Bounded by | Governance throughput | The per-deployment monthly ceiling |

A factory build is expensive because it iterates: clarification, classification, retrieval, several agent passes, evaluation, human review. A runtime run is cheap because all of that has already been decided — the package is frozen, the prompts are cached, the model tier per step is fixed, and the scope is narrow.

**If a published agent's per-run cost is not meaningfully below its factory build cost, it should not have been published.** That is a concrete engineering target, and it is the cleanest test of whether an agent was worth freezing into a package.

## The MVP bill

**Assumption: 8 solutions built per month, 600 published-agent runs per month, one non-production environment, single region, ten knowledge domains at roughly 50 GB.**

| Layer | Monthly range | Behaviour |
| --- | --- | --- |
| Infrastructure (all 29 components) | Roughly $690 – $1,915 | Mostly fixed; grows in steps, not smoothly |
| Factory model spend (8 builds) | Roughly $40 – $320 | Linear in solutions taken on |
| Runtime model spend (600 runs) | Roughly $240 – $2,400 | Linear in adoption |
| **Total** | **Roughly $970 – $4,635** | |
| Reviewer time (0.5–1 FTE) | Not on the cloud bill | The real constraint on throughput |

## What adoption costs

The runtime line is the one that moves, and it moves with success. This is worth showing leadership before it happens rather than after.

| Published-agent runs per month | Runtime model spend | Total platform |
| --- | --- | --- |
| 600 | $240 – $2,400 | $970 – $4,635 |
| 2,000 | $800 – $8,000 | $1,530 – $10,235 |
| 5,000 | $2,000 – $20,000 | $2,730 – $22,235 |

The top-right corner is real, and it is also the corner where the platform is delivering thousands of completed pieces of work a month. The question it raises is not "is this too expensive" but "what is each deployment returning" — which is exactly what `outcome-ledger` reports per deployment, per business unit, per successful run.

**The control that bounds this is the per-deployment monthly ceiling**, not a platform-wide budget. A ceiling per deployment means one team's enthusiasm cannot consume another team's capacity, and an agent that quietly becomes expensive suspends itself instead of appearing on an invoice.

## The four largest infrastructure lines

| Service | Component | Range | Note |
| --- | --- | --- | --- |
| Azure AI Search | retrieval-service | $75 – $245 | Basic tier serves the MVP corpus. The jump to S1 is driven by index size, not query volume — check corpus growth before assuming it. |
| Azure Monitor / Log Analytics | observability | $70 – $180 | The easiest line to accidentally triple, by logging agent transcripts. Set a daily cap on day one. |
| Azure Container Apps Jobs | agent-runtime, sandbox | $70 – $200 | Scales with agent step volume across both loops. |
| Azure Front Door | request-intake | $35 – $70 | Fixed base charge. Removable entirely if the platform never faces the public internet — confirm with the network team before committing. |

## The four levers that actually work

**1. Routing discipline (stage 4).** Every request the classifier sends to the ticket system avoids the full agent-run cost — roughly two orders of magnitude. This is the largest lever in the factory loop and it costs nothing but rubric calibration. A ticket-route share falling quarter over quarter is a cost problem disguised as an adoption success.

**2. Publishing what repeats (stage 6 into stage 8).** Work that recurs and stays in the factory loop is paid for at full price every time. Recognising a repeat and freezing it into a deployment cuts its marginal cost by roughly an order of magnitude. `solution-registry` and `outcome-ledger` exist to make that pattern visible before somebody notices it by hand.

**3. Step-appropriate model tiering (agent-package).** Understand and Plan justify a strong model. Research summarisation and artifact formatting usually do not. Using one strong model for every step is the expensive default chosen by omission, and it can double the model line on its own. This compounds in the runtime loop, where the same choice is paid for on every run.

**4. Sharper success criteria (stage 3).** Vague criteria force `evaluation-service` to use a model judge where a deterministic check would do. Better intake interviews reduce judge spend directly — one of the rare places where quality and cost move the same way.

Container sizing is not on this list. Neither is region choice, at this volume.

## What is deliberately not costed

- **Production environment.** This is one non-production environment. A production tier with redundancy and higher SLAs is roughly two to three times this.
- **Entra ID licensing.** Assumed already owned. If this platform newly requires Conditional Access or Privileged Identity Management, that is a separate licence discussion with the CISO.
- **The service desk.** Already licensed; `ticket-bridge` uses it, it is not a new cost.
- **Reviewer staffing.** A medium-tier deployment running 200 times a month is 200 human reviews. That is a real commitment and it belongs in the governance decision alongside the budget, but it is not a cloud line.
- **Engineering build cost.** People, not cloud. Roughly a day of engineering per tool operation is the one build estimate worth carrying into the funding conversation, because it is the number that surprises people.

## How to challenge these numbers

Every figure sits in its component's front matter with a stated driver and a note. Open the component, read the driver, and check whether the assumed volume matches your expectation. A number without a driver is not defensible, and the schema will not accept one.
