import type {
  ActorType,
  AutomationLevel,
  DataClassification,
  EntityType,
  Plane,
  Risk,
  Scope,
  Status,
} from '../generated/schema-values';

export type {
  ActorType,
  AutomationLevel,
  DataClassification,
  EntityType,
  Plane,
  Risk,
  Scope,
  Status,
} from '../generated/schema-values';

export type ContractKind = 'sync-api' | 'async-event' | 'batch-job' | 'human-decision' | 'query';

export interface ApiOperation {
  operation: string;
  kind: ContractKind;
  caller: string;
  worker: string;
  request: string;
  response: string;
  idempotency?: string;
  timeout?: string;
  auth?: string;
  failure: string;
}

export interface ServiceLevelObjective {
  availability?: string;
  latency?: string;
  throughput?: string;
  recovery?: string;
}

export interface AzureCostLine {
  service: string;
  sku: string;
  monthly_usd_low: number;
  monthly_usd_high: number;
  note?: string;
  shared?: boolean;
}

export interface CostEnvelope {
  monthly_usd_low: number;
  monthly_usd_high: number;
  model_usd_per_task_low?: number;
  model_usd_per_task_high?: number;
  driver: string;
  note?: string;
  azure?: AzureCostLine[];
}

export interface SpecificationMetadata {
  id: string;
  name: string;
  entity_type: EntityType;
  plane: Plane;
  scope: Scope;
  status: Status;
  risk: Risk;
  actor_type: ActorType;
  automation_level?: AutomationLevel;
  data_classification?: DataClassification;
  description: string;
  exec_summary: string;
  business_value?: string;
  owner: string;
  human_accountable: string;
  build_wave?: number;
  stage_order?: number;
  loop?: StageLoop;
  tags: string[];
  depends_on: string[];
  connects_to: string[];
  workflow_order?: number;
  workflow_id?: string;
  serves_stages: string[];
  reference_elements: string[];
  reference_map: string[];
  responsibilities: string[];
  owns: string[];
  does_not_own: string[];
  data_owned: string[];
  inputs: string[];
  outputs: string[];
  permissions: string[];
  restrictions: string[];
  failure_behaviour: string[];
  open_questions: string[];
  api_contract: ApiOperation[];
  events_emitted: string[];
  events_consumed: string[];
  slo?: ServiceLevelObjective;
  cost?: CostEnvelope;
}

export interface GeneratedEntity extends SpecificationMetadata {
  sourcePath: string;
  rawMarkdown: string;
  body: string;
}

export type EdgeRelation = 'depends_on' | 'connects_to' | 'workflow';

export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  relations: EdgeRelation[];
}

export interface ReferenceElementCoverage {
  element: string;
  coveredBy: string[];
}

export type StageLoop = 'platform' | 'factory' | 'runtime' | 'learning';

export interface GeneratedStage {
  id: string;
  name: string;
  description: string;
  execSummary: string;
  stageOrder: number;
  loop: StageLoop;
  sourcePath: string;
  componentIds: string[];
  reusedComponentIds: string[];
  referenceElements: ReferenceElementCoverage[];
}

export interface CoverageGap {
  stageId: string;
  stageName: string;
  element: string;
}

export interface CoverageReport {
  elementCount: number;
  coveredCount: number;
  gaps: CoverageGap[];
}

export interface WaveRollup {
  wave: number;
  componentIds: string[];
  monthlyUsdLow: number;
  monthlyUsdHigh: number;
}

export interface AzureServiceRollup {
  service: string;
  sku: string;
  monthlyUsdLow: number;
  monthlyUsdHigh: number;
  usedBy: string[];
  shared: boolean;
}

export interface CostRollup {
  monthlyUsdLow: number;
  monthlyUsdHigh: number;
  modelUsdPerTaskLow: number;
  modelUsdPerTaskHigh: number;
  waves: WaveRollup[];
  azureServices: AzureServiceRollup[];
}

export interface GeneratedMap {
  generatedHeader: string;
  schemaId: string;
  entities: GeneratedEntity[];
  edges: GeneratedEdge[];
  stages: GeneratedStage[];
  coverage: CoverageReport;
  cost: CostRollup;
  validation: {
    entityCount: number;
    edgeCount: number;
    stageCount: number;
    coverageGapCount: number;
  };
}
