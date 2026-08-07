---
id: team-lifecycle
name: Team Lifecycle
entity_type: component
plane: learning
scope: future
status: specified
risk: medium
actor_type: deterministic-system
automation_level: human-approves
data_classification: internal
description: Drives the periodic review of every registered agent team and recommends scaling, pausing, or retirement on evidence.
exec_summary: Makes sure every permanent agent team is reviewed on a schedule and switched off when it is no longer earning its place.
business_value: Retirement is the discipline that stops an agent platform accumulating cost and risk it forgot it had.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 4
deployable_unit: repo-platform-core
module: learning
workflow_id: stage-7-learning
workflow_order: 3
tags:
  - lifecycle
  - retirement
  - governance
depends_on:
  - outcome-ledger
  - agent-team-registry
connects_to:
  - governance-board
  - audit-log
reference_map:
  - Retire / scale agent teams
  - Every execution makes the system smarter
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
responsibilities:
  - Track every registered team's review date and raise the review
  - Assemble the evidence pack a reviewer needs
  - Recommend continue, scale, pause, or retire
  - Suspend a team whose review lapses
owns:
  - The team review schedule and its recommendations
does_not_own:
  - The register itself
  - The decision to retire, which belongs to the owner and governance
data_owned:
  - team review record
inputs:
  - Team register entries, outcome metrics, and spend per team
outputs:
  - A review pack, a recommendation, and a lifecycle decision record
permissions:
  - Read the register and the outcome ledger
  - Trigger suspension for a lapsed review
restrictions:
  - Cannot retire or resume a team by itself
  - Cannot extend a review date
  - Cannot recommend scaling a team that has breached its budget ceiling in the review period
failure_behaviour:
  - A review that lapses past its grace period suspends the team; suspension is loud and recoverable
  - Missing outcome data makes a recommendation inconclusive rather than defaulting to continue
  - A team with no reachable owner is suspended and escalated to its governance sponsor
open_questions:
  - What grace period sits between a review becoming due and automatic suspension?
  - Should suspension stop in-flight tasks or let them finish under the existing grant?
api_contract:
  - operation: "lifecycle.review.schedule"
    kind: batch-job
    caller: Scheduler
    worker: team-lifecycle
    request: "{ horizon_days }"
    response: "{ reviews_raised[], reviews_overdue[], teams_suspended[] }"
    idempotency: "Run date; re-running is safe and does not double-suspend"
    timeout: "10m"
    failure: "A team whose review cannot be raised because its owner is unreachable is suspended and escalated to its sponsor"
  - operation: "GET /v1/lifecycle/reviews/{team_id}"
    kind: query
    caller: "The team owner, governance-board"
    worker: team-lifecycle
    request: "{ team_id }"
    response: "200 { team_id, period, tasks_run, cost_usd, budget_ceiling_usd, review_pass_rate, escalation_rate, requester_feedback, recommendation (continue|scale|pause|retire), rationale, evidence_complete: boolean }"
    timeout: 5s
    auth: "Entra ID; team owner or governance role"
    failure: "evidence_complete=false makes the recommendation inconclusive; an inconclusive review still requires an owner decision, it does not auto-continue"
  - operation: "POST /v1/lifecycle/reviews/{team_id}/decision"
    kind: human-decision
    caller: "The team owner; governance-board for retire and scale"
    worker: team-lifecycle
    request: "{ team_id, decision (continue|scale|pause|retire), reason, new_review_date, scope_change? }"
    response: "200 { review_id, decision, next_review_date }"
    idempotency: "team_id + review period"
    timeout: "No technical timeout; the grace period governs"
    auth: "Entra ID; owner for continue and pause, governance-board for scale and retire"
    failure: "403 when scale or retire is attempted without governance; 422 when a continue decision omits a new review date — a review can never leave a team without a next date"
events_emitted:
  - lifecycle.review.due
  - lifecycle.review.overdue
  - lifecycle.decision.recorded
  - lifecycle.team.retired
events_consumed:
  - metrics.published
  - team.registered
slo:
  availability: "99%"
  latency: "Reviews raised 14 days before the due date"
cost:
  monthly_usd_low: 5
  monthly_usd_high: 15
  driver: "Number of registered teams; a scheduled job and a review pack"
  note: "Trivial to run and the highest-value governance component per dollar. The cost it controls is the accumulated run cost of teams nobody remembers approving."
  azure:
    - service: Azure Container Apps Jobs
      sku: "Consumption, scheduled daily review job"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: false
---

# Team Lifecycle

## Caller and worker

A **scheduler triggers**; this component **assembles evidence and recommends**; the **owner or governance decides**.

It has exactly one autonomous power: suspending a team whose review has lapsed past its grace period. That power is what gives review dates meaning. Everything else requires a person.

## Retirement is the skipped discipline

Every agent platform builds registration. Almost none build retirement, and the consequence is predictable: three years in, a register full of teams whose underlying processes changed, whose owners left, and whose behaviour nobody has examined since approval.

Those teams still cost money and still produce confidently wrong answers grounded in obsolete knowledge. The second failure is the expensive one.

## Four recommendations

| Recommendation | Evidence pattern |
| --- | --- |
| Continue | Steady volume, cost within ceiling, feedback positive |
| Scale | Demand exceeding capacity, strong feedback, cost per outcome falling |
| Pause | Volume near zero, or quality declining |
| Retire | No volume, or the underlying process has changed |

Scale and retire require governance, because both change the organisation's commitment. Continue and pause are the owner's call.

The rule that a budget-breaching team cannot be recommended for scaling exists because those two facts arrive together more often than you would expect — a team that is busy and over budget looks like success right up until the invoice.

## Inconclusive does not mean continue

When outcome data is incomplete, the recommendation is inconclusive and the owner still has to decide. It never silently defaults to continue.

Defaulting to continue on missing evidence is how the register fills up in the first place: nobody ever made a decision to keep the team, the system just never asked.

## Acceptance criteria

- [ ] Every registered team has a review date and it cannot be extended by this component.
- [ ] A lapsed review suspends the team after its grace period, with prior notice.
- [ ] Scale and retire require governance-board; continue and pause are the owner's.
- [ ] A continue decision without a new review date is rejected.
- [ ] Incomplete evidence produces an inconclusive recommendation, never a default continue.
- [ ] A team with no reachable owner is suspended and escalated to its sponsor.
- [ ] A team that breached its budget ceiling cannot be recommended for scaling.
