---
id: stage-3-problem-intake
name: 3 · Problem intake & grill-me
entity_type: workflow-step
plane: control
scope: mvp
status: specified
risk: high
actor_type: agent
automation_level: agent-with-review
data_classification: confidential
description: Turns a loose request into a bounded, versioned task contract by asking a fixed question set and recording every answer.
exec_summary: A structured interview that turns "can you sort out our invoices" into something a team can actually be held to.
business_value: Most agent failures are specification failures. This is the cheapest place in the whole system to catch one.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 3
loop: factory
tags:
  - intake
  - contract
  - grill-me
depends_on: []
connects_to:
  - stage-4-evaluate
reference_elements:
  - Structured clarification (grill-me) question set
  - Bounded problem statement captured
  - All intake decisions logged to audit trail
responsibilities:
  - Ask the fixed clarification question set
  - Escalate to a human when an answer cannot be obtained
  - Produce a versioned task contract
  - Record every intake decision and its rationale
owns:
  - The task contract
does_not_own:
  - Whether the work is approved
  - Which execution route is chosen
inputs:
  - A normalised request record
  - Reuse candidates from stage 2
outputs:
  - A versioned task contract with explicit success criteria
  - Audit entries for every clarification decision
permissions:
  - Ask the requester and named stakeholders for clarification
  - Read approved knowledge to ground its questions
restrictions:
  - Cannot invent an answer the requester did not give
  - Cannot approve, price, or schedule the work
failure_behaviour:
  - An unanswerable mandatory question halts the contract in `needs-human` rather than guessing a default
open_questions:
  - How long may a contract sit in `needs-human` before it is auto-closed, and who is told?
---

# Stage 3 · Problem intake & grill-me

## The question set

The reference diagram lists nine questions. They are mandatory, they are fixed, and their order matters — each one narrows the next.

| # | Question | Why it is asked | Blocks the contract |
| --- | --- | --- | --- |
| 1 | What problem are you solving? | Separates symptom from cause | Yes |
| 2 | Why does this matter? | Feeds the value score in stage 4 | Yes |
| 3 | Is this repeatable? | Decides one-off team versus dedicated team | Yes |
| 4 | Who is the stakeholder? | Names who accepts the outcome | Yes |
| 5 | What is the expected outcome? | Becomes the acceptance criteria | Yes |
| 6 | What are the risks and impacts? | Feeds the risk score in stage 4 | Yes |
| 7 | What data and systems are involved? | Determines the permission envelope | Yes |
| 8 | Who owns the final decision? | Names the human accountable | Yes |
| 9 | What does success look like? | Becomes the measurable test | Yes |

All nine block. A contract with eight answers is not eighty-nine percent ready — it is a contract that will fail acceptance on the missing dimension. The escape hatch is `needs-human`, not a default value.

## Why an agent runs the interview and a human owns the result

The clarification agent is good at persistence and consistency: it asks all nine, every time, without getting bored on the fourth request of the morning. It is not good at knowing when a requester's answer is politically impossible. So the agent conducts, and the named decision owner from question 8 counter-signs the contract before stage 4 can price it.

## Boundary

This stage produces a contract. It does not decide whether the contract is worth honouring — that is stage 4 — and it does not decide whether the organisation will fund it — that is stage 5.
