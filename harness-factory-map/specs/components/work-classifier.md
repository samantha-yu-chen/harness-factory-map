---
id: work-classifier
name: Work Classifier
entity_type: component
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: agent-with-review
data_classification: confidential
description: Scores a signed contract on risk, complexity, value, and repeatability, then recommends one of three execution routes with a written rationale.
exec_summary: Decides whether a request is a ticket, a job for the standing agent team, or a case for a dedicated team — and says why.
business_value: This is the platform's cost control point. Route discipline here is worth more than any infrastructure optimisation downstream.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
workflow_id: stage-4-evaluate
workflow_order: 1
tags:
  - classification
  - routing
  - cost-control
depends_on:
  - task-contract
connects_to:
  - ticket-bridge
  - governance-board
  - team-orchestrator
  - budget-guard
  - audit-log
reference_map:
  - Classify the work (risk, complexity, value, repeatability)
  - Define execution approach
  - Recommend path
  - "Route: handle via Harness Agent Team (one-time or complex)"
  - "Route: propose dedicated agent team (repeatable & high value)"
responsibilities:
  - Score risk, complexity, value, and repeatability independently
  - Apply the deterministic routing rules to those four scores
  - Produce a written rationale a requester can read and dispute
  - Estimate the expected cost of the recommended route
owns:
  - The routing decision and its rationale
  - The scoring rubric and its version
does_not_own:
  - Approval of a dedicated team, which belongs to governance-board
  - Runtime authorisation, which belongs to policy-engine
  - Execution
data_owned:
  - routing decision
  - scoring rubric version
inputs:
  - A signed task contract
  - Reuse evidence from stage 2
outputs:
  - Four scores, one recommended route, a rationale, and a cost estimate
permissions:
  - Read the signed contract and the reuse evidence
restrictions:
  - The risk score is rules-derived and may not be lowered by a model judgement
  - Cannot approve its own recommendation or start execution
  - Cannot route to a dedicated team that governance has not approved
failure_behaviour:
  - Any dimension that cannot be scored routes to human triage, never to the cheapest default
  - A model-assist timeout falls back to rules-only scoring and marks the decision as degraded
  - A disputed route goes to human triage; it is never re-run hoping for a different answer
open_questions:
  - Should a high-risk but trivial request bypass the agent path entirely and go to a named human?
  - How often is the rubric recalibrated against actual outcomes from the learning loop?
api_contract:
  - operation: "POST /v1/classification"
    kind: sync-api
    caller: team-orchestrator
    worker: work-classifier
    request: "{ contract_id, contract_version, reuse_verdict?, requester_business_unit }"
    response: "201 { decision_id, scores: { risk, complexity, value, repeatability }, route (ticket|harness_team|propose_dedicated), rationale, estimated_cost_usd, rubric_version, degraded: boolean }"
    idempotency: "contract_id + contract_version + rubric_version; the same inputs always yield the same decision_id"
    timeout: "15s, then rules-only fallback marked degraded"
    auth: "Workload identity"
    failure: "422 on an unsigned contract; 503 to human triage when a dimension is unscoreable; never silently defaults a score"
  - operation: "POST /v1/classification/{decision_id}/dispute"
    kind: human-decision
    caller: "The requester or the decision owner"
    worker: work-classifier
    request: "{ decision_id, disputed_dimension, reason }"
    response: "202 { triage_id, status: with-human }"
    idempotency: "decision_id; one open dispute at a time"
    timeout: "Human triage responds within 2 working days"
    auth: "Entra ID; requester or decision owner"
    failure: "A dispute never re-runs the classifier — it opens a human triage item, and the override is recorded as a human decision"
  - operation: "GET /v1/classification/rubric"
    kind: query
    caller: "Requesters, governance-board, improvement-proposal"
    worker: work-classifier
    request: "{ version? }"
    response: "200 { version, dimensions[], thresholds, route_rules, effective_from }"
    timeout: 1s
    auth: "Entra ID; any employee — the rubric is deliberately public internally"
    failure: "404 for an unknown version; the current rubric is always readable"
events_emitted:
  - classification.completed
  - classification.degraded
  - classification.disputed
events_consumed:
  - contract.signed
slo:
  availability: "99.5%"
  latency: "p95 under 8s including model assist; under 500 ms rules-only"
cost:
  monthly_usd_low: 15
  monthly_usd_high: 45
  model_usd_per_task_low: 0.02
  model_usd_per_task_high: 0.1
  driver: "One classification per contract, plus rubric recalibration runs"
  note: "Cheapest component in the platform and the one with the largest cost leverage — every request it routes to the ticket system saves the full agent-run cost. Fund the rubric calibration work; it pays for itself."
  azure:
    - service: Azure Functions
      sku: "Consumption plan, rules engine"
      monthly_usd_low: 5
      monthly_usd_high: 20
      shared: false
    - service: Azure Service Bus
      sku: "Standard, decision topic"
      monthly_usd_low: 10
      monthly_usd_high: 25
      shared: true
---

# Work Classifier

## Caller and worker

The **orchestrator calls**; this component **scores and recommends**. It has no execution authority and no approval authority, and both absences are deliberate.

A classifier that could approve its own recommendation would be the whole governance model, implemented as a scoring function, with nobody accountable for the threshold.

## The risk score is rules-derived

Risk is computed from the contract's declared data sources, systems, and stated impacts, against a versioned rules table. A model may assist with *complexity*, and may propose evidence for *value*, but it cannot move risk.

The reason is adversarial rather than technical. Risk is the dimension that unlocks cheaper routes and weaker controls, so it is the dimension a sufficiently persuasive request would talk down. Keeping it in rules means the only way to change a risk score is to change the rules table, which is versioned, reviewed, and audited.

## Determinism and the rubric version

The idempotency key includes `rubric_version`. Same contract, same rubric, same decision — always.

This is what makes disputes tractable. When someone challenges a route six weeks later, the platform can reproduce the exact decision, and can also show what a *current* rubric would say. Without a pinned rubric version those two answers silently merge into one confusing conversation.

## Disputes go to humans, not to a re-run

The dispute endpoint opens a human triage item. It does not re-invoke the classifier.

Allowing a re-run creates an obvious pathology: rephrase until the score improves. Every override is therefore a recorded human decision with a name on it, which is both more honest and — because overrides feed the learning loop — the actual mechanism by which the rubric gets better.

## Estimating cost is part of the job

`estimated_cost_usd` accompanies every recommendation. A route recommendation without a cost is a technical opinion; with one it is a business proposal, and stage 5 can act on it.

## Acceptance criteria

- [ ] The four dimensions are scored and stored independently; no composite score is persisted.
- [ ] A model response cannot lower the rules-derived risk score, proven by test.
- [ ] Identical contract, version, and rubric always produce the same decision id.
- [ ] An unscoreable dimension routes to human triage rather than defaulting.
- [ ] A model-assist timeout produces a rules-only decision explicitly marked degraded.
- [ ] Disputes create a human triage item and never re-run the classifier.
- [ ] The rubric is readable by any employee, with its version and effective date.
