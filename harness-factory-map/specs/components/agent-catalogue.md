---
id: agent-catalogue
name: Agent Catalogue
entity_type: component
plane: request
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: The self-serve surface where an employee finds a published agent, sees what it does and costs, and runs it — and the single door every invocation enters through.
exec_summary: The shop front. People browse what the agents can do for them, and press go.
business_value: This is where the platform's value is actually collected. An agent nobody can find is an agent nobody uses, and the build cost is sunk either way.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 3
deployable_unit: repo-platform-core
module: publication
workflow_id: stage-8-trigger
workflow_order: 1
tags:
  - runtime
  - self-serve
  - discovery
depends_on:
  - agent-deployment
  - identity-access
connects_to:
  - schedule-runner
  - policy-engine
  - team-orchestrator
  - request-intake
  - solution-registry
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
  - from: policy-engine
    operation: "POST /v1/policy/invocations"
    note: "Every invocation from the catalogue is authorised before a run is created."
responsibilities:
  - Show each entitled caller the deployments they may run, with purpose, declared inputs, cost per run, owner, version, and recent reliability
  - Accept a parameterised invocation and validate it against the deployment's declared inputs
  - Be the single entry point for every invocation, attended or scheduled
  - Route a request no deployment covers back to stage 1 intake rather than accepting it
owns:
  - The catalogue entry presentation and the invocation record
does_not_own:
  - Whether an invocation is permitted, which is policy-engine at stage 9
  - The deployment envelope, which belongs to agent-deployment
  - Execution
data_owned:
  - catalogue entry
  - invocation record
inputs:
  - Live deployments and their declared inputs
  - A caller's identity and entitlements
outputs:
  - A validated invocation bound to one deployment version, awaiting authorisation
permissions:
  - Read deployments and caller entitlements
  - Create invocation records
restrictions:
  - Cannot list or accept an invocation for a suspended, draft, or deprecated deployment
  - Cannot accept a parameter the deployment does not declare
  - Cannot authorise the invocation it created
failure_behaviour:
  - An unreadable deployment record hides the entry rather than showing it as runnable
  - A parameter failing the declared input contract is rejected with the reason, before any spend
  - Catalogue unavailability stops new invocations and does not affect running ones
open_questions:
  - "Are declared inputs strictly enumerated, or may a deployment accept free text — and if so, what stops scope growing through that field?"
  - "Does the catalogue show a caller entries they are not entitled to run, so they know to ask, or hide them entirely?"
  - "Who writes the plain-language description of what an agent does — the builder, or the business-unit owner who has to answer for it?"
api_contract:
  - operation: "GET /v1/catalogue"
    kind: query
    caller: "An employee through the portal"
    worker: agent-catalogue
    request: "{ caller_upn, filter{ business_unit?, domain?, query? } }"
    response: "200 { entries[{ deployment_id, name, what_it_does, declared_inputs[], typical_cost_usd, risk_tier, owner, live_version, success_rate_30d, last_success_at, entitled: boolean }] }"
    timeout: 2s
    auth: "Entra ID; entries are filtered by the caller's entitlements"
    failure: "A deployment whose record cannot be read is omitted rather than shown as runnable; an empty catalogue is a valid response, never an error"
  - operation: "POST /v1/invocations"
    kind: sync-api
    caller: "An employee through the portal, or schedule-runner"
    worker: agent-catalogue
    request: "{ deployment_id, caller_upn (or schedule principal), parameters{}, schedule_id?, requested_at }"
    response: "202 { invocation_id, deployment_id, package_version, status: awaiting_authorisation }"
    idempotency: "caller_upn + deployment_id + parameters hash within a 60s window; a schedule firing is idempotent on schedule_id + window"
    timeout: 3s
    auth: "Entra ID for a person, workload identity for a schedule principal"
    failure: "409 for a suspended or deprecated deployment; 422 when parameters fail the declared input contract; the invocation is recorded before authorisation is attempted, so a denial is still traceable"
  - operation: "GET /v1/invocations/{invocation_id}"
    kind: query
    caller: "The requester, or outcome-delivery"
    worker: agent-catalogue
    request: "{ invocation_id }"
    response: "200 { invocation_id, status (awaiting_authorisation|denied|running|awaiting_review|delivered|partial|failed), package_version, cost_usd, outcome_ref? }"
    timeout: 1s
    auth: "Entra ID; the requester, the deployment owner, or workload identity"
    failure: "404 for unknown; a denied invocation returns the denial reason in terms the requester can act on"
