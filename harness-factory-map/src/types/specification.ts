import type {
  ActorType,
  EntityType,
  Plane,
  Risk,
  Scope,
  Status,
} from '../generated/schema-values';

export type {
  ActorType,
  EntityType,
  Plane,
  Risk,
  Scope,
  Status,
} from '../generated/schema-values';

export interface SpecificationMetadata {
  id: string;
  name: string;
  entity_type: EntityType;
  plane: Plane;
  scope: Scope;
  status: Status;
  risk: Risk;
  actor_type: ActorType;
  description: string;
  owner: string;
  tags: string[];
  depends_on: string[];
  connects_to: string[];
  workflow_order?: number;
  workflow_id?: string;
  responsibilities: string[];
  owns: string[];
  does_not_own: string[];
  inputs: string[];
  outputs: string[];
  permissions: string[];
  restrictions: string[];
  failure_behaviour: string[];
}

export interface GeneratedEntity extends SpecificationMetadata {
  sourcePath: string;
  body: string;
}

export type EdgeRelation = 'depends_on' | 'connects_to' | 'workflow';

export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  relations: EdgeRelation[];
}

export interface WorkflowTrace {
  id: string;
  name: string;
  description: string;
  sourcePath: string;
  path: string[];
}

export interface GeneratedMap {
  generatedHeader: string;
  schemaId: string;
  entities: GeneratedEntity[];
  edges: GeneratedEdge[];
  workflows: WorkflowTrace[];
  validation: {
    entityCount: number;
    edgeCount: number;
    workflowCount: number;
  };
}
