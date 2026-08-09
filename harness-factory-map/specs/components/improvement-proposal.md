---
id: improvement-proposal
name: Improvement Proposal
entity_type: component
plane: learning
scope: future
status: specified
risk: medium
actor_type: deterministic-system
automation_level: human-approves
data_classification: internal
description: Turns observed patterns into reviewed, human-approved changes to knowledge, templates, rubrics, and agent packages.
exec_summary: Where lessons from finished work become actual improvements — proposed by the system, approved by a person.
business_value: The mechanism by which the platform gets cheaper and better per run instead of merely bigger.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 4
deployable_unit: repo-platform-core
module: learning
workflow_id: stage-7-learning
workflow_order: 2
tags:
  - learning
  - improvement
  - governance
depends_on:
  - outcome-ledger
connects_to:
  - agent-package
  - knowledge-ingestion
  - work-classifier
  - governance-board
  - audit-log
reference_map:
  - Improve knowledge & workflows
  - Update templates, policies & agents
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: agent-package
    operation: "POST /v1/packages"
    note: "An approved proposal becomes a new package version, never an edit in place."
responsibilities:
  - Raise a proposal from evidence, naming the change and the expected effect
  - Route each proposal to the approver its target requires
  - Track a proposal from raised to applied or rejected
  - Measure whether an applied change had its expected effect
owns:
  - The improvement backlog and proposal lifecycle
does_not_own:
  - The targets it proposes changes to
  - Approval authority
data_owned:
  - improvement proposal
inputs:
  - Patterns and metrics from the outcome ledger
outputs:
  - Evidence-backed proposals, and post-change effect measurements
permissions:
  - Read outcomes, metrics, and current target definitions
  - Write proposals to a backlog
restrictions:
  - Cannot apply any change itself, to any target
  - Cannot raise a proposal without evidence linked to specific outcomes
  - A proposal touching policy or permissions must route to governance, never to a platform engineer
failure_behaviour:
  - A proposal with insufficient evidence is held as a draft, not raised
  - A rejected proposal records its reason and suppresses identical re-raising for an agreed period
  - An applied change whose measured effect contradicts its expectation raises a follow-up, not a silent revert
open_questions:
  - What is the minimum evidence bar per target type — a prompt tweak and a rubric change should not need the same weight of evidence.
  - "Who reviews prompt changes: code review, or a lighter configuration path?"
api_contract:
  - operation: "POST /v1/proposals"
    kind: sync-api
    caller: outcome-ledger, or a platform engineer
    worker: improvement-proposal
    request: "{ target (knowledge|template|rubric|package|policy), summary, evidence: { pattern_id?, outcome_ids[], metric_deltas{} }, proposed_change, expected_effect }"
    response: "201 { proposal_id, status (draft|raised), required_approver_role }"
    frequency: per-day
    retrofit: migration
    idempotency: "target + content hash; re-raising an identical proposal returns the existing one"
    timeout: 5s
    auth: "Workload identity or Entra ID"
    failure: "422 without linked outcome evidence; a policy-targeted proposal that names a non-governance approver is rejected"
  - operation: "POST /v1/proposals/{proposal_id}/decision"
    kind: human-decision
    caller: "The required approver — platform engineer, data owner, or governance-board by target"
    worker: improvement-proposal
    request: "{ proposal_id, decision (approve|reject|defer), reason, apply_by? }"
    response: "200 { proposal_id, status, approver, decided_at }"
    frequency: rare
    retrofit: refactor
    idempotency: "proposal_id"
    timeout: "No technical timeout; a raised proposal is reviewed within one improvement cycle"
    auth: "Entra ID; the role named in required_approver_role, and never an agent identity"
    failure: "403 when the approver role does not match the target; approval records the decision but does not apply the change — application is a separate, attributable act"
  - operation: "POST /v1/proposals/{proposal_id}/effect"
    kind: batch-job
    caller: Scheduler
    worker: improvement-proposal
    request: "{ proposal_id, measurement_window }"
    response: "{ expected_effect, observed_effect, verdict (confirmed|contradicted|inconclusive) }"
    frequency: rare
    retrofit: refactor
    idempotency: "proposal_id + measurement_window"
    timeout: "10m"
    failure: "A contradicted effect raises a follow-up proposal; it never reverts the change automatically"
events_emitted:
  - proposal.raised
  - proposal.decided
  - proposal.effect_measured
events_consumed:
  - pattern.detected
  - metrics.published
slo:
  availability: "99%"
  latency: "Proposals raised within one day of the pattern being detected"
cost:
  monthly_usd_low: 5
  monthly_usd_high: 20
  model_usd_per_task_low: 0.1
  model_usd_per_task_high: 0.5
  driver: "Proposal volume; a model drafts the change summary from evidence"
  note: "Per-task model cost here is amortised across many tasks, not incurred per run — it appears in the per-task column only so the platform total stays honest."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, scale to zero"
      monthly_usd_low: 5
      monthly_usd_high: 20
      shared: false
---

# Improvement Proposal

## Caller and worker

`outcome-ledger` **raises**; a **named human approves**; a **separate, attributable act applies**. Three steps, deliberately not two.

Approval and application are separate because approving "we should tighten the risk rubric for finance data" is not the same act as writing the rule. Collapsing them means the approver is implicitly signing off an implementation they have not seen.

## Approver by target

| Target | Approver |
| --- | --- |
| Knowledge document | The domain's data owner |
| Template or workflow | Platform engineer |
| Classification rubric | Platform engineer plus the risk owner |
| Agent package | Package owner |
| Policy or permissions | governance-board |

The last row is non-negotiable and the API enforces it: a policy-targeted proposal naming any other approver is rejected outright.

This is the guardrail on the guardrails. Without it, the learning loop's most natural optimisation — "runs would succeed more often with wider permissions" — routes to whoever is fastest to approve.

## Evidence or it stays a draft

A proposal must link to specific outcomes and metric deltas. No evidence, no raise.

The failure this prevents is the plausible-sounding improvement backlog: fifty items generated from vibes, none traceable to a run that went wrong, all competing for the same review attention as the three that matter.

## Contradicted effects raise a follow-up

Every applied change is measured against its expected effect. When the measurement contradicts the expectation, the system raises a follow-up proposal — it does not auto-revert.

Auto-revert sounds prudent and is not: the measurement window may be wrong, the effect may be confounded, and a system that silently undoes approved changes is one nobody can reason about. A human decides, with the contradiction in front of them.

## Acceptance criteria

- [ ] A proposal without linked outcome evidence stays a draft.
- [ ] Policy-targeted proposals route only to governance-board.
- [ ] An agent identity cannot approve any proposal.
- [ ] Approval and application are separate, separately attributable acts.
- [ ] A rejected proposal suppresses identical re-raising for the agreed period.
- [ ] Every applied change has its effect measured against its expectation.
- [ ] A contradicted effect raises a follow-up and never auto-reverts.
