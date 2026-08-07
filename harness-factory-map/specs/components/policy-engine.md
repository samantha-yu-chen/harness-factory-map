---
id: policy-engine
name: Policy Engine
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: restricted
description: Deny-by-default runtime authorisation that decides whether a specific action, by a specific identity, on specific data, may proceed now.
exec_summary: The automatic gatekeeper that checks every action an agent tries to take against the rules, in real time.
business_value: Governance decisions are made quarterly by people. This is what makes them true thousands of times a day.
owner: platform-security
human_accountable: Chief Information Security Officer
build_wave: 2
deployable_unit: repo-identity
module: policy
workflow_id: stage-5-governance
workflow_order: 4
tags:
  - policy
  - authorisation
  - control
depends_on:
  - task-contract
  - agent-team-registry
  - identity-access
connects_to:
  - agent-catalogue
  - agent-deployment
  - tool-gateway
  - team-orchestrator
  - audit-log
serves_stages:
  - stage-9-authorise
reference_map: []
consumes:
  - from: agent-deployment
    operation: "GET /v1/deployments/{deployment_id}/envelope"
    note: "The envelope bounds what a published agent may be permitted to do."
responsibilities:
  - Authorise each production invocation against the deployment envelope intersected with the caller entitlements
  - Evaluate versioned policy rules against a concrete request
  - Return allow, deny, or escalate with a citable rationale
  - Derive the permission envelope for a task from its contract and team scope
  - Cite the governance decision or rule version behind every allow
owns:
  - Policy decisions and the rule set version
does_not_own:
  - The business decision to fund a team, which belongs to governance-board
  - Credential issuance, which belongs to identity-access
  - The content of enterprise knowledge
data_owned:
  - policy decision
  - policy rule set version
inputs:
  - A signed contract, a team scope, an identity, and a proposed action
outputs:
  - An allow, deny, or escalate decision with rationale and cited rule version
permissions:
  - Read policy rules, contracts, team scopes, and identity context
restrictions:
  - Deny by default — anything not explicitly permitted is denied
  - Cannot treat retrieved prose as a policy rule
  - Cannot widen a governance decision or a team scope
  - Cannot be influenced by model output or by agent-supplied context
failure_behaviour:
  - An unavailable rule set denies; there is no cached-permissive mode
  - An unevaluable condition denies and raises an escalation, never proceeds on a partial match
  - A rule set that fails its own consistency check is not loaded, and the previous version keeps serving
open_questions:
  - Which rules genuinely need a human escalation path rather than a hard deny, and who staffs that queue out of hours?
api_contract:
  - operation: "POST /v1/policy/decisions"
    kind: sync-api
    caller: team-orchestrator
    worker: policy-engine
    request: "{ contract_id, contract_version, team_id?, principal, requested_scope{ tools[], data_domains[], systems[] } }"
    response: "201 { policy_decision_id, verdict (allow|deny|escalate), granted_scope{}, rationale, rule_set_version, cited_governance_decision_id?, expires_at }"
    idempotency: "contract_id + contract_version + principal + rule_set_version"
    timeout: "2s; a timeout is a deny"
    auth: "Workload identity; only the orchestrator may request a task-level decision"
    failure: "Every failure path denies. There is no response shape that means 'proceed anyway'."
  - operation: "POST /v1/policy/check"
    kind: sync-api
    caller: tool-gateway
    worker: policy-engine
    request: "{ policy_decision_id, tool, operation, target_resource, classification }"
    response: "200 { verdict (allow|deny), rationale, rule_id }"
    idempotency: "Read-only evaluation; safe to repeat and always re-evaluated, never cached by the caller"
    timeout: "200ms; a timeout is a deny"
    auth: "Workload identity"
    failure: "Deny on any error, including an unparseable target resource; the tool gateway must fail the call, not retry it unchecked"
  - operation: "POST /v1/policy/rule-sets"
    kind: sync-api
    caller: "Platform security engineer, through change control"
    worker: policy-engine
    request: "{ rules[], effective_from, change_reference, author_upn }"
    response: "201 { rule_set_version, consistency_check: passed, shadow_results{} }"
    idempotency: "change_reference"
    timeout: 30s
    auth: "Entra ID; policy-author role, and never an agent identity"
    failure: "422 when the consistency check fails; a rule set that would deny currently-allowed critical paths is reported in shadow_results and requires explicit confirmation"
  - operation: "POST /v1/policy/invocations"
    kind: sync-api
    caller: agent-catalogue
    worker: policy-engine
    request: "{ invocation_id, deployment_id, caller_upn, parameters{}, requested_at }"
    response: "200 { decision (allow|deny), effective_scope{ tools[], data_domains[], systems[] }, rule_set_version, reason }"
    idempotency: "invocation_id; the decision is recorded once and replayed"
    timeout: 500ms
    auth: "Workload identity"
    failure: "Denies when the deployment envelope cannot be read, when the caller lacks the access the run would exercise, or when the rule set version is unavailable — it never falls back to a cached permissive decision"
