// components/AudioEngine.tsx
import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useWeatherStore, WeatherType } from '@/store/weatherStore';

// 🎵 Music theory helpers
const SCALES = {
    sunny: ["C4", "E4", "G4", "B4", "D5", "E5"], // C Major Pentatonic (warm, radiant)
    rainy: ["A3", "C4", "E4", "G4", "B4", "E5"], // A Minor (melancholic, introspective)
    snowy: ["E4", "F#4", "G#4", "A#4", "C5", "D5"], // Whole Tone / Lydian-ish (airy, dreamy)
    windy: ["D3", "A3", "D4", "F4", "A4", "D5"], // D Minor (tense, serious)
};

export const AudioEngine = () => {
    const { weather, isAudioStarted, isMuted } = useWeatherStore();

    // Store the entire audio graph in a ref so React renders stay pure.
    const system = useRef<{
        master: { reverb: Tone.Reverb; limiter: Tone.Limiter };
        synths: {
            pad: Tone.PolySynth;      // Primary pad voice
            pluck: Tone.PolySynth;    // Accent plucks (raindrops/snowflakes)
            birds: Tone.Synth;        // Bird-call emulation
            thunder: Tone.MembraneSynth; // Thunder/rumbles
        };
        ambience: {
            wind: Tone.Noise;         // Wind noise source
            windFilter: Tone.Filter;  // Wind sculpting filter
            rain: Tone.Noise;         // Rain noise source
            rainFilter: Tone.Filter;
            lfo: Tone.LFO;            // LFO that modulates the gusts
        };
        loop: Tone.Loop | null;
    } | null>(null);

    // 1. Initialize the audio system and build the routing graph.
    useEffect(() => {
        if (!isAudioStarted) return;

        const initAudio = async () => {
            await Tone.start();
            Tone.context.lookAhead = 0.1; // Reduce latency

            // --- Master bus / global FX ---
            // Reverb keeps everything inside a wide open landscape.
            const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
            await reverb.generate();
            // Limiter protects from clipping spikes.
            const limiter = new Tone.Limiter(-2).connect(reverb);

            // --- Ambience bed ---
            // Wind: pink noise + low-pass filtering + LFO modulation.
            const wind = new Tone.Noise("pink").start();
            const windFilter = new Tone.Filter(400, "lowpass").connect(limiter);
            wind.connect(windFilter);
            const lfo = new Tone.LFO(0.1, 200, 800).start(); // 0.1 Hz slow gusts
            lfo.connect(windFilter.frequency);

            // Rain: brown noise (darker timbre).
            const rain = new Tone.Noise("brown").start();
            const rainFilter = new Tone.Filter(800, "lowpass").connect(limiter);
            rain.connect(rainFilter);

            // --- Synth voices ---
            // Pad: warm FM blanket.
            const pad = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 3,
                modulationIndex: 10,
                oscillator: { type: "sine" },
                envelope: { attack: 1, decay: 2, sustain: 0.5, release: 3 },
                modulation: { type: "square" },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
            }).connect(limiter);
            pad.volume.value = -15;

            // Pluck: short accents for rain/snow crystals.
            const pluck = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 }
            }).connect(reverb); // Straight to reverb for a distant shimmer.

            // Birds: bright FM chirps.
            const birds = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).connect(reverb);
            birds.volume.value = -12;

            // Thunder: deep rumble.
            const thunder = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 4,
                oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 3 }
            }).connect(limiter);

            // Start with ambience muted.
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
            // Basic cleanup; a production build might require stricter disposal.
        };
    }, [isAudioStarted]);

    // 2. Core logic: generative music + FX scheduling.
    useEffect(() => {
        if (!system.current || !isAudioStarted) return;

        const { synths, ambience } = system.current;
        const rampTime = 3; // Smooth transitions over 3 seconds.

        // Guard rail: some browsers lock AudioParam ranges before the context is ready.
        // When that happens the available range becomes [0, 0], so ramping throws RangeError.
        type FrequencyParam = Tone.Param<"frequency"> | Tone.Signal<"frequency">;
        const safeRamp = (param: FrequencyParam, target: number) => {
            const { minValue, maxValue } = param;
            if (!Number.isFinite(target)) return;

            // If the range collapsed (min=max), set the closest value directly.
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
                // Fall back to direct writes if ramping still complains.
                param.cancelScheduledValues?.(0);
                const safeValue = Math.min(maxValue, Math.max(minValue, target));
                param.setValueAtTime(safeValue, 0);
            }
        };

        // --- Step A: ambience mixing ---
        const updateAmbience = () => {
            switch (weather) {
                case 'sunny':
                    ambience.wind.volume.rampTo(-25, rampTime); // Gentle breeze
                    safeRamp(ambience.lfo.frequency, 0.1); // Calm movement
                    ambience.rain.volume.rampTo(-Infinity, rampTime);
                    safeRamp(ambience.windFilter.frequency, 600);
                    break;
                case 'rainy':
                    ambience.wind.volume.rampTo(-20, rampTime);
                    ambience.rain.volume.rampTo(-8, rampTime); // Heavy rain
                    safeRamp(ambience.rainFilter.frequency, 1200); // Brighter tone for downpour
                    break;
                case 'snowy':
                    ambience.wind.volume.rampTo(-15, rampTime); // Colder, stronger wind
                    safeRamp(ambience.lfo.frequency, 0.2);
                    safeRamp(ambience.windFilter.frequency, 900); // Sharper high-end wind
                    ambience.rain.volume.rampTo(-Infinity, rampTime);
                    break;
                case 'windy':
                    ambience.wind.volume.rampTo(-5, rampTime); // Intense wind
                    safeRamp(ambience.lfo.frequency, 1); // Fast gusts
                    ambience.lfo.min = 300;
                    ambience.lfo.max = 2000; // Wide whistle range
                    ambience.rain.volume.rampTo(-Infinity, rampTime);
                    break;
            }
        };

        // --- Step B: generative sequencer ---
        // Dispose old loop
        if (system.current.loop) system.current.loop.dispose();

        // Create the new rhythm logic
        system.current.loop = new Tone.Loop((time) => {
            // 1. Base pad chord - high chance every ~4 seconds.
            if (Math.random() > 0.6) {
                // Pick 2-3 notes from the current scale to build a chord.
                const scale = SCALES[weather];
                const chord = [
                    scale[Math.floor(Math.random() * scale.length)],
                    scale[Math.floor(Math.random() * scale.length)]
                ];
                // Scatter trigger times to keep it human.
                synths.pad.triggerAttackRelease(chord, "2n", time + Math.random() * 0.5);
            }

            // 2. SFX layer - weather-specific events.
            const chance = Math.random();

            if (weather === 'sunny' && chance > 0.85) {
                // Bird chirp: fast frequency glides.
                synths.birds.triggerAttackRelease("C6", "32n", time + Math.random());
                synths.birds.frequency.rampTo("E6", 0.1);
            }

            if (weather === 'rainy') {
                // Raindrops: high-frequency sparkles.
                if (chance > 0.3) {
                    const note = SCALES.rainy[Math.floor(Math.random() * SCALES.rainy.length)];
                    // Random velocity for liveliness.
                    synths.pluck.triggerAttackRelease(note, "16n", time + Math.random(), Math.random() * 0.5 + 0.2);
                }
                // Thunder hits: rare.
                if (chance > 0.98) {
                    synths.thunder.triggerAttackRelease("C1", "1n", time);
                }
            }

            if (weather === 'snowy' && chance > 0.7) {
                // Ice crystals: bright stutters with delay.
                const note = SCALES.snowy[Math.floor(Math.random() * SCALES.snowy.length)];
                // Shift one octave up.
                const highNote = Tone.Frequency(note).transpose(12).toNote();
                synths.pluck.triggerAttackRelease(highNote, "8n", time + Math.random());
            }

        }, "4n").start(0); // Evaluate every quarter note.

        updateAmbience();

    }, [weather, isAudioStarted]);

    // Hard mute when the UI toggles audio.
    useEffect(() => {
        Tone.Destination.mute = isMuted;
    }, [isMuted]);

    return null;
};
