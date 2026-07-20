with open("src/components/HeroCanvas.tsx", "r") as f:
    content = f.read()

target = """       {/* Status Pills */}
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
          )}"""

replacement = """       {/* Status Pills */}
       <div className="z-40 flex flex-row flex-wrap justify-center gap-4">
          {(category === 'rain' || category === 'storm') ? (
             <div className="bg-gradient-to-r from-red-500/80 to-rose-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><CloudRain size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Heavy Rain</span>
             </div>
          ) : (category === 'cloudy' || category === 'overcast') ? (
             <div className="bg-gradient-to-r from-slate-500/80 to-gray-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><CloudRain size={20} className="text-white opacity-0 hidden" />☁️</div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Cloudy</span>
             </div>
          ) : (
             <div className="bg-gradient-to-r from-blue-500/80 to-sky-600/80 backdrop-blur-xl px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-white/30 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 cursor-default">
                <div className="bg-white/20 rounded-xl p-2"><Sun size={20} className="text-white" /></div>
                <span className="text-white font-bold text-sm md:text-base tracking-wide">Clear Sky</span>
             </div>
          )}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/HeroCanvas.tsx", "w") as f:
        f.write(content)
    print("Replaced status pills logic")
else:
    print("Target status pills not found")
