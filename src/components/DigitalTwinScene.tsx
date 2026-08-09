"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const models: Record<string, string> = {
  "WS-102": "/models/ws-102-cnc/scene.gltf",
  "WS-108": "/models/ws-108-robot/scene.gltf",
  "WS-112": "/models/ws-112-conveyor/scene.gltf",
  "WS-114": "/models/conveyors-manipulator/scene.gltf",
};

export const twinWorkstationIds = ["WS-102", "WS-108", "WS-112", "WS-114"] as const;

function PlantModel({ machineId, inspectionProgress = 0 }: { machineId: string; inspectionProgress?: number }) {
  const url = models[machineId] ?? models["WS-102"];
  const gltf = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, group);

  if (machineId === "WS-112") {
    // The source asset includes a large decorative floor and vinyl disk.
    // Keeping them in the bounds calculation makes the conveyor framing unusable.
    scene.getObjectByName("Floor_01")?.traverse((node) => {
      node.visible = false;
    });
    scene.getObjectByName("Vinyl_Cd_V2")?.traverse((node) => {
      node.visible = false;
    });
  }

  scene.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  useEffect(() => {
    const animation = Object.values(actions)[0];
    animation?.reset().fadeIn(0.25).play();
    return () => {
      animation?.fadeOut(0.2);
    };
  }, [actions, machineId]);

  return <group ref={group} position={[inspectionProgress * 0.45, 0, 0]} rotation={[0, inspectionProgress * 0.25, 0]}><Center><primitive object={scene} /></Center></group>;
}

function LoadingState() {
  return <Html center><span className="rounded-md bg-background px-3 py-2 font-mono text-xs text-foreground shadow-sm">Loading plant asset…</span></Html>;
}

export function DigitalTwinScene({ machineId, inspectionProgress = 0, sceneMode = "overview" }: { machineId: string; inspectionProgress?: number; sceneMode?: "overview" | "isolate" | "dependencies" }) {
  return (
    <div className="h-[360px] overflow-hidden rounded-md border border-primary-foreground/20 bg-twin-canvas">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [5.5, 3.5, 6.5], fov: 42, near: 0.01, far: 1000 }}>
        <color attach="background" args={["#202020"]} />
        <hemisphereLight intensity={1.3} groundColor="#101010" />
        <directionalLight castShadow intensity={2} position={[5, 7, 4]} shadow-mapSize={[1024, 1024]} />
        <Suspense fallback={<LoadingState />}>
          <Bounds fit clip observe margin={1.25}>
            <PlantModel key={machineId} machineId={machineId} inspectionProgress={inspectionProgress} />
          </Bounds>
          <ContactShadows position={[0, -1.5, 0]} opacity={0.45} scale={20} blur={2.5} far={8} />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan minDistance={0.05} maxDistance={250} zoomToCursor autoRotate={sceneMode === "overview"} autoRotateSpeed={0.45} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/ws-102-cnc/scene.gltf");
useGLTF.preload("/models/ws-108-robot/scene.gltf");
useGLTF.preload("/models/ws-112-conveyor/scene.gltf");
useGLTF.preload("/models/conveyors-manipulator/scene.gltf");
