const fs = require('fs');
let code = fs.readFileSync('src/components/HeroCanvas.tsx', 'utf8');

const replacement = `  return (
    <div className={\`w-full h-[650px] md:h-[750px] rounded-[2.5rem] shadow-[0_8px_40px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-colors duration-1000 \${getTimeGradient(timePhase, category)} border border-white/20 flex flex-col items-center justify-center gap-8 px-4\`}>
       <style>{\`
         @keyframes sun-glow {
           0%, 100% { filter: drop-shadow(0 0 30px rgba(253, 224, 71, 0.6)); }
           50% { filter: drop-shadow(0 0 60px rgba(253, 224, 71, 1)); }
         }
         .animate-sun-glow {
           animation: sun-glow 4s ease-in-out infinite;
         }
         @keyframes moon-glow {
           0%, 100% { filter: drop-shadow(0 0 20px rgba(226, 232, 240, 0.4)); }
           50% { filter: drop-shadow(0 0 40px rgba(226, 232, 240, 0.8)); }
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
       \`}</style>

       {/* Background Environment Layers */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <WeatherLayers category={category} timePhase={timePhase} />
       </div>

       {/* Center Weather Widget */}
       <div className="z-40 w-full max-w-sm md:max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3),inset_0_1px_10px_rgba(255,255,255,0.2)]">
          <div className="text-white/90 font-medium text-xl mb-2 truncate drop-shadow-md">
             {weatherData.location.name}, {weatherData.location.country}
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
             <div className="text-6xl drop-shadow-xl">{renderWeatherEmoji(weatherData.current.condition.text)}</div>
             <div className="text-6xl md:text-7xl font-display font-bold text-white drop-shadow-xl">
                {Math.round(weatherData.current.temp_c)}°C
             </div>
          </div>
          <div className="text-white/70 text-sm font-semibold mb-6 uppercase tracking-widest drop-shadow-sm">
             Last Updated: {weatherData.location.localtime.split(' ')[1]}
          </div>
          
          <div className="space-y-4 pt-4 border-t border-white/20">
             <div className="flex justify-between items-center text-base text-white font-medium drop-shadow-md">
                <div className="flex items-center gap-3">
                   <CloudRain size={20} className="text-blue-300" />
                   <span>{weatherData.current.condition.text}</span>
                </div>
                <span className="text-white/80 text-sm">Feels Like {Math.round(weatherData.current.feelslike_c)}°C</span>
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
       </div>

       {/* Status Pills */}
       <div className="z-40 flex flex-row flex-wrap justify-center gap-4">
          {(category === 'rain' || category === 'storm') ? (
             <div className="bg-gradient-to-r from-red-500/80 to-rose-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><CloudRain size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Heavy Rain</span>
             </div>
          ) : (
             <div className="bg-gradient-to-r from-blue-500/80 to-sky-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><Sun size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Clear Sky</span>
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
};`;

const startIdx = code.indexOf('  return (\n    <div className={`w-full h-[650px] md:h-[750px]');
const endIdx = code.indexOf('};\n\nconst getTimeGradient');
if (startIdx !== -1 && endIdx !== -1) {
   code = code.substring(0, startIdx) + replacement + '\n\n' + code.substring(endIdx + 4);
   fs.writeFileSync('src/components/HeroCanvas.tsx', code);
   console.log('Success');
} else {
   console.log('Not found');
}
