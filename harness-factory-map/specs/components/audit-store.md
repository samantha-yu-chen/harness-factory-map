---
id: audit-store
name: Audit Store
entity_type: component
plane: assurance
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
description: Append-only record of requests, decisions, grants, actions, and results.
owner: harness-platform
tags:
  - assurance
  - component
depends_on: []
connects_to: []
workflow_id: bounded-engineering-ticket
workflow_order: 12
responsibilities:
  - Preserve attributable events
  - Support investigation
owns:
  - Audit events
does_not_own:
  - Cannot rewrite history
  - Cannot become workflow truth
inputs: []
outputs:
  - Queryable audit trail
permissions:
  - Append validated audit events
restrictions:
  - Cannot rewrite history
  - Cannot become workflow truth
failure_behaviour:
  - Reject invalid events
  - Alert on persistence failure
---

# Audit Store

## Purpose

Append-only record of requests, decisions, grants, actions, and results.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
