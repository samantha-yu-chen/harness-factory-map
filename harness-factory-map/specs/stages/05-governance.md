---
id: stage-5-governance
name: 5 · Governance approval
entity_type: workflow-step
plane: governance
scope: next
status: specified
risk: critical
actor_type: human
automation_level: human-only
data_classification: confidential
description: Leadership decides whether to fund and own a proposed dedicated agent team, on four named criteria.
exec_summary: Leadership decides whether a new permanent agent team is worth having, who owns it, and what it is allowed to spend.
business_value: This is where accountability is attached to a name. Everything the platform runs afterwards traces back to a decision made here.
owner: governance-office
human_accountable: Leadership Team sponsor
stage_order: 5
tags:
  - governance
  - approval
  - lt-decision
depends_on: []
connects_to:
  - stage-6-execution
reference_elements:
  - LT reviews and approves the dedicated-team proposal
  - "Criterion: strategic fit"
  - "Criterion: value & ROI"
  - "Criterion: risk & compliance"
  - "Criterion: resourcing & ownership"
  - APPROVED — spin up dedicated agent team (registered, monitored, governed)
  - NOT APPROVED — use Harness Agent Team or ticket system instead
responsibilities:
  - Review the proposal against four named criteria
  - Record an approve or decline decision with conditions
  - Name the accountable owner and the spending ceiling
  - Register an approved team so it becomes discoverable and monitorable
owns:
  - The governance decision record
  - The register of approved agent teams
does_not_own:
  - Runtime authorisation of individual tool calls
  - The technical design of the team
inputs:
  - A dedicated-team proposal with contract, scores, and rationale
outputs:
  - An approve or decline decision, with conditions, owner, budget, and review date
permissions:
  - Approve creation, funding, and permission scope for an agent team
restrictions:
  - Cannot approve a proposal with no named human owner
  - Cannot approve an unbounded budget or an open-ended review date
failure_behaviour:
  - No quorum means no decision; the proposal waits and the requester is told
  - An expired review date suspends the team rather than letting it drift ungoverned
open_questions:
  - What decision-rights threshold lets a single sponsor approve a low-value team without the full leadership team?
---

# Stage 5 · Governance approval

## Human decision, machine enforcement

This stage is the one place in the map where the reference diagram and the running system diverge, and the divergence is intentional.

The **governance board** is a group of people making a funding and accountability decision. The **policy engine** is code that denies a tool call at runtime. Both are in this stage; they are not the same thing and must never share an implementation.

The failure mode when they are merged is quiet and expensive: a leadership approval gets encoded as a permanent runtime allow-rule, and nine months later nobody can tell whether an agent may read the payroll extract because someone approved a business case in a meeting, or because someone approved a technical scope in a ticket. Keep the decision human, keep the enforcement mechanical, and make the enforcement cite the decision.

## The four criteria

| Criterion | The question | Evidence supplied |
| --- | --- | --- |
| Strategic fit | Does this belong on our roadmap at all? | Contract, requester's business unit |
| Value & ROI | Does the annualised value exceed build plus run cost? | Stage 4 value score, cost model |
| Risk & compliance | What is the regulatory and reputational exposure? | Stage 4 risk score, data classification |
| Resourcing & ownership | Who owns it on an ordinary Tuesday in eight months? | Named owner, review cadence |

The fourth criterion fails more proposals than the other three combined, and it should. An agent team without a named owner does not get retired, does not get its evaluations updated, and does not get switched off when the underlying process changes.

## Declining well

NOT APPROVED is not a rejection of the work. It routes back to the Harness Agent Team or the ticket system — the work still gets done, it just does not get a permanent team. Making that explicit in the decision record is what stops declined proposals being resubmitted with inflated value scores.

## MVP reality

In waves 1 and 2 this stage runs as a scheduled human review with a template and a recorded outcome — a meeting, a document, and a written decision. That is a legitimate implementation, and it is the right one before there are enough proposals to justify tooling. Wave 3 systematises it. The map shows it as a stage from day one so the decision is never skipped, only performed by hand.
