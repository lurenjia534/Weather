'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, CloudRain, Snowflake, Wind, Volume2, VolumeX, PlayCircle, Droplets, Thermometer, Gauge } from 'lucide-react';
import clsx from 'clsx';
import { useWeatherStore, WeatherType } from '@/store/weatherStore';
import { Scene } from '@/components/Scene';
import { AudioEngine } from '@/components/AudioEngine';

// Gemini 3 inspired static data mapping
const WEATHER_INFO = {
    sunny: {
        temp: '28°',
        name: 'Sunny',
        desc: 'Golden Hour',
        bg: 'from-orange-400 via-amber-200 to-rose-300',
        details: { humidity: '45%', wind: '12 km/h', precip: '0%' }
    },
    rainy: {
        temp: '16°',
        name: 'Rainy',
        desc: 'Thunderstorm',
        bg: 'from-slate-800 via-gray-700 to-slate-900',
        details: { humidity: '82%', wind: '18 km/h', precip: '90%' }
    },
    snowy: {
        temp: '-5°',
        name: 'Snowy',
        desc: 'Silent Night',
        bg: 'from-indigo-900 via-slate-800 to-blue-900',
        details: { humidity: '60%', wind: '10 km/h', precip: '40%' }
    },
    windy: {
        temp: '12°',
        name: 'Windy',
        desc: 'High Velocity',
        bg: 'from-teal-800 via-emerald-900 to-stone-800',
        details: { humidity: '55%', wind: '32 km/h', precip: '10%' }
    },
};

export default function Page() {
    const { weather, isAudioStarted, isMuted, setWeather, setAudioStarted, toggleMute } = useWeatherStore();

    // Mouse parallax effect
    const cardRef = useRef<HTMLDivElement>(null);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        cardRef.current.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) {
            cardRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
        }
    };

    return (
        <div className={clsx(
            "w-screen h-screen flex items-center justify-center overflow-hidden transition-colors duration-1000 bg-gradient-to-br",
            WEATHER_INFO[weather].bg
        )}>
            <AudioEngine />

            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative w-[380px] h-[720px] rounded-[48px] shadow-2xl overflow-hidden border border-white/20 bg-black/10 backdrop-blur-xl ring-1 ring-white/10"
            >
                {/* 3D Canvas Layer */}
                <div className="absolute inset-0 z-0">
                    <Canvas shadows camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 2]}>
                        <Suspense fallback={null}>
                            <Scene />
                        </Suspense>
                    </Canvas>
                </div>

                {/* Start Overlay */}
                {!isAudioStarted && (
                    <div
                        onClick={() => setAudioStarted(true)}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md cursor-pointer text-white group transition-all duration-500"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center"
                        >
                            <PlayCircle size={72} strokeWidth={1} className="mb-6 group-hover:scale-110 transition-transform duration-300" />
                            <p className="tracking-[0.4em] text-xs font-medium uppercase opacity-80 group-hover:opacity-100 transition-opacity">Enter Gemini 3 Experience</p>
                        </motion.div>
                    </div>
                )}

                {/* Main UI Layer */}
                <div className="relative z-10 flex flex-col justify-between h-full p-8 text-white pointer-events-none">

                    {/* Header Section */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between opacity-70 mb-8">
                            <span className="text-xs font-medium tracking-widest uppercase">Gemini Station, USA</span>
                            <span className="text-xs font-medium tracking-widest uppercase">{new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={weather}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col"
                            >
                                <div className="flex items-start">
                                    <h1 className="text-[7rem] leading-none font-thin tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                                        {WEATHER_INFO[weather].temp}
                                    </h1>
                                </div>
                                <h2 className="text-3xl font-light mt-2 tracking-wide">{WEATHER_INFO[weather].name}</h2>
                                <p className="text-sm font-medium opacity-60 tracking-widest uppercase mt-1">{WEATHER_INFO[weather].desc}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex flex-col gap-6">

                        {/* Weather Details Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center border border-white/5">
                                <Droplets size={16} className="opacity-50 mb-2" />
                                <span className="text-xs font-medium">{WEATHER_INFO[weather].details.humidity}</span>
                                <span className="text-[10px] opacity-40 uppercase mt-1">Hum</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center border border-white/5">
                                <Wind size={16} className="opacity-50 mb-2" />
                                <span className="text-xs font-medium">{WEATHER_INFO[weather].details.wind}</span>
                                <span className="text-[10px] opacity-40 uppercase mt-1">Wind</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center border border-white/5">
                                <Gauge size={16} className="opacity-50 mb-2" />
                                <span className="text-xs font-medium">{WEATHER_INFO[weather].details.precip}</span>
                                <span className="text-[10px] opacity-40 uppercase mt-1">Precip</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-black/20 backdrop-blur-xl rounded-[32px] p-2 border border-white/10 pointer-events-auto">
                            <div className="flex items-center justify-between pl-4 pr-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">Mode</span>
                                <button
                                    onClick={toggleMute}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                                >
                                    {isMuted ? <VolumeX size={16} className="opacity-60" /> : <Volume2 size={16} className="opacity-60" />}
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {(['sunny', 'rainy', 'snowy', 'windy'] as WeatherType[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setWeather(t)}
                                        className={clsx(
                                            "relative group flex flex-col items-center justify-center aspect-square rounded-2xl transition-all duration-300",
                                            weather === t
                                                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                                : "bg-white/5 text-white hover:bg-white/10"
                                        )}
                                    >
                                        {t === 'sunny' && <Sun size={20} strokeWidth={1.5} />}
                                        {t === 'rainy' && <CloudRain size={20} strokeWidth={1.5} />}
                                        {t === 'snowy' && <Snowflake size={20} strokeWidth={1.5} />}
                                        {t === 'windy' && <Wind size={20} strokeWidth={1.5} />}

                                        {weather === t && (
                                            <motion.div
                                                layoutId="active-dot"
                                                className="absolute -bottom-1 w-1 h-1 bg-black rounded-full"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
