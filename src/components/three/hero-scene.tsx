"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, PerformanceMonitor, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export interface HeroSceneProps {
  accent: string;
  particles: boolean;
  animate: boolean;
  active: boolean;
  lowPower: boolean;
}

/* Ashima/Stefan Gustavson 3D simplex noise (MIT) */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform vec2 uMouse;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
${NOISE}
vec3 displace(vec3 p){
  float n = snoise(p * 1.4 + vec3(uTime * 0.25, uTime * 0.18, uMouse.x * 0.6));
  float n2 = snoise(p * 3.2 - vec3(0.0, uTime * 0.3, uMouse.y * 0.6)) * 0.35;
  return p + normal * (n + n2) * uAmp;
}
void main(){
  vec3 p = displace(position);
  // Recompute the normal from two neighbouring displaced points.
  vec3 t = normalize(cross(normal, vec3(0.0, 1.0, 0.001)));
  vec3 b = normalize(cross(normal, t));
  vec3 pt = displace(position + t * 0.01);
  vec3 pb = displace(position + b * 0.01);
  vec3 n = normalize(cross(pt - p, pb - p));
  vNormal = normalize(normalMatrix * n);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = normalize(-mv.xyz);
  vNoise = snoise(position * 1.4 + uTime * 0.2);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uAccent;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
// Inigo Quilez cosine palette — iridescent rainbow.
vec3 palette(float t){
  return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
}
void main(){
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
  float t = dot(vNormal, vec3(0.3, 0.6, 0.2)) * 0.6 + vNoise * 0.25 + uTime * 0.05;
  vec3 iri = palette(t);
  vec3 base = mix(uAccent * 0.35, iri, 0.55);
  vec3 col = mix(base, iri * 1.25 + 0.15, fres);
  // soft specular highlight
  vec3 l = normalize(vec3(0.4, 0.8, 0.6));
  float spec = pow(max(dot(reflect(-l, vNormal), vView), 0.0), 40.0);
  col += spec * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`;

function Blob({ accent, animate, lowPower }: Pick<HeroSceneProps, "accent" | "animate" | "lowPower">) {
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const last = useRef({ x: 0, y: 0, energy: 0 });
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.22 },
      uMouse: { value: new THREE.Vector2() },
      uAccent: { value: new THREE.Color(accent) },
    }),
    [accent],
  );
  const scale = Math.min(1.05, Math.max(0.62, viewport.width / 6));

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    const u = uniforms;
    if (animate) u.uTime.value += d;
    // Pointer speed adds "energy" → the surface ripples harder when you move.
    const dx = state.pointer.x - last.current.x;
    const dy = state.pointer.y - last.current.y;
    last.current.x = state.pointer.x;
    last.current.y = state.pointer.y;
    const speed = Math.min(1, Math.hypot(dx, dy) * 12);
    last.current.energy = THREE.MathUtils.damp(last.current.energy, speed, speed > last.current.energy ? 8 : 1.5, d);
    u.uAmp.value = 0.2 + last.current.energy * (animate ? 0.35 : 0);
    u.uMouse.value.lerp(state.pointer, 0.06);

    if (!group.current) return;
    const scrollK = typeof window !== "undefined" ? Math.min(1.5, window.scrollY / window.innerHeight) : 0;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, state.pointer.x * 0.6 + scrollK * 1.4, 3, d);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -state.pointer.y * 0.4 + scrollK * 0.4, 3, d);
    if (mesh.current && animate) mesh.current.rotation.z += d * 0.08;
  });

  const detail = lowPower ? 40 : 96;

  return (
    <group ref={group} scale={scale}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.25, detail]} />
        <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
      </mesh>
    </group>
  );
}

/** Small glossy shapes orbiting the blob, each a different colour. */
function Satellites({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    if (animate) group.current.rotation.y += Math.min(delta, 1 / 30) * 0.15;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, state.pointer.x * 0.35, 2, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, state.pointer.y * 0.25, 2, delta);
  });
  const items: { pos: [number, number, number]; color: string; shape: "torus" | "sphere" | "box" | "cone" }[] = [
    { pos: [2.1, 0.9, 0.2], color: "#f472b6", shape: "torus" },
    { pos: [-2.2, -0.6, 0.4], color: "#22d3ee", shape: "sphere" },
    { pos: [1.6, -1.4, 0.8], color: "#fbbf24", shape: "box" },
    { pos: [-1.5, 1.5, -0.6], color: "#a3e635", shape: "cone" },
  ];
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <Float key={i} speed={animate ? 2 + i * 0.4 : 0} rotationIntensity={animate ? 1.6 : 0} floatIntensity={animate ? 1.4 : 0}>
          <mesh position={it.pos} scale={0.26}>
            {it.shape === "torus" && <torusGeometry args={[0.8, 0.32, 24, 64]} />}
            {it.shape === "sphere" && <sphereGeometry args={[0.8, 32, 32]} />}
            {it.shape === "box" && <boxGeometry args={[1.1, 1.1, 1.1]} />}
            {it.shape === "cone" && <coneGeometry args={[0.8, 1.4, 32]} />}
            <meshPhysicalMaterial color={it.color} roughness={0.15} metalness={0.3} clearcoat={1} envMapIntensity={1.5} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function HeroScene({ accent, particles, animate, active, lowPower }: HeroSceneProps) {
  const [dpr, setDpr] = useState<number>(lowPower ? 1 : 1.5);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6], fov: 40 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
      frameloop={active && animate ? "always" : "demand"}
      style={{ background: "transparent" }}
      aria-hidden
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(lowPower ? 1 : 1.75)} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <Blob accent={accent} animate={animate} lowPower={lowPower} />
      <Satellites animate={animate} />
      {particles && (
        <Sparkles
          count={lowPower ? 40 : 100}
          scale={[8, 6, 4]}
          size={2.2}
          speed={animate ? 0.35 : 0}
          opacity={0.8}
          color="#ffffff"
        />
      )}
      <Environment resolution={lowPower ? 64 : 128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, -2]} scale={[8, 1.4, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={4} position={[4, 1, 2]} scale={2.4} color={accent} />
        <Lightformer
          form="rect"
          intensity={2.5}
          position={[-5, 0, 1]}
          rotation-y={Math.PI / 2}
          scale={[6, 1.2, 1]}
          color="#f472b6"
        />
        <Lightformer form="rect" intensity={2} position={[0, -4, 2]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#22d3ee" />
      </Environment>
    </Canvas>
  );
}
