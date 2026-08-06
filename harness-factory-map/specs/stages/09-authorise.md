---
id: stage-9-authorise
name: 9 · Per-run authorisation
entity_type: workflow-step
plane: control
scope: mvp
status: specified
risk: critical
actor_type: deterministic-system
automation_level: deterministic
data_classification: confidential
description: Every single invocation is authorised on its own merits against the deployment's envelope, budget, and the caller's identity.
exec_summary: Being approved to exist is not permission to run. Each run is checked against who asked, what the agent may touch, and what it may spend.
business_value: This is what makes an agent running thousands of times a week acceptable rather than terrifying.
owner: platform-security
human_accountable: Head of Platform Security
stage_order: 9
loop: runtime
tags:
  - runtime
  - authorisation
  - budget
depends_on: []
connects_to:
  - stage-10-execute
reference_elements: []
responsibilities:
  - Resolve the caller's identity, whether a person or a schedule's service principal
  - Evaluate the invocation against the deployment's declared scope and the current policy version
  - Reserve budget against both the run cap and the deployment's monthly ceiling
  - Mint a scoped, short-lived task token covering only the tools the deployment declares
owns:
  - The per-run authorisation decision and its evidence
does_not_own:
  - The rules being evaluated, which belong to policy-engine
  - The envelope being enforced, which belongs to agent-deployment
  - The execution that follows
inputs:
  - An invocation bound to a deployment version
outputs:
  - An authorised run with a scoped token, a budget reservation, and a recorded decision
permissions:
  - Read policy, deployment envelope, budget state, and caller identity
restrictions:
  - Cannot grant a permission the deployment does not declare
  - Cannot grant a permission the caller does not themselves hold
  - Cannot issue a token outliving the run's declared timeout
failure_behaviour:
  - Any control that cannot evaluate its condition denies the run
  - Budget ceiling reached suspends the deployment rather than only failing the run
  - Policy version unavailable denies; it never falls back to a cached permissive decision
open_questions:
  - "Does an agent invoked by a person act with that person's data access, the deployment's fixed access, or the intersection?"
  - "What identity does a scheduled run act as, and who is accountable for what it touches?"
---

# Stage 9 · Per-run authorisation

Stage 5 governance decided this agent may exist. This stage decides this *run* may happen. Collapsing the two is the single most likely way this platform causes a serious incident.

## Why approval-once is not enough

An approved deployment is a standing capability. Between its approval and any given run, four things can have changed: the policy version, the caller, the data the agent can reach, and how much money is left. None of those were knowable at approval time.

A platform that checks only at approval is correct on day one and progressively wrong from day two, and the drift is invisible because nothing fails.

## The four checks

| Check | Question | Denies when |
| --- | --- | --- |
| Identity | Who is actually asking | The caller cannot be resolved, or the schedule's principal is disabled |
| Scope | Is this within what the deployment declares | The parameters reach outside the declared scope |
| Entitlement | May this caller have this done on their behalf | The caller lacks the access the run would exercise |
| Budget | Is there money for this run | The run cap or the deployment's monthly ceiling is reached |

All four fail closed. That is a deliberate availability trade: if the policy engine is down, no published agent runs. The alternative — degrading to permissive — makes the platform least controlled exactly when it is least healthy.

## The intersection rule

The most consequential open question on the platform sits here. When Finance publishes an agent and a Finance analyst runs it, the run can act with the analyst's access, the deployment's fixed service access, or the intersection of the two.

The intersection is the only one that is safe in both directions. Caller-inherited access lets a deployment become a route to data its owner never reviewed. Fixed service access lets a low-privilege caller reach data they could not reach themselves. Neither failure is theoretical, and neither is visible in an audit log until someone goes looking.

The intersection costs more to implement and will occasionally produce a confusing denial. That is the right price.

## Boundary

This stage owns the decision and its evidence. It does not own the rules, which are versioned elsewhere, and it does not own the envelope, which is a property of the deployment. Keeping the decision separate from the rules is what lets a rule change take effect without redeploying an agent.
