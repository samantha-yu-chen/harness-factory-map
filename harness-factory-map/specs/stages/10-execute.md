---
id: stage-10-execute
name: 10 · Production run
entity_type: workflow-step
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: agent
automation_level: agent-with-review
data_classification: confidential
description: The published agent runs on exactly the same machinery the factory verified it against, one step at a time, inside its granted envelope.
exec_summary: The agent does the actual work, using the same engine it was tested on, so it behaves in production the way it behaved in review.
business_value: Reusing the factory's execution machinery is what makes a verified agent stay verified. A separate production engine would silently diverge.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 10
loop: runtime
tags:
  - runtime
  - execution
  - reuse
depends_on: []
connects_to:
  - stage-11-deliver
reference_elements: []
responsibilities:
  - Run the deployment's package version through the same orchestrator, runtime, gateway, and sandbox as stage 6
  - Checkpoint every step so a production run is resumable and stoppable
  - Hold every tool call inside the token granted at stage 9
  - Validate the result against the package's evaluation suite before it can be delivered
owns:
  - Production execution state
  - The run's evidence, citations, and step-level cost
does_not_own:
  - The agent definition, which is an immutable package version
  - Its permissions, which expire with the task token
  - Whether the result is acceptable, which is the next stage
inputs:
  - An authorised run with a scoped token and a budget reservation
outputs:
  - A validated result with evidence, cost, and the package version that produced it
permissions:
  - Call only the tools named in the task token, for the duration of the run
restrictions:
  - Cannot run a package version other than the one the deployment currently points at
  - Cannot widen scope, tools, budget, or time
  - Cannot deliver a result that has not passed the package's evaluation suite
failure_behaviour:
  - Budget or time exhaustion stops the run and returns a partial result with an honest status
  - A failed evaluation retries once, then fails the run rather than escalating to a person
  - Repeated failures across runs raise a deployment health signal at stage 12
open_questions:
  - "How many concurrent runs may one deployment hold, and what happens to the rest — queue or refuse?"
  - "Does a production run retry differently from a factory run, given no human is waiting on a scheduled one?"
---

# Stage 10 · Production run

There are no new components in this stage. That is its most important property.

## Why this reuses stage 6 entirely

A published agent runs through the same `team-orchestrator`, `agent-runtime`, `tool-gateway`, `sandbox`, and `evaluation-service` that verified it during the factory loop. Not equivalent machinery — the same machinery.

The alternative is the standard shape: build it in a workbench, run it in production. That shape guarantees that what was reviewed and what runs are two different things, and the gap between them is discovered by an incident rather than a test. Every verification the factory performed becomes a claim about a system that no longer exists.

Reuse costs a little: production traffic and factory builds contend for the same runtime, and a factory-motivated change to the orchestrator now touches production. Both are manageable with ordinary release discipline. A divergent production engine is not manageable at all.

## What is different from stage 6

Only three things, and none of them are the engine:

| | Stage 6 (factory) | Stage 10 (runtime) |
| --- | --- | --- |
| What is running | A team assembled for one task | A frozen package version |
| Who is waiting | The original requester, actively | Possibly nobody |
| On failure | Escalate to a human | Fail honestly, signal deployment health |

The last row matters most. At stage 6 there is always a person in the loop, so escalation is a real option. On a scheduled run at three in the morning there is no one to escalate to, and a system that waits for a human it does not have is a system that hangs. Production runs fail cleanly and let stage 12 decide whether the pattern warrants suspending the deployment.

## Boundary

This stage owns how the run proceeded and what it produced. It does not own what the agent is — that is an immutable package version, and a run that could change it would make every prior verification meaningless.
