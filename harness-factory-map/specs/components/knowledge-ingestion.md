---
id: knowledge-ingestion
name: Knowledge Ingestion
entity_type: component
plane: knowledge
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Publishes owned, versioned, classified enterprise documents and builds the derived retrieval index from them.
exec_summary: Takes the company's approved documents, records who owns each one, and keeps the search index in step with them.
business_value: Turns ten scattered document estates into one governed corpus that every agent team can be trusted to read.
owner: data-platform
human_accountable: Chief Data Officer
build_wave: 2
deployable_unit: repo-platform-core
module: knowledge
workflow_id: stage-0-enterprise-brain
workflow_order: 1
tags:
  - knowledge
  - ingestion
  - rag
depends_on:
  - identity-access
connects_to:
  - retrieval-service
  - audit-log
reference_map:
  - Policies & Procedures
  - Legal Documents
  - Finance Rules
  - Procurement Process
  - Product Knowledge
  - Sales Playbooks
  - Templates & Workflows
  - Decision & Audit History
  - Data & Systems
  - Risk & Controls
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
  - from: identity-access
    operation: "GET /v1/identity/access-filter"
    note: "Source permissions captured at ingest so the index cannot outlive them."
responsibilities:
  - Accept a document only from its declared data owner
  - Attach owner, version, effective date, classification, and retention to every document
  - Chunk, embed, and index approved content into the retrieval index
  - Withdraw an index entry within the agreed window when its source is superseded
owns:
  - The published-document boundary
  - The index build pipeline
does_not_own:
  - The upstream systems of record the documents come from
  - Interpretation of what a document means
  - Any decision made using the content
data_owned:
  - published document version
  - index build manifest
inputs:
  - Documents submitted by a named data owner
  - Domain classification and retention rules
outputs:
  - Published, versioned documents
  - A refreshed retrieval index with source metadata
permissions:
  - Write to the published-document store as the ingestion service identity
  - Rebuild and swap retrieval indexes
restrictions:
  - Rejects any document with no named owner, no classification, or no effective date
  - No agent identity may invoke publication
  - Never edits document content — publication is whole-file, versioned, and immutable
failure_behaviour:
  - A failed index build leaves the previous index serving and raises an alert
  - A withdrawn source removes its index entries before the next retrieval, or retrieval degrades to "not grounded" for that domain
  - A classification the platform does not recognise blocks publication rather than defaulting to internal
open_questions:
  - Which upstream systems can emit a change event, and which need scheduled polling with an acceptable staleness window?
  - Who approves a retention exception for a document under legal hold?
api_contract:
  - operation: "POST /v1/knowledge/documents"
    kind: sync-api
    caller: Data owner, via the knowledge admin portal or a source-system connector
    worker: knowledge-ingestion
    request: "{ domain, title, owner_upn, classification, effective_date, retention_rule, source_system_id, content_ref }"
    response: "202 { document_id, version, index_eta_seconds }"
    frequency: per-day
    retrofit: migration
    idempotency: "source_system_id + content hash; re-publishing identical content is a no-op returning the existing version"
    timeout: "30s to accept; indexing is asynchronous"
    auth: "Entra ID; caller must hold the data-owner role for the named domain"
    failure: "403 when the caller does not own the domain; 422 on missing owner, classification, effective date, or retention; never 2xx without a durable document version"
  - operation: "DELETE /v1/knowledge/documents/{document_id}"
    kind: sync-api
    caller: Data owner
    worker: knowledge-ingestion
    request: "{ document_id, reason, withdraw_from_index_by }"
    response: "202 { document_id, withdrawal_id, status: withdrawing }"
    frequency: per-day
    retrofit: refactor
    idempotency: "document_id; repeat calls return the existing withdrawal_id"
    timeout: 10s
    auth: "Entra ID; data-owner role for the document's domain"
    failure: "409 when the document is under legal hold; withdrawal from the index is guaranteed before the withdrawal is reported complete"
  - operation: "knowledge.index.rebuild"
    kind: batch-job
    caller: Scheduler, or a source-change event
    worker: knowledge-ingestion
    request: "{ domain?, since_version?, full_rebuild: boolean }"
    response: "{ build_id, documents_indexed, chunks_written, duration_seconds }"
    frequency: rare
    retrofit: refactor
    idempotency: "build_id; concurrent builds for one domain are serialised"
    timeout: "4h, then abort and keep the previous index"
    failure: "A partial build is discarded whole; the index is swapped only on a complete, verified build"
