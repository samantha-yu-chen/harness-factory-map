import mapJson from '../generated/map.json';
import type {
  ContractBacking,
  GeneratedEntity,
  GeneratedMap,
  GeneratedStage,
  UnitRollup,
} from '../types/specification';

export const map = mapJson as GeneratedMap;

export interface StagePresentation {
  color: string;
  glyph: string;
  headline: string;
  branch?: string;
}

const STAGE_PRESENTATION: Record<string, StagePresentation> = {
  'stage-0-enterprise-brain': {
    color: '#0f766e',
    glyph: '◈',
    headline: 'Always on, behind every stage',
    branch: 'Read by all · rewritten by none',
  },
  'stage-1-request': {
    color: '#b45309',
    glyph: '✉',
    headline: 'Portal · Chat · Email',
    branch: 'Received ≠ accepted',
  },
  'stage-2-system-check': {
    color: '#c2410c',
    glyph: '⌕',
    headline: 'Do we already have this?',
    branch: 'confident → reuse · weak → ask · none → continue',
  },
  'stage-3-problem-intake': {
    color: '#7c3aed',
    glyph: '❓',
    headline: 'Nine questions, all blocking',
    branch: 'unanswerable → needs-human',
  },
  'stage-4-evaluate': {
    color: '#6d28d9',
    glyph: '⚖',
    headline: 'Risk · complexity · value · repeatability',
    branch: 'ticket · harness team · propose dedicated',
  },
  'stage-5-governance': {
    color: '#be123c',
    glyph: '🛡',
    headline: 'Leadership decides and owns',
    branch: 'approved → registered · declined → alternative route',
  },
  'stage-6-execution': {
    color: '#15803d',
    glyph: '⚙',
    headline: 'Understand → … → deliver',
    branch: 'human review sized by risk',
  },
  'stage-7-learning': {
    color: '#0e7490',
    glyph: '↻',
    headline: 'Propose, never self-apply',
    branch: 'continue · scale · pause · retire',
  },
  'stage-8-trigger': {
    color: '#1d4ed8',
    glyph: '▶',
    headline: 'Catalogue · Schedule',
    branch: 'one door for people and timetables',
  },
  'stage-9-authorise': {
    color: '#1e40af',
    glyph: '🔑',
    headline: 'Every run, not just every agent',
    branch: 'identity · scope · entitlement · budget',
  },
  'stage-10-execute': {
    color: '#15803d',
    glyph: '⚙',
    headline: 'The same engine the factory verified',
    branch: 'no new components, deliberately',
  },
  'stage-11-deliver': {
    color: '#a16207',
    glyph: '✓',
    headline: 'Reviewed in proportion to risk',
    branch: 'low → sampled · high → named reviewer',
  },
  'stage-12-record': {
    color: '#9f1239',
    glyph: '◉',
    headline: 'Health, cost, and the kill switch',
    branch: 'suspends itself · resumes only by hand',
  },
};

export interface LoopPresentation {
  id: 'factory' | 'runtime';
  title: string;
  cadence: string;
  summary: string;
}

export const LOOPS: LoopPresentation[] = [
  {
    id: 'factory',
    title: 'Factory loop',
    cadence: 'Runs once per solution',
    summary: 'Turns a request into an agent team that is proven, approved, and owned.',
  },
  {
    id: 'runtime',
    title: 'Runtime loop',
    cadence: 'Runs on every invocation',
    summary: 'The published agent does the real work, for anyone entitled to ask.',
  },
];

export const FALLBACK_PRESENTATION: StagePresentation = {
  color: '#64748b',
  glyph: '•',
  headline: '',
};

export function presentationFor(stageId: string): StagePresentation {
  return STAGE_PRESENTATION[stageId] ?? FALLBACK_PRESENTATION;
}

const entityById = new Map(map.entities.map((entity) => [entity.id, entity]));

export function entity(id: string): GeneratedEntity | undefined {
  return entityById.get(id);
}

export function entityName(id: string): string {
  return entityById.get(id)?.name ?? id;
}

function resolve(ids: string[]): GeneratedEntity[] {
  return ids.map((id) => entityById.get(id)).filter((item): item is GeneratedEntity => !!item);
}

export function componentsOf(stage: GeneratedStage): GeneratedEntity[] {
  return resolve(stage.componentIds);
}

export function reusedBy(stage: GeneratedStage): GeneratedEntity[] {
  return resolve(stage.reusedComponentIds);
}

export const PLATFORM_STAGE = map.stages.find((stage) => stage.loop === 'platform');
export const LEARNING_STAGE = map.stages.find((stage) => stage.loop === 'learning');
export const FACTORY_STAGES = map.stages.filter((stage) => stage.loop === 'factory');
export const RUNTIME_STAGES = map.stages.filter((stage) => stage.loop === 'runtime');
export const FLOW_STAGES = map.stages.filter((stage) => stage.loop !== 'platform');

export function stagesOfLoop(loop: LoopPresentation['id']): GeneratedStage[] {
  return loop === 'factory' ? FACTORY_STAGES : RUNTIME_STAGES;
}

export const SYSTEM_DOCUMENTS = map.entities.filter(
  (item) => item.entity_type !== 'workflow-step' && item.workflow_id === undefined,
);

export const STAGED_COMPONENTS = map.entities.filter((item) => item.workflow_id !== undefined);

export interface OpenDecision {
  componentId: string;
  componentName: string;
  stageId: string;
  question: string;
}

export const OPEN_DECISIONS: OpenDecision[] = map.entities.flatMap((item) =>
  item.open_questions.map((question) => ({
    componentId: item.id,
    componentName: item.name,
    stageId: item.workflow_id ?? 'system',
    question,
  })),
);

