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
description: The consolidated running-cost picture for the platform, and the levers that actually move it.
exec_summary: What this costs to run each month, what drives the number, and the three decisions that change it most.
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
reference_map: []
responsibilities:
  - State the assumed volume and the resulting monthly range
  - Attribute cost to components so trade-offs are visible
  - Name the levers that actually move the total
owns:
  - The cost assumptions and their volume driver
does_not_own:
  - Actual spend, which observability measures
  - Budget ceilings, which governance sets
inputs:
  - Per-component cost envelopes declared in each specification
outputs:
  - A monthly range, a per-task model cost range, and a per-wave rollup
permissions: []
restrictions:
  - These are planning estimates at a stated volume, not quotes or commitments
failure_behaviour:
  - An estimate without a stated volume assumption is not usable and should be rejected in review
open_questions:
  - Which region, and does data residency force a more expensive service tier for any component?
  - Is the enterprise Azure agreement's discount applicable, and at what commitment level?
---

# Cost Model

## The assumption everything rests on

**500 tasks per month, one non-production environment, single region, ten knowledge domains at roughly 50 GB.**

Every number in this map is per-component, at that volume. Change the volume and the infrastructure lines move slowly while the model line moves linearly — which is the single most important property of this cost shape.

The generated map rolls these up automatically from each component's declared envelope. If a component's cost is missing, the rollup is wrong and visibly so, which is preferable to a confident total nobody can decompose.

## The shape of the bill

| Layer | Monthly range | Behaviour |
| --- | --- | --- |
| Infrastructure (all 26 components) | Roughly $640 – $1,740 | Mostly fixed; grows in steps, not smoothly |
| Model inference (500 tasks) | Roughly $900 – $6,400 | Linear in task volume and task complexity |
| Reviewer time (0.5–1 FTE) | Not on the cloud bill | The real constraint on throughput |

**Model inference is between one and four times the entire infrastructure bill.** Every optimisation instinct that reaches for container sizing is aimed at the smaller number.

## The four largest infrastructure lines

| Service | Component | Range | Note |
| --- | --- | --- | --- |
| Azure AI Search | retrieval-service | $75 – $245 | Basic tier serves the MVP corpus. The jump to S1 is driven by index size, not query volume — check corpus growth before assuming it. |
| Azure Monitor / Log Analytics | observability | $70 – $180 | The easiest line to accidentally triple, by logging agent transcripts. Set a daily cap on day one. |
| Azure Container Apps Jobs | agent-runtime, sandbox | $70 – $200 | Scales with agent step volume. |
| Azure Front Door | request-intake | $35 – $70 | Fixed base charge. Removable entirely if the platform never faces the public internet — confirm with the network team before committing. |

## The three levers that actually work

**1. Routing discipline (stage 4).** Every request the classifier sends to the ticket system avoids the full agent-run cost — roughly two orders of magnitude. This is the largest lever in the platform and it costs nothing but rubric calibration. A ticket-route share falling quarter over quarter is a cost problem disguised as an adoption success.

**2. Step-appropriate model tiering (agent-package).** Understand and Plan justify a strong model. Research summarisation and artifact formatting usually do not. Using one strong model for all four steps is the expensive default chosen by omission, and it can double the per-task model line on its own.

**3. Sharper success criteria (stage 3).** Vague criteria force `evaluation-service` to use a model judge where a deterministic check would do. Better intake interviews reduce judge spend directly — one of the rare places where quality and cost move the same way.

Container sizing is not on this list. Neither is region choice, at this volume.

## What is deliberately not costed

- **Production environment.** This is one non-production environment. A production tier with redundancy and higher SLAs is roughly two to three times this, and is a wave 2 conversation.
- **Entra ID licensing.** Assumed already owned. If this platform newly requires Conditional Access or Privileged Identity Management, that is a separate licence discussion with the CISO.
- **The service desk.** Already licensed; `ticket-bridge` uses it, it is not a new cost.
- **Engineering build cost.** People, not cloud. Roughly a day of engineering per tool operation is the one build estimate worth carrying into the funding conversation, because it is the number that surprises people.

## How to challenge these numbers

Every figure sits in its component's front matter with a stated driver and a note. Open the component, read the driver, and check whether the assumed volume matches your expectation. A number without a driver is not defensible, and the schema will not accept one.
