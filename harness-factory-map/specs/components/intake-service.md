---
id: intake-service
name: Intake Service
entity_type: component
plane: request
scope: mvp
status: specified
risk: medium
actor_type: deterministic-system
description: Validates requests and gathers enough information to create a bounded task contract.
owner: harness-platform
tags:
  - request
  - component
depends_on: []
connects_to:
  - task-contract
workflow_id: bounded-engineering-ticket
workflow_order: 2
responsibilities:
  - Validate required information
  - Request clarification
  - Preserve original request
owns:
  - Intake record
does_not_own:
  - Cannot approve execution
  - Cannot modify original request
inputs: []
outputs:
  - Task Contract candidate
permissions:
  - Read request data
  - Write intake status
restrictions:
  - Cannot approve execution
  - Cannot modify original request
failure_behaviour:
  - Pause for clarification
  - Reject unsupported requests
---

# Intake Service

## Purpose

Validates requests and gathers enough information to create a bounded task contract.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
