'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, CloudRain, Snowflake, Wind, Volume2, VolumeX, PlayCircle } from 'lucide-react';
import clsx from 'clsx';
import { useWeatherStore, WeatherType } from '@/store/weatherStore';
import { Scene } from '@/components/Scene';
import { AudioEngine } from '@/components/AudioEngine';

// 静态数据映射
const WEATHER_INFO = {
    sunny: { temp: '28°', name: 'Sunny', desc: 'Golden Hour', bg: 'from-orange-400 to-rose-400' },
    rainy: { temp: '16°', name: 'Rainy', desc: 'Thunderstorm', bg: 'from-slate-800 to-gray-900' },
    snowy: { temp: '-5°', name: 'Snowy', desc: 'Silent Night', bg: 'from-indigo-900 to-slate-800' },
    windy: { temp: '12°', name: 'Windy', desc: 'High Velocity', bg: 'from-teal-800 to-stone-800' },
};

export default function Page() {
    const { weather, isAudioStarted, isMuted, setWeather, setAudioStarted, toggleMute } = useWeatherStore();

    // 鼠标视差效果 (简单的 CSS 变量传递)
    const cardRef = useRef<HTMLDivElement>(null);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        cardRef.current.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    };

    return (
        <div className={clsx(
            "w-screen h-screen flex items-center justify-center overflow-hidden transition-colors duration-1000 bg-gradient-to-br",
            WEATHER_INFO[weather].bg
        )}>
            {/* 音频引擎 (无 UI) */}
            <AudioEngine />

            {/* 主卡片 */}
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { if(cardRef.current) cardRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)'; }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-[400px] h-[700px] rounded-[40px] shadow-2xl overflow-hidden border border-white/20 bg-black/20 backdrop-blur-sm transition-transform duration-200 ease-out"
            >
                {/* 3D 画布层 */}
                <div className="absolute inset-0 z-0">
                    <Canvas shadows camera={{ position: [0, 0, 7], fov: 50 }} dpr={[1, 2]}>
                        <Suspense fallback={null}>
                            <Scene />
                        </Suspense>
                    </Canvas>
                </div>

                {/* 启动遮罩 (Chrome 自动播放限制) */}
                {!isAudioStarted && (
                    <div
                        onClick={() => setAudioStarted(true)}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md cursor-pointer text-white group transition-all"
                    >
                        <PlayCircle size={64} className="mb-4 group-hover:scale-110 transition-transform" />
                        <p className="tracking-[0.3em] text-sm font-light uppercase">Initialize Experience</p>
                    </div>
                )}

                {/* UI 覆盖层 */}
                <div className="relative z-10 flex flex-col justify-between h-full p-8 text-white pointer-events-none">

                    {/* 顶部：天气信息 */}
                    <div className="mt-4 drop-shadow-md">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={weather}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.4 }}
                            >
                                <h1 className="text-8xl font-thin tracking-tighter">{WEATHER_INFO[weather].temp}</h1>
                                <h2 className="text-3xl font-medium mt-2">{WEATHER_INFO[weather].name}</h2>
                                <div className="h-1 w-12 bg-white/50 my-3 rounded-full" />
                                <p className="text-sm font-light opacity-80 tracking-widest uppercase">{WEATHER_INFO[weather].desc}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* 底部：交互控制 */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 border border-white/10 pointer-events-auto">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] uppercase tracking-widest opacity-60">Select Mode</span>
                            <button onClick={toggleMute} className="opacity-80 hover:opacity-100 transition-opacity">
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {(['sunny', 'rainy', 'snowy', 'windy'] as WeatherType[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setWeather(t)}
                                    className={clsx(
                                        "flex items-center justify-center aspect-square rounded-2xl transition-all duration-300",
                                        weather === t
                                            ? "bg-white text-black shadow-lg scale-105"
                                            : "bg-white/5 text-white hover:bg-white/20"
                                    )}
                                >
                                    {t === 'sunny' && <Sun size={22} />}
                                    {t === 'rainy' && <CloudRain size={22} />}
                                    {t === 'snowy' && <Snowflake size={22} />}
                                    {t === 'windy' && <Wind size={22} />}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}