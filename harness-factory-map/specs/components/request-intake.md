---
id: request-intake
name: Request Intake
entity_type: component
plane: request
scope: mvp
status: specified
risk: medium
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: Single front door that normalises portal, chat, and email requests into one identified, deduplicated request record.
exec_summary: The one place every request arrives, whatever channel it came from, and gets a reference number.
business_value: One front door is what makes demand measurable. Without it there is no queue, no cost attribution, and no way to prove reuse is working.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
deployable_unit: repo-platform-core
module: intake
workflow_id: stage-1-request
workflow_order: 1
tags:
  - intake
  - channels
  - request
depends_on:
  - identity-access
connects_to:
  - solution-registry
  - clarification-agent
  - work-classifier
  - audit-log
reference_map:
  - Anyone in the organization can raise a request
  - Portal channel
  - Chat channel
  - Email channel
  - Direct execution path
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: identity-access
    operation: "POST /v1/identity/introspect"
    note: "Resolves the caller principal on every call; scope is never inferred from a previous one."
responsibilities:
  - Accept requests from portal, chat, and email adapters
  - Normalise every channel payload to one internal request shape
  - Bind the verified requester identity to the record
  - Detect duplicates and return the existing request
  - Acknowledge with a tracked identifier and honest expectations
owns:
  - The request record
does_not_own:
  - The requester's original wording, which is preserved verbatim and never rewritten
  - Any judgement about value, risk, or route
data_owned:
  - request record
inputs:
  - A natural-language request from an authenticated employee, via any approved channel
outputs:
  - A normalised request record with identity, channel, and tracking id
permissions:
  - Create a request on behalf of an authenticated employee
restrictions:
  - Cannot start execution, allocate budget, or promise a delivery date
  - Cannot alter the original request text
  - Cannot accept a request from an unauthenticated or unresolvable identity
failure_behaviour:
  - An unparseable channel payload is stored raw, flagged, and escalated to a human triage queue — never dropped, never guessed at
  - Identity resolution failure rejects the request with an actionable message to the sender
  - Duplicate submission returns the original request id rather than creating a second record
open_questions:
  - Should the email adapter accept requests from external suppliers, and if so under which identity and which classification ceiling?
api_contract:
  - operation: "POST /v1/requests"
    kind: sync-api
    caller: "Portal front end, Teams bot adapter, or mail connector"
    worker: request-intake
    request: "{ channel (portal|chat|email), requester_upn, title, body, attachments[]?, client_request_id, direct_route_hint? }"
    response: "201 { request_id, status: received, duplicate_of?, next_step, expectation_note }"
    frequency: per-task
    retrofit: migration
    idempotency: "client_request_id, 24-hour window; a repeat returns the original request_id with duplicate_of set"
    timeout: 5s
    auth: "Entra ID; the adapter presents the requester's identity, it does not assert its own"
    failure: "401 on unresolvable identity; 422 on a payload no adapter can map, which also files a triage item; never 2xx without a durable request_id"
  - operation: "GET /v1/requests/{request_id}"
    kind: query
    caller: "Requester, or any downstream stage"
    worker: request-intake
    request: "{ request_id }"
    response: "200 { request_id, original_text, normalised, requester, channel, status, stage, contract_id?, decision_id? }"
    frequency: per-task
    retrofit: refactor
    timeout: 2s
    auth: "Entra ID; the requester, their manager, or a platform role"
    failure: "404 for unknown; 403 rather than a filtered body when the caller may not read it"
  - operation: "request.received"
    kind: async-event
    caller: request-intake
    worker: solution-registry
    request: "{ request_id, normalised_text, requester_upn, direct_route_hint? }"
    response: "Consumed asynchronously; stage 2 replies with a reuse decision event"
    frequency: per-task
    retrofit: refactor
    idempotency: "request_id; the consumer must tolerate redelivery"
    timeout: "Delivery retried for 24h, then dead-lettered to human triage"
    failure: "A dead-lettered request is visible in triage within one hour; a request never sits silently unrouted"
events_emitted:
  - request.received
  - request.duplicate_detected
  - request.triage_required
events_consumed: []
slo:
  availability: "99.9%; this is the platform's visible front door"
  latency: "p95 under 800 ms to acknowledge"
  throughput: "50 requests per minute burst"
cost:
  monthly_usd_low: 45
  monthly_usd_high: 110
  driver: "Request volume plus the always-on edge; assumes 500–2000 requests per month"
  note: "Front Door carries a fixed base charge regardless of volume. If the platform is internal-only behind the corporate network, Application Gateway or even direct Container Apps ingress removes that line — worth confirming with the network team before committing to Front Door."
  azure:
    - service: Azure Front Door
      sku: "Standard, WAF managed ruleset, one endpoint"
      monthly_usd_low: 35
      monthly_usd_high: 70
      note: "Base charge dominates at MVP volume. Drop it if the platform never faces the public internet."
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, minimum one replica"
      monthly_usd_low: 10
      monthly_usd_high: 25
      note: "Cannot scale to zero — the front door must answer immediately."
      shared: false
    - service: Azure Service Bus
      sku: "Standard, one topic"
      monthly_usd_low: 0
      monthly_usd_high: 15
      note: "Shared with the orchestrator; attributed once in the platform rollup."
      shared: true
---

# Request Intake

## Caller and worker

The **callers are adapters**, not people: a portal front end, a Teams bot, a mail connector. The **worker** is this component.

The rule that keeps this clean is that an adapter presents the *requester's* identity, never its own. A mail connector that submits everything as `mail-connector@corp` destroys attribution for the entire platform at the very first hop, and no amount of downstream audit rigour recovers it.

## Three channels, one record

Channels differ in how much structure they arrive with. The portal gives you fields; email gives you a paragraph and a signature block; chat gives you three messages and an emoji. The adapters absorb all of that. Everything past this component sees one shape.

The alternative — letting channel differences leak downstream — means every later component grows a conditional for email, and the platform slowly acquires three subtly different intake behaviours that nobody meant to build.

## Preserving the original

`original_text` is stored verbatim and never rewritten. Normalisation produces an *additional* field, never a replacement.

This matters more than it sounds. When a delivered outcome is disputed, the question is always "what did they actually ask for", and the answer must not be a paraphrase that a component generated. The requester's own words are evidence; the normalised form is a convenience.

## The direct execution path

`direct_route_hint` carries the dashed line from the reference diagram: a requester who names a registered agent team skips the clarification interview.

It skips conversation, not control. A direct-path request still gets a request record, still passes stage 4 classification, still passes `policy-engine`, and still lands in the audit log. The hint is a routing preference, and `work-classifier` is free to overrule it — which it must, if the risk score says so.

## Honest acknowledgement

The acknowledgement says *received*, not *accepted*, and carries an `expectation_note`. This is a one-line field that prevents a recurring organisational failure: a requester who believes stage 1 was a commitment, discovering at stage 5 that it was not.

## Acceptance criteria

- [ ] All three channels produce an identical internal request shape.
- [ ] The requester's identity, not the adapter's, is bound to every record.
- [ ] `original_text` is byte-identical to what the requester sent.
- [ ] A repeat submission within 24 hours returns the original request id.
- [ ] An unparseable payload creates a triage item and is never dropped.
- [ ] The acknowledgement distinguishes received from accepted.
- [ ] A dead-lettered request appears in human triage within one hour.
