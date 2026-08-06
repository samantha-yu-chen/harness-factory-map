---
id: stage-2-system-check
name: 2 · System check
entity_type: workflow-step
plane: governance
scope: next
status: specified
risk: medium
actor_type: deterministic-system
automation_level: agent-with-review
data_classification: internal
description: Determines whether an approved solution or a registered agent team already covers this request before any new work is proposed.
exec_summary: Before building anything new, check whether we already built it — and if we did, send the request straight there.
business_value: Reuse is the only lever that stops an agent platform growing a long tail of near-duplicate teams that each cost money to run and review.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 2
loop: factory
tags:
  - reuse
  - registry
depends_on: []
connects_to:
  - stage-3-problem-intake
  - stage-6-execution
reference_elements:
  - Does a suitable solution or agent team already exist?
  - YES — route to existing solution
  - NO — continue to problem intake
  - Go to Harness Agent Team
responsibilities:
  - Search the catalogue of approved solutions and registered agent teams
  - Return candidate matches with evidence and a confidence score
  - Route a confident match to its existing owner
owns:
  - The reuse decision record
does_not_own:
  - The registry entries themselves
  - Approval to create anything new
inputs:
  - A normalised request record
outputs:
  - A reuse decision with candidates, evidence, and confidence
permissions:
  - Read the solution and agent-team catalogue
restrictions:
  - A match is a recommendation, never an approval
  - Cannot register, modify, or retire a solution
failure_behaviour:
  - An unavailable registry routes forward to intake rather than blocking the requester
  - Low confidence routes forward to intake and records why
open_questions:
  - What confidence threshold makes an automatic reuse route safe rather than merely convenient?
---

# Stage 2 · System check

## Why this stage exists at all

Every agent platform that skips this stage converges on the same failure: forty agent teams, eleven of which summarise contracts, none of which knows about the other ten. Reuse has to be checked before intake, because once a requester has been through a clarification interview they are psychologically committed to a new build.

## Three outcomes, not two

The diagram shows YES and NO. In practice there is a third:

- **Confident match** — route to the existing owner. The requester never sees stage 3.
- **Weak match** — continue to intake, but carry the candidates forward so the clarification conversation can ask "is this the same as X?".
- **No match** — continue to intake clean.

Collapsing weak-match into NO throws away the most useful signal the registry produces. Collapsing it into YES produces angry requesters routed to a team that cannot help them.

## Boundary

This stage searches and recommends. It never registers, approves, or spins anything up. The registry it reads is written by stage 5, which is what keeps the reuse loop honest: only governed teams become reusable, and reuse can only point at things governance already approved.
