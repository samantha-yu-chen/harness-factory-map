import { deepStrictEqual } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import matter from 'gray-matter';

import {
  SpecificationError,
  buildMap,
  parseSpecification,
} from '../scripts/lib/specifications.js';
import type {
  ApiOperation,
  ConsumedOperation,
  ForcingFunction,
  SpecificationMetadata,
} from '../src/types/specification.js';

export const ADAPTER_ID = 'harness-factory-map.fixture-adapter.v3';
export const VERIFIER_RULE = 'harness-factory-map.verify.fixture-v3';
export const OUTCOME_RULE = 'harness-factory-map.normalize.outcome-v3';
export const RESULT_RULE = 'harness-factory-map.normalize.result-v3';
export const RECOVERY_RULE = 'harness-factory-map.normalize.recovery-v3';

type JsonObject = Record<string, unknown>;
type SharedOutcome =
  | 'ALLOW'
  | 'PASS'
  | 'FAIL'
  | 'REFUSE'
  | 'BLOCK'
  | 'ESCALATE'
  | 'RECORD_ONLY';
type ObservationKind =
  | 'allowed'
  | 'passed'
  | 'failed'
  | 'unevaluable'
  | 'unmet_prerequisite'
  | 'authority_exceeded'
  | 'record_only';

export interface NormalizedExpected {
  outcome: SharedOutcome;
  code: string;
  result: JsonObject;
  owner: string;
  exit_condition: string;
  invalidated_evidence: string[];
}

interface ExpectedInput {
  kind: ObservationKind;
  code: string;
  result: JsonObject;
  owner?: string;
  exitCondition?: string;
}

interface LegacyFixture {
  fixture_version: string;
  source_repository: string;
  given: JsonObject;
  when: JsonObject & { operation: string };
  expected: NormalizedExpected;
  legacy_context: {
    adapter?: {
      id?: string;
      source_revision?: string;
      source_tests?: string[];
      source_rules?: string[];
      verifier_rule?: string;
      outcome_rule?: string;
      result_rule?: string;
      recovery_rule?: string;
      invalidated_evidence_rule?: string;
    };
  };
}

const OUTCOME_BY_OBSERVATION: Readonly<Record<ObservationKind, SharedOutcome>> =
  {
    allowed: 'ALLOW',
    passed: 'PASS',
    failed: 'FAIL',
    unevaluable: 'REFUSE',
    unmet_prerequisite: 'BLOCK',
    authority_exceeded: 'ESCALATE',
    record_only: 'RECORD_ONLY',
  };

function expected(input: ExpectedInput): NormalizedExpected {
  return {
    outcome: OUTCOME_BY_OBSERVATION[input.kind],
    code: input.code,
    result: input.result,
    owner: input.owner ?? 'none',
    exit_condition: input.exitCondition ?? 'none',
    invalidated_evidence: [],
  };
}

function inputRefused(): NormalizedExpected {
  return expected({
    kind: 'unevaluable',
    code: 'FIXTURE_INPUT_REFUSED',
    result: { input_error: 'harness-factory-map.fixture-input-unevaluable' },
    owner: 'harness-factory-map.fixture-author',
    exitCondition: 'harness-factory-map.evaluable-fixture-input-provided',
  });
}

