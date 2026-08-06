---
id: stage-11-deliver
name: 11 · Risk-tiered delivery
entity_type: workflow-step
plane: external
scope: mvp
status: specified
risk: high
actor_type: human
automation_level: agent-with-review
data_classification: confidential
description: The result is reviewed in proportion to the deployment's risk tier, then handed to the requester with its evidence and cost.
exec_summary: Low-risk work is delivered straight away and sampled afterwards; high-risk work waits for a named person to sign it off.
business_value: Risk tiering is what lets the platform scale to thousands of runs without either drowning reviewers or shipping unreviewed change.
owner: harness-platform
human_accountable: Deployment Owner (business unit)
stage_order: 11
loop: runtime
tags:
  - runtime
  - delivery
  - human-in-the-loop
depends_on: []
connects_to:
  - stage-12-record
reference_elements: []
responsibilities:
  - Apply the review requirement set by the deployment's risk tier, not chosen per run
  - Route high-tier results to a named reviewer with a service level
  - Deliver the outcome with its evidence, citations, cost, and package version
  - Sample low-tier deliveries after the fact so the tier stays evidence-based
owns:
  - The delivery record and the review decision
does_not_own:
  - The risk tier, which is set at governance and changed only there
  - The result content
  - Whether the outcome was useful, which stage 7 measures
inputs:
  - A validated result with evidence and cost
outputs:
  - A delivered outcome, and a review decision where the tier requires one
permissions:
  - Publish to the channels the deployment declares
restrictions:
  - Cannot deliver above the lowest tier without a recorded review decision
  - Cannot let a caller lower the review requirement for their own run
  - Cannot deliver a result whose evaluation did not pass
failure_behaviour:
  - A review queue breaching its service level raises a deployment health signal, not a silent auto-approve
  - An undeliverable channel retains the outcome and alerts the deployment owner
  - A rejected result is recorded as rejected and feeds stage 7, never quietly discarded
open_questions:
  - "Who reviews a scheduled high-tier run that completes outside working hours?"
  - "What sampling rate on low-tier delivery is enough to catch a tier that was set too low?"
---

# Stage 11 · Risk-tiered delivery

The tier is a property of the deployment, decided at governance. It is never chosen by the caller, and never by the agent.

## The tiers

| Tier | Typical work | Review before delivery | Sampling |
| --- | --- | --- | --- |
| Low | Read-only summaries, reports, drafts a person will obviously check | None | 1 in 20, after the fact |
| Medium | Work that produces something acted upon, reversibly | One named reviewer, same working day | All reviewed |
| High | Changes to a system of record, spend, or anything leaving the company | Named reviewer plus domain owner | All reviewed |
| Critical | Not eligible for unattended scheduling at all | Reviewer plus leadership sponsor | All reviewed |

## Why the tier cannot travel with the run

The obvious design is to let the agent, or the caller, declare a run low-risk when it clearly is. It is also the design that fails, because the judgement is being made by the party with an interest in the answer. A caller in a hurry and an agent optimising for a completed task will both reach for the cheaper tier, and neither is acting in bad faith.

Fixing the tier at the deployment means it can only move through a governance decision, with a reason and a date. That is slower, and it is the only version that stays true under pressure.

## The review queue is a real cost

A medium-tier deployment running two hundred times a month is two hundred human reviews. That is somebody's job, and if it is nobody's job the queue will resolve itself in one of two ways: reviewers rubber-stamping, or the platform stalling. Both are failures, and only the second one is visible.

So a tier above low is a staffing commitment, and it belongs in the governance decision alongside the budget. A deployment whose review queue breaches its service level raises a health signal at stage 12 — the platform notices before the reviewers give up.

## Boundary

This stage owns whether the result may leave and the record that it did. It does not own the tier, the content, or whether any of it was worth doing.
