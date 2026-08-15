import { describe, expect, it } from 'vitest';
import { SpecificationError, buildMap } from '../scripts/lib/specifications';
import type { SpecificationMetadata } from '../src/types/specification';

type Parsed = Parameters<typeof buildMap>[0][number];

const BASE: SpecificationMetadata = {
  id: 'placeholder',
  name: 'Placeholder',
  entity_type: 'component',
  plane: 'control',
  scope: 'mvp',
  status: 'specified',
  risk: 'low',
  actor_type: 'deterministic-system',
  description: 'A stand-in used to exercise one gate at a time.',
  exec_summary: 'A stand-in.',
  owner: 'harness-platform',
  human_accountable: 'Head of Platform Engineering',
  modules: [],
  consumes: [],
  external_events_consumed: [],
  tags: [],
  depends_on: [],
  connects_to: [],
  serves_stages: [],
  reference_elements: [],
  reference_map: [],
  responsibilities: [],
  owns: [],
  does_not_own: [],
  data_owned: [],
  inputs: [],
  outputs: [],
  permissions: [],
  restrictions: [],
  failure_behaviour: [],
  open_questions: [],
  api_contract: [],
  events_emitted: [],
  events_consumed: [],
};

function file(overrides: Partial<SpecificationMetadata>): Parsed {
  const metadata = { ...BASE, ...overrides };
  return { metadata, sourcePath: `specs/${metadata.id}.md`, rawMarkdown: '', body: '' };
}

const UNIT = file({
  id: 'unit-one',
  entity_type: 'deployable-unit',
  repository: 'repo-one',
  forcing_function: 'FF3-fault-isolation',
  modules: ['core'],
});

const PROVIDER = file({
  id: 'provider',
  deployable_unit: 'unit-one',
  module: 'core',
  build_wave: 1,
  api_contract: [
    {
      operation: 'POST /v1/things',
      kind: 'sync-api',
      caller: 'consumer',
      worker: 'provider',
      request: '{ }',
      response: '201 { }',
      failure: '422 on an unusable request',
    },
  ],
});

describe('placement gates', () => {
  it('accepts a unit, a member, and a resolvable module', () => {
    expect(() => buildMap([UNIT, PROVIDER], 'test')).not.toThrow();
  });

  it('refuses work that is scheduled but has nowhere to land', () => {
    const orphan = file({ id: 'orphan', build_wave: 1 });
    expect(() => buildMap([UNIT, orphan], 'test')).toThrow(SpecificationError);
  });

  it('refuses a member of a unit that was never specified', () => {
    const stray = file({ id: 'stray', build_wave: 1, deployable_unit: 'unit-two', module: 'core' });
    expect(() => buildMap([UNIT, stray], 'test')).toThrow(/not a deployable-unit specification/);
  });

  it('refuses a module the unit does not declare', () => {
    const stray = file({ id: 'stray', build_wave: 1, deployable_unit: 'unit-one', module: 'invented' });
    expect(() => buildMap([UNIT, stray], 'test')).toThrow(/is not declared by unit-one/);
  });

  it('refuses a separate repository with no forcing function behind it', () => {
    const vague = file({ id: 'unit-two', entity_type: 'deployable-unit', repository: 'repo-two', modules: ['core'] });
    expect(() => buildMap([vague], 'test')).toThrow(/forcing_function/);
  });
});

describe('contract-pairing gates', () => {
  it('accepts a consumer naming an operation its provider publishes', () => {
    const consumer = file({
      id: 'consumer',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      consumes: [{ from: 'provider', operation: 'POST /v1/things' }],
    });
    expect(() => buildMap([UNIT, PROVIDER, consumer], 'test')).not.toThrow();
  });

  it('refuses a consumer naming an operation the provider does not publish', () => {
    const consumer = file({
      id: 'consumer',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      consumes: [{ from: 'provider', operation: 'POST /v1/withdrawn' }],
    });
    expect(() => buildMap([UNIT, PROVIDER, consumer], 'test')).toThrow(/does not publish operation/);
  });

  it('refuses a specification that names itself as a relation', () => {
    const looping = file({ id: 'provider', deployable_unit: 'unit-one', module: 'core', build_wave: 1 });
    expect(() => buildMap([UNIT, { ...looping, metadata: { ...looping.metadata, depends_on: ['provider'] } }], 'test')).toThrow(
      /is the specification itself/,
    );
    expect(() => buildMap([UNIT, { ...looping, metadata: { ...looping.metadata, connects_to: ['provider'] } }], 'test')).toThrow(
      SpecificationError,
    );
  });

  it('refuses a consumer naming a provider that does not exist', () => {
    const consumer = file({
      id: 'consumer',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      consumes: [{ from: 'ghost', operation: 'POST /v1/things' }],
    });
    expect(() => buildMap([UNIT, PROVIDER, consumer], 'test')).toThrow(/unknown provider/);
  });

  it('refuses an event nobody emits, and accepts it once declared as external', () => {
    const listener = { id: 'listener', deployable_unit: 'unit-one', module: 'core', build_wave: 1 };
    expect(() => buildMap([UNIT, file({ ...listener, events_consumed: ['thing.changed'] })], 'test')).toThrow(
      /nothing emits/,
    );
    expect(() =>
      buildMap([UNIT, file({ ...listener, external_events_consumed: ['thing.changed'] })], 'test'),
    ).not.toThrow();
  });
});

const OTHER_UNIT = file({
  id: 'unit-two',
  entity_type: 'deployable-unit',
  repository: 'repo-two',
  forcing_function: 'FF4-regulatory-boundary',
  modules: ['core'],
});

