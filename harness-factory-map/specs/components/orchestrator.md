---
id: orchestrator
name: Orchestrator
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
description: Owns and advances execution workflow state according to approved transitions.
owner: harness-platform
tags:
  - control
  - component
depends_on: []
connects_to:
  - execution-store
  - policy-engine
  - agent-runtime
workflow_id: bounded-engineering-ticket
workflow_order: 5
responsibilities:
  - Validate transitions
  - Dispatch bounded assignments
  - Handle timeout and retry
owns:
  - Execution state
does_not_own:
  - Cannot perform agent reasoning
  - Cannot redefine policy
inputs: []
outputs:
  - Assignments
  - State transitions
permissions:
  - Read contracts and decisions
  - Write authoritative execution state
restrictions:
  - Cannot perform agent reasoning
  - Cannot redefine policy
failure_behaviour:
  - Preserve state on dependency failure
  - Prevent duplicate active execution
---

# Orchestrator

## Purpose

Owns and advances execution workflow state according to approved transitions.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
