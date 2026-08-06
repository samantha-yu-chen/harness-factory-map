---
id: agent-package
name: Agent Package
entity_type: artifact
plane: execution
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: human-approves
data_classification: confidential
description: The versioned, immutable definition of an agent team — roles, prompts, allowed tools, model tiers, memory references, and evaluation suite.
exec_summary: The recipe for an agent team, versioned so we always know exactly which version did which piece of work.
business_value: Without versioned packages, a team's behaviour changes silently and no delivered outcome can be reproduced or explained.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 2
workflow_id: stage-6-execution
workflow_order: 5
tags:
  - package
  - artifact
  - versioning
depends_on:
  - tool-gateway
  - evaluation-service
connects_to:
  - agent-deployment
  - agent-runtime
  - agent-team-registry
  - improvement-proposal
  - audit-log
serves_stages:
  - stage-10-execute
reference_map: []
responsibilities:
  - Expose evaluation results so agent-deployment can refuse to promote a version that did not pass
  - Declare roles, system prompts, allowed tools, model tier per step, and memory references
  - Carry the evaluation suite the package must pass before release
  - Produce an immutable, signed, versioned artifact
  - Record which package version every run executed
owns:
  - The package manifest and its version history
does_not_own:
  - Runtime state
  - Its own permissions, which come from policy-engine
  - Whether it may be used, which comes from agent-team-registry
data_owned:
  - agent package version
inputs:
  - A role composition, tool selections from the catalogue, and evaluation cases
outputs:
  - An immutable, signed package version with its evaluation evidence
permissions:
  - Publish a package version that has passed its evaluation suite
restrictions:
  - Immutable after publication — changes create a new version
  - Cannot declare a tool absent from the reviewed tool catalogue
  - Cannot be published without passing evaluation evidence
  - Cannot grant itself permissions; it declares needs, policy grants them
failure_behaviour:
  - A package failing its evaluation suite cannot be published, and the previous version keeps serving
  - A package referencing an unregistered tool is rejected at build time
  - A withdrawn package version stays readable so past runs remain explicable
open_questions:
  - How are prompt changes reviewed — as code, with diff review, or as configuration with a lighter path?
  - What evaluation pass rate justifies promoting a package version to a registered team's default?
api_contract:
  - operation: "POST /v1/packages"
    kind: sync-api
    caller: "Platform engineer, or improvement-proposal after human approval"
    worker: agent-package
    request: "{ name, roles[{ role, system_prompt, model_tier, step }], tools[], memory_refs[], evaluation_suite_ref, author_upn, change_reference }"
    response: "201 { package_id, version, status: evaluating }"
    idempotency: "name + content hash; identical content returns the existing version"
    timeout: "10s to accept; evaluation is asynchronous"
    auth: "Entra ID; package-author role, never an agent identity"
    failure: "422 when a declared tool is not in the reviewed catalogue, or when the evaluation suite is missing; publication is blocked until evaluation passes"
  - operation: "GET /v1/packages/{package_id}/versions/{version}"
    kind: query
    caller: agent-runtime, agent-team-registry, human-review-gate, auditors
    worker: agent-package
    request: "{ package_id, version }"
    response: "200 { manifest, evaluation_evidence_ref, signature, published_at, published_by, status }"
    timeout: 2s
    auth: "Workload identity or auditor role"
    failure: "404 for unknown; a withdrawn version returns with status withdrawn rather than 404, so past runs stay explicable"
  - operation: "POST /v1/packages/{package_id}/versions/{version}/withdraw"
    kind: human-decision
    caller: "The package owner, or platform security on an incident"
    worker: agent-package
    request: "{ package_id, version, reason }"
    response: "200 { status: withdrawn, teams_affected[] }"
    idempotency: "package_id + version"
    timeout: 5s
    auth: "Entra ID; owner or security role"
    failure: "Withdrawal names every registered team using the version; those teams are suspended rather than silently falling back"
events_emitted:
  - package.published
  - package.evaluation_failed
  - package.withdrawn
events_consumed:
  - evaluation.suite.completed
slo:
  availability: "99.9%; read on every run start"
  latency: "p95 under 300 ms"
cost:
  monthly_usd_low: 20
  monthly_usd_high: 45
  driver: "Package versions and evaluation runs; storage is negligible, evaluation is not"
  note: "The evaluation runs triggered by publication carry real model cost, charged to evaluation-service. Publishing a package version is not free — batch prompt changes rather than publishing per tweak."
  azure:
    - service: Azure Container Registry
      sku: "Standard, package manifests and signed artifacts"
      monthly_usd_low: 20
      monthly_usd_high: 30
      shared: true
    - service: Azure Blob Storage
      sku: "Standard cool, evaluation evidence"
      monthly_usd_low: 0
      monthly_usd_high: 15
      shared: true
---

# Agent Package

## Caller and worker

A **platform engineer publishes**; `agent-runtime` **reads**; `agent-team-registry` **pins a version**. The package itself is inert — it is a definition, not a process.

An agent can never publish a package. `improvement-proposal` may propose one, but a human authors and approves it. This is the concrete implementation of "learning is observational": the loop can suggest a better prompt, and a person decides whether it ships.

## Immutable, versioned, signed

Publication is final. A change is a new version. A withdrawn version stays readable.

That last rule matters more than it looks. Six months from now, explaining a delivered outcome means showing the exact package version that produced it. If withdrawal deleted the record, every incident involving a since-fixed package becomes unreconstructable.

## Declares needs, never grants permissions

The package declares which tools it needs. `policy-engine` decides whether the task may use them, bounded by the team scope, bounded by the governance decision.

A package listing a tool it is not authorised for is not an error at publication — it is a denial at runtime, cited and recorded. Keeping those separate means package authoring does not require security authority, which is what lets ordinary engineers work on packages at all.

## Model tier is a per-step declaration

`roles[]` carries a `model_tier` per step. This is where the cost lever from `agent-runtime` is actually pulled.

The default of a single strong model for every step is the expensive choice made by omission. Research summarisation and artifact formatting rarely justify what Understand and Plan do, and the package is the only place that distinction can be expressed.

## Acceptance criteria

- [ ] Publication is blocked until the evaluation suite passes.
- [ ] A tool absent from the reviewed catalogue is rejected at build time.
- [ ] Published versions are immutable; identical content returns the existing version.
- [ ] Withdrawn versions remain readable with status withdrawn.
- [ ] Withdrawal suspends every registered team pinned to that version.
- [ ] An agent identity cannot publish, at any endpoint.
- [ ] Every run records the exact package version it executed.
