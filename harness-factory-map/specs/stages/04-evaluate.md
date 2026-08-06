---
id: stage-4-evaluate
name: 4 · Evaluate & decide
entity_type: workflow-step
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: agent-with-review
data_classification: confidential
description: Scores the contract on risk, complexity, value, and repeatability, then recommends one of three execution routes.
exec_summary: Decides whether this is a ticket, a job for the standing agent team, or a case for asking leadership to fund a dedicated team.
business_value: This is the cost control point. Sending simple work down the expensive path is the single largest avoidable spend in an agent platform.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 4
tags:
  - classification
  - routing
depends_on: []
connects_to:
  - stage-5-governance
  - stage-6-execution
reference_elements:
  - Classify the work (risk, complexity, value, repeatability)
  - Define execution approach
  - Recommend path
  - "Route: log to ticket system (simple / low complexity)"
  - "Route: handle via Harness Agent Team (one-time or complex)"
  - "Route: propose dedicated agent team (repeatable & high value)"
responsibilities:
  - Score the contract on four independent dimensions
  - Recommend exactly one route with a written rationale
  - Hand simple work to the existing ticket system
owns:
  - The routing decision record
does_not_own:
  - Approval of a dedicated team
  - Execution of the work
inputs:
  - A counter-signed task contract
outputs:
  - Four dimension scores, one recommended route, and a rationale
permissions:
  - Read the task contract and the reuse evidence
restrictions:
  - Cannot lower a risk score to unlock a cheaper route
  - Cannot approve its own recommendation
failure_behaviour:
  - An unscoreable dimension routes to human triage, never to the cheapest default
open_questions:
  - Should a high-risk but trivial request bypass the agent path entirely and go straight to a named human?
---

# Stage 4 · Evaluate & decide

## Four dimensions, deliberately independent

| Dimension | Question | Scored by |
| --- | --- | --- |
| Risk | What is the worst credible outcome if this goes wrong? | Rules over the contract's data and systems answer |
| Complexity | How many steps, systems, and judgement calls? | Rules plus a model estimate |
| Value | What does it save or unlock, annualised? | The stakeholder's answer, sanity-checked |
| Repeatability | Will this recur, and how often? | The requester's answer, checked against history |

They are scored separately because they route differently. High risk raises controls. High complexity raises the execution tier. High value plus high repeatability is the *only* combination that justifies a dedicated team. Collapsing four scores into one "priority" number destroys exactly the information stage 5 needs.

## The three routes

| Route | When | Who runs it | Marginal cost |
| --- | --- | --- | --- |
| **Ticket system** | Low complexity, low risk, already has a human process | The existing service desk | Near zero |
| **Harness Agent Team** | One-off or complex, no recurrence expected | The standing shared team | Per-task model spend |
| **Dedicated Agent Team** | Repeatable *and* high value | A new, governed, registered team | Build cost plus ongoing ownership |

The ticket route is not a consolation prize. Most requests should take it. A platform where the ticket route is rarely chosen is a platform whose classifier has been tuned to justify its own existence, and its run cost will show it within two quarters.

## Why this stage cannot approve

The classifier recommends; it never approves. A dedicated team is an ongoing commitment of budget, ownership, and review capacity — the kind of commitment an organisation makes through a person, not a score. Stage 5 exists for exactly that.

## Boundary

This stage produces a recommendation and a rationale. Both are recorded, and both are visible to the requester. A route the requester disputes goes to human triage; it does not go back through the classifier hoping for a different answer.
