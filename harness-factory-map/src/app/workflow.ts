export interface TargetWorkflowStage {
  id: string;
  number: number;
  label: string;
  description: string;
  stationIds: string[];
  specId: string;
  color: string;
  branch?: string;
}

export const TARGET_WORKFLOW: TargetWorkflowStage[] = [
  {
    id: 'request',
    number: 1,
    label: 'User logs request',
    description: 'Anyone can raise a bounded need.',
    stationIds: ['request-desk'],
    specId: 'user-request',
    color: '#f7c948',
  },
  {
    id: 'system-check',
    number: 2,
    label: 'System check',
    description: 'Check for a suitable existing solution.',
    stationIds: ['intake-station'],
    specId: 'intake-service',
    color: '#f59e0b',
    branch: 'YES → existing solution · NO → continue',
  },
  {
    id: 'problem-intake',
    number: 3,
    label: 'Problem intake & grill-me',
    description: 'Clarify why, impact, risk, owner, and success.',
    stationIds: ['intake-station', 'task-contract-desk'],
    specId: 'task-contract',
    color: '#c084fc',
  },
  {
    id: 'evaluate',
    number: 4,
    label: 'Evaluate & decide',
    description: 'Choose the simplest responsible execution path.',
    stationIds: ['risk-scanner'],
    specId: 'risk-classifier',
    color: '#8b5cf6',
    branch: 'ticket · harness team · dedicated agent',
  },
  {
    id: 'governance',
    number: 5,
    label: 'Governance approval',
    description: 'Record the IT decision and its accountability.',
    stationIds: ['policy-station'],
    specId: 'policy-engine',
    color: '#9333ea',
    branch: 'APPROVED → execute · NOT APPROVED → revise',
  },
  {
    id: 'execution',
    number: 6,
    label: 'Harness Agent Team',
    description: 'Understand, research, plan, execute, validate, review, deliver.',
    stationIds: ['orchestrator-control-tower', 'agent-workshop', 'sandbox', 'review-station', 'delivery-dock'],
    specId: 'agent-runtime',
    color: '#31b86b',
  },
  {
    id: 'learning',
    number: 7,
    label: 'Loop engineering',
    description: 'Capture insights, improve knowledge, and update controls.',
    stationIds: ['learning-loop'],
    specId: 'audit-store',
    color: '#ec4899',
    branch: 'continuous improvement · human accountability',
  },
];
