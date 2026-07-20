import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, SearchX, MapPin, CloudRain, Wind, AlertTriangle, Sun, Moon, Droplets, CloudLightning, Snowflake, Cloud } from 'lucide-react';

interface HeroCanvasProps {
  weatherData?: any; 
  activeContext?: string;
  loading?: boolean;
  onLocate?: () => void;
  userName?: string;
}

export const HeroCanvas: React.FC<HeroCanvasProps> = ({ weatherData, activeContext, loading, onLocate, userName }) => {
  // Logic to determine weather category
  const condition = weatherData?.current?.condition?.text?.toLowerCase() || 'clear';
  const precip = weatherData?.current?.precip_mm || 0;
  let category = 'clear';
  
  if ((condition.includes('rain') || condition.includes('drizzle')) && precip > 0) {
    category = 'rain';
  } else if ((condition.includes('rain') || condition.includes('drizzle')) && precip === 0) {
    category = 'overcast';
  } else if (condition.includes('snow') || condition.includes('ice') || condition.includes('blizzard')) {
    category = 'snow';
  } else if (condition.includes('overcast') || condition.includes('heavy cloud')) {
    category = 'overcast';
  } else if (condition.includes('cloud') || condition.includes('mist')) {
    category = 'cloudy';
  } else if (condition.includes('fog')) {
    category = 'fog';
  } else if (condition.includes('thunder') || condition.includes('storm')) {
    category = 'storm';
  } else if (condition.includes('wind') || weatherData?.current?.wind_kph > 30) {
    category = 'wind';
  }

  // Logic to determine time phase
  let timePhase = 'day';
  if (weatherData?.current) {
    if (weatherData.current.is_day === 0) {
      timePhase = 'night';
    } else {
      const localTime = weatherData.location?.localtime || '';
      const hourPart = localTime.split(' ')[1]?.split(':')[0];
      const hour = hourPart ? parseInt(hourPart, 10) : 12;
      
      if (hour >= 5 && hour <= 7) timePhase = 'sunrise';
      else if (hour >= 17 && hour <= 19) timePhase = 'sunset';
      else timePhase = 'day';
    }
  }

  const getWeatherIcon = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('thunder') || t.includes('storm')) return <CloudLightning size={20} className="text-yellow-400" />;
    if (t.includes('rain') || t.includes('drizzle') || t.includes('shower')) return <CloudRain size={20} className="text-blue-300" />;
    if (t.includes('snow') || t.includes('ice') || t.includes('blizzard') || t.includes('sleet')) return <Snowflake size={20} className="text-blue-100" />;
    if (t.includes('cloud') || t.includes('overcast') || t.includes('mist')) return <Cloud size={20} className="text-gray-300" />;
    if (t.includes('fog')) return <Cloud size={20} className="text-gray-400 opacity-80" />;
    if (t.includes('wind')) return <Wind size={20} className="text-emerald-300" />;
    if (timePhase === 'night') return <Moon size={20} className="text-blue-200" />;
    return <Sun size={20} className="text-yellow-300" />;
  };

  const renderWeatherEmoji = (text: string) => {
     const t = text.toLowerCase();
     if (t.includes('rain') || t.includes('drizzle')) return '🌧️';
     if (t.includes('snow')) return '❄️';
     if (t.includes('thunder') || t.includes('storm')) return '⛈️';
     if (t.includes('cloud') || t.includes('overcast') || t.includes('mist')) return '☁️';
     if (timePhase === 'night') return '🌙';
     return '☀️';
  };

  if (loading) {
     return (
        <div className="w-full bg-black/30 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 md:p-14 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-visible h-[600px] flex flex-col justify-center items-center">
            <Loader2 size={48} className="animate-spin text-blue-400 mb-4" />
            <p className="text-blue-200/70 font-medium drop-shadow-md">Fetching atmospheric data...</p>
        </div>
     );
  }

  if (!weatherData) {
     return (
        <div className="w-full bg-black/30 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 md:p-14 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-visible h-[600px] flex flex-col justify-center items-center">
           <div className="relative mb-6 group cursor-pointer" onClick={onLocate}>
             <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 group-hover:scale-[1.8] transition-transform duration-700"></div>
             <div className="w-48 h-48 bg-black/40 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center relative z-10 overflow-hidden backdrop-blur-xl group-hover:border-blue-500/50 transition-colors">
                <SearchX size={64} className="text-blue-300 absolute opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700" />
                <div className="flex flex-col items-center z-10">
                   <span className="text-5xl mb-2 grayscale opacity-80 group-hover:grayscale-0 transition-all duration-500">🐸❓</span>
                   <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Lost Frog</span>
                </div>
             </div>
           </div>
           <h2 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight drop-shadow-md z-10">Awaiting Coordinates</h2>
           <p className="text-blue-200/70 text-lg font-medium max-w-md drop-shadow-md z-10 text-center mt-2">Search for a city above, or use your current location to wake up the weather frog.</p>
           <button onClick={onLocate} className="mt-6 z-10 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2 transition-colors">
             <MapPin size={18} /> Locate Me
           </button>
        </div>
     );
  }

  return (
    <div className={`w-full h-[650px] md:h-[750px] rounded-[2.5rem] shadow-[0_8px_40px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-colors duration-1000 ${getTimeGradient(timePhase, category)} border border-white/20 flex flex-col items-center justify-center gap-8 px-4`}>
       <style>{`
         @keyframes sun-glow {
           0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.4); }
           50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.5); }
         }
         .animate-sun-glow {
           animation: sun-glow 4s ease-in-out infinite;
         }
         @keyframes moon-glow {
           0%, 100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.4); }
           50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.6); }
         }
         .animate-moon-glow {
           animation: moon-glow 5s ease-in-out infinite;
         }
         @keyframes fall-leaf {
           0% { transform: translate(0, -10%) rotate(0deg); opacity: 0; }
           10% { opacity: 1; }
           90% { opacity: 1; }
           100% { transform: translate(100px, 100vh) rotate(360deg); opacity: 0; }
         }
         .animate-fall-leaf {
           animation: fall-leaf linear infinite;
         }
       `}</style>

       {/* Background Environment Layers */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <WeatherLayers category={category} timePhase={timePhase} />
       </div>

       {/* Center Weather Widget */}
       <div className="z-40 w-full max-w-4xl px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          <div className="flex flex-col items-center md:items-start gap-2 w-full md:w-1/3">
             <div className="text-white/90 font-medium text-2xl drop-shadow-md text-center md:text-left">
                {weatherData.location.name}, {weatherData.location.country}
             </div>
             <div className="text-white/70 text-sm font-semibold mb-2 uppercase tracking-widest drop-shadow-sm text-center md:text-left">
                Last Updated: {weatherData.location.localtime.split(' ')[1]}
             </div>
             
             <div className="flex items-center gap-3 text-base text-white font-medium drop-shadow-md">
                {getWeatherIcon(weatherData.current.condition.text)}
                <span>{weatherData.current.condition.text} (Feels Like {Math.round(weatherData.current.feelslike_c)}°C)</span>
             </div>
             <div className="flex items-center gap-3 text-base text-white font-medium drop-shadow-md">
                <Wind size={20} className="text-emerald-300" />
                <span>AQI: {weatherData.current.air_quality ? weatherData.current.air_quality['us-epa-index'] : '58 (Moderate)'}</span>
             </div>
             <div className="flex items-center gap-3 text-base text-white font-medium drop-shadow-md">
                <Sun size={20} className="text-yellow-400" />
                <span>UV: {weatherData.current.uv} ({weatherData.current.uv < 3 ? 'Low' : 'High'})</span>
             </div>
          </div>
          
          <div className="text-8xl md:text-[10rem] font-display font-bold text-white drop-shadow-xl text-center w-full md:w-1/3 flex justify-center items-center">
             {Math.round(weatherData.current.temp_c)}°C
          </div>

          <div className="w-full md:w-1/3 hidden md:block"></div>
       </div>

       {/* Status Pills */}
       <div className="z-40 flex flex-row flex-wrap justify-center gap-4">
          {(category === 'rain' || category === 'storm') ? (
             <div className="bg-gradient-to-r from-red-500/80 to-rose-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2">{getWeatherIcon(weatherData.current.condition.text)}</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">{weatherData.current.condition.text}</span>
             </div>
          ) : (category === 'cloudy' || category === 'overcast') ? (
             <div className="bg-gradient-to-r from-slate-500/80 to-gray-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2">{getWeatherIcon(weatherData.current.condition.text)}</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">{weatherData.current.condition.text}</span>
             </div>
          ) : (
             <div className="bg-gradient-to-r from-blue-500/80 to-sky-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2">{getWeatherIcon(weatherData.current.condition.text)}</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">{weatherData.current.condition.text}</span>
             </div>
          )}

          {category === 'wind' || category === 'storm' ? (
             <div className="bg-gradient-to-r from-emerald-500/80 to-green-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><Wind size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Wind</span>
                <AlertTriangle size={16} className="text-yellow-300 ml-1 drop-shadow-md" />
             </div>
          ) : (
             <div className="bg-gradient-to-r from-emerald-500/80 to-green-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><Wind size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Breeze</span>
             </div>
          )}
       </div>
    </div>
  );
};