events_emitted:
  - invocation.created
  - invocation.rejected
events_consumed:
  - deployment.suspended
  - deployment.promoted
  - run.completed
slo:
  availability: "99.5%; a catalogue outage stops new work but breaks nothing running"
  latency: "p95 under 400 ms on browse"
cost:
  monthly_usd_low: 25
  monthly_usd_high: 70
  driver: "Employee browse traffic and invocations per month"
  note: "A read-heavy web surface. Cost is dominated by keeping a warm replica for a responsive browse experience — worth paying, because a slow catalogue is a catalogue people stop opening."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 1 vCPU / 2 GiB, minimum one replica"
      monthly_usd_low: 15
      monthly_usd_high: 40
      shared: false
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, invocation container"
      monthly_usd_low: 10
      monthly_usd_high: 30
      shared: true
---

# Agent Catalogue

## Caller and worker

**Employees browse and invoke**; `schedule-runner` **invokes through the same endpoint**; this component **records the invocation and hands it to authorisation**.

## One door, deliberately

A scheduled run does not get its own entry path. It calls `POST /v1/invocations` exactly as a person's click does, with a service principal instead of a user.

The alternative — a separate internal trigger path for automation — is the more obvious design and it is how unattended runs end up less validated than attended ones. Two paths means two places to enforce the input contract, two places to record the invocation, and one of them will be the one nobody exercised. Since unattended runs are the ones with no human watching, the less-tested path would be carrying the higher-risk traffic.

## What an entry has to say

| Field | Why it is not optional |
| --- | --- |
| What it does, in plain language | A name alone generates support requests asking what the name means |
| Declared inputs | The caller needs to know what it will ask them for before they commit |
| Typical cost per run | The cheapest cost control the platform has is a requester who can see the number |
| Owner | Somebody to ask, who is not the platform team |
| Live version and recent success rate | Distinguishes "this works" from "this exists" |

Success rate over thirty days is the field that keeps the catalogue honest. An agent that was impressive at launch and has been failing for two weeks looks identical to a healthy one without it, and the requester finds out by wasting their afternoon.

## The refusal is a feature

When a caller wants something no deployment covers, the catalogue does not stretch a nearby agent to fit. It routes them to intake as a new request.

This is the boundary that stops deployments growing scope through their parameter fields — the quiet path by which a narrowly approved agent ends up doing something its governance decision never contemplated. Making the refusal clear and the alternative one click away is what makes it survivable for the person who just wanted their thing done.

## Entitlement filtering shows, it does not lie

A caller sees entries they cannot run, marked as not entitled, with the owner to ask. Hiding them entirely is cleaner-looking and produces a worse outcome: people conclude the platform cannot do something it does very well, and go build a shadow version.

## Acceptance criteria

- [ ] A suspended, draft, or deprecated deployment is neither listed as runnable nor invocable.
- [ ] A parameter outside the declared input contract is rejected before any spend, with a reason.
- [ ] A scheduled firing and a human click create structurally identical invocation records.
- [ ] An invocation is recorded before authorisation runs, so denials remain traceable.
- [ ] A deployment whose record cannot be read is omitted from the catalogue rather than shown.
- [ ] Cost per run and thirty-day success rate appear on every entry.
- [ ] A request no deployment covers routes to request-intake, proven by test.
