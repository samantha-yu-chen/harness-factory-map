---
id: azure-cloud-scope
name: Azure Cloud Scope MVP
entity_type: component
plane: knowledge
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
description: Proposed Azure placement and data-memory boundaries for the Harness Agent Factory presentation MVP.
owner: cloud-platform
tags:
  - azure
  - cloud-scope
  - enterprise-memory
  - rag
depends_on:
  - policy-engine
  - audit-store
connects_to:
  - user-request
  - intake-service
  - task-contract
  - risk-classifier
  - orchestrator
  - agent-runtime
  - sandbox
  - review-service
  - pull-request
responsibilities:
  - Define proposed Azure service placement for each target workflow section
  - Separate enterprise source data, RAG retrieval, operational memory, and observability
  - Keep cloud responsibilities bounded and attributable
owns:
  - Azure placement map
  - Cloud boundary notes for the MVP
does_not_own:
  - Azure deployment or infrastructure provisioning
  - Agent reasoning or production orchestration
  - Enterprise policy authority
  - External source-system integration
inputs:
  - Approved Markdown specifications
  - Enterprise data classification and ownership decisions
outputs:
  - Cloud component placement
  - Data memory and retrieval boundaries
  - Engineering acceptance criteria
permissions:
  - Read approved specifications and architecture decisions
restrictions:
  - No live Azure credentials or service calls in the presentation prototype
  - RAG retrieval cannot approve work, grant permissions, or replace policy
  - Agents cannot write directly to enterprise source-of-truth data
failure_behaviour:
  - Block cloud design when a data owner or boundary is missing
  - Treat unavailable retrieval as an explicit degraded path, never as permission to guess
---

# Azure Cloud Scope MVP

## Purpose

This specification is the proposed Azure placement for the Harness Agent Factory. It is an engineering handoff for the next bounded implementation ticket, not a deployment manifest and not a production agent runtime.

The local prototype renders this document's concepts as a visual cloud-scope layer. The prototype does not connect to Azure.

## System boundary

The cloud layer supports request intake, governed retrieval, task-contract persistence, deterministic routing, bounded execution, evidence capture, and learning signals.

It does not own enterprise policy, invent permissions, replace human approval, or allow an Agent to mutate enterprise source data directly.

## Target workflow placement

| Section | Proposed Azure components | Responsibility boundary |
| --- | --- | --- |
| User logs request | Azure Front Door Standard/Premium; Azure Container Apps | Public HTTPS/WAF entry and request normalization only. No agent execution. |
| System check | Azure AI Search; Azure Data Lake Storage Gen2 | Read-only existing-solution retrieval over approved content. Search results are evidence, not approval. |
| Problem intake & grill-me | Azure Container Apps; Azure Cosmos DB for NoSQL | Clarify the problem and persist versioned task contracts. No governance approval. |
| Evaluate & decide | Azure Functions; Azure Service Bus | Apply deterministic risk rules and route the decision event. No permission expansion. |
| Governance approval | Microsoft Entra ID; Azure Key Vault; Azure Container Apps | Supply identity context, protect secrets, and expose a deny-by-default policy boundary. Human accountability remains explicit. |
| Build task-specific Agent | Azure Container Apps Jobs; Azure Service Bus; Azure Container Registry; Azure Blob Storage | Build, evaluate, and review the versioned Agent package. Build workers do not own policy or runtime state. |
| Deliver task-specific Agent | Azure Container Registry; Azure Container Apps; Azure Cosmos DB for NoSQL | Publish the reviewed package version and hand off a launch reference. Delivery completion is not task completion. |
| Agent carries out user task | Azure Container Apps; Azure Service Bus; Azure Blob Storage; Azure Cosmos DB for NoSQL | Run the delivered package against the approved task contract and return result/evidence. Runtime cannot mutate package, policy, or source data. |
| Loop engineering | Azure Data Lake Storage Gen2; Azure Monitor / Log Analytics; Azure Key Vault | Retain learning evidence and operational signals. No autonomous policy or Agent mutation. |

## Enterprise data memory

The phrase “enterprise memory” is split into three separate boundaries. There is no single unrestricted database that the Agent can query and update.

### 1. Source-of-truth data lake — Azure Data Lake Storage Gen2

Use ADLS Gen2 for raw and curated enterprise documents such as policies and procedures, legal documents, finance rules, procurement process, product knowledge, sales playbooks, templates, workflows, decisions, audit history, and approved data exports.

Data owners publish versioned content. Every document needs an owner, classification, effective date, source identity, and retention rule. Agents, RAG retrieval, and operational services do not write directly to this source boundary.

### 2. RAG retrieval boundary — Azure AI Search

Azure AI Search holds a derived text/vector/hybrid retrieval index built from approved source content. Retrieval should return source identity, document version, access-filter result, relevant passage, and citation metadata.

The search index is not the policy store. Retrieval can ground a response with approved, cited data, but it cannot approve a task, grant permissions, change a task contract, or make an execution decision. If retrieval is unavailable or confidence is insufficient, the workflow must make that condition visible and route to clarification or human review.

### 3. Operational memory database — Azure Cosmos DB for NoSQL

Use Cosmos DB for versioned task contracts, workflow context, approval records, memory pointers, idempotency keys, and execution checkpoints. This is the operational system of record for workflow data, not the source of enterprise knowledge.

Writes must be schema-versioned and attributable to an owner. Stale or unauthorized updates are rejected. A task contract may reference retrieved evidence by source ID and version; it must not copy unverified retrieval into policy truth.

## Data flow

1. Data owners publish approved documents to ADLS Gen2.
2. A governed indexing process creates or refreshes Azure AI Search indexes with source and access metadata.
3. System check and the delivered task-specific Agent request read-only retrieval with task and authorization context.
4. Retrieved passages return citations and are attached to the task contract or evidence record by reference.
5. Cosmos DB stores the versioned operational context, delivery record, and runtime checkpoints.
6. The delivered Agent executes the user task in a bounded runtime; artifacts and audit evidence are staged separately from source documents.
7. Learning signals are appended to the evidence boundary for human-led improvement.

## Engineering acceptance criteria

- [ ] Every target workflow section distinguishes Factory build, Agent delivery, Agent task execution, and learning with a named Azure component, one accountable owner, and a written boundary.
- [ ] ADLS Gen2 is identified as enterprise source-of-truth data storage; source ownership, classification, version, and retention are required.
- [ ] Azure AI Search is identified as a derived RAG retrieval index and returns source/version/citation metadata.
- [ ] Azure AI Search cannot approve work, grant permissions, or mutate policy data.
- [ ] Cosmos DB is identified as the operational memory database for versioned workflow records, not enterprise policy truth.
- [ ] Task-contract and workflow writes are schema-versioned, attributable, idempotent, and reject stale updates.
- [ ] An unavailable or low-confidence retrieval result produces an explicit degraded path or human-review route.
- [ ] Agent workers cannot write directly to ADLS source-of-truth data or bypass the policy boundary.
- [ ] The local prototype remains free of Azure credentials, SDK calls, deployment files, and external API calls.
- [ ] Each proposed service can be replaced without changing the Markdown component boundaries or acceptance criteria.

## Non-goals for this MVP

- Provisioning Azure resources, VNets, private endpoints, RBAC assignments, or CI/CD.
- Implementing live RAG, embeddings, an LLM, connectors, or external enterprise systems.
- Defining production retention, capacity, cost, disaster recovery, or compliance controls.
- Allowing an Agent to autonomously update policies, indexes, source data, or its own permissions.
