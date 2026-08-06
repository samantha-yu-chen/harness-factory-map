---
id: agent-runtime
name: Agent Runtime
entity_type: component
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: agent
description: Runs one bounded agent assignment and returns results and evidence.
owner: harness-platform
tags:
  - execution
  - component
depends_on: []
connects_to:
  - tool-gateway
workflow_id: bounded-engineering-ticket
workflow_order: 7
responsibilities:
  - Execute the assignment
  - Use only granted tools
  - Return structured result
owns:
  - Temporary reasoning session
does_not_own:
  - Cannot own execution state
  - Cannot expand its own permissions
inputs: []
outputs:
  - Agent result
  - Artifacts
  - Usage report
permissions:
  - Use explicitly granted capabilities
restrictions:
  - Cannot own execution state
  - Cannot expand its own permissions
failure_behaviour:
  - Stop on revoked grant
  - Report timeout and preserve evidence
---

# Agent Runtime

## Purpose

Runs one bounded agent assignment and returns results and evidence.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
