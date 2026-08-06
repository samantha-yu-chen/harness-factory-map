---
id: tool-gateway
name: Tool Gateway
entity_type: component
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
description: Mediates every agent tool request against capability grants and policy.
owner: harness-platform
tags:
  - execution
  - component
depends_on: []
connects_to:
  - sandbox
  - audit-store
workflow_id: bounded-engineering-ticket
workflow_order: 8
responsibilities:
  - Validate tool calls
  - Enforce limits
  - Audit side effects
owns:
  - Tool invocation records
does_not_own:
  - Cannot bypass policy or grant scope
inputs: []
outputs:
  - Approved tool response
permissions:
  - Invoke allowed downstream tools
restrictions:
  - Cannot bypass policy or grant scope
failure_behaviour:
  - Deny unknown operations
  - Stop repeated violating calls
---

# Tool Gateway

## Purpose

Mediates every agent tool request against capability grants and policy.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
