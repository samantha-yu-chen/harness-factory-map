---
id: repo-platform-core
name: Platform Core
entity_type: deployable-unit
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: The host application — intake, knowledge, governance, publication, assurance, and learning, built as six modules in one repository because none of them has yet earned a process boundary.
exec_summary: The main application, where most of the platform lives, kept as one deployable piece until a specific pressure justifies splitting a part of it out.
business_value: Twenty-one boundaries delivered as one deploy instead of six services is roughly a hundred network contracts that nobody has to version, mock, or debug. That difference is most of the delivery cost of this platform.
owner: harness-platform
human_accountable: Head of Platform Engineering
repository: harness-platform-core
forcing_function: host
modules:
  - intake
  - knowledge
  - governance
  - publication
  - assurance
  - learning
tags:
  - deployable-unit
  - modular-monolith
depends_on:
  - repo-identity
connects_to:
  - repo-execution
responsibilities:
  - Take a request in, decide what it is, and produce a task contract
  - Ground the work in cited enterprise knowledge
  - Carry the governance decision and the registered team that follows from it
  - Publish, schedule, and measure agents that have been approved
  - Hold the outcome record and propose improvements from it
owns:
  - The module boundaries inside this repository and the ports between them
does_not_own:
  - Execution of any task, which repo-execution performs
  - Any permission decision, which repo-identity makes
restrictions:
  - No module imports another module's internals; only its public port
  - A module that wants to become a service must name a forcing function first
failure_behaviour:
  - A module failure degrades that capability, not the host process, where the port allows it
  - The host has one deploy and one rollback; a bad release here affects six modules at once, which is the accepted cost of this shape
open_questions:
  - Which module is most likely to reach FF1 first as run volume grows — knowledge, on index size, or assurance, on evaluation throughput?
api_contract: []
---

# Platform Core

## Why this is one repository, not six

Because no forcing function applies. Six candidate services were tested against FF1–FF5:

| Candidate | FF1 scaling | FF2 team scale | FF3 fault | FF4 regulatory | FF5 runtime | Verdict |
|---|---|---|---|---|---|---|
| intake | no | no | no | no | no | module |
| knowledge | not yet | no | no | no | not yet | module, watch FF1 |
| governance | no | no | no | no | no | module |
| publication | no | no | no | no | no | module |
| assurance | no | no | no | no | no | module |
| learning | no | no | no | no | no | module |

"We will want to split this one day" did not qualify. It is a refactor available later at low cost, precisely because each module ships a public port and a seam test.

The measured argument: splitting these six would turn roughly 96 in-process calls into cross-service contracts, each needing a version, a mock, a timeout policy, and a failure mode. Keeping them here leaves about 30 cross-unit contracts in the whole platform — the ones that genuinely cross a fault or compliance boundary.

## Modules

| Module | Components | Owns |
|---|---|---|
| `intake` | request-intake, clarification-agent, task-contract, work-classifier, solution-registry, ticket-bridge | A request becoming a stated, classified, non-duplicate problem |
| `knowledge` | knowledge-ingestion, retrieval-service | Cited, permission-filtered enterprise context |
| `governance` | governance-board, agent-team-registry, budget-guard | Who approved what, and the ceiling it runs under |
| `publication` | agent-catalogue, agent-deployment, schedule-runner | A proven team becoming something people and timetables can invoke |
| `assurance` | evaluation-service, human-review-gate, observability, outcome-delivery | Whether the work is good enough to leave the building |
| `learning` | outcome-ledger, improvement-proposal, team-lifecycle | What happened, and what should change because of it |

## The rule that keeps the split available

No file outside a module directory imports from its internals. Each module exposes one port and ships one test that exercises it only through that port, with collaborators injected.

That discipline is the whole reason this is a defensible shape rather than a big ball of mud with a diagram. When `knowledge` eventually hits FF1 on index size, extracting it is a directory move and a transport change — not an archaeology project.

## Acceptance criteria

- [ ] Every module has a public port and a seam test that uses only that port.
- [ ] A lint rule fails a build that imports across a module's internals.
- [ ] No module reads another module's tables.
- [ ] Promoting a module to a unit requires a named forcing function in its specification.
