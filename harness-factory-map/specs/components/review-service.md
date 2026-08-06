---
id: review-service
name: Review Service
entity_type: component
plane: assurance
scope: mvp
status: specified
risk: high
actor_type: agent
description: Reviews changes using fresh context and produces structured findings.
owner: harness-platform
tags:
  - assurance
  - component
depends_on: []
connects_to:
  - pull-request
  - audit-store
workflow_id: bounded-engineering-ticket
workflow_order: 10
responsibilities:
  - Evaluate against contract and evidence
  - Separate blocking from advisory findings
owns:
  - Review result
does_not_own:
  - Cannot merge or release changes
inputs: []
outputs:
  - Approval recommendation
  - Findings
permissions:
  - Read approved artifacts
restrictions:
  - Cannot merge or release changes
failure_behaviour:
  - Return insufficient-evidence status rather than guessing
---

# Review Service

## Purpose

Reviews changes using fresh context and produces structured findings.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
