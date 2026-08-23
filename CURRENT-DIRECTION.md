# Current Direction

## Status

The current rendered Enterprise Agent Factory map is a validated historical
draft. It is useful evidence about architecture specification and repository
analysis. It is not the hybrid operating-model implementation specification.

The current source of truth is the sibling `prod-eng-govrn-op-model` repository:
v0.8 narrative and Diagram 1, plus v0.10 Diagrams 2 and 3.

## Retain

- Markdown front matter as structured architecture input;
- schema validation and unresolved-reference refusal;
- self-reference and dependency validation;
- one authoritative owner per data object;
- provider/consumer operation compatibility;
- event producer/consumer compatibility;
- coverage-gap reporting;
- forcing-function analysis for repository boundaries;
- retrofit-cost classification;
- cost estimates that name their volume driver;
- hot-path call accounting;
- generated views from one structured source.

## Retire as target ontology

- two loops named factory and runtime;
- thirteen fixed stages and twenty-nine required components;
- ticket, Harness Agent Team and Dedicated Agent Team as the three routes;
- low/medium/high/critical risk routing;
- task or Agent automation levels;
- a Governance Board as a required component;
- the proposed `harness-control`, `harness-execution`, and
  `harness-platform-core` split as an approved final topology;
- Azure placement and current cost rollups as implementation commitments.

## Next permitted direction

Do not try to transform the current map through piecemeal renames. A future
hybrid remap should start with a new schema version and migration fixtures that
can represent:

- one loop and four case packs;
- three actors;
- four consequence classes and rollback grade;
- Change, Artifact and Outcome identities;
- Activation as a boundary event;
- trust zones and authority ownership;
- evidence-derived rooms, distinct from repository placement.

Until that work is explicitly started, keep the current map reproducible and
clearly historical.

## Next safe coding task

Extract ontology-neutral validator fixtures for duplicate authoritative owners,
unresolved/self relationships, provider-consumer drift, event drift, missing
cost drivers, hot-path accounting and repository forcing functions. The output
should be JSON inputs plus expected findings that a later Python map validator
can replay. Do not design the v2 hybrid schema in the same change.
