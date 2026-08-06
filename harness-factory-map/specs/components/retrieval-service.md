---
id: retrieval-service
name: Retrieval Service
entity_type: component
plane: knowledge
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Read-only grounded retrieval that returns cited, access-filtered passages and never carries authority.
exec_summary: The search layer agents use to find approved company knowledge — it always shows its sources and never decides anything.
business_value: Grounded, cited answers are the difference between an agent a compliance officer can sign off and one they cannot.
owner: data-platform
human_accountable: Chief Data Officer
build_wave: 2
workflow_id: stage-0-enterprise-brain
workflow_order: 2
tags:
  - knowledge
  - rag
  - retrieval
depends_on:
  - knowledge-ingestion
  - identity-access
connects_to:
  - agent-runtime
  - clarification-agent
  - solution-registry
  - audit-log
serves_stages:
  - stage-10-execute
reference_map:
  - Governed access, approved knowledge
responsibilities:
  - Answer a retrieval query with ranked, cited passages
  - Apply the caller's access filter before ranking, never after
  - Return an explicit not-grounded result when confidence is insufficient
  - Record what was retrieved for every task
owns:
  - The retrieval contract and its citation format
does_not_own:
  - The content
  - The index build
  - Any decision made from the passages it returns
data_owned:
  - retrieval trace
inputs:
  - A query, a task context, and the caller's authorisation context
outputs:
  - Ranked passages with document id, version, classification, and citation
  - A grounded or not-grounded verdict
permissions:
  - Read the retrieval index as the calling identity's delegate
restrictions:
  - Cannot approve work, grant permission, or modify a task contract
  - Cannot return a passage the caller is not cleared to read, at any confidence level
  - Cannot write to the index or to any published document
failure_behaviour:
  - An unavailable index returns not-grounded with a reason; it never returns an ungrounded model answer
  - A caller with no resolvable access context is denied, not defaulted to public
  - A query that filters down to zero permitted passages returns not-grounded, not "no results found"
open_questions:
  - What relevance floor separates a weak but honest citation from a not-grounded verdict, per domain?
api_contract:
  - operation: "POST /v1/retrieval/query"
    kind: query
    caller: agent-runtime, clarification-agent, or solution-registry
    worker: retrieval-service
    request: "{ query, task_id, domains[]?, top_k (max 20), min_relevance?, on_behalf_of_token }"
    response: "200 { grounded: boolean, passages: [{ document_id, version, classification, owner, passage, relevance, citation }], filtered_count, reason? }"
    idempotency: "Read-only; safe to repeat. Every call is still traced against task_id."
    timeout: "3s, then return not-grounded with reason: timeout"
    auth: "Entra ID on-behalf-of; the access filter is derived from the token, never from the request body"
    failure: "403 when the token cannot be resolved; 200 with grounded=false when the index is unavailable or nothing clears the filter; never a passage the caller cannot read"
  - operation: "GET /v1/retrieval/traces/{task_id}"
    kind: query
    caller: human-review-gate, audit-log, outcome-ledger
    worker: retrieval-service
    request: "{ task_id }"
    response: "200 { task_id, queries: [{ query, at, document_ids[], grounded }] }"
    timeout: 2s
    auth: "Entra ID; reviewer or auditor role"
    failure: "404 when the task is unknown; passage text is never replayed here, only identifiers"
events_emitted:
  - retrieval.query.served
  - retrieval.not_grounded
events_consumed:
  - knowledge.index.rebuilt
slo:
  availability: "99.9%; degradation is an explicit not-grounded verdict, not an error page"
  latency: "p95 under 800 ms for top_k of 10"
  throughput: "20 queries per second sustained"
cost:
  monthly_usd_low: 80
  monthly_usd_high: 260
  model_usd_per_task_low: 0.05
  model_usd_per_task_high: 0.4
  driver: "Index tier, then queries per task; assumes 6–12 retrieval calls per task"
  note: "Azure AI Search Basic serves the MVP corpus. The jump to Standard S1 roughly triples this line and is driven by index size and replica count, not query volume — check corpus growth before assuming you need it."
  azure:
    - service: Azure AI Search
      sku: "Basic, 1 replica, 1 partition (S1 if the corpus exceeds 15 GB)"
      monthly_usd_low: 75
      monthly_usd_high: 245
      note: "The dominant line. Semantic ranker is billed separately per 1000 queries."
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, scale to zero"
      monthly_usd_low: 5
      monthly_usd_high: 15
      note: "The retrieval facade that applies access filtering and citation shaping."
      shared: false
---

# Retrieval Service

## Caller and worker

The **caller** is an agent or an intake service that needs grounded context. The **worker** is this component. The distinction that matters is what crosses the boundary: the caller sends a query and a token; it does not send an access level. The filter is derived from the token, server-side, every time.

If the caller could assert its own clearance, every prompt-injection path in the platform would terminate here.

## Filter before rank, never after

Access filtering happens before ranking. Filtering afterwards produces two problems, one obvious and one subtle. The obvious one: a passage the caller may not see has already been loaded into a process that will log it. The subtle one: `filtered_count` becomes an oracle — ask enough shaped queries and the count of hidden results tells you what exists.

The response returns `filtered_count` deliberately coarse, and the audit log records the query. A caller repeatedly probing a domain it cannot read is a security signal, not a retrieval tuning problem.

## Not-grounded is a first-class answer

`grounded: false` is a success response, not an error. The agent runtime is required to handle it by escalating or asking, never by proceeding on model priors.

This is the contract line that makes the whole knowledge plane worth building. A retrieval service that quietly returns weak matches when it has nothing good will train every agent above it to treat citations as decoration.

## What this component is not

It is not the policy store. A passage from the risk-and-controls domain describes a control; it does not enforce one. Enforcement is `policy-engine`, which reads versioned rules, not prose. Blurring the two produces an agent that can be argued out of a control by a well-phrased prompt.

## Acceptance criteria

- [ ] The access filter derives from the token and cannot be influenced by the request body.
- [ ] Every returned passage carries document id, version, classification, owner, and citation.
- [ ] An unavailable index returns `grounded: false` with a reason, and no model-generated substitute.
- [ ] A caller with no resolvable identity is denied rather than treated as public.
- [ ] Retrieval traces are queryable per task and contain identifiers, not passage text.
- [ ] A test proves that a restricted-classification passage is never returned to an uncleared caller.
