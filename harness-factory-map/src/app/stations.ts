export interface StationDefinition {
  id: string;
  label: string;
  specId: string;
  position: [number, number, number];
  color: string;
  zone: string;
}

export const STATIONS: StationDefinition[] = [
  { id: 'request-desk', label: 'Request Desk', specId: 'user-request', position: [-6, 0, -3], color: '#f7c948', zone: 'request' },
  { id: 'intake-station', label: 'Intake Station', specId: 'intake-service', position: [-3.5, 0, -3], color: '#f59e0b', zone: 'request' },
  { id: 'task-contract-desk', label: 'Task Contract Desk', specId: 'task-contract', position: [-1, 0, -3], color: '#a855f7', zone: 'control' },
  { id: 'risk-scanner', label: 'Risk Scanner', specId: 'risk-classifier', position: [1.5, 0, -3], color: '#8b5cf6', zone: 'control' },
  { id: 'orchestrator-control-tower', label: 'Orchestrator Control Tower', specId: 'orchestrator', position: [-4, 0, 0], color: '#7c3aed', zone: 'control' },
  { id: 'policy-station', label: 'Policy Station', specId: 'policy-engine', position: [-1, 0, 0], color: '#9333ea', zone: 'control' },
  { id: 'agent-workshop', label: 'Agent Workshop', specId: 'agent-runtime', position: [2, 0, 0], color: '#22c55e', zone: 'execution' },
  { id: 'sandbox', label: 'Sandbox', specId: 'sandbox', position: [5, 0, 0], color: '#16a34a', zone: 'execution' },
  { id: 'review-station', label: 'Review Station', specId: 'review-service', position: [2, 0, 3], color: '#3b82f6', zone: 'delivery' },
  { id: 'delivery-dock', label: 'Delivery Dock', specId: 'pull-request', position: [5, 0, 3], color: '#2563eb', zone: 'delivery' },
];

export const START_POSITION: [number, number, number] = [-8, 0, -5];

export function stationForId(id: string): StationDefinition | undefined {
  return STATIONS.find((station) => station.id === id);
}
