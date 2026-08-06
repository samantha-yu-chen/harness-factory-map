---
id: pull-request
name: Pull Request
entity_type: artifact
plane: external
scope: mvp
status: specified
risk: high
actor_type: external
description: Reviewable delivery artifact produced for a bounded engineering change.
owner: harness-platform
tags:
  - external
  - artifact
depends_on: []
connects_to:
  - audit-store
workflow_id: bounded-engineering-ticket
workflow_order: 11
responsibilities:
  - Present code change and evidence
owns:
  - PR content
does_not_own:
  - Cannot be treated as production release
inputs: []
outputs:
  - Reviewable delivery
permissions:
  - Be created in an authorised repository
restrictions:
  - Cannot be treated as production release
failure_behaviour:
  - Remain unmerged when approval is absent
---

# Pull Request

## Purpose

Reviewable delivery artifact produced for a bounded engineering change.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
