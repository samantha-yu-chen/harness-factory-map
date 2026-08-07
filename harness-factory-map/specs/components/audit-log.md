---
id: audit-log
name: Audit Log
entity_type: component
plane: assurance
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Append-only ledger of every material decision, approval, permission grant, and external side effect on the platform.
exec_summary: The permanent record of who decided what, when, and on what basis — for every request the platform touches.
business_value: This is the artefact that makes the platform defensible to auditors, regulators, and anyone asking why an agent did something.
owner: platform-security
human_accountable: Chief Risk Officer
build_wave: 1
deployable_unit: repo-identity
module: audit
workflow_id: stage-0-enterprise-brain
workflow_order: 4
tags:
  - audit
  - assurance
  - platform
depends_on:
  - identity-access
connects_to:
  - outcome-ledger
serves_stages:
  - stage-12-record
reference_map:
  - All decisions are logged and traceable
  - All intake decisions logged to audit trail
responsibilities:
  - Append immutable decision records
  - Link every record to request, contract, decision, identity, and task
  - Serve a complete trace for one request on demand
  - Enforce retention and legal hold
owns:
  - The decision ledger
does_not_own:
  - Operational telemetry, which belongs to observability
  - Interpretation of what a record means
data_owned:
  - audit record
inputs:
  - Decision, approval, permission, and side-effect events from every component
outputs:
  - An immutable, queryable, per-request decision trace
permissions:
  - Append records
  - Serve traces to auditors and reviewers
restrictions:
  - No update or delete path exists, for any caller, including platform operators
  - Cannot be bypassed by the component whose decision it is recording
failure_behaviour:
  - A failed append blocks the decision it was recording; the platform stops rather than acting unrecorded
  - Under sustained write failure the platform sheds new work and completes in-flight tasks in read-only mode
open_questions:
  - What is the agreed retention period per record class, and who signs off destruction at its end?
api_contract:
  - operation: "POST /v1/audit/records"
    kind: sync-api
    caller: "Any platform component making a material decision"
    worker: audit-log
    request: "{ record_type, request_id, task_id?, contract_id?, decision_id?, actor (identity + type), summary, rationale, evidence_refs[], at }"
    response: "201 { record_id, sequence, hash, previous_hash }"
    idempotency: "decision_id where present, otherwise caller-supplied record key; duplicate appends return the original record_id"
    timeout: "2s; the caller must treat a timeout as a failure to record, not as a success"
    auth: "Workload identity; every platform identity may append, none may modify"
    failure: "5xx blocks the caller's decision. There is no fire-and-forget path — an unrecorded decision must not take effect."
  - operation: "GET /v1/audit/trace/{request_id}"
    kind: query
    caller: human-review-gate, governance-board, outcome-ledger, auditors
    worker: audit-log
    request: "{ request_id, include_evidence: boolean }"
    response: "200 { request_id, records[] ordered by sequence, chain_verified: boolean }"
    timeout: 10s
    auth: "Entra ID; auditor, reviewer, or the request's own requester"
    failure: "404 for an unknown request; chain_verified=false is an incident, not a warning"
  - operation: "POST /v1/audit/legal-hold"
    kind: sync-api
    caller: General Counsel's office
    worker: audit-log
    request: "{ scope (request_id | contract_id | date_range), reason, applied_by }"
    response: "201 { hold_id, records_held }"
    idempotency: "scope + reason"
    timeout: 5s
    auth: "Entra ID; legal-hold role only"
    failure: "A hold that cannot be applied to the full scope is not applied partially — it fails and alerts"
events_emitted:
  - audit.record.appended
  - audit.chain.verification_failed
  - audit.write.degraded
events_consumed: []
slo:
  availability: "99.95%; the platform's availability cannot exceed this, by design"
  latency: "p95 under 200 ms for append"
  recovery: "Zero record loss. Recovery point objective is zero; this is the one store where that is non-negotiable."
cost:
  monthly_usd_low: 20
  monthly_usd_high: 55
  driver: "Records per month; assumes roughly 40 material decisions per task at 500 tasks per month"
  note: "Cheap to run, expensive to not have. Storage cost is dominated by retention period, so agree retention with Legal before build rather than after the first audit."
  azure:
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, append-only container, hash-chained records"
      monthly_usd_low: 15
      monthly_usd_high: 40
      note: "Serverless suits bursty append. Move to provisioned throughput above ~50k records per day."
      shared: true
    - service: Azure Blob Storage
      sku: "Standard cool tier with an immutable (WORM) time-based retention policy"
      monthly_usd_low: 5
      monthly_usd_high: 15
      note: "Evidence payloads and the periodic sealed export. WORM is what makes the ledger defensible."
      shared: true
---

# Audit Log

## Caller and worker

Every component is a **caller**. This component is the only **worker**, and it accepts exactly one verb: append.

There is no update endpoint, no delete endpoint, and no administrative override. Not because operators are untrusted, but because the existence of such a path makes every record in the ledger arguable. An auditor's first question about any log is "who could have changed this", and the only answer that ends the conversation is "nobody, and here is the hash chain".

## Recording blocks the decision

This is the design decision in this component that people push back on, so it is worth stating plainly: if the append fails, the decision does not happen.

The alternative — fire-and-forget, record asynchronously, tolerate loss — trades a rare availability blip for a permanent hole in the record, and the hole always appears around the incident you most need to reconstruct. A platform that acts without recording is a platform that cannot answer for itself.

Under sustained write failure the platform sheds new work and lets in-flight tasks finish read-only. That is a visible, bounded degradation with a clear operator signal, which is what you want at three in the morning.

## What belongs here and what does not

| Belongs in audit-log | Belongs in observability |
| --- | --- |
| A routing decision and its rationale | The latency of the routing call |
| A governance approval and its conditions | The queue depth of pending approvals |
| A permission grant and its scope | Token issuance rate |
| An external side effect that changed state | Retry counts and error rates |

The test is simple: would you need this to explain a decision to someone outside the engineering team? If yes, it is an audit record. Sending telemetry here makes the ledger expensive and its retention argument unwinnable.

## Acceptance criteria

- [ ] No API path exists that can modify or delete a record, verified by a test against the deployed surface.
- [ ] A failed append propagates as a failure to the calling component and blocks its decision.
- [ ] Every record links to request, actor identity, and actor type.
- [ ] A full per-request trace is retrievable and verifies its hash chain.
- [ ] Legal hold applies atomically to its whole scope or not at all.
- [ ] Retention is enforced per record class and destruction requires a signed-off action.
