---
id: solution-registry
name: Solution & Agent Team Registry
entity_type: component
plane: governance
scope: next
status: specified
risk: medium
actor_type: deterministic-system
automation_level: agent-with-review
data_classification: internal
description: Searchable catalogue of approved solutions and registered agent teams, and the match engine that answers whether one already covers a request.
exec_summary: The catalogue of what we already built, and the check that stops us building it a second time.
business_value: Reuse is the only compounding cost saving in an agent platform. Everything else is a one-off efficiency.
owner: harness-platform
human_accountable: Head of Platform Engineering
build_wave: 3
workflow_id: stage-2-system-check
workflow_order: 1
tags:
  - reuse
  - registry
  - capability
depends_on:
  - retrieval-service
  - agent-team-registry
connects_to:
  - work-classifier
  - clarification-agent
  - team-orchestrator
  - audit-log
reference_map:
  - Does a suitable solution or agent team already exist?
  - YES — route to existing solution
  - NO — continue to problem intake
  - Go to Harness Agent Team
responsibilities:
  - Maintain a searchable capability description for every approved solution and registered team
  - Match an incoming request against the catalogue and score confidence
  - Return candidates with evidence, never a bare yes or no
  - Route a confident match to its owning team
owns:
  - The reuse decision record
  - Capability descriptions and their freshness
does_not_own:
  - Team registration, which belongs to agent-team-registry
  - Approval to build anything new
data_owned:
  - reuse decision
  - capability description
inputs:
  - A normalised request record
  - Registered team entries and their capability descriptions
outputs:
  - A reuse verdict of confident, weak, or none, with scored candidates and evidence
permissions:
  - Read the catalogue and the retrieval index
restrictions:
  - A match is a recommendation; it never constitutes approval or authorisation
  - Cannot register, modify, retire, or suspend a team
  - Cannot route to a suspended or expired team, at any confidence
failure_behaviour:
  - An unavailable catalogue returns verdict none with a reason and routes forward to intake — the requester is never blocked by a reuse check
  - Confidence below the domain threshold returns weak with candidates attached, never a silent none
  - A stale capability description (older than its refresh window) is excluded from matching and flagged to its owner
open_questions:
  - What confidence threshold makes an automatic route safe per domain, and who tunes it as the catalogue grows?
  - How is a capability description kept honest as a team's behaviour drifts from its original registration?
api_contract:
  - operation: "POST /v1/registry/match"
    kind: sync-api
    caller: request-intake
    worker: solution-registry
    request: "{ request_id, normalised_text, requester_upn, direct_route_hint? }"
    response: "200 { verdict (confident|weak|none), candidates: [{ team_id|solution_id, name, owner, score, evidence[], status }], threshold_used, reason? }"
    idempotency: "request_id; a repeat returns the same verdict and candidate set"
    timeout: "4s, then verdict none with reason: timeout"
    auth: "Workload identity"
    failure: "Never blocks — every failure path returns verdict none and lets the request continue to stage 3"
  - operation: "GET /v1/registry/entries"
    kind: query
    caller: "Requesters browsing the catalogue, governance-board, team-lifecycle"
    worker: solution-registry
    request: "{ domain?, owner?, status?, page }"
    response: "200 { entries: [{ id, name, capability_summary, owner, status, last_reviewed, monthly_run_cost }] }"
    timeout: 2s
    auth: "Entra ID; any employee may browse"
    failure: "Returns an empty page rather than an error when a filter matches nothing"
  - operation: "registry.entry.upserted"
    kind: async-event
    caller: agent-team-registry
    worker: solution-registry
    request: "{ team_id, capability_description, status, owner, effective_at }"
    response: "Consumed asynchronously; the match index is refreshed"
    idempotency: "team_id + effective_at"
    timeout: "Retried for 1h, then alerts — a stale catalogue silently mis-routes"
    failure: "A team that fails to index is excluded from matching rather than matched on stale data"
events_emitted:
  - registry.match.completed
  - registry.entry.stale
events_consumed:
  - registry.entry.upserted
  - request.received
slo:
  availability: "99%; degradation routes forward rather than blocking"
  latency: "p95 under 2s for a match"
cost:
  monthly_usd_low: 15
  monthly_usd_high: 40
  driver: "Catalogue size and request volume; trivial below a few hundred entries"
  note: "Reuses the shared AI Search service rather than standing up its own index. At MVP catalogue size, a Cosmos query with a semantic rerank is genuinely sufficient — do not build a separate search tier for this."
  azure:
    - service: Azure Cosmos DB for NoSQL
      sku: "Serverless, catalogue container"
      monthly_usd_low: 10
      monthly_usd_high: 25
      shared: true
    - service: Azure Container Apps
      sku: "Consumption, 0.5 vCPU / 1 GiB, scale to zero"
      monthly_usd_low: 5
      monthly_usd_high: 15
      shared: false
---

# Solution & Agent Team Registry

## Caller and worker

`request-intake` is the **caller**; this component is the **worker**. It is asked one question and it answers with evidence.

Note what it is not asked: it is never asked to *decide*. The verdict travels forward as an input to stage 3 and stage 4. A confident match short-circuits the clarification interview, but the request still passes classification and policy — because "we have a team for that" is not the same claim as "that team may do this, for this person, with this data".

## Three verdicts

| Verdict | Meaning | What happens next |
| --- | --- | --- |
| `confident` | A registered team clearly covers this | Route to that team's owner; skip stage 3 |
| `weak` | Something related exists | Continue to stage 3, carrying candidates so the interview can ask |
| `none` | Nothing found, or the check could not run | Continue to stage 3 clean |

The `weak` verdict is the one that earns this component its budget. Collapsing it into `none` throws away the registry's most useful output; collapsing it into `confident` routes people to teams that cannot help them, and they stop trusting the front door within a month.

## Never blocks

Every failure path here returns `none` and lets the request proceed. A reuse optimisation that can stop a requester getting help is a worse trade than occasionally building something twice.

Contrast this deliberately with `audit-log`, which blocks on failure. The difference is what each protects: the ledger protects accountability, this protects efficiency, and only one of those is worth stopping the platform for.

## Suspended teams are never matched

A team that is suspended, expired, or past its review date is excluded from matching regardless of score. The `team-lifecycle` component suspends teams whose review lapsed, and this exclusion is what gives suspension teeth — otherwise a lapsed team keeps quietly receiving work.

## Acceptance criteria

- [ ] Every failure path returns verdict `none` and allows the request to continue.
- [ ] `weak` verdicts carry their candidates forward to stage 3.
- [ ] A suspended or expired team is never returned as a candidate, proven by test.
- [ ] Capability descriptions older than their refresh window are excluded and flagged.
- [ ] A confident match still passes stage 4 classification and the policy engine.
- [ ] Every match verdict is recorded in the audit log with its evidence.
