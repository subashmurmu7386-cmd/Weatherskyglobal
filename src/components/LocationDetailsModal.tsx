import React, { useEffect, useState } from 'react';
import { X, MapPin, Mountain, Compass, Clock, Globe, ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatLocation } from '../utils/formatLocation';

interface LocationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: {
    name: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
    tz_id?: string;
    localtime?: string;
  } | null;
}

export function getTimezoneOffset(tzId?: string, localtimeStr?: string): { offsetStr: string; timezoneName: string } {
  if (!tzId) {
    return { offsetStr: 'UTC', timezoneName: 'Standard Time' };
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzId,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const tzNamePart = parts.find(p => p.type === 'timeZoneName');
    
    // Format timezone long name if possible
    const longFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzId,
      timeZoneName: 'long',
    });
    const longParts = longFormatter.formatToParts(now);
    const longTzPart = longParts.find(p => p.type === 'timeZoneName');

    let offsetStr = tzNamePart?.value || 'UTC';
    offsetStr = offsetStr.replace('GMT', 'UTC');

    return {
      offsetStr,
      timezoneName: longTzPart?.value || tzId
    };
  } catch (err) {
    console.warn('Error formatting timezone offset:', err);
    return { offsetStr: 'UTC', timezoneName: tzId };
  }
}

export const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  isOpen,
  onClose,
  location
}) => {
  const [elevation, setElevation] = useState<number | null>(null);
  const [loadingElevation, setLoadingElevation] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const lat = location?.lat;
  const lon = location?.lon;

  useEffect(() => {
    if (!isOpen || lat === undefined || lon === undefined) {
      setElevation(null);
      return;
    }

    let isMounted = true;
    setLoadingElevation(true);

    // Fetch elevation from Open-Meteo elevation API
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch elevation');
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        if (data?.elevation && Array.isArray(data.elevation) && data.elevation.length > 0) {
          setElevation(Math.round(data.elevation[0]));
        } else if (typeof data?.elevation === 'number') {
          setElevation(Math.round(data.elevation));
        } else {
          setElevation(null);
        }
      })
      .catch(err => {
        console.warn('Elevation fetch failed, trying fallback forecast elevation endpoint:', err);
        // Fallback endpoint
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`)
          .then(res => res.json())
          .then(fallbackData => {
            if (!isMounted) return;
            if (typeof fallbackData?.elevation === 'number') {
              setElevation(Math.round(fallbackData.elevation));
            } else {
              setElevation(null);
            }
          })
          .catch(() => {
            if (isMounted) setElevation(null);
          });
      })
      .finally(() => {
        if (isMounted) setLoadingElevation(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, lat, lon]);

  if (!isOpen || !location) return null;

  const cleanName = formatLocation(location.name, location.region, location.country);

  // Format coordinates
  const latFormatted = lat !== undefined
    ? `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`
    : 'N/A';
  const lonFormatted = lon !== undefined
    ? `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`
    : 'N/A';

  const { offsetStr, timezoneName } = getTimezoneOffset(location.tz_id, location.localtime);

  const handleCopyCoords = () => {
    if (lat !== undefined && lon !== undefined) {
      const coordString = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      navigator.clipboard.writeText(coordString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const elevationFeet = elevation !== null ? Math.round(elevation * 3.28084) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-900/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                  {cleanName}
                </h3>
                <p className="text-xs text-cyan-200/70 font-medium">
                  Geographic & Topographic Profile
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Grid */}
          <div className="mt-5 space-y-4">
            {/* Elevation Above Sea Level Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Mountain size={18} />
                </div>
                <div>
                  <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                    Elevation Above Sea Level
                  </div>
                  <div className="text-base font-bold text-emerald-200 flex items-center gap-2 mt-0.5">
                    {loadingElevation ? (
                      <span className="flex items-center gap-1.5 text-xs text-cyan-300 font-normal">
                        <Loader2 size={13} className="animate-spin" /> Fetching terrain data...
                      </span>
                    ) : elevation !== null ? (
                      <span>
                        {elevation.toLocaleString()} m <span className="text-xs text-white/60 font-normal">({elevationFeet?.toLocaleString()} ft)</span>
                      </span>
                    ) : (
                      <span className="text-xs text-white/60 font-normal">Sea Level (~0–50 m)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coordinates Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                  <Compass size={18} />
                </div>
                <div>
                  <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                    Geographic Coordinates
                  </div>
                  <div className="text-sm sm:text-base font-bold text-blue-100 mt-0.5">
                    {latFormatted}, {lonFormatted}
                  </div>
                </div>
              </div>

              {lat !== undefined && lon !== undefined && (
                <button
                  onClick={handleCopyCoords}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-cyan-200 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="Copy coordinates"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Timezone & Local Time Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-md hover:border-cyan-500/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <Clock size={18} />
              </div>
              <div className="flex-grow">
                <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                  Timezone & Offset
                </div>
                <div className="text-sm font-bold text-indigo-200 flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/30 text-xs font-mono text-cyan-200">
                    {offsetStr}
                  </span>
                  <span className="text-xs text-white/80 font-normal truncate max-w-[180px]">
                    {location.tz_id || timezoneName}
                  </span>
                </div>
                {location.localtime && (
                  <div className="text-xs text-cyan-200/80 mt-1 font-medium">
                    Local Time: {location.localtime.split(' ')[1] || location.localtime}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer map link */}
          {lat !== undefined && lon !== undefined && (
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <a
                href={`https://www.google.com/maps/@${lat},${lon},12z`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-xs sm:text-sm font-semibold text-cyan-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Globe size={15} />
                <span>View on Google Maps</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
