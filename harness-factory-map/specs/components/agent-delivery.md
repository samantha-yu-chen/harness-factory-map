---
id: agent-delivery
name: Agent Delivery Dock
entity_type: artifact
plane: external
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Versioned handoff record for a reviewed task-specific Agent package.
owner: harness-platform
tags:
  - agent-factory
  - delivery
  - handoff
depends_on:
  - agent-package
  - review-service
connects_to:
  - agent-runtime
  - audit-store
responsibilities:
  - Publish the reviewed Agent package version
  - Record the target runtime and handoff status
  - Make the delivery traceable to task, review, and policy evidence
owns:
  - Delivery record
does_not_own:
  - Agent runtime state
  - User task result
  - Production release approval outside the declared handoff
inputs:
  - Reviewed Agent package
  - Review evidence
  - Delivery target
outputs:
  - Versioned Agent handoff
  - Runtime launch reference
permissions:
  - Publish an approved package version
  - Append delivery evidence
restrictions:
  - Cannot deliver an unreviewed package
  - Cannot silently replace a delivered version
failure_behaviour:
  - Keep delivery pending when evidence or target is missing
  - Preserve the previous delivered version when publishing fails
---

# Agent Delivery Dock

## Purpose

The Delivery Dock hands a reviewed task-specific Agent package to its bounded runtime. Delivery is the Factory outcome; it is not the same as completing the user's task.

## Handoff boundary

The handoff contains the package version, task contract reference, policy decision reference, review evidence, runtime launch reference, and rollback or disable path. The runtime owns execution state after handoff. The Delivery Dock does not own runtime state or the user's result.

## Acceptance criteria

- [ ] Only a reviewed and policy-compatible Agent package can be delivered.
- [ ] The handoff records package version, task contract, review evidence, target runtime, and owner.
- [ ] The runtime can identify exactly which package version it is executing.
- [ ] A failed publish leaves the last known delivered version unchanged.
- [ ] Disable, rollback, and handoff status are attributable and auditable.
- [ ] Delivery completion is shown separately from user task completion.
