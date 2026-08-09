---
id: agent-team-registry
name: Agent Team Registry
entity_type: component
plane: governance
scope: next
status: specified
risk: high
actor_type: deterministic-system
automation_level: human-approves
data_classification: confidential
description: The register of approved dedicated agent teams, carrying owner, scope, budget ceiling, review date, and kill switch.
exec_summary: The list of permanent agent teams we run, who owns each one, what it may spend, and how to switch it off.
business_value: An agent team that is not registered cannot be monitored, budgeted, reviewed, or turned off. This component is what "governed" actually means.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 3
deployable_unit: repo-platform-core
module: governance
workflow_id: stage-5-governance
workflow_order: 2
tags:
  - governance
  - registry
  - lifecycle
depends_on:
  - governance-board
connects_to:
  - agent-deployment
  - solution-registry
  - policy-engine
  - team-orchestrator
  - team-lifecycle
  - identity-access
  - audit-log
reference_map:
  - APPROVED — spin up dedicated agent team (registered, monitored, governed)
consumes:
  - from: identity-access
    operation: "POST /v1/identity/revoke"
    note: "Suspending a team must invalidate its in-flight grants, not just future ones."
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: agent-package
    operation: "GET /v1/packages/{package_id}/versions/{version}"
    note: "Registration pins an exact package version."
responsibilities:
  - Hand a registered team to agent-deployment for binding to a package version and a business unit
  - Register a team only against an approved governance decision
  - Hold owner, scope, budget ceiling, review date, and current status
  - Publish capability descriptions so the team becomes discoverable for reuse
  - Provide an immediate, auditable kill switch
owns:
  - The team register
does_not_own:
  - The governance decision, which belongs to governance-board
  - The team's package definition, which belongs to agent-package
  - Execution
data_owned:
  - registered team entry
inputs:
  - An approved governance decision
  - Package version references from agent-package
outputs:
  - A registered, discoverable, monitorable team entry
  - Suspension and revocation signals
permissions:
  - Create and update register entries under an approved decision
  - Trigger credential revocation for a suspended team
restrictions:
  - Cannot register a team without a live governance decision
  - Cannot widen a team's scope beyond its governance decision
  - Cannot silently extend a review date
failure_behaviour:
  - A team past its review date is suspended automatically; suspension is loud, recoverable, and audited
  - A team over its budget ceiling is suspended by budget-guard and cannot self-resume
  - Registry unavailability blocks new team activation but does not stop running tasks
open_questions:
  - Should suspension pause in-flight tasks or let them finish under the existing grant?
  - What is the grace period between a review becoming due and automatic suspension?
api_contract:
  - operation: "POST /v1/teams"
    kind: sync-api
    caller: governance-board
    worker: agent-team-registry
    request: "{ governance_decision_id, name, capability_description, owner_upn, scope{ tools[], data_domains[], systems[] }, monthly_budget_ceiling_usd, review_date, package_version }"
    response: "201 { team_id, status: active, effective_from }"
    frequency: rare
    retrofit: migration
    idempotency: "governance_decision_id; one team per decision"
    timeout: 5s
    auth: "Workload identity, invoked only by the governance-board service"
    failure: "422 when the requested scope exceeds the governance decision; 409 when the decision already has a team; never registers without a live decision"
  - operation: "POST /v1/teams/{team_id}/suspend"
    kind: sync-api
    caller: budget-guard, team-lifecycle, or the team owner
    worker: agent-team-registry
    request: "{ team_id, reason (budget|review_overdue|owner_request|incident), note }"
    response: "200 { team_id, status: suspended, suspended_at, credentials_revoked: boolean }"
    frequency: rare
    retrofit: refactor
    idempotency: "Repeat suspension is a no-op returning the original timestamp"
    timeout: "3s; credential revocation is triggered synchronously"
    auth: "Workload identity, or Entra ID for the named owner"
    failure: "Suspension is best-effort immediate and guaranteed within the token TTL ceiling; a failed credential revocation escalates as an incident, never as a warning"
  - operation: "POST /v1/teams/{team_id}/resume"
    kind: human-decision
    caller: "The team owner, with governance acknowledgement"
    worker: agent-team-registry
    request: "{ team_id, resolution_note, new_review_date?, acknowledged_by }"
    response: "200 { team_id, status: active, review_date }"
    frequency: rare
    retrofit: refactor
    idempotency: "team_id + resolution_note"
    timeout: "No technical timeout"
    auth: "Entra ID; the named owner, and for a budget suspension the governance sponsor as well"
    failure: "403 when the suspension reason requires an acknowledgement the caller cannot give; a team never resumes itself"
  - operation: "GET /v1/teams/{team_id}"
    kind: query
    caller: solution-registry, policy-engine, team-orchestrator, team-lifecycle
    worker: agent-team-registry
    request: "{ team_id }"
    response: "200 { team_id, name, owner, scope{}, status, budget_ceiling_usd, spend_to_date_usd, review_date, package_version, governance_decision_id }"
    frequency: per-run
    retrofit: refactor
    timeout: 1s
    auth: "Workload identity"
    failure: "404 for unknown; a suspended team returns status suspended and callers must honour it"
