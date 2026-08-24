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

## P4 outcome

**Accepted.** The root operating-model repository has catalogued and
adjudicated this repository's P3.3 export. The accepted snapshot is this
repository's `main` at `3ebfdb8`
(`merge: export factory-map legacy fixtures v3`); the catalogue pins each
fixture to its executable Commit A revision, not to that merge. The
adjudication of record is
`../prod-eng-govrn-op-model/docs/p4-fixture-catalogue-adjudication.md`, backed
by `../prod-eng-govrn-op-model/catalogue/experiment-fixture-catalogue.json`.
Read the adjudication before relying on any summary here.

### Disposition split

All 18 exported fixtures were catalogued with no gaps:

| Disposition | Count |
|---|---:|
| `required_in_python` | 16 |
| `superseded_with_reason` | 0 |
| `historical_only` | 2 |

The two `historical_only` fixtures are
`harness-factory-map.repository-forcing-function-blocked` and
`harness-factory-map.repository-host-forcing-accepted`. P4's recorded reason:
the repository forcing-function findings remain executable design research, but
they do not discover a target room and are not Python parity gates; v0.10 keeps
B0 by default and permits fission only from measured boundary evidence and
human adjudication.

`historical_only` means reproducible design research retained for comparison,
not a target parity or gate requirement. It does not mean the fixture was
wrong, and it does not authorise deleting it. All 18 fixtures stay in this
repository under the P1-P5 no-deletion rule.

### Forcing-function narrowing

This is the most consequential P4 result for this repository. Repository
forcing-function findings are **historical findings, not room evidence.**

Under v0.10 rooms are discovered from evidence, production room boundaries are
never defined from the current repository layout, and room fission requires
evidence. A forcing-function verdict is therefore not a room boundary. Do not
read the forcing-function fixtures, the proposed `harness-control` /
`harness-execution` / `harness-platform-core` split, or any future forcing
analysis as a room proposal. "Derive rooms from the repo map" is
not a local backlog item and must not be filed as one.

### What remains required

The ownership, relation, contract/event, cost and hot-path validators remain
`required_in_python`. An approved target boundary that consumes those
capabilities must reproduce the implementation-neutral observation in addition
to the applicable v0.10 rules.

An over-budget hot path remains `RECORD_ONLY`. P4 did not promote it to a
block, consistent with the root rule that an unvalidated threshold is never
turned into a blocking gate.

P4 also confirmed that the exported fixtures remain ontology-neutral: synthetic
units are analysis inputs only. That neutrality is a constraint to preserve,
not a licence to extend the Agent Factory ontology to reach it.

### Zero semantic collisions, and what that does not mean

P4 adjudicated seven collision families across the six exports. **No collision
family touches this repository's fixtures.** Of the six source repositories,
this is the only one with zero collision entanglement.

A repository with no semantic collisions is exactly the one most likely to be
mistaken for already-aligned vocabulary. It is not. Zero collisions does not
mean:

- that this repository is the migration target;
- that the Agent Factory ontology is certified as v0.10 vocabulary;
- that this repository owns the future runtime;
- that this repository owns room definition.

`source_repository` in the catalogue means **provenance only.** P4 deliberately
assigned no future runtime owner, Python repository, Z2 provider, canonical
state store or room. That is P6's decision. P5 derives target invariants from
the complete v0.10 Markdown, not from this map.

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
