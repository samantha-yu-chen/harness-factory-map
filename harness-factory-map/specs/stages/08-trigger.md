---
id: stage-8-trigger
name: 8 · Invocation trigger
entity_type: workflow-step
plane: request
scope: mvp
status: specified
risk: high
actor_type: human
automation_level: deterministic
data_classification: internal
description: A published agent is invoked, either by a person from the catalogue or by a schedule, without re-entering the factory.
exec_summary: Someone needs the work done, so they run the agent — from a catalogue, or on a timetable that runs it for them.
business_value: This is the moment the platform stops being a project and starts being a service. Every run here is work that did not need an engineer.
owner: harness-platform
human_accountable: Deployment Owner (business unit)
stage_order: 8
loop: runtime
tags:
  - runtime
  - trigger
  - self-serve
depends_on: []
connects_to:
  - stage-9-authorise
reference_elements: []
responsibilities:
  - Let a person find a published agent, understand what it does, and run it with parameters
  - Fire a published agent on a declared schedule without a person present
  - Bind every invocation to exactly one deployment version
  - Refuse an invocation of a suspended, deprecated, or unpublished deployment
owns:
  - The invocation record and its parameters
does_not_own:
  - Whether the invocation is permitted, which is stage 9
  - The agent definition, which belongs to agent-package
  - The schedule's business justification, which belongs to the deployment owner
inputs:
  - A published, non-suspended deployment
  - Either a person's parameters or a schedule firing
outputs:
  - An invocation bound to one deployment version, awaiting authorisation
permissions:
  - Read the catalogue entries a caller is entitled to see
restrictions:
  - Cannot invoke a deployment that is suspended, deprecated, or past its review date
  - Cannot create work that no deployment covers — that is a new request and belongs at stage 1
  - A schedule cannot widen its own frequency, parameters, or target
failure_behaviour:
  - A schedule that cannot reach the platform alarms rather than silently skipping its window
  - A missed window is recorded as missed; it is never back-filled automatically
  - An invocation naming an unknown or suspended deployment is refused with the reason
open_questions:
  - "Can a requester pass free-text parameters to a published agent, or only choose from declared enumerated inputs?"
  - "Does a missed schedule window ever get run late, and who decides that?"
---

# Stage 8 · Invocation trigger

This stage is the reason the factory exists. Everything in stages 1 to 7 happens once per solution. This happens every time someone needs the work done.

## Why this is not stage 1 again

A request at stage 1 asks *"can something be done about this?"* An invocation here asserts *"the thing that does this already exists, run it."* Routing an invocation back through intake, clarification, classification, and governance would mean the platform never actually amortises the cost of building an agent — which is the only reason to build one.

The boundary is sharp and worth defending: if a caller wants something the deployment does not declare, that is a new request, not a parameter. The catalogue must make that refusal easy to say and easy to understand, because the alternative is deployments quietly growing scope through their input fields.

## Two surfaces, deliberately different risk

| | Self-serve catalogue | Schedule |
| --- | --- | --- |
| Who starts it | A named person, on demand | A service principal, on a timetable |
| Who notices a bad run | The person who started it, immediately | Nobody, until someone reads a report |
| Blast radius | One run, one person waiting | Every window until someone intervenes |
| Ships in | Wave 3 | Wave 4 |

Self-serve ships first on purpose. An attended run has a human who is already looking at the result, which is the cheapest oversight mechanism that exists. Unattended runs remove that, and they should not be available until the platform has enough operating history to know what a bad run looks like without being told.

## What the catalogue has to show

A catalogue that lists only names produces requests to the platform team asking what the names mean. Each entry carries what it does, what it needs from the caller, what it costs per run, who owns it, its current version, and when it last succeeded.

Cost per run belongs on the entry rather than buried in a report. A requester who can see that a run costs four dollars makes a different decision from one who cannot see anything, and that decision is the cheapest cost control the platform has.

## Boundary

This stage owns that an invocation happened and what it asked for. It does not own whether the invocation is allowed — that is the next stage, and it is deliberately separate so that no trigger surface can ever be the thing that authorises itself.
