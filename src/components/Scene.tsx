// components/Scene.tsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Sparkles, Environment, Float, CameraShake } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, GodRays, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { useWeatherStore } from '@/store/weatherStore';

// 🌧️ Advanced rain system using InstancedMesh for thousands of stretched droplets.
const RainSystem = () => {
    const mesh = useRef<THREE.InstancedMesh | null>(null);
    const count = 1000;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 25,
            y: Math.random() * 20,
            z: (Math.random() - 0.5) * 10,
            speed: 0.5 + Math.random() * 0.5
        }));
    }, []);

    useFrame(() => {
        const instanced = mesh.current;
        if (!instanced) return;
        particles.forEach((p, i) => {
            p.y -= p.speed;
            if (p.y < -10) p.y = 10;
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.set(0.02, 0.8, 0.02); // Thin rain streak
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        });
        instanced.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry />
            <meshStandardMaterial color="#aaddff" transparent opacity={0.4} roughness={0} />
        </instancedMesh>
    );
};

// ❄️ Advanced snow system with turbulence offset.
const SnowSystem = () => {
    const mesh = useRef<THREE.InstancedMesh | null>(null);
    const count = 500;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => new Array(count).fill(0).map(() => ({
        x: (Math.random() - 0.5) * 20,
        y: Math.random() * 20,
        z: (Math.random() - 0.5) * 10,
        factor: Math.random() * 100,
        speed: 0.05 + Math.random() * 0.05
    })), []);

    useFrame(({ clock }) => {
        const instanced = mesh.current;
        if (!instanced) return;
        const t = clock.getElapsedTime();
        particles.forEach((p, i) => {
            p.y -= p.speed;
            // Gentle sine sway sells the floating feel.
            p.x += Math.sin(t + p.factor) * 0.01;
            if (p.y < -10) { p.y = 10; p.x = (Math.random() - 0.5) * 20; }

            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(t * 0.5 + p.factor, t * 0.3, 0);
            dummy.scale.set(0.1, 0.1, 0.1);
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        });
        instanced.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <dodecahedronGeometry />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
        </instancedMesh>
    );
};

// ☀️ Sun mesh + volumetric reference
type MeshProps = React.ComponentPropsWithoutRef<'mesh'>;
const Sun = React.forwardRef<THREE.Mesh, MeshProps>((props, ref) => (
    <mesh ref={ref} position={[5, 5, -10]} {...props}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#ffdd00" />
    </mesh>
));
Sun.displayName = 'Sun';

export const Scene = () => {
    const weather = useWeatherStore((s) => s.weather);
    const sunRef = useRef<THREE.Mesh | null>(null);
    const sun = sunRef.current;
    const hasSun = weather === 'sunny' && !!sun;

    const maybeGodRays = () =>
        hasSun && sun ? (
            <GodRays
                key="godrays"
                sun={sun}
                samples={60}
                density={0.96}
                decay={0.9}
                weight={0.6}
                exposure={0.6}
                clampMax={1}
                kernelSize={KernelSize.SMALL}
                blur
            />
        ) : (
            <React.Fragment key="godrays-empty" />
        );

    return (
        <>
            {/* Environment setup */}
            <Environment preset={weather === 'sunny' ? "sunset" : "city"} blur={1} />
            <ambientLight intensity={weather === 'rainy' ? 0.1 : 0.4} />

            {/* ☁️ Dynamic clouds for every weather state */}
            <Float speed={weather === 'windy' ? 5 : 1} rotationIntensity={0.2} floatIntensity={1}>
                <Cloud
                    position={[-4, 2, -5]}
                    opacity={weather === 'sunny' ? 0.4 : 0.9}
                    speed={weather === 'windy' ? 1.5 : 0.2}
                    color={weather === 'rainy' ? "#2c3e50" : "#ffffff"}
                    segments={20}
                />
                {weather !== 'sunny' ? (
                    <Cloud position={[4, 0, -8]} opacity={0.7} color="#566" speed={0.4} />
                ) : null}
            </Float>

            {/* 🎥 Post-processing stack */}
            <EffectComposer>
                {[
                    maybeGodRays(),
                    <Bloom key="bloom" luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.4} />,
                    <Noise key="noise" opacity={0.05} blendFunction={BlendFunction.OVERLAY} />,
                    <ChromaticAberration
                        key="chromatic"
                        offset={new THREE.Vector2(
                            weather === 'windy' ? 0.005 : 0.001,
                            weather === 'windy' ? 0.005 : 0.001
                        )}
                    />,
                    <Vignette key="vignette" eskil={false} offset={0.1} darkness={0.5} />
                ]}
            </EffectComposer>

            {/* 🌤️ Weather-specific elements */}
            {weather === 'sunny' ? (
                <>
                    <Sun ref={sunRef} />
                    <Sparkles count={50} scale={12} size={4} speed={0.4} opacity={0.5} color="#ffcc00" />
                </>
            ) : null}

            {weather === 'rainy' ? (
                <>
                    <directionalLight position={[0, 10, 5]} intensity={0.5} color="#88ccff" />
                    <RainSystem />
                    {/* Simulated ground reflection via lower point light */}
                    <pointLight position={[0, -5, 5]} intensity={2} color="#4444ff" distance={10} />
                </>
            ) : null}

            {weather === 'snowy' ? (
                <>
                    <SnowSystem />
                    <fog attach="fog" args={['#101020', 5, 25]} />
                    <pointLight position={[0, 5, 0]} intensity={1} color="#aaddff" />
                </>
            ) : null}

            {weather === 'windy' ? (
                <>
                    <Sparkles count={100} scale={[20, 10, 10]} size={8} speed={8} color="#aaddbb" opacity={0.5} noise={10} />
                    <directionalLight position={[-5, 5, 0]} intensity={1} color="#ffeecc" />
                    <CameraShake maxYaw={0.05} maxPitch={0.05} maxRoll={0.05} yawFrequency={0.5} pitchFrequency={0.5} rollFrequency={0.5} intensity={1} />
                </>
            ) : null}
        </>
    );
};
