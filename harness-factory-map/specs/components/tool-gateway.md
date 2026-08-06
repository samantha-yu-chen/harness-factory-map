---
id: tool-gateway
name: Tool Gateway
entity_type: component
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: restricted
description: The single egress point for every agent action on an external system, checked against policy and recorded on every call.
exec_summary: The only door through which agents can touch real systems — every action is checked and logged before it happens.
business_value: Every side effect this platform has on the business passes through here. It is the narrowest place to put the strongest control.
owner: platform-security
human_accountable: Chief Information Security Officer
build_wave: 1
workflow_id: stage-6-execution
workflow_order: 3
tags:
  - tools
  - egress
  - security
depends_on:
  - policy-engine
  - identity-access
connects_to:
  - sandbox
  - audit-log
  - observability
reference_map: []
responsibilities:
  - Expose an allow-listed catalogue of typed tool operations
  - Check every call against the policy engine before executing it
  - Validate arguments against the tool's schema before dispatch
  - Record every call, its arguments summary, and its effect
owns:
  - The tool catalogue and per-tool schemas
does_not_own:
  - The external systems it calls
  - The decision to make a call
  - The permission model, which it enforces rather than defines
data_owned:
  - tool call record
  - tool catalogue entry
inputs:
  - A tool invocation from an agent runtime, with a task token
outputs:
  - A typed tool result, or a denial with a cited rule
permissions:
  - Call external systems using per-tool service credentials, never the agent's own
restrictions:
  - No dynamic or arbitrary tool execution — every tool is registered, typed, and reviewed
  - No shell, no arbitrary HTTP, no code evaluation exposed as a tool
  - Cannot execute a call the policy engine did not allow
  - Cannot expand argument scope beyond what the schema declares
failure_behaviour:
  - A policy check that fails or times out denies the call; it is never retried unchecked
  - A write operation that may have partially applied is recorded as uncertain and escalated, never silently retried
  - An unavailable external system returns a typed error the agent must handle, not a fabricated success
open_questions:
  - Which write operations need a two-phase confirm-then-commit shape to make partial-failure recovery tractable?
  - How are per-tool service credentials scoped so that the gateway is not itself an over-privileged single point?
api_contract:
  - operation: "POST /v1/tools/invoke"
    kind: sync-api
    caller: agent-runtime
    worker: tool-gateway
    request: "{ run_id, policy_decision_id, tool, operation, arguments{}, task_token, side_effect (read|write) }"
    response: "200 { call_id, result, effect_recorded: boolean } or 403 { denied_by_rule_id, rationale }"
    idempotency: "run_id + tool + operation + argument hash for reads; writes require a caller-supplied idempotency key and the gateway rejects a write without one"
    timeout: "Per-tool, default 30s, maximum 120s"
    auth: "Task token, introspected on every call; scope is never inferred from a previous call"
    failure: "403 on policy denial; 409 on a missing write idempotency key; 502 with a typed error on external failure; an uncertain write returns 202 with status uncertain and raises an escalation"
  - operation: "GET /v1/tools/catalogue"
    kind: query
    caller: agent-package, agent-runtime, policy authors
    worker: tool-gateway
    request: "{ }"
    response: "200 { tools: [{ name, operations: [{ name, argument_schema, side_effect, risk_tier, requires_review }] }] }"
    timeout: 2s
    auth: "Workload identity"
    failure: "The catalogue is static and cached; it never returns a tool that is not registered and reviewed"
  - operation: "POST /v1/tools/registry"
    kind: sync-api
    caller: "Platform engineer, through change control"
    worker: tool-gateway
    request: "{ name, operations[], argument_schemas{}, service_credential_ref, risk_tier, reviewed_by }"
    response: "201 { tool_version, effective_from }"
    idempotency: "name + version"
    timeout: 10s
    auth: "Entra ID; tool-author role, never an agent identity"
    failure: "422 without a reviewer, an argument schema, or a declared side-effect class"
events_emitted:
  - tool.call.allowed
  - tool.call.denied
  - tool.write.uncertain
  - tool.registered
events_consumed:
  - policy.decision.revoked
slo:
  availability: "99.9%"
  latency: "Gateway overhead p95 under 80 ms, excluding the external system"
  throughput: "100 calls per second"
cost:
  monthly_usd_low: 25
  monthly_usd_high: 60
  driver: "Tool calls per month; assumes 30–100 calls per task"
  note: "On the hot path for every agent action, so it stays warm. The cost that actually matters here is the engineering time to type and review each tool — budget roughly a day per tool operation, and resist the pressure to ship a generic HTTP tool to avoid it."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 1 vCPU / 2 GiB, minimum two replicas"
      monthly_usd_low: 20
      monthly_usd_high: 45
      shared: false
    - service: Azure Key Vault
      sku: "Standard, per-tool service credentials"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: true
---

# Tool Gateway

## Caller and worker

`agent-runtime` **calls**; this component **checks, then executes**. It is the only component in the platform with outbound network access to enterprise systems.

Concentrating egress here is what makes the control affordable. Ten components each doing their own authorisation produces ten subtly different implementations and one of them is wrong. One gateway produces one implementation that is worth testing properly.

## Every call is checked, every time

`policy-engine` is consulted per call. The caller may not cache the verdict, and the gateway does not cache it either.

The reason is that a run is long and the world changes during it. A team gets suspended, a contract gets superseded, a governance decision gets revoked. Per-call checking is what makes revocation mean something before the token expires.

## No generic tools

There is no shell tool, no arbitrary HTTP tool, no code-evaluation tool. Every operation is registered, typed, risk-classified, and reviewed by a named person.

This constraint is the one that gets argued about, because a generic HTTP tool would make the platform capable of anything on day one. It would also make the tool catalogue meaningless, the policy rules unwriteable, and the audit record uninterpretable — "the agent made an HTTP call" tells an incident reviewer nothing.

Budget about a day of engineering per tool operation and treat that as the actual cost of a capability.

## Uncertain writes

The hardest genuine problem in this component: a write that timed out. Did it apply?

The gateway does not guess and does not retry. It returns `202` with status `uncertain`, records the call as uncertain, and escalates. A human or a reconciliation job resolves it.

Automatic retry on an uncertain write is how a platform sends the same invoice twice, and it is worth taking the availability hit to avoid.

Write operations also require a caller-supplied idempotency key, and the gateway rejects writes without one. That requirement pushes the tool authors into designing recoverable operations, which is where the problem is actually solvable.

## Acceptance criteria

- [ ] Every call consults policy-engine; no caching of verdicts by caller or gateway.
- [ ] No tool exposes shell, arbitrary HTTP, or code evaluation.
- [ ] Arguments are schema-validated before dispatch and over-scope is rejected.
- [ ] A write without an idempotency key returns 409.
- [ ] An uncertain write is never retried automatically and always escalates.
- [ ] The agent's token is never forwarded to an external system; per-tool service credentials are used.
- [ ] Every call, allowed or denied, is recorded with its rule id.
