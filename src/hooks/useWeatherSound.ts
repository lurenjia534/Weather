import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'windy';

export const useWeatherSound = (weather: WeatherType) => {
    const [isStarted, setIsStarted] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // 保存 Tone.js 的对象的引用，防止重渲染丢失
    const synths = useRef<any>({});
    const loops = useRef<any>([]);
    const noise = useRef<Tone.Noise | null>(null);

    // 初始化音频引擎
    const initAudio = async () => {
        await Tone.start();
        setIsStarted(true);
        Tone.Transport.start();
        setupInstruments();
    };

    const setupInstruments = () => {
        // 1. 晴天：温暖的合成器 (AMSynth)
        synths.current.sunny = new Tone.AMSynth({
            harmonicity: 2.5,
            oscillator: { type: 'fatsawtooth' },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.2, release: 1.5 },
        }).toDestination();
        synths.current.sunny.volume.value = -12;

        // 2. 雨天：忧郁电钢琴 (PolySynth)
        synths.current.rainy = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 2 },
        }).toDestination();
        // 添加混响
        const reverb = new Tone.Reverb(2).toDestination();
        synths.current.rainy.connect(reverb);
        synths.current.rainy.volume.value = -10;

        // 3. 雪天：空灵 (DuoSynth)
        synths.current.snowy = new Tone.DuoSynth({
            vibratoAmount: 0.5,
            vibratoRate: 5,
            harmonicity: 1.5,
        }).toDestination();
        const delay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
        synths.current.snowy.connect(delay);
        synths.current.snowy.volume.value = -15;

        // 4. 环境噪音 (风/雨)
        noise.current = new Tone.Noise("pink").toDestination();
        const autoFilter = new Tone.AutoFilter("4n").connect(Tone.Destination);
        noise.current.connect(autoFilter);
        autoFilter.start();
        noise.current.volume.value = -Infinity; // 初始静音
        noise.current.start();
    };

    // 监听天气变化，切换音乐模式
    useEffect(() => {
        if (!isStarted) return;

        // 清除旧的循环
        loops.current.forEach((loop: any) => loop.dispose());
        loops.current = [];

        // 重置噪音
        if (noise.current) noise.current.volume.rampTo(-Infinity, 1);

        // 定义音阶
        const cMajor = ['C4', 'E4', 'G4', 'B4', 'D5'];
        const aMinor = ['A3', 'C4', 'E4', 'A4', 'B4'];
        const eHollow = ['E5', 'B5', 'D6', 'F#6'];

        // 创建新的 Loop
        let newLoop;

        switch (weather) {
            case 'sunny':
                newLoop = new Tone.Loop((time) => {
                    const note = cMajor[Math.floor(Math.random() * cMajor.length)];
                    synths.current.sunny.triggerAttackRelease(note, '2n', time);
                }, '1n'); // 慢速
                break;

            case 'rainy':
                // 雨声噪音
                if (noise.current) {
                    noise.current.type = 'brown';
                    noise.current.volume.rampTo(-10, 2);
                }
                newLoop = new Tone.Loop((time) => {
                    if (Math.random() > 0.4) {
                        const note = aMinor[Math.floor(Math.random() * aMinor.length)];
                        synths.current.rainy.triggerAttackRelease([note], '4n', time);
                    }
                }, '4n');
                break;

            case 'snowy':
                newLoop = new Tone.Loop((time) => {
                    if (Math.random() > 0.6) {
                        const note = eHollow[Math.floor(Math.random() * eHollow.length)];
                        synths.current.snowy.triggerAttackRelease(note, '1n', time);
                    }
                }, '2n');
                break;

            case 'windy':
                // 主要是风声
                if (noise.current) {
                    noise.current.type = 'pink';
                    noise.current.volume.rampTo(-5, 3);
                }
                // 偶尔的低音
                newLoop = new Tone.Loop((time) => {
                    if(Math.random() > 0.8) {
                        synths.current.snowy.triggerAttackRelease("D3", "8n", time); // 复用 synth
                    }
                }, "4n");
                break;
        }

        if (newLoop) {
            newLoop.start(0);
            loops.current.push(newLoop);
        }

    }, [weather, isStarted]);

    // 静音控制
    useEffect(() => {
        Tone.Destination.mute = isMuted;
    }, [isMuted]);

    return { initAudio, isStarted, isMuted, setIsMuted };
};