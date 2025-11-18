'use client';

import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, CloudRain, Snowflake, Wind, Volume2, VolumeX, Play } from 'lucide-react';
import clsx from 'clsx';
import { WeatherVisuals } from '@/components/WeatherVisuals';
import { useWeatherSound } from '@/hooks/useWeatherSound';

type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'windy';

export default function WeatherCardPage() {
    const [weather, setWeather] = useState<WeatherType>('sunny');
    const { initAudio, isStarted, isMuted, setIsMuted } = useWeatherSound(weather);

    // 背景渐变映射
    const bgGradients = {
        sunny: 'from-blue-400 to-orange-300',
        rainy: 'from-slate-800 to-slate-600',
        snowy: 'from-slate-900 to-blue-900',
        windy: 'from-teal-700 to-stone-600',
    };

    // 温度数据映射
    const weatherData = {
        sunny: { temp: '26°', label: 'Sunny', desc: 'Warm Breeze' },
        rainy: { temp: '18°', label: 'Rainy', desc: 'Heavy Showers' },
        snowy: { temp: '-4°', label: 'Snowy', desc: 'Winter Night' },
        windy: { temp: '14°', label: 'Windy', desc: 'Strong Gusts' },
    };

    return (
        <div className={clsx(
            "w-screen h-screen flex items-center justify-center transition-all duration-1000 bg-gradient-to-br",
            bgGradients[weather]
        )}>

            {/* 主卡片容器 */}
            <motion.div
                layout
                className="relative w-[380px] h-[640px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-xl bg-black/10"
            >

                {/* 3D 场景层 (Canvas) */}
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                        <Suspense fallback={null}>
                            <WeatherVisuals weather={weather} />
                        </Suspense>
                    </Canvas>
                </div>

                {/* 启动音频的遮罩层 (浏览器要求) */}
                {!isStarted && (
                    <div
                        onClick={initAudio}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer text-white hover:bg-black/50 transition-colors"
                    >
                        <div className="p-4 rounded-full bg-white/10 mb-4 animate-pulse">
                            <Play size={48} fill="currentColor" />
                        </div>
                        <p className="text-lg font-light tracking-wider">点击开启沉浸体验</p>
                    </div>
                )}

                {/* UI 层 */}
                <div className="relative z-10 h-full flex flex-col justify-between p-8 pointer-events-none">

                    {/* 顶部信息区 */}
                    <div className="text-white drop-shadow-lg">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={weather}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h1 className="text-7xl font-thin tracking-tighter">{weatherData[weather].temp}</h1>
                                <div className="mt-2">
                                    <p className="text-2xl font-medium">{weatherData[weather].label}</p>
                                    <p className="text-sm opacity-80 font-light uppercase tracking-widest">{weatherData[weather].desc}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* 底部控制区 (恢复 pointer-events) */}
                    <div className="pointer-events-auto">

                        {/* 天气切换器 */}
                        <div className="flex justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl p-2 mb-4 border border-white/10">
                            {(['sunny', 'rainy', 'snowy', 'windy'] as WeatherType[]).map((w) => (
                                <button
                                    key={w}
                                    onClick={() => setWeather(w)}
                                    className={clsx(
                                        "p-3 rounded-xl transition-all duration-300",
                                        weather === w ? "bg-white text-black scale-110 shadow-lg" : "text-white/70 hover:bg-white/10"
                                    )}
                                >
                                    {w === 'sunny' && <Sun size={20} />}
                                    {w === 'rainy' && <CloudRain size={20} />}
                                    {w === 'snowy' && <Snowflake size={20} />}
                                    {w === 'windy' && <Wind size={20} />}
                                </button>
                            ))}
                        </div>

                        {/* 音频控制 */}
                        <div className="flex justify-between items-center px-2">
                            <span className="text-xs text-white/50 uppercase tracking-wider">Procedural Audio</span>
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}