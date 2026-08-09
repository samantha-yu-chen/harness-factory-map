---
id: identity-access
name: Identity & Access
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: restricted
description: Issues scoped, short-lived, task-bound credentials for every human, service, and agent identity on the platform.
exec_summary: Makes sure every action — human or agent — is traceable to a real identity with only the access it needs, for only as long as it needs it.
business_value: Every audit, incident review, and compliance conversation about this platform starts and ends with this component.
owner: platform-security
human_accountable: Chief Information Security Officer
build_wave: 1
deployable_unit: repo-identity
module: identity
workflow_id: stage-0-enterprise-brain
workflow_order: 3
tags:
  - identity
  - security
  - platform
depends_on: []
connects_to:
  - request-intake
  - policy-engine
  - tool-gateway
  - retrieval-service
  - knowledge-ingestion
  - audit-log
serves_stages:
  - stage-9-authorise
reference_map: []
responsibilities:
  - Authenticate humans and workloads against the corporate directory
  - Mint task-scoped, time-bound tokens for agent execution
  - Hold platform secrets and rotate them
  - Resolve the access filter used by retrieval and tool calls
owns:
  - Token issuance and its scoping rules
  - Secret custody
does_not_own:
  - What a token is allowed to do — that is policy-engine
  - Business approval of an access request
data_owned:
  - platform secret
  - task execution token grant
inputs:
  - Directory identity, group membership, and workload identity
  - A policy decision naming the permitted scope
outputs:
  - Short-lived, task-bound, audience-restricted tokens
permissions:
  - Read the corporate directory
  - Issue tokens within a policy-approved scope
restrictions:
  - Never issues a token broader than the policy decision that authorised it
  - Never issues a token without an expiry
  - No agent holds a standing credential of any kind
failure_behaviour:
  - Directory unavailability denies new token issuance; existing tokens run to their natural expiry
  - A secret that fails rotation raises an incident and keeps the previous value only until its stated grace period ends
  - An unresolvable identity is denied, never downgraded to a default principal
open_questions:
  - Does an agent acting on behalf of a requester inherit that person's data access, or a narrower intersection agreed per domain?
api_contract:
  - operation: "POST /v1/identity/task-token"
    kind: sync-api
    caller: team-orchestrator
    worker: identity-access
    request: "{ task_id, policy_decision_id, requested_scopes[], on_behalf_of_upn, ttl_seconds (max 3600) }"
    response: "201 { token, expires_at, granted_scopes[], audience }"
    frequency: per-task
    retrofit: rewrite
    p95_ms: 300
    idempotency: "task_id + policy_decision_id; a repeat within the TTL returns the same grant"
    timeout: 3s
    auth: "Workload identity; only the orchestrator's identity may call this"
    failure: "403 when the requested scopes exceed the policy decision; 409 when the policy decision is revoked; never issues an unexpiring or unscoped token"
  - operation: "POST /v1/identity/introspect"
    kind: sync-api
    caller: tool-gateway, request-intake, schedule-runner, agent-catalogue
    worker: identity-access
    request: "{ token }"
    response: "200 { active: boolean, principal, on_behalf_of_upn, granted_scopes[], expires_at, task_id? }"
    frequency: per-action
    retrofit: refactor
    p95_ms: 30
    idempotency: "Read-only; the same token returns the same answer until it expires or is revoked"
    timeout: 1s
    auth: "Workload identity; a caller may introspect only tokens in its own audience"
    failure: "An unreachable directory or revocation store returns active false; an inconclusive answer is never reported as active"
  - operation: "POST /v1/identity/revoke"
    kind: sync-api
    caller: budget-guard, human-review-gate, agent-team-registry
    worker: identity-access
    request: "{ task_id | team_id, reason }"
    response: "200 { revoked_count, effective_at }"
    frequency: rare
    retrofit: refactor
    p95_ms: 500
    idempotency: "Repeat calls are safe and return the same effective time"
    timeout: 2s
    auth: "Workload identity with the revoke role"
    failure: "Revocation is best-effort immediate and guaranteed within the token TTL ceiling of 3600s; the ceiling is the actual containment guarantee"
  - operation: "GET /v1/identity/access-filter"
    kind: query
    caller: retrieval-service
    worker: identity-access
    request: "{ on_behalf_of_token }"
    response: "200 { principal, domains_readable[], max_classification }"
    frequency: per-action
    retrofit: refactor
    p95_ms: 30
    timeout: 1s
    auth: "Token introspection"
    failure: "403 on an unresolvable token; never returns a permissive default filter"
events_emitted:
  - identity.token.issued
  - identity.token.revoked
  - identity.secret.rotated
  - identity.denied
events_consumed:
  - policy.decision.revoked
slo:
  availability: "99.95%; this is the platform's hardest availability dependency"
  latency: "p95 under 300 ms for token issuance"
  recovery: "Directory outage degrades to no new tokens, not to permissive tokens"
cost:
  monthly_usd_low: 15
  monthly_usd_high: 40
  driver: "Managed identities and key operations; Entra ID licensing is assumed already owned by the enterprise"
  note: "Entra ID P1/P2 seats are not charged to this platform — the enterprise already licenses them. If Conditional Access or Privileged Identity Management is newly required for this platform, that is a separate licence conversation with the CISO, not a line item here."
  azure:
    - service: Microsoft Entra ID
      sku: "Workload identities and managed identities on the existing tenant"
      monthly_usd_low: 0
      monthly_usd_high: 10
      note: "Workload identity federation is free; premium workload-identity features are extra."
      shared: true
    - service: Azure Key Vault
      sku: "Standard, software-protected keys, low operation volume"
      monthly_usd_low: 5
      monthly_usd_high: 15
      note: "Premium HSM-backed keys roughly quadruple this if the risk team requires them."
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, minimum one replica"
      monthly_usd_low: 10
      monthly_usd_high: 15
      note: "Token broker cannot scale to zero — it is on the critical path."
      shared: false
---

# Identity & Access

## Caller and worker

Only the **orchestrator** may mint a task token, and it does so by presenting a policy decision. This is a deliberately narrow door: the component that decides *what is allowed* (`policy-engine`) is separate from the component that *issues the credential* (this one), and neither can be persuaded by an agent.

An agent never calls this component. It receives a token it did not request and cannot renew.

## No standing agent credentials

Every agent credential is minted per task, scoped to that task's approved tools and data, and expires. The maximum TTL of 3600 seconds is not a tuning parameter — it is the platform's actual blast-radius guarantee, because revocation across a distributed system is best-effort and expiry is not.

If a task legitimately needs to run longer than an hour, the orchestrator re-mints against a still-valid policy decision. That re-mint is a checkpoint where a revoked decision takes effect, which is the point.

## Fail closed, always

Every failure path in this component denies. Directory down: no new tokens. Token unresolvable: denied. Scope ambiguous: denied. There is no path that widens access under degradation, and the tests for this component exist mainly to prove that.

A platform that degrades to permissive under load is one bad afternoon away from being the subject of an incident report.

## Acceptance criteria

- [ ] No token is ever issued without an expiry and an audience.
- [ ] A requested scope exceeding its policy decision returns 403 and is audited.
- [ ] Only the orchestrator identity can call the task-token endpoint.
- [ ] The retrieval access filter cannot be influenced by any caller-supplied field.
- [ ] A directory outage produces denials, and a test proves it does not produce defaults.
- [ ] Revocation is effective immediately for new calls and bounded by the TTL ceiling for in-flight ones.
