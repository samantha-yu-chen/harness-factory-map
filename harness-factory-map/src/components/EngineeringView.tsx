import { useState, type CSSProperties } from 'react';
import { StageFlow } from './StageFlow';
import {
  FLOW_STAGES,
  PLATFORM_STAGE,
  RISK_RANK,
  SYSTEM_DOCUMENTS,
  WAVE_THEMES,
  componentsOf,
  entity,
  map,
  presentationFor,
  usd,
} from '../app/factoryModel';
import type { GeneratedEntity, GeneratedStage } from '../types/specification';

interface EngineeringViewProps {
  onComponentSelect: (item: GeneratedEntity) => void;
}

const ALL_STAGES = PLATFORM_STAGE ? [PLATFORM_STAGE, ...FLOW_STAGES] : FLOW_STAGES;

function ComponentCard({ item, onSelect }: { item: GeneratedEntity; onSelect: (item: GeneratedEntity) => void }) {
  const stageColor = presentationFor(item.workflow_id ?? '').color;
  return (
    <button type="button" className="component-card" style={{ '--stage-color': stageColor } as CSSProperties}
      onClick={() => onSelect(item)}>
      <header>
        <strong>{item.name}</strong>
        <span className={`risk risk-${item.risk}`}>{item.risk}</span>
      </header>
      <p>{item.description}</p>
      <dl className="component-facts">
        <div><dt>Caller surface</dt><dd>{item.api_contract.length} operations</dd></div>
        <div><dt>Owns data</dt><dd>{item.data_owned.length || '—'}</dd></div>
        <div><dt>Wave</dt><dd>{item.build_wave ?? '—'}</dd></div>
        <div><dt>Monthly</dt><dd>{item.cost ? `$${item.cost.monthly_usd_low}–${item.cost.monthly_usd_high}` : '—'}</dd></div>
      </dl>
      <footer>{item.owner} · {item.human_accountable}</footer>
    </button>
  );
}

function StagePanel({ stage, onSelect }: { stage: GeneratedStage; onSelect: (item: GeneratedEntity) => void }) {
  const items = componentsOf(stage);
  return (
    <section className="stage-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Stage {stage.stageOrder} · {items.length} components</span>
          <h2>{stage.name.replace(/^\d+ · /, '')}</h2>
        </div>
        <p className="panel-aside">{stage.description}</p>
      </div>
      <div className="component-grid">
        {items.map((item) => <ComponentCard key={item.id} item={item} onSelect={onSelect} />)}
      </div>
    </section>
  );
}

function WavePanel({ onSelect }: { onSelect: (item: GeneratedEntity) => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Delivery sequence</span>
          <h2>Build waves</h2>
        </div>
        <p className="panel-aside">Dependency-ordered. Waves 1 and 2 are the MVP; stage 5 governance runs as a manual leadership review until wave 3.</p>
      </div>
      <div className="wave-grid">
        {map.cost.waves.map((wave) => (
          <article key={wave.wave} className={`wave-card wave-${wave.wave}`}>
            <header>
              <span>Wave {wave.wave}</span>
              <strong>{usd(wave.monthlyUsdLow)}–{usd(wave.monthlyUsdHigh)}/mo</strong>
            </header>
            <p>{WAVE_THEMES[wave.wave]}</p>
            <ul>
              {wave.componentIds
                .map((id) => entity(id))
                .filter((item): item is GeneratedEntity => !!item)
                .sort((left, right) => RISK_RANK[right.risk] - RISK_RANK[left.risk])
                .map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => onSelect(item)}>
                      <span className={`risk-dot risk-${item.risk}`} aria-hidden="true" />
                      {item.name}
                    </button>
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function CoveragePanel() {
  const { coverage } = map;
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Drift check</span>
          <h2>Target-workflow coverage · {coverage.coveredCount}/{coverage.elementCount}</h2>
        </div>
        <p className="panel-aside">
          Each stage declares the boxes drawn in the target workflow. Each component claims the ones it implements.
          The generator fails the build on an unknown claim and reports an unclaimed box here.
        </p>
      </div>
      {coverage.gaps.length === 0 ? (
        <p className="coverage-clear">✓ Every element of the target workflow is claimed by at least one specified component.</p>
      ) : (
        <ul className="coverage-list">
          {coverage.gaps.map((gap) => (
            <li key={`${gap.stageId}-${gap.element}`} className="gap">
              <span className="coverage-mark" aria-hidden="true">!</span>
              <span>{gap.element}</span>
              <small>{gap.stageName} — no component claims this</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AzurePanel() {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Proposed placement</span>
          <h2>Azure services · {map.cost.azureServices.length} lines</h2>
        </div>
        <p className="panel-aside">Placement labels only. This prototype holds no credentials and calls nothing.</p>
      </div>
      <div className="azure-table-wrap">
        <table className="cost-table">
          <thead><tr><th>Service</th><th>SKU</th><th>Monthly</th><th>Used by</th></tr></thead>
          <tbody>
            {map.cost.azureServices
              .slice()
              .sort((left, right) => right.monthlyUsdHigh - left.monthlyUsdHigh)
              .map((line) => (
                <tr key={`${line.service}-${line.sku}`}>
                  <td>{line.service}</td>
                  <td>{line.sku}</td>
                  <td className="num">${line.monthlyUsdLow}–{line.monthlyUsdHigh}</td>
                  <td className="used-by">{line.usedBy.map((id) => entity(id)?.name ?? id).join(', ')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemDocsPanel({ onSelect }: { onSelect: (item: GeneratedEntity) => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Read these first</span>
          <h2>System documents</h2>
        </div>
      </div>
      <div className="component-grid">
        {SYSTEM_DOCUMENTS.map((item) => <ComponentCard key={item.id} item={item} onSelect={onSelect} />)}
      </div>
    </section>
  );
}

export function EngineeringView({ onComponentSelect }: EngineeringViewProps) {
  const [stageId, setStageId] = useState(ALL_STAGES[0]?.id);
  const stage = ALL_STAGES.find((item) => item.id === stageId) ?? ALL_STAGES[0];

  return (
    <div className="eng-view">
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Component map</span>
            <h2>Pick a stage</h2>
          </div>
          <p className="panel-aside">Every component opens on its API contract — the caller and worker pairing the harness team implements against.</p>
        </div>
        <StageFlow stages={ALL_STAGES} selectedStageId={stage?.id} onSelect={(item) => setStageId(item.id)} showBranches={false} />
      </section>
      {stage && <StagePanel stage={stage} onSelect={onComponentSelect} />}
      <WavePanel onSelect={onComponentSelect} />
      <CoveragePanel />
      <AzurePanel />
      <SystemDocsPanel onSelect={onComponentSelect} />
    </div>
  );
}
