export interface StationDefinition {
  id: string;
  label: string;
  specId: string;
  position: [number, number, number];
  screenPosition: { left: string; top: string };
  color: string;
  zone: string;
}

export const STATIONS: StationDefinition[] = [
  { id: 'request-desk', label: 'Request Desk', specId: 'user-request', position: [-6, 0, -3], screenPosition: { left: '12%', top: '24%' }, color: '#f7c948', zone: 'request' },
  { id: 'intake-station', label: 'Intake Station', specId: 'intake-service', position: [-3.5, 0, -3], screenPosition: { left: '29%', top: '24%' }, color: '#f59e0b', zone: 'request' },
  { id: 'task-contract-desk', label: 'Task Contract Desk', specId: 'task-contract', position: [-1, 0, -3], screenPosition: { left: '46%', top: '24%' }, color: '#a855f7', zone: 'control' },
  { id: 'risk-scanner', label: 'Risk Scanner', specId: 'risk-classifier', position: [1.5, 0, -3], screenPosition: { left: '63%', top: '24%' }, color: '#8b5cf6', zone: 'control' },
  { id: 'orchestrator-control-tower', label: 'Orchestrator Control Tower', specId: 'orchestrator', position: [-4, 0, 0], screenPosition: { left: '29%', top: '52%' }, color: '#7c3aed', zone: 'control' },
  { id: 'policy-station', label: 'Policy Station', specId: 'policy-engine', position: [-1, 0, 0], screenPosition: { left: '46%', top: '52%' }, color: '#9333ea', zone: 'control' },
  { id: 'agent-workshop', label: 'Agent Workshop', specId: 'agent-runtime', position: [2, 0, 0], screenPosition: { left: '63%', top: '52%' }, color: '#22c55e', zone: 'execution' },
  { id: 'sandbox', label: 'Sandbox', specId: 'sandbox', position: [5, 0, 0], screenPosition: { left: '80%', top: '52%' }, color: '#16a34a', zone: 'execution' },
  { id: 'review-station', label: 'Review Station', specId: 'review-service', position: [2, 0, 3], screenPosition: { left: '63%', top: '79%' }, color: '#3b82f6', zone: 'delivery' },
  { id: 'delivery-dock', label: 'Delivery Dock', specId: 'pull-request', position: [5, 0, 3], screenPosition: { left: '80%', top: '79%' }, color: '#2563eb', zone: 'delivery' },
  { id: 'learning-loop', label: 'Audit & Learning Loop', specId: 'audit-store', position: [-4, 0, 3], screenPosition: { left: '25%', top: '79%' }, color: '#ec4899', zone: 'learning' },
];

export const CLOUD_SCOPE_STATION: StationDefinition = {
  id: 'azure-cloud-scope',
  label: 'Azure Cloud Scope MVP',
  specId: 'azure-cloud-scope',
  position: [0, 0, 0],
  screenPosition: { left: '50%', top: '50%' },
  color: '#3d7fb6',
  zone: 'cloud architecture',
};

export const START_POSITION: [number, number, number] = [-8, 0, -5];

export function stationForId(id: string): StationDefinition | undefined {
  return STATIONS.find((station) => station.id === id);
}
