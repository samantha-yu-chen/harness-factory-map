---
id: task-contract
name: Task Contract
entity_type: artifact
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Versioned agreement defining goal, scope, acceptance criteria, constraints, and risk.
owner: harness-platform
tags:
  - control
  - artifact
depends_on: []
connects_to:
  - risk-classifier
workflow_id: bounded-engineering-ticket
workflow_order: 3
responsibilities:
  - Represent bounded authorised work
owns:
  - Contract versions
does_not_own:
  - Cannot grant permissions by itself
inputs: []
outputs:
  - Approved task contract
permissions:
  - Be read by authorised workflow components
restrictions:
  - Cannot grant permissions by itself
failure_behaviour:
  - Block execution when incomplete or unapproved
---

# Task Contract

## Purpose

Versioned agreement defining goal, scope, acceptance criteria, constraints, and risk.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