events_emitted:
  - team.registered
  - team.suspended
  - team.resumed
  - team.scope_changed
  - registry.entry.upserted
events_consumed:
  - governance.decision.approved
  - budget.ceiling.breached
  - lifecycle.review.overdue
slo:
  availability: "99.9%; every task start reads this"
  latency: "p95 under 200 ms"
cost:
  monthly_usd_low: 10
  monthly_usd_high: 30
  driver: "Number of registered teams and task-start reads"
  note: "Small store, high read rate. Cache team entries at the orchestrator with a short TTL, but never cache past a suspension event — that is the one read where staleness has a real cost."
  azure:
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, team register container"
      monthly_usd_low: 5
      monthly_usd_high: 20
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, minimum one replica"
      monthly_usd_low: 5
      monthly_usd_high: 10
      note: "On the task-start critical path, so it does not scale to zero."
      shared: false
---

# Agent Team Registry

## Caller and worker

`governance-board` **registers**; `budget-guard` and `team-lifecycle` **suspend**; the **owner resumes**; four components **read on every task start**.

The asymmetry is deliberate and is the core of the design: suspension can be triggered by a machine, resumption always requires a human. Anything that can switch itself back on is not a control.

## Registered means four things

A team entry is only meaningful if it carries all four:

1. **An owner** — a person, not a distribution list. Distribution lists do not review, and do not answer pages.
2. **A scope** — the tools, data domains, and systems the team may touch, bounded by its governance decision.
3. **A budget ceiling** — a monthly number that `budget-guard` enforces.
4. **A review date** — a date after which the team suspends itself.

Drop any one and the register becomes a list. Drop the review date in particular and the platform accumulates teams that nobody has looked at since the quarter they were approved, still running against a process that changed twice since.

## Scope cannot exceed its decision

Registration validates the requested scope against the governance decision and rejects any widening. A team that needs more scope goes back to stage 5.

This is the rule that keeps the audit chain intact: every permission the platform grants at runtime traces back through the team scope, through the governance decision, to a named quorum on a dated record.

## Suspension is loud

A suspended team stops matching in `solution-registry`, stops receiving tasks from the orchestrator, and has its credentials revoked through `identity-access`. Its owner is notified, and so is its governance sponsor.

Nothing about it is subtle. A quiet degradation — still matching but failing at runtime — would produce exactly the confusing failure this design exists to avoid.

## Acceptance criteria

- [ ] No team is registered without a live governance decision.
- [ ] A requested scope exceeding its governance decision is rejected.
- [ ] Suspension triggers credential revocation and a failed revocation raises an incident.
- [ ] A team cannot resume itself; a budget suspension additionally needs the governance sponsor.
- [ ] A team past its review date is suspended automatically, with prior notice to its owner.
- [ ] Suspended teams stop matching in solution-registry, proven by test.
- [ ] Every register change is written to audit-log.
