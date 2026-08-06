---
id: human-review-gate
name: Human Review Gate
entity_type: component
plane: assurance
scope: mvp
status: specified
risk: critical
actor_type: human
automation_level: human-approves
data_classification: confidential
description: Risk-tiered human judgement on an agent result before it is delivered, with a staffed queue and a stated service level.
exec_summary: A person checks the work before it leaves the building, with the depth of check matched to how much is at stake.
business_value: Human accountability is the platform's licence to operate. This is the component where it is actually exercised.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
workflow_id: stage-6-execution
workflow_order: 7
tags:
  - review
  - human-in-the-loop
  - assurance
depends_on:
  - evaluation-service
  - team-orchestrator
connects_to:
  - agent-deployment
  - outcome-delivery
  - outcome-ledger
  - audit-log
serves_stages:
  - stage-11-deliver
reference_map:
  - Review (human in the loop)
responsibilities:
  - Apply the review requirement from the deployment risk tier, for production runs
  - Route a result to the reviewer required by its risk tier
  - Present evaluation evidence, citations, and the contract side by side
  - Record an approve, reject, or amend verdict with a reason
  - Escalate when the review service level is breached
owns:
  - Review verdicts and the review queue
does_not_own:
  - The result being reviewed
  - The decision to fund or route the work
data_owned:
  - review verdict
inputs:
  - A step result, its evaluation verdict, evidence, citations, and the contract
outputs:
  - An approve, reject, or amend verdict with a named reviewer and a reason
permissions:
  - Assign review tasks to named humans
  - Block delivery pending a verdict
restrictions:
  - Cannot let a caller, an agent, or a request body set its own risk tier
  - An agent identity can never record a verdict
  - The requester cannot be the sole reviewer of high or critical risk work
  - A reviewer cannot approve without the evidence bundle having been served to them
failure_behaviour:
  - A breached review service level escalates to the reviewer's manager; it never auto-approves
  - An unstaffed queue blocks delivery and raises an operational alert — the platform stalls visibly rather than shipping unreviewed
  - A rejected result returns to the orchestrator with the reviewer's reason attached
open_questions:
  - How is reviewer capacity planned as volume grows, and what is the trigger to widen the low-risk auto-path?
  - Should sampled post-hoc review of low-risk work be mandatory, and at what rate?
api_contract:
  - operation: "POST /v1/reviews"
    kind: sync-api
    caller: team-orchestrator
    worker: human-review-gate
    request: "{ run_id, step_result_id, evaluation_id, contract_id, risk_tier, artifact_refs[] }"
    response: "201 { review_id, required_reviewers[], sla_due_at, status (queued|auto-approved) }"
    idempotency: "step_result_id"
    timeout: 5s
    auth: "Workload identity"
    failure: "422 when the risk tier requires a reviewer role nobody currently holds — the platform blocks rather than downgrading the requirement"
  - operation: "POST /v1/reviews/{review_id}/verdict"
    kind: human-decision
    caller: "The assigned reviewer"
    worker: human-review-gate
    request: "{ review_id, verdict (approve|reject|amend), reason, amendments? }"
    response: "200 { review_id, status: decided, decided_by, decided_at }"
    idempotency: "review_id + reviewer; a reviewer cannot vote twice"
    timeout: "SLA by risk tier: same day for medium, two working days for high"
    auth: "Entra ID; must be one of required_reviewers, and never an agent identity"
    failure: "403 when the caller is not an assigned reviewer, is an agent, or is the sole requester on high-risk work; 422 when the evidence bundle was never served to this reviewer"
  - operation: "GET /v1/reviews/queue"
    kind: query
    caller: "Reviewers, platform operators"
    worker: human-review-gate
    request: "{ reviewer_upn?, overdue_only? }"
    response: "200 { reviews: [{ review_id, risk_tier, sla_due_at, overdue, waiting_minutes }] }"
    timeout: 2s
    auth: "Entra ID; reviewer or operator role"
    failure: "Queue depth and overdue count are always available, because an unmonitored review queue is the platform's most likely silent failure"
  - operation: "POST /v1/reviews/tiered"
    kind: sync-api
    caller: team-orchestrator
    worker: human-review-gate
    request: "{ run_id, deployment_id, result_ref, evidence_ref }"
    response: "200 { required (none|reviewer|reviewer_and_domain_owner|reviewer_and_sponsor), review_id, sampled: boolean, service_level }"
    idempotency: "run_id"
    timeout: 1s
    auth: "Workload identity"
    failure: "The risk tier is read from the deployment and never from the request body; an unreadable tier is treated as the highest tier; a queue breaching its service level raises a deployment health signal rather than auto-approving"
events_emitted:
  - review.queued
  - review.verdict.recorded
  - review.sla_breached
  - review.queue_unstaffed
events_consumed:
  - evaluation.completed
slo:
  availability: "99.9% for the queue service; human turnaround is a business SLA, not a technical one"
  latency: "Medium risk same working day; high risk two working days; critical scheduled"
cost:
  monthly_usd_low: 10
  monthly_usd_high: 25
  driver: "Review volume; the infrastructure is trivial and the human time is not"
  note: "The infrastructure line is meaningless next to the real cost — reviewer hours. At 500 tasks per month with 60% requiring review, this is roughly 0.5 to 1 FTE. Budget it explicitly, because an unbudgeted review queue is what silently converts this control into a rubber stamp."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, queue and review UI served through Teams adaptive cards"
      monthly_usd_low: 10
      monthly_usd_high: 25
      shared: false
---

# Human Review Gate

## Caller and worker

The **orchestrator queues**; a **named human decides**. There is no third option and no automatic path around it above the lowest risk tier.

## Risk-tiered, and staffed

| Risk tier | Reviewer requirement | SLA |
| --- | --- | --- |
| Low | None before delivery; sampled after | Immediate |
| Medium | One named reviewer | Same working day |
| High | Named reviewer plus the domain owner | Two working days |
| Critical | Reviewer plus leadership sponsor | Scheduled |

The tier comes from `work-classifier` and cannot be lowered by the run itself.

## Never auto-approve on breach

A breached SLA escalates to the reviewer's manager. An unstaffed queue blocks delivery and raises an alert.

Both behaviours are deliberate and both are unpopular in week three, when the queue is backed up and something needs to ship. The alternative — auto-approve after N hours — converts the platform's entire human accountability story into a timer, and the first incident review will find it.

The honest framing for leadership: review capacity is a throughput constraint on the platform, exactly like compute. Plan it, budget it, and watch its queue depth.

## Evidence must be served before a verdict

A reviewer cannot approve work whose evidence bundle was never delivered to them. The bundle is the contract, the evaluation verdict per criterion, the citations the agent used, and the artifacts.

This closes the rubber-stamp path structurally rather than culturally. It does not guarantee the reviewer read it — nothing does — but it does mean an approval without the evidence having been served is a 422, not a habit.

## Watch for a pass rate that is too high

A review pass rate above roughly 98% is a finding. Either the classifier is over-routing safe work into review, or reviewers are approving without reading. Both are worth fixing and they need opposite fixes, which is why `outcome-ledger` tracks pass rate alongside median review time.

## Acceptance criteria

- [ ] An agent identity can never record a verdict, at any endpoint.
- [ ] SLA breach escalates and never auto-approves, proven by test.
- [ ] An unstaffed queue blocks delivery and alerts.
- [ ] A reviewer who was not served the evidence bundle cannot approve.
- [ ] The requester alone cannot review their own high-risk work.
- [ ] The risk tier cannot be lowered by the run being reviewed.
- [ ] Queue depth, overdue count, and median wait are always observable.
