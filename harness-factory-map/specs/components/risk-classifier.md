---
id: risk-classifier
name: Risk Classifier
entity_type: component
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Classifies task risk and recommends the required workflow and approval gates.
owner: harness-platform
tags:
  - control
  - component
depends_on: []
connects_to:
  - orchestrator
workflow_id: bounded-engineering-ticket
workflow_order: 4
responsibilities:
  - Apply deterministic rules
  - Record rationale
  - Escalate ambiguity
owns:
  - Risk assessment
does_not_own:
  - Cannot lower mandatory policy controls
inputs: []
outputs:
  - Risk decision
permissions:
  - Read task contract and policy
restrictions:
  - Cannot lower mandatory policy controls
failure_behaviour:
  - Escalate uncertain or conflicting classifications
---

# Risk Classifier

## Purpose

Classifies task risk and recommends the required workflow and approval gates.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
