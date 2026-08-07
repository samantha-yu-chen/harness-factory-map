---
id: outcome-ledger
name: Outcome Ledger
entity_type: component
plane: learning
scope: future
status: specified
risk: medium
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: Records what each run delivered, what it cost, what the reviewer and requester thought, and computes the platform's health metrics.
exec_summary: The scoreboard — what the platform delivered, what it cost, and whether the people who asked found it useful.
business_value: This is the evidence base for every funding, scaling, and retirement decision leadership will make about the platform.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 4
deployable_unit: repo-platform-core
module: learning
workflow_id: stage-7-learning
workflow_order: 1
tags:
  - learning
  - metrics
  - feedback
depends_on:
  - outcome-delivery
  - observability
  - audit-log
connects_to:
  - agent-deployment
  - improvement-proposal
  - team-lifecycle
  - governance-board
serves_stages:
  - stage-12-record
reference_map:
  - Capture insights & feedback
  - Record learnings & outcomes
  - Measure impact & performance
consumes:
  - from: audit-log
    operation: "GET /v1/audit/trace/{request_id}"
    note: "Reconstructs what happened from the evidence trail rather than from its own memory."
responsibilities:
  - Record every production run against its deployment, business unit, and package version
  - Record every delivered outcome with its cost, evidence, and verdicts
  - Capture requester and reviewer feedback against the delivery
  - Compute and publish the platform metric set
  - Surface patterns worth a human's attention
owns:
  - The outcome and feedback ledger
  - The metric definitions and their computation
does_not_own:
  - The outcomes themselves
  - Any change to policy, prompts, or teams
data_owned:
  - run record
  - outcome record
  - feedback record
  - platform metric series
inputs:
  - Delivery records, review verdicts, evaluation verdicts, cost telemetry, requester feedback
outputs:
  - Platform metrics, per-team performance, and candidate improvement signals
permissions:
  - Read deliveries, verdicts, and telemetry
  - Write ledger entries and metric series
restrictions:
  - Cannot change a delivered outcome or a recorded verdict
  - Cannot impute missing feedback; absent is a value, not a gap to fill
  - Cannot autonomously act on a pattern it detects
failure_behaviour:
  - Missing feedback is recorded as missing and reported in the response-rate metric
  - Incomplete cost telemetry marks the outcome's cost as incomplete rather than under-reporting it
  - A failed metric computation serves the previous period and flags staleness
open_questions:
  - How is business value measured beyond requester sentiment — is there an agreed proxy per business unit?
  - What evidence threshold justifies auto-raising a dedicated-team proposal from repeated similar runs?
api_contract:
  - operation: "POST /v1/outcomes"
    kind: async-event
    caller: outcome-delivery, ticket-bridge
    worker: outcome-ledger
    request: "{ delivery_id | external_ref, contract_id, route (ticket|harness_team|dedicated_team), completeness, spend_usd, cost_complete: boolean, review_verdict?, evaluation_verdict?, cycle_time_s }"
    response: "Consumed asynchronously; the ledger entry is created"
    idempotency: "delivery_id or external_ref"
    timeout: "Retried for 24h then dead-lettered to operations"
    failure: "A dropped outcome is a permanently missing data point, so dead-letters are worked, not archived"
  - operation: "GET /v1/metrics"
    kind: query
    caller: "Leadership, governance-board, team-lifecycle, platform operators"
    worker: outcome-ledger
    request: "{ period, business_unit?, team_id? }"
    response: "200 { period, reuse_rate, cost_per_outcome_usd, review_pass_rate, escalation_rate, time_to_outcome_p50_s, contract_completion_rate, feedback_response_rate, stale: boolean }"
    timeout: 5s
    auth: "Entra ID; any employee may read platform-level metrics"
    failure: "Returns the previous period with stale=true rather than a computed-on-the-fly approximation"
  - operation: "GET /v1/outcomes/patterns"
    kind: query
    caller: improvement-proposal, team-lifecycle
    worker: outcome-ledger
    request: "{ period, min_occurrences }"
    response: "200 { patterns: [{ signal, occurrences, example_contract_ids[], suggested_action }] }"
    timeout: 10s
    auth: "Workload identity"
    failure: "A pattern is a suggestion with its evidence attached; it carries no authority and triggers no action by itself"
  - operation: "POST /v1/runs"
    kind: async-event
    caller: outcome-delivery
    worker: outcome-ledger
    request: "{ run_id, invocation_id, deployment_id, business_unit, package_version, status, model_cost_usd, infra_cost_usd, review_decision, trigger (catalogue|schedule) }"
    response: "202 { run_id, recorded_at }"
    idempotency: "run_id"
    timeout: 2s
    auth: "Workload identity"
    failure: "A record that cannot be written fails the run rather than losing the trace; missing cost is recorded as unknown and treated as at-limit downstream, never as zero"
  - operation: "GET /v1/deployments/{deployment_id}/value"
    kind: query
    caller: "Leadership, governance-board, team-lifecycle"
    worker: outcome-ledger
    request: "{ deployment_id, period }"
    response: "200 { run_count, success_rate, total_cost_usd, cost_per_successful_run_usd, review_load_hours, business_unit }"
    timeout: 3s
    auth: "Entra ID or workload identity"
    failure: "Returns explicit coverage of the period rather than extrapolating from partial data"
