/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber/native';
import { Component, type ErrorInfo, type ReactNode, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Group, Vector2 } from 'three';

import { AppIcon } from '@/components/icons';
import { PotRoomScene } from '@/components/pots/pot-room-scene';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { PotAssetItem } from '@/stores/asset-store';

export function PotModelViewer({ pot, fullScreen = false }: { pot: PotAssetItem; fullScreen?: boolean }) {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const modelRef = useRef<Group>(null);
  const rotationRef = useRef({ x: -0.18, y: 0.55 });
  const zoomRef = useRef(1);
  const gesture = useRef({ x: -0.18, y: 0.55, distance: 0, zoom: 1, lastX: 0, lastY: 0 });
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      gesture.current = {
        x: rotationRef.current.x,
        y: rotationRef.current.y,
        distance: getTouchDistance(event.nativeEvent.touches),
        zoom: zoomRef.current,
        lastX: event.nativeEvent.touches[0]?.pageX ?? 0,
        lastY: event.nativeEvent.touches[0]?.pageY ?? 0,
      };
    },
    onPanResponderMove: (event, state) => {
      const distance = getTouchDistance(event.nativeEvent.touches);
      if (distance > 0 && gesture.current.distance > 0) {
        const nextZoom = Math.max(0.35, Math.min(3, gesture.current.zoom * distance / gesture.current.distance));
        zoomRef.current = nextZoom;
        if (modelRef.current) modelRef.current.scale.setScalar(nextZoom * 0.84);
        return;
      }
      const nextRotation = {
        x: rotationRef.current.x + (state.moveY - gesture.current.lastY) * 0.014,
        y: rotationRef.current.y + (state.moveX - gesture.current.lastX) * 0.016,
      };
      gesture.current.lastX = state.moveX;
      gesture.current.lastY = state.moveY;
      rotationRef.current = nextRotation;
      if (modelRef.current) {
        modelRef.current.rotation.x = nextRotation.x;
        modelRef.current.rotation.y = nextRotation.y;
      }
    },
  }), []);

  const reset = () => {
    const nextRotation = { x: -0.18, y: 0.55 };
    rotationRef.current = nextRotation;
    zoomRef.current = 1;
    if (modelRef.current) {
      modelRef.current.rotation.set(nextRotation.x, nextRotation.y, 0);
      modelRef.current.scale.setScalar(0.84);
    }
  };

  return (
    <ModelErrorBoundary fallback={<ModelFallback />}>
      <View
        accessible
        accessibilityLabel={`${pot.name} 的三维模型，可单指旋转、双指缩放`}
        className={`${fullScreen ? 'flex-1' : 'h-[330px]'} w-full overflow-hidden`}
        style={{ backgroundColor: theme.background }}
        {...responder.panHandlers}>
        <Canvas
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          camera={{ position: [0, 0.5, 9], fov: 45 }}
          onCreated={() => setReady(true)}>
          <color attach="background" args={['#ffffff']} />
          <PotRoomScene />
          <group ref={modelRef} position={[0, -0.28, 0]} rotation={[-0.18, 0.55, 0]} scale={0.84}>
            <PotMesh pot={pot} />
          </group>
        </Canvas>
        {!ready ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <ThemedText type="small" themeColor="textSecondary">正在生成模型...</ThemedText>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重置三维模型视角"
          onPress={reset}
          className="absolute right-4 bottom-4 h-11 w-11 items-center justify-center rounded-lg border active:opacity-70"
          style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
          <AppIcon name="rotate3d" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>
    </ModelErrorBoundary>
  );
}

function PotMesh({ pot }: { pot: PotAssetItem }) {
  if (pot.dimensions.shape === 'round') return <RoundPot pot={pot} />;
  return <SquarePot pot={pot} />;
}

function RoundPot({ pot }: { pot: PotAssetItem }) {
  const { topDiameterMm, bottomDiameterMm, heightMm } = pot.dimensions;
  const max = Math.max(topDiameterMm, heightMm);
  const topRadius = topDiameterMm / max * 1.35;
  const bottomRadius = bottomDiameterMm / max * 1.35;
  const height = heightMm / max * 2.7;
  const wall = Math.max(0.08, topRadius * 0.1);
  const points = useMemo(() => [
    new Vector2(topRadius, height / 2),
    new Vector2(bottomRadius, -height / 2),
    new Vector2(Math.max(0.05, bottomRadius - wall), -height / 2 + wall),
    new Vector2(Math.max(0.05, topRadius - wall), height / 2 - wall * 0.35),
  ], [bottomRadius, height, topRadius, wall]);
  return (
    <mesh castShadow receiveShadow>
      <latheGeometry args={[points, 64]} />
      <meshStandardMaterial color={pot.appearance.color} roughness={getRoughness(pot.appearance.material)} metalness={0.04} side={2} />
    </mesh>
  );
}

function SquarePot({ pot }: { pot: PotAssetItem }) {
  const { lengthMm, widthMm, heightMm } = pot.dimensions;
  const max = Math.max(lengthMm, widthMm, heightMm);
  const length = lengthMm / max * 2.7;
  const width = widthMm / max * 2.7;
  const height = heightMm / max * 2.7;
  const wall = Math.max(0.09, Math.min(length, width) * 0.09);
  const material = <meshStandardMaterial color={pot.appearance.color} roughness={getRoughness(pot.appearance.material)} metalness={0.04} />;
  return (
    <group>
      <mesh position={[0, -height / 2 + wall / 2, 0]}><boxGeometry args={[length, wall, width]} />{material}</mesh>
      <mesh position={[-length / 2 + wall / 2, 0, 0]}><boxGeometry args={[wall, height, width]} />{material}</mesh>
      <mesh position={[length / 2 - wall / 2, 0, 0]}><boxGeometry args={[wall, height, width]} />{material}</mesh>
      <mesh position={[0, 0, -width / 2 + wall / 2]}><boxGeometry args={[length - wall * 2, height, wall]} />{material}</mesh>
      <mesh position={[0, 0, width / 2 - wall / 2]}><boxGeometry args={[length - wall * 2, height, wall]} />{material}</mesh>
    </group>
  );
}

function getRoughness(material: PotAssetItem['appearance']['material']) {
  if (material === 'ceramic') return 0.28;
  if (material === 'plastic') return 0.38;
  if (material === 'cement') return 0.92;
  if (material === 'terracotta') return 0.82;
  return 0.65;
}

function getTouchDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function ModelFallback() {
  const theme = useTheme();
  return (
    <View className="h-[330px] w-full items-center justify-center gap-2" style={{ backgroundColor: theme.background }}>
      <AppIcon name="pot" size={38} color={theme.textSecondary} />
      <ThemedText type="smallBold">三维模型暂不可用</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">规格数据仍可正常查看和编辑</ThemedText>
    </View>
  );
}

class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Pot 3D model failed to render', error, info.componentStack);
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
