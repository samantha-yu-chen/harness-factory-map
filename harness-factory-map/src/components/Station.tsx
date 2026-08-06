import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { StationDefinition } from '../app/stations';

interface StationProps {
  station: StationDefinition;
  active: boolean;
  selected: boolean;
  onSelect: (station: StationDefinition) => void;
}

export function Station({ station, active, selected, onSelect }: StationProps) {
  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(station);
  }

  const isTower = station.id === 'orchestrator-control-tower';
  const isScanner = station.id === 'risk-scanner';
  return (
    <group position={station.position} onClick={select}>
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[2.1, 0.2, 1.65]} />
        <meshStandardMaterial color={station.color} />
      </mesh>
      <mesh castShadow position={[0, isTower ? 1.2 : 0.7, 0]}>
        <boxGeometry args={[isTower ? 1.05 : 1.35, isTower ? 2.2 : 1.15, isTower ? 1.05 : 0.95]} />
        <meshStandardMaterial color={selected ? '#ffffff' : '#f8fafc'} />
      </mesh>
      {isTower && (
        <mesh castShadow position={[0, 2.45, 0]}>
          <cylinderGeometry args={[0.45, 0.58, 0.28, 6]} />
          <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.5} />
        </mesh>
      )}
      {isScanner && (
        <mesh castShadow position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.1, 10, 24]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={0.7} />
        </mesh>
      )}
      <mesh castShadow position={[0, 1.34, 0.52]}>
        <boxGeometry args={[0.72, 0.12, 0.08]} />
        <meshStandardMaterial color={station.color} />
      </mesh>
      <Html center position={[0, isTower ? 3.1 : 2.1, 0]} distanceFactor={10}>
        <button
          type="button"
          className={`station-label ${active ? 'active' : ''} ${selected ? 'selected' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(station);
          }}
        >
          {station.label}
        </button>
      </Html>
    </group>
  );
}
