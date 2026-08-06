---
id: policy-engine
name: Policy Engine
entity_type: component
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
description: Evaluates mandatory rules for permission, data, model, workflow, and approval.
owner: harness-platform
tags:
  - control
  - component
depends_on: []
connects_to:
  - orchestrator
  - tool-gateway
workflow_id: bounded-engineering-ticket
workflow_order: 6
responsibilities:
  - Return policy decisions with rationale
  - Apply deny-by-default controls
owns:
  - Policy decisions
does_not_own:
  - Cannot treat ordinary knowledge as mandatory policy
inputs: []
outputs:
  - Allow, deny, or escalate decision
permissions:
  - Read approved policy versions
restrictions:
  - Cannot treat ordinary knowledge as mandatory policy
failure_behaviour:
  - Deny safely when required policy is unavailable
---

# Policy Engine

## Purpose

Evaluates mandatory rules for permission, data, model, workflow, and approval.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
