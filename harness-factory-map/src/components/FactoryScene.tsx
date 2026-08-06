import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { START_POSITION, STATIONS, type StationDefinition } from '../app/stations';
import { Robot } from './Robot';
import { Station } from './Station';
import { Ticket } from './Ticket';

interface FactorySceneProps {
  activeStationId: string | undefined;
  selectedStationId: string | undefined;
  activeStep: number;
  onStationSelect: (station: StationDefinition) => void;
}

const zoneData = [
  { position: [-4.7, 0.01, -3] as [number, number, number], size: [5.1, 0.04, 2.4] as [number, number, number], color: '#fff0ad', label: 'REQUEST + INTAKE' },
  { position: [-0.8, 0.01, -0.6] as [number, number, number], size: [6.2, 0.04, 5.2] as [number, number, number], color: '#eadcff', label: 'CONTROL PLANE' },
  { position: [3.6, 0.01, 0] as [number, number, number], size: [4.5, 0.04, 2.4] as [number, number, number], color: '#c9f7d7', label: 'EXECUTION' },
  { position: [3.6, 0.01, 3] as [number, number, number], size: [4.5, 0.04, 2.2] as [number, number, number], color: '#cde5ff', label: 'DELIVERY' },
  { position: [-5, 0.01, 3] as [number, number, number], size: [2.4, 0.04, 2.2] as [number, number, number], color: '#ffd8ec', label: 'CONTEXT' },
];

function FactoryFloor() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.22, 0]}>
        <boxGeometry args={[16, 0.35, 10]} />
        <meshStandardMaterial color="#dbe5f0" />
      </mesh>
      {zoneData.map((zone) => (
        <group key={zone.label}>
          <mesh receiveShadow position={zone.position}>
            <boxGeometry args={zone.size} />
            <meshStandardMaterial color={zone.color} />
          </mesh>
          <Html center position={[zone.position[0], 0.08, zone.position[2] - zone.size[2] / 2 + 0.22]} distanceFactor={14}>
            <span className="zone-label">{zone.label}</span>
          </Html>
        </group>
      ))}
      <gridHelper args={[16, 16, '#a6b6cb', '#c3cfdd']} position={[0, -0.01, 0]} />
    </group>
  );
}

function Waypoints() {
  return (
    <group>
      {STATIONS.slice(0, -1).map((station, index) => {
        const next = STATIONS[index + 1];
        const midpoint = new THREE.Vector3(...station.position).lerp(new THREE.Vector3(...next.position), 0.5);
        const length = new THREE.Vector3(next.position[0] - station.position[0], 0, next.position[2] - station.position[2]).length();
        const angle = Math.atan2(next.position[0] - station.position[0], next.position[2] - station.position[2]);
        return (
          <mesh key={`${station.id}-${next.id}`} position={[midpoint.x, 0.04, midpoint.z]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.12, 0.03, length]} />
            <meshStandardMaterial color="#f7b955" />
          </mesh>
        );
      })}
    </group>
  );
}

export function FactoryScene({ activeStationId, selectedStationId, activeStep, onStationSelect }: FactorySceneProps) {
  const activeStation = STATIONS.find((station) => station.id === activeStationId);
  const robotTarget = activeStation?.position ?? START_POSITION;
  const deliveryStation = STATIONS[STATIONS.length - 1];
  const ticketAt = activeStep < 0
    ? [0, -4, 0] as [number, number, number]
    : activeStep === 0
      ? [STATIONS[0].position[0], 1.24, STATIONS[0].position[2] - 0.15] as [number, number, number]
      : activeStep === STATIONS.length - 1
        ? [deliveryStation.position[0], 1.24, deliveryStation.position[2] - 0.2] as [number, number, number]
        : robotTarget;
  const holdingTicket = activeStep > 0 && activeStep < STATIONS.length - 1;

  return (
    <Canvas
      shadows
      orthographic
      camera={{ position: [10, 11, 10], zoom: 52, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <color attach="background" args={['#c8e9ff']} />
      <ambientLight intensity={1.6} />
      <directionalLight castShadow position={[4, 9, 3]} intensity={2.2} shadow-mapSize={[1024, 1024]} />
      <FactoryFloor />
      <Waypoints />
      {STATIONS.map((station) => (
        <Station
          key={station.id}
          station={station}
          active={station.id === activeStationId}
          selected={station.id === selectedStationId}
          onSelect={onStationSelect}
        />
      ))}
      <Robot target={robotTarget} holdingTicket={holdingTicket} />
      <Ticket position={ticketAt} visible={activeStep >= 0 && !holdingTicket} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minZoom={38}
        maxZoom={78}
        minPolarAngle={0.55}
        maxPolarAngle={1.25}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
