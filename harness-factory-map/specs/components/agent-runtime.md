---
id: agent-runtime
name: Agent Runtime
entity_type: component
plane: execution
scope: mvp
status: specified
risk: critical
actor_type: agent
automation_level: agent-with-review
data_classification: confidential
description: Executes one agent role for one step of a run, under a task-scoped token, inside the sandbox, through the tool gateway.
exec_summary: Where the agents actually think and work — understanding the job, researching it, planning it, and carrying it out.
business_value: This is the component that produces the value, and the component that spends the money. Both facts should shape how tightly it is bounded.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
workflow_id: stage-6-execution
workflow_order: 2
tags:
  - agent
  - runtime
  - execution
depends_on:
  - team-orchestrator
  - agent-package
  - retrieval-service
connects_to:
  - tool-gateway
  - sandbox
  - observability
  - audit-log
serves_stages:
  - stage-10-execute
reference_map:
  - Understand
  - Research
  - Plan
  - Execute
responsibilities:
  - Run one agent role for one step, against the approved contract
  - Ground its work through the retrieval service and cite what it used
  - Emit a structured step result the orchestrator can act on
  - Report token usage and cost for every model call
owns:
  - Step reasoning and its output
does_not_own:
  - Execution state, which belongs to the orchestrator
  - Its own permissions, budget, or time limit
  - Whether its output is acceptable
data_owned:
  - step result
inputs:
  - A step instruction, the contract, the package definition, and a task-scoped token
outputs:
  - A structured step result with citations, artifacts, evidence, and usage
permissions:
  - Call tools only through the tool gateway, only within the granted scope
  - Query approved knowledge through the retrieval service
restrictions:
  - Cannot call an external system directly — every call goes through the tool gateway
  - Cannot request, renew, or widen its own token, budget, or scope
  - Cannot write to enterprise source-of-truth data
  - Cannot mark its own work validated or delivered
  - Cannot proceed on ungrounded retrieval; it must escalate or ask
failure_behaviour:
  - A model timeout or refusal returns a step result marked failed with its reason, never a fabricated success
  - An ungrounded retrieval result halts the step and asks, rather than proceeding on model priors
  - Token expiry mid-step fails the step; the orchestrator decides whether to re-mint and resume
  - Exceeding its step token budget truncates and reports, rather than silently summarising away context
open_questions:
  - Which model tier is right per step? Understand and Plan justify a stronger model than Research summarisation, and paying one rate for all four is the default that quietly costs the most.
  - How is prompt-injection risk from retrieved content handled beyond citation — quarantine, or trust-tiering by source domain?
api_contract:
  - operation: "POST /v1/agent/steps"
    kind: sync-api
    caller: team-orchestrator
    worker: agent-runtime
    request: "{ run_id, step (understand|research|plan|execute), contract_id, contract_version, package_version, task_token, step_budget_usd, deadline }"
    response: "201 { step_result_id, status (ok|failed|needs_human), output, citations[], artifact_refs[], usage{ input_tokens, output_tokens, model_id, cost_usd } }"
    idempotency: "run_id + step + attempt; a repeat returns the existing result rather than re-spending"
    timeout: "Per-step deadline supplied by the caller, maximum 15 minutes"
    auth: "The task token; the runtime holds no standing credential of any kind"
    failure: "Every failure returns a step result with status failed and a reason. The runtime never returns a plausible answer in place of an error."
  - operation: "POST /v1/agent/steps/{step_result_id}/cancel"
    kind: sync-api
    caller: team-orchestrator
    worker: agent-runtime
    request: "{ step_result_id, reason }"
    response: "200 { cancelled: boolean, partial_output?, usage{} }"
    idempotency: "step_result_id"
    timeout: 5s
    auth: "Workload identity"
    failure: "Cancellation is best-effort within the step; the hard bound is the step deadline and the token TTL"
events_emitted:
  - agent.step.started
  - agent.step.completed
  - agent.step.failed
  - agent.needs_human
