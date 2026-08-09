import { useState, type CSSProperties } from 'react';
import { ScaleReadinessView } from './ScaleReadinessView';
import { StageFlow } from './StageFlow';
import {
  BACKING_LABELS,
  FACTORY_STAGES,
  FORCING_FUNCTIONS,
  LEARNING_STAGE,
  PLATFORM_STAGE,
  RISK_RANK,
  RUNTIME_STAGES,
  SYSTEM_DOCUMENTS,
  UNITS,
  WAVES,
  WAVE_THEMES,
  componentsOf,
  entity,
  map,
  moduleSlices,
  presentationFor,
  reusedBy,
  unit,
  unitName,
  usd,
} from '../app/factoryModel';
import type { GeneratedEntity, GeneratedStage } from '../types/specification';

interface EngineeringViewProps {
  onComponentSelect: (item: GeneratedEntity) => void;
}

type EngineeringTab = 'map' | 'scale';

const RAILS: { label: string; note: string; stages: GeneratedStage[] }[] = [
  { label: 'Platform band', note: 'Always on, read by every stage', stages: PLATFORM_STAGE ? [PLATFORM_STAGE] : [] },
  { label: 'Factory loop', note: 'Runs once per solution', stages: FACTORY_STAGES },
  { label: 'Runtime loop', note: 'Runs on every invocation of a published agent', stages: RUNTIME_STAGES },
  { label: 'Learning band', note: 'Closes both loops; proposes, never self-applies', stages: LEARNING_STAGE ? [LEARNING_STAGE] : [] },
].filter((rail) => rail.stages.length > 0);

const ALL_STAGES = RAILS.flatMap((rail) => rail.stages);

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
      <footer>
        {item.deployable_unit && (
          <span className="ships-in">
            <code>{unit(item.deployable_unit)?.repository ?? item.deployable_unit}</code>
            <code>{item.module}/</code>
          </span>
        )}
        <span>{item.owner} · {item.human_accountable}</span>
      </footer>
    </button>
  );
}

function StagePanel({ stage, onSelect }: { stage: GeneratedStage; onSelect: (item: GeneratedEntity) => void }) {
  const items = componentsOf(stage);
  const reused = reusedBy(stage);
  return (
    <section className="stage-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">
            Stage {stage.stageOrder} · {items.length} components
            {reused.length > 0 && ` · ${reused.length} reused`}
          </span>
          <h2>{stage.name.replace(/^\d+ · /, '')}</h2>
        </div>
        <p className="panel-aside">{stage.description}</p>
      </div>
      {items.length > 0 ? (
        <div className="component-grid">
          {items.map((item) => <ComponentCard key={item.id} item={item} onSelect={onSelect} />)}
        </div>
      ) : (
        <p className="panel-copy small">
          This stage introduces no components of its own — it runs entirely on machinery specified elsewhere.
        </p>
      )}
      {reused.length > 0 && (
        <>
          <div className="reuse-head">
            <span className="kicker">Reused here, owned elsewhere</span>
            <p>
              These are specified in their home stage and serve this one unchanged. Nothing is duplicated, so a
              published agent runs on exactly the machinery the factory verified it against.
            </p>
          </div>
          <div className="component-grid reused">
            {reused.map((item) => <ComponentCard key={item.id} item={item} onSelect={onSelect} />)}
          </div>
        </>
      )}
    </section>
  );
}

function ComponentChip({ item, onSelect }: { item: GeneratedEntity; onSelect: (item: GeneratedEntity) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onSelect(item)}>
        <span className={`risk-dot risk-${item.risk}`} aria-hidden="true" />
        {item.name}
      </button>
    </li>
  );
}

function PlanCell({ unitId, wave, onSelect }: { unitId: string; wave: number; onSelect: (item: GeneratedEntity) => void }) {
  const slices = moduleSlices(unitId, wave);
  if (slices.length === 0) return <td className="plan-cell empty"><span>—</span></td>;
  return (
    <td className="plan-cell">
      {slices.map((slice) => (
        <div key={slice.module} className="plan-module">
          <span className="module-tag">{slice.module}/</span>
          <ul>
            {slice.items
              .slice()
              .sort((left, right) => RISK_RANK[right.risk] - RISK_RANK[left.risk])
              .map((item) => <ComponentChip key={item.id} item={item} onSelect={onSelect} />)}
          </ul>
        </div>
      ))}
    </td>
  );
}