events_emitted:
  - outcome.recorded
  - metrics.published
  - pattern.detected
events_consumed:
  - outcome.delivered
  - ticket.closed
  - review.verdict.recorded
slo:
  availability: "99%; this is an analysis plane, not a critical path"
  latency: "Metrics refreshed daily; outcomes recorded within 5 minutes"
cost:
  monthly_usd_low: 20
  monthly_usd_high: 60
  driver: "Outcome volume and metric retention"
  note: "Cheap, and the first thing leadership asks for once the platform has been running a quarter. Building it in wave 4 is a deliberate sequencing choice — there is nothing to measure before there are outcomes — but do not let it slip past that."
  azure:
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, outcome and feedback containers"
      monthly_usd_low: 15
      monthly_usd_high: 40
      shared: true
    - service: Azure Container Apps Jobs
      sku: "Consumption, daily metric computation job"
      monthly_usd_low: 5
      monthly_usd_high: 20
      shared: false
---

# Outcome Ledger

## Caller and worker

`outcome-delivery` and `ticket-bridge` **push**; leadership and stage 7 components **read**. This component **records and computes**, and does nothing else.

Note that the ticket route reports outcomes in the same shape as the agent route. That symmetry is what makes the routing conversation honest — otherwise the platform can only measure the work it did itself, and will conclude that it should do more of it.

## Absent is a value

Missing requester feedback is recorded as missing and shows up in `feedback_response_rate`. It is never imputed, never defaulted to neutral, and never quietly excluded from an average.

An imputed satisfaction metric is worse than no metric, because it survives contact with a leadership deck and no one can tell it was fabricated.

The same applies to cost: when `observability` flags telemetry as incomplete, the outcome's cost is marked incomplete rather than under-reported. Under-reported cost is the specific failure that makes an agent platform look cheaper than it is for exactly as long as it takes to reconcile the cloud bill.

## Patterns carry no authority

`GET /outcomes/patterns` returns observations with evidence attached — "eleven contracts this quarter asked for the same supplier summary" — and nothing happens as a result.

A pattern feeds `improvement-proposal` or `team-lifecycle`, where a human decides. This is where the "learning is observational" rule is actually load-bearing: the ledger is the component best placed to act autonomously and most tempting to let, and it is deliberately given no ability to.

## The six metrics

Defined in `specs/stages/07-learning.md`. Two are counter-intuitive and worth restating:

- **Review pass rate above 98% is a finding**, not a success. It means over-routing to review, or rubber-stamping.
- **Falling time-to-outcome alongside falling cost** usually means a starved review queue, not an efficiency gain.

## Acceptance criteria

- [ ] Ticket-route and agent-route outcomes are recorded in the same shape.
- [ ] Missing feedback is recorded as missing and reported in the response rate.
- [ ] Incomplete cost telemetry marks the outcome incomplete rather than under-reporting.
- [ ] The ledger cannot modify a delivery, verdict, or contract.
- [ ] Patterns are returned with evidence and trigger no automatic action.
- [ ] A failed metric computation serves the previous period flagged stale.
- [ ] Dead-lettered outcome events are worked, not archived.
