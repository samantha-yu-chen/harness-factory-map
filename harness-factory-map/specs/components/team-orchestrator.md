---
id: team-orchestrator
name: Team Orchestrator
entity_type: component
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Owns execution state and drives the seven-step agent team loop from understand to delivery.
exec_summary: The conductor — it decides which step happens next, holds the record of what has happened, and never does the work itself.
business_value: Agent runs are long, expensive, and interruptible. Deterministic state ownership is what makes them resumable, auditable, and stoppable.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
deployable_unit: repo-execution
module: orchestration
workflow_id: stage-6-execution
workflow_order: 1
tags:
  - orchestration
  - execution
  - state
depends_on:
  - task-contract
  - policy-engine
  - budget-guard
  - identity-access
connects_to:
  - agent-runtime
  - evaluation-service
  - human-review-gate
  - outcome-delivery
  - work-classifier
  - agent-team-registry
  - audit-log
serves_stages:
  - stage-10-execute
reference_map:
  - Harness Agent Team executes the work end to end
consumes:
  - from: identity-access
    operation: "POST /v1/identity/task-token"
    per_action: 0
    note: "A scoped, expiring token per task; the orchestrator is the only caller permitted to mint one."
  - from: audit-log
    operation: "POST /v1/audit/records"
    per_action: 1
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: policy-engine
    operation: "POST /v1/policy/decisions"
    per_action: 0
    note: "The decision that authorises the whole run."
  - from: task-contract
    operation: "GET /v1/contracts/{contract_id}"
    per_action: 0
    note: "The signed statement of what the run is for."
  - from: agent-deployment
    operation: "GET /v1/deployments/{deployment_id}/envelope"
    per_action: 0
    note: "Runtime runs read their deployment envelope before starting."
  - from: outcome-delivery
    operation: "POST /v1/deliveries"
    per_action: 0
    note: "Hands a finished run to delivery rather than returning it directly."
  - from: sandbox
    operation: "POST /v1/sandbox/sessions"
    per_action: 0
    note: "Opens the bounded session a step executes inside."
responsibilities:
  - Own the authoritative execution state machine for every task
  - Sequence the seven steps and enforce that none is skipped
  - Obtain the policy decision, the budget reservation, and the task token before any agent runs
  - Checkpoint after every step so a run is resumable and stoppable
owns:
  - Execution state and step transitions
does_not_own:
  - Reasoning, which belongs to agent-runtime
  - Authorisation, budget ceilings, or evaluation verdicts
  - The definition of the work
data_owned:
  - execution state
  - step checkpoint
inputs:
  - A signed contract, a routing decision, and a team assignment
outputs:
  - A completed, stopped, or escalated run with a full step history
permissions:
  - Request policy decisions, budget reservations, and task tokens
  - Dispatch work to agent runtimes and gates
restrictions:
  - Never writes source content, calls tools, or reasons about the task itself
  - Cannot skip a step, override a gate verdict, or extend its own budget
  - Cannot transition state on an agent's say-so without the corresponding gate result
failure_behaviour:
  - A crashed run resumes from its last checkpoint; steps are idempotent by design
  - A gate verdict of fail returns to plan once, then escalates to a human
  - Budget or time exhaustion stops the run and delivers a partial result honestly
  - Loss of the policy decision or task token stops the run rather than continuing on an expired grant
open_questions:
  - How many autonomous plan-execute-validate loops are acceptable before a human is interrupted, and does that vary by risk tier?
  - Should a suspended team's in-flight tasks finish under their existing grant, or stop immediately?
