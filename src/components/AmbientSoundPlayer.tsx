import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, Sparkles, CloudRain, Wind, CloudLightning, Sun, Snowflake } from 'lucide-react';

interface AmbientSoundPlayerProps {
  weatherCondition?: string;
  precipMm?: number;
  windKph?: number;
  tempC?: number;
}

export const AmbientSoundPlayer: React.FC<AmbientSoundPlayerProps> = ({
  weatherCondition = '',
  precipMm = 0,
  windKph = 0,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5); // 0.0 to 1.0
  const [soundMode, setSoundMode] = useState<'auto' | 'rain' | 'wind' | 'thunder' | 'sunny' | 'snow'>('auto');
  const [userInteracted, setUserInteracted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundNodesRef = useRef<any[]>([]);
  const timerRef = useRef<any>(null);

  // Determine effective sound type based on weather or manual override
  const getActiveSoundType = (): 'rain' | 'wind' | 'thunder' | 'sunny' | 'snow' => {
    if (soundMode !== 'auto') return soundMode;

    const cond = weatherCondition.toLowerCase();
    if (cond.includes('thunder') || cond.includes('storm')) return 'thunder';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || precipMm > 0.2) return 'rain';
    if (cond.includes('snow') || cond.includes('sleet') || cond.includes('ice') || cond.includes('flurry')) return 'snow';
    if (windKph > 22 || cond.includes('wind') || cond.includes('gale') || cond.includes('blizzard')) return 'wind';
    return 'sunny';
  };

  const activeSoundType = getActiveSoundType();

  // Initialize Audio Context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Stop current active synthesizers
  const stopAllNodes = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    soundNodesRef.current.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {
        // ignore disconnect errors
      }
    });
    soundNodesRef.current = [];
  };

  // Synthesize Procedural Sounds
  const startSound = (type: 'rain' | 'wind' | 'thunder' | 'sunny' | 'snow') => {
    const ctx = getAudioContext();
    if (!ctx) return;

    stopAllNodes();

    // Create Master Gain if needed
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.connect(ctx.destination);
    }
    masterGainRef.current.gain.setValueAtTime(volume, ctx.currentTime);

    const masterGain = masterGainRef.current;

    if (type === 'rain' || type === 'thunder') {
      // 1. Rain Noise Buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      
      // Pink Noise Generation for natural rain patter
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.08; // scale down
        b6 = white * 0.115926;
      }

      const whiteNoiseSource = ctx.createBufferSource();
      whiteNoiseSource.buffer = noiseBuffer;
      whiteNoiseSource.loop = true;

      // Lowpass filter for soft rain
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(type === 'thunder' ? 1200 : 900, ctx.currentTime);

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.35, ctx.currentTime);

      whiteNoiseSource.connect(lowpass);
      lowpass.connect(rainGain);
      rainGain.connect(masterGain);
      whiteNoiseSource.start();

      soundNodesRef.current.push(whiteNoiseSource, lowpass, rainGain);

      // Thunder rumbles if thunder type
      if (type === 'thunder') {
        const scheduleThunder = () => {
          if (!isPlaying) return;
          const osc = ctx.createOscillator();
          const thunderGain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(60, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 2.5);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(150, ctx.currentTime);

          thunderGain.gain.setValueAtTime(0.01, ctx.currentTime);
          thunderGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3);
          thunderGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);

          osc.connect(filter);
          filter.connect(thunderGain);
          thunderGain.connect(masterGain);

          osc.start();
          osc.stop(ctx.currentTime + 3);
        };

        // Trigger thunder rumble every 12-20 seconds
        timerRef.current = setInterval(scheduleThunder, 14000);
      }
    } else if (type === 'wind') {
      // Procedural Wind Whistle (Filtered Noise + LFO)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Bandpass Filter for wind whistle pitch
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(450, ctx.currentTime);
      bandpass.Q.setValueAtTime(3.0, ctx.currentTime);

      // LFO to simulate wind gusting dynamics
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.25, ctx.currentTime); // 0.25 Hz slow gust wave

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.4, ctx.currentTime);

      noiseSource.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(masterGain);

      noiseSource.start();
      lfo.start();

      soundNodesRef.current.push(noiseSource, bandpass, lfo, lfoGain, windGain);
    } else if (type === 'snow') {
      // Soft Snow Whisper (Ultra soft high-cut white noise)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.05;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(400, ctx.currentTime);

      const snowGain = ctx.createGain();
      snowGain.gain.setValueAtTime(0.25, ctx.currentTime);

      noiseSource.connect(lowpass);
      lowpass.connect(snowGain);
      snowGain.connect(masterGain);

      noiseSource.start();
      soundNodesRef.current.push(noiseSource, lowpass, snowGain);
    } else {
      // Sunny / Clear Ambient Warm Harmony Pad
      const createOsc = (freq: number, gainVal: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(gainVal, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        osc.start();

        soundNodesRef.current.push(osc, g, filter);
      };

      // Warm ambient fifth chord (A3 = 220Hz, E4 = 330Hz, C#4 = 277Hz)
      createOsc(220, 0.12);
      createOsc(330, 0.08);
      createOsc(277.18, 0.05);

      // Subtle breeze modulation
      const breezeOsc = ctx.createOscillator();
      const breezeGain = ctx.createGain();
      breezeOsc.frequency.setValueAtTime(0.1, ctx.currentTime);
      breezeGain.gain.setValueAtTime(0.04, ctx.currentTime);
      breezeOsc.connect(breezeGain);
      breezeGain.connect(masterGain.gain);
      breezeOsc.start();

      soundNodesRef.current.push(breezeOsc, breezeGain);
    }
  };

  // Handle Play / Pause / Sound Type Change
  useEffect(() => {
    if (isPlaying && userInteracted) {
      startSound(activeSoundType);
    } else {
      stopAllNodes();
    }
    return () => stopAllNodes();
  }, [isPlaying, activeSoundType, userInteracted]);

  // Handle Volume Change
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  const togglePlay = () => {
    setUserInteracted(true);
    if (!isPlaying) {
      setIsPlaying(true);
      startSound(activeSoundType);
    } else {
      setIsPlaying(false);
      stopAllNodes();
    }
  };

  const getSoundIcon = () => {
    switch (activeSoundType) {
      case 'rain': return <CloudRain size={16} className="text-blue-300" />;
      case 'thunder': return <CloudLightning size={16} className="text-purple-300" />;
      case 'wind': return <Wind size={16} className="text-cyan-300" />;
      case 'snow': return <Snowflake size={16} className="text-indigo-200" />;
      default: return <Sun size={16} className="text-amber-300" />;
    }
  };

  const getSoundLabel = () => {
    switch (activeSoundType) {
      case 'rain': return 'Light Rain Patter';
      case 'thunder': return 'Thunderstorm Rumbles';
      case 'wind': return 'Wind Whistle';
      case 'snow': return 'Snow Whisper';
      default: return 'Sunny Ambience';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/80 border border-white/15 p-2.5 sm:p-3 rounded-2xl backdrop-blur-xl shadow-xl text-white">
      {/* Sound Toggle Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-md border ${
          isPlaying
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-blue-500/20 scale-102'
            : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white'
        }`}
      >
        {isPlaying ? <Volume2 size={16} className="animate-pulse text-cyan-300" /> : <VolumeX size={16} className="text-white/60" />}
        <span>{isPlaying ? 'Ambient Audio ON' : 'Enable Ambient Sound'}</span>
      </button>

      {/* Active Sound Indicator Pill */}
      {isPlaying && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-medium">
          {getSoundIcon()}
          <span className="text-indigo-100">{getSoundLabel()}</span>
        </div>
      )}

      {/* Manual Sound Preset Switcher */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
        {(['auto', 'rain', 'wind', 'thunder', 'sunny', 'snow'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setUserInteracted(true);
              setSoundMode(mode);
              if (!isPlaying) setIsPlaying(true);
            }}
            className={`px-2 py-1 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
              soundMode === mode
                ? 'bg-indigo-500/40 text-white border border-indigo-400/40 font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Volume Slider */}
      {isPlaying && (
        <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px]">
          <Volume2 size={14} className="text-white/50 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-400"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
          <span className="text-[10px] text-white/60 font-semibold w-6 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
