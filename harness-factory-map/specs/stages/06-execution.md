---
id: stage-6-execution
name: 6 · Agent team execution
entity_type: workflow-step
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: agent
automation_level: agent-with-review
data_classification: confidential
description: The agent team carries out the approved contract through a fixed seven-step loop ending in human review and a delivered outcome.
exec_summary: The agents actually do the work — understand, research, plan, execute, validate — and a human signs it off before anything leaves the building.
business_value: This is where the value is produced. Everything upstream exists to make this step safe; everything downstream exists to make it better next time.
owner: harness-platform
human_accountable: Head of Platform Engineering
stage_order: 6
tags:
  - execution
  - agent-team
  - human-in-the-loop
depends_on: []
connects_to:
  - stage-7-learning
reference_elements:
  - Harness Agent Team executes the work end to end
  - Understand
  - Research
  - Plan
  - Execute
  - Validate
  - Review (human in the loop)
  - Deliver outcome & log decision
responsibilities:
  - Run the seven-step loop against the approved contract
  - Keep every tool call inside the granted permission envelope
  - Prove the result against the contract's success criteria
  - Obtain human review proportionate to risk before delivery
owns:
  - Execution state
  - The delivered outcome and its evidence
does_not_own:
  - The contract
  - Its own permissions
  - Whether the outcome was valuable
inputs:
  - An approved task contract and permission envelope
outputs:
  - A delivered outcome, its artifacts, its evidence, and its cost
permissions:
  - Call only the tools named in the permission envelope, for the duration of the task
restrictions:
  - Cannot widen its own scope, tools, budget, or time limit
  - Cannot deliver without evaluation evidence and the required review
failure_behaviour:
  - Budget or time exhaustion stops the run and delivers a partial result with an honest status
  - A failed evaluation returns to plan once, then escalates to a human
open_questions:
  - How many autonomous retry loops are acceptable before a human is interrupted, and does that number vary by risk tier?
---

# Stage 6 · Agent team execution

## The seven steps

| Step | What happens | Who does it | Can it be skipped |
| --- | --- | --- | --- |
| Understand | Restate the contract in the team's own terms and flag contradictions | Agent | No |
| Research | Retrieve grounded, cited context from the enterprise brain | Agent | Only if the contract needs no enterprise context |
| Plan | Produce a step list with the tools each step needs | Agent | No |
| Execute | Perform the steps through the tool gateway inside the sandbox | Agent | No |
| Validate | Test the result against the contract's success criteria | Evaluation service | No |
| Review | Human judgement proportionate to risk | Human | Only at the lowest risk tier |
| Deliver | Hand over the outcome, artifacts, evidence, and cost | Orchestrator | No |

Understand and Plan look skippable on a simple task and never are. They are the two steps that produce an artifact a human can disagree with *before* money is spent, which is the entire reason the loop is shaped this way.

## Harness Agent Team versus Dedicated Agent Team

Both run this identical loop. The difference is lifetime and governance, not mechanics:

- The **Harness Agent Team** is standing, shared, and generalist. It is assembled per task from the approved role library and dissolves when the task closes. No stage 5 approval, because nothing persists.
- A **Dedicated Agent Team** is a registered, versioned package with a named owner, its own budget, its own evaluation suite, and a review date. It persists, so it needs stage 5.

Keeping the loop identical is what makes promotion cheap. A dedicated team is a Harness Agent Team run that proved itself often enough to be worth freezing into a package — not a different architecture.

## Human in the loop, sized by risk

| Risk tier | Review before delivery | Typical turnaround |
| --- | --- | --- |
| Low | None; sampled after the fact | Immediate |
| Medium | One named reviewer | Same working day |
| High | Named reviewer plus domain owner | Two working days |
| Critical | Review plus leadership sponsor sign-off | Scheduled |

Review is a queue with a service level, not a vague promise of oversight. An unstaffed review queue converts directly into either unreviewed delivery or a stalled platform, and which one you get depends on how tired the person holding the pager is.

## Boundary

The team owns how the work is done and the evidence that it was done. It does not own what the work is, what it may touch, or whether it was worth doing.