api_contract:
  - operation: "POST /v1/runs"
    kind: sync-api
    caller: work-classifier, or solution-registry on a confident reuse match
    worker: team-orchestrator
    request: "{ contract_id, contract_version, decision_id, team_id?, risk_tier }"
    response: "201 { run_id, task_id, state: understanding, policy_decision_id, reservation_id }"
    frequency: per-task
    retrofit: migration
    idempotency: "contract_id + contract_version; a repeat returns the existing run"
    timeout: 10s
    auth: "Workload identity"
    failure: "403 when the policy decision denies or budget is refused; 409 when the team is suspended; a run never starts without all three of policy, budget, and token"
  - operation: "POST /v1/runs/{run_id}/advance"
    kind: sync-api
    caller: "The orchestrator's own step workers"
    worker: team-orchestrator
    request: "{ run_id, from_state, step_result, evidence_refs[], spend_to_date_usd }"
    response: "200 { run_id, state, next_step, continue: boolean }"
    frequency: per-action
    retrofit: migration
    p95_ms: 500
    idempotency: "run_id + from_state + step attempt; replaying a transition is safe"
    timeout: 5s
    auth: "Workload identity"
    failure: "409 on a stale from_state, which prevents two workers advancing the same run; a budget checkpoint returning continue=false stops the run"
  - operation: "POST /v1/runs/{run_id}/stop"
    kind: sync-api
    caller: budget-guard, human-review-gate, the team owner, or a platform operator
    worker: team-orchestrator
    request: "{ run_id, reason (budget|review|owner|incident), note }"
    response: "200 { run_id, state: stopped, partial_outcome_ref }"
    frequency: per-task
    retrofit: refactor
    idempotency: "run_id; repeat stops are no-ops"
    timeout: 3s
    auth: "Workload identity, or Entra ID for the owner and operator roles"
    failure: "A stop always succeeds in marking the run stopped; in-flight tool calls are bounded by the token TTL, which is the real containment guarantee"
  - operation: "GET /v1/runs/{run_id}"
    kind: query
    caller: "Requester, reviewer, outcome-ledger"
    worker: team-orchestrator
    request: "{ run_id }"
    response: "200 { run_id, contract_id, state, steps[{ step, started, ended, verdict, evidence_refs[] }], spend_usd, team_id }"
    frequency: per-task
    retrofit: refactor
    timeout: 2s
    auth: "Entra ID; requester, reviewer, or platform role"
    failure: "404 for unknown; step evidence is returned by reference, not inline"
events_emitted:
  - run.started
  - run.step.completed
  - run.stopped
  - run.escalated
  - run.completed
events_consumed:
  - classification.completed
  - review.verdict.recorded
  - budget.task_stopped
  - team.suspended
hot_path:
  unit_of_work: "One run state transition"
  budget_p95_ms: 500
slo:
  availability: "99.9%"
  latency: "p95 under 500 ms per state transition"
  recovery: "A run resumes from its last checkpoint with no duplicated side effects"
cost:
  monthly_usd_low: 40
  monthly_usd_high: 95
  driver: "Runs per month and steps per run; assumes 500 runs at 7–15 transitions each"
  note: "Always on and stateful, so it does not scale to zero. Cheap relative to the model spend it coordinates — do not optimise here before optimising routing."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 1 vCPU / 2 GiB, minimum two replicas"
      monthly_usd_low: 20
      monthly_usd_high: 45
      shared: false
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, execution-state container partitioned by run_id"
      monthly_usd_low: 15
      monthly_usd_high: 35
      shared: true
    - service: Azure Service Bus
      sku: "Standard, step dispatch topic with sessions"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: true
---

# Team Orchestrator

## Caller and worker

This component is the **caller for almost everything** in stage 6 — it calls policy, budget, identity, the agent runtime, evaluation, review, and delivery. It is the **worker for exactly one thing**: knowing what state a run is in and what happens next.

That narrowness is the point. An orchestrator that also reasons, or also decides, becomes the place where every rule quietly grows an exception.

## It never does the work

The orchestrator does not call tools, does not reason about the task, and does not write content. When it needs a judgement it dispatches to a component whose job that is, and it treats that component's verdict as binding.

The specific temptation to resist is the small helpful shortcut: "the evaluation only just failed, retry it inline". Every one of those shortcuts moves an authority boundary, and the boundaries are the product.

## Three grants before any agent runs

A run cannot start without all three:

1. a **policy decision** naming the permitted scope
2. a **budget reservation** with an envelope
3. a **task token** scoped to that decision and expiring

Missing any one stops the run before a single model token is spent. Ordering matters — policy first, because it bounds the other two.

## Checkpoints make runs resumable and stoppable

State advances through `POST /advance` with a `from_state` guard. A stale `from_state` returns 409, which is what prevents two workers advancing the same run after a partition.

Checkpointing is also what makes `stop` meaningful. A run that only exists in a process's memory cannot be stopped, only killed — and killing it loses the partial result that `budget-guard` promised to deliver honestly.

## Failure returns to plan, once

A failed evaluation returns the run to `plan` exactly once. The second failure escalates to a human.

One retry catches the genuinely recoverable case where the plan was slightly wrong. Unbounded retry is how a task quietly consumes its entire budget converging on nothing, and it is the single most common way agent platforms lose money.

## Acceptance criteria

- [ ] A run cannot start without policy decision, budget reservation, and task token.
- [ ] No step can be skipped, proven by a test attempting each skip.
- [ ] A stale `from_state` returns 409 and does not advance the run.
- [ ] A crashed run resumes from its last checkpoint without duplicating side effects.
- [ ] `continue=false` from budget-guard stops the run and produces a partial outcome.
- [ ] A failed evaluation returns to plan at most once before escalating.
- [ ] The orchestrator has no code path that calls a tool or invokes a model directly.
