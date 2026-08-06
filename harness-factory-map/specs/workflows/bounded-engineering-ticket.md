---
id: bounded-engineering-ticket
name: Bounded Engineering Ticket
entity_type: workflow-step
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Reference workflow from user request to a reviewable pull request with audit evidence.
owner: harness-platform
tags:
  - workflow
  - engineering
depends_on:
  - user-request
  - intake-service
  - task-contract
  - risk-classifier
  - orchestrator
  - policy-engine
  - agent-runtime
  - tool-gateway
  - sandbox
  - review-service
  - pull-request
  - audit-store
connects_to: []
responsibilities:
  - Define the initial end-to-end trace
owns:
  - Workflow ordering for the visual trace
does_not_own:
  - Runtime state transitions
inputs:
  - User request
outputs:
  - Reviewable pull request
permissions: []
restrictions:
  - Visual specification only
failure_behaviour:
  - Display missing workflow references as validation errors
---

# Bounded Engineering Ticket

## Happy path

1. A user submits a request.
2. Intake validates and clarifies the request.
3. A versioned task contract is produced.
4. Risk classification selects required controls.
5. The orchestrator creates and owns execution state.
6. The policy engine authorises a bounded assignment.
7. The agent runtime performs reasoning under the assignment.
8. The tool gateway validates every capability use.
9. Commands run inside an isolated sandbox.
10. A separate review service evaluates the change.
11. A pull request is created but not automatically merged.
12. Material actions and decisions are appended to the audit store.

## Required future failure paths

- Clarification required.
- Request rejected.
- Policy denied.
- Budget exhausted.
- Agent timed out.
- Sandbox failed.
- Review requested changes.
- Human approval delayed or rejected.
- Duplicate execution detected.
