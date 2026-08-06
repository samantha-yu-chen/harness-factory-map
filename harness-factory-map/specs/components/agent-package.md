---
id: agent-package
name: Task-Specific Agent Package
entity_type: artifact
plane: execution
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Versioned package defining a task-specific Agent's role, tools, guardrails, memory references, and test profile.
owner: harness-platform
tags:
  - agent-factory
  - artifact
  - delivery
depends_on:
  - task-contract
  - policy-engine
connects_to:
  - sandbox
  - review-service
  - agent-delivery
  - audit-store
responsibilities:
  - Translate an approved task contract into an Agent package
  - Declare tools, guardrails, memory references, and evaluation cases
  - Produce a versioned build artifact for review and handoff
owns:
  - Agent package manifest
  - Agent test profile
does_not_own:
  - Enterprise policy authority
  - User data outside the declared task scope
  - Runtime execution state
inputs:
  - Approved task contract
  - Policy decision
  - Approved retrieval references
outputs:
  - Versioned task-specific Agent package
  - Build and evaluation manifest
permissions:
  - Read the approved task contract and policy decision
  - Reference approved knowledge sources
restrictions:
  - Cannot expand its own tools or permissions
  - Cannot write directly to enterprise source-of-truth data
  - Cannot be released without review evidence
failure_behaviour:
  - Reject incomplete package manifests
  - Block release when guardrails or evaluation evidence are missing
---

# Task-Specific Agent Package

## Purpose

The Factory output is a versioned task-specific Agent package. It is not an unconstrained general-purpose Agent and it is not yet a running execution.

## Package boundary

The package should declare the task role, system instructions, allowed tools, policy constraints, memory references, input/output contract, escalation path, evaluation cases, and version metadata. It may reference approved enterprise data through the RAG retrieval boundary; it must not copy unverified content into policy truth.

The package does not own enterprise policy, user data outside the task contract, runtime state, or the final task result.

## Acceptance criteria

- [ ] The package has a unique version and points to one approved task contract.
- [ ] The package declares role, allowed tools, denied tools, input/output contract, and escalation path.
- [ ] Every memory reference includes source identity, version, and access boundary.
- [ ] The package cannot add permissions that are absent from the approved policy decision.
- [ ] Sandbox evaluation covers the declared happy path and at least one denied or degraded path.
- [ ] A review result and audit reference are required before delivery.
- [ ] A runtime can execute the package without changing the package manifest.
