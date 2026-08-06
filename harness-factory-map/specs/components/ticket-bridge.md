---
id: ticket-bridge
name: Ticket Bridge
entity_type: external-system
plane: external
scope: mvp
status: specified
risk: low
actor_type: external
automation_level: deterministic
data_classification: internal
description: Routes simple, low-risk work to the existing enterprise service-desk system and tracks it to closure.
exec_summary: For straightforward requests, hands the job to the service desk we already have instead of spending agent time on it.
business_value: The cheapest execution route in the platform. Every request that leaves here saves a full agent run.
owner: harness-platform
human_accountable: Head of Service Management
build_wave: 2
workflow_id: stage-4-evaluate
workflow_order: 2
tags:
  - ticket
  - routing
  - external
depends_on:
  - work-classifier
connects_to:
  - outcome-ledger
  - audit-log
reference_map:
  - "Route: log to ticket system (simple / low complexity)"
responsibilities:
  - Create a ticket in the enterprise service desk from a classified contract
  - Map platform fields to the service desk's own schema
  - Track the ticket to closure and report the outcome back
owns:
  - The link between a platform request and its external ticket
does_not_own:
  - The ticket system, its workflow, or its SLAs
  - The work itself once the ticket is created
data_owned:
  - ticket linkage record
inputs:
  - A classified contract routed to the ticket path
outputs:
  - An external ticket reference and, on closure, an outcome record
permissions:
  - Create and read tickets under the platform's service account
restrictions:
  - Cannot close, reassign, or re-prioritise a ticket — the service desk owns its own workflow
  - Cannot create a ticket for work the classifier did not route here
failure_behaviour:
  - Service-desk unavailability queues the creation and retries with backoff; the requester is told the ticket is pending, not that it exists
  - A ticket that cannot be created after the retry window escalates to human triage with the contract attached
  - A ticket closed outside the platform is reconciled on the next poll and its outcome recorded
open_questions:
  - Which service desk is the target — ServiceNow, Jira Service Management, or both during transition?
  - Does the service desk expose closure webhooks, or must the bridge poll?
api_contract:
  - operation: "POST /v1/tickets"
    kind: sync-api
    caller: work-classifier
    worker: ticket-bridge
    request: "{ contract_id, decision_id, requester_upn, summary, description, business_unit, priority_hint }"
    response: "202 { linkage_id, status: creating, external_ref? }"
    idempotency: "contract_id; a repeat returns the existing linkage and external reference"
    timeout: "10s to accept; creation is asynchronous"
    auth: "Workload identity"
    failure: "422 when the contract was not routed to the ticket path; queued-and-retried on service-desk unavailability, never reported as created until it is"
  - operation: "ticket.status.poll"
    kind: batch-job
    caller: Scheduler
    worker: ticket-bridge
    request: "{ since }"
    response: "{ reconciled_count, closed[], still_open[] }"
    idempotency: "Poll window; re-polling is safe"
    timeout: "5m per run"
    failure: "A failed poll leaves the previous known state and alerts after three consecutive failures"
  - operation: "GET /v1/tickets/{contract_id}"
    kind: query
    caller: "Requester, outcome-ledger"
    worker: ticket-bridge
    request: "{ contract_id }"
    response: "200 { linkage_id, external_ref, external_status, opened_at, closed_at?, resolution? }"
    timeout: 3s
    auth: "Entra ID; requester or platform role"
    failure: "404 for unknown; external status is reported as last-known with its timestamp, never as current when the poll is stale"
events_emitted:
  - ticket.created
  - ticket.closed
  - ticket.creation_failed
events_consumed:
  - classification.completed
slo:
  availability: "99%; the platform's availability does not depend on the service desk's"
  latency: "Ticket visible to the requester within 5 minutes"
cost:
  monthly_usd_low: 5
  monthly_usd_high: 20
  driver: "Ticket volume; the service desk itself is already licensed by the enterprise"
  note: "Nearly free to run and the highest-leverage route in the platform. If this component is rarely used, that is a finding about the classifier's calibration, not a sign the bridge was unnecessary."
  azure:
    - service: Azure Functions
      sku: "Consumption plan, timer-triggered poller and HTTP creator"
      monthly_usd_low: 5
      monthly_usd_high: 20
      shared: false
---

# Ticket Bridge

## Caller and worker

`work-classifier` **calls**; this component **creates and tracks**. Beyond creation, the service desk is the worker and this component is a passive observer.

That passivity is the design. The service desk has its own workflow, its own SLAs, its own approval chains, and its own political ownership. A bridge that tries to drive it will fight all four, and will lose.

## Report pending, never optimistic

Creation is asynchronous, and the requester is told the ticket is *pending* until it demonstrably exists.

The tempting shortcut — report success on enqueue — produces the worst possible failure: a requester holding a reference number for a ticket nobody can find, at the exact moment the service desk was having a bad day. Honest pending is cheaper than confident wrong.

## The reconciliation problem

Tickets get closed by humans in the service desk, not through this platform. So closure arrives by poll or webhook, and there is always a window where the platform's view is stale.

The contract handles this by reporting `external_status` as last-known with its timestamp. Never present a stale status as current — the whole learning loop downstream depends on outcome data being honestly dated.

## Why this route matters most

This is the cheapest route in the platform, by roughly two orders of magnitude against an agent run. The strategic question for leadership is not "how do we do more with agents" but "what fraction of demand should never have reached an agent at all".

A ticket-route share that falls quarter over quarter is a signal worth investigating before the model bill makes the point for you.

## Acceptance criteria

- [ ] A ticket is only reported as created once it demonstrably exists in the service desk.
- [ ] The bridge never closes, reassigns, or re-prioritises a ticket.
- [ ] Creation for a contract not routed here is rejected.
- [ ] Repeat creation for the same contract returns the existing linkage.
- [ ] External status is always reported with its observation timestamp.
- [ ] Service-desk unavailability never blocks the platform, only this route.
- [ ] Closure outcomes flow to outcome-ledger with the same shape as agent-delivered outcomes.
