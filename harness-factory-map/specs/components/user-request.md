---
id: user-request
name: User Request
entity_type: actor
plane: request
scope: mvp
status: specified
risk: low
actor_type: human
description: A business or engineering need submitted for controlled assessment.
owner: requester
tags:
  - request
  - actor
depends_on: []
connects_to:
  - intake-service
workflow_id: bounded-engineering-ticket
workflow_order: 1
responsibilities:
  - Provide the original intent and required outcome
owns:
  - Original request
does_not_own:
  - Cannot directly invoke production execution
inputs: []
outputs:
  - Task Contract
permissions:
  - Submit a request
restrictions:
  - Cannot directly invoke production execution
failure_behaviour:
  - Reject malformed or unauthenticated requests
---

# User Request

## Purpose

A business or engineering need submitted for controlled assessment.

## Initial design note

This is a first-pass specification. Later tickets should expand contracts, data ownership, permissions, failure behaviour, capacity, observability, and acceptance tests without changing this component's core boundary.
