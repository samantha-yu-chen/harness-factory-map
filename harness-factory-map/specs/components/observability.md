---
id: observability
name: Observability
entity_type: component
plane: assurance
scope: mvp
status: specified
risk: medium
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: Operational logs, metrics, and distributed traces for every platform component and agent run.
exec_summary: The dashboards and alerts that tell the team whether the platform is healthy, slow, or quietly burning money.
business_value: An agent platform without per-task cost and latency telemetry cannot be tuned, and untuned agent spend compounds monthly.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 1
workflow_id: stage-0-enterprise-brain
workflow_order: 5
tags:
  - observability
  - platform
  - cost
depends_on: []
connects_to:
  - agent-deployment
  - budget-guard
  - outcome-ledger
serves_stages:
  - stage-12-record
reference_map: []
responsibilities:
  - Publish per-deployment health — success rate, cost burn, review latency — and flag incomplete measurement
  - Collect structured logs, metrics, and traces from every component
  - Correlate a full agent run under one trace id
  - Emit token and cost telemetry per task, per team, and per model
  - Alert on saturation, error rate, latency, and spend anomalies
owns:
  - Platform telemetry and alert rules
does_not_own:
  - Decision records, which belong to audit-log
  - Business outcome data, which belongs to outcome-ledger
data_owned:
  - telemetry stream
inputs:
  - Logs, metrics, and spans from all components and agent runs
outputs:
  - Dashboards, alerts, and per-task cost telemetry
permissions:
  - Ingest telemetry from platform workloads
restrictions:
  - Must not ingest prompt content, retrieved passage text, or restricted-classification payloads
  - Is not an audit trail and must never be cited as one
failure_behaviour:
  - Telemetry loss degrades visibility but never blocks execution — this is the deliberate inverse of audit-log
  - Ingestion overrun sheds low-severity telemetry first and says so
open_questions:
  - What sampling rate keeps agent-run traces useful for debugging without making Log Analytics the platform's largest single line item?
api_contract:
  - operation: "otlp.export"
    kind: async-event
    caller: "Every platform component and agent runtime"
    worker: observability
    request: "OTLP logs, metrics, and spans; every span carries request_id, task_id, team_id, and model_id where applicable"
    response: "Accepted or shed; the caller never waits on the result"
    idempotency: "Span id; duplicate exports collapse"
    timeout: "1s, fire and forget"
    auth: "Workload identity"
    failure: "Export failure is logged locally and dropped. Telemetry must never block a task."
  - operation: "GET /v1/telemetry/task-cost/{task_id}"
    kind: query
    caller: budget-guard, outcome-ledger, team-orchestrator
    worker: observability
    request: "{ task_id }"
    response: "200 { task_id, input_tokens, output_tokens, model_usd, infra_seconds, tool_calls }"
    timeout: 2s
    auth: "Workload identity"
    failure: "Returns partial data with a completeness flag; budget-guard treats incomplete cost data as at-limit, not as zero"
  - operation: "GET /v1/telemetry/deployments/{deployment_id}/health"
    kind: query
    caller: agent-deployment, team-lifecycle, agent-catalogue
    worker: observability
    request: "{ deployment_id, window }"
    response: "200 { success_rate, run_count, cost_burn_usd, cost_forecast_usd, review_latency_p95, telemetry_complete: boolean }"
    timeout: 2s
    auth: "Workload identity"
    failure: "telemetry_complete false is returned rather than a partial number presented as whole; every caller must treat incomplete measurement as at-limit"
  - operation: "deployment.health.degraded"
    kind: async-event
    caller: observability
    worker: agent-deployment
    request: "{ deployment_id, signal (success_rate|cost_burn|review_latency), observed, threshold, window }"
    response: "Consumed by agent-deployment, which suspends the deployment"
    idempotency: "deployment_id + signal + window"
    timeout: "Delivered within one evaluation window"
    auth: "Workload identity"
    failure: "A signal that cannot be evaluated is emitted as degraded rather than withheld — silence must never read as health"
events_emitted:
  - telemetry.alert.raised
  - telemetry.cost.anomaly
  - telemetry.ingest.shedding
events_consumed: []
slo:
  availability: "99% — deliberately lower than audit-log, because losing telemetry must never stop work"
  latency: "Telemetry visible within 60 seconds"
cost:
  monthly_usd_low: 80
  monthly_usd_high: 200
  driver: "Log Analytics ingestion volume; assumes 20–50 GB per month at 500 tasks"
  note: "Routinely the second-largest infrastructure line after AI Search, and the easiest one to accidentally triple by logging full agent transcripts. Sample spans, keep transcripts out, and set a daily ingestion cap on day one."
  azure:
    - service: Azure Monitor / Log Analytics
      sku: "Pay-as-you-go ingestion, 30-day interactive retention, daily cap set"
      monthly_usd_low: 70
      monthly_usd_high: 180
      note: "A commitment tier becomes cheaper above ~100 GB/month."
      shared: true
    - service: Azure Managed Grafana
      sku: "Essential"
      monthly_usd_low: 10
      monthly_usd_high: 20
      note: "Optional. Azure Workbooks cover the MVP at no extra cost."
      shared: true
---

# Observability

## Caller and worker

Every component **exports**; this component **receives**. The relationship is deliberately fire-and-forget in exactly the way `audit-log` is deliberately not.

That contrast is the clearest expression of the platform's priorities. Losing a metric costs you a dashboard. Losing a decision record costs you the ability to explain yourself. The two components therefore have opposite failure behaviour, and neither should be tempted toward the other's design.

## What must never be ingested

- prompt and completion text
- retrieved passage content
- any payload classified confidential or restricted

Agent transcripts are the single most tempting thing to log and the single worst thing to have in a general-purpose telemetry store with broad read access and a 30-day retention nobody reviewed. Debugging needs span structure, token counts, tool names, and error classes — not the text.

Where full transcript replay is genuinely needed for a review, it lives behind `audit-log` evidence references with the same access control as the task itself.

## Cost telemetry is a first-class output

Per-task token and cost telemetry is not a nice-to-have dashboard. It is the input to `budget-guard`, to the stage 4 routing rationale, and to the only metric leadership will actually ask about — cost per delivered outcome.

Note the deliberate asymmetry in the contract: when cost data is incomplete, `budget-guard` treats the task as at-limit rather than at-zero. A cost signal that fails open is not a budget control.

## Acceptance criteria

- [ ] Every agent run is retrievable as one correlated trace by task id.
- [ ] Prompt text, completion text, and retrieved passages are provably absent from ingestion.
- [ ] Per-task token and cost telemetry is available to budget-guard within 60 seconds.
- [ ] Incomplete cost data is flagged, and budget-guard treats the flag as at-limit.
- [ ] A daily ingestion cap is configured and its breach alerts rather than silently truncating.
- [ ] Telemetry failure is proven, by test, not to block task execution.
