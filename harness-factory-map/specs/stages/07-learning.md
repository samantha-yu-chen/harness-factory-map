---
id: stage-7-learning
name: 7 · Loop engineering
entity_type: workflow-step
plane: learning
scope: future
status: specified
risk: medium
actor_type: human
automation_level: human-approves
data_classification: internal
description: Captures outcomes and feedback, measures performance, and turns both into human-approved improvements to knowledge, templates, and agent teams.
exec_summary: Every job done teaches the system something — and a human decides what it actually learns.
business_value: Without this loop the platform's quality is fixed on day one and its cost only ever rises. With it, both improve per run.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 7
loop: learning
tags:
  - learning
  - improvement
  - lifecycle
depends_on: []
connects_to:
  - stage-0-enterprise-brain
reference_elements:
  - Capture insights & feedback
  - Record learnings & outcomes
  - Improve knowledge & workflows
  - Update templates, policies & agents
  - Measure impact & performance
  - Retire / scale agent teams
  - Every execution makes the system smarter
responsibilities:
  - Capture requester and reviewer feedback against the delivered outcome
  - Maintain the metric set that describes platform health
  - Raise improvement proposals for knowledge, templates, policies, and packages
  - Scale, pause, or retire agent teams on evidence
owns:
  - The outcome and feedback ledger
  - The improvement backlog
does_not_own:
  - Direct mutation of policy, prompts, or permissions
  - The governance decision to fund a change
inputs:
  - Delivered outcomes, evidence, cost, and review verdicts
outputs:
  - Platform metrics, improvement proposals, and lifecycle recommendations
permissions:
  - Read outcomes and evidence
  - Write proposals to a backlog
restrictions:
  - No autonomous change to policy, prompts, permissions, or model routing
  - Cannot retire a team without its owner's acknowledgement
failure_behaviour:
  - Missing feedback is recorded as missing; the metric is never imputed
open_questions:
  - What evidence threshold justifies auto-promoting a repeated Harness Agent Team run into a dedicated-team proposal?
---

# Stage 7 · Loop engineering

## Observational learning, on purpose

This stage proposes. It does not change anything by itself. No prompt, policy, permission, or model route is modified without a human approving the change — and for anything touching policy or permissions, without stage 5 approving it.

That constraint is not timidity. A system that rewrites its own guardrails from its own outcome data will, given enough runs, optimise the guardrails away, because the fastest route to a good outcome score is usually a wider permission. Keeping the loop observational is what makes the audit trail mean something.

## The metrics that matter

| Metric | Why it earns its place | Warning sign |
| --- | --- | --- |
| Reuse rate | Reuse is the cheapest capability | Falling while request volume rises |
| Cost per delivered outcome | The number leadership will ask about | Rising while complexity is flat |
| Review pass rate | Quality of the agent work | Above 98%, which means review is rubber-stamping |
| Escalation rate | How often agents hit their limits | Rising in one domain means missing knowledge |
| Time to outcome | What requesters experience | Rising while cost falls means a starved review queue |
| Contract completion rate | Quality of stage 3 | Falling means intake is letting vague work through |

A review pass rate that is too *high* is a finding, not a success. It usually means reviewers are approving without reading, which converts the human-in-the-loop control into a formality with a latency cost.

## Retire and scale

The part of this stage that gets skipped is retirement. A dedicated team whose underlying process changed six months ago still runs, still costs money, and still produces confidently wrong answers grounded in an obsolete policy version.

Every registered team therefore carries a review date. Reaching it without an owner review suspends the team. Suspension is recoverable and loud; silent drift is neither.

## Boundary

This stage closes the loop back to stage 0 — improved knowledge, improved templates — and to stage 5, which decides whether a proposed improvement is funded. It never writes to production directly.
