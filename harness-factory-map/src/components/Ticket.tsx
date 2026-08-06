import { Html } from '@react-three/drei';

interface TicketProps {
  position: [number, number, number];
  visible?: boolean;
}

export function Ticket({ position, visible = true }: TicketProps) {
  if (!visible) return null;
  return (
    <group position={position} rotation={[0.12, -0.2, -0.12]}>
      <mesh castShadow>
        <boxGeometry args={[0.85, 0.08, 0.58]} />
        <meshStandardMaterial color="#fff7d6" />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.68, 0.015, 0.08]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <Html center position={[0, 0.1, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span className="ticket-label">TICKET</span>
      </Html>
    </group>
  );
}