const getTimeGradient = (phase: string, category: string) => {
  if (category === 'storm' || category === 'rain' || category === 'overcast') {
    return 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950';
  }
  if (category === 'fog') {
    return 'bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500';
  }

  switch (phase) {
    case 'sunrise': return 'bg-gradient-to-b from-indigo-500 via-rose-400 to-amber-300';
    case 'day': return 'bg-gradient-to-b from-blue-500 via-sky-400 to-cyan-200';
    case 'sunset': return 'bg-gradient-to-b from-purple-800 via-orange-500 to-amber-500';
    case 'night': return 'bg-gradient-to-b from-[#0a0f24] via-[#1a2342] to-[#2a3866]';
    default: return 'bg-gradient-to-b from-blue-500 to-sky-300';
  }
};

const WeatherLayers = ({ category, timePhase }: { category: string, timePhase: string }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
       {/* Sun & Rainbow for clear day */}
       {(timePhase === 'day' || timePhase === 'sunrise' || timePhase === 'sunset') && category !== 'storm' && category !== 'rain' && category !== 'fog' && (
         <>
           <div className="absolute top-[20%] left-[20%] w-32 h-32 bg-[#FFD700] rounded-full animate-sun-glow z-0"></div>
           {/* Rainbow arc */}
           <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] rounded-full border-[40px] border-transparent border-t-[rgba(255,0,0,0.2)] border-r-[rgba(255,165,0,0.2)] border-b-[rgba(255,255,0,0.2)] opacity-60 mix-blend-screen filter blur-[8px] transform rotate-[-45deg] z-0"></div>
           {/* Falling Autumn Leaves */}
           {Array.from({length: 8}).map((_, i) => (
             <div key={i} className="absolute w-4 h-4 bg-[#e76f51] rounded-tl-full rounded-br-full animate-fall-leaf opacity-80" style={{
                top: -20 + 'px',
                left: Math.random() * 100 + '%',
                animationDelay: Math.random() * 5 + 's',
                animationDuration: Math.random() * 5 + 5 + 's'
             }} />
           ))}
         </>
       )}

       {/* Moon for night */}
       {timePhase === 'night' && category !== 'storm' && category !== 'rain' && category !== 'fog' && (
         <div className="absolute top-[20%] left-[30%] w-28 h-28 bg-[#f8fafc] rounded-full animate-moon-glow z-0 flex items-center justify-center overflow-hidden">
            {/* Crisp craters for the moon */}
            <div className="absolute top-4 left-6 w-6 h-6 bg-[#cbd5e1] rounded-full"></div>
            <div className="absolute bottom-6 right-8 w-10 h-10 bg-[#cbd5e1] rounded-full"></div>
            <div className="absolute top-12 right-5 w-4 h-4 bg-[#cbd5e1] rounded-full"></div>
         </div>
       )}

       {/* Stars for night */}
       {timePhase === 'night' && category !== 'storm' && category !== 'rain' && (
         <div className="absolute inset-0 z-0">
           {Array.from({length: 60}).map((_, i) => (
             <div key={`star-${i}`} className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]" style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animation: `twinkle ${Math.random() * 3 + 2}s infinite ${Math.random() * 2}s`
             }} />
           ))}
         </div>
       )}

       {/* Clouds */}
       {(category === 'cloudy' || category === 'clear') && timePhase !== 'night' && (
         <div className="absolute inset-0 opacity-80 z-10">
           <div className="absolute top-[10%] left-[-10%] w-64 h-24 bg-white/90 rounded-full blur-[20px] animate-float-cloud-1"></div>
           <div className="absolute top-[30%] left-[60%] w-80 h-32 bg-white/80 rounded-full blur-[30px] animate-float-cloud-2"></div>
         </div>
       )}

       {/* Storm Clouds */}
       {(category === 'storm' || category === 'rain' || category === 'overcast') && (
         <div className="absolute inset-0 opacity-95 z-10">
           <div className="absolute top-[-5%] left-[-10%] w-[120%] h-[30%] bg-slate-800/90 rounded-[100%] blur-[40px]"></div>
           <div className="absolute top-[10%] left-[-20%] w-[150%] h-[40%] bg-slate-900/95 rounded-[100%] blur-[50px] animate-pulse"></div>
         </div>
       )}

       {/* Rain */}
       {(category === 'rain' || category === 'storm') && (
         <div className="absolute inset-0 z-20">
           {Array.from({length: 80}).map((_, i) => (
             <div key={`rain-${i}`} className="absolute bg-blue-200/60 w-[2px] rounded" style={{
                height: Math.random() * 40 + 20 + 'px',
                left: Math.random() * 100 + '%',
                top: -40 + 'px',
                animation: `rain-fall ${Math.random() * 0.4 + 0.3}s infinite ${Math.random() * 1}s`
             }} />
           ))}
         </div>
       )}

       {/* Storm Lightning Flash */}
       {category === 'storm' && (
         <div className="absolute inset-0 bg-white/90 opacity-0 animate-lightning-flash mix-blend-overlay z-30 pointer-events-none"></div>
       )}
    </div>
  );
};
