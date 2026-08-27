/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { useMemo } from 'react';

type RoomGridProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
};

export function PotRoomScene() {
  return (
    <group>
      <RoomSurface position={[0, 0, -2.1]} rotation={[0, 0, 0]} size={[10, 8]} color="#fbfcfd" />
      <RoomSurface position={[0, -2.1, 3.9]} rotation={[-Math.PI / 2, 0, 0]} size={[10, 12]} color="#f8fafb" />
      <RoomSurface position={[-5, 0, 3.9]} rotation={[0, Math.PI / 2, 0]} size={[12, 8]} color="#f9fafb" />
      <RoomSurface position={[5, 0, 3.9]} rotation={[0, -Math.PI / 2, 0]} size={[12, 8]} color="#f9fafb" />
      <RoomSurface position={[0, 3.9, 3.9]} rotation={[Math.PI / 2, 0, 0]} size={[10, 12]} color="#ffffff" />
      <RoomGrid position={[0, 0, -2.075]} rotation={[0, 0, 0]} size={[10, 8]} />
      <RoomGrid position={[0, -2.075, 3.9]} rotation={[-Math.PI / 2, 0, 0]} size={[10, 12]} />
      <RoomGrid position={[-4.975, 0, 3.9]} rotation={[0, Math.PI / 2, 0]} size={[12, 8]} />
      <RoomGrid position={[4.975, 0, 3.9]} rotation={[0, -Math.PI / 2, 0]} size={[12, 8]} />
      <RoomGrid position={[0, 3.875, 3.9]} rotation={[Math.PI / 2, 0, 0]} size={[10, 12]} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-3, 2, 1]} intensity={0.55} />
    </group>
  );
}

function RoomSurface({ position, rotation, size, color }: RoomGridProps & { color: string }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function RoomGrid({ position, rotation, size }: RoomGridProps) {
  const lineMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#cfd5db',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  }), []);
  const [width, height] = size;
  const columns = Math.round(width / 0.8);
  const rows = Math.round(height / 0.8);
  const lineWidth = 0.014;
  const lineDepth = 0.004;
  const lines = [];
  for (let index = 0; index <= columns; index += 1) {
    const x = -width / 2 + (width / columns) * index;
    lines.push(
      <mesh key={`vertical-${index}`} position={[x, 0, 0]} material={lineMaterial}>
        <boxGeometry args={[lineWidth, height, lineDepth]} />
      </mesh>,
    );
  }
  for (let index = 0; index <= rows; index += 1) {
    const y = -height / 2 + (height / rows) * index;
    lines.push(
      <mesh key={`horizontal-${index}`} position={[0, y, 0]} material={lineMaterial}>
        <boxGeometry args={[width, lineWidth, lineDepth]} />
      </mesh>,
    );
  }

  return (
    <group
      position={position}
      rotation={rotation}>
      {lines}
    </group>
  );
}
