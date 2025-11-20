// store/weatherStore.ts
import { create } from 'zustand';

export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'windy';

interface WeatherState {
    weather: WeatherType;
    isAudioStarted: boolean;
    isMuted: boolean;
    setWeather: (w: WeatherType) => void;
    setAudioStarted: (s: boolean) => void;
    toggleMute: () => void;
}

/**
 * Central Zustand store powering the Gemini 3 weather capsule.
 */

export const useWeatherStore = create<WeatherState>((set) => ({
    weather: 'sunny',
    isAudioStarted: false,
    isMuted: false,
    setWeather: (weather) => set({ weather }),
    setAudioStarted: (isAudioStarted) => set({ isAudioStarted }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
