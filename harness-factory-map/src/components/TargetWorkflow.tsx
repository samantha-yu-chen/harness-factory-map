import type { CSSProperties } from 'react';
import { TARGET_WORKFLOW, type TargetWorkflowStage } from '../app/workflow';
import { STATIONS, stationForId, type StationDefinition } from '../app/stations';
import type { GeneratedEntity } from '../types/specification';

interface TargetWorkflowProps {
  activeStep: number;
  entities: GeneratedEntity[];
  onStageSelect: (station: StationDefinition) => void;
}

function stageState(stage: TargetWorkflowStage, activeStep: number): 'current' | 'complete' | '' {
  const activeStationId = activeStep >= 0 ? STATIONS[activeStep]?.id : undefined;
  if (stage.stationIds.includes(activeStationId ?? '')) return 'current';
  const lastStationIndex = Math.max(...stage.stationIds.map((id) => STATIONS.findIndex((station) => station.id === id)));
  return activeStep > lastStationIndex ? 'complete' : '';
}

export function TargetWorkflow({ activeStep, entities, onStageSelect }: TargetWorkflowProps) {
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
          const station = stationForId(stage.stationIds[0]);
          return (
            <div className="target-stage-wrap" key={stage.id}>
              <button
                type="button"
                className={`target-stage ${state}`}
                style={{ '--stage-color': stage.color } as CSSProperties}
                onClick={() => station && onStageSelect(station)}
              >
                <span className="target-stage-number">{stage.number}</span>
                <strong>{stage.label}</strong>
                <span>{stage.description}</span>
                <small>{entity?.scope ?? 'mvp'} · {entity?.plane ?? 'control'}</small>
                {stage.branch && <em>{stage.branch}</em>}
              </button>
              {index < TARGET_WORKFLOW.length - 1 && <span className="stage-arrow" aria-hidden="true">→</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
