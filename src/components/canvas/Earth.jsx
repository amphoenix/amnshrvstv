import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import CanvasLoader from "../Loader";

const PALETTE = ["#ffd166", "#ff6b6b", "#4ecdc4", "#a78bfa"];

const AnimatedLight = () => {
  const lightRef = useRef();
  const colors = useRef(PALETTE.map((c) => new THREE.Color(c)));

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime * 0.2;
    const count = colors.current.length;
    const i = Math.floor(t) % count;
    const next = (i + 1) % count;
    const mix = t - Math.floor(t);
    const blended = colors.current[i].clone().lerp(colors.current[next], mix);
    lightRef.current.color.copy(blended);
  });

  return <directionalLight ref={lightRef} position={[2, 3, 4]} intensity={0.9} />;
};

const Earth = () => {
  const earth = useGLTF("./planet/scene.gltf");

  return (
    <primitive object={earth.scene} scale={2.5} position-y={0} rotation-y={0} />
  );
};

const EarthCanvas = () => {
  return (
    <Canvas
      shadows
      frameloop='always'
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      camera={{
        fov: 45,
        near: 0.1,
        far: 200,
        position: [-4, 3, 6],
      }}
    >
      <Suspense fallback={<CanvasLoader />}>
        <ambientLight intensity={0.35} color='#ffe8b3' />
        <AnimatedLight />
        <OrbitControls
          autoRotate
          autoRotateSpeed={1.2}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Earth />

        <Preload all />
      </Suspense>
    </Canvas>
  );
};

export default EarthCanvas;
