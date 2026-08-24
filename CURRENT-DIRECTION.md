# Current Direction

## Status

The current rendered Enterprise Agent Factory map is a validated historical
draft. It is useful as a validator and mapping-findings oracle: it preserves
reproducible examples of architecture specification, relationship checks,
cost/latency accounting, and repository analysis. It is not the operating-model
implementation specification.

The complete and final operating-model SSOT is sibling document
`../prod-eng-govrn-op-model/docs/v0/greenfield-ai-first-operating-model-v0.10.md`.
Diagram 1 v0.8 is the unchanged Delivery companion view referenced by v0.10;
Diagrams 2 and 3 v0.10 are the one-loop and Outcome companion views. The
diagrams explain the model but do not define authority. If this map, any
diagram, or an older draft conflicts with the v0.10 Markdown, v0.10 wins.

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

## Migration boundary

Do not try to transform the current map through piecemeal renames. In P3 this
repository exports ontology-neutral fixtures for behaviour that the current
validator actually proves. Those fixtures are legacy evidence, not target-model
conformance and not a proposal for a new schema.

The root operating-model repository derives v0.10 conformance cases in P5. A
future Python implementation consumes the retained P3 fixtures plus applicable
P5 cases only after its boundary is approved. It must not translate this
repository's component tree, proposed repository split, or schema file by file.

Rooms are discovered from change co-occurrence, state write-set, context
footprint, contract churn, and cross-module repair evidence. The Agent Factory
ontology, `specs/units/`, and the current repository layout do not establish
production room boundaries.

## Next safe coding task

P3.3 fixture extraction is complete on
`migration/p33-factory-map-fixtures-v3`. It exports 18 ontology-neutral,
executable legacy cases for authoritative ownership, relationships, operation
and event compatibility, cost drivers, hot-path accounting, and repository
forcing-function findings under fixture contract v3.0. Each negative case has
an executable accepted recovery, and budget overruns remain report-only. See
`docs/EXPERIMENT-FIXTURE-EXPORT.md`.

The next safe task is independent review and root catalogue adjudication. Do
not extend the Agent Factory ontology, treat synthetic unit inputs as room
evidence, add runtime infrastructure, or assign a future Python owner while
that review is pending.
