---
id: stage-0-enterprise-brain
name: 0 · Enterprise Brain
entity_type: workflow-step
plane: knowledge
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Always-on platform band that supplies governed knowledge, identity, audit, and observability to every other stage.
exec_summary: The company's approved knowledge and its record of who decided what — every stage reads from it, no stage silently rewrites it.
business_value: Without one governed knowledge boundary each agent team invents its own answer to the same policy question, and nobody can prove afterwards which answer was used.
owner: data-platform
human_accountable: Chief Data Officer
stage_order: 0
tags:
  - enterprise-brain
  - knowledge
  - platform
depends_on: []
connects_to:
  - stage-1-request
reference_elements:
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
  - Governed access, approved knowledge
  - All decisions are logged and traceable
responsibilities:
  - Publish approved enterprise knowledge with an owner, version, and classification
  - Serve grounded retrieval with citations and access filtering
  - Record every material decision in an append-only ledger
  - Carry identity, secrets, and operational telemetry for the whole platform
owns:
  - The approved-knowledge boundary
  - The decision ledger
does_not_own:
  - The workflow decisions themselves
  - Source systems of record outside the published extract
inputs:
  - Approved enterprise documents from domain owners
outputs:
  - Cited, access-filtered retrieval results
  - Immutable decision and audit records
permissions:
  - Read published enterprise content on behalf of an authorised caller
restrictions:
  - Retrieval never approves work, grants permission, or overrides policy
  - No agent writes directly to a source-of-truth document
failure_behaviour:
  - Unavailable retrieval degrades to an explicit "not grounded" state, never to a guess
  - A failed audit write blocks the decision it was recording
open_questions:
  - Which of the ten knowledge domains have a named data owner today, and which are still unowned?
---

# Stage 0 · Enterprise Brain

## Why this is stage zero

The reference diagram draws the Enterprise Brain as a band across the top rather than a step in the flow. That placement is correct and load-bearing: it is not something a request passes through, it is something every stage reads from.

Treating it as a step is the most common way this architecture fails. If knowledge is a step, each stage caches its own copy, and six months later there are six versions of the expense policy in production.

## The ten domains

| Domain | Typical data owner | Classification | Changes |
| --- | --- | --- | --- |
| Policies & Procedures | Chief Operating Officer | internal | Quarterly |
| Legal Documents | General Counsel | restricted | On execution |
| Finance Rules | Financial Controller | confidential | Monthly close |
| Procurement Process | Head of Procurement | internal | Quarterly |
| Product Knowledge | Head of Product | internal | Per release |
| Sales Playbooks | Sales Operations | internal | Per campaign |
| Templates & Workflows | Head of Platform Engineering | internal | Continuous |
| Decision & Audit History | Chief Data Officer | confidential | Append-only |
| Data & Systems | Enterprise Architecture | confidential | Per integration |
| Risk & Controls | Chief Risk Officer | restricted | Quarterly |

A domain without a named owner is not in the brain. It is a folder. `knowledge-ingestion` refuses to index unowned content, and that refusal is deliberate — it is the only thing standing between "governed knowledge" and "a search index over a shared drive".

## The three separated memories

The phrase "enterprise memory" hides three boundaries that must not be merged.

1. **Source of truth** — the published, versioned document. Written only by its data owner.
2. **Retrieval index** — a derived copy, optimised for search. Read-only, rebuilt from source, never authoritative.
3. **Operational memory** — task contracts, approvals, checkpoints. Authoritative for workflow, silent on policy.

The single most expensive mistake available here is letting an agent write back into (1) because it was convenient to store its output somewhere. `knowledge-ingestion` and `retrieval-service` exist as separate components specifically so that no single credential can both read policy and rewrite it.

## Boundary

This stage supplies context and keeps records. It does not decide anything. Every decision in stages 1 to 7 is made by a named component or a named human, and lands here as a record afterwards.
