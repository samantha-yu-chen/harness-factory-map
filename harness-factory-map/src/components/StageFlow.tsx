import type { CSSProperties } from 'react';
import { componentsOf, presentationFor, reusedBy } from '../app/factoryModel';
import type { GeneratedStage } from '../types/specification';

interface StageFlowProps {
  stages: GeneratedStage[];
  activeStageId?: string;
  selectedStageId?: string;
  onSelect: (stage: GeneratedStage) => void;
  showBranches?: boolean;
}

function stageClass(stage: GeneratedStage, activeStageId?: string, selectedStageId?: string): string {
  const active = stage.id === activeStageId ? ' active' : '';
  const selected = stage.id === selectedStageId ? ' selected' : '';
  return `stage-card${active}${selected}`;
}

export function StageFlow({ stages, activeStageId, selectedStageId, onSelect, showBranches = true }: StageFlowProps) {
  return (
    <ol className="stage-flow">
      {stages.map((stage) => {
        const look = presentationFor(stage.id);
        return (
          <li key={stage.id}>
            <button
              type="button"
              className={stageClass(stage, activeStageId, selectedStageId)}
              style={{ '--stage-color': look.color } as CSSProperties}
              onClick={() => onSelect(stage)}
            >
              <span className="stage-index">{stage.stageOrder}</span>
              <span className="stage-glyph" aria-hidden="true">{look.glyph}</span>
              <strong>{stage.name.replace(/^\d+ · /, '')}</strong>
              <span className="stage-exec">{stage.execSummary}</span>
              <span className="stage-count">
                {componentsOf(stage).length} components
                {reusedBy(stage).length > 0 && (
                  <em className="stage-reuse"> + {reusedBy(stage).length} reused</em>
                )}
              </span>
              {showBranches && look.branch && <em className="stage-branch">{look.branch}</em>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
