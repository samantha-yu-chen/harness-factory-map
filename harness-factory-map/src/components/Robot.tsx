import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ticket } from './Ticket';

interface RobotProps {
  target: [number, number, number];
  holdingTicket: boolean;
}

export function Robot({ target, holdingTicket }: RobotProps) {
  const robot = useRef<THREE.Group>(null);
  const targetVector = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!robot.current) return;
    targetVector.set(target[0], target[1], target[2]);
    robot.current.position.lerp(targetVector, 1 - Math.exp(-delta * 3));
    robot.current.rotation.y = Math.sin(robot.current.position.x * 0.1) * 0.06;
  });

  return (
    <group ref={robot} position={target}>
      <mesh castShadow position={[0, 0.82, 0]}>
        <boxGeometry args={[0.72, 0.78, 0.58]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.42, 20, 16]} />
        <meshStandardMaterial color="#fed7aa" />
      </mesh>
      <mesh position={[-0.14, 1.56, -0.36]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.14, 1.56, -0.36]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>
      <mesh castShadow position={[-0.52, 0.87, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.18, 0.62, 0.18]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>
      <mesh castShadow position={[0.52, 0.87, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.18, 0.62, 0.18]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>
      <mesh castShadow position={[-0.2, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, 0.24]} />
        <meshStandardMaterial color="#c2410c" />
      </mesh>
      <mesh castShadow position={[0.2, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, 0.24]} />
        <meshStandardMaterial color="#c2410c" />
      </mesh>
      {holdingTicket && <Ticket position={[0, 1.02, -0.5]} />}
    </group>
  );
}
