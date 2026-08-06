---
id: execution-store
name: Execution Store
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
description: Authoritative persistence for execution state, versions, leases, and checkpoints.
owner: harness-platform
tags:
  - control
  - component
depends_on: []
connects_to:
  - orchestrator
workflow_id: bounded-engineering-ticket
responsibilities:
  - Persist execution truth
  - Enforce concurrency control
owns:
  - Execution records
does_not_own:
  - Cannot decide workflow policy
inputs: []
outputs:
  - Versioned state
permissions:
  - Read and write execution data
restrictions:
  - Cannot decide workflow policy
failure_behaviour:
  - Reject stale writes
  - Remain authoritative after worker failure
---

# Execution Store

## Purpose

Authoritative persistence for execution state, versions, leases, and checkpoints.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
