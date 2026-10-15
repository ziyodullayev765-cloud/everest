"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, PerformanceMonitor, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export interface HeroSceneProps {
  accent: string;
  particles: boolean;
  animate: boolean;
  active: boolean;
  lowPower: boolean;
}

/** The sculpture: a liquid graphite core, a faceted wire shell and two orbit rings. */
function Sculpture({ accent, animate, lowPower }: Pick<HeroSceneProps, "accent" | "animate" | "lowPower">) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  // Keep the object comfortably inside the frame on narrow screens.
  const scale = Math.min(1, Math.max(0.62, viewport.width / 6.2));

  useFrame((state, delta) => {
    if (!group.current) return;
    const d = Math.min(delta, 1 / 30);
    // Smooth pointer parallax (lerped so it never snaps).
    const targetY = animate ? state.pointer.x * 0.45 : 0;
    const targetX = animate ? -state.pointer.y * 0.3 : 0;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 3, d);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, d);
    if (!animate) return;
    if (shell.current) {
      shell.current.rotation.y += d * 0.08;
      shell.current.rotation.z -= d * 0.04;
    }
    if (ringA.current) ringA.current.rotation.z += d * 0.18;
    if (ringB.current) ringB.current.rotation.z -= d * 0.12;
  });

  const detail = lowPower ? 64 : 160;

  return (
    <group ref={group} scale={scale}>
      <Float speed={animate ? 1.4 : 0} rotationIntensity={animate ? 0.35 : 0} floatIntensity={animate ? 0.8 : 0}>
        <mesh castShadow>
          <sphereGeometry args={[1.15, detail, detail]} />
          <MeshDistortMaterial
            color="#3a4248"
            roughness={0.22}
            metalness={0.6}
            distort={0.32}
            speed={animate ? 1.6 : 0}
            envMapIntensity={2.6}
          />
        </mesh>

        <mesh ref={shell} scale={1.75}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.16} />
        </mesh>

        <mesh ref={ringA} rotation={[Math.PI / 2.3, 0.2, 0]}>
          <torusGeometry args={[2.05, 0.007, 16, 220]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <mesh ref={ringB} rotation={[Math.PI / 1.8, -0.5, 0.4]}>
          <torusGeometry args={[2.45, 0.004, 16, 220]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} />
        </mesh>
      </Float>
    </group>
  );
}

export default function HeroScene({ accent, particles, animate, active, lowPower }: HeroSceneProps) {
  const [dpr, setDpr] = useState<number>(lowPower ? 1 : 1.5);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
      // Render continuously only while visible and animated; otherwise only on demand.
      frameloop={active && animate ? "always" : "demand"}
      style={{ background: "transparent" }}
      aria-hidden
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(lowPower ? 1 : 1.75)} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={1.4} color={accent} />
      <pointLight position={[-4, -2, 2]} intensity={14} color={accent} distance={12} />

      <Sculpture accent={accent} animate={animate} lowPower={lowPower} />

      {particles && (
        <Sparkles
          count={lowPower ? 40 : 90}
          scale={[7, 5, 4]}
          size={1.6}
          speed={animate ? 0.25 : 0}
          opacity={0.55}
          color={accent}
        />
      )}

      {/* Procedural studio environment (no network HDR download). */}
      <Environment resolution={lowPower ? 128 : 256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 4, -2]} scale={[8, 1.4, 1]} color="#ffffff" />
        <Lightformer
          form="rect"
          intensity={3}
          position={[-5, 0, 1]}
          rotation-y={Math.PI / 2}
          scale={[6, 1.2, 1]}
          color={accent}
        />
        <Lightformer form="ring" intensity={5} position={[4, 1, 2]} scale={2.4} color={accent} />
        <Lightformer form="rect" intensity={1.6} position={[3, -2, 4]} scale={[3, 0.6, 1]} color="#ffffff" />
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[0, -4, 0]}
          rotation-x={Math.PI / 2}
          scale={[8, 8, 1]}
          color="#1f2937"
        />
      </Environment>
    </Canvas>
  );
}
