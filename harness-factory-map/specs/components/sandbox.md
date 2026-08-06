---
id: sandbox
name: Sandbox
entity_type: component
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
description: Isolated environment for untrusted commands and generated code.
owner: harness-platform
tags:
  - execution
  - component
depends_on: []
connects_to:
  - review-service
workflow_id: bounded-engineering-ticket
workflow_order: 9
responsibilities:
  - Isolate filesystem and process execution
  - Apply resource and network limits
owns:
  - Ephemeral workspace
does_not_own:
  - No host access
  - No unrestricted network
inputs: []
outputs:
  - Command output
  - Workspace artifacts
permissions:
  - Run approved commands within limits
restrictions:
  - No host access
  - No unrestricted network
failure_behaviour:
  - Terminate on timeout
  - Destroy or quarantine compromised workspace
---

# Sandbox

## Purpose

Isolated environment for untrusted commands and generated code.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