const GATEKEEPER = file({
  id: 'gatekeeper',
  deployable_unit: 'unit-two',
  module: 'core',
  build_wave: 1,
  api_contract: [
    {
      operation: 'POST /v1/decisions',
      kind: 'sync-api',
      caller: 'hot-component',
      worker: 'gatekeeper',
      request: '{ }',
      response: '200 { }',
      frequency: 'per-action',
      retrofit: 'refactor',
      p95_ms: 50,
      failure: 'A check that cannot be evaluated denies',
    },
  ],
});

function hotComponent(overrides: Partial<SpecificationMetadata> = {}): Parsed {
  return file({
    id: 'hot-component',
    deployable_unit: 'unit-one',
    module: 'core',
    build_wave: 1,
    hot_path: { unit_of_work: 'one tool call', budget_p95_ms: 80 },
    consumes: [{ from: 'gatekeeper', operation: 'POST /v1/decisions', per_action: 1 }],
    ...overrides,
  });
}

const HOT_WORLD = [UNIT, OTHER_UNIT, GATEKEEPER];

describe('hot-path gates', () => {
  it('accepts a hot path whose every consumed operation states a call count', () => {
    expect(() => buildMap([...HOT_WORLD, hotComponent()], 'test')).not.toThrow();
  });

  it('refuses a hot path with a consumed operation it cannot count', () => {
    const uncounted = hotComponent({ consumes: [{ from: 'gatekeeper', operation: 'POST /v1/decisions' }] });
    expect(() => buildMap([...HOT_WORLD, uncounted], 'test')).toThrow(/requires per_action/);
  });

  it('refuses a per-action operation that commits to no latency budget', () => {
    const unpriced = file({
      id: 'unpriced',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      api_contract: [
        {
          operation: 'POST /v1/unpriced',
          kind: 'sync-api',
          caller: 'anybody',
          worker: 'unpriced',
          request: '{ }',
          response: '200 { }',
          frequency: 'per-action',
          failure: 'Denies',
        },
      ],
    });
    expect(() => buildMap([UNIT, unpriced], 'test')).toThrow(/must state a p95_ms budget/);
  });
});

describe('hot-path arithmetic', () => {
  it('reports an overrun rather than failing the build', () => {
    const overspent = hotComponent({
      consumes: [{ from: 'gatekeeper', operation: 'POST /v1/decisions', per_action: 2 }],
    });
    const { scale } = buildMap([...HOT_WORLD, overspent], 'test');
    expect(scale.budgetFindings).toHaveLength(1);
    expect(scale.budgetFindings[0]).toMatchObject({ committedMs: 100, budgetP95Ms: 80, overBudgetMs: 20 });
  });

  it('leaves a hot path that fits inside its budget out of the findings', () => {
    const { scale } = buildMap([...HOT_WORLD, hotComponent()], 'test');
    expect(scale.hotPaths).toHaveLength(1);
    expect(scale.budgetFindings).toHaveLength(0);
  });

  it('separates round trips that leave the repository from those that do not', () => {
    const local = file({
      id: 'neighbour',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      api_contract: [
        {
          operation: 'POST /v1/local',
          kind: 'sync-api',
          caller: 'hot-component',
          worker: 'neighbour',
          request: '{ }',
          response: '200 { }',
          p95_ms: 5,
          failure: 'Raises',
        },
      ],
    });
    const mixed = hotComponent({
      consumes: [
        { from: 'gatekeeper', operation: 'POST /v1/decisions', per_action: 1 },
        { from: 'neighbour', operation: 'POST /v1/local', per_action: 3 },
      ],
    });
    const { scale } = buildMap([...HOT_WORLD, local, mixed], 'test');
    expect(scale.hotPaths[0]).toMatchObject({ roundTrips: 4, crossUnitRoundTrips: 1, committedMs: 65 });
  });

  it('names the operations a hot path cannot price', () => {
    const silent = file({
      id: 'silent',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      api_contract: [
        {
          operation: 'POST /v1/silent',
          kind: 'sync-api',
          caller: 'hot-component',
          worker: 'silent',
          request: '{ }',
          response: '200 { }',
          failure: 'Raises',
        },
      ],
    });
    const guessing = hotComponent({
      consumes: [{ from: 'silent', operation: 'POST /v1/silent', per_action: 1 }],
    });
    const { scale } = buildMap([...HOT_WORLD, silent, guessing], 'test');
    expect(scale.hotPaths[0].unpricedOperations).toEqual(['silent · POST /v1/silent']);
  });
});

describe('retrofit classification', () => {
  it('separates what must be decided now from what can wait, worst first', () => {
    const risky = file({
      id: 'risky',
      deployable_unit: 'unit-one',
      module: 'core',
      build_wave: 1,
      api_contract: [
        {
          operation: 'POST /v1/records',
          kind: 'sync-api',
          caller: 'anybody',
          worker: 'risky',
          request: '{ }',
          response: '201 { }',
          retrofit: 'migration',
          failure: 'Raises',
        },
        {
          operation: 'POST /v1/model',
          kind: 'sync-api',
          caller: 'anybody',
          worker: 'risky',
          request: '{ }',
          response: '201 { }',
          retrofit: 'rewrite',
          failure: 'Raises',
        },
      ],
    });
    const { scale } = buildMap([...HOT_WORLD, risky], 'test');
    expect(scale.decideNow.map((entry) => entry.operation)).toEqual(['POST /v1/model', 'POST /v1/records']);
    expect(scale.deferrable.map((entry) => entry.operation)).toEqual(['POST /v1/decisions']);
    expect(scale).toMatchObject({ classifiedCount: 3, operationCount: 3 });
  });
});
