---
id: repo-execution
name: Execution Service
entity_type: deployable-unit
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: restricted
description: The unit that runs agent work and touches the outside world — orchestration, the model runtime, the sandbox, and the single egress gateway.
exec_summary: The part of the platform that actually does the work, kept separate so a misbehaving agent cannot take anything else down with it.
business_value: This is the only unit that executes untrusted output and makes real changes to enterprise systems. Isolating it is what lets the rest of the platform be ordinary software.
owner: harness-platform
human_accountable: Head of Platform Engineering
repository: harness-execution
forcing_function: FF3-fault-isolation
modules:
  - orchestration
  - runtime
  - egress
  - isolation
tags:
  - deployable-unit
  - execution
depends_on:
  - repo-identity
connects_to:
  - repo-platform-core
responsibilities:
  - Run an approved task to completion inside a resource-bounded process
  - Execute every external action through one checked, recorded gateway
  - Contain untrusted code and untrusted model output inside a sandbox
  - Fail the run rather than widen its own scope
owns:
  - The execution process boundary and its resource limits
does_not_own:
  - Whether a task is allowed to run, which repo-identity decides
  - Whether the result is good enough, which repo-platform-core decides
restrictions:
  - Never evaluates its own authorisation; it calls repo-identity on every action
  - Never writes to the ledger or the registry directly
failure_behaviour:
  - A crash inside this unit ends the affected run and nothing else
  - An unreachable policy service stops execution rather than proceeding unchecked
open_questions:
  - Does the sandbox need its own node pool, or is a hardened container class sufficient for the MVP workload?
api_contract: []
---

# Execution Service

## Why this is a separate repository

**FF3 — fault isolation.** This unit executes model output and, through the sandbox, code that nobody reviewed. A panic, an out-of-memory, or a runaway loop here must not take down intake, governance, or the audit trail. That is a process boundary, and a process boundary is the one thing a module cannot give you.

**FF1 supports it.** The compute profile is genuinely different: long-running, bursty, memory-heavy, and the only unit with outbound network access to enterprise systems. It scales on a different curve from everything else and needs its own node constraints.

These two together are why this split is worth its cost. No other grouping in the map clears the bar this cleanly.

## Modules

| Module | Components | Public port |
|---|---|---|
| `orchestration` | team-orchestrator | Accepts an approved task contract, returns a completed run |
| `runtime` | agent-runtime, agent-package | Executes one agent turn against a packaged definition |
| `egress` | tool-gateway | The single door to external systems |
| `isolation` | sandbox | Bounded execution of untrusted code |

`egress` and `isolation` are separate modules on purpose. The gateway decides whether an action is permitted; the sandbox decides what a process is physically able to do. Collapsing them would mean one component holding both the policy answer and the containment, which is exactly the concentration this design avoids.

## What crosses the boundary

Every call out of this unit is authorisation (`repo-identity`) or reporting (`repo-platform-core`). It never reaches into another unit's data. If a contract here needs a field it does not have, the answer is a new operation on the provider, not a shared database.

## Acceptance criteria

- [ ] A crash in any module of this unit leaves the other two units serving traffic.
- [ ] No module here reads another unit's database directly.
- [ ] Every outbound action carries a policy decision obtained per call, never cached.
- [ ] The unit deploys and rolls back independently of the other two.
