import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, SearchX, MapPin, CloudRain, CloudDrizzle, Wind, AlertTriangle, Sun, Moon, Droplets, CloudLightning, Snowflake, Cloud, Heart } from 'lucide-react';
import { motion, Variants } from 'motion/react';

interface HeroCanvasProps {
  weatherData?: any; 
  activeContext?: string;
  loading?: boolean;
  onLocate?: () => void;
  userName?: string;
  enableAnimations?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const HeroCanvas: React.FC<HeroCanvasProps> = ({ weatherData, activeContext, loading, onLocate, userName, enableAnimations = true, isFavorite = false, onToggleFavorite }) => {
  // Safe weather fallback object if weatherData is loading or not yet set to guarantee instant startup
  const displayData = weatherData || {
    location: { name: 'New Delhi', region: 'Delhi', country: 'India', localtime: '2026-07-29 12:00' },
    current: {
      temp_c: 28,
      feelslike_c: 30,
      condition: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
      wind_kph: 12,
      uv: 5,
      is_day: 1,
      precip_mm: 0,
      air_quality: { 'us-epa-index': 2 }
    }
  };

  const condition = displayData?.current?.condition?.text?.toLowerCase() || 'clear';
  const precip = displayData?.current?.precip_mm || 0;
  let category = 'clear';
  
  const isPatchyOrLight = condition.includes('patchy') || condition.includes('light');
  const isActiveRain = condition.includes('heavy') || condition.includes('moderate') || condition.includes('torrential') || condition.includes('showers') || condition === 'rain';

  if (condition.includes('thunder') || condition.includes('storm')) {
    category = 'storm';
  } else if ((isActiveRain || (condition.includes('rain') && !isPatchyOrLight)) && precip > 0) {
    category = 'rain';
  } else if (condition.includes('snow') || condition.includes('ice') || condition.includes('blizzard')) {
    category = 'snow';
  } else if (condition.includes('overcast') || condition.includes('heavy cloud')) {
    category = 'overcast';
  } else if (condition.includes('cloud') || condition.includes('mist') || condition.includes('patchy') || condition.includes('drizzle')) {
    category = 'cloudy';
  } else if (condition.includes('fog')) {
    category = 'fog';
  } else if (condition.includes('wind') || displayData?.current?.wind_kph > 30) {
    category = 'wind';
  }

  // Logic to determine time phase
  let timePhase = 'day';
  if (displayData?.current) {
    if (displayData.current.is_day === 0) {
      timePhase = 'night';
    } else {
      const localTime = displayData.location?.localtime || '';
      const hourPart = localTime.split(' ')[1]?.split(':')[0];
      const hour = hourPart ? parseInt(hourPart, 10) : 12;
      
      if (hour >= 5 && hour <= 7) timePhase = 'sunrise';
      else if (hour >= 17 && hour <= 19) timePhase = 'sunset';
      else timePhase = 'day';
    }
  }

  const getWeatherIcon = (text: string) => {
    const t = text.toLowerCase();
    const isPatchyOrLight = t.includes('patchy') || t.includes('light');
    if (t.includes('thunder') || t.includes('storm')) return <CloudLightning size={20} className="text-yellow-400" />;
    if ((t.includes('rain') || t.includes('drizzle') || t.includes('shower'))) {
      if (isPatchyOrLight || t.includes('drizzle')) return <CloudDrizzle size={20} className="text-blue-200" />;
      return <CloudRain size={20} className="text-blue-300" />;
    }
    if (t.includes('snow') || t.includes('ice') || t.includes('blizzard') || t.includes('sleet')) return <Snowflake size={20} className="text-blue-100" />;
    if (t.includes('cloud') || t.includes('overcast') || t.includes('mist')) return <Cloud size={20} className="text-gray-300" />;
    if (t.includes('fog')) return <Cloud size={20} className="text-gray-400 opacity-80" />;
    if (t.includes('wind')) return <Wind size={20} className="text-emerald-300" />;
    if (timePhase === 'night') return <Moon size={20} className="text-blue-200" />;
    return <Sun size={20} className="text-yellow-300" />;
  };

  const displayName = displayData.location.requestedQuery
    ? `${displayData.location.requestedQuery.charAt(0).toUpperCase() + displayData.location.requestedQuery.slice(1)}`
    : displayData.location.name;

  const statsContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const statsItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  };