events_emitted:
  - policy.decision.issued
  - policy.decision.denied
  - policy.decision.revoked
  - policy.rule_set.published
events_consumed:
  - team.suspended
  - contract.superseded
slo:
  availability: "99.95%; unavailability denies, so this is effectively a platform availability ceiling"
  latency: "p95 under 50 ms for a per-call check"
  throughput: "200 checks per second"
cost:
  monthly_usd_low: 20
  monthly_usd_high: 50
  driver: "Per-tool-call check volume; assumes 30–100 checks per task"
  note: "Latency-sensitive and always on, so it does not scale to zero. Evaluate rules in-process with a cached rule set rather than reaching for a separate policy product — at this rule count the operational cost of another system exceeds its benefit."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 1 vCPU / 2 GiB, minimum two replicas"
      monthly_usd_low: 20
      monthly_usd_high: 50
      note: "Two replicas for availability, not throughput. The rule set is held in memory and version-pinned."
      shared: false
---

# Policy Engine

## Caller and worker

Two callers, two granularities.

- The **orchestrator** asks once per task: "what may this task do at all?" The answer is a scoped, expiring `policy_decision_id`.
- The **tool gateway** asks once per call: "may this specific action proceed?" The answer cites a rule.

The agent is never a caller. It never sees a policy decision, cannot request one, and cannot negotiate with one.

## Deny by default, and everywhere

Every failure path in this component denies: rule set unavailable, condition unevaluable, timeout, unparseable resource, ambiguous match. There is no response that means "proceed anyway" and no cached-permissive fallback.

This makes policy-engine availability a hard ceiling on platform availability, and that is the intended trade. The alternative — degrading to permissive so work keeps flowing — means the platform is least controlled exactly when it is least healthy.

## Policy is not prose

`retrieval-service` can return the risk-and-controls document. That document *describes* a control. This component *enforces* one, from versioned, structured rules.

Keeping them separate is what stops an agent being argued out of a control by a well-phrased prompt. A rule is a rule because it is in the rule set, not because a document said so and a model agreed. This is the concrete meaning of "policy and knowledge are different".

## Rule changes go through shadow evaluation

Publishing a rule set runs it in shadow against recent traffic and reports what *would* have changed. A rule set that would newly deny currently-allowed critical paths requires explicit confirmation.

Policy changes are the highest-blast-radius change in the platform: a well-intentioned tightening at 4pm on a Thursday can halt every agent run in the company. Shadow results turn that from a discovery into a decision.

## The chain of authority

```
governance-board decision  →  team scope in the registry  →  policy decision for a task  →  per-call check
        (quarterly, human)         (durable, bounded)            (per task, expiring)        (per call, cited)
```

Authority only narrows as it moves right. No step can widen what the step before it granted, and every allow at the far right can be traced back to a named quorum on a dated record. That traceability is the whole point of separating these four components.

## Acceptance criteria

- [ ] Every failure mode denies, each covered by a test that goes red if the fail-closed line is removed.
- [ ] An agent identity cannot obtain or influence a policy decision.
- [ ] A granted scope never exceeds the team scope or the governance decision it cites.
- [ ] Per-call checks are re-evaluated, never cached by the caller.
- [ ] Retrieved document text cannot be used as a policy rule, proven by test.
- [ ] Rule set publication runs shadow evaluation and requires confirmation for new denials.
- [ ] Team suspension and contract supersession revoke outstanding decisions.
