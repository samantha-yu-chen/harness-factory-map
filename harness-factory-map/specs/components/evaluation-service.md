---
id: evaluation-service
name: Evaluation Service
entity_type: component
plane: assurance
scope: mvp
status: specified
risk: high
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Tests a step result against the contract's success criteria using deterministic checks first and model judgement only where necessary.
exec_summary: The automatic quality check that proves the work meets what was agreed, before a human is asked to look at it.
business_value: Reviewer time is the platform's scarcest resource. Every defect caught here is a review cycle saved.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 2
deployable_unit: repo-platform-core
module: assurance
workflow_id: stage-6-execution
workflow_order: 6
tags:
  - evaluation
  - assurance
  - quality
depends_on:
  - task-contract
  - team-orchestrator
connects_to:
  - human-review-gate
  - agent-package
  - outcome-ledger
  - audit-log
serves_stages:
  - stage-10-execute
reference_map:
  - Validate
consumes:
  - from: audit-log
    operation: "POST /v1/audit/records"
    note: "Every material decision this component makes is recorded before it is acted on."
responsibilities:
  - Run deterministic checks against the contract's success criteria
  - Apply model-based judgement only for criteria no deterministic check can cover
  - Return a pass or fail verdict with per-criterion evidence
  - Run a package's evaluation suite before publication
owns:
  - Evaluation verdicts and their evidence
does_not_own:
  - The success criteria, which come from the contract
  - The decision to deliver, which belongs to human-review-gate and the orchestrator
data_owned:
  - evaluation verdict
inputs:
  - A step result, its artifacts, and the contract's success criteria
outputs:
  - A per-criterion pass or fail with evidence, and an overall verdict
permissions:
  - Read the contract, the step result, and its artifacts
restrictions:
  - Cannot modify the result it is evaluating
  - Cannot pass a criterion it could not actually test — untestable is a distinct verdict from pass
  - A model judge may not evaluate output produced by the same model instance that generated it
failure_behaviour:
  - An untestable criterion returns untestable, which routes to human review; it never counts as a pass
  - A judge timeout returns untestable rather than defaulting either way
  - A partial evaluation reports which criteria were covered, never an overall pass on partial coverage
open_questions:
  - Which criteria genuinely need a model judge versus a deterministic check, and how is that ratio tracked as a quality metric?
  - How is judge drift detected when the judge model itself is upgraded?
api_contract:
  - operation: "POST /v1/evaluations"
    kind: sync-api
    caller: team-orchestrator
    worker: evaluation-service
    request: "{ run_id, step_result_id, contract_id, contract_version, artifact_refs[] }"
    response: "201 { evaluation_id, verdict (pass|fail|untestable), criteria: [{ criterion, method (deterministic|judge), result, evidence }], coverage_ratio }"
    frequency: per-task
    retrofit: migration
    idempotency: "step_result_id + contract_version"
    timeout: "120s; a timeout returns untestable"
    auth: "Workload identity"
    failure: "An overall pass requires every criterion to pass and coverage_ratio to be 1.0; anything less is fail or untestable, never a rounded-up pass"
  - operation: "POST /v1/evaluations/suites"
    kind: batch-job
    caller: agent-package
    worker: evaluation-service
    request: "{ package_id, version, suite_ref }"
    response: "{ suite_run_id, passed, cases: [{ case, result, evidence }], pass_rate }"
    frequency: rare
    retrofit: refactor
    idempotency: "package_id + version + suite_ref"
    timeout: "30m"
    failure: "A suite that cannot run fails the publication rather than allowing it unevaluated"
  - operation: "GET /v1/evaluations/{evaluation_id}"
    kind: query
    caller: human-review-gate, outcome-ledger, auditors
    worker: evaluation-service
    request: "{ evaluation_id }"
    response: "200 { verdict, criteria[], coverage_ratio, evaluated_at, judge_model_id? }"
    frequency: per-task
    retrofit: refactor
    timeout: 2s
    auth: "Workload identity or reviewer role"
    failure: "404 for unknown; the judge model id is always disclosed so a verdict can be reassessed after a model change"
events_emitted:
  - evaluation.completed
  - evaluation.untestable
  - evaluation.suite.completed
events_consumed:
  - run.step.completed
slo:
  availability: "99.5%"
  latency: "p95 under 45s for a task evaluation"
cost:
  monthly_usd_low: 20
  monthly_usd_high: 60
  model_usd_per_task_low: 0.3
  model_usd_per_task_high: 2
  driver: "Criteria per contract and the proportion requiring a model judge"
  note: "Judge spend scales with how vague the contract's success criteria are. Improving stage 3 interview quality reduces this line directly — a sharper criterion becomes a deterministic check instead of a judge call."
  azure:
    - service: Azure Container Apps Jobs
      sku: "Consumption, 1 vCPU / 2 GiB, per-evaluation job"
      monthly_usd_low: 20
      monthly_usd_high: 60
      shared: false
---

# Evaluation Service

## Caller and worker

The **orchestrator calls** after every Execute step, and `agent-package` calls before publication. This component **judges and returns evidence**; it never modifies what it is judging.

## Deterministic first, judge only where necessary

Every criterion is attempted deterministically before a model judge is considered. A schema check, a numeric comparison, a file existence test, a regression suite — all of these are cheaper, faster, and reproducible.

The model judge is for criteria that genuinely need it: tone, completeness against a described intent, whether a summary is faithful. `coverage_ratio` and the deterministic-to-judge ratio are worth tracking as quality metrics — a rising judge share usually means intake is producing vaguer success criteria, not that the work got subtler.

## Untestable is not pass

The single most important line here. A criterion the service could not test returns `untestable`, and `untestable` routes to human review.

Rounding untestable up to pass is how an automated gate becomes theatre. Rounding it down to fail is how the platform stops working. Routing it to a human is the honest option, and it also creates the pressure that improves criteria over time, because untestable criteria cost reviewer time and somebody notices.

## The judge cannot mark its own homework

A model judge may not evaluate output from the same model instance that produced it. Different instance at minimum, and for high-risk work a different model family.

Self-evaluation correlates errors: a model that misunderstood the task in generation will misunderstand it identically in judgement, and return a confident pass.

## Acceptance criteria

- [ ] An overall pass requires every criterion to pass with coverage_ratio 1.0.
- [ ] Untestable is a distinct verdict and routes to human review.
- [ ] A judge timeout returns untestable, never a default verdict.
- [ ] Deterministic checks are attempted before any judge call, proven by trace.
- [ ] The judge model is never the same instance that generated the output.
- [ ] The judge model id is recorded with every verdict.
- [ ] A package suite that cannot run blocks publication.
