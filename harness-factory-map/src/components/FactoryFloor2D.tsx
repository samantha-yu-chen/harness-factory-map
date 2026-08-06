import type { CSSProperties } from 'react';
import type { StationDefinition } from '../app/stations';
import { STATIONS } from '../app/stations';

interface FactoryFloor2DProps {
  activeStationId: string | undefined;
  selectedStationId: string | undefined;
  activeStep: number;
  onStationSelect: (station: StationDefinition) => void;
}

const point = (station: StationDefinition) => `${parseFloat(station.screenPosition.left)} ${parseFloat(station.screenPosition.top)}`;

export function FactoryFloor2D({ activeStationId, selectedStationId, activeStep, onStationSelect }: FactoryFloor2DProps) {
  const currentStation = activeStep >= 0 ? STATIONS[activeStep] : undefined;
  const ticketStation = activeStep < 0 ? STATIONS[0] : STATIONS[Math.min(activeStep, STATIONS.length - 1)];
  const robotStyle = currentStation?.screenPosition ?? { left: '5%', top: '83%' };

  return (
    <div className="factory-floor-2d">
      <div className="floor-zone zone-request">REQUEST + INTAKE</div>
      <div className="floor-zone zone-control">CONTROL PLANE</div>
      <div className="floor-zone zone-execution">EXECUTION</div>
      <div className="floor-zone zone-delivery">DELIVERY</div>
      <div className="floor-zone zone-learning">LEARNING LOOP</div>
      <svg className="route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={STATIONS.map(point).join(' ')} fill="none" stroke="#f3ae4d" strokeDasharray="1.2 1.2" strokeWidth="0.45" />
      </svg>
      {STATIONS.map((station, index) => (
        <button
          type="button"
          key={station.id}
          className={`station-card-2d ${station.id === activeStationId ? 'active' : ''} ${station.id === selectedStationId ? 'selected' : ''} ${index < activeStep ? 'complete' : ''}`}
          style={{ left: station.screenPosition.left, top: station.screenPosition.top, '--station-color': station.color } as CSSProperties}
          onClick={() => onStationSelect(station)}
        >
          <span className="station-building" aria-hidden="true"><span /></span>
          <span className="station-card-label">{station.label}</span>
          {index < activeStep && <span className="station-check" aria-label="Complete">✓</span>}
        </button>
      ))}
      <div className={`robot-2d ${activeStep >= 0 ? 'visible' : ''}`} style={robotStyle} aria-label="Simulation robot">
        <span className="robot-antenna" />
        <span className="robot-head"><i /><i /></span>
        <span className="robot-body"><i className="robot-arm left" /><i className="robot-arm right" /></span>
        <span className="robot-shadow" />
      </div>
      <div
        className={`ticket-2d ${activeStep >= 0 ? 'visible' : ''}`}
        style={{ left: ticketStation.screenPosition.left, top: ticketStation.screenPosition.top }}
        aria-label="Simulated ticket"
      >
        TICKET
      </div>
      <div className="floor-caption">PREDEFINED HAPPY PATH · VISUAL SIMULATION</div>
    </div>
  );
}
