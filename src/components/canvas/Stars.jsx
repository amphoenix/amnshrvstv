import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Preload } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";

const StarLayer = ({ count, radius, size, color, speed }) => {
  const ref = useRef();
  const [sphere] = useState(() => random.inSphere(new Float32Array(count), { radius }));

  useFrame((state, delta) => {
    ref.current.rotation.x -= (delta / 10) * speed;
    ref.current.rotation.y -= (delta / 15) * speed;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled>
        <PointMaterial
          transparent
          color={color}
          size={size}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

const StarsCanvas = () => {
  return (
    <div className='w-full h-auto absolute inset-0 z-[-1]'>
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Suspense fallback={null}>
          <StarLayer count={2500} radius={1.2} size={0.0022} color='#ffd166' speed={1} />
          <StarLayer count={1500} radius={1.4} size={0.0018} color='#ff6b6b' speed={0.7} />
          <StarLayer count={1200} radius={1.1} size={0.002} color='#4ecdc4' speed={1.3} />
          <StarLayer count={1000} radius={1.3} size={0.0016} color='#a78bfa' speed={0.5} />
        </Suspense>

        <Preload all />
      </Canvas>
    </div>
  );
};

export default StarsCanvas;