events_emitted:
  - knowledge.document.published
  - knowledge.document.withdrawn
  - knowledge.index.rebuilt
  - knowledge.index.build_failed
events_consumed: []
external_events_consumed:
  - source.document.changed
slo:
  availability: "99.5% for publication; indexing is asynchronous"
  latency: "Published content is retrievable within 15 minutes for standard domains, 60 minutes for a full rebuild"
  recovery: "Index rebuildable from published documents within 4 hours with no data loss"
cost:
  monthly_usd_low: 35
  monthly_usd_high: 120
  driver: "Corpus size and change rate; assumes ~50 GB across ten domains with a few hundred changes per month"
  note: "Embedding spend is charged here, not per task. A full ten-domain rebuild costs roughly the same as two weeks of incremental indexing, so avoid scheduling one casually."
  azure:
    - service: Azure Data Lake Storage Gen2
      sku: "Standard, hot tier, LRS, ~50 GB with versioning"
      monthly_usd_low: 10
      monthly_usd_high: 35
      note: "Source of truth. Immutable blob policy on the legal and risk containers."
      shared: true
    - service: Azure AI Search
      sku: "Indexer capacity on the shared Basic/S1 service"
      monthly_usd_low: 0
      monthly_usd_high: 25
      note: "Service cost is carried by retrieval-service; only indexer overage is attributed here."
      shared: true
    - service: Azure Container Apps Jobs
      sku: "Consumption, event-triggered, 1 vCPU / 2 GiB"
      monthly_usd_low: 15
      monthly_usd_high: 45
      note: "Chunking and embedding workers."
      shared: false
    - service: Azure OpenAI embeddings
      sku: "text-embedding-3-large, ~30M tokens/month"
      monthly_usd_low: 10
      monthly_usd_high: 15
      note: "Re-embedding on a full rebuild is the cost spike to watch."
      shared: false
---

# Knowledge Ingestion

## Caller and worker

The **caller is always a human data owner or a connector acting under that owner's mandate**. There is deliberately no path for an agent to publish. This is the single rule that keeps the enterprise brain from becoming a place where agents leave notes for each other that later read as company policy.

The **worker is this component**, and its job is narrow: validate the governance metadata, store the file immutably, and keep the derived index consistent with what was stored.

## What it refuses

Publication fails, loudly, when any of these is missing:

- a named owner who currently holds the data-owner role for that domain
- a classification the platform recognises
- an effective date
- a retention rule

These are not nice-to-haves that can be backfilled. A document without an owner cannot be withdrawn when it goes stale, and a document without a classification cannot be access-filtered at retrieval time — which means it either leaks or it is unusable, and you find out which one in production.

## Publication is whole-file and versioned

There is no partial update. A changed policy is a new version of the whole document, with its own effective date. Diffing and merging document content is exactly the kind of helpful behaviour that turns "which version of the expense policy did the agent apply in March" into an unanswerable question.

## Withdrawal beats correction

When a document is superseded, the old version stops being retrievable before the new one starts. The window is bounded and measured. An agent citing a withdrawn policy is worse than an agent that says it could not find the policy, because the first one is confidently wrong and the second one escalates.

## Acceptance criteria

- [ ] Publication is rejected when owner, classification, effective date, or retention is absent.
- [ ] An agent identity receives 403 on every write path, and the attempt is audited.
- [ ] Every indexed chunk resolves to a document id, version, classification, and owner.
- [ ] A withdrawn document is unretrievable within the stated window, verified by a test.
- [ ] A failed index build leaves the previous index serving and raises an alert.
- [ ] Re-publishing identical content returns the existing version rather than creating a duplicate.
- [ ] The index is fully rebuildable from published documents alone.
