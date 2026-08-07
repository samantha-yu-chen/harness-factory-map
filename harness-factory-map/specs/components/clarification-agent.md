---
id: clarification-agent
name: Clarification Agent
entity_type: component
plane: control
scope: next
status: specified
risk: high
actor_type: agent
automation_level: agent-with-review
data_classification: confidential
description: Conducts the fixed nine-question grill-me interview with the requester and drafts the task contract from the answers.
exec_summary: The interviewer that turns a vague request into a clear, agreed statement of what done looks like.
business_value: A specification caught here costs a conversation. The same gap caught after execution costs a rebuild and a credibility hit.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 3
deployable_unit: repo-platform-core
module: intake
workflow_id: stage-3-problem-intake
workflow_order: 1
tags:
  - intake
  - grill-me
  - agent
depends_on:
  - request-intake
  - retrieval-service
connects_to:
  - task-contract
  - audit-log
reference_map:
  - Structured clarification (grill-me) question set
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
responsibilities:
  - Ask all nine mandatory questions, in order, every time
  - Ground its follow-ups in approved enterprise knowledge with citations
  - Draft a task contract from the answers given
  - Halt in needs-human when a mandatory answer cannot be obtained
owns:
  - The interview transcript and its question-to-answer mapping
does_not_own:
  - The task contract itself, which is owned by task-contract and counter-signed by a human
  - Any judgement about value, risk, route, or funding
data_owned:
  - clarification transcript
inputs:
  - A request record and any reuse candidates from stage 2
  - Grounded context from the retrieval service
outputs:
  - Nine mapped answers, a draft contract, and a completeness verdict
permissions:
  - Message the requester and named stakeholders through the originating channel
  - Query approved knowledge on the requester's behalf
restrictions:
  - Cannot infer, default, or invent an answer the requester did not give
  - Cannot mark a contract complete with any mandatory question unanswered
  - Cannot promise a route, a date, a budget, or an approval
  - Cannot widen the request beyond what was asked
failure_behaviour:
  - An unanswerable mandatory question halts the contract in needs-human with the specific question named
  - A requester who stops responding times out to needs-human after the agreed window, and the stakeholder is told
  - Ungrounded retrieval means the agent asks the requester rather than filling the gap from model priors
open_questions:
  - How long may a contract sit in needs-human before auto-closure, and who is notified at each step?
  - Should the interview adapt its depth to the stage 2 verdict, or stay fixed for comparability across requests?
api_contract:
  - operation: "POST /v1/clarification/sessions"
    kind: sync-api
    caller: request-intake
    worker: clarification-agent
    request: "{ request_id, requester_upn, original_text, reuse_candidates[]? }"
    response: "201 { session_id, first_question, channel }"
    idempotency: "request_id; a repeat returns the existing session"
    timeout: 5s
    auth: "Workload identity"
    failure: "409 when a session already exists and is closed; a closed session is never silently reopened"
  - operation: "POST /v1/clarification/sessions/{session_id}/answers"
    kind: sync-api
    caller: "The requester, through their originating channel adapter"
    worker: clarification-agent
    request: "{ session_id, question_number (1-9), answer_text }"
    response: "200 { accepted: boolean, next_question?, unanswered[], status (in-progress|complete|needs-human) }"
    idempotency: "session_id + question_number; a re-answer supersedes and is versioned, not appended"
    timeout: 10s
    auth: "Entra ID; only the requester or a named stakeholder may answer"
    failure: "422 when an answer does not address the question asked, with the reason returned to the requester; never accepted-and-ignored"
  - operation: "POST /v1/clarification/sessions/{session_id}/draft-contract"
    kind: sync-api
    caller: clarification-agent
    worker: task-contract
    request: "{ session_id, request_id, answers[9], citations[], decision_owner_upn }"
    response: "201 { contract_id, version, status: draft }"
    idempotency: "session_id; redrafting produces a new contract version, never a second contract"
    timeout: 10s
    auth: "Workload identity"
    failure: "422 when any of the nine answers is absent; the agent cannot bypass this by supplying an empty string"
events_emitted:
  - clarification.session.started
  - clarification.session.completed
  - clarification.needs_human
events_consumed:
  - registry.match.completed
slo:
  availability: "99%"
  latency: "p95 under 6s per conversational turn"
cost:
  monthly_usd_low: 10
  monthly_usd_high: 30
  model_usd_per_task_low: 0.15
  model_usd_per_task_high: 0.8
  driver: "Conversational turns per request; assumes 12–30 turns across nine questions"
  note: "A mid-tier model is correct here. This is a structured interview against a fixed script, not open-ended reasoning — paying frontier-model rates for it is the easiest unnecessary cost in the platform."
  azure:
    - service: Azure Container Apps
      sku: "Consumption, 1 vCPU / 2 GiB, scale to zero"
      monthly_usd_low: 10
      monthly_usd_high: 30
      shared: false
---

# Clarification Agent

## Caller and worker

`request-intake` **calls** to open a session. Then the relationship inverts: the **requester** becomes the caller, answering questions, and this agent is the worker that maps answers to slots.

That inversion is why sessions have a timeout and a `needs-human` terminal state. The platform cannot compel a human to finish a conversation, so it must have a defined, visible thing that happens when they do not.

## Nine questions, all blocking

The question set is in `specs/stages/03-problem-intake.md`. All nine block, and this agent has no authority to waive one.

The pressure to add a "skip" will arrive in week two, usually from a senior requester in a hurry. The correct answer is that skipping goes to `needs-human`, where a platform engineer can record why the question is unanswerable for this request. That preserves the record of the exception, which a silent default does not.

## Grounded, not inventive

The agent may query approved knowledge to ask a *better* question — "the finance rules say purchases above 50k need a second approver, does that apply here?" — and must cite what it used.

It may never use retrieval to *answer* on the requester's behalf. When retrieval returns not-grounded, the agent asks the human. An intake agent that fills gaps from model priors produces contracts that look complete and are not, which is strictly worse than an obviously incomplete one.

## Why an agent and not a form

A form gets abandoned at question four, or filled with "see attached". An agent notices when an answer does not address the question and says so, in the requester's own channel, without making them start again.

That is a genuine capability difference, and it is also the whole justification for the model spend on this component. If the interview degenerates into a form-filler, replace it with a form and save the money.

## Acceptance criteria

- [ ] All nine questions are asked, in order, on every session.
- [ ] A contract cannot be drafted with any mandatory answer absent or empty.
- [ ] An answer that does not address its question is rejected with a reason, not accepted.
- [ ] Ungrounded retrieval results in a question to the human, never a model-supplied answer.
- [ ] Every citation used to shape a question is recorded in the transcript.
- [ ] Session timeout produces `needs-human` and notifies the named stakeholder.
- [ ] Re-answering a question produces a new contract version, never a second contract.