  return (
    <div className={`w-full min-h-[580px] md:h-[720px] rounded-[2.5rem] shadow-[0_8px_40px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-colors duration-1000 ${getTimeGradient(timePhase, category)} border border-white/20 flex flex-col items-center justify-between p-6 md:p-10 gap-6`}>
       <style>{`
         @keyframes sun-glow {
           0%, 100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.7), 0 0 50px rgba(255, 215, 0, 0.4); }
           50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.9), 0 0 80px rgba(255, 215, 0, 0.6); }
         }
         .animate-sun-glow {
           animation: sun-glow 4s ease-in-out infinite;
         }
         @keyframes moon-glow {
           0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
           50% { box-shadow: 0 0 35px rgba(255, 255, 255, 0.7); }
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

       {/* Background Environment Layers - Sun/Moon pushed to top-right to avoid city text overlap */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <WeatherLayers category={category} timePhase={timePhase} enableAnimations={enableAnimations} />
       </div>

       {/* Subtle background updating indicator */}
       {loading && (
          <div className="absolute top-4 right-6 z-50 flex items-center gap-2 bg-black/50 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-cyan-300 shadow-lg animate-pulse">
            <Loader2 size={13} className="animate-spin text-cyan-300" />
            <span>Updating...</span>
          </div>
       )}

       {/* Center Weather Widget with semi-transparent backdrop for 100% animated background visibility */}
       <div className="z-40 w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 mt-2">
          {/* Location & Conditions Semi-Transparent Glassmorphic Container with Framer-Motion Staggered Entrance */}
          <motion.div 
            key={`${displayName}-${displayData.location.localtime}-${displayData.current.temp_c}`}
            initial="hidden"
            animate="visible"
            variants={statsContainerVariants}
            className="border border-white/20 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col items-start gap-3 w-full md:w-[460px] relative z-40 overflow-hidden"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0, 0, 0, 0.25)' }}
          >
             <motion.div variants={statsItemVariants} className="text-white font-bold text-xl md:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] flex items-start justify-between w-full gap-3">
                <span className="leading-tight text-white font-display tracking-tight break-words flex-grow pr-4 sm:pr-6">
                   {displayName}{displayData.location.region ? `, ${displayData.location.region}` : ''}{displayData.location.country ? `, ${displayData.location.country}` : ''}
                </span>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    title={isFavorite ? "Remove from Favorite Cities" : "Save to Favorite Cities"}
                    className={`shrink-0 p-2.5 rounded-2xl border backdrop-blur-md transition-all cursor-pointer shadow-md flex items-center justify-center ${
                      isFavorite
                        ? 'bg-red-500/40 border-red-400 text-red-300 hover:bg-red-500/60 scale-105'
                        : 'bg-black/30 border-white/20 text-white/90 hover:text-white hover:bg-black/50'
                    }`}
                  >
                    <Heart size={20} className={isFavorite ? 'fill-red-400 text-red-400' : ''} />
                  </button>
                )}
             </motion.div>
             
             <motion.div variants={statsItemVariants} className="text-cyan-200 font-semibold text-xs uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Local Time: {displayData.location.localtime.split(' ')[1] || '12:00'}
             </motion.div>
             
             <motion.div variants={statsItemVariants} className="w-full h-px bg-white/15 my-0.5"></motion.div>

             <motion.div variants={statsContainerVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-sm font-semibold text-white">
                <motion.div variants={statsItemVariants} className="flex items-center gap-2.5 bg-black/25 border border-white/20 px-3 py-2 rounded-2xl shadow-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                   {getWeatherIcon(displayData.current.condition.text)}
                   <span className="truncate">{displayData.current.condition.text}</span>
                </motion.div>
                <motion.div variants={statsItemVariants} className="flex items-center gap-2.5 bg-black/25 border border-white/20 px-3 py-2 rounded-2xl shadow-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                   <Droplets size={18} className="text-blue-300 shrink-0" />
                   <span>Feels: {Math.round(displayData.current.feelslike_c)}°C</span>
                </motion.div>
                <motion.div variants={statsItemVariants} className="flex items-center gap-2.5 bg-black/25 border border-white/20 px-3 py-2 rounded-2xl shadow-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                   <Wind size={18} className="text-emerald-300 shrink-0" />
                   <span>AQI: {displayData.current.air_quality ? displayData.current.air_quality['us-epa-index'] : '2 (Good)'}</span>
                </motion.div>
                <motion.div variants={statsItemVariants} className="flex items-center gap-2.5 bg-black/25 border border-white/20 px-3 py-2 rounded-2xl shadow-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                   <Sun size={18} className="text-yellow-400 shrink-0" />
                   <span>UV Index: {displayData.current.uv}</span>
                </motion.div>
             </motion.div>
          </motion.div>
          
          {/* Main Temperature Display */}
          <motion.div 
            key={`temp-${displayName}-${displayData.current.temp_c}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="text-7xl sm:text-8xl md:text-[9.5rem] font-display font-bold text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] text-center flex items-center justify-center shrink-0 z-40 my-2"
          >
             {Math.round(displayData.current.temp_c)}°C
          </motion.div>
       </div>

       {/* Status Pills */}
       <div className="z-40 flex flex-row flex-wrap justify-center gap-3 md:gap-4 mb-2">
          {(category === 'rain' || category === 'storm') ? (
             <div className="bg-gradient-to-r from-red-500/80 to-rose-600/80 backdrop-blur-xl px-5 py-2.5 md:px-6 md:py-3.5 rounded-2xl border border-white/30 shadow-xl flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2">{getWeatherIcon(displayData.current.condition.text)}</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">{displayData.current.condition.text}</span>
             </div>
          ) : (category === 'cloudy' || category === 'overcast') ? (
             <div className="bg-gradient-to-r from-slate-600/80 to-slate-800/80 backdrop-blur-xl px-5 py-2.5 md:px-6 md:py-3.5 rounded-2xl border border-white/30 shadow-xl flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2">{getWeatherIcon(displayData.current.condition.text)}</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">{displayData.current.condition.text}</span>
             </div>
          ) : (
             <div className="bg-gradient-to-r from-blue-500/80 to-sky-600/80 backdrop-blur-xl px-5 py-2.5 md:px-6 md:py-3.5 rounded-2xl border border-white/30 shadow-xl flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2">{getWeatherIcon(displayData.current.condition.text)}</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">{displayData.current.condition.text}</span>
             </div>
          )}

          {category === 'wind' || category === 'storm' ? (
             <div className="bg-gradient-to-r from-emerald-500/80 to-green-600/80 backdrop-blur-xl px-5 py-2.5 md:px-6 md:py-3.5 rounded-2xl border border-white/30 shadow-xl flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><Wind size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Wind ({displayData.current.wind_kph} km/h)</span>
                <AlertTriangle size={16} className="text-yellow-300 ml-1 drop-shadow-md" />
             </div>
          ) : (
             <div className="bg-gradient-to-r from-emerald-500/80 to-green-600/80 backdrop-blur-xl px-5 py-2.5 md:px-6 md:py-3.5 rounded-2xl border border-white/30 shadow-xl flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><Wind size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Breeze ({displayData.current.wind_kph} km/h)</span>
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

const WeatherLayers = ({ category, timePhase, enableAnimations }: { category: string, timePhase: string, enableAnimations?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
       {/* Sun & Rainbow for clear day - Positioned top-right so it stays behind open space, clear of city text */}
       {(timePhase === 'day' || timePhase === 'sunrise' || timePhase === 'sunset') && category !== 'storm' && category !== 'rain' && category !== 'fog' && (
         <>
           <div className={`absolute top-[6%] right-[8%] md:right-[14%] w-28 h-28 md:w-36 md:h-36 bg-[#FFD700] rounded-full ${enableAnimations ? 'animate-sun-glow' : ''} z-0 pointer-events-none opacity-90`}></div>
           {/* Rainbow arc */}
           <div className="absolute top-[5%] right-[-10%] w-[550px] h-[550px] rounded-full border-[35px] border-transparent border-t-[rgba(255,0,0,0.2)] border-r-[rgba(255,165,0,0.2)] border-b-[rgba(255,255,0,0.2)] opacity-60 mix-blend-screen filter blur-[8px] transform rotate-[-45deg] z-0 pointer-events-none"></div>
           {/* Falling Autumn Leaves */}
           {enableAnimations && Array.from({length: 8}).map((_, i) => (
             <div key={i} className="absolute w-4 h-4 bg-[#e76f51] rounded-tl-full rounded-br-full animate-fall-leaf opacity-80" style={{
                top: -20 + 'px',
                left: Math.random() * 100 + '%',
                animationDelay: Math.random() * 5 + 's',
                animationDuration: Math.random() * 5 + 5 + 's'
             }} />
           ))}
         </>
       )}

       {/* Moon for night - Positioned top-right */}
       {timePhase === 'night' && category !== 'storm' && category !== 'rain' && category !== 'fog' && (
         <div className={`absolute top-[6%] right-[10%] md:right-[16%] w-24 h-24 md:w-32 md:h-32 bg-[#f8fafc] rounded-full ${enableAnimations ? 'animate-moon-glow' : ''} z-0 flex items-center justify-center overflow-hidden pointer-events-none`}>
            {/* Crisp craters for the moon */}
            <div className="absolute top-4 left-5 w-5 h-5 md:w-6 md:h-6 bg-[#cbd5e1] rounded-full"></div>
            <div className="absolute bottom-5 right-6 w-8 h-8 md:w-10 md:h-10 bg-[#cbd5e1] rounded-full"></div>
            <div className="absolute top-10 right-4 w-3 h-3 md:w-4 md:h-4 bg-[#cbd5e1] rounded-full"></div>
         </div>
       )}

       {/* Stars for night */}
       {timePhase === 'night' && category !== 'storm' && category !== 'rain' && (
         <div className="absolute inset-0 z-0">
           {enableAnimations && Array.from({length: 60}).map((_, i) => (
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
           <div className={`absolute top-[10%] left-[-10%] w-64 h-24 bg-white/90 rounded-full blur-[20px] ${enableAnimations ? 'animate-float-cloud-1' : ''}`}></div>
           <div className={`absolute top-[30%] left-[60%] w-80 h-32 bg-white/80 rounded-full blur-[30px] ${enableAnimations ? 'animate-float-cloud-2' : ''}`}></div>
         </div>
       )}

       {/* Storm Clouds */}
       {(category === 'storm' || category === 'rain' || category === 'overcast') && (
         <div className="absolute inset-0 opacity-95 z-10">
           <div className="absolute top-[-5%] left-[-10%] w-[120%] h-[30%] bg-slate-800/90 rounded-[100%] blur-[40px]"></div>
           <div className={`absolute top-[10%] left-[-20%] w-[150%] h-[40%] bg-slate-900/95 rounded-[100%] blur-[50px] ${enableAnimations ? 'animate-pulse' : ''}`}></div>
         </div>
       )}

       {/* Rain */}
       {(category === 'rain' || category === 'storm') && (
         <div className="absolute inset-0 z-20">
           {enableAnimations && Array.from({length: 80}).map((_, i) => (
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
       {category === 'storm' && enableAnimations && (
         <div className="absolute inset-0 bg-white/90 opacity-0 animate-lightning-flash mix-blend-overlay z-30 pointer-events-none"></div>
       )}
    </div>
  );
};
