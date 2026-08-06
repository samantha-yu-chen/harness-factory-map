---
id: harness-factory-map
name: Harness Factory Map
entity_type: component
plane: control
scope: mvp
status: specified
risk: low
actor_type: deterministic-system
description: Local visual source of truth for the future enterprise harness architecture and delivery map.
owner: system-owner
tags:
  - visualisation
  - specification
  - local-first
depends_on: []
connects_to:
  - user-request
  - orchestrator
responsibilities:
  - Render specifications as an interactive graph
  - Expose boundaries and relationships
  - Validate specification metadata
owns:
  - Generated architecture map
does_not_own:
  - Production harness execution
  - Enterprise policy
inputs:
  - Markdown specifications
outputs:
  - Generated graph
  - Validation results
permissions:
  - Read repository specifications during build
restrictions:
  - No external runtime services
  - No agent execution
failure_behaviour:
  - Fail generation on invalid specifications
---

# Harness Factory Map

## Purpose

Provide a navigable design and delivery map for a future enterprise agent harness.

## Boundary

This component visualises and validates specifications. It is not the production system described by those specifications.
