'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useEditorStore } from '@/store/editorStore';
import { useInterpolatedFrame } from '@/hooks/useInterpolatedFrame';

export function Stage3D() {
  const choreo = useEditorStore((s) => s.choreo);
  const { states } = useInterpolatedFrame();
  if (!choreo) return null;

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 14, 14], fov: 50 }} shadows>
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 12, 6]} intensity={0.9} castShadow />

        <Grid
          args={[choreo.stage.width, choreo.stage.height]}
          cellSize={1}
          sectionSize={3}
          cellColor="#a87a4a"
          sectionColor="#5a3a1a"
          fadeDistance={40}
          infiniteGrid={false}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[choreo.stage.width, choreo.stage.height]} />
          <meshStandardMaterial color={choreo.stage.backgroundColor ?? '#c89968'} />
        </mesh>

        {choreo.performers.map((p) => {
          const st = states[p.id];
          if (!st) return null;
          const leaderPos: [number, number, number] = [st.position.x, 0, st.position.y];
          const leaderRot: [number, number, number] = [
            0,
            -(st.rotationDeg * Math.PI) / 180,
            0,
          ];
          return (
            <group key={p.id}>
              {/* Leader / solo body */}
              <group position={leaderPos} rotation={leaderRot}>
                <mesh position={[0, 0.9, 0]} castShadow>
                  <cylinderGeometry args={[0.25, 0.25, 1.8, 16]} />
                  <meshStandardMaterial color={p.color} />
                </mesh>
                <mesh position={[0, 2.0, 0]} castShadow>
                  <sphereGeometry args={[0.22, 16, 16]} />
                  <meshStandardMaterial color={p.color} />
                </mesh>
              </group>

              {/* Follower when split — hollow/lighter variant */}
              {st.splitOffset && (
                <group
                  position={[
                    st.position.x + st.splitOffset.x,
                    0,
                    st.position.y + st.splitOffset.y,
                  ]}
                  rotation={leaderRot}
                >
                  <mesh position={[0, 0.9, 0]} castShadow>
                    <cylinderGeometry args={[0.22, 0.22, 1.7, 16]} />
                    <meshStandardMaterial
                      color={p.color}
                      emissive={p.color}
                      emissiveIntensity={0.3}
                      transparent
                      opacity={0.75}
                    />
                  </mesh>
                  <mesh position={[0, 1.95, 0]} castShadow>
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshStandardMaterial
                      color={p.color}
                      emissive={p.color}
                      emissiveIntensity={0.3}
                      transparent
                      opacity={0.75}
                    />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}

        <OrbitControls makeDefault enablePan enableRotate enableZoom />
      </Canvas>
    </div>
  );
}