export const SOLUTIONS_PER_MONTH = 8;
export const RUNS_PER_MONTH = 600;

// WHY: both bands are derived from the map's per-pass model cost so they cannot drift from the
// specs. The two multipliers are the stated assumptions in specs/system/cost-model.md — a factory
// build iterates, and a published run is frozen, cached, and tier-optimised.
const FACTORY_ITERATION_FACTOR = 3;
const RUNTIME_EFFICIENCY_FACTOR = 0.25;

function round(value: number): number {
  return Math.round(value);
}

export interface CostBand {
  label: string;
  short: string;
  tone: 'azure' | 'factory' | 'runtime';
  low: number;
  high: number;
  note: string;
}

export const FACTORY_RUN_USD = {
  low: map.cost.modelUsdPerTaskLow * FACTORY_ITERATION_FACTOR,
  high: map.cost.modelUsdPerTaskHigh * FACTORY_ITERATION_FACTOR,
};

export const RUNTIME_RUN_USD = {
  low: map.cost.modelUsdPerTaskLow * RUNTIME_EFFICIENCY_FACTOR,
  high: map.cost.modelUsdPerTaskHigh * RUNTIME_EFFICIENCY_FACTOR,
};

export const COST_BANDS: CostBand[] = [
  {
    label: 'Azure infrastructure',
    short: 'Infrastructure',
    tone: 'azure',
    low: map.cost.monthlyUsdLow,
    high: map.cost.monthlyUsdHigh,
    note: `All ${STAGED_COMPONENTS.length} components, one non-production environment`,
  },
  {
    label: 'Factory model spend',
    short: 'Factory',
    tone: 'factory',
    low: round(FACTORY_RUN_USD.low * SOLUTIONS_PER_MONTH),
    high: round(FACTORY_RUN_USD.high * SOLUTIONS_PER_MONTH),
    note: `${SOLUTIONS_PER_MONTH} solutions built/month · $${FACTORY_RUN_USD.low.toFixed(2)}–${FACTORY_RUN_USD.high.toFixed(2)} each`,
  },
  {
    label: 'Runtime model spend',
    short: 'Runtime',
    tone: 'runtime',
    low: round(RUNTIME_RUN_USD.low * RUNS_PER_MONTH),
    high: round(RUNTIME_RUN_USD.high * RUNS_PER_MONTH),
    note: `${RUNS_PER_MONTH} published-agent runs/month · $${RUNTIME_RUN_USD.low.toFixed(2)}–${RUNTIME_RUN_USD.high.toFixed(2)} each`,
  },
];

export interface AdoptionPoint {
  runs: number;
  low: number;
  high: number;
}

const INFRA_AND_FACTORY = {
  low: map.cost.monthlyUsdLow + FACTORY_RUN_USD.low * SOLUTIONS_PER_MONTH,
  high: map.cost.monthlyUsdHigh + FACTORY_RUN_USD.high * SOLUTIONS_PER_MONTH,
};

export const ADOPTION_CURVE: AdoptionPoint[] = [600, 2000, 5000].map((runs) => ({
  runs,
  low: round(INFRA_AND_FACTORY.low + RUNTIME_RUN_USD.low * runs),
  high: round(INFRA_AND_FACTORY.high + RUNTIME_RUN_USD.high * runs),
}));

export function usd(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export const UNITS = map.contracts.units;

export const WAVES = map.cost.waves.map((wave) => wave.wave);

const unitById = new Map(UNITS.map((unit) => [unit.id, unit]));

export function unit(id: string): UnitRollup | undefined {
  return unitById.get(id);
}

export function unitName(id: string): string {
  return unitById.get(id)?.name ?? id;
}

export interface ModuleSlice {
  module: string;
  items: GeneratedEntity[];
}

// WHY: the question the harness team actually asks is "which repository am I opening this week,
// and which directory inside it". Wave alone answers neither, so the plan is sliced by both.
export function moduleSlices(unitId: string, wave: number): ModuleSlice[] {
  const target = unitById.get(unitId);
  if (!target) return [];
  return target.modules
    .map(({ module, componentIds }) => ({
      module,
      items: resolve(componentIds).filter((item) => item.build_wave === wave),
    }))
    .filter((slice) => slice.items.length > 0);
}

export function unitWaveCount(unitId: string, wave: number): number {
  return moduleSlices(unitId, wave).reduce((total, slice) => total + slice.items.length, 0);
}

export const FORCING_FUNCTIONS: Record<string, string> = {
  'FF1-independent-scaling': 'FF1 · independent scaling',
  'FF2-team-scale': 'FF2 · team scale',
  'FF3-fault-isolation': 'FF3 · fault isolation',
  'FF4-regulatory-boundary': 'FF4 · regulatory boundary',
  'FF5-polyglot-runtime': 'FF5 · polyglot runtime',
  host: 'Host — no forcing function, so these stay modules',
};

export const BACKING_LABELS: Record<ContractBacking, string> = {
  declared: 'declared',
  event: 'event',
  inferred: 'inferred only',
  none: 'unbacked',
};

export const WAVE_THEMES: Record<number, string> = {
  1: 'Walking skeleton — one request runs end to end, reviewed and audited',
  2: 'Governed and grounded — policy, cited knowledge, evaluation, budget ceilings',
  3: 'Publish and operate — registered teams, live deployments, the self-serve catalogue',
  4: 'Unattended and learning — schedules, metrics, improvement proposals, retirement',
};

export const RISK_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
