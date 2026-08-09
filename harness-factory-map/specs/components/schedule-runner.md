---
id: schedule-runner
name: Schedule Runner
entity_type: component
plane: request
scope: next
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: Fires published agents on a declared timetable with no person present, through the same invocation door a person uses.
exec_summary: The timetable. Agents that should run every morning, or every month-end, run themselves.
business_value: Recurring work is where an agent stops costing attention entirely. It is also the only mode where a quiet failure can run unnoticed for weeks, which is why it ships last.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 4
deployable_unit: repo-platform-core
module: publication
workflow_id: stage-8-trigger
workflow_order: 2
tags:
  - runtime
  - schedule
  - unattended
depends_on:
  - agent-catalogue
  - agent-deployment
  - identity-access
connects_to:
  - observability
  - outcome-delivery
  - audit-log
reference_map: []
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: identity-access
    operation: "POST /v1/identity/introspect"
    note: "Resolves the caller principal on every call; scope is never inferred from a previous one."
responsibilities:
  - Hold schedule definitions with their target deployment, fixed parameters, and service principal
  - Fire each window exactly once through the catalogue's invocation endpoint
  - Alarm on a window that could not fire, rather than skipping it silently
  - Pause a schedule whose deployment is suspended, and never resume it automatically
owns:
  - The schedule definition and the record of each firing
does_not_own:
  - The invocation record, which belongs to agent-catalogue
  - Authorisation, which happens at stage 9 exactly as for a person
  - The deployment envelope
data_owned:
  - schedule definition
  - schedule firing record
inputs:
  - A live deployment whose risk tier permits unattended running
  - A schedule definition with a named owner and a service principal
outputs:
  - One invocation per window, and a firing record for each
permissions:
  - Create invocations against the deployments its schedules name
restrictions:
  - Cannot schedule a deployment whose risk tier forbids unattended running
  - Cannot alter its own frequency, parameters, or target deployment
  - Cannot back-fill a missed window without a human decision
  - Cannot fire against a suspended deployment
failure_behaviour:
  - A window that cannot fire raises an alarm and is recorded as missed; it is never silently skipped
  - A missed window is never automatically back-filled — catch-up storms are how a schedule turns into an incident
  - A deployment suspension pauses every schedule targeting it, and resumption is a human act
open_questions:
  - "What is the maximum risk tier eligible for unattended scheduling — and does critical stay permanently ineligible?"
  - "Who is notified for a missed window at three in the morning: the platform on-call, or the business-unit owner?"
  - "Does a schedule expire on its own so that abandoned automation stops, or does it run until someone removes it?"
api_contract:
  - operation: "POST /v1/schedules"
    kind: sync-api
    caller: "The deployment owner"
    worker: schedule-runner
    request: "{ deployment_id, recurrence (cron or interval), parameters{}, service_principal_id, schedule_owner_upn, window_timeout, notify_on (failure|always) }"
    response: "201 { schedule_id, next_fire_at, status: active }"
    frequency: rare
    retrofit: migration
    idempotency: "deployment_id + recurrence + parameters hash"
    timeout: 5s
    auth: "Entra ID; the named deployment owner only"
    failure: "422 when the deployment's risk tier forbids unattended running, or when parameters fail its declared input contract; 424 when the deployment is not live"
  - operation: "POST /v1/schedules/{schedule_id}/pause"
    kind: async-event
    caller: "The schedule owner, or a deployment suspension event"
    worker: schedule-runner
    request: "{ schedule_id, reason (owner_request|deployment_suspended|repeated_failure) }"
    response: "200 { schedule_id, status: paused, paused_at }"
    frequency: rare
    retrofit: refactor
    idempotency: "Repeat pause is a no-op returning the original timestamp"
    timeout: 2s
    auth: "Entra ID for the owner, workload identity for a suspension event"
    failure: "A pause that cannot be written is escalated as an incident and the schedule is treated as paused by the firing loop"
  - operation: "GET /v1/schedules"
    kind: query
    caller: "The deployment owner, observability, team-lifecycle"
    worker: schedule-runner
    request: "{ filter{ deployment_id?, owner?, status? } }"
    response: "200 { schedules[{ schedule_id, deployment_id, recurrence, status, last_fire_at, last_outcome, missed_windows_30d, next_fire_at }] }"
    frequency: per-day
    retrofit: refactor
    timeout: 1s
    auth: "Entra ID or workload identity"
    failure: "404 for unknown; missed_windows_30d is always populated, never omitted when zero"
events_emitted:
  - schedule.fired
  - schedule.window_missed
  - schedule.paused
events_consumed:
  - deployment.suspended
  - run.completed
slo:
  availability: "99.5%; a missed window must be visible, not silently absorbed"
  latency: "Fires within 60s of its declared window"
cost:
  monthly_usd_low: 10
  monthly_usd_high: 25
  driver: "Number of active schedules and firings per month"
  note: "Cheap to run and expensive to get wrong. The infrastructure is a timer; the cost that matters is the model spend of every run it starts, which is attributed to the deployment, not here."
  azure:
    - service: Azure Functions
      sku: "Consumption, timer trigger with durable state"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: false
    - service: Azure Service Bus
      sku: "Standard, firing queue with duplicate detection"
      monthly_usd_low: 5
      monthly_usd_high: 10
      note: "Duplicate detection is what makes exactly-once-per-window real."
      shared: true
---

# Schedule Runner

## Caller and worker

The **deployment owner defines a schedule**; this component **calls the catalogue's invocation endpoint** on each window, as any caller would.

It has no privileged path. A scheduled run is authorised at stage 9 against the same envelope, with the same four checks, as a run a person started. The only difference is which identity is on the record.

## Why this ships in wave 4 and not with the catalogue

An attended run has a human already looking at the result. That is the cheapest and most reliable oversight mechanism the platform will ever have, and unattended running removes it.

Before a schedule is safe you need to know what a bad run looks like without being told — which requires operating history, health thresholds calibrated against real outcomes, and automatic suspension that has been seen to work. All three come from running attended traffic first. Shipping schedules alongside self-serve would mean setting those thresholds by guess, on the traffic where a wrong guess runs unwatched.

## Missed windows are loud, and are never back-filled

Two rules, and the second one is the counter-intuitive one.

A window that could not fire raises an alarm and is recorded as missed. Silence here is the specific failure that makes people distrust the platform: a report that stopped arriving three weeks ago, that everyone assumed was fine because nothing said otherwise.

But a missed window is not automatically re-run. A platform that catches up on its backlog after an outage does so at the worst possible moment — every schedule firing at once, into a system that has just come back, on budgets sized for a normal day. That is a self-inflicted incident on top of the original one. Whether a missed run matters is a judgement about the work, and it belongs to the person who owns it.

## Suspension propagates, resumption does not

When a deployment suspends itself, every schedule pointing at it pauses. When somebody resumes the deployment, the schedules stay paused until a person restarts them.

The asymmetry is the same one that governs the deployment itself, applied one level up. Automation that reactivates on its own removes the moment where a human confirms the underlying problem was actually fixed — and a schedule quietly resuming is a great deal harder to notice than an agent quietly resuming.

## Acceptance criteria

- [ ] A schedule cannot target a deployment whose risk tier forbids unattended running.
- [ ] A firing produces an invocation structurally identical to a human-initiated one.
- [ ] Each window fires exactly once, proven under duplicate delivery.
- [ ] A window that cannot fire alarms and is recorded as missed, proven by test.
- [ ] No missed window is automatically back-filled.
- [ ] A deployment suspension pauses its schedules, and resuming the deployment does not resume them.
- [ ] A schedule cannot alter its own frequency, parameters, or target.
