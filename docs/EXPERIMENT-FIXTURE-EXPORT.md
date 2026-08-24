# P3.3 Legacy Fixture Export

**Status:** complete on `migration/p33-factory-map-fixtures-v3`; pending
independent review

**Contract:**
`../prod-eng-govrn-op-model/docs/experiment-fixture-contract.md` v3.0

**Authority:** executable design-research evidence only; the complete v0.10
Markdown remains the operating-model SSOT

## Provenance boundary

Commit A `55c89f535ae15eb52a8b791d68bce710d40da69e` introduced the
adapter registry, full verifier, named source test, and nine executable source
rules. A-equivalent `06f36ae9a42c03ea1a292bffc73804134c313c25`
added executable recovery cases for every blocking or refused family. Final
A-equivalent `68d727c30a96cb8e046de2ce38fa9ee69af17e1e` stabilised the
committed-repository verifier path and is the exact revision pinned by all
fixtures. Fixture export follows in a separate Commit B; these commits must not
be squashed.

The verifier resolves and executes every declared source test and source rule,
proves that executable provenance has not changed since the pinned revision,
derives `expected` solely from `given` and `when`, and compares the complete
outcome, code, structured result, owner, exit condition, and invalidation list.

## Coverage

| Requested family             | Executable evidence                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Authoritative owner          | Duplicate ownership blocks; a single owner is the reachable accepted recovery                                               |
| Relationships                | Unknown targets refuse; self-relations block; resolved non-self relations are accepted                                      |
| Provider/consumer operations | A withdrawn operation blocks; an exactly published operation is accepted                                                    |
| Events                       | A consumed event without an origin blocks; a matching emitter is accepted                                                   |
| Cost drivers                 | The production schema refuses a cost range without a driver and accepts one with a driver                                   |
| Hot-path accounting          | Missing call counts refuse; complete local/cross-boundary arithmetic passes; an overrun is recorded without becoming a gate |
| Repository forcing findings  | A missing legacy forcing function blocks and a declared `host` finding is accepted                                          |

All 18 documents are `legacy_behaviour`. Every requested P3.3 family has
executable evidence, so this export submits no structured gap document.

## Semantic boundary

Every shared outcome and recovery record is explicitly adapter-derived. The
fixtures use a small ontology-neutral input projection and synthetic names.
Legacy `data_owned`, `forcing_function`, operation, event, cost, and hot-path
fields appear only where required to replay the existing validator or analysis.

The export does not preserve the Agent Factory component tree as target
ontology. It assigns no v0.10 authority, backend, cloud placement, Agent
execution, or future repository owner. Synthetic unit/repository boundaries
exist only to exercise current accounting; they are not evidence-derived
production rooms. A hot-path budget overrun remains `RECORD_ONLY` because the
legacy implementation reports rather than gates it.

## Gates

From `harness-factory-map/harness-factory-map`:

```bash
npm run check
```

From `prod-eng-govrn-op-model`:

```bash
python3 scripts/validate_experiment_fixtures.py \
  ../harness-factory-map/fixtures/experiment
```
