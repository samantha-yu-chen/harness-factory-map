import { useEffect, useState, type CSSProperties } from 'react';
import { AZURE_SCOPE_BY_STAGE, ENTERPRISE_MEMORY_LAYERS, type AzureComponent } from '../app/cloudScope';
import { TARGET_WORKFLOW, type TargetWorkflowStage } from '../app/workflow';
import { STATIONS, stationForId, type StationDefinition } from '../app/stations';
import type { GeneratedEntity } from '../types/specification';

interface TargetWorkflowProps {
  activeStep: number;
  entities: GeneratedEntity[];
  onStageSelect: (station: StationDefinition) => void;
  onCloudScopeSelect: () => void;
}

function stageState(stage: TargetWorkflowStage, activeStep: number): 'current' | 'complete' | '' {
  const activeStationId = activeStep >= 0 ? STATIONS[activeStep]?.id : undefined;
  if (stage.stationIds.includes(activeStationId ?? '')) return 'current';
  const lastStationIndex = Math.max(...stage.stationIds.map((id) => STATIONS.findIndex((station) => station.id === id)));
  return activeStep > lastStationIndex ? 'complete' : '';
}

function AzureComponentCard({ component }: { component: AzureComponent }) {
  return (
    <article className="azure-component-card">
      <div className="azure-component-heading">
        <span className="azure-component-category">{component.category}</span>
        <strong>{component.name}</strong>
      </div>
      <p>{component.role}</p>
      <small><b>Boundary</b> {component.boundary}</small>
    </article>
  );
}

export function TargetWorkflow({ activeStep, entities, onStageSelect, onCloudScopeSelect }: TargetWorkflowProps) {
  const activeStationId = activeStep >= 0 ? STATIONS[activeStep]?.id : undefined;
  const activeStageId = TARGET_WORKFLOW.find((stage) => stage.stationIds.includes(activeStationId ?? ''))?.id;
  const [selectedStageId, setSelectedStageId] = useState(TARGET_WORKFLOW[0].id);
  const selectedStage = TARGET_WORKFLOW.find((stage) => stage.id === selectedStageId) ?? TARGET_WORKFLOW[0];
  const selectedScope = AZURE_SCOPE_BY_STAGE[selectedStage.id];

  useEffect(() => {
    if (activeStageId) setSelectedStageId(activeStageId);
  }, [activeStageId]);

  function selectStage(stage: TargetWorkflowStage, openStation = false) {
    setSelectedStageId(stage.id);
    if (openStation) {
      const station = stationForId(stage.stationIds[0]);
      if (station) onStageSelect(station);
    }
  }

  return (
    <section className="target-workflow-panel" aria-label="Target system workflow">
      <div className="target-workflow-header">
        <div>
          <span className="kicker">Target system design from the reference workflow</span>
          <h2>Enterprise brain · single source of truth</h2>
        </div>
        <span className="target-workflow-note">Boundaries, decisions, execution, and learning stay visible.</span>
      </div>
      <div className="target-workflow-steps">
        {TARGET_WORKFLOW.map((stage, index) => {
          const state = stageState(stage, activeStep);
          const entity = entities.find((item) => item.id === stage.specId);
          return (
            <div className="target-stage-wrap" key={stage.id}>
              <button
                type="button"
                className={`target-stage ${state}`}
                style={{ '--stage-color': stage.color } as CSSProperties}
                onClick={() => selectStage(stage, true)}
              >
                <span className="target-stage-number">{stage.number}</span>
                <strong>{stage.label}</strong>
                <span>{stage.description}</span>
                <small>{entity?.scope ?? 'mvp'} · {entity?.plane ?? 'control'}</small>
                <span className="target-stage-cloud-count">Azure · {AZURE_SCOPE_BY_STAGE[stage.id]?.components.length ?? 0} components</span>
                {stage.branch && <em>{stage.branch}</em>}
              </button>
              {index < TARGET_WORKFLOW.length - 1 && <span className="stage-arrow" aria-hidden="true">→</span>}
            </div>
          );
        })}
      </div>
      <section className="azure-scope-layer" aria-label="Azure cloud scope">
        <div className="azure-scope-header">
          <div>
            <span className="kicker">Cloud-scope MVP · visual architecture</span>
            <h3>{selectedStage.number}. {selectedStage.label}</h3>
          </div>
          <div className="azure-scope-actions">
            <span className="azure-scope-note">No live Azure calls · Markdown remains the source of truth</span>
            <button type="button" className="azure-master-spec-button" onClick={onCloudScopeSelect}>Open master Azure Markdown</button>
          </div>
        </div>
        <div className="azure-stage-tabs" role="tablist" aria-label="Azure workflow sections">
          {TARGET_WORKFLOW.map((stage) => (
            <button
              type="button"
              role="tab"
              aria-selected={selectedStage.id === stage.id}
              className={selectedStage.id === stage.id ? 'azure-stage-tab active' : 'azure-stage-tab'}
              key={stage.id}
              onClick={() => selectStage(stage)}
            >
              <span>{String(stage.number).padStart(2, '0')}</span>
              {stage.label}
            </button>
          ))}
        </div>
        <p className="azure-scope-boundary"><b>Section boundary</b> {selectedScope.boundary}</p>
        <div className="azure-component-grid">
          {selectedScope.components.map((component) => <AzureComponentCard component={component} key={`${selectedStage.id}-${component.name}`} />)}
        </div>
        <section className="enterprise-memory-layer" aria-label="Enterprise data memory and RAG boundary">
          <div className="enterprise-memory-header">
            <div>
              <span className="kicker">Enterprise brain · data memory boundary</span>
              <h4>Where data, RAG, and operational memory live</h4>
            </div>
            <span>Source → retrieve → operate</span>
          </div>
          <div className="enterprise-memory-grid">
            {ENTERPRISE_MEMORY_LAYERS.map((layer) => (
              <article className="enterprise-memory-card" key={layer.id}>
                <span className="enterprise-memory-label">{layer.label}</span>
                <strong>{layer.component}</strong>
                <p>{layer.role}</p>
                <small><b>Boundary</b> {layer.boundary}</small>
                <small><b>Acceptance</b> {layer.acceptance}</small>
              </article>
            ))}
          </div>
          <p className="enterprise-memory-note"><b>RAG rule:</b> retrieval can ground a response with approved, cited data; it cannot approve work, grant permissions, or become the authoritative policy store. This MVP visualises the boundary only.</p>
        </section>
        <p className="azure-scope-footnote">Azure services shown here are proposed placement labels for the presentation. This prototype contains no Azure credentials, deployment files, or cloud runtime.</p>
      </section>
    </section>
  );
}
