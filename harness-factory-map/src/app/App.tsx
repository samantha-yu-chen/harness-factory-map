import { useEffect, useMemo, useState } from 'react';
import mapJson from '../generated/map.json';
import { FactoryFloor2D } from '../components/FactoryFloor2D';
import { SpecDrawer } from '../components/SpecDrawer';
import { TargetWorkflow } from '../components/TargetWorkflow';
import { AZURE_SCOPE_BY_STAGE } from './cloudScope';
import { CLOUD_SCOPE_STATION, STATIONS, type StationDefinition } from './stations';
import { TARGET_WORKFLOW } from './workflow';
import type { GeneratedMap } from '../types/specification';

const map = mapJson as GeneratedMap;
const STEP_DURATION = 2300;

function App() {
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationDefinition>();

  const activeStation = useMemo(
    () => (activeStep >= 0 ? STATIONS[activeStep] : undefined),
    [activeStep],
  );
  const selectedEntity = selectedStation
    ? map.entities.find((entity) => entity.id === selectedStation.specId)
    : undefined;
  const selectedCloudScope = selectedStation
    ? AZURE_SCOPE_BY_STAGE[TARGET_WORKFLOW.find((stage) => stage.stationIds.includes(selectedStation.id))?.id ?? '']
    : undefined;
  const isFinished = activeStep === STATIONS.length - 1;
  const progress = activeStep < 0 ? 0 : Math.round(((activeStep + 1) / STATIONS.length) * 100);

  useEffect(() => {
    if (!isPlaying || activeStep < 0 || isFinished) return undefined;
    const timer = window.setTimeout(() => {
      setActiveStep((step) => Math.min(step + 1, STATIONS.length - 1));
    }, STEP_DURATION);
    return () => window.clearTimeout(timer);
  }, [activeStep, isFinished, isPlaying]);

  function startSimulation() {
    setActiveStep(0);
    setIsPlaying(true);
  }

  function pauseSimulation() {
    setIsPlaying(false);
  }

  function nextStep() {
    setActiveStep((step) => (step < 0 ? 0 : Math.min(step + 1, STATIONS.length - 1)));
    setIsPlaying(false);
  }

  function resetSimulation() {
    setActiveStep(-1);
    setIsPlaying(false);
  }

  function openStation(station: StationDefinition) {
    setSelectedStation(station);
  }

  const status = activeStep < 0
    ? 'Ready for a ticket'
    : isFinished
    ? 'Delivered, audited, and ready for learning'
      : `Ticket paused at ${activeStation?.label}`;

  return (
    <div className="prototype-shell">
      <header className="game-header">
        <div className="brand-lockup">
          <div className="brand-mark">HF</div>
          <div>
            <span className="kicker">Interactive presentation prototype</span>
            <h1>Harness Agent Factory</h1>
          </div>
        </div>
        <div className="simulation-badge">SIMULATION MODE — No live agent execution</div>
      </header>

      <main className="game-layout">
        <TargetWorkflow
          activeStep={activeStep}
          entities={map.entities}
          onStageSelect={openStation}
          onCloudScopeSelect={() => openStation(CLOUD_SCOPE_STATION)}
        />
        <section className="scene-card" aria-label="Target workflow factory">
          <div className="scene-copy">
            <span className="kicker">Happy-path ticket run</span>
            <h2>Build, inspect, and deliver</h2>
            <p>Click a station to inspect its design, or start the robot tour.</p>
          </div>
          <div className="scene-viewport">
            <FactoryFloor2D
              activeStationId={activeStation?.id}
              selectedStationId={selectedStation?.id}
              activeStep={activeStep}
              onStationSelect={openStation}
            />
          </div>
          <div className="scene-footer">
            <span>Click any station for its Markdown specification</span>
            <span className="progress-label">{progress}% complete</span>
          </div>
        </section>

        <aside className="control-panel" aria-label="Simulation controls">
          <div className="ticket-status">
            <div className="ticket-icon">✓</div>
            <div>
              <span className="kicker">Current ticket</span>
              <strong>{status}</strong>
            </div>
          </div>
          <div className="control-buttons">
            <button type="button" className="primary-button" onClick={startSimulation}>
              ▶ {isFinished ? 'Run Again' : 'Start Simulation'}
            </button>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={pauseSimulation} disabled={!isPlaying}>Ⅱ Pause</button>
              <button type="button" className="secondary-button" onClick={nextStep} disabled={isFinished}>Next Step ›</button>
              <button type="button" className="reset-button" onClick={resetSimulation}>Reset</button>
            </div>
          </div>
          <div className="station-progress">
            <div className="panel-heading"><h3>Factory route</h3><span>{activeStep < 0 ? 'Idle' : `${activeStep + 1}/${STATIONS.length}`}</span></div>
            <ol>
              {STATIONS.map((station, index) => (
                <li key={station.id} className={index === activeStep ? 'current' : index < activeStep ? 'complete' : ''}>
                  <button type="button" onClick={() => openStation(station)}>
                    <span className="step-dot">{index < activeStep ? '✓' : index + 1}</span>
                    <span>{station.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel-note">
            <strong>Presentation note</strong>
            <p>All stations are visual explanations backed by the Markdown specifications in this repository.</p>
          </div>
        </aside>
      </main>

      <SpecDrawer
        station={selectedStation}
        entity={selectedEntity}
        entities={map.entities}
        cloudScope={selectedCloudScope}
        onClose={() => setSelectedStation(undefined)}
      />
    </div>
  );
}

export { App };
