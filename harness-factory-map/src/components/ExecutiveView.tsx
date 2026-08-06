import { StageFlow } from './StageFlow';
import {
  COST_BANDS,
  FLOW_STAGES,
  OPEN_DECISIONS,
  PLATFORM_STAGE,
  TASKS_PER_MONTH,
  entity,
  map,
  presentationFor,
  usd,
} from '../app/factoryModel';
import type { GeneratedEntity, GeneratedStage } from '../types/specification';

interface ExecutiveViewProps {
  activeStageId?: string;
  onStageSelect: (stage: GeneratedStage) => void;
  onComponentSelect: (item: GeneratedEntity) => void;
}

const ROUTES = [
  {
    name: 'Log to the ticket system',
    when: 'Simple, low risk, already has a human process',
    who: 'The existing service desk',
    approval: 'None needed',
    cost: 'Effectively zero',
    aim: 'The majority of demand',
    tone: 'cheap',
  },
  {
    name: 'Harness Agent Team',
    when: 'One-off or complex, no recurrence expected',
    who: 'The standing shared agent team',
    approval: 'None needed — this is the standing capability',
    cost: 'Full model spend per task',
    aim: 'A meaningful minority',
    tone: 'mid',
  },
  {
    name: 'Dedicated Agent Team',
    when: 'Repeatable and high value',
    who: 'A new registered team with a named owner',
    approval: 'Leadership decision, stage 5',
    cost: 'Model spend plus ongoing ownership',
    aim: 'A handful, growing slowly',
    tone: 'costly',
  },
];

function MetricTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function criteriaOfGovernance(): string[] {
  const stage = FLOW_STAGES.find((item) => item.stageOrder === 5);
  return (stage?.referenceElements ?? [])
    .map((entry) => entry.element)
    .filter((element) => element.startsWith('Criterion: '))
    .map((element) => element.replace('Criterion: ', ''));
}

function brainDomains(): string[] {
  return (PLATFORM_STAGE?.referenceElements ?? [])
    .map((entry) => entry.element)
    .filter((element) => !element.includes(','));
}

function CostBar() {
  const total = COST_BANDS.reduce((sum, band) => sum + band.high, 0);
  return (
    <div className="cost-bar" role="img" aria-label="Share of monthly cost by layer">
      {COST_BANDS.map((band) => (
        <span key={band.label} className={`cost-seg seg-${band.label.split(' ')[0].toLowerCase()}`}
          style={{ width: `${(band.high / total) * 100}%` }}>
          {band.label}
        </span>
      ))}
    </div>
  );
}

export function ExecutiveView({ activeStageId, onStageSelect, onComponentSelect }: ExecutiveViewProps) {
  const criteria = criteriaOfGovernance();
  const openCount = OPEN_DECISIONS.length;
  const platform = PLATFORM_STAGE;

  return (
    <div className="exec-view">
      <section className="panel hero-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">What we are proposing to build</span>
            <h2>One front door, three routes, a name on every decision</h2>
          </div>
        </div>
        <p className="hero-copy">
          Any employee can raise a request through the channels they already use. The system checks whether we
          already built it, interviews them until the job is clear, decides how much machinery the work actually
          deserves, and — for anything permanent — asks leadership to fund and own it. Agents do the work. A person
          signs it off. Everything is recorded.
        </p>
        <div className="metric-row">
          <MetricTile label="Components specified" value={String(map.entities.filter((item) => item.workflow_id).length)} sub="across 8 stages" />
          <MetricTile label="Reference coverage" value={`${map.coverage.coveredCount}/${map.coverage.elementCount}`} sub={map.coverage.gaps.length === 0 ? 'no gaps against the target workflow' : `${map.coverage.gaps.length} gaps to close`} />
          <MetricTile label="Monthly run cost" value={`${usd(COST_BANDS[0].low + COST_BANDS[1].low)}–${usd(COST_BANDS[0].high + COST_BANDS[1].high)}`} sub={`at ${TASKS_PER_MONTH} tasks/month`} />
          <MetricTile label="Delivery waves" value={String(map.cost.waves.length)} sub="waves 1–2 are the MVP" />
          <MetricTile label="Open decisions" value={String(openCount)} sub="named, not hidden" />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">The decision flow</span>
            <h2>How a request becomes a delivered outcome</h2>
          </div>
          <p className="panel-aside">Click a stage to see who is accountable and what sits inside it.</p>
        </div>
        <StageFlow stages={FLOW_STAGES} activeStageId={activeStageId} onSelect={onStageSelect} />
        {platform && (
          <button type="button" className="platform-band" onClick={() => onStageSelect(platform)}
            style={{ borderColor: presentationFor(platform.id).color }}>
            <span className="kicker">Stage 0 · always on, behind every stage above</span>
            <strong>{platform.name.replace(/^\d+ · /, '')} — {platform.execSummary}</strong>
            <span className="brain-domains">
              {brainDomains().map((domain) => <em key={domain}>{domain}</em>)}
            </span>
          </button>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">The cost lever</span>
            <h2>Three routes — and choosing correctly is the product</h2>
          </div>
        </div>
        <p className="panel-copy">
          The instinct is to maximise the agent routes. That instinct is expensive. A request that should have been
          a ticket and instead consumed model time and reviewer attention is a failure of the platform, even when
          the outcome was fine.
        </p>
        <div className="route-grid">
          {ROUTES.map((route) => (
            <article key={route.name} className={`route-card tone-${route.tone}`}>
              <h3>{route.name}</h3>
              <dl>
                <div><dt>When</dt><dd>{route.when}</dd></div>
                <div><dt>Who does it</dt><dd>{route.who}</dd></div>
                <div><dt>Approval</dt><dd>{route.approval}</dd></div>
                <div><dt>Marginal cost</dt><dd>{route.cost}</dd></div>
              </dl>
              <footer>Aim for: {route.aim}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="panel two-column">
        <div>
          <div className="panel-head">
            <div>
              <span className="kicker">Stage 5</span>
              <h2>What leadership is actually approving</h2>
            </div>
          </div>
          <ol className="criteria-list">
            {criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
          </ol>
          <p className="panel-copy small">
            The fourth fails more proposals than the other three combined, and it should. An agent team without a
            named owner does not get reviewed, does not get retired, and does not get switched off when the
            underlying process changes.
          </p>
        </div>
        <div>
          <div className="panel-head">
            <div>
              <span className="kicker">What it costs to run</span>
              <h2>Model spend, not infrastructure</h2>
            </div>
          </div>
          <CostBar />
          <ul className="cost-legend">
            {COST_BANDS.map((band) => (
              <li key={band.label}>
                <strong>{band.label}</strong>
                <span>{usd(band.low)} – {usd(band.high)} / month</span>
                <small>{band.note}</small>
              </li>
            ))}
            <li className="cost-offbill">
              <strong>Reviewer time</strong>
              <span>0.5 – 1 FTE</span>
              <small>Not on the cloud bill, and the real constraint on throughput</small>
            </li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Honest gaps</span>
            <h2>Decisions still open, by component</h2>
          </div>
          <p className="panel-aside">Every one of these is written into the specification rather than discovered during build.</p>
        </div>
        <ul className="decision-list">
          {OPEN_DECISIONS.map((decision) => (
            <li key={`${decision.componentId}-${decision.question}`}>
              <button type="button" onClick={() => {
                const item = entity(decision.componentId);
                if (item) onComponentSelect(item);
              }}>
                <span className="decision-owner">{decision.componentName}</span>
                <span>{decision.question}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
