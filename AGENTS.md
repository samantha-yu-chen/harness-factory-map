# Working on harness-factory-map

Read `CURRENT-DIRECTION.md`, then the package-level
`harness-factory-map/AGENTS.md`.

This repository is a legacy specification-map experiment. The complete and
final operating-model SSOT is sibling document
`../prod-eng-govrn-op-model/docs/v0/greenfield-ai-first-operating-model-v0.10.md`.
Diagram 1 v0.8 is its unchanged Delivery companion view; Diagrams 2 and 3 v0.10
are companion views. Per v0.10 §9.17, diagrams and this implementation explain
or test ideas but do not define authority.

Changes must preserve the user's existing worktree modifications and must not
regenerate or rewrite specifications unless that is the explicit task.

Allowed work before a deliberate remap is limited to correctness, validator
hardening, documentation, language-neutral export, historical labelling, and
tests for reusable architecture rules.

In migration P3, extract only the legacy validator and mapping behaviour as
language-neutral evidence. Do not claim that a fixture proves a v0.10 target
invariant. The root operating-model repository derives and owns v0.10
conformance cases in P5.

Do not add backend, credentials, cloud resources, or Agent execution. Do not
expand the old ontology as though it were the final target. Agent Factory
components, proposed repositories, and the current repository layout are not
evidence-derived production rooms.
