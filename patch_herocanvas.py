import re

with open("src/components/HeroCanvas.tsx", "r") as f:
    content = f.read()

target = """       {/* Center Weather Widget */}
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
       </div>"""

replacement = """       {/* Center Weather Widget */}
       <div className="z-40 w-full max-w-4xl px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          <div className="flex flex-col items-center md:items-start gap-2 w-full md:w-1/3">
             <div className="text-white/90 font-medium text-2xl drop-shadow-md text-center md:text-left">
                {weatherData.location.name}, {weatherData.location.country}
             </div>
             <div className="text-white/70 text-sm font-semibold mb-2 uppercase tracking-widest drop-shadow-sm text-center md:text-left">
                Last Updated: {weatherData.location.localtime.split(' ')[1]}
             </div>
             
             <div className="flex items-center gap-3 text-base text-white font-medium drop-shadow-md">
                <CloudRain size={20} className="text-blue-300" />
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
          
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-8 shadow-xl flex items-center justify-center shrink-0">
             <div className="text-7xl md:text-8xl drop-shadow-xl">{renderWeatherEmoji(weatherData.current.condition.text)}</div>
          </div>

          <div className="text-7xl md:text-9xl font-display font-bold text-white drop-shadow-xl text-center md:text-right w-full md:w-1/3">
             {Math.round(weatherData.current.temp_c)}°C
          </div>
       </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/HeroCanvas.tsx", "w") as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
