import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Sparkles, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

type WeatherVisualsProps = {
    weather: 'sunny' | 'rainy' | 'snowy' | 'windy';
};

// 自定义雨/雪粒子系统
const Particles = ({ count, type, speed, color }: { count: number, type: 'rain' | 'snow', speed: number, color: string }) => {
    const mesh = useRef<THREE.InstancedMesh | null>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // 初始化位置
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const t = {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 10,
                factor: Math.random() + 0.5, // 个体速度差异
                speed: Math.random() * 0.2 // 摆动速度
            };
            temp.push(t);
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        const instanced = mesh.current;
        if (!instanced) return;

        particles.forEach((particle, i) => {
            // 更新位置
            particle.y -= speed * particle.factor;

            if (type === 'snow') {
                // 雪花左右摇摆
                particle.x += Math.sin(state.clock.getElapsedTime() * particle.speed) * 0.02;
            }

            // 边界重置
            if (particle.y < -10) {
                particle.y = 10;
                particle.x = (Math.random() - 0.5) * 20;
            }

            dummy.position.set(particle.x, particle.y, particle.z);

            // 雨滴拉长，雪花旋转
            if (type === 'rain') {
                dummy.scale.set(0.05, 0.8, 0.05);
            } else {
                dummy.scale.set(0.2, 0.2, 0.2);
                dummy.rotation.x += 0.01;
                dummy.rotation.y += 0.01;
            }

            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        });
        instanced.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            {type === 'rain' ? <boxGeometry /> : <dodecahedronGeometry />}
            <meshStandardMaterial color={color} transparent opacity={0.8} />
        </instancedMesh>
    );
};

export const WeatherVisuals: React.FC<WeatherVisualsProps> = ({ weather }) => {
    return (
        <>
            <ambientLight intensity={0.5} />

            {/* ☀️ 晴天：温暖光照 + 浮尘 + 太阳光晕 */}
            {weather === 'sunny' && (
                <>
                    <directionalLight position={[10, 10, 5]} intensity={2} color="#ffaa00" />
                    <pointLight position={[-5, 5, -5]} color="orange" intensity={1.5} />
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                        <Sparkles count={50} scale={12} size={6} speed={0.4} opacity={0.5} color="#ffd700" />
                    </Float>
                    {/* 模拟太阳 */}
                    <mesh position={[4, 4, -5]}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
                    </mesh>
                </>
            )}

            {/* 🌧️ 雨天：冷色光 + 雨滴 + 乌云 */}
            {weather === 'rainy' && (
                <>
                    <directionalLight position={[0, 10, 0]} intensity={0.5} color="#aaccff" />
                    <Cloud position={[-4, 2, -5]} opacity={0.5} segments={10} bounds={[10, 2, 2]} color="#334455" />
                    <Particles count={300} type="rain" speed={0.4} color="#88ccff" />
                </>
            )}

            {/* ❄️ 雪天：柔光 + 雪花 + 星星 */}
            {weather === 'snowy' && (
                <>
                    <pointLight position={[0, 5, 0]} intensity={0.8} color="#ffffff" />
                    <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
                    <Particles count={150} type="snow" speed={0.05} color="white" />
                </>
            )}

            {/* 🍃 风天：湍流 + 快速移动的云 */}
            {weather === 'windy' && (
                <>
                    <directionalLight position={[-5, 5, 0]} intensity={1} color="#ffeecc" />
                    <Cloud position={[0, 0, -10]} speed={2} opacity={0.7} color="#666" />
                    <Cloud position={[5, -2, -5]} speed={1.5} opacity={0.5} color="#888" />
                    {/* 模拟飞叶/尘土 */}
                    <Sparkles count={100} scale={[20, 10, 10]} size={8} speed={5} color="#aaddbb" opacity={0.7} noise={1} />
                </>
            )}
        </>
    );
};