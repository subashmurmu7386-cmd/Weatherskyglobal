import React from 'react';
import { motion } from 'motion/react';
import { Navigation } from 'lucide-react';

interface WindCompassNeedleProps {
  windDir?: string;
  windDegree?: number;
  size?: number;
  className?: string;
}

export const getWindDegree = (degree?: number, dir?: string): number => {
  if (typeof degree === 'number' && !isNaN(degree)) return degree;
  if (!dir) return 0;
  const dirUpper = dir.trim().toUpperCase();
  const dirMap: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5
  };
  return dirMap[dirUpper] ?? 0;
};

export const WindCompassNeedle: React.FC<WindCompassNeedleProps> = ({
  windDir = 'N',
  windDegree,
  size = 56,
  className = ''
}) => {
  const degree = getWindDegree(windDegree, windDir);

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 group ${className}`}
      style={{ width: size, height: size }}
      title={`Wind Direction: ${windDir} (${degree}°)`}
    >
      {/* Outer Dial Ring with Glow */}
      <div className="absolute inset-0 rounded-full border border-cyan-400/30 bg-slate-900/60 backdrop-blur-md shadow-lg shadow-cyan-500/10 flex items-center justify-center">
        {/* Subtle Inner Ring Marks */}
        <div className="absolute inset-1 rounded-full border border-dashed border-white/10"></div>

        {/* Cardinal Direction Indicators */}
        <span className="absolute top-1 text-[9px] font-black text-rose-400 leading-none tracking-tighter select-none">N</span>
        <span className="absolute right-1 text-[8px] font-bold text-slate-300/80 leading-none select-none">E</span>
        <span className="absolute bottom-1 text-[8px] font-bold text-slate-300/80 leading-none select-none">S</span>
        <span className="absolute left-1 text-[8px] font-bold text-slate-300/80 leading-none select-none">W</span>
      </div>

      {/* Rotating Compass Needle Container */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ rotate: 0 }}
        animate={{ rotate: degree }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {/* Dynamic Compass Needle Shape */}
        <div className="relative w-2 h-full flex flex-col items-center justify-between py-1.5">
          {/* North Point (Red/Cyan Glowing Arrowhead) */}
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[20px] border-b-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]"></div>
          {/* South Point (Subtle Slate Tail) */}
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[20px] border-t-slate-400/50"></div>
        </div>
      </motion.div>

      {/* Center Pivot Metallic Pin */}
      <div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-cyan-300 shadow-md shadow-cyan-400/50 z-10 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-white"></div>
      </div>

      {/* Hover Tooltip with Degree */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 bg-slate-900/95 border border-cyan-400/30 rounded-md text-[10px] font-bold text-cyan-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 shadow-xl">
        {degree}° {windDir}
      </div>
    </div>
  );
};
