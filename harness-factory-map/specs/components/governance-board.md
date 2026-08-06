---
id: governance-board
name: Governance Board
entity_type: decision
plane: governance
scope: next
status: specified
risk: critical
actor_type: human
automation_level: human-only
data_classification: confidential
description: The leadership decision to fund, own, and bound a proposed dedicated agent team, taken against four named criteria.
exec_summary: The meeting where leadership decides whether a new permanent agent team is worth having, who owns it, and what it may spend.
business_value: Attaches a human name to every persistent capability the platform runs. Nothing else in the map creates accountability.
owner: governance-office
human_accountable: Leadership Team sponsor
build_wave: 3
workflow_id: stage-5-governance
workflow_order: 1
tags:
  - governance
  - lt-decision
  - approval
depends_on:
  - work-classifier
  - budget-guard
connects_to:
  - agent-team-registry
  - team-orchestrator
  - audit-log
reference_map:
  - LT reviews and approves the dedicated-team proposal
  - "Criterion: strategic fit"
  - "Criterion: risk & compliance"
  - NOT APPROVED — use Harness Agent Team or ticket system instead
responsibilities:
  - Review a dedicated-team proposal against four named criteria
  - Record an approve or decline decision with explicit conditions
  - Name the accountable owner, the spending ceiling, and the review date
  - Route a declined proposal to an alternative execution path
owns:
  - The governance decision record
does_not_own:
  - Runtime authorisation of individual tool calls
  - The technical design of the team
  - Day-to-day operation of an approved team
data_owned:
  - governance decision
inputs:
  - A proposal carrying contract, four scores, cost estimate, and reuse evidence
outputs:
  - An approve or decline decision with conditions, owner, budget ceiling, and review date
permissions:
  - Approve the creation, funding, and permission scope of an agent team
restrictions:
  - Cannot approve without a named accountable human owner
  - Cannot approve an unbounded budget or an open-ended review date
  - Cannot be exercised by an agent, or by the team that authored the proposal
failure_behaviour:
  - No quorum means no decision; the proposal waits and the requester is told the date it will next be considered
  - An expired review date suspends the team rather than allowing ungoverned continuation
  - A decision that cannot be recorded in the audit log does not take effect
open_questions:
  - What value threshold lets a single sponsor approve without the full leadership team?
  - Is there a fast path for a proposal that only extends an already-approved team's scope?
api_contract:
  - operation: "POST /v1/governance/proposals"
    kind: sync-api
    caller: work-classifier
    worker: governance-board
    request: "{ contract_id, decision_id, scores{}, estimated_cost_usd, reuse_evidence, proposed_owner_upn, proposed_scope }"
    response: "201 { proposal_id, status: queued, scheduled_for }"
    idempotency: "contract_id; a resubmission creates a new revision, visibly linked to the original"
    timeout: 5s
    auth: "Workload identity"
    failure: "422 without a proposed owner; a proposal with no named owner is never queued"
  - operation: "POST /v1/governance/proposals/{proposal_id}/decision"
    kind: human-decision
    caller: "Leadership Team, in quorum"
    worker: governance-board
    request: "{ proposal_id, decision (approve|decline), criteria_notes: { strategic_fit, value_roi, risk_compliance, resourcing_ownership }, conditions[], owner_upn, monthly_budget_ceiling_usd, review_date, quorum_members[] }"
    response: "201 { governance_decision_id, effective_from }"
    idempotency: "proposal_id; a decided proposal cannot be re-decided, only superseded by a new revision"
    timeout: "No technical timeout; the proposal carries its next scheduled review date"
    auth: "Entra ID; leadership-team role, quorum enforced server-side"
    failure: "422 on a missing criterion note, an absent budget ceiling, or an absent review date; 403 for an agent identity or a proposal author; the decision is written to audit-log before it takes effect"
  - operation: "GET /v1/governance/decisions/{governance_decision_id}"
    kind: query
    caller: agent-team-registry, policy-engine, team-lifecycle, auditors
    worker: governance-board
    request: "{ governance_decision_id }"
    response: "200 { decision, conditions[], owner, budget_ceiling_usd, review_date, criteria_notes{}, quorum_members[], effective_from }"
    timeout: 2s
    auth: "Workload identity or auditor role"
    failure: "404 for unknown; a decision is never returned without its conditions"
events_emitted:
  - governance.proposal.queued
  - governance.decision.approved
  - governance.decision.declined
  - governance.review.overdue
events_consumed:
  - classification.completed
  - lifecycle.review.due
slo:
  availability: "Scheduled, not continuous. A proposal is considered within 10 working days."
  latency: "Decision recorded within 1 working day of the meeting"
cost:
  monthly_usd_low: 5
  monthly_usd_high: 15
  driver: "Proposal volume; this is people's time, not compute"
  note: "The real cost is leadership attention, not infrastructure. Design for a handful of proposals per quarter — a platform generating weekly dedicated-team proposals has a classifier calibration problem, not a governance capacity problem."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 0.25 vCPU / 0.5 GiB, scale to zero"
      monthly_usd_low: 5
      monthly_usd_high: 15
      note: "A proposal queue and a decision form. Deliberately minimal."
      shared: false
---

# Governance Board

## Caller and worker

`work-classifier` **submits**; the **Leadership Team decides**; this component is the worker that holds the record and enforces the shape of the decision.

"Enforces the shape" is the entire technical contribution. The board cannot record an approval without a named owner, a budget ceiling, and a review date — not because the system distrusts leadership, but because those three fields are the ones that get left blank in a meeting running fifteen minutes over, and their absence is what turns a governed platform into an ungoverned one eighteen months later.

## The distinction from policy-engine

These two components live in the same stage and are frequently confused. They must never share an implementation.

| | governance-board | policy-engine |
| --- | --- | --- |
| Decides | Should this team exist and be funded | May this specific call proceed right now |
| Actor | Humans in quorum | Code |
| Frequency | A few times per quarter | Thousands of times per day |
| Output | A funding and ownership decision | An allow or deny |
| Timescale | Months | Milliseconds |

The relationship runs one way: a governance decision *bounds* what policy may later allow. Policy cannot widen a governance decision, and governance does not evaluate individual calls.

## Declining is a routing decision

`decline` is not "no". It means "not as a permanent team", and the work routes to the Harness Agent Team or the ticket system.

Recording it that way — with the alternative route named in the decision — prevents the two failure modes of a bare rejection: the requester who concludes the platform will not help them, and the requester who resubmits next quarter with a value score that has mysteriously doubled.

## MVP reality

In waves 1 and 2 this runs as a scheduled human review: a template, a meeting, a written decision, filed. That is a legitimate implementation and the correct one before proposal volume justifies tooling.

The stage appears in the map from day one so the decision is never *skipped* — only performed by hand. Wave 3 adds the queue and the form.

## Acceptance criteria

- [ ] An approval without a named owner, budget ceiling, or review date is rejected.
- [ ] All four criteria carry a recorded note; none may be blank.
- [ ] An agent identity and the proposal's own author are both refused.
- [ ] Quorum is enforced server-side, not by convention.
- [ ] The decision is written to audit-log before it takes effect.
- [ ] A decline names the alternative route.
- [ ] A decided proposal cannot be re-decided, only superseded by a linked revision.
