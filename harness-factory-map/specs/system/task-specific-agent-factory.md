---
id: task-specific-agent-factory
name: Task-Specific Agent Factory
entity_type: component
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Factory workflow that builds and delivers a bounded Agent for a specific user task, then hands execution to the Agent runtime.
owner: harness-platform
tags:
  - agent-factory
  - build-loop
  - runtime-loop
depends_on:
  - user-request
  - intake-service
  - task-contract
  - risk-classifier
  - policy-engine
  - agent-package
  - agent-delivery
connects_to:
  - orchestrator
  - agent-runtime
  - sandbox
  - review-service
  - audit-store
responsibilities:
  - Intake and qualify a user task
  - Build a task-specific Agent package within approved boundaries
  - Validate, review, and deliver the package
  - Hand the delivered package to the Agent runtime for task execution
  - Capture outcome evidence for human-led improvement
owns:
  - Factory build and delivery trace
does_not_own:
  - General enterprise policy authority
  - Unbounded Agent autonomy
  - The user's task result after runtime handoff
inputs:
  - User task request
  - Approved enterprise knowledge references
outputs:
  - Delivered task-specific Agent
  - Agent task result and evidence
permissions:
  - Coordinate bounded Factory stages
  - Read and attach approved evidence
restrictions:
  - No live external service execution in the presentation MVP
  - No Agent may expand its own scope or permissions
  - Delivery and task completion must remain separate statuses
failure_behaviour:
  - Stop build on missing contract, policy, or evidence
  - Route ambiguous tasks to human clarification or review
---

# Task-Specific Agent Factory

## Outcome

The Factory exists to build and deliver an Agent that is specific to a user's task. The Agent then carries out that task under the approved contract and returns a result with evidence.

The Factory outcome is **a delivered task-specific Agent**, not a pull request. A pull request may be one possible artifact produced by an Agent, but it is not the universal Factory output.

## Build loop

1. Capture the user's task and check for an existing suitable Agent.
2. Clarify the problem, success criteria, risk, owner, and constraints.
3. Choose reuse, Harness Agent Team composition, or a dedicated task-specific Agent.
4. Obtain governance approval for the required scope and permissions.
5. Build a versioned Agent package with role, tools, guardrails, approved memory references, and evaluation cases.
6. Test in an isolated sandbox and review the evidence.
7. Deliver the reviewed package to a bounded Agent runtime.

## Runtime loop after handoff

1. The runtime starts the delivered package against the approved task contract.
2. The Agent retrieves approved context through the RAG boundary and cites its sources.
3. The Agent carries out the user task using only granted tools and sandbox limits.
4. The runtime returns a result, artifacts, usage, and evidence.
5. The Factory records outcome and feedback for human-led improvement.

## Boundary between Factory and Agent runtime

| Boundary | Factory owns | Agent runtime owns |
| --- | --- | --- |
| Before handoff | Task contract, package version, policy compatibility, review evidence, delivery record | Nothing authoritative |
| During task run | Package definition and delivery trace | Execution state, tool calls, task result, usage, and runtime evidence |
| After task run | Outcome review, learning signals, package improvement proposal | No autonomous policy or permission changes |

## Acceptance criteria

- [ ] The UI visibly distinguishes Factory build/delivery from post-delivery Agent execution.
- [ ] A task-specific Agent package has a version, task contract, policy decision, tool boundary, memory references, and evaluation evidence.
- [ ] The delivery record identifies the exact package version handed to the runtime.
- [ ] Runtime execution cannot modify the package, policy, or enterprise source-of-truth data.
- [ ] A task result is not marked complete merely because an Agent package was delivered.
- [ ] Results and evidence are attributable to the delivered package version and task.
- [ ] Failure, clarification, review, disable, and rollback paths remain visible.
- [ ] The local prototype simulates these states without connecting to real Agents or Azure services.
