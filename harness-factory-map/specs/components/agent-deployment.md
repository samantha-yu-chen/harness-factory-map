---
id: agent-deployment
name: Agent Deployment
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: human-approves
data_classification: confidential
description: The live binding of one package version to one business unit, with its permission envelope, budget ceiling, risk tier, trigger surfaces, and health state.
exec_summary: The record of which agent is actually live where, on which version, what it may do, what it may spend, and whether it is currently switched on.
business_value: Without this, "we have an approved agent" and "an agent is running in Finance right now on version 4" are the same sentence. They are not, and the gap between them is where incidents live.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 3
deployable_unit: repo-platform-core
module: publication
workflow_id: stage-9-authorise
workflow_order: 1
tags:
  - runtime
  - deployment
  - versioning
depends_on:
  - agent-team-registry
  - agent-package
  - evaluation-service
connects_to:
  - agent-catalogue
  - schedule-runner
  - policy-engine
  - budget-guard
  - team-orchestrator
  - observability
  - outcome-ledger
  - team-lifecycle
  - audit-log
reference_map: []
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: agent-package
    operation: "GET /v1/packages/{package_id}/versions/{version}"
    note: "A deployment resolves the immutable version it publishes."
responsibilities:
  - Bind exactly one package version to one business unit as the live deployment
  - Hold the runtime envelope — tools, data domains, systems, risk tier, run cap, monthly ceiling
  - Promote a new package version only against a passing evaluation suite, and roll back on one command
  - Hold deployment health and suspend itself when a threshold is breached
owns:
  - The deployment record, its live version pointer, and its health state
does_not_own:
  - The agent definition, which is an immutable package version
  - The right to exist, which is the registry entry and its governance decision
  - Resumption, which is always a human act
data_owned:
  - deployment record
  - live package version pointer
  - deployment health state
inputs:
  - A registered team entry with a governance decision
  - A package version that has passed its evaluation suite
outputs:
  - A runtime envelope read on every invocation
  - Promotion, rollback, and suspension events
permissions:
  - Read package versions and evaluation results
  - Write its own deployment and health state
restrictions:
  - Cannot declare an envelope wider than its registry entry's scope
  - Cannot promote a version whose evaluation suite did not pass
  - Cannot resume itself after suspension
  - Cannot be created without a live registry entry and a named business-unit owner
failure_behaviour:
  - An unreadable deployment record denies every invocation of it — no cached envelope is honoured past a suspension event
  - A promotion whose canary window breaches its health floor rolls back automatically
  - Missing health telemetry is treated as unhealthy and suspends the deployment
open_questions:
  - "Does a canary promotion split traffic by percentage, or run the new version shadowed against the old before any traffic moves?"
  - "How long is a superseded package version kept warm for rollback before it is archived?"
  - "Can one registered team hold several concurrent deployments in different business units, or is the binding one-to-one?"
api_contract:
  - operation: "POST /v1/deployments"
    kind: sync-api
    caller: agent-team-registry
    worker: agent-deployment
    request: "{ team_id, package_version, business_unit, deployment_owner_upn, envelope{ tools[], data_domains[], systems[], declared_inputs[] }, risk_tier, run_cap_usd, monthly_ceiling_usd, trigger_surfaces[] }"
    response: "201 { deployment_id, status: draft, package_version }"
    idempotency: "team_id + package_version + business_unit"
    timeout: 5s
    auth: "Workload identity, invoked only by the registry once a governance decision is live"
    failure: "422 when the envelope exceeds the registry entry's scope or the risk tier permits unattended scheduling above its ceiling; 424 when no live registry entry exists"
  - operation: "POST /v1/deployments/{deployment_id}/promote"
    kind: human-decision
    caller: "The deployment owner"
    worker: agent-deployment
    request: "{ deployment_id, package_version, canary_window, rollback_to? }"
    response: "200 { deployment_id, live_version, previous_version, canary_until }"
    idempotency: "deployment_id + package_version"
    timeout: "No technical timeout; the canary window is measured, not waited on"
    auth: "Entra ID; the named deployment owner"
    failure: "409 when the package version has no passing evaluation result; a canary breaching its health floor rolls back automatically and notifies the owner"
  - operation: "GET /v1/deployments/{deployment_id}/envelope"
    kind: query
    caller: policy-engine, budget-guard, team-orchestrator
    worker: agent-deployment
    request: "{ deployment_id }"
    response: "200 { deployment_id, status, live_version, envelope{}, risk_tier, run_cap_usd, monthly_ceiling_usd, spend_to_date_usd, health{ success_rate, review_latency_p95 } }"
    timeout: 500ms
    auth: "Workload identity"
    failure: "404 for unknown; a suspended deployment returns status suspended and every caller must deny; an unreadable record denies rather than defaulting"
  - operation: "POST /v1/deployments/{deployment_id}/suspend"
    kind: async-event
    caller: budget-guard, observability, or the deployment owner
    worker: agent-deployment
    request: "{ deployment_id, reason (budget|health|review_latency|owner_request|incident), evidence_ref }"
    response: "202 { deployment_id, status: suspended, suspended_at }"
    idempotency: "Repeat suspension is a no-op returning the original timestamp"
    timeout: "3s; in-flight runs finish under their existing token, no new run starts"
    auth: "Workload identity, or Entra ID for the named owner"
    failure: "Suspension is guaranteed within the task-token TTL ceiling; a suspension that cannot be written escalates as an incident and the deployment is treated as suspended by every reader"
