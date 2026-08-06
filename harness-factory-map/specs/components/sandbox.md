---
id: sandbox
name: Sandbox
entity_type: component
plane: execution
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Isolated, ephemeral, network-restricted execution environment in which every agent step runs.
exec_summary: A sealed workspace where agent work happens, with no way out except through the approved door.
business_value: Isolation is what makes it acceptable to let a model run code at all. Without it, every other control is advisory.
owner: platform-security
human_accountable: Chief Information Security Officer
build_wave: 1
workflow_id: stage-6-execution
workflow_order: 4
tags:
  - sandbox
  - isolation
  - execution
depends_on:
  - team-orchestrator
connects_to:
  - tool-gateway
  - observability
  - audit-log
reference_map: []
responsibilities:
  - Provide a fresh, isolated environment per step
  - Restrict egress to the tool gateway only
  - Enforce CPU, memory, disk, and wall-clock limits
  - Destroy the environment and its filesystem when the step ends
owns:
  - Isolation boundaries and resource limits
does_not_own:
  - What runs inside it
  - The tool permission model
data_owned:
  - sandbox session record
inputs:
  - A step to execute, its resource limits, and its deadline
outputs:
  - Step stdout, artifacts to be staged, exit status, and resource usage
permissions:
  - Create and destroy ephemeral compute
restrictions:
  - Egress is default-deny; only the tool gateway endpoint is reachable
  - No persistent volume survives a step
  - No sandbox shares state with another sandbox
  - The task token is injected at start and never written to the filesystem
failure_behaviour:
  - Exceeding a resource limit terminates the sandbox and reports the limit that was hit
  - Deadline expiry terminates and stages whatever artifacts existed at that point
  - A sandbox that cannot be provably destroyed raises an incident; leaked environments are never reused
open_questions:
  - Does the risk team require hardware-level isolation (Confidential Containers) for restricted-classification tasks, or is container isolation with default-deny egress sufficient?
api_contract:
  - operation: "POST /v1/sandbox/sessions"
    kind: sync-api
    caller: team-orchestrator
    worker: sandbox
    request: "{ run_id, step, image_ref, resource_limits{ cpu, memory_gb, disk_gb, wall_clock_s }, task_token, egress_allowlist (tool-gateway only) }"
    response: "201 { session_id, endpoint, expires_at }"
    idempotency: "run_id + step + attempt"
    timeout: "60s to provision"
    auth: "Workload identity"
    failure: "503 when capacity is unavailable, which the orchestrator queues rather than downgrading isolation; an egress allowlist naming anything other than the tool gateway is rejected"
  - operation: "DELETE /v1/sandbox/sessions/{session_id}"
    kind: sync-api
    caller: team-orchestrator
    worker: sandbox
    request: "{ session_id, reason }"
    response: "200 { destroyed: true, artifacts_staged[], usage{} }"
    idempotency: "session_id"
    timeout: 30s
    auth: "Workload identity"
    failure: "A destruction that cannot be confirmed raises an incident; the session is quarantined, never returned to the pool"
events_emitted:
  - sandbox.started
  - sandbox.limit_exceeded
  - sandbox.destroyed
  - sandbox.destruction_failed
events_consumed: []
slo:
  availability: "99.5%"
  latency: "p95 under 20s to provision a warm-pool session"
  throughput: "20 concurrent sessions"
cost:
  monthly_usd_low: 35
  monthly_usd_high: 110
  driver: "Sandbox seconds per month; assumes 500 tasks with several steps each"
  note: "A small warm pool trades a fixed monthly cost against 20-second cold starts on every step. At MVP volume the cold start is usually acceptable — measure before paying for the pool."
  azure:
    - service: Azure Container Apps Jobs
      sku: "Consumption, per-step ephemeral job, egress via NAT with a default-deny NSG"
      monthly_usd_low: 30
      monthly_usd_high: 90
      shared: false
    - service: Azure Blob Storage
      sku: "Standard hot, artifact staging with lifecycle expiry"
      monthly_usd_low: 5
      monthly_usd_high: 20
      shared: true
---

# Sandbox

## Caller and worker

The **orchestrator provisions and destroys**; the **agent runtime lives inside**. The runtime cannot provision its own sandbox, extend its own limits, or alter its own egress rules.

## Default-deny egress is the whole control

One reachable endpoint: the tool gateway. Everything else is denied at the network layer.

This is what makes the tool gateway's authorisation meaningful. A gateway that agents are *expected* to use is a convention; a gateway that is the only reachable address is a control. The provisioning API rejects any egress allowlist naming anything else, so the constraint cannot be relaxed for one task and then quietly left relaxed.

## Ephemeral, and provably so

Fresh environment per step, destroyed at the end, no persistent volume, no state shared between sandboxes.

The awkward case is destruction failure. The tempting behaviour is to log it and move on; the correct behaviour is to quarantine the environment and raise an incident, because a sandbox that outlived its step may still hold a task token and staged data. It is never returned to a pool.

## Capacity pressure never downgrades isolation

Under capacity pressure the orchestrator queues. It does not run the step with weaker isolation, on shared compute, or with a wider egress list.

Isolation is the property that makes every other control in stage 6 trustworthy, so it is the wrong thing to trade for throughput on a busy afternoon.

## Acceptance criteria

- [ ] Egress reaches only the tool gateway, verified by a test attempting other destinations.
- [ ] A provisioning request with a wider egress allowlist is rejected.
- [ ] No volume, cache, or filesystem survives a step.
- [ ] The task token is never written to the sandbox filesystem.
- [ ] Resource-limit breach terminates and reports which limit was hit.
- [ ] Unconfirmed destruction quarantines the session and raises an incident.
- [ ] Capacity pressure queues rather than degrading isolation.
