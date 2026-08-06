---
id: task-contract
name: Task Contract
entity_type: artifact
plane: control
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: human-approves
data_classification: confidential
description: The versioned, counter-signed statement of what will be done, for whom, with what data, and what success means.
exec_summary: The agreement that says exactly what will be delivered and how we will know it worked — signed by a named person.
business_value: Every downstream control — permissions, evaluation, acceptance, cost attribution — resolves against this document. Without it none of them mean anything.
owner: harness-platform
human_accountable: The named decision owner on each contract
build_wave: 1
workflow_id: stage-3-problem-intake
workflow_order: 2
tags:
  - contract
  - control
  - artifact
depends_on:
  - request-intake
connects_to:
  - work-classifier
  - policy-engine
  - team-orchestrator
  - evaluation-service
  - audit-log
reference_map:
  - Bounded problem statement captured
responsibilities:
  - Hold the nine intake answers as structured, versioned fields
  - Carry explicit, testable success criteria
  - Name the accountable decision owner and require their counter-signature
  - Declare the data and systems the work may touch
owns:
  - The contract document and its version history
does_not_own:
  - Approval to fund the work
  - The permission grant, which policy-engine derives from it
  - Execution state
data_owned:
  - task contract version
inputs:
  - Nine mapped clarification answers and their citations
outputs:
  - A versioned, counter-signed contract that downstream stages resolve against
permissions:
  - Persist contract versions
  - Request a counter-signature from the named decision owner
restrictions:
  - Cannot be modified in place — every change is a new version
  - Cannot be counter-signed by the agent that drafted it, or by the requester alone when they are not the decision owner
  - Cannot reference a data source outside the requester's own access envelope
failure_behaviour:
  - An unsigned contract cannot progress past stage 4; it waits in awaiting-signature and escalates on a timer
  - A superseded version remains readable forever; execution always names the version it ran against
  - A counter-signature on a version that has since been superseded is rejected, not carried forward
open_questions:
  - When a contract is amended mid-execution, does the run restart, continue under the old version, or pause for re-signature?
api_contract:
  - operation: "POST /v1/contracts"
    kind: sync-api
    caller: clarification-agent
    worker: task-contract
    request: "{ request_id, answers[9], citations[], decision_owner_upn, data_sources[], systems[] }"
    response: "201 { contract_id, version: 1, status: awaiting-signature }"
    idempotency: "request_id; a redraft creates version n+1 under the same contract_id"
    timeout: 5s
    auth: "Workload identity"
    failure: "422 when any answer is absent, empty, or when a declared data source is outside the requester's access envelope"
  - operation: "POST /v1/contracts/{contract_id}/signature"
    kind: human-decision
    caller: "The named decision owner"
    worker: task-contract
    request: "{ contract_id, version, decision (sign|reject), comment? }"
    response: "200 { contract_id, version, status (signed|rejected), signed_at, signed_by }"
    idempotency: "contract_id + version; re-signing the same version is a no-op"
    timeout: "No technical timeout; a business escalation fires after 3 working days"
    auth: "Entra ID; must match decision_owner_upn exactly — delegation is explicit, never implied"
    failure: "409 when the version has been superseded; 403 when the signer is not the named owner; an agent identity is always refused"
  - operation: "GET /v1/contracts/{contract_id}"
    kind: query
    caller: work-classifier, policy-engine, team-orchestrator, evaluation-service, human-review-gate
    worker: task-contract
    request: "{ contract_id, version? }"
    response: "200 { contract_id, version, answers[9], success_criteria[], data_sources[], systems[], decision_owner, status, signed_at? }"
    timeout: 2s
    auth: "Workload identity, or Entra ID for the requester and the decision owner"
    failure: "404 for unknown; omitting version returns the latest signed version, never the latest draft"
events_emitted:
  - contract.drafted
  - contract.signed
  - contract.rejected
  - contract.superseded
events_consumed:
  - clarification.session.completed
slo:
  availability: "99.9%"
  latency: "p95 under 400 ms to read"
  recovery: "Zero loss; contract versions are as durable as audit records"
cost:
  monthly_usd_low: 25
  monthly_usd_high: 60
  driver: "Contract versions stored and read; every downstream component reads this on every task"
  note: "Read volume, not write volume, drives this line — five or six components read the contract per task. Cache it in the orchestrator for the life of a run rather than provisioning more throughput."
  azure:
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, contract container partitioned by contract_id"
      monthly_usd_low: 20
      monthly_usd_high: 45
      note: "Move to provisioned throughput once read volume is steady; serverless is right while it is bursty."
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: false
---

# Task Contract

## Caller and worker

The `clarification-agent` **drafts**; the named **decision owner signs**; five downstream components **read**. This component is the worker for all three, and it holds the only authoritative copy.

The signature is the load-bearing part. An agent drafted the contract, but a person is accountable for it — and the platform enforces that by refusing an agent identity on the signature endpoint entirely.

## Versions, never edits

There is no update path. An amendment is version n+1, and the previous version stays readable forever.

This is what makes the audit trail usable a year later. "The agent did X, and here is the exact contract version it ran against, and here is who signed that version" is a complete answer. "The agent did X and here is the current contract" is not, because the contract has moved four times since.

Note the guard in the signature contract: signing a superseded version returns 409. Without it, a slow approver signs a version that no longer exists and everyone believes the wrong thing is authorised.

## Success criteria are testable or they are not criteria

Question 9 of the interview — "what does success look like" — becomes `success_criteria[]`, and `evaluation-service` runs against it directly.

That downstream use is what forces the quality. A criterion that cannot be evaluated is a criterion that will be argued about at delivery, and the argument will happen when everyone is already tired and money is already spent.

## The data envelope

`data_sources[]` and `systems[]` are not documentation. `policy-engine` derives the permission envelope from them, and `tool-gateway` enforces it call by call.

The check at draft time — that no declared source sits outside the requester's own access — closes the privilege-escalation-by-request path. A requester cannot obtain, through an agent, data they could not obtain themselves.

## Acceptance criteria

- [ ] No in-place update path exists; every change creates a new version.
- [ ] An agent identity is refused on the signature endpoint.
- [ ] Signing a superseded version returns 409.
- [ ] Reading without a version returns the latest *signed* version, not the latest draft.
- [ ] A declared data source outside the requester's access envelope is rejected at draft time.
- [ ] Every execution records the exact contract version it ran against.
- [ ] Success criteria are structured such that evaluation-service can execute against them.