events_emitted:
  - deployment.created
  - deployment.promoted
  - deployment.rolled_back
  - deployment.suspended
events_consumed:
  - budget.ceiling.breached
  - deployment.health.degraded
  - team.suspended
slo:
  availability: "99.9%; every invocation reads this before it may run"
  latency: "p95 under 150 ms on the envelope read"
cost:
  monthly_usd_low: 15
  monthly_usd_high: 40
  driver: "Number of live deployments and one envelope read per invocation"
  note: "Small store on a very hot read path. The envelope may be cached at the authoriser for seconds, never across a suspension event — that single read is what makes the kill switch real."
  azure:
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, deployment and health containers"
      monthly_usd_low: 8
      monthly_usd_high: 25
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, minimum one replica"
      monthly_usd_low: 7
      monthly_usd_high: 15
      note: "On the invocation critical path, so it does not scale to zero."
      shared: false
---

# Agent Deployment

## Caller and worker

`agent-team-registry` **creates**; the **deployment owner promotes and rolls back**; `budget-guard` and `observability` **suspend**; the authorisation stage **reads the envelope on every single invocation**.

## Why this is not the registry entry

They look like the same record and are not. Merging them is the mistake that makes a kill switch stop working.

| | Registry entry | Deployment |
| --- | --- | --- |
| Answers | May this team exist | Which version is live, where, right now |
| Changes via | A governance decision | An operational action by the owner |
| Changes how often | Quarterly, at review | Weekly, on every promotion |
| Suspended by | Review overdue, budget | Health, cost burn, review latency |

A governance decision approves a *capability*. A deployment is the *instance* of it — and it is the instance that has a version, a business unit, an on-call owner, and a health state. One registered team can be deployed, rolled back, and redeployed a dozen times without any of that touching the governance record, which is exactly what you want: operational agility inside a fixed governance boundary.

## Promotion is the riskiest routine act on the platform

Everything else here is either rare (governance) or bounded (one run). Promotion silently changes what happens on the next thousand runs, and it happens often enough to become routine.

So it carries three constraints. The new version must have passed its evaluation suite — the same suite the factory verified it against. It runs a canary window measured against the deployment's health floor. And rollback is one command to a version kept warm for that purpose, not a rebuild.

The failure this designs against is specific: a prompt change that improves the cases someone tested and quietly degrades the cases nobody did. That degradation does not throw errors. It produces confident, plausible, wrong output, and without a health floor on a canary window it is discovered by a customer.

## The envelope is read every time, and cached almost never

The envelope may be cached at the authoriser for a few seconds. It may never be served from cache after a suspension event.

This is the read that makes suspension real. A kill switch that takes effect at the next cache expiry is not a kill switch, it is a request. The cost of getting this wrong is measured in whatever the agent kept doing after somebody believed they had stopped it.

## Health belongs here, not in the dashboard

Three numbers live on the deployment record: success rate over a rolling window, cost burn against ceiling, and review-queue latency. `observability` produces the telemetry; this component holds the state and acts on it.

The separation matters because acting on a threshold has to work when the dashboard does not. Missing telemetry means unhealthy, and unhealthy means suspended — telemetry gaps correlate with load, and load is exactly when an unwatched agent is most expensive.

## Acceptance criteria

- [ ] A deployment cannot be created without a live registry entry and a named business-unit owner.
- [ ] An envelope wider than the registry entry's scope is rejected.
- [ ] Promotion is refused when the package version has no passing evaluation result.
- [ ] A canary breaching its health floor rolls back automatically, proven by test.
- [ ] A suspended deployment is denied by every envelope reader, and no cached envelope survives a suspension event.
- [ ] Missing health telemetry suspends the deployment rather than being read as healthy.
- [ ] A deployment cannot resume itself.
- [ ] Every promotion, rollback, and suspension is written to audit-log with its reason.
