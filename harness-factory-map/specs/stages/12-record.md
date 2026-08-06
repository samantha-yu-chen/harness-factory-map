---
id: stage-12-record
name: 12 · Record and operate
entity_type: workflow-step
plane: assurance
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Every production run is recorded with its cost and outcome, and the deployment's health is watched closely enough to suspend it automatically.
exec_summary: Every run is logged with what it cost and whether it worked, and an agent that starts failing or overspending switches itself off.
business_value: A published agent nobody is watching is an unbounded liability. This stage is what makes running one at scale defensible.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 12
loop: runtime
tags:
  - runtime
  - operations
  - suspension
depends_on: []
connects_to:
  - stage-7-learning
reference_elements: []
responsibilities:
  - Record every run's outcome, cost, package version, and review decision
  - Maintain per-deployment health — success rate, cost burn, review-queue latency
  - Suspend a deployment automatically when a health threshold is breached
  - Attribute spend to the deployment and the business unit that owns it
owns:
  - Per-deployment health state and the suspension decision
does_not_own:
  - The run's evidence, which belongs to the execution stage
  - Resumption, which is always a human act
  - What to improve, which is stage 7
inputs:
  - A delivered, partial, or failed run with its cost and review decision
outputs:
  - A run record, updated deployment health, and any suspension
permissions:
  - Read run telemetry and write deployment health state
restrictions:
  - Cannot resume a suspended deployment
  - Cannot alter a run record after it is written
  - Cannot treat missing cost telemetry as zero spend
failure_behaviour:
  - Missing cost telemetry is treated as at-limit, never as no spend
  - A health signal that cannot be evaluated suspends the deployment
  - A record that cannot be written fails the run rather than losing the trace
open_questions:
  - "What success-rate floor and cost-burn ceiling trigger automatic suspension, and are they per-tier?"
  - "Who is paged when a deployment suspends itself outside working hours — the platform team or the business unit owner?"
---

# Stage 12 · Record and operate

This is the stage that most agent platforms discover they needed after their first bad month.

## Suspension is machine-triggered, resumption is human

Three signals can suspend a deployment on their own:

| Signal | Threshold shape | Why it must be automatic |
| --- | --- | --- |
| Success rate | Below floor over a rolling window | A degraded agent producing plausible wrong answers is worse than one that is down |
| Cost burn | Monthly ceiling reached, or run cost drifting above forecast | Spend compounds silently, especially on a schedule |
| Review latency | Queue breaching its service level | Means reviews are not happening, whatever the dashboard says |

Nothing switches itself back on. A deployment that can resume itself is not suspendable, and the whole control is decorative. Resumption requires a person who has looked at why it stopped — which is also the only reliable way the platform learns what its thresholds should have been.

## Cost attribution is the point, not a report

A run record carries the deployment, the business unit, the package version, the model spend, and the infrastructure share. Without that tuple, platform cost is a single number that leadership can only ever react to, never steer.

With it, the conversation changes shape entirely: this deployment costs the company nine hundred dollars a month and saves a named team four days of work. That is a decision someone can actually make, and it is the decision stage 7 is built to inform.

## Missing telemetry means at-limit

If cost telemetry is absent, the deployment is treated as having exhausted its budget. This feels aggressive and is the only safe default: telemetry gaps correlate with load, and load correlates with spend. The failure mode of the friendly default — treating missing data as zero — is an unbounded bill discovered at month end.

## Boundary

This stage owns whether a deployment keeps running. It does not own what to do about it. Turning a pattern of failures into a better prompt, a different model tier, or a retired agent is stage 7's job, and it needs a person.
