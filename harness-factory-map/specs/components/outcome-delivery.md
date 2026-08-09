---
id: outcome-delivery
name: Outcome Delivery
entity_type: artifact
plane: external
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Hands the reviewed result, its artifacts, its evidence, and its cost back to the requester and closes the run.
exec_summary: Delivers the finished work back to whoever asked for it, with the evidence and the cost attached.
business_value: The requester's experience of the whole platform is this one moment. Everything upstream is invisible to them.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
deployable_unit: repo-platform-core
module: assurance
workflow_id: stage-6-execution
workflow_order: 8
tags:
  - delivery
  - outcome
  - artifact
depends_on:
  - human-review-gate
  - team-orchestrator
connects_to:
  - outcome-ledger
  - request-intake
  - audit-log
serves_stages:
  - stage-11-deliver
reference_map:
  - Deliver outcome & log decision
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: team-orchestrator
    operation: "GET /v1/runs/{run_id}"
    note: "Reads the completed run it is delivering."
responsibilities:
  - Publish the reviewed outcome and its artifacts to the requester's channel
  - Attach evidence, citations, cost, and the package version used
  - Mark the run complete, partial, or failed — honestly
  - Record the delivery as the run's terminal decision
owns:
  - The delivery record and the outcome bundle
does_not_own:
  - The result content
  - Whether the outcome was useful, which stage 7 measures
data_owned:
  - delivery record
inputs:
  - An approved step result, its artifacts, evidence, and run cost
outputs:
  - A delivered outcome bundle and a closed run
permissions:
  - Publish to the requester's originating channel
  - Append the delivery record
restrictions:
  - Cannot deliver without a review verdict of approve, at any risk tier requiring one
  - Cannot present a partial or budget-stopped result as complete
  - Cannot modify the result content it is delivering
failure_behaviour:
  - A failed channel publish retries with backoff and the outcome remains retrievable through the portal — delivery is never lost
  - A partial result is delivered labelled partial, with what was completed, what was not, and why
  - A delivery that cannot be recorded in the audit log does not complete
open_questions:
  - Should artifacts be delivered into the requester's own systems (SharePoint, mailbox) or held in the platform and linked? The answer changes the data-residency conversation materially.
api_contract:
  - operation: "POST /v1/deliveries"
    kind: sync-api
    caller: team-orchestrator
    worker: outcome-delivery
    request: "{ run_id, contract_id, contract_version, review_id?, step_result_id, artifact_refs[], evidence_refs[], spend_usd, package_version, completeness (complete|partial|budget_stopped|failed) }"
    response: "201 { delivery_id, channel, delivered_at, portal_url }"
    frequency: per-task
    retrofit: migration
    idempotency: "run_id; a repeat returns the existing delivery"
    timeout: 15s
    auth: "Workload identity"
    failure: "403 when the risk tier required a review verdict and none is present; 422 when completeness is complete but the run was budget-stopped; the audit append blocks the delivery"
  - operation: "GET /v1/deliveries/{delivery_id}"
    kind: query
    caller: "Requester, reviewer, outcome-ledger, auditors"
    worker: outcome-delivery
    request: "{ delivery_id }"
    response: "200 { delivery_id, outcome_summary, artifact_refs[], citations[], spend_usd, package_version, contract_version, completeness, reviewed_by? }"
    frequency: per-task
    retrofit: refactor
    timeout: 3s
    auth: "Entra ID; requester, reviewer, or platform role"
    failure: "404 for unknown; 403 rather than a redacted body when the caller may not read it"
  - operation: "POST /v1/deliveries/{delivery_id}/feedback"
    kind: human-decision
    caller: "The requester"
    worker: outcome-ledger
    request: "{ delivery_id, useful (yes|partly|no), comment?, would_reuse (yes|no) }"
    response: "201 { feedback_id }"
    frequency: per-task
    retrofit: migration
    idempotency: "delivery_id + requester; feedback can be revised, and revisions are versioned"
    timeout: 3s
    auth: "Entra ID; the requester or the decision owner"
    failure: "Absent feedback is recorded as absent and never imputed; a low response rate is itself a reported metric"
events_emitted:
  - outcome.delivered
  - outcome.delivery_failed
  - outcome.partial_delivered
events_consumed:
  - review.verdict.recorded
slo:
  availability: "99.9%"
  latency: "Delivered to the requester's channel within 2 minutes of approval"
cost:
  monthly_usd_low: 15
  monthly_usd_high: 40
  driver: "Deliveries and artifact storage; artifact retention dominates"
  note: "Artifact retention is the growing line here. Agree a lifecycle policy at build time — most delivered artifacts do not need to sit in hot storage for a year."
  azure:
    - service: Azure Blob Storage
      sku: "Standard hot with lifecycle tiering to cool at 30 days"
      monthly_usd_low: 10
      monthly_usd_high: 25
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: false
---

# Outcome Delivery

## Caller and worker

The **orchestrator calls once**, at the end of a run. This component **publishes and closes**.

The requester never sees anything else in this map. Stage 0 through stage 6 are, from their point of view, a wait. This is the moment the platform is judged.

## Delivery is not completion

An agent package being handed to a runtime is not a delivered outcome, and a delivered outcome is not necessarily a *complete* one. `completeness` carries four honest values:

| Value | Meaning |
| --- | --- |
| `complete` | Every success criterion met and reviewed |
| `partial` | Some criteria met; what is missing is named |
| `budget_stopped` | Stopped at its envelope; progress and spend disclosed |
| `failed` | Could not be done; the reason is stated |

The contract rejects `complete` on a budget-stopped run. That validation exists because the pressure to round up is real and comes from the most sympathetic possible place — nobody enjoys telling a requester the run ran out of money.

## Cost is disclosed to the requester

`spend_usd` goes to the requester, every time. This is unusual and it is deliberate.

It changes requester behaviour more than any policy could: someone who sees that their casual request cost eleven dollars of model time asks differently next time. It also makes the stage 4 routing conversation concrete rather than abstract.

## Delivery is never lost

A channel publish failure retries, and the outcome stays retrievable through the portal regardless. The work was done and paid for; losing it to a Teams outage would be an unforced error.

## Acceptance criteria

- [ ] Delivery is blocked without a review verdict where the risk tier requires one.
- [ ] A budget-stopped run cannot be delivered as complete.
- [ ] The delivery bundle carries citations, contract version, package version, and spend.
- [ ] A channel failure retries and the outcome remains retrievable through the portal.
- [ ] The audit append blocks the delivery on failure.
- [ ] The delivery record is immutable; a correction is a new delivery linked to the original.
- [ ] Absent requester feedback is recorded as absent, never imputed.