function BuildPlanPanel({ onSelect }: { onSelect: (item: GeneratedEntity) => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Delivery sequence · what gets built where</span>
          <h2>Build plan · {UNITS.length} repositories × {WAVES.length} waves</h2>
        </div>
        <p className="panel-aside">
          A row is a repository you clone. A cell is the directory you open in it that wave. Waves 1 and 2 are the
          MVP; stage 5 governance runs as a manual leadership review until wave 3.
        </p>
      </div>
      <div className="plan-table-wrap">
        <table className="plan-table">
          <thead>
            <tr>
              <th className="plan-repo-head">Repository</th>
              {WAVES.map((wave) => (
                <th key={wave}>
                  <span className="kicker">Wave {wave}</span>
                  <small>{WAVE_THEMES[wave]}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UNITS.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="plan-repo">
                  <strong>{item.name}</strong>
                  <code>{item.repository}</code>
                  <span className={item.forcingFunction === 'host' ? 'ff host' : 'ff'}>
                    {FORCING_FUNCTIONS[item.forcingFunction]}
                  </span>
                  <small>{item.componentIds.length} boundaries · {item.operationCount} operations · {usd(item.monthlyUsdLow)}–{usd(item.monthlyUsdHigh)}/mo</small>
                </th>
                {WAVES.map((wave) => (
                  <PlanCell key={wave} unitId={item.id} wave={wave} onSelect={onSelect} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ContractPanel() {
  const { contracts } = map;
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Cross-repository surface</span>
          <h2>Contracts between repositories · {contracts.crossUnitCount}</h2>
        </div>
        <p className="panel-aside">
          Every call that leaves a repository. {contracts.inUnitCount} more relationships stay inside one
          repository and cost nothing to change. A consumer naming an operation its provider does not publish
          fails generation, so a contract break shows up here rather than in production.
        </p>
      </div>
      {contracts.gaps.length > 0 && (
        <ul className="coverage-list contract-gaps">
          {contracts.gaps.map((gap) => (
            <li key={gap.id} className="gap">
              <span className="coverage-mark" aria-hidden="true">!</span>
              <span>{gap.sourceId} → {gap.targetId}</span>
              <small>crosses {unitName(gap.sourceUnit)} → {unitName(gap.targetUnit)} with no declared contract</small>
            </li>
          ))}
        </ul>
      )}
      <div className="pair-grid">
        {contracts.pairs.map((pair) => (
          <article key={pair.id} className="pair-card">
            <header>
              <strong>{unitName(pair.sourceUnit)}</strong>
              <span aria-hidden="true">→</span>
              <strong>{unitName(pair.targetUnit)}</strong>
              <em>{pair.links.length}</em>
            </header>
            <ul>
              {pair.links.map((link) => (
                <li key={link.id}>
                  <span className="link-ends">{link.sourceId} → {link.targetId}</span>
                  <span className={`backing backing-${link.backing}`}>{BACKING_LABELS[link.backing]}</span>
                  <small>{[...link.operations, ...link.events].join(' · ') || 'no operation named'}</small>
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
          Each factory stage declares the boxes drawn in the target workflow. Each component claims the ones it
          implements. The generator fails the build on an unknown claim and reports an unclaimed box here. The
          runtime stages declare none — they are this map's extension beyond the reference diagram, and the
          generator rejects any reference claim they make.
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

const ENGINEERING_TABS: { id: EngineeringTab; label: string; sub: string }[] = [
  { id: 'map', label: 'Specification map', sub: 'stages, contracts, waves, placement' },
  { id: 'scale', label: 'Scale readiness', sub: 'hot paths, budgets, what to decide now' },
];

function TabBar({ active, onSelect }: { active: EngineeringTab; onSelect: (tab: EngineeringTab) => void }) {
  return (
    <div className="eng-tabs" role="tablist" aria-label="Engineering view">
      {ENGINEERING_TABS.map((tab) => (
        <button type="button" role="tab" key={tab.id} aria-selected={active === tab.id}
          className={active === tab.id ? 'eng-tab active' : 'eng-tab'} onClick={() => onSelect(tab.id)}>
          <strong>{tab.label}</strong>
          <span>{tab.sub}</span>
        </button>
      ))}
    </div>
  );
}

function SpecificationMapTab({ onComponentSelect }: EngineeringViewProps) {
  const [stageId, setStageId] = useState(ALL_STAGES[0]?.id);
  const stage = ALL_STAGES.find((item) => item.id === stageId) ?? ALL_STAGES[0];

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Component map</span>
            <h2>Pick a stage</h2>
          </div>
          <p className="panel-aside">Every component opens on its API contract — the caller and worker pairing the harness team implements against.</p>
        </div>
        {RAILS.map((rail) => (
          <div key={rail.label} className="stage-rail">
            <div className="rail-label">
              <strong>{rail.label}</strong>
              <span>{rail.note}</span>
            </div>
            <StageFlow
              stages={rail.stages}
              selectedStageId={stage?.id}
              onSelect={(item) => setStageId(item.id)}
              showBranches={false}
            />
          </div>
        ))}
      </section>
      {stage && <StagePanel stage={stage} onSelect={onComponentSelect} />}
      <BuildPlanPanel onSelect={onComponentSelect} />
      <ContractPanel />
      <CoveragePanel />
      <AzurePanel />
      <SystemDocsPanel onSelect={onComponentSelect} />
    </>
  );
}

export function EngineeringView({ onComponentSelect }: EngineeringViewProps) {
  const [tab, setTab] = useState<EngineeringTab>('map');

  return (
    <div className="eng-view">
      <TabBar active={tab} onSelect={setTab} />
      {tab === 'map'
        ? <SpecificationMapTab onComponentSelect={onComponentSelect} />
        : <ScaleReadinessView />}
    </div>
  );
}
