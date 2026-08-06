import { StageFlow } from './StageFlow';
import {
  ADOPTION_CURVE,
  COST_BANDS,
  FACTORY_STAGES,
  LEARNING_STAGE,
  LOOPS,
  OPEN_DECISIONS,
  PLATFORM_STAGE,
  RUNS_PER_MONTH,
  entity,
  map,
  presentationFor,
  stagesOfLoop,
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
  const stage = FACTORY_STAGES.find((item) => item.stageOrder === 5);
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

// WHY: a segment narrow enough to clip its own label is worse than an unlabelled
// one — the legend below carries every name, keyed by the same tone colour.
const LABEL_MIN_SHARE = 0.13;

function CostBar() {
  const total = COST_BANDS.reduce((sum, band) => sum + band.high, 0);
  return (
    <div className="cost-bar" role="img" aria-label="Share of monthly cost by layer">
      {COST_BANDS.map((band) => {
        const share = band.high / total;
        return (
          <span
            key={band.label}
            className={`cost-seg seg-${band.tone}`}
            style={{ width: `${share * 100}%` }}
            title={`${band.label} — ${usd(band.low)} to ${usd(band.high)} per month`}
          >
            {share >= LABEL_MIN_SHARE && band.short}
          </span>
        );
      })}
    </div>
  );
}

export function ExecutiveView({ activeStageId, onStageSelect, onComponentSelect }: ExecutiveViewProps) {
  const criteria = criteriaOfGovernance();
  const openCount = OPEN_DECISIONS.length;
  const platform = PLATFORM_STAGE;
  const learning = LEARNING_STAGE;

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
          Any employee can raise a request through the channels they already use. The factory decides how much
          machinery the work deserves, and — for anything permanent — asks leadership to fund and own it. What comes
          out is an agent that is then <strong>published</strong>: people run it themselves from a catalogue, or it
          runs on a schedule. That second half is where the work actually gets done, thousands of times, for the
          cost of one build.
        </p>
        <div className="metric-row">
          <MetricTile label="Components specified" value={String(map.entities.filter((item) => item.workflow_id).length)} sub={`across ${map.stages.length} stages, two loops`} />
          <MetricTile label="Reference coverage" value={`${map.coverage.coveredCount}/${map.coverage.elementCount}`} sub={map.coverage.gaps.length === 0 ? 'no gaps against the target workflow' : `${map.coverage.gaps.length} gaps to close`} />
          <MetricTile label="Monthly run cost" value={`${usd(ADOPTION_CURVE[0].low)}–${usd(ADOPTION_CURVE[0].high)}`} sub={`at ${RUNS_PER_MONTH} published-agent runs/month`} />
          <MetricTile label="Delivery waves" value={String(map.cost.waves.length)} sub="wave 3 is when people can serve themselves" />
          <MetricTile label="Open decisions" value={String(openCount)} sub="named, not hidden" />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">The two loops</span>
            <h2>Building an agent, and then running it</h2>
          </div>
          <p className="panel-aside">Click a stage to see who is accountable and what sits inside it.</p>
        </div>
        <p className="panel-copy">
          These run at completely different rates, and that is the whole economic case. The factory loop is slow,
          careful, and governed — it runs once per solution. The runtime loop is what an employee actually touches,
          and it runs every time somebody needs the work done.
        </p>
        {LOOPS.map((loop) => (
          <div key={loop.id} className={`loop-block loop-${loop.id}`}>
            <header className="loop-head">
              <h3>{loop.title}</h3>
              <span className="loop-cadence">{loop.cadence}</span>
              <p>{loop.summary}</p>
            </header>
            <StageFlow stages={stagesOfLoop(loop.id)} activeStageId={activeStageId} onSelect={onStageSelect} />
            {loop.id === 'factory' && (
              <div className="loop-handoff">
                <span className="handoff-arrow" aria-hidden="true">↓</span>
                <div>
                  <strong>The handoff</strong>
                  <p>
                    An approved team is registered, bound to a package version and a business unit, and published.
                    From here it is invoked directly — a request that a deployment already covers never re-enters
                    the factory.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
        {learning && (
          <button
            type="button"
            className="learning-band"
            onClick={() => onStageSelect(learning)}
            style={{ borderColor: presentationFor(learning.id).color }}
          >
            <span className="kicker">Stage 7 · closes both loops</span>
            <strong>{learning.name.replace(/^\d+ · /, '')} — {learning.execSummary}</strong>
          </button>
        )}
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
              <li key={band.label} className={`legend-${band.tone}`}>
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
          <table className="adoption-table">
            <caption>What adoption costs — the runtime line is the one that moves</caption>
            <thead>
              <tr><th>Published-agent runs / month</th><th>Total platform / month</th></tr>
            </thead>
            <tbody>
              {ADOPTION_CURVE.map((point) => (
                <tr key={point.runs} className={point.runs === RUNS_PER_MONTH ? 'adoption-current' : undefined}>
                  <td>{point.runs.toLocaleString('en-US')}{point.runs === RUNS_PER_MONTH && <em> · planned</em>}</td>
                  <td>{usd(point.low)} – {usd(point.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel-copy small">
            The largest number here is also the one where the platform is completing thousands of pieces of work a
            month. The control that bounds it is a ceiling per deployment, not a platform-wide budget — so one
            team's enthusiasm cannot consume another team's capacity.
          </p>
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
