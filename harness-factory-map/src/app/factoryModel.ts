import mapJson from '../generated/map.json';
import type { GeneratedEntity, GeneratedMap, GeneratedStage } from '../types/specification';

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
};

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

export function componentsOf(stage: GeneratedStage): GeneratedEntity[] {
  return stage.componentIds.map((id) => entityById.get(id)).filter((item): item is GeneratedEntity => !!item);
}

export const PLATFORM_STAGE = map.stages.find((stage) => stage.stageOrder === 0);
export const FLOW_STAGES = map.stages.filter((stage) => stage.stageOrder > 0);

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

export const TASKS_PER_MONTH = 500;

export interface CostBand {
  label: string;
  low: number;
  high: number;
  note: string;
}

export const COST_BANDS: CostBand[] = [
  {
    label: 'Azure infrastructure',
    low: map.cost.monthlyUsdLow,
    high: map.cost.monthlyUsdHigh,
    note: 'All 26 components, one non-production environment',
  },
  {
    label: 'Model inference',
    low: Math.round(map.cost.modelUsdPerTaskLow * TASKS_PER_MONTH),
    high: Math.round(map.cost.modelUsdPerTaskHigh * TASKS_PER_MONTH),
    note: `${TASKS_PER_MONTH} tasks/month · $${map.cost.modelUsdPerTaskLow}–${map.cost.modelUsdPerTaskHigh} per task`,
  },
];

export function usd(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export const WAVE_THEMES: Record<number, string> = {
  1: 'Walking skeleton — one request runs end to end, reviewed and audited',
  2: 'Governed and grounded — policy, cited knowledge, evaluation, budget ceilings',
  3: 'Reuse and governance — registered teams, the reuse check, the LT approval flow',
  4: 'Learning loop — metrics, improvement proposals, team retirement',
};

export const RISK_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
