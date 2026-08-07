---
id: repo-identity
name: Control and Assurance Service
entity_type: deployable-unit
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: restricted
description: The unit that answers who may do what, decides each action against policy, and keeps the tamper-evident record of everything that happened.
exec_summary: The part of the platform that grants permission and keeps the receipts, kept separate so it can be audited on its own terms.
business_value: An auditor needs to inspect the permission and evidence trail without being handed the whole platform. Separating this unit is what makes that a scoped exercise instead of an open-ended one.
owner: platform-security
human_accountable: Chief Information Security Officer
repository: harness-control
forcing_function: FF4-regulatory-boundary
modules:
  - identity
  - policy
  - audit
tags:
  - deployable-unit
  - security
  - audit
depends_on: []
connects_to:
  - repo-execution
  - repo-platform-core
responsibilities:
  - Issue and introspect the identities and scoped tokens every other unit uses
  - Decide each requested action against written policy and cite the rule
  - Append an immutable, verifiable record of decisions and effects
owns:
  - The permission model and its evaluation
  - The evidence trail
does_not_own:
  - Any decision about what work is worth doing
  - Any execution of the actions it permits
restrictions:
  - Never calls out to execute anything; it answers and records only
  - Its retention and residency are set by compliance, not by platform convenience
failure_behaviour:
  - An unevaluable policy question is answered deny, never allow
  - An unavailable audit sink halts the operation that needed recording
open_questions:
  - Does the audit store need a separate residency or subscription to satisfy the retention obligation, or is a scoped resource group enough?
api_contract: []
---

# Control and Assurance Service

## Why this is a separate repository

**FF4 — regulatory boundary.** The audit trail carries a retention and immutability obligation that the rest of the platform does not, and the permission model is the surface a security review actually examines. Both need a lifecycle set by compliance rather than by feature delivery: different retention, different access control, plausibly a different subscription.

Co-locating them with product code means every product deploy is a change inside the compliance boundary. Separating them means a security review has a repository to read rather than a platform.

**FF3 supports it.** A deny decision must still be obtainable when the rest of the platform is failing. Availability of this unit is what makes fail-closed behaviour elsewhere survivable.

## Modules

| Module | Components | Public port |
|---|---|---|
| `identity` | identity-access | Issues and introspects scoped tokens |
| `policy` | policy-engine | Returns an allow or deny with a cited rule |
| `audit` | audit-log | Appends a verifiable record |

## What crosses the boundary

This unit is called by everyone and calls nobody. That shape is deliberate: a service that answers questions cannot be pulled into a dependency cycle, and its availability is a floor under the whole platform rather than a function of it.

## Acceptance criteria

- [ ] This unit has no outbound dependency on either other unit.
- [ ] A policy question that cannot be evaluated returns deny with a reason.
- [ ] The audit store's retention is configured independently of the application deploy.
- [ ] A security reviewer can assess the permission model from this repository alone.