events_consumed: []
slo:
  availability: "99.5%"
  latency: "Step deadline is caller-supplied; the runtime enforces it rather than negotiating it"
  throughput: "20 concurrent steps"
cost:
  monthly_usd_low: 60
  monthly_usd_high: 160
  model_usd_per_task_low: 1.2
  model_usd_per_task_high: 9
  driver: "Model tokens per task — this is the platform's single largest and most volatile cost"
  note: "Infrastructure here is a rounding error next to model spend. At 500 tasks per month the model line alone is roughly $600–$4,500, against $60–$160 of compute. The levers that matter are step-appropriate model tiering, prompt caching, and above all stage 4 routing discipline — not container sizing."
  azure:
    - service: Azure Container Apps Jobs
      sku: "Consumption, event-triggered, 2 vCPU / 4 GiB, per-step job"
      monthly_usd_low: 40
      monthly_usd_high: 110
      note: "One job per step keeps blast radius and cost attribution clean."
      shared: false
    - service: Azure Container Registry
      sku: "Standard, runtime images"
      monthly_usd_low: 20
      monthly_usd_high: 50
      shared: true
---

# Agent Runtime

## Caller and worker

The **orchestrator calls**; this component **reasons and reports**. One step per invocation.

Deliberately, the runtime is not a long-lived agent loop that manages its own progress. It is a stateless worker that receives a step, does it, and returns a structured result. State, sequencing, retry, and budget all live outside it.

This shape costs a little efficiency — some context is re-established each step — and buys the ability to stop, resume, audit, and cost-attribute a run. That is a good trade at enterprise scale and a bad one in a demo, which is why demos usually make the other choice.

## Everything it does is bounded from outside

| Bound | Set by | Enforced by |
| --- | --- | --- |
| What it may touch | policy-engine | tool-gateway |
| For how long | identity-access token TTL | Token expiry |
| For how much | budget-guard | Step budget and checkpoints |
| Which model | agent-package | Runtime configuration |
| Deadline | team-orchestrator | Step deadline |

The runtime cannot alter any row of that table. It cannot renew its token, raise its budget, or add a tool. Every escape route is closed from the outside, which is what makes it safe to let it reason freely inside those bounds.

## No direct external calls

Every external interaction goes through `tool-gateway`. There is no HTTP client in the runtime that can reach outside the sandbox.

This is enforced at the network layer, not by convention, because "the agent should only use the gateway" is a statement about intent and agents are not bound by intent.

## Failure is reported, never simulated

A model timeout, a refusal, an ungrounded retrieval, an expired token — each returns `status: failed` with a reason.

The failure this specification exists to prevent is the confident fabrication: a runtime that, unable to retrieve the policy, produces a plausible answer about what the policy says. That output is indistinguishable from a correct one until it reaches a customer. Making ungrounded retrieval a hard halt is the only reliable defence.

## The cost conversation

This component is where the money goes. At 500 tasks per month, model spend here is several times the entire rest of the platform's infrastructure.

Three levers, in order of impact:

1. **Routing discipline** — every request stage 4 sends to the ticket system avoids this cost entirely.
2. **Step-appropriate model tiering** — Understand and Plan justify a strong model; Research summarisation usually does not.
3. **Prompt caching and context hygiene** — re-sending the whole contract every step is convenient and expensive.

Container sizing is not on the list.

## Acceptance criteria

- [ ] The runtime holds no standing credential and cannot renew its own token.
- [ ] No network path exists from the runtime to an external system except via tool-gateway, verified at the network layer.
- [ ] Ungrounded retrieval halts the step rather than producing an answer.
- [ ] Every failure returns a structured result with a reason, never a fabricated success.
- [ ] Repeating a step attempt returns the existing result without re-spending.
- [ ] Token usage and cost are reported for every model call.
- [ ] The runtime cannot mark its own work validated or delivered.