function asObject(value: unknown, name: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

function strings(value: unknown, name: string): string[] {
  return asArray(value ?? [], name).map((entry) => {
    if (typeof entry !== 'string')
      throw new Error(`${name} must contain strings`);
    return entry;
  });
}

const BASE: SpecificationMetadata = {
  id: 'placeholder',
  name: 'Synthetic specification',
  entity_type: 'component',
  plane: 'control',
  scope: 'mvp',
  status: 'specified',
  risk: 'low',
  actor_type: 'deterministic-system',
  description: 'Synthetic validator input.',
  exec_summary: 'Synthetic validator input.',
  owner: 'synthetic-owner',
  human_accountable: 'Synthetic accountable role',
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

type Parsed = Parameters<typeof buildMap>[0][number];

function optionalString(input: JsonObject, field: string): string | undefined {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  return value;
}

function optionalNumber(input: JsonObject, field: string): number | undefined {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

function operations(input: JsonObject): ApiOperation[] {
  return asArray(input.operations ?? [], 'specification.operations').map(
    (raw) => {
      const operation = asObject(raw, 'operation');
      const name = optionalString(operation, 'name');
      if (!name) throw new Error('operation.name is required');
      const value: ApiOperation = {
        operation: name,
        kind: 'sync-api',
        caller: optionalString(operation, 'caller') ?? 'synthetic-caller',
        worker: input.id as string,
        request: '{}',
        response: '200 {}',
        failure: 'The operation refuses invalid input.',
      };
      const p95 = optionalNumber(operation, 'p95_ms');
      if (p95 !== undefined) value.p95_ms = p95;
      if (operation.frequency === 'per-action') value.frequency = 'per-action';
      return value;
    },
  );
}

function consumes(input: JsonObject): ConsumedOperation[] {
  return asArray(input.consumes ?? [], 'specification.consumes').map((raw) => {
    const consumed = asObject(raw, 'consumed operation');
    const from = optionalString(consumed, 'from');
    const operation = optionalString(consumed, 'operation');
    if (!from || !operation)
      throw new Error('consumed operation requires from and operation');
    const value: ConsumedOperation = { from, operation };
    const perAction = optionalNumber(consumed, 'per_action');
    if (perAction !== undefined) value.per_action = perAction;
    return value;
  });
}

function specification(raw: unknown): Parsed {
  const input = asObject(raw, 'specification');
  const id = optionalString(input, 'id');
  if (!id) throw new Error('specification.id is required');
  const metadata: SpecificationMetadata = {
    ...BASE,
    id,
    name: id,
    data_owned: strings(input.data_owned, 'specification.data_owned'),
    depends_on: strings(input.depends_on, 'specification.depends_on'),
    connects_to: strings(input.connects_to, 'specification.connects_to'),
    events_emitted: strings(
      input.events_emitted,
      'specification.events_emitted',
    ),
    events_consumed: strings(
      input.events_consumed,
      'specification.events_consumed',
    ),
    external_events_consumed: strings(
      input.external_events_consumed,
      'specification.external_events_consumed',
    ),
    api_contract: operations(input),
    consumes: consumes(input),
  };
  if (input.boundary === true) {
    metadata.entity_type = 'deployable-unit';
    metadata.repository = optionalString(input, 'repository');
    metadata.forcing_function = optionalString(input, 'forcing_function') as
      | ForcingFunction
      | undefined;
    metadata.modules = strings(input.modules, 'specification.modules');
  }
  const unit = optionalString(input, 'unit');
  const module = optionalString(input, 'module');
  const buildWave = optionalNumber(input, 'build_wave');
  if (unit !== undefined) metadata.deployable_unit = unit;
  if (module !== undefined) metadata.module = module;
  if (buildWave !== undefined) metadata.build_wave = buildWave;
  if (input.hot_path !== undefined) {
    const hotPath = asObject(input.hot_path, 'specification.hot_path');
    const unitOfWork = optionalString(hotPath, 'unit_of_work');
    const budget = optionalNumber(hotPath, 'budget_p95_ms');
    if (!unitOfWork || budget === undefined)
      throw new Error('hot_path requires unit and budget');
    metadata.hot_path = { unit_of_work: unitOfWork, budget_p95_ms: budget };
  }
  if (input.cost !== undefined) {
    const cost = asObject(input.cost, 'specification.cost');
    metadata.cost = {
      monthly_usd_low: optionalNumber(cost, 'monthly_usd_low') ?? 0,
      monthly_usd_high: optionalNumber(cost, 'monthly_usd_high') ?? 0,
      driver: optionalString(cost, 'driver') ?? '',
    };
  }
  return {
    metadata,
    sourcePath: `specifications/${id}.md`,
    rawMarkdown: '',
    body: '',
  };
}

function specifications(given: JsonObject): Parsed[] {
  return asArray(given.specifications, 'given.specifications').map(
    specification,
  );
}

interface RefusalInput {
  message: RegExp;
  kind: 'unevaluable' | 'unmet_prerequisite';
  code: string;
  result: JsonObject;
  owner: string;
  exitCondition: string;
  success?: ExpectedInput;
}

function expectedBuildRefusal(
  given: JsonObject,
  input: RefusalInput,
): NormalizedExpected {
  try {
    buildMap(specifications(given), 'fixture-schema');
    if (input.success) return expected(input.success);
    return expected({
      kind: 'failed',
      code: `${input.code}_NOT_DETECTED`,
      result: { admitted: true, finding_detected: false },
      owner: 'harness-factory-map.maintainer',
      exitCondition: 'harness-factory-map.validator-rule-restored',
    });
  } catch (error) {
    if (
      !(error instanceof SpecificationError) ||
      !input.message.test(error.message)
    ) {
      return inputRefused();
    }
    return expected({
      kind: input.kind,
      code: input.code,
      result: input.result,
      owner: input.owner,
      exitCondition: input.exitCondition,
    });
  }
}

function duplicateOwnerExpected(given: JsonObject): NormalizedExpected {
  const inputs = specifications(given);
  const object = inputs.flatMap(({ metadata }) => metadata.data_owned)[0];
  const claimants = inputs
    .filter(({ metadata }) => metadata.data_owned.includes(object ?? ''))
    .map(({ metadata }) => metadata.id);
  return expectedBuildRefusal(given, {
    message: /authoritative data .* is already owned by/,
    kind: 'unmet_prerequisite',
    code: 'DUPLICATE_AUTHORITATIVE_OWNER_BLOCKED',
    result: { admitted: false, object, claimants },
    owner: 'harness-factory-map.specification-author',
    exitCondition: 'harness-factory-map.single-authoritative-owner-declared',
    success: {
      kind: 'allowed',
      code: 'SINGLE_AUTHORITATIVE_OWNER_ACCEPTED',
      result: { admitted: true, object, owner: claimants[0] },
    },
  });
}

function unresolvedRelationshipExpected(given: JsonObject): NormalizedExpected {
  const input = specifications(given).find(
    ({ metadata }) =>
      metadata.depends_on.length + metadata.connects_to.length > 0,
  );
  const target =
    input?.metadata.depends_on[0] ?? input?.metadata.connects_to[0];
  return expectedBuildRefusal(given, {
    message: /unresolved relationship reference/,
    kind: 'unevaluable',
    code: 'UNRESOLVED_RELATIONSHIP_REFUSED',
    result: { admitted: false, source: input?.metadata.id, target },
    owner: 'harness-factory-map.specification-author',
    exitCondition: 'harness-factory-map.relationship-target-resolved',
    success: {
      kind: 'allowed',
      code: 'RELATIONSHIP_TARGET_RESOLVED',
      result: { admitted: true, source: input?.metadata.id, target },
    },
  });
}

function selfRelationshipExpected(given: JsonObject): NormalizedExpected {
  const input = specifications(given).find(
    ({ metadata }) =>
      metadata.depends_on.length + metadata.connects_to.length > 0,
  );
  const relation = input?.metadata.depends_on.length
    ? 'depends_on'
    : 'connects_to';
  const target =
    input?.metadata.depends_on[0] ?? input?.metadata.connects_to[0];
  return expectedBuildRefusal(given, {
    message: /is the specification itself/,
    kind: 'unmet_prerequisite',
    code: 'SELF_RELATIONSHIP_BLOCKED',
    result: { admitted: false, source: input?.metadata.id, relation },
    owner: 'harness-factory-map.specification-author',
    exitCondition: 'harness-factory-map.non-self-relationship-declared',
    success: {
      kind: 'allowed',
      code: 'NON_SELF_RELATIONSHIP_ACCEPTED',
      result: { admitted: true, source: input?.metadata.id, target, relation },
    },
  });
}

function operationDriftExpected(given: JsonObject): NormalizedExpected {
  const inputs = specifications(given);
  const consumer = inputs.find(({ metadata }) => metadata.consumes.length > 0);
  const consumed = consumer?.metadata.consumes[0];
  return expectedBuildRefusal(given, {
    message: /does not publish operation/,
    kind: 'unmet_prerequisite',
    code: 'PROVIDER_CONSUMER_OPERATION_DRIFT_BLOCKED',
    result: {
      admitted: false,
      consumer: consumer?.metadata.id,
      provider: consumed?.from,
      operation: consumed?.operation,
    },
    owner: 'harness-factory-map.contract-author',
    exitCondition: 'harness-factory-map.provider-consumer-operation-aligned',
    success: {
      kind: 'allowed',
      code: 'PROVIDER_CONSUMER_OPERATION_ALIGNED',
      result: {
        admitted: true,
        consumer: consumer?.metadata.id,
        provider: consumed?.from,
        operation: consumed?.operation,
      },
    },
  });
}

function eventDriftExpected(given: JsonObject): NormalizedExpected {
  const consumer = specifications(given).find(
    ({ metadata }) => metadata.events_consumed.length > 0,
  );
  return expectedBuildRefusal(given, {
    message: /consumes event .* that nothing emits/,
    kind: 'unmet_prerequisite',
    code: 'EVENT_PRODUCER_CONSUMER_DRIFT_BLOCKED',
    result: {
      admitted: false,
      consumer: consumer?.metadata.id,
      event: consumer?.metadata.events_consumed[0],
    },
    owner: 'harness-factory-map.integration-author',
    exitCondition:
      'harness-factory-map.event-emitter-or-external-origin-declared',
    success: {
      kind: 'allowed',
      code: 'EVENT_PRODUCER_CONSUMER_ALIGNED',
      result: {
        admitted: true,
        consumer: consumer?.metadata.id,
        event: consumer?.metadata.events_consumed[0],
      },
    },
  });
}

async function missingCostDriverExpected(
  given: JsonObject,
): Promise<NormalizedExpected> {
  const parsed = specifications(given)[0];
  if (!parsed) return inputRefused();
  const metadata = structuredClone(parsed.metadata) as unknown as JsonObject;
  const cost = asObject(metadata.cost, 'specification.cost');
  const rawSpecification = asObject(
    asArray(given.specifications, 'given.specifications')[0],
    'specification',
  );
  const rawCost = asObject(rawSpecification.cost, 'specification.cost');
  if (rawCost.driver === undefined) delete cost.driver;
  const directory = await mkdtemp(join(tmpdir(), 'factory-map-cost-fixture-'));
  const filePath = join(directory, `${parsed.metadata.id}.md`);
  try {
    await writeFile(filePath, matter.stringify('', metadata), 'utf8');
    try {
      await parseSpecification(filePath, directory);
      return expected({
        kind: 'allowed',
        code: 'COST_DRIVER_ACCEPTED',
        result: {
          admitted: true,
          component: parsed.metadata.id,
          driver: rawCost.driver,
        },
      });
    } catch (error) {
      if (
        !(error instanceof SpecificationError) ||
        !/cost.*driver|required property.*driver/.test(error.message)
      ) {
        return inputRefused();
      }
      return expected({
        kind: 'unevaluable',
        code: 'MISSING_COST_DRIVER_REFUSED',
        result: {
          admitted: false,
          component: parsed.metadata.id,
          missing_field: 'cost.driver',
        },
        owner: 'harness-factory-map.cost-author',
        exitCondition: 'harness-factory-map.cost-volume-driver-provided',
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function hotPathCountExpected(given: JsonObject): NormalizedExpected {
  const consumer = specifications(given).find(
    ({ metadata }) => metadata.hot_path !== undefined,
  );
  const uncounted = consumer?.metadata.consumes.find(
    (entry) => entry.per_action === undefined,
  );
  return expectedBuildRefusal(given, {
    message: /hot_path requires per_action/,
    kind: 'unevaluable',
    code: 'HOT_PATH_CALL_COUNT_REFUSED',
    result: {
      admitted: false,
      component: consumer?.metadata.id,
      provider: uncounted?.from,
      operation: uncounted?.operation,
      missing_field: 'consumes.per_action',
    },
    owner: 'harness-factory-map.performance-author',
    exitCondition: 'harness-factory-map.hot-path-call-count-provided',
    success: {
      kind: 'allowed',
      code: 'HOT_PATH_CALL_COUNT_ACCEPTED',
      result: {
        admitted: true,
        component: consumer?.metadata.id,
        call_count: consumer?.metadata.consumes.reduce(
          (total, entry) => total + (entry.per_action ?? 0),
          0,
        ),
      },
    },
  });
}

function hotPathAccountingExpected(given: JsonObject): NormalizedExpected {
  try {
    const map = buildMap(specifications(given), 'fixture-schema');
    const path = map.scale.hotPaths[0];
    if (!path) return inputRefused();
    const result = {
      component: path.componentId,
      unit_of_work: path.unitOfWork,
      budget_p95_ms: path.budgetP95Ms,
      calls: path.calls.map((call) => ({
        provider: call.providerId,
        operation: call.operation,
        per_action: call.perAction,
        crosses_boundary: call.crossesUnit,
        p95_ms: call.p95Ms ?? null,
        subtotal_ms: call.subtotalMs ?? null,
      })),
      round_trips: path.roundTrips,
      cross_boundary_round_trips: path.crossUnitRoundTrips,
      committed_ms: path.committedMs,
      unpriced_operations: path.unpricedOperations,
      over_budget_ms: path.overBudgetMs,
    };
    return expected({
      kind: path.overBudgetMs > 0 ? 'record_only' : 'passed',
      code:
        path.overBudgetMs > 0
          ? 'HOT_PATH_BUDGET_FINDING_RECORDED'
          : 'HOT_PATH_ACCOUNTING_PASSED',
      result,
    });
  } catch {
    return inputRefused();
  }
}

function repositoryForcingExpected(given: JsonObject): NormalizedExpected {
  const unit = specifications(given).find(
    ({ metadata }) => metadata.entity_type === 'deployable-unit',
  );
  if (!unit) return inputRefused();
  if (unit.metadata.forcing_function === undefined) {
    return expectedBuildRefusal(given, {
      message: /requires a forcing_function/,
      kind: 'unmet_prerequisite',
      code: 'REPOSITORY_FORCING_FUNCTION_BLOCKED',
      result: {
        admitted: false,
        boundary: unit.metadata.id,
        forcing_function: null,
      },
      owner: 'harness-factory-map.boundary-author',
      exitCondition: 'harness-factory-map.repository-forcing-function-declared',
    });
  }
  try {
    const map = buildMap(specifications(given), 'fixture-schema');
    const projection = map.contracts.units.find(
      (entry) => entry.id === unit.metadata.id,
    );
    if (!projection) return inputRefused();
    return expected({
      kind: 'allowed',
      code: 'REPOSITORY_FORCING_FUNCTION_ACCEPTED',
      result: {
        admitted: true,
        boundary: projection.id,
        forcing_function: projection.forcingFunction,
        modules: projection.modules.map((entry) => entry.module),
      },
    });
  } catch {
    return inputRefused();
  }
}

interface ExecutableSourceRule {
  operation: string;
  execute(given: JsonObject, when: JsonObject): Promise<NormalizedExpected>;
}

function syncRule(
  operation: string,
  run: (given: JsonObject, when: JsonObject) => NormalizedExpected,
): ExecutableSourceRule {
  return {
    operation,
    execute: (given, when) => Promise.resolve(run(given, when)),
  };
}

export const SOURCE_RULES: Record<string, ExecutableSourceRule> = {
  'harness-factory-map.rule.duplicate-authoritative-owner': syncRule(
    'harness-factory-map.validation.duplicate-owner',
    duplicateOwnerExpected,
  ),
  'harness-factory-map.rule.unresolved-relationship': syncRule(
    'harness-factory-map.validation.unresolved-relationship',
    unresolvedRelationshipExpected,
  ),
  'harness-factory-map.rule.self-relationship': syncRule(
    'harness-factory-map.validation.self-relationship',
    selfRelationshipExpected,
  ),
  'harness-factory-map.rule.provider-consumer-operation-drift': syncRule(
    'harness-factory-map.validation.operation-drift',
    operationDriftExpected,
  ),
  'harness-factory-map.rule.event-drift': syncRule(
    'harness-factory-map.validation.event-drift',
    eventDriftExpected,
  ),
  'harness-factory-map.rule.missing-cost-driver': {
    operation: 'harness-factory-map.validation.cost-driver',
    execute: missingCostDriverExpected,
  },
  'harness-factory-map.rule.hot-path-call-count': syncRule(
    'harness-factory-map.validation.hot-path-call-count',
    hotPathCountExpected,
  ),
  'harness-factory-map.rule.hot-path-accounting': syncRule(
    'harness-factory-map.analysis.hot-path-accounting',
    hotPathAccountingExpected,
  ),
  'harness-factory-map.rule.repository-forcing-function': syncRule(
    'harness-factory-map.validation.repository-forcing-function',
    repositoryForcingExpected,
  ),
};

const RULE_BY_OPERATION = Object.fromEntries(
  Object.values(SOURCE_RULES).map((rule) => [rule.operation, rule]),
) as Record<string, ExecutableSourceRule>;

export async function executeFixtureCase(
  givenRaw: unknown,
  whenRaw: unknown,
): Promise<NormalizedExpected> {
  try {
    const given = asObject(givenRaw, 'given');
    const when = asObject(whenRaw, 'when');
    const operation = when.operation;
    if (typeof operation !== 'string' || !RULE_BY_OPERATION[operation])
      return inputRefused();
    return await RULE_BY_OPERATION[operation].execute(given, when);
  } catch {
    return inputRefused();
  }
}

const SMOKE_CASES: Array<{
  rule: string;
  given: JsonObject;
  when: JsonObject & { operation: string };
  disposition: { outcome: SharedOutcome; code: string };
}> = [
  {
    rule: 'harness-factory-map.rule.duplicate-authoritative-owner',
    given: {
      specifications: [
        { id: 'a', data_owned: ['record'] },
        { id: 'b', data_owned: ['record'] },
      ],
    },
    when: { operation: 'harness-factory-map.validation.duplicate-owner' },
    disposition: {
      outcome: 'BLOCK',
      code: 'DUPLICATE_AUTHORITATIVE_OWNER_BLOCKED',
    },
  },
  {
    rule: 'harness-factory-map.rule.unresolved-relationship',
    given: { specifications: [{ id: 'a', depends_on: ['missing'] }] },
    when: {
      operation: 'harness-factory-map.validation.unresolved-relationship',
    },
    disposition: { outcome: 'REFUSE', code: 'UNRESOLVED_RELATIONSHIP_REFUSED' },
  },
  {
    rule: 'harness-factory-map.rule.self-relationship',
    given: { specifications: [{ id: 'a', depends_on: ['a'] }] },
    when: { operation: 'harness-factory-map.validation.self-relationship' },
    disposition: { outcome: 'BLOCK', code: 'SELF_RELATIONSHIP_BLOCKED' },
  },
  {
    rule: 'harness-factory-map.rule.provider-consumer-operation-drift',
    given: {
      specifications: [
        { id: 'provider', operations: [{ name: 'POST /items' }] },
        {
          id: 'consumer',
          consumes: [{ from: 'provider', operation: 'POST /withdrawn' }],
        },
      ],
    },
    when: { operation: 'harness-factory-map.validation.operation-drift' },
    disposition: {
      outcome: 'BLOCK',
      code: 'PROVIDER_CONSUMER_OPERATION_DRIFT_BLOCKED',
    },
  },
  {
    rule: 'harness-factory-map.rule.event-drift',
    given: {
      specifications: [{ id: 'consumer', events_consumed: ['record.changed'] }],
    },
    when: { operation: 'harness-factory-map.validation.event-drift' },
    disposition: {
      outcome: 'BLOCK',
      code: 'EVENT_PRODUCER_CONSUMER_DRIFT_BLOCKED',
    },
  },
  {
    rule: 'harness-factory-map.rule.missing-cost-driver',
    given: {
      specifications: [
        { id: 'metered', cost: { monthly_usd_low: 1, monthly_usd_high: 2 } },
      ],
    },
    when: { operation: 'harness-factory-map.validation.cost-driver' },
    disposition: { outcome: 'REFUSE', code: 'MISSING_COST_DRIVER_REFUSED' },
  },
  {
    rule: 'harness-factory-map.rule.hot-path-call-count',
    given: {
      specifications: [
        { id: 'provider', operations: [{ name: 'POST /check', p95_ms: 5 }] },
        {
          id: 'consumer',
          hot_path: { unit_of_work: 'one action', budget_p95_ms: 10 },
          consumes: [{ from: 'provider', operation: 'POST /check' }],
        },
      ],
    },
    when: { operation: 'harness-factory-map.validation.hot-path-call-count' },
    disposition: { outcome: 'REFUSE', code: 'HOT_PATH_CALL_COUNT_REFUSED' },
  },
  {
    rule: 'harness-factory-map.rule.hot-path-accounting',
    given: {
      specifications: [
        { id: 'provider', operations: [{ name: 'POST /check', p95_ms: 5 }] },
        {
          id: 'consumer',
          hot_path: { unit_of_work: 'one action', budget_p95_ms: 10 },
          consumes: [
            { from: 'provider', operation: 'POST /check', per_action: 1 },
          ],
        },
      ],
    },
    when: { operation: 'harness-factory-map.analysis.hot-path-accounting' },
    disposition: { outcome: 'PASS', code: 'HOT_PATH_ACCOUNTING_PASSED' },
  },
  {
    rule: 'harness-factory-map.rule.repository-forcing-function',
    given: {
      specifications: [
        {
          id: 'boundary',
          boundary: true,
          repository: 'repo',
          modules: ['core'],
        },
      ],
    },
    when: {
      operation: 'harness-factory-map.validation.repository-forcing-function',
    },
    disposition: {
      outcome: 'BLOCK',
      code: 'REPOSITORY_FORCING_FUNCTION_BLOCKED',
    },
  },
  {
    rule: 'harness-factory-map.rule.duplicate-authoritative-owner',
    given: {
      specifications: [
        { id: 'a', data_owned: ['record'] },
        { id: 'b', data_owned: [] },
      ],
    },
    when: { operation: 'harness-factory-map.validation.duplicate-owner' },
    disposition: {
      outcome: 'ALLOW',
      code: 'SINGLE_AUTHORITATIVE_OWNER_ACCEPTED',
    },
  },
  {
    rule: 'harness-factory-map.rule.unresolved-relationship',
    given: {
      specifications: [{ id: 'a', depends_on: ['b'] }, { id: 'b' }],
    },
    when: {
      operation: 'harness-factory-map.validation.unresolved-relationship',
    },
    disposition: { outcome: 'ALLOW', code: 'RELATIONSHIP_TARGET_RESOLVED' },
  },
  {
    rule: 'harness-factory-map.rule.self-relationship',
    given: {
      specifications: [{ id: 'a', depends_on: ['b'] }, { id: 'b' }],
    },
    when: { operation: 'harness-factory-map.validation.self-relationship' },
    disposition: { outcome: 'ALLOW', code: 'NON_SELF_RELATIONSHIP_ACCEPTED' },
  },
  {
    rule: 'harness-factory-map.rule.provider-consumer-operation-drift',
    given: {
      specifications: [
        { id: 'provider', operations: [{ name: 'POST /items' }] },
        {
          id: 'consumer',
          consumes: [{ from: 'provider', operation: 'POST /items' }],
        },
      ],
    },
    when: { operation: 'harness-factory-map.validation.operation-drift' },
    disposition: {
      outcome: 'ALLOW',
      code: 'PROVIDER_CONSUMER_OPERATION_ALIGNED',
    },
  },
  {
    rule: 'harness-factory-map.rule.event-drift',
    given: {
      specifications: [
        { id: 'producer', events_emitted: ['record.changed'] },
        { id: 'consumer', events_consumed: ['record.changed'] },
      ],
    },
    when: { operation: 'harness-factory-map.validation.event-drift' },
    disposition: { outcome: 'ALLOW', code: 'EVENT_PRODUCER_CONSUMER_ALIGNED' },
  },
  {
    rule: 'harness-factory-map.rule.missing-cost-driver',
    given: {
      specifications: [
        {
          id: 'metered',
          cost: {
            monthly_usd_low: 1,
            monthly_usd_high: 2,
            driver: 'one synthetic action',
          },
        },
      ],
    },
    when: { operation: 'harness-factory-map.validation.cost-driver' },
    disposition: { outcome: 'ALLOW', code: 'COST_DRIVER_ACCEPTED' },
  },
  {
    rule: 'harness-factory-map.rule.hot-path-call-count',
    given: {
      specifications: [
        { id: 'provider', operations: [{ name: 'POST /check', p95_ms: 5 }] },
        {
          id: 'consumer',
          hot_path: { unit_of_work: 'one action', budget_p95_ms: 10 },
          consumes: [
            { from: 'provider', operation: 'POST /check', per_action: 1 },
          ],
        },
      ],
    },
    when: { operation: 'harness-factory-map.validation.hot-path-call-count' },
    disposition: { outcome: 'ALLOW', code: 'HOT_PATH_CALL_COUNT_ACCEPTED' },
  },
  {
    rule: 'harness-factory-map.rule.repository-forcing-function',
    given: {
      specifications: [
        {
          id: 'boundary',
          boundary: true,
          repository: 'repo',
          forcing_function: 'host',
          modules: ['core'],
        },
      ],
    },
    when: {
      operation: 'harness-factory-map.validation.repository-forcing-function',
    },
    disposition: {
      outcome: 'ALLOW',
      code: 'REPOSITORY_FORCING_FUNCTION_ACCEPTED',
    },
  },
];

export const SOURCE_TESTS = {
  'harness-factory-map.test.fixture-adapter-registry': async () => {
    deepStrictEqual(
      [
        expected({
          kind: 'unevaluable',
          code: 'X_INPUT_REFUSED',
          result: { x: 1 },
        }).outcome,
        expected({
          kind: 'unmet_prerequisite',
          code: 'X_PREREQUISITE_MISSING',
          result: { x: 1 },
        }).outcome,
        expected({
          kind: 'authority_exceeded',
          code: 'X_AUTHORITY_EXCEEDED',
          result: { x: 1 },
        }).outcome,
      ],
      ['REFUSE', 'BLOCK', 'ESCALATE'],
    );
    const operations = Object.values(SOURCE_RULES).map(
      (rule) => rule.operation,
    );
    deepStrictEqual(new Set(operations).size, operations.length);
    for (const smoke of SMOKE_CASES) {
      const actual = await SOURCE_RULES[smoke.rule].execute(
        smoke.given,
        smoke.when,
      );
      deepStrictEqual(
        { outcome: actual.outcome, code: actual.code },
        smoke.disposition,
      );
    }
  },
} as const;

export const ADAPTER_REGISTRY = { [ADAPTER_ID]: executeFixtureCase } as const;
export const NORMALIZATION_RULES = {
  [OUTCOME_RULE]: (value: NormalizedExpected) => ({
    outcome: value.outcome,
    code: value.code,
  }),
  [RESULT_RULE]: (value: NormalizedExpected) => value.result,
  [RECOVERY_RULE]: (value: NormalizedExpected) => ({
    owner: value.owner,
    exit_condition: value.exit_condition,
    invalidated_evidence: value.invalidated_evidence,
  }),
} as const;

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: resolve(process.cwd(), '..'),
    encoding: 'utf8',
  }).trim();
}

function assertPinnedExecutableRevision(sourceRevision: string): void {
  git(['rev-parse', '--verify', `${sourceRevision}^{commit}`]);
  git(['merge-base', '--is-ancestor', sourceRevision, 'HEAD']);
  const pinnedBlob = git([
    'rev-parse',
    `${sourceRevision}:harness-factory-map/tests/fixture-adapter.ts`,
  ]);
  const headBlob = git([
    'rev-parse',
    'HEAD:harness-factory-map/tests/fixture-adapter.ts',
  ]);
  if (pinnedBlob !== headBlob)
    throw new Error('fixture adapter differs from pinned revision');
  const changed = git(['diff', '--name-only', `${sourceRevision}..HEAD`])
    .split('\n')
    .filter(Boolean)
    .filter(
      (path) =>
        !path.startsWith('fixtures/experiment/') &&
        !path.startsWith('gaps/experiment/') &&
        path !== 'CURRENT-DIRECTION.md' &&
        path !== 'docs/EXPERIMENT-FIXTURE-EXPORT.md',
    );
  if (changed.length > 0) {
    throw new Error(
      `executable provenance changed after pinned revision: ${changed.join(', ')}`,
    );
  }
  const tracked = git([
    'ls-tree',
    '-r',
    '--name-only',
    'HEAD',
    'fixtures/experiment',
  ]);
  if (tracked && sourceRevision === git(['rev-parse', 'HEAD'])) {
    throw new Error(
      'tracked fixtures must follow executable provenance revision',
    );
  }
}

function requireAdapter(fixture: LegacyFixture) {
  const adapter = fixture.legacy_context.adapter;
  if (!adapter) throw new Error('legacy fixture has no adapter');
  return adapter;
}

function requireList(value: string[] | undefined, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`fixture has no ${field}`);
  return value;
}

export async function verifyFixture(fixture: LegacyFixture): Promise<void> {
  if (
    fixture.fixture_version !== '3.0' ||
    fixture.source_repository !== 'harness-factory-map'
  ) {
    throw new Error('fixture is outside this adapter boundary');
  }
  const adapter = requireAdapter(fixture);
  if (adapter.id !== ADAPTER_ID || adapter.verifier_rule !== VERIFIER_RULE) {
    throw new Error('fixture names an unresolved adapter or verifier');
  }
  if (
    adapter.outcome_rule !== OUTCOME_RULE ||
    adapter.result_rule !== RESULT_RULE ||
    adapter.recovery_rule !== RECOVERY_RULE ||
    adapter.invalidated_evidence_rule !== 'none'
  ) {
    throw new Error('fixture names an unresolved normalization rule');
  }
  if (typeof adapter.source_revision !== 'string')
    throw new Error('fixture has no revision');
  assertPinnedExecutableRevision(adapter.source_revision);
  for (const testId of requireList(adapter.source_tests, 'source_tests')) {
    const sourceTest = SOURCE_TESTS[testId as keyof typeof SOURCE_TESTS];
    if (!sourceTest) throw new Error(`unresolved source test: ${testId}`);
    await sourceTest();
  }
  for (const ruleId of requireList(adapter.source_rules, 'source_rules')) {
    const rule = SOURCE_RULES[ruleId];
    if (!rule || rule.operation !== fixture.when.operation) {
      throw new Error(`unresolved source rule: ${ruleId}`);
    }
  }
  const execute = ADAPTER_REGISTRY[adapter.id];
  const actual = await execute(fixture.given, fixture.when);
  const normalized = {
    ...NORMALIZATION_RULES[OUTCOME_RULE](actual),
    result: NORMALIZATION_RULES[RESULT_RULE](actual),
    ...NORMALIZATION_RULES[RECOVERY_RULE](actual),
  };
  deepStrictEqual(normalized, fixture.expected);
}

export async function loadFixture(path: string): Promise<LegacyFixture> {
  return JSON.parse(await readFile(path, 'utf8')) as LegacyFixture;
}
