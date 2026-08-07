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
