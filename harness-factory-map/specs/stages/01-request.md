---
id: stage-1-request
name: 1 · User logs request
entity_type: workflow-step
plane: request
scope: mvp
status: specified
risk: medium
actor_type: human
automation_level: human-only
data_classification: internal
description: Any employee raises a request through a portal, chat, or email channel and receives a tracked identifier.
exec_summary: Anyone in the company can ask for work to be done, from wherever they already work, and gets a reference number back.
business_value: A single front door is what turns shadow AI usage into a governed queue that can be measured, prioritised, and costed.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 1
tags:
  - intake
  - channels
depends_on: []
connects_to:
  - stage-2-system-check
reference_elements:
  - Anyone in the organization can raise a request
  - Portal channel
  - Chat channel
  - Email channel
  - Direct execution path
responsibilities:
  - Accept a request from any approved channel
  - Normalise it to one internal shape
  - Attach the requester's verified identity
  - Return a tracked request identifier
owns:
  - The request record
does_not_own:
  - Whether the request is worth doing
  - Which execution route it takes
inputs:
  - A human request in natural language, from portal, chat, or email
outputs:
  - A normalised, identified, deduplicated request record
permissions:
  - Write a new request on behalf of an authenticated employee
restrictions:
  - Cannot start execution
  - Cannot change what the requester actually asked for
failure_behaviour:
  - An unparseable channel payload is stored raw and escalated to a human, never silently dropped
open_questions:
  - Does the email channel need to support external suppliers in phase two, and if so under whose identity?
---

# Stage 1 · User logs request

## The point of a single front door

Three channels, one record. Portal, chat, and email are adapters; they are not three intake systems. Everything downstream — classification, routing, governance, cost attribution — depends on there being exactly one request shape, so the adapters carry all the ugliness and `request-intake` stays boring.

## The direct execution path

The reference diagram draws a dashed line from the request straight past the system check. That line is real and worth keeping: for a requester who already knows which registered agent team they want, forcing a full intake conversation is friction with no governance value.

The rule that makes it safe is that the dashed line skips *conversation*, not *control*. A direct-path request still gets a request record, still gets classified, still passes the policy engine, and still lands in the audit log. It only skips the clarification dialogue.

## Boundary

This stage captures intent. It forms no opinion on value, risk, or route. A request accepted here has been *received*, not agreed to — and the acknowledgement the requester sees must say so, or stage 5 will be relitigating expectations that stage 1 accidentally set.
