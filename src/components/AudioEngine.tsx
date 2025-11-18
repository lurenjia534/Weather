// components/AudioEngine.tsx
import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useWeatherStore, WeatherType } from '@/store/weatherStore';

// 🎵 音乐理论常量
const SCALES = {
    sunny: ["C4", "E4", "G4", "B4", "D5", "E5"], // C Major Pentatonic (温暖、明亮)
    rainy: ["A3", "C4", "E4", "G4", "B4", "E5"], // A Minor (忧郁、内省)
    snowy: ["E4", "F#4", "G#4", "A#4", "C5", "D5"], // Whole Tone / Lydian ish (空灵、梦幻)
    windy: ["D3", "A3", "D4", "F4", "A4", "D5"], // D Minor (紧张、严肃)
};

export const AudioEngine = () => {
    const { weather, isAudioStarted, isMuted } = useWeatherStore();

    // 使用 ref 存储整个音频系统的实例，保持 React 渲染纯净
    const system = useRef<{
        master: { reverb: Tone.Reverb; limiter: Tone.Limiter };
        synths: {
            pad: Tone.PolySynth;      // 主乐器
            pluck: Tone.PolySynth;    // 点缀乐器 (雨滴/雪花)
            birds: Tone.Synth;        // 鸟鸣模拟器
            thunder: Tone.MembraneSynth; // 雷声模拟器
        };
        ambience: {
            wind: Tone.Noise;         // 风声源
            windFilter: Tone.Filter;  // 风声滤波器
            rain: Tone.Noise;         // 雨声源
            rainFilter: Tone.Filter;
            lfo: Tone.LFO;            // 用于调制风力的 LFO
        };
        loop: Tone.Loop | null;
    } | null>(null);

    // 1. 初始化音频系统 (构建复杂的信号链路)
    useEffect(() => {
        if (!isAudioStarted) return;

        const initAudio = async () => {
            await Tone.start();
            Tone.context.lookAhead = 0.1; // 降低延迟

            // --- Master Bus (总线效果) ---
            // 混响让声音听起来像是在广阔的自然空间中
            const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
            await reverb.generate();
            // 限制器防止音量过大爆音
            const limiter = new Tone.Limiter(-2).connect(reverb);

            // --- Ambience (环境音层) ---
            // 风声：粉红噪音 + 低通滤波 + LFO 调制
            const wind = new Tone.Noise("pink").start();
            const windFilter = new Tone.Filter(400, "lowpass").connect(limiter);
            wind.connect(windFilter);
            const lfo = new Tone.LFO(0.1, 200, 800).start(); // 0.1Hz 的慢速阵风
            lfo.connect(windFilter.frequency);

            // 雨声：褐色噪音 (更低沉)
            const rain = new Tone.Noise("brown").start();
            const rainFilter = new Tone.Filter(800, "lowpass").connect(limiter);
            rain.connect(rainFilter);

            // --- Synths (乐器层) ---
            // Pad: 温暖的背景音 (FM 合成)
            const pad = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 3,
                modulationIndex: 10,
                oscillator: { type: "sine" },
                envelope: { attack: 1, decay: 2, sustain: 0.5, release: 3 },
                modulation: { type: "square" },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
            }).connect(limiter);
            pad.volume.value = -15;

            // Pluck: 模拟雨滴或冰晶 (短促的声音)
            const pluck = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 }
            }).connect(reverb); // 直接进混响，制造远距离感

            // Birds: 鸟鸣 (高频 FM)
            const birds = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).connect(reverb);
            birds.volume.value = -12;

            // Thunder: 雷声 (超低频震动)
            const thunder = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 4,
                oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 3 }
            }).connect(limiter);

            // 初始静音所有环境音
            wind.volume.value = -Infinity;
            rain.volume.value = -Infinity;

            system.current = {
                master: { reverb, limiter },
                synths: { pad, pluck, birds, thunder },
                ambience: { wind, windFilter, rain, rainFilter, lfo },
                loop: null
            };

            Tone.Transport.start();
        };

        initAudio();

        return () => {
            Tone.Transport.stop();
            // 简单的清理逻辑，实际项目中可能需要更严谨的 dispose
        };
    }, [isAudioStarted]);

    // 2. 核心逻辑：生成式音乐与音效调度
    useEffect(() => {
        if (!system.current || !isAudioStarted) return;

        const { synths, ambience } = system.current;
        const rampTime = 3; // 3秒平滑过渡

        // 柔性补丁：有些浏览器/环境在音频上下文未完全就绪时
        // AudioParam 的可用范围会被锁在 [0, 0]，直接 ramp 会抛 RangeError。
        type FrequencyParam = Tone.Param<"frequency"> | Tone.Signal<"frequency">;
        const safeRamp = (param: FrequencyParam, target: number) => {
            const { minValue, maxValue } = param;
            if (!Number.isFinite(target)) return;

            // 如果参数区间已被锁死（min=max），直接写入当前可用值，避免 ramp 抛错
            if (maxValue <= minValue) {
                param.cancelScheduledValues?.(0);
                const safeValue = Math.min(maxValue, Math.max(minValue, target));
                param.setValueAtTime(safeValue, 0);
                return;
            }

            const epsilon = minValue === 0 ? 1e-3 : 0;
            const clamped = Math.min(maxValue, Math.max(minValue + epsilon, target));

            try {
                param.rampTo(clamped, rampTime);
            } catch {
                // 若依然因范围问题抛错，降级为直接写值
                param.cancelScheduledValues?.(0);
                const safeValue = Math.min(maxValue, Math.max(minValue, target));
                param.setValueAtTime(safeValue, 0);
            }
        };

        // --- 步骤 A: 环境音混合 (Ambience Mixing) ---
        const updateAmbience = () => {
            switch (weather) {
                case 'sunny':
                    ambience.wind.volume.rampTo(-25, rampTime); // 微风
                    safeRamp(ambience.lfo.frequency, 0.1); // 平稳
                    ambience.rain.volume.rampTo(-Infinity, rampTime);
                    safeRamp(ambience.windFilter.frequency, 600);
                    break;
                case 'rainy':
                    ambience.wind.volume.rampTo(-20, rampTime);
                    ambience.rain.volume.rampTo(-8, rampTime); // 大雨
                    safeRamp(ambience.rainFilter.frequency, 1200); // 声音更亮（大雨）
                    break;
                case 'snowy':
                    ambience.wind.volume.rampTo(-15, rampTime); // 寒风较大
                    safeRamp(ambience.lfo.frequency, 0.2);
                    safeRamp(ambience.windFilter.frequency, 900); // 高频风声 (尖锐)
                    ambience.rain.volume.rampTo(-Infinity, rampTime);
                    break;
                case 'windy':
                    ambience.wind.volume.rampTo(-5, rampTime); // 狂风
                    safeRamp(ambience.lfo.frequency, 1); // 快速阵风
                    ambience.lfo.min = 300;
                    ambience.lfo.max = 2000; // 啸叫范围大
                    ambience.rain.volume.rampTo(-Infinity, rampTime);
                    break;
            }
        };

        // --- 步骤 B: 生成式音序器 (Generative Sequencer) ---
        // 清除旧 Loop
        if (system.current.loop) system.current.loop.dispose();

        // 创建新的节奏逻辑
        system.current.loop = new Tone.Loop((time) => {
            // 1. 基础和弦 (Pad) - 每 4 秒大概率触发
            if (Math.random() > 0.6) {
                // 从当前天气的音阶中随机选 2-3 个音组成和弦
                const scale = SCALES[weather];
                const chord = [
                    scale[Math.floor(Math.random() * scale.length)],
                    scale[Math.floor(Math.random() * scale.length)]
                ];
                // 错落触发，增加人性化
                synths.pad.triggerAttackRelease(chord, "2n", time + Math.random() * 0.5);
            }

            // 2. 特效音 (SFX) - 基于天气的特殊事件
            const chance = Math.random();

            if (weather === 'sunny' && chance > 0.85) {
                // 🐦 鸟鸣: 快速的频率滑音
                synths.birds.triggerAttackRelease("C6", "32n", time + Math.random());
                synths.birds.frequency.rampTo("E6", 0.1);
            }

            if (weather === 'rainy') {
                // 💧 雨滴: 高频随机点缀
                if (chance > 0.3) {
                    const note = SCALES.rainy[Math.floor(Math.random() * SCALES.rainy.length)];
                    // 随机力度 (velocity)
                    synths.pluck.triggerAttackRelease(note, "16n", time + Math.random(), Math.random() * 0.5 + 0.2);
                }
                // ⛈️ 雷声: 极低概率
                if (chance > 0.98) {
                    synths.thunder.triggerAttackRelease("C1", "1n", time);
                }
            }

            if (weather === 'snowy' && chance > 0.7) {
                // ❄️ 冰晶: 极高频、带延迟的清脆声音
                const note = SCALES.snowy[Math.floor(Math.random() * SCALES.snowy.length)];
                // 提高八度
                const highNote = Tone.Frequency(note).transpose(12).toNote();
                synths.pluck.triggerAttackRelease(highNote, "8n", time + Math.random());
            }

        }, "4n").start(0); // 每四分音符检查一次

        updateAmbience();

    }, [weather, isAudioStarted]);

    // 静音
    useEffect(() => {
        Tone.Destination.mute = isMuted;
    }, [isMuted]);

    return null;
};
