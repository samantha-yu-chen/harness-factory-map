import { MarkdownBody } from './MarkdownBody';
import { componentsOf, entity, presentationFor } from '../app/factoryModel';
import type { GeneratedEntity, GeneratedStage } from '../types/specification';

interface StageDrawerProps {
  stage?: GeneratedStage;
  onClose: () => void;
  onComponentSelect: (item: GeneratedEntity) => void;
}

export function StageDrawer({ stage, onClose, onComponentSelect }: StageDrawerProps) {
  if (!stage) return null;
  const source = entity(stage.id);
  const look = presentationFor(stage.id);

  return (
    <>
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Close stage detail" />
      <aside className="component-drawer" aria-label={`${stage.name} detail`} style={{ borderTopColor: look.color }}>
        <div className="drawer-header">
          <div>
            <span className="drawer-kicker">Stage {stage.stageOrder} · {source?.plane} plane</span>
            <h2>{stage.name.replace(/^\d+ · /, '')}</h2>
            <p>{stage.execSummary}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close stage detail">×</button>
        </div>
        <div className="drawer-meta">
          <span>Accountable: {source?.human_accountable}</span>
          <span className={`risk risk-${source?.risk}`}>{source?.risk} risk</span>
          <span>{source?.automation_level}</span>
        </div>

        <section className="drawer-block">
          <h3>Why it matters</h3>
          <p className="drawer-copy">{source?.business_value}</p>
        </section>

        <section className="drawer-block">
          <h3>Components in this stage</h3>
          <ul className="stage-component-list">
            {componentsOf(stage).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onComponentSelect(item)}>
                  <strong>{item.name}</strong>
                  <span>{item.exec_summary}</span>
                  <small>wave {item.build_wave ?? '—'} · {item.api_contract.length} operations · {item.risk} risk</small>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="drawer-block">
          <h3>Target-workflow coverage</h3>
          <ul className="coverage-list">
            {stage.referenceElements.map((element) => (
              <li key={element.element} className={element.coveredBy.length > 0 ? 'covered' : 'gap'}>
                <span className="coverage-mark" aria-hidden="true">{element.coveredBy.length > 0 ? '✓' : '!'}</span>
                <span>{element.element}</span>
                <small>{element.coveredBy.map((id) => entity(id)?.name ?? id).join(', ') || 'no component claims this'}</small>
              </li>
            ))}
          </ul>
        </section>

        {source && (
          <section className="drawer-block">
            <h3>Stage specification</h3>
            <MarkdownBody body={source.body} />
          </section>
        )}
      </aside>
    </>
  );
}
