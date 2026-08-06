import { useEffect, useState } from 'react';
import { ComponentDrawer } from '../components/ComponentDrawer';
import { EngineeringView } from '../components/EngineeringView';
import { ExecutiveView } from '../components/ExecutiveView';
import { StageDrawer } from '../components/StageDrawer';
import { FLOW_STAGES, map } from './factoryModel';
import type { GeneratedEntity, GeneratedStage } from '../types/specification';

type Audience = 'executive' | 'engineering';

const AUDIENCES: { id: Audience; label: string; sub: string }[] = [
  { id: 'executive', label: 'Executive', sub: 'scope, routes, accountability, cost' },
  { id: 'engineering', label: 'Engineering', sub: 'components, contracts, waves, placement' },
];

const WALKTHROUGH_MS = 2600;

function App() {
  const [audience, setAudience] = useState<Audience>('executive');
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<GeneratedStage>();
  const [component, setComponent] = useState<GeneratedEntity>();

  const finished = step === FLOW_STAGES.length - 1;
  const activeStageId = step >= 0 ? FLOW_STAGES[step]?.id : undefined;

  useEffect(() => {
    if (!playing || step < 0 || finished) return undefined;
    const timer = window.setTimeout(() => setStep((current) => Math.min(current + 1, FLOW_STAGES.length - 1)), WALKTHROUGH_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, finished]);

  function play() {
    setStep((current) => (current < 0 || finished ? 0 : current));
    setPlaying(true);
  }

  function stop() {
    setStep(-1);
    setPlaying(false);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">AF</div>
          <div>
            <span className="kicker">Specification map · nothing here runs</span>
            <h1>Enterprise Agent Factory</h1>
          </div>
        </div>
        <div className="audience-switch" role="tablist" aria-label="Audience view">
          {AUDIENCES.map((entry) => (
            <button type="button" role="tab" key={entry.id} aria-selected={audience === entry.id}
              className={audience === entry.id ? 'audience-tab active' : 'audience-tab'}
              onClick={() => setAudience(entry.id)}>
              <strong>{entry.label}</strong>
              <span>{entry.sub}</span>
            </button>
          ))}
        </div>
        <div className="header-meta">
          <span className="spec-badge">SPECIFICATION ONLY — no agents, no cloud, no credentials</span>
          <span className="coverage-badge">{map.coverage.coveredCount}/{map.coverage.elementCount} target-workflow coverage</span>
        </div>
      </header>

      {audience === 'executive' && (
        <div className="walkthrough-bar">
          <span className="kicker">Walkthrough</span>
          <strong>{step < 0 ? 'Idle — no request in flight' : `Stage ${FLOW_STAGES[step].stageOrder}: ${FLOW_STAGES[step].execSummary}`}</strong>
          <div className="walkthrough-buttons">
            <button type="button" className="primary-button" onClick={play} disabled={playing && !finished}>
              ▶ {finished ? 'Replay' : 'Play'}
            </button>
            <button type="button" onClick={() => setPlaying(false)} disabled={!playing}>Pause</button>
            <button type="button" onClick={() => { setPlaying(false); setStep((c) => Math.min(c + 1, FLOW_STAGES.length - 1)); }} disabled={finished}>Next</button>
            <button type="button" onClick={stop}>Reset</button>
          </div>
        </div>
      )}

      <main className="app-main">
        {audience === 'executive'
          ? <ExecutiveView activeStageId={activeStageId} onStageSelect={setStage} onComponentSelect={setComponent} />
          : <EngineeringView onComponentSelect={setComponent} />}
      </main>

      <footer className="app-footer">
        <span>{map.entities.length} specifications · {map.edges.length} declared relationships · generated from <code>specs/</code></span>
        <span>Markdown under <code>specs/</code> is the working material. This map is the deliverable the harness team builds from.</span>
      </footer>

      {!component && <StageDrawer stage={stage} onClose={() => setStage(undefined)} onComponentSelect={setComponent} />}
      <ComponentDrawer item={component} onClose={() => setComponent(undefined)} />
    </div>
  );
}

export { App };
