---
id: budget-guard
name: Budget Guard
entity_type: component
plane: governance
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: Enforces per-task and per-team spending ceilings and stops work that exceeds them.
exec_summary: The hard stop that prevents an agent run, or an agent team, from spending more than it was authorised to.
business_value: Model spend is the platform's dominant and most volatile cost. This is the only component that can actually stop it.
owner: harness-platform
human_accountable: Financial Controller
build_wave: 2
workflow_id: stage-5-governance
workflow_order: 3
tags:
  - cost
  - governance
  - control
depends_on:
  - observability
  - agent-team-registry
connects_to:
  - agent-catalogue
  - agent-deployment
  - team-orchestrator
  - identity-access
  - audit-log
serves_stages:
  - stage-9-authorise
reference_map:
  - "Criterion: value & ROI"
  - "Criterion: resourcing & ownership"
responsibilities:
  - Enforce a deployment monthly ceiling in addition to the per-run cap
  - Reserve a spending envelope before a task starts
  - Track actual spend against the reservation during the run
  - Stop a task that exhausts its envelope and deliver a partial result honestly
  - Suspend a team that breaches its monthly ceiling
owns:
  - Spend reservations and ceiling enforcement
does_not_own:
  - The ceilings themselves, which come from governance decisions
  - Cost measurement, which comes from observability
  - Whether the spend was worthwhile
data_owned:
  - spend reservation
inputs:
  - Per-task cost estimate from work-classifier
  - Team ceiling from agent-team-registry
  - Actual spend telemetry from observability
outputs:
  - An allow or deny at task start, and a stop signal during a run
permissions:
  - Reserve budget, read spend telemetry, and trigger suspension
restrictions:
  - Cannot raise a ceiling — only governance can
  - Cannot be bypassed or overridden by the task it is limiting
  - Cannot approve spend when telemetry is incomplete
failure_behaviour:
  - Incomplete or unavailable cost telemetry is treated as at-limit, denying new work; it is never treated as zero spend
  - Exhausting an envelope mid-run stops the task and delivers a partial result marked budget-stopped
  - A team breaching its monthly ceiling is suspended and cannot resume without its governance sponsor
open_questions:
  - What per-task envelope is right per risk tier, and does an interrupted high-value task deserve a one-time human-approved extension?
  - How is spend attributed when one agent run serves two contracts?
api_contract:
  - operation: "POST /v1/budget/reservations"
    kind: sync-api
    caller: team-orchestrator
    worker: budget-guard
    request: "{ task_id, team_id?, contract_id, estimated_cost_usd, risk_tier }"
    response: "201 { reservation_id, envelope_usd, team_headroom_usd, decision (allow|deny), reason? }"
    idempotency: "task_id; a repeat returns the existing reservation"
    timeout: "2s; a timeout denies"
    auth: "Workload identity; only the orchestrator may reserve"
    failure: "403 deny when team headroom is exhausted, when the estimate exceeds the per-task envelope, or when cost telemetry is incomplete — every failure path denies"
  - operation: "POST /v1/budget/reservations/{reservation_id}/checkpoint"
    kind: sync-api
    caller: team-orchestrator
    worker: budget-guard
    request: "{ reservation_id, spend_to_date_usd, step }"
    response: "200 { continue: boolean, remaining_usd, stop_reason? }"
    idempotency: "reservation_id + step"
    timeout: "1s; a timeout returns continue=false"
    auth: "Workload identity"
    failure: "continue=false is a hard stop the orchestrator must honour; there is no override path in the API surface"
  - operation: "budget.ceiling.breached"
    kind: async-event
    caller: budget-guard
    worker: agent-team-registry
    request: "{ team_id, month, ceiling_usd, actual_usd, breached_at }"
    response: "The team is suspended and its owner and sponsor are notified"
    idempotency: "team_id + month"
    timeout: "Retried until acknowledged; a breach is never dropped"
    failure: "An unacknowledged breach escalates to an incident within 15 minutes"
  - operation: "POST /v1/budget/deployments/{deployment_id}/reserve"
    kind: sync-api
    caller: agent-catalogue
    worker: budget-guard
    request: "{ invocation_id, deployment_id, run_cap_usd, monthly_ceiling_usd }"
    response: "200 { reservation_id, remaining_monthly_usd } or 402 { reason (run_cap|monthly_ceiling) }"
    idempotency: "invocation_id"
    timeout: 300ms
    auth: "Workload identity"
    failure: "402 denies the run when either the run cap or the deployment monthly ceiling is reached; reaching the monthly ceiling additionally suspends the deployment; missing cost telemetry is treated as at-limit, never as zero spend"
events_emitted:
  - budget.reserved
  - budget.denied
  - budget.task_stopped
  - budget.ceiling.breached
events_consumed:
  - telemetry.cost.anomaly
  - team.registered
slo:
  availability: "99.9%; unavailability denies rather than allows"
  latency: "p95 under 200 ms; this is on the task-start path"
cost:
  monthly_usd_low: 5
  monthly_usd_high: 15
  driver: "Reservation and checkpoint volume"
  note: "The cheapest component in the platform and the one protecting the most expensive line. Build it in wave 2, before agent volume grows — retrofitting a budget control after the first surprise invoice is a much harder conversation."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 0.25 vCPU / 0.5 GiB, minimum one replica"
      monthly_usd_low: 5
      monthly_usd_high: 15
      note: "On the critical path, so no scale to zero."
      shared: false
---

# Budget Guard

## Caller and worker

The **orchestrator calls** — once to reserve, then at each step checkpoint. This component **answers, and its answer is binding**.

There is deliberately no override in the API surface. Not a flag, not an admin endpoint, not a header. Raising a limit means changing a governance decision, which is a human act with a name attached. An override parameter would be used within a fortnight, by someone under deadline pressure, and the control would be decorative from then on.

## Incomplete telemetry means at-limit

The most important line in this specification: when cost telemetry is missing, stale, or partial, this component behaves as though the budget is exhausted.

The intuitive alternative — treat missing data as zero spend — fails exactly when it matters. Telemetry gaps correlate with load, load correlates with spend, and a budget control that fails open during a spike is not a budget control at all.

`observability` cooperates by flagging incomplete cost data explicitly rather than returning a plausible-looking partial number.

## Two ceilings, different jobs

| Ceiling | Scope | Set by | On breach |
| --- | --- | --- | --- |
| Per-task envelope | One run | Risk tier and classifier estimate | Stop the run, deliver partial, mark budget-stopped |
| Monthly team ceiling | One registered team | Governance decision | Suspend the team, notify owner and sponsor |

The per-task envelope catches runaway loops. The monthly ceiling catches a team that is working correctly but costs more than it was worth — a slower and more expensive failure, and the one leadership actually cares about.

## Budget-stopped is an honest outcome

A stopped task delivers what it had, labelled `budget-stopped`, with its spend and its progress. It does not silently retry, and it does not report failure as if the work were impossible.

That label is what turns a cost event into a learning signal: a team that regularly hits its envelope is either mis-scoped, mis-priced, or mis-routed, and `outcome-ledger` can tell which.

## Acceptance criteria

- [ ] No API path exists to raise a ceiling or bypass a stop.
- [ ] Incomplete cost telemetry denies, proven by test.
- [ ] A timeout on reserve or checkpoint denies rather than allows.
- [ ] An exhausted envelope stops the run and produces a partial result labelled budget-stopped.
- [ ] A monthly ceiling breach suspends the team and cannot be self-resolved.
- [ ] Reservation is idempotent per task.
- [ ] Every denial and stop is recorded in audit-log with its numbers.
