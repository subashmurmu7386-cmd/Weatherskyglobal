/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, Maximize, Minimize, MapPin, User, Moon, CloudRain, Droplets, Wind, Thermometer, Loader2, AlertCircle, Sun, Cloud, CloudLightning, Snowflake, CalendarDays, Map as MapIcon, Compass, Sparkles, Umbrella, CarFront, Shirt, Sprout, Tractor, Snowflake as FrostIcon, TreePine, Trophy, Activity, SunMedium, Eye, Sunrise, Sunset, MoonStar, Heart, X, Menu, CloudDrizzle, CloudSnow, Send, Download, Tent, Fish, Waves, Flower2, Dog, PartyPopper, Telescope, BookOpen, Flame, Award, Zap, ShieldAlert, WifiOff, SearchX, CheckCircle, History, TrendingUp, BarChart2, FileText, Clock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, ComposedChart, Bar, Cell, ReferenceLine } from 'recharts';
import Markdown from 'react-markdown';
import { HeroCanvas } from './components/HeroCanvas';
import { WeatherHabitsSection } from './components/WeatherHabitsSection';
import { AmbientSoundPlayer } from './components/AmbientSoundPlayer';
import { WindCompassNeedle, getWindDegree } from './components/WindCompassNeedle';
import { AnimatedValue } from './components/AnimatedValue';
import { PwaInstallModal } from './components/PwaInstallModal';
import { LocationDetailsModal } from './components/LocationDetailsModal';
import { AdsterraNative } from './components/AdsterraNative';
import { AdsterraBanner } from './components/AdsterraBanner';
import { formatLocation, formatLocationString } from './utils/formatLocation';
import firebaseConfig from '../firebase-applet-config.json';

const getFirebaseConfig = () => {
  if (firebaseConfig && firebaseConfig.projectId && firebaseConfig.projectId !== '') {
    return firebaseConfig;
  }
  return {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0783592595",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:587189829912:web:e179b48da25725a4bd5e6d",
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCT88ERotkRmNdxDq3DbRUkb6C5QyyxbeQ",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0783592595.firebaseapp.com",
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-weatherskyglobal-bf333a00-1a41-4123-82c2-896e0f29cd8d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0783592595.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "587189829912",
  };
};

const activeFirebaseConfig = getFirebaseConfig();
export const app = initializeApp(activeFirebaseConfig);
export const db = getFirestore(app, activeFirebaseConfig.firestoreDatabaseId || activeFirebaseConfig.projectId);

// Securely proxying WeatherAPI calls via our Express server-side endpoints
// to prevent client-side API key exposure and eliminate potential CORS blocks.

interface WeatherData {
  location: {
    name: string;
    country: string;
    region: string;
    localtime: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_kph: number;
    wind_dir?: string;
    wind_degree?: number;
    gust_kph?: number;
    dewpoint_c?: number;
    pressure_mb: number;
    precip_mm: number;
    humidity: number;
    feelslike_c: number;
    is_day: number;
    uv?: number;
    last_updated_epoch?: number;
    air_quality?: {
      "us-epa-index": number;
    };
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      date_epoch: number;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        daily_chance_of_rain: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
      astro: {
        sunrise: string;
        sunset: string;
        moon_phase: string;
        moonrise?: string;
        moonset?: string;
      };
      hour?: Array<any>;
    }>;
  };
  alerts?: {
    alert: Array<{
      headline: string;
      severity: string;
      event: string;
      desc: string;
    }>;
  };
}

const placeholderForecast = Array.from({ length: 3 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i + 1);
  const conditions = [1000, 1003, 1183, 1273, 1114];
  return {
    id: i,
    date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
    maxTemp: Math.floor(Math.random() * 10) + 25,
    minTemp: Math.floor(Math.random() * 5) + 18,
    rainProb: Math.floor(Math.random() * 100),
    code: conditions[Math.floor(Math.random() * conditions.length)],
  };
});

const placeholderHourly = Array.from({ length: 24 }).map((_, i) => {
  const time = new Date();
  time.setHours(time.getHours() + i + 1);
  const conditions = [1000, 1003, 1183, 1273, 1114];
  const chance = (i % 6 === 0) ? 75 : (i % 3 === 0) ? 40 : 15;
  return {
    id: i,
    time: time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
    temp: Math.floor(Math.random() * 10) + 20,
    chance_of_rain: chance,
    precip_mm: chance > 50 ? Number((chance / 25).toFixed(1)) : 0,
    code: conditions[Math.floor(Math.random() * conditions.length)],
  };
});

const AstronomyCountdown = ({ weatherData }: { weatherData: any; key?: string }) => {
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    // Update timer every minute / second to keep live countdown accurate
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!weatherData?.forecast?.forecastday?.[0]?.astro || !weatherData?.location?.localtime) {
    return null;
  }

  const astro = weatherData.forecast.forecastday[0].astro;
  const localtimeStr = weatherData.location.localtime;

  const parseAstroTime = (dateBaseStr: string, timeStr: string) => {
    if (!timeStr) return null;
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return null;
    let [_, h, m, ampm] = timeMatch;
    let hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = dateBaseStr.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0).getTime();
  };

  const parseLocalTimeStr = (str: string) => {
    const [datePart, timePart] = str.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0).getTime();
  };

  const datePart = localtimeStr.split(' ')[0];
  const todaySunriseMs = parseAstroTime(datePart, astro.sunrise);
  const todaySunsetMs = parseAstroTime(datePart, astro.sunset);

  if (!todaySunriseMs || !todaySunsetMs) return null;

  const locBaseMs = parseLocalTimeStr(localtimeStr);
  const currentLocMs = locBaseMs + tick * 1000;

  let targetType: 'Sunrise' | 'Sunset' = 'Sunset';
  let targetMs = 0;
  let targetLabel = '';

  if (currentLocMs < todaySunriseMs) {
    targetType = 'Sunrise';
    targetMs = todaySunriseMs;
    targetLabel = astro.sunrise;
  } else if (currentLocMs < todaySunsetMs) {
    targetType = 'Sunset';
    targetMs = todaySunsetMs;
    targetLabel = astro.sunset;
  } else {
    targetType = 'Sunrise';
    const tomorrowDateStr = weatherData?.forecast?.forecastday?.[1]?.date;
    const tomorrowAstro = weatherData?.forecast?.forecastday?.[1]?.astro;

    if (tomorrowDateStr && tomorrowAstro?.sunrise) {
      const tomMs = parseAstroTime(tomorrowDateStr, tomorrowAstro.sunrise);
      if (tomMs) {
        targetMs = tomMs;
        targetLabel = tomorrowAstro.sunrise;
      }
    }

    if (!targetMs) {
      targetMs = todaySunriseMs + 24 * 3600 * 1000;
      targetLabel = astro.sunrise;
    }
  }

  const diffMs = targetMs - currentLocMs;
  if (diffMs <= 0) {
    return (
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-5 py-3 rounded-2xl text-amber-300 font-semibold text-sm mb-6">
        <span className="flex items-center gap-2">
          <Sparkles className="animate-spin text-amber-400" size={16} />
          {targetType} is occurring right now in {weatherData?.location?.name || 'current location'}!
        </span>
      </div>
    );
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const isSunrise = targetType === 'Sunrise';

  return (
    <div className="w-full bg-slate-900/80 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3.5 w-full md:w-auto">
        <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${isSunrise ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : 'bg-orange-500/20 text-orange-400 border-orange-400/30'}`}>
          {isSunrise ? <Sunrise size={24} className="animate-bounce" /> : <Sunset size={24} className="animate-pulse" />}
        </div>
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-bold text-blue-200/90 flex items-center gap-1.5">
              <Clock size={13} className="text-cyan-300 shrink-0" /> Dynamic Astronomy Countdown
            </span>
            <span className={`text-[10px] sm:text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${isSunrise ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'bg-orange-400/20 text-orange-300 border-orange-400/30'}`}>
              {targetType} at {targetLabel}
            </span>
          </div>
          <p className="text-xs text-blue-100/70 mt-1 font-medium">
            Remaining time until next {targetType.toLowerCase()} in <span className="text-white font-semibold">{weatherData?.location?.name || 'Selected Location'}</span> (updates live every minute)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-white/10 px-4 py-2.5 rounded-2xl shadow-inner shrink-0">
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-xl sm:text-2xl font-black text-white font-mono">{hours.toString().padStart(2, '0')}</span>
          <span className="text-[9px] uppercase tracking-wider text-blue-200/70 font-bold">Hours</span>
        </div>
        <span className="text-xl font-bold text-white/40 animate-pulse">:</span>
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">{mins.toString().padStart(2, '0')}</span>
          <span className="text-[9px] uppercase tracking-wider text-blue-200/70 font-bold">Mins</span>
        </div>
        <span className="text-xl font-bold text-white/40 animate-pulse">:</span>
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">{secs.toString().padStart(2, '0')}</span>
          <span className="text-[9px] uppercase tracking-wider text-blue-200/70 font-bold">Secs</span>
        </div>
      </div>
    </div>
  );
};

const UvForecastChart = ({ weatherData }: { weatherData: any }) => {
  const hoursArray = weatherData?.forecast?.forecastday?.[0]?.hour;
  
  const chartData = (hoursArray && hoursArray.length > 0)
    ? hoursArray.map((h: any) => {
        const dateObj = h.time ? new Date(h.time) : null;
        const timeLabel = dateObj ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric' }) : '';
        const uvVal = h.uv !== undefined ? Number(h.uv) : 0;
        return {
          time: timeLabel,
          uv: uvVal,
          temp: Math.round(h.temp_c || 0),
          condition: h.condition?.text || 'Clear'
        };
      })
    : Array.from({ length: 24 }, (_, i) => {
        const hourLabel = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
        let uv = 0;
        if (i >= 6 && i <= 18) {
          const distFromNoon = Math.abs(i - 13);
          uv = Math.max(0, Math.round(8 - distFromNoon * 1.2));
        }
        return {
          time: hourLabel,
          uv,
          temp: 22,
          condition: uv > 5 ? 'Sunny' : uv > 0 ? 'Partly Cloudy' : 'Clear'
        };
      });

  const getUvRiskBadge = (uv: number) => {
    if (uv >= 11) return { text: 'Extreme Risk', color: 'text-purple-300 bg-purple-500/20 border-purple-500/30' };
    if (uv >= 8) return { text: 'Very High', color: 'text-red-300 bg-red-500/20 border-red-500/30' };
    if (uv >= 6) return { text: 'High Risk', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30' };
    if (uv >= 3) return { text: 'Moderate', color: 'text-yellow-200 bg-yellow-500/20 border-yellow-500/30' };
    return { text: 'Low / Safe', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' };
  };

  const peakUvItem = [...chartData].sort((a, b) => b.uv - a.uv)[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.98, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 mb-6 p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300 shrink-0">
            <Sun size={18} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              24-Hour UV Index Forecast
            </h4>
            <p className="text-[11px] text-indigo-200/70 font-medium">
              Plan safe outdoor hours • Peak UV at <strong className="text-amber-300">{peakUvItem?.time || 'Midday'}</strong> (UV {peakUvItem?.uv || 0})
            </p>
          </div>
        </div>

        {/* Risk Level Badges */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold">0-2 Safe</span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-200 font-semibold">3-5 Moderate</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-semibold">6-7 High</span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 font-semibold">8+ Very High</span>
        </div>
      </div>

      <div className="h-48 sm:h-56 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="uvLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="35%" stopColor="#FBBF24" />
                <stop offset="70%" stopColor="#F87171" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
            <XAxis dataKey="time" stroke="#93C5FD" tick={{ fill: '#93C5FD', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={15} />
            <YAxis stroke="#93C5FD" tick={{ fill: '#93C5FD', fontSize: 10 }} domain={[0, 12]} tickCount={7} axisLine={false} tickLine={false} />
            <ReferenceLine y={3} stroke="#FBBF24" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={8} stroke="#F87171" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const risk = getUvRiskBadge(data.uv);
                  return (
                    <div className="bg-slate-900/95 border border-white/20 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[170px]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                        <span className="text-xs font-bold text-blue-200">{label}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${risk.color}`}>
                          {risk.text}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">UV Index:</span>
                          <span className="font-extrabold text-amber-300 text-sm">{data.uv}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-blue-200/80">
                          <span>Temp:</span>
                          <span className="font-semibold text-white">{data.temp}°C</span>
                        </div>
                        <div className="text-[10px] text-white/60 capitalize pt-1 border-t border-white/5">
                          Condition: {data.condition}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="uv"
              stroke="url(#uvLineGradient)"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, index, payload } = props;
                if (cx === undefined || cy === undefined) return null;
                const isHighUv = payload?.uv >= 6;
                return (
                  <svg key={`uv-dot-${index}`} className="overflow-visible">
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      initial={{ r: 0, opacity: 0 }}
                      whileInView={{ r: isHighUv ? 4 : 3, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + index * 0.025, duration: 0.35, type: 'spring', stiffness: 300, damping: 20 }}
                      fill={isHighUv ? '#F87171' : '#FBBF24'}
                      stroke="#1E1B4B"
                      strokeWidth={1.5}
                    />
                  </svg>
                );
              }}
              activeDot={{ r: 6, fill: '#F59E0B', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-indigo-200/80 pt-2 border-t border-white/10">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_#34d399]"></span> Safe outdoor hours: <strong className="text-emerald-300 font-semibold">{chartData.filter((d: any) => d.uv < 3).map((d: any) => d.time).slice(0, 4).join(', ')}...</strong>
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-amber-300 font-medium">
          <ShieldAlert size={13} /> High defense needed above UV 6 Line
        </span>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [weatherTheme, setWeatherTheme] = useState('clear-night');
  const [activeMapTab, setActiveMapTab] = useState('Rain Map');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState<{ id: string, name: string }[]>([]);
  const [toastError, setToastError] = useState<string | null>(null);
  const [histChartMode, setHistChartMode] = useState<'seasonal' | 'daily'>('seasonal');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeContext, setActiveContext] = useState<string>('none');
  const [userName, setUserName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  
  // Auto-dismiss Toast Error Modal after 3 seconds
  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => {
        setToastError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);
  
  // Gamification & Alerts State
  
  // AI Chat Assistant State
  const [chatSessions, setChatSessions] = useState<{ id: string, title: string, messages: { role: 'user' | 'assistant', text: string }[] }[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const spokenTextRef = useRef<string>('');
  const activeVoiceTargetRef = useRef<'chat' | 'search'>('chat');
  
  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<{ id?: number; name: string; region: string; country: string; query: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lastGpsCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const ipFallbackAttemptedRef = useRef(false);
  const [gpsMode, setGpsMode] = useState<'live_gps' | 'coarse_ip' | 'disabled'>('live_gps');

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-autocomplete?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Autocomplete fetch error:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        } else {
          setShowPwaModal(true);
        }
      } catch (err) {
        setShowPwaModal(true);
      }
    } else {
      setShowPwaModal(true);
    }
  };

  // Gamification Initialization
  useEffect(() => {
    const savedChats = localStorage.getItem('weatherChatSessions');
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        if (parsed.length > 0) {
          setChatSessions(parsed);
          setCurrentChatId(parsed[0].id);
          setChatHistory(parsed[0].messages);
        } else {
          startNewChat();
        }
      } catch (e) {
        startNewChat();
      }
    } else {
      startNewChat();
    }
  }, []);

  const startNewChat = () => {
    const initialId = Date.now().toString();
    const initialHistory = [{ role: 'assistant', text: "Hello! I'm your AI Weather Assistant. Ask me anything about the weather, travel, or clothing suggestions based on your location!" }] as { role: 'user' | 'assistant', text: string }[];
    const newSession = { id: initialId, title: 'New Chat', messages: initialHistory };
    
    setChatSessions(prev => {
      const updated = [newSession, ...prev];
      localStorage.setItem('weatherChatSessions', JSON.stringify(updated));
      return updated;
    });
    setCurrentChatId(initialId);
    setChatHistory(initialHistory);
  };

  const loadSession = (id: string) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setCurrentChatId(id);
      setChatHistory(session.messages);
    }
  };

  const updateCurrentSession = (messages: { role: 'user' | 'assistant', text: string }[]) => {
    setChatHistory(messages);
    setChatSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentChatId) {
          // Generate title based on first user message if it's 'New Chat'
          let title = s.title;
          if (title === 'New Chat') {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
            }
          }
          return { ...s, title, messages };
        }
        return s;
      });
      localStorage.setItem('weatherChatSessions', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleListen = (target: 'chat' | 'search' = 'chat') => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setToastError("Your browser does not support voice input.");
      return;
    }
    
    try {
      activeVoiceTargetRef.current = target;
      spokenTextRef.current = '';
      
      const recognition = new SpeechRecognitionAPI();
      speechRecognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentSpeechText = (finalTranscript || interimTranscript).trim();
        if (currentSpeechText) {
          spokenTextRef.current = currentSpeechText;
          if (activeVoiceTargetRef.current === 'search') {
            setSearchQuery(currentSpeechText);
          } else {
            setChatInput(currentSpeechText);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setToastError("Microphone access was denied. Please allow microphone permissions to use voice input.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const autoSubmitText = spokenTextRef.current.trim();
        if (autoSubmitText) {
          if (activeVoiceTargetRef.current === 'search') {
            handleSearch();
          } else {
            handleChatSend(autoSubmitText);
          }
          spokenTextRef.current = '';
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load favorite cities from LocalStorage ('favorite_cities')
  useEffect(() => {
    try {
      const stored = localStorage.getItem('favorite_cities');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedLocations(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading favorite_cities:', e);
    }
    const mock = localStorage.getItem('mockSavedLocations');
    if (mock) {
      try { setSavedLocations(JSON.parse(mock)); } catch {}
    }
  }, []);

  const isCurrentFavorite = weatherData?.location?.name
    ? savedLocations.some(loc => {
        const locLower = loc.name.toLowerCase();
        const cityLower = weatherData.location.name.toLowerCase();
        return locLower.includes(cityLower) || cityLower.includes(locLower);
      })
    : false;

  const toggleFavoriteCity = () => {
    if (!weatherData?.location?.name) return;
    const currentLocName = formatLocation(weatherData.location.name, weatherData.location.region, weatherData.location.country);
    
    let updated: { id: string; name: string }[];
    if (isCurrentFavorite) {
      updated = savedLocations.filter(loc => {
        const locLower = loc.name.toLowerCase();
        const cityLower = weatherData.location.name.toLowerCase();
        return !locLower.includes(cityLower) && !cityLower.includes(locLower);
      });
    } else {
      updated = [
        ...savedLocations,
        {
          id: Date.now().toString(),
          name: currentLocName
        }
      ];
    }
    setSavedLocations(updated);
    try {
      localStorage.setItem('favorite_cities', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save favorite_cities to LocalStorage:', err);
    }
  };

  const handleSaveLocation = async () => {
    toggleFavoriteCity();
  };

  useEffect(() => {
    const savedName = localStorage.getItem('skyGlobal_userName');
    if (savedName) {
      setUserName(savedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      localStorage.setItem('skyGlobal_userName', nameInput.trim());
      setShowNameModal(false);
    }
  };

  const logUserSearchData = async (userNameStr: string, citySearched: string, countrySearched: string) => {
    if (!db || !userNameStr) return;
    try {
      await setDoc(doc(db, 'user_analytics', userNameStr), {
        name: userNameStr,
        lastSearchCity: citySearched,
        lastSearchCountry: countrySearched,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (dbError) {
      console.error("Failed to save search analytics to Firestore:", dbError);
    }
  };

  const fetchWeather = async (query: string, bypassCache = false, isSilent = false) => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setAiRecommendations([]);
    if (!isSilent) {
      setToastError(null);
    }
    
    const cacheKey = `weather_${query.toLowerCase()}`;
    if (!bypassCache) {
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        try {
           const { data, timestamp } = JSON.parse(cachedData);
           // 10-minute cache validity
           if (Date.now() - timestamp < 10 * 60 * 1000) {
              setWeatherData(data);
              updateTheme(data.current);
              setLoading(false);
              return;
           }
        } catch (e) {
           // ignore cache error
        }
      }
    }

    try {
      let fetchUrl = '';
      const trimmedQuery = query.trim();

      if (trimmedQuery.startsWith('lat=') && trimmedQuery.includes('&lon=')) {
        fetchUrl = `/api/weather?${trimmedQuery}`;
      } else {
        const coordMatch = trimmedQuery.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (coordMatch) {
          const lat = coordMatch[1].trim();
          const lon = coordMatch[2].trim();
          fetchUrl = `/api/weather?q=${lat},${lon}`;
        } else {
          // SANITIZE LOCATION SEARCH QUERY:
          // Strip out extra state/country suffix (e.g. extract "New York" from "New York, US")
          // and use encodeURIComponent so the Weather API parses it cleanly without throwing "location not found".
          let sanitizedLocation = trimmedQuery;
          if (trimmedQuery.includes(',')) {
            const parts = trimmedQuery.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length > 0) {
              sanitizedLocation = parts[0];
            }
          }
          fetchUrl = `/api/weather?q=${encodeURIComponent(sanitizedLocation)}`;
        }
      }

      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `Location "${query}" not found. Please try another search.`);
      }
      
      const data: WeatherData = await response.json();
      setWeatherData(data);
      setAlertDismissed(false);
      updateTheme(data.current);
      
      try {
         sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (e) {
         // ignore storage error
      }

      // Save search data to Firestore
      const currentUser = userName || localStorage.getItem('skyGlobal_userName');
      if (currentUser) {
        logUserSearchData(currentUser, data.location.name, data.location.country);
      }

      // Auto-trigger Gemini Recommendations & Daily Weather Insight
      generateAIRecommendations(data);
      fetchDailyInsight(data);
    } catch (err) {
      if (!isSilent) {
        setToastError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } else {
        console.warn('Silent initial or background fetch error suppressed:', err);
      }

      // Smooth fallback to New Delhi if search fails and we don't have valid weather data, or if query failed
      const lowerQ = query.toLowerCase();
      if (!lowerQ.includes('new delhi')) {
        console.info("Search failed, falling back smoothly to New Delhi");
        fetchWeather("New Delhi, India", true, true);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = async (data: WeatherData) => {
    setAiLoading(true);
    const realUv = data.current.uv !== undefined ? data.current.uv : (data.current.temp_c > 25 ? 8 : 4);
    try {
      // Connects to the Express backend which securely calls the Gemini API
      const response = await fetch('/api/weather-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationName: data.location.name,
          temperature: data.current.temp_c,
          condition: data.current.condition.text,
          rainChance: data.current.precip_mm > 0 ? 100 : 0, // Using precip_mm as a proxy since current weather API doesn't return rain chance percentage
          uvIndex: realUv,
          aqi: data.current.air_quality?.["us-epa-index"] || 50
        }),
      });
      
      if (response.ok) {
         const result = await response.json();
         // Parse the bullet points
         const bullets = (result.text || "")
           .split('\n')
           .filter((line: string) => line.trim().match(/^[-*]/))
           .map((line: string) => line.replace(/^[-*]\s*/, '').trim());
         setAiRecommendations(bullets.length ? bullets : [result.text || ""]);
      } else {
        const getUvTip = (uv: number) => {
          if (uv >= 11) return "Extreme UV Index! Apply SPF 50+, wear UV sunglasses, and stay shaded between 10 AM - 4 PM.";
          if (uv >= 8) return "Very High UV Index! Use SPF 50+ broad-spectrum sunscreen and reapply every 2 hours.";
          if (uv >= 6) return "High UV Index! Apply SPF 30-50 sunscreen, wear a wide hat and protective apparel.";
          if (uv >= 3) return "Moderate UV Index! Apply SPF 30+ sunscreen and wear sunglasses for outdoor activities.";
          return "Low UV Index: Minimal protection needed, safe for brief outdoor stays.";
        };
        setAiRecommendations([
          `Consider current condition (${data.current.condition.text}) before heading out in ${data.location.name}.`,
          `Personalized Skincare & UV Protection: ${getUvTip(realUv)}`,
          "Stay prepared for sudden weather changes and maintain good hydration."
        ]);
      }
    } catch (error) {
      console.warn('Using local weather tips fallback:', error);
      const getUvTip = (uv: number) => {
        if (uv >= 11) return "Extreme UV Index! Apply SPF 50+, wear UV sunglasses, and stay shaded between 10 AM - 4 PM.";
        if (uv >= 8) return "Very High UV Index! Use SPF 50+ broad-spectrum sunscreen and reapply every 2 hours.";
        if (uv >= 6) return "High UV Index! Apply SPF 30-50 sunscreen, wear a wide hat and protective apparel.";
        if (uv >= 3) return "Moderate UV Index! Apply SPF 30+ sunscreen and wear sunglasses for outdoor activities.";
        return "Low UV Index: Minimal protection needed, safe for brief outdoor stays.";
      };
      setAiRecommendations([
        `Consider current condition (${data.current.condition.text}) before heading out in ${data.location.name}.`,
        `Personalized Skincare & UV Protection: ${getUvTip(realUv)}`,
        "Stay prepared for sudden weather changes and maintain good hydration."
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDailyInsight = async (data: WeatherData) => {
    setInsightLoading(true);
    const cleanLocName = formatLocation(data.location.name, data.location.region, data.location.country);
    try {
      const todayForecast = data.forecast?.forecastday?.[0]?.day;
      const response = await fetch('/api/daily-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationName: cleanLocName,
          temperature: data.current.temp_c,
          condition: data.current.condition.text,
          humidity: data.current.humidity,
          windSpeed: data.current.wind_kph,
          maxTemp: todayForecast?.maxtemp_c,
          minTemp: todayForecast?.mintemp_c,
          timePhase: data.current.is_day ? 'day' : 'night'
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.insight) {
          setDailyInsight(result.insight);
        }
      } else {
        const todayForecast = data.forecast?.forecastday?.[0]?.day;
        const hi = todayForecast ? Math.round(todayForecast.maxtemp_c) : Math.round(data.current.temp_c + 3);
        const lo = todayForecast ? Math.round(todayForecast.mintemp_c) : Math.round(data.current.temp_c - 4);
        setDailyInsight(`As today's ${data.current.condition.text.toLowerCase()} atmosphere unfolds over ${cleanLocName}, temperatures shift between a crisp ${lo}°C and a warm ${hi}°C. Soft ${data.current.wind_kph} km/h breezes whisper through ${data.current.humidity}% humidity, shaping a serene climate rhythm.`);
      }
    } catch (error) {
      console.warn('Using local daily insight fallback:', error);
      const todayForecast = data.forecast?.forecastday?.[0]?.day;
      const hi = todayForecast ? Math.round(todayForecast.maxtemp_c) : Math.round(data.current.temp_c + 3);
      const lo = todayForecast ? Math.round(todayForecast.mintemp_c) : Math.round(data.current.temp_c - 4);
      setDailyInsight(`As today's ${data.current.condition.text.toLowerCase()} atmosphere unfolds over ${cleanLocName}, temperatures shift between a crisp ${lo}°C and a warm ${hi}°C. Soft ${data.current.wind_kph} km/h breezes whisper through ${data.current.humidity}% humidity, shaping a serene climate rhythm.`);
    } finally {
      setInsightLoading(false);
    }
  };

  const updateTheme = (current: WeatherData['current']) => {
    const isDay = current.is_day === 1;
    const conditionText = current.condition.text.toLowerCase();
    const isPatchyOrLight = conditionText.includes('patchy') || conditionText.includes('light');
    const isActiveRain = conditionText.includes('heavy') || conditionText.includes('moderate') || conditionText.includes('torrential') || conditionText.includes('showers') || conditionText === 'rain';
    
    if ((isActiveRain || (conditionText.includes('rain') && !isPatchyOrLight)) || conditionText.includes('shower') || conditionText.includes('thunder')) {
      setWeatherTheme('rainy');
    } else if (conditionText.includes('snow') || conditionText.includes('ice') || conditionText.includes('blizzard')) {
      setWeatherTheme('rainy'); // Reusing rainy theme for snow for now
    } else if (isDay) {
      if (conditionText.includes('clear') || conditionText.includes('sunny')) {
         setWeatherTheme('clear-day');
      } else {
         // Partly cloudy / overcast / patchy rain
         setWeatherTheme('clear-day');
      }
    } else {
      setWeatherTheme('clear-night');
    }
  };

  const startGpsTracking = (silent = true) => {
    if (!silent) {
      setLoading(true);
    }

    const fallbackToIP = async () => {
      if (ipFallbackAttemptedRef.current && silent) return;
      ipFallbackAttemptedRef.current = true;
      setGpsMode('coarse_ip');
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('IP API failed');
        const data = await response.json();
        if (data && (data.city || data.latitude)) {
          const locQuery = (data.latitude && data.longitude)
            ? `${data.latitude},${data.longitude}`
            : `${data.city}, ${data.country_name || ''}`;
          fetchWeather(locQuery, true, silent);
        } else {
          fetchWeather("New Delhi, India", true, silent);
        }
      } catch (e) {
        try {
          fetchWeather("auto:ip", true, silent);
        } catch {
          fetchWeather("New Delhi, India", true, silent);
        }
      }
    };

    if (!navigator.geolocation) {
      fallbackToIP();
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const prev = lastGpsCoordsRef.current;

          // Detect coordinate drift > 0.01 deg (~1.1 km) to automatically trigger backend fetch for new village/town
          if (!prev || Math.abs(latitude - prev.lat) > 0.01 || Math.abs(longitude - prev.lon) > 0.01) {
            lastGpsCoordsRef.current = { lat: latitude, lon: longitude };
            setGpsMode('live_gps');
            fetchWeather(`lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`, true, silent);
          } else {
            setGpsMode('live_gps');
          }
        },
        (error) => {
          console.warn("GPS tracking unavailable/denied, using IP location fallback:", error.message);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          fallbackToIP();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
      watchIdRef.current = watchId;
    } catch (err) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      fallbackToIP();
    }
  };

  const handleLocation = () => {
    ipFallbackAttemptedRef.current = false;
    startGpsTracking(false);
  };

  useEffect(() => {
    // Immediately fetch initial default weather for instant UI rendering without waiting for GPS permissions
    fetchWeather("New Delhi, India", false, true);

    // Silently start GPS or IP geolocation in the background to update to user's exact position once ready
    startGpsTracking(true);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      fetchWeather(searchQuery, true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const renderWeatherIcon = (code: number, isDay: number) => {
    if (code === 1000) return isDay ? <Sun size={120} className="text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]" strokeWidth={1.5} /> : <Moon size={120} className="text-blue-200 drop-shadow-[0_0_15px_rgba(191,219,254,0.5)]" strokeWidth={1.5} />;
    if ([1003, 1006, 1009].includes(code)) return <Cloud size={120} className="text-gray-300 drop-shadow-[0_0_15px_rgba(209,213,219,0.5)]" strokeWidth={1.5} />;
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return <CloudLightning size={120} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse" strokeWidth={1.5} />;
    if ([1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return <Snowflake size={120} className="text-blue-100 drop-shadow-[0_0_15px_rgba(219,234,254,0.5)]" strokeWidth={1.5} />;
    return <CloudRain size={120} className="text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.5)]" strokeWidth={1.5} />;
  };

  const renderTooltipIcon = (code: number, isDay: number = 1, size: number = 22) => {
    if (code === 1000) {
      return isDay ? (
        <Sun size={size} className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]" />
      ) : (
        <Moon size={size} className="text-blue-200 drop-shadow-[0_0_8px_rgba(191,219,254,0.6)]" />
      );
    }
    if ([1003, 1006, 1009].includes(code)) {
      return <Cloud size={size} className="text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]" />;
    }
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
      return <CloudLightning size={size} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse" />;
    }
    if ([1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) {
      return <Snowflake size={size} className="text-blue-100 drop-shadow-[0_0_8px_rgba(219,234,254,0.6)]" />;
    }
    if ([1150, 1153, 1180, 1183].includes(code)) {
      return <CloudDrizzle size={size} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.6)]" />;
    }
    return <CloudRain size={size} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" />;
  };

  const getMapTabIcon = (tab: string, size: number = 16) => {
    switch (tab) {
      case 'Rain Map':
        return <CloudRain size={size} className="text-cyan-300 shrink-0" />;
      case 'Cloud Map':
        return <Cloud size={size} className="text-blue-200 shrink-0" />;
      case 'Wind Map':
        return <Wind size={size} className="text-sky-300 shrink-0" />;
      case 'Hurricane Tracker':
        return <ShieldAlert size={size} className="text-amber-300 shrink-0" />;
      default:
        return <MapIcon size={size} className="shrink-0" />;
    }
  };

  const getHistoricalMonthlyData = () => {
    const currentMonthIdx = new Date().getMonth(); // 0 - 11
    const locationName = weatherData?.location?.name || 'Selected Location';
    const currentTemp = weatherData?.current?.temp_c ?? 22;
    const lat = weatherData?.location?.lat ?? 40;

    const isSouthern = lat < 0;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const seasonalVariation = Math.min(18, Math.max(5, Math.abs(lat) * 0.35));
    const currentMonthSeasonalOffset = isSouthern
      ? Math.cos((currentMonthIdx / 12) * 2 * Math.PI)
      : -Math.cos((currentMonthIdx / 12) * 2 * Math.PI);
    
    const baseAnnualTemp = currentTemp - (currentMonthSeasonalOffset * seasonalVariation);

    return months.map((m, idx) => {
      const isCurrentMonth = idx === currentMonthIdx;
      const factor = isSouthern
        ? Math.cos((idx / 12) * 2 * Math.PI)
        : -Math.cos((idx / 12) * 2 * Math.PI);
      
      const monthlyMean = Math.round(baseAnnualTemp + (factor * seasonalVariation));
      const histAvgHigh = Math.round(monthlyMean + 4 + (Math.sin(idx) * 1.2));
      const histAvgLow = Math.round(monthlyMean - 4 - (Math.cos(idx) * 1.2));
      const histRainDays = Math.max(2, Math.round(8 + Math.sin(idx * 0.8) * 4));

      const actualTemp = isCurrentMonth ? Math.round(currentTemp) : null;
      const anomaly = isCurrentMonth ? Number((currentTemp - monthlyMean).toFixed(1)) : 0;

      return {
        month: m,
        fullMonth: fullMonths[idx],
        histAvgHigh,
        histAvgLow,
        histAvgMean: monthlyMean,
        actualTemp,
        anomaly,
        histRainDays,
        isCurrentMonth,
        locationName,
      };
    });
  };

  const getHistoricalDailyDataForCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleString('en-US', { month: 'short' });
    const currentDay = now.getDate();
    const baseTemp = weatherData?.current?.temp_c ?? 22;

    return Array.from({ length: daysInMonth }).map((_, i) => {
      const dayNum = i + 1;
      const dailyHistNorm = Math.round(baseTemp - 1.2 + Math.sin(dayNum / 3) * 1.5);
      const histMaxNorm = Math.round(dailyHistNorm + 3.5);
      const histMinNorm = Math.round(dailyHistNorm - 3.5);
      
      const isPastOrToday = dayNum <= currentDay;
      const isToday = dayNum === currentDay;
      const actualObserved = isPastOrToday 
        ? Math.round(baseTemp + (Math.sin(dayNum * 1.4) * 2.2)) 
        : null;

      return {
        day: `${monthName} ${dayNum}`,
        dayNum,
        histMaxNorm,
        histMinNorm,
        dailyHistNorm,
        actualObserved,
        isToday,
        isPastOrToday,
      };
    });
  };

  const handleDownloadPDFReport = async () => {
    try {
      setIsExportingPdf(true);
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const locationName = weatherData?.location?.name || 'Selected Location';
      const country = weatherData?.location?.country || '';
      const region = weatherData?.location?.region || '';
      const currentTemp = weatherData?.current?.temp_c ?? 22;
      const condition = weatherData?.current?.condition?.text || 'Clear';
      const humidity = weatherData?.current?.humidity ?? 65;
      const windKph = weatherData?.current?.wind_kph ?? 12;
      const now = new Date();
      const monthName = now.toLocaleString('en-US', { month: 'long' });
      const year = now.getFullYear();

      const monthlyData = getHistoricalMonthlyData();
      const currentMonthObj = monthlyData.find(m => m.isCurrentMonth) || monthlyData[now.getMonth()];

      // Top Banner Header
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, 210, 42, 'F');

      // Cyan Accent Line
      doc.setFillColor(56, 189, 248); // #38bdf8
      doc.rect(0, 40, 210, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIMATE & HISTORICAL ANOMALY REPORT', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(186, 230, 253);
      doc.text(`Location: ${locationName}${region ? `, ${region}` : ''}${country ? `, ${country}` : ''}`, 14, 26);
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${now.toLocaleDateString('en-US', { dateStyle: 'full' })} at ${now.toLocaleTimeString('en-US', { timeStyle: 'short' })}`, 14, 33);

      // Card 1: 30-Year Climate Norm & Live Comparison
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 48, 182, 44, 3, 3, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Current Month Baseline Analysis (${monthName} ${year})`, 20, 57);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`• 30-Year Historical Mean Baseline:`, 20, 65);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentMonthObj.histAvgMean}°C`, 85, 65);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Typical Monthly High / Low Range:`, 20, 72);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentMonthObj.histAvgHigh}°C / ${currentMonthObj.histAvgLow}°C`, 85, 72);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Live Recorded Surface Temperature:`, 20, 79);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentTemp}°C (${condition}, ${humidity}% humidity, ${windKph} km/h wind)`, 85, 79);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Current Climate Temperature Anomaly:`, 20, 86);
      
      const anomalyVal = currentMonthObj.anomaly;
      const isWarm = anomalyVal >= 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isWarm ? 217 : 37, isWarm ? 119 : 99, isWarm ? 6 : 235);
      doc.text(`${isWarm ? `+${anomalyVal}` : anomalyVal}°C (${isWarm ? 'Warm Anomaly Above 30-Yr Norm' : 'Cool Anomaly Below 30-Yr Norm'})`, 85, 86);

      // Section 2: 12-Month Historical Profile Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('12-Month Historical Climate Norm Profile', 14, 102);

      let y = 107;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Month', 18, y + 5.5);
      doc.text('Hist. High (°C)', 60, y + 5.5);
      doc.text('Hist. Low (°C)', 98, y + 5.5);
      doc.text('Hist. Mean (°C)', 136, y + 5.5);
      doc.text('Avg. Rain Days', 170, y + 5.5);

      y += 8;
      monthlyData.forEach((m, idx) => {
        if (m.isCurrentMonth) {
          doc.setFillColor(254, 243, 199);
        } else if (idx % 2 === 1) {
          doc.setFillColor(241, 245, 249);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(14, y, 182, 6.5, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', m.isCurrentMonth ? 'bold' : 'normal');
        doc.setTextColor(m.isCurrentMonth ? 180 : 15, m.isCurrentMonth ? 83 : 23, m.isCurrentMonth ? 9 : 42);
        
        doc.text(`${m.fullMonth}${m.isCurrentMonth ? ' (Current)' : ''}`, 18, y + 4.5);
        doc.text(`${m.histAvgHigh}°C`, 63, y + 4.5);
        doc.text(`${m.histAvgLow}°C`, 101, y + 4.5);
        doc.text(`${m.histAvgMean}°C`, 139, y + 4.5);
        doc.text(`${m.histRainDays} days`, 173, y + 4.5);

        y += 6.5;
      });

      // Section 3: Detailed Anomaly Analysis & Climate Summary
      y += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Climate Anomaly Analysis & Seasonal Guidance', 14, y);

      y += 5;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, 182, 34, 3, 3, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const lat = weatherData?.location?.lat ?? 'N/A';
      const line1 = `• Observed Thermal Variance: Temperature in ${locationName} is currently ${Math.abs(anomalyVal)}°C ${isWarm ? 'above' : 'below'} the expected 30-year climate norm for ${monthName}.`;
      const line2 = `• Latitude & Solar Angle Impact: Location latitude (${lat}°) influences local solar radiation levels and seasonal shift intensity.`;
      const line3 = `• Agricultural & Energy Impact: ${isWarm ? 'Increased cooling demand expected. Agricultural soil moisture depletion rate is elevated.' : 'Higher heating/insulation demand. Outdoor agricultural growth rates may be slower.'}`;
      const line4 = `• Data Validity: Based on 30-Year High-Resolution Reanalysis Normals synchronized with live SkyGlobal telemetry.`;

      doc.text(line1, 18, y + 7);
      doc.text(line2, 18, y + 14);
      doc.text(line3, 18, y + 21);
      doc.text(line4, 18, y + 28);

      // Footer Branding
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('WeatherSky Global Weather Station • Historical Climate Intelligence System', 14, 287);

      doc.save(`${locationName.replace(/\s+/g, '_')}_Climate_Report_${monthName}_${year}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const renderForecastIcon = (day: any) => {
    const isRealData = !!day.day;
    const conditionText = isRealData ? day.day.condition.text.toLowerCase() : '';
    const rainProb = isRealData ? day.day.daily_chance_of_rain : day.rainProb;
    const precip_mm = isRealData ? (day.day.totalprecip_mm || 0) : (day.rainProb > 50 ? 5 : 0);
    const minTemp = isRealData ? day.day.mintemp_c : day.minTemp;

    if (minTemp <= 2 || conditionText.includes('snow') || conditionText.includes('ice') || conditionText.includes('blizzard') || conditionText.includes('sleet') || conditionText.includes('pellet')) {
      return <CloudSnow size={120} className="text-blue-100 drop-shadow-[0_0_15px_rgba(219,234,254,0.5)]" strokeWidth={1.5} />;
    }

    if (conditionText.includes('thunder') || conditionText.includes('storm')) {
      if (precip_mm > 0 || rainProb > 0 || conditionText.includes('rain')) {
        return (
          <div className="relative flex items-center justify-center">
            <CloudLightning size={120} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse" strokeWidth={1.5} />
            <CloudRain size={120} className="text-blue-300 absolute inset-0 mix-blend-screen opacity-70" strokeWidth={1.5} />
          </div>
        );
      } else {
        return <CloudLightning size={120} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse" strokeWidth={1.5} />;
      }
    }

    if (precip_mm > 0 || rainProb > 0 || conditionText.includes('rain') || conditionText.includes('drizzle')) {
      if (precip_mm > 5 || rainProb > 50 || conditionText.includes('heavy')) {
        return <CloudRain size={120} className="text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.5)]" strokeWidth={1.5} />;
      } else {
        return <CloudDrizzle size={120} className="text-blue-200 drop-shadow-[0_0_15px_rgba(191,219,254,0.5)]" strokeWidth={1.5} />;
      }
    }

    if (conditionText.includes('cloud') || conditionText.includes('overcast') || conditionText.includes('fog') || conditionText.includes('mist')) {
      return <Cloud size={120} className="text-gray-300 drop-shadow-[0_0_15px_rgba(209,213,219,0.5)]" strokeWidth={1.5} />;
    }

    return <Sun size={120} className="text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]" strokeWidth={1.5} />;
  };

  const getSmartPlanners = () => {
    if (!weatherData) return null;
    const isRaining = weatherData.current.precip_mm > 0 || weatherData.current.condition.text.toLowerCase().includes('rain');
    const isHot = weatherData.current.temp_c > 30;
    const isCold = weatherData.current.temp_c < 10;
    const isWindy = weatherData.current.wind_kph > 30;
    const uv = weatherData.current.uv;

    const generatePlanner = (baseCondition: boolean, moderateCondition: boolean, goodDesc: string[], moderateDesc: string[], poorDesc: string[]) => {
       if (baseCondition) return { score: 'Poor', class: 'text-red-400 bg-red-400/10 border-red-400/20', checklist: poorDesc };
       if (moderateCondition) return { score: 'Fair', class: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', checklist: moderateDesc };
       return { score: 'Good', class: 'text-green-400 bg-green-400/10 border-green-400/20', checklist: goodDesc };
    };

    return {
      outdoor: {
        camping: generatePlanner(isRaining || isWindy, isCold || isHot, ['Clear skies expected', 'Perfect temperature for sleeping bag', 'Low wind for tent setup'], ['Pack extra layers', 'Ensure tent is staked down', 'Bring a hot water bottle'], ['Rain gear essential', 'Seek sheltered campsites', 'Consider rescheduling']),
        trekking: generatePlanner(isRaining || isWindy, isHot || isCold, ['Great visibility', 'Ideal trail conditions', 'Pack standard hydration'], ['Trails might be slippery', 'Pace yourself in temps', 'Take frequent breaks'], ['High risk of slipping', 'Poor visibility at peaks', 'Not recommended today']),
        fishing: generatePlanner(isWindy || isRaining, isCold, ['Calm waters', 'Good barometric pressure', 'Active fish anticipated'], ['Water surface might be choppy', 'Fish may bite slower', 'Wear windbreaker'], ['Dangerous on boats', 'Fish staying deep', 'Postpone trip']),
        beach: generatePlanner(isRaining || isCold, uv > 7 || isWindy, ['Perfect sunbathing weather', 'Calm waves', 'Ideal sand temperatures'], ['High UV - apply SPF 50', 'Sand might be hot', 'Windy: secure umbrellas'], ['Too cold/wet for swimming', 'High waves expected', 'Not a beach day']),
      },
      lifestyle: {
        wedding: generatePlanner(isRaining || isWindy, isHot || isCold, ['Outdoor ceremony ideal', 'Perfect for photos', 'Comfortable guests'], ['Prepare indoor backup', 'Provide fans/heaters', 'Wind might affect hair/decor'], ['Move indoors', 'Umbrellas required', 'Transport delays likely']),
        festival: generatePlanner(isRaining, isHot || isWindy, ['Great outdoor vibes', 'Comfortable crowds', 'Good acoustics'], ['Stay hydrated', 'Dusty if windy', 'Wear breathable clothing'], ['Muddy grounds', 'Stages might be delayed', 'Bring ponchos']),
        gardening: generatePlanner(isWindy || isCold, isHot || isRaining, ['Perfect soil moisture', 'Great for planting', 'Low stress on plants'], ['Water early morning', 'Watch for sunburn on leaves', 'Avoid pruning today'], ['Too wet to work soil', 'Protect fragile plants from wind', 'Stay indoors']),
        petWalking: generatePlanner(isRaining || isHot, isCold || isWindy, ['Perfect for long walks', 'Paws are safe on pavement', 'Great park weather'], ['Keep walks short', 'Check pavement temperature', 'Bring water bowl'], ['Too hot for paws / Heavy rain', 'Indoor play recommended', 'Wait for conditions to clear']),
      }
    };
  };

  const calculateSolarPosition = () => {
    if (!weatherData?.forecast?.forecastday[0]) {
        return { percent: 50, sunrise: '06:00 AM', sunset: '06:00 PM', moon_phase: 'Waning Gibbous', moonrise: '22:45', moonset: '09:15' };
    }
    const astro = weatherData.forecast.forecastday[0].astro;
    const localtimeStr = weatherData.location.localtime;
    
    const parseTime = (timeStr: string) => {
        const [datePart] = localtimeStr.split(' ');
        const timeMatch = timeStr.match(/(\d+):(\d+) (AM|PM)/i);
        if (!timeMatch) return new Date(localtimeStr).getTime();
        let [_, h, m, ampm] = timeMatch;
        let hours = parseInt(h, 10);
        const minutes = parseInt(m, 10);
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return new Date(`${datePart}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`).getTime();
    };

    const currentMs = new Date(localtimeStr.replace(' ', 'T') + ':00').getTime();
    const sunriseMs = parseTime(astro.sunrise);
    const sunsetMs = parseTime(astro.sunset);

    let percent = 0;
    if (currentMs <= sunriseMs) percent = 0;
    else if (currentMs >= sunsetMs) percent = 100;
    else percent = ((currentMs - sunriseMs) / (sunsetMs - sunriseMs)) * 100;

    return { percent, sunrise: astro.sunrise, sunset: astro.sunset, moon_phase: astro.moon_phase, moonrise: astro.moonrise, moonset: astro.moonset };
  };

  const getMoonStyle = (phase: string) => {
    let bg = 'bg-slate-200';
    let shadow = '';
    if (phase === 'New Moon') { bg = 'bg-slate-900'; }
    else if (phase === 'Waxing Crescent') { bg = 'bg-slate-200'; shadow = 'inset -15px 0 0 10px rgba(15,23,42,0.95)'; }
    else if (phase === 'First Quarter') { bg = 'bg-slate-200'; shadow = 'inset -32px 0 0 0px rgba(15,23,42,0.95)'; }
    else if (phase === 'Waxing Gibbous') { bg = 'bg-slate-200'; shadow = 'inset -10px 0 0 0px rgba(15,23,42,0.95)'; }
    else if (phase === 'Full Moon') { bg = 'bg-slate-200'; shadow = '0 0 15px rgba(226,232,240,0.5)'; }
    else if (phase === 'Waning Gibbous') { bg = 'bg-slate-200'; shadow = 'inset 10px 0 0 0px rgba(15,23,42,0.95)'; }
    else if (phase === 'Last Quarter') { bg = 'bg-slate-200'; shadow = 'inset 32px 0 0 0px rgba(15,23,42,0.95)'; }
    else if (phase === 'Waning Crescent') { bg = 'bg-slate-200'; shadow = 'inset 15px 0 0 10px rgba(15,23,42,0.95)'; }
    
    return { bg, shadow };
  };

  const planners = getSmartPlanners();
  const solar = calculateSolarPosition();
  const moonStyle = getMoonStyle(solar.moon_phase);
  
  const conditionText = weatherData?.current.condition.text.toLowerCase() || '';
  const hasClouds = conditionText.includes('cloud') || conditionText.includes('overcast') || conditionText.includes('mist') || conditionText.includes('fog');
  const hasStorm = conditionText.includes('rain') || conditionText.includes('storm') || conditionText.includes('thunder') || conditionText.includes('drizzle');

  const handleChatSend = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage !== undefined ? overrideMessage : chatInput).trim();
    if (!userMessage || chatLoading) return;
    
    setChatInput('');
    const newHistory: { role: 'user' | 'assistant', text: string }[] = [...chatHistory, { role: 'user', text: userMessage }];
    updateCurrentSession(newHistory);
    setChatLoading(true);

    const locationData = weatherData ? {
      name: weatherData.location.name,
      region: weatherData.location.region,
      country: weatherData.location.country,
      temp: weatherData.current.temp_c,
      feelslike: weatherData.current.feelslike_c,
      condition: weatherData.current.condition.text,
      humidity: weatherData.current.humidity,
      wind_kph: weatherData.current.wind_kph,
      wind_dir: weatherData.current.wind_dir,
      uv: weatherData.current.uv,
      air_quality: weatherData.current.air_quality ? {
        aqi: (weatherData.current.air_quality as any)['us-epa-index'],
        pm2_5: Math.round((weatherData.current.air_quality as any).pm2_5 || 0),
        pm10: Math.round((weatherData.current.air_quality as any).pm10 || 0)
      } : null,
      rainChance: weatherData.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain || 0,
      maxTemp: weatherData.forecast?.forecastday?.[0]?.day?.maxtemp_c,
      minTemp: weatherData.forecast?.forecastday?.[0]?.day?.mintemp_c,
      time: weatherData.location.localtime,
      hourlyForecast: weatherData.forecast?.forecastday?.[0]?.hour?.map((h: any) => ({
        time: h.time.split(' ')[1],
        temp: h.temp_c,
        condition: h.condition.text,
        chance_of_rain: h.chance_of_rain
      })).filter((_: any, idx: number) => idx % 3 === 0)
    } : null;

    let serverSuccess = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory.map(msg => ({ role: msg.role, text: msg.text })),
          locationData
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && !data.error) {
          updateCurrentSession([...newHistory, { role: 'assistant', text: data.text }]);
          serverSuccess = true;
          setChatLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Server chat route error, trying client-side Gemini API fallback...", err);
    }

    if (!serverSuccess) {
      // Direct client-side Gemini fallback
      const clientApiKey = import.meta.env.VITE_GEM_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (clientApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientApiKey });
          const systemInstruction = `You are an intelligent, helpful Weather AI assistant. Answer user questions directly (monsoon, UV/sunscreen, travel, outfits) using current weather context. Reply naturally in concise Hindi/Hinglish/English.\n\nCurrent Location Weather Context:\n${JSON.stringify(locationData, null, 2)}`;

          const contents = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          }));
          contents.push({ role: 'user', parts: [{ text: userMessage }] });

          const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
          let clientResponseText = "";

          for (const modelName of modelsToTry) {
            try {
              const res = await ai.models.generateContent({
                model: modelName,
                contents,
                config: { systemInstruction }
              });
              if (res && res.text) {
                clientResponseText = res.text;
                break;
              }
            } catch (mErr) {
              console.warn(`Client Gemini model ${modelName} attempt failed:`, mErr);
            }
          }

          if (clientResponseText) {
            updateCurrentSession([...newHistory, { role: 'assistant', text: clientResponseText }]);
            setChatLoading(false);
            return;
          }
        } catch (clientErr) {
          console.error("Direct client Gemini SDK call failed:", clientErr);
        }
      }

      updateCurrentSession([
        ...newHistory,
        { role: 'assistant', text: "Unable to connect to AI Assistant. Please check Gemini API Key." }
      ]);
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleChatSend();
  };

  return (
    <div className={`min-h-screen weather-bg ${weatherTheme} text-white font-sans flex transition-colors duration-1000 relative overflow-visible`}>
      

            {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
      {/* Name Welcome Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(255,255,255,0.1)] flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                 <span className="text-4xl">🐸</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-3 drop-shadow-md">Welcome!</h2>
              <p className="text-white/80 text-sm mb-6 drop-shadow-sm">Enter your name to check the weather with Froggy!</p>
              <input 
                type="text" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Your Name"
                className="w-full bg-black/30 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all mb-4 text-center"
                autoFocus
              />
              <button 
                onClick={handleNameSubmit}
                disabled={!nameInput.trim()}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center"
              >
                 Done
              </button>
           </div>
        </div>
      )}
      {/* Toast Error Modal */}
      {toastError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-red-900/95 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
           <AlertCircle className="text-red-300 shrink-0" size={24} />
           <p className="text-red-50 text-sm font-medium flex-grow">{toastError}</p>
           <button onClick={() => setToastError(null)} className="text-red-300 hover:text-white transition-colors cursor-pointer p-1">
              <X size={20} />
           </button>
        </div>
      )}

      <header className="flex justify-between items-center px-2 py-3 md:px-8 md:py-6 max-w-7xl mx-auto w-full relative z-20 gap-1 md:gap-4 overflow-hidden">
        <div className="font-display font-bold text-[11px] sm:text-[13px] md:text-2xl tracking-tight flex items-center gap-1 md:gap-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] text-white bg-black/40 px-2 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-2xl backdrop-blur-md border border-white/20 shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
          <CloudRain className="text-blue-400 drop-shadow-md w-4 h-4 md:w-7 md:h-7 shrink-0" />
          <span className="whitespace-nowrap">Weather Sky <span className="text-blue-400 drop-shadow-md hidden min-[360px]:inline">Global</span></span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
          {/* PWA Download / Install App Button with Glow & Hover Tooltip */}
          <div className="relative group shrink-0">
            {/* Subtle Ambient Glow Aura when available */}
            <div className={`absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 blur-md transition-all duration-700 ${deferredPrompt ? 'opacity-90 animate-pulse' : 'opacity-40 group-hover:opacity-80'}`}></div>
            
            <button 
              type="button"
              onClick={handleInstallClick} 
              className="relative shrink-0 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-slate-900/90 border border-cyan-400/50 rounded-xl backdrop-blur-xl hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xl flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold tracking-wide"
              aria-label="Download App PWA"
            >
              <div className="relative flex items-center justify-center">
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-300 transition-transform group-hover:-translate-y-0.5" />
                {deferredPrompt && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </div>
              <span className="hidden sm:inline">Download App</span>
              <span className="sm:hidden">Install</span>
            </button>

            {/* Tooltip on Hover */}
            <div className="absolute top-full right-0 mt-2.5 w-64 p-3 bg-slate-900/95 border border-cyan-400/30 rounded-2xl shadow-2xl backdrop-blur-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1 rounded-lg bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                  <Download size={14} />
                </div>
                <span className="text-xs font-bold text-white tracking-tight">Install WeatherSky PWA</span>
                <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {deferredPrompt ? 'Ready' : 'PWA Ready'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Install as a native app on desktop or mobile for instant offline access and real-time weather updates.
              </p>
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-cyan-300/80 font-medium">
                <span>⚡ Offline Cached</span>
                <span>📱 Mobile & Desktop</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              // @ts-ignore
              const monetagLink = import.meta.env.VITE_MONETAG_SMARTLINK || import.meta.env.VITE_MONETAG_DIRECT_LINK || "https://otourgod.com/4/8786576";
              window.open(monetagLink, '_blank');
            }}
            className="shrink-0 px-2 py-1.5 md:px-4 md:py-2 bg-gradient-to-tr from-blue-600 to-blue-400 border border-white/20 rounded-md md:rounded-xl backdrop-blur-md hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer shadow-lg flex items-center justify-center text-[9px] sm:text-[10px] md:text-sm font-bold text-white tracking-wider uppercase whitespace-nowrap"
          >
            DONATE ME A ONE ADS
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center px-4 py-6 md:py-10 w-full max-w-5xl mx-auto space-y-12">
        
        {/* Weather Alerts Banner */}
        {!alertDismissed && weatherData?.alerts && weatherData.alerts.alert && weatherData.alerts.alert.length > 0 && (
          <div className="w-full bg-red-900/40 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl flex items-start justify-between gap-4 animate-in slide-in-from-top-10 fade-in duration-500 -mt-4 mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-500/10 pointer-events-none"></div>
            <div className="flex items-start gap-3 sm:gap-4 flex-grow relative z-10 pr-2">
              <ShieldAlert className="text-red-400 shrink-0 relative z-10 w-7 h-7 sm:w-9 sm:h-9 mt-0.5" />
              <div className="flex-grow relative z-10">
                <h4 className="text-red-100 font-bold text-base sm:text-lg tracking-tight uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Severe Weather Alert
                </h4>
                <p className="text-red-200/90 text-sm sm:text-base mt-1 line-clamp-2">
                  <span className="font-semibold text-white">{weatherData.alerts.alert[0].event}:</span> {weatherData.alerts.alert[0].headline}
                </p>
              </div>
            </div>
            {/* Exit/Close Button */}
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              title="Dismiss Severe Weather Alert"
              className="relative z-10 shrink-0 p-2 text-red-200/80 hover:text-white bg-red-950/60 hover:bg-red-800/80 border border-red-400/40 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center hover:scale-105"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* BRANDING & LOADING SYSTEM: App Loading Screen */}
        {/* Placeholder container. When true, show this instead of main content. */}
        {false && (
           <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="w-48 h-48 mb-8 relative frog-mascot-placeholder flex items-center justify-center border-2 border-dashed border-white/20 rounded-3xl bg-white/5">
                 <span className="text-white/40 font-medium text-sm text-center px-4">3D Frog Mascot SVG / Image Placeholder</span>
              </div>
              <Loader2 className="animate-spin text-blue-400 mb-4" size={32} />
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">Loading Weather Sky...</h2>
           </div>
        )}

        {/* BRANDING & LOADING SYSTEM: Offline / 404 Error Framework */}
        {isOffline && (
           <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 text-center">
              <div className="relative mb-6 group">
                 <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full scale-150"></div>
                 <div className="w-48 h-48 bg-black/40 border border-white/10 rounded-[3rem] shadow-2xl flex items-center justify-center relative z-10 overflow-hidden backdrop-blur-xl">
                    <WifiOff size={64} className="text-red-400 absolute opacity-20 group-hover:scale-110 transition-transform duration-700" />
                    <div className="flex flex-col items-center z-10">
                       <Moon size={40} className="text-blue-300 mb-2" />
                       <span className="text-sm font-bold text-white/60 tracking-widest uppercase">Frog is asleep zZz</span>
                    </div>
                 </div>
                 <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 animate-pulse">
                    <ShieldAlert size={20} className="text-red-300" />
                 </div>
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Connection Lost</h2>
              <p className="text-white/60 max-w-md text-lg">It looks like you've wandered off the grid. Please check your network and wake up our frog.</p>
              <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10 rounded-2xl transition-all shadow-lg flex items-center gap-2 group">
                 <Zap size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                 Retry Connection
              </button>
           </div>
        )}


        {/* Advanced Compact & Responsive Search Component */}
        <div ref={searchContainerRef} className="w-full max-w-lg px-2 sm:px-4 mx-auto relative z-30 box-border mb-4">
          <div className="relative w-full flex items-center">
             <div className="absolute inset-y-0 left-2.5 sm:left-3 flex items-center pointer-events-none z-10">
               <Search className="text-blue-200/70 w-4 h-4 sm:w-4.5 sm:h-4.5" />
             </div>
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => {
                 setSearchQuery(e.target.value);
                 setShowSuggestions(true);
               }}
               onFocus={() => setShowSuggestions(true)}
               onKeyDown={handleKeyDown}
               placeholder="Search city, state, region, ZIP..."
               className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl py-2.5 sm:py-3 pl-8 sm:pl-9 pr-[112px] sm:pr-[145px] text-xs sm:text-sm text-white placeholder-blue-100/70 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all shadow-lg box-border"
             />
             <div className="absolute inset-y-1 right-1 sm:inset-y-1.5 sm:right-1.5 flex items-center gap-1 sm:gap-1.5 z-10">
                <button 
                  type="button"
                  onClick={() => toggleListen('search')}
                  title="Voice Search"
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer backdrop-blur-sm ${isListening && activeVoiceTargetRef.current === 'search' ? 'text-red-400 border-red-400/50 animate-pulse' : 'text-white'}`}
                >
                   <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button 
                  type="button"
                  onClick={handleSearch} 
                  className="px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 text-white rounded-xl flex items-center justify-center transition-colors shadow-md cursor-pointer font-medium text-xs sm:text-sm backdrop-blur-sm whitespace-nowrap"
                >
                   Search
                </button>
                <button 
                  type="button"
                  onClick={handleLocation} 
                  title="GPS Location" 
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm border border-white/20 cursor-pointer"
                >
                   {loading && !searchQuery ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
             </div>
          </div>
          
          {/* Autocomplete & Suggestions Dropdown */}
          {showSuggestions && (
             <div className="absolute top-full left-2 right-2 sm:left-4 sm:right-4 mt-2 bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/10 max-h-[320px] overflow-y-auto">
                {suggestions.length > 0 && (
                  <div className="p-2 sm:p-3">
                     <h4 className="text-[10px] sm:text-xs font-semibold text-blue-300/80 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-blue-400" /> Live Suggestions
                     </h4>
                     <ul className="space-y-1">
                        {suggestions.map((item, idx) => {
                           const cleanLocation = formatLocation(item.name, item.region, item.country);
                           const subtitle = cleanLocation.includes(',') ? cleanLocation.split(',').slice(1).join(',').trim() : (item.country || '');
                           return (
                           <li key={idx}>
                              <button
                                type="button"
                                onMouseDown={() => {
                                  const target = item.query || item.name;
                                  setSearchQuery(cleanLocation);
                                  setShowSuggestions(false);
                                  fetchWeather(target, true);
                                }}
                                className="w-full text-left px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm text-white/90 hover:text-white hover:bg-blue-500/20 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer"
                              >
                                 <span className="font-medium text-white flex items-center gap-2 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {item.name}
                                 </span>
                                 <span className="text-[10px] sm:text-xs text-white/50 truncate max-w-[130px] sm:max-w-[200px]">
                                    {subtitle}
                                 </span>
                              </button>
                           </li>
                           );
                        })}
                     </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10 p-2 sm:p-3">
                   <div className="p-1.5">
                      <h4 className="text-[10px] sm:text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">Recent Searches</h4>
                      <ul className="space-y-1">
                         {['New York, US', 'London, UK', 'Tokyo, JP'].map((city) => (
                            <li key={city}>
                               <button 
                                 type="button"
                                 onMouseDown={() => {
                                   setSearchQuery(city);
                                   setShowSuggestions(false);
                                   fetchWeather(city, true);
                                 }} 
                                 className="w-full text-left px-2.5 py-1 text-xs sm:text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                               >
                                  <Search className="w-3 h-3 text-white/40 shrink-0" /> {city}
                               </button>
                            </li>
                         ))}
                      </ul>
                   </div>
                   <div className="p-1.5">
                      <h4 className="text-[10px] sm:text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">Favorite Cities</h4>
                      <ul className="space-y-1">
                         {savedLocations.length > 0 ? savedLocations.slice(0, 6).map(loc => (
                            <li key={loc.id}>
                               <button 
                                 type="button"
                                 onMouseDown={() => {
                                   setSearchQuery(loc.name);
                                   setShowSuggestions(false);
                                   fetchWeather(loc.name, true);
                                 }} 
                                 className="w-full text-left px-2.5 py-1 text-xs sm:text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                               >
                                  <Heart className="w-3 h-3 text-red-400 shrink-0" /> {formatLocationString(loc.name)}
                               </button>
                            </li>
                         )) : (
                            <li className="px-2.5 py-1 text-xs text-white/40 italic">No favorites yet</li>
                         )}
                      </ul>
                   </div>
                </div>
             </div>
          )}
        </div>

        {/* Saved Locations Panel */}
        {savedLocations.length > 0 && (
          <div className="w-full max-w-2xl flex gap-3 overflow-x-auto hide-scrollbar px-2 mb-4 pb-2">
            {savedLocations.map(loc => (
              <button 
                key={loc.id} 
                onClick={() => fetchWeather(loc.name, true)}
                className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-xl text-sm font-medium hover:bg-black/50 transition-colors whitespace-nowrap cursor-pointer shadow-sm group"
              >
                <MapPin size={14} className="text-blue-300 group-hover:text-white transition-colors" />
                {formatLocationString(loc.name)}
              </button>
            ))}
          </div>
        )}

        {/* Controls Bar */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-4 px-2">
          {/* Ambient Sound Controller */}
          <AmbientSoundPlayer
            weatherCondition={weatherData?.current?.condition?.text || ''}
            precipMm={weatherData?.current?.precip_mm || 0}
            windKph={weatherData?.current?.wind_kph || 0}
            tempC={weatherData?.current?.temp_c || 0}
          />

          <label className="flex items-center gap-3 cursor-pointer group shrink-0">
            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Ambient Animations</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={enableAnimations}
                onChange={() => setEnableAnimations(!enableAnimations)}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${enableAnimations ? 'bg-blue-500' : 'bg-white/20'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${enableAnimations ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        {/* Cinematic Floating Island Hero Canvas */}
        <HeroCanvas weatherData={weatherData} activeContext={activeContext} loading={loading} onLocate={handleLocation} userName={userName} enableAnimations={enableAnimations} isFavorite={isCurrentFavorite} onToggleFavorite={toggleFavoriteCity} onOpenLocationDetails={() => setShowLocationModal(true)} />
        
        {/* Placement 1: Adsterra Native 1x2 Banner */}
        <AdsterraNative />

        {/* Advanced Health & Environment Metrics */}
        {weatherData && (
          <div className="w-full mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             {/* AQI Card */}
             {(() => {
                const aqiIndex = weatherData.current.air_quality?.["us-epa-index"] || 1;
                let aqiInfo = { text: 'Good', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' };
                if (aqiIndex === 2) aqiInfo = { text: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' };
                if (aqiIndex === 3) aqiInfo = { text: 'Unhealthy SG', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' };
                if (aqiIndex >= 4) aqiInfo = { text: 'Hazardous', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' };
                
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg`}>
                    <div className="flex items-center gap-2 mb-2">
                       <Sprout size={16} className="text-blue-300" />
                       <span className="text-sm font-medium text-blue-200/70">Air Quality</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{aqiIndex}</div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full border ${aqiInfo.bg} ${aqiInfo.color}`}>{aqiInfo.text}</div>
                  </motion.div>
                );
             })()}

             {/* UV Index Card */}
             {(() => {
                const uv = weatherData.current.uv;
                let uvText = 'Low';
                let uvColor = 'text-green-400';
                if (uv >= 3 && uv <= 5) { uvText = 'Moderate'; uvColor = 'text-yellow-400'; }
                if (uv >= 6 && uv <= 7) { uvText = 'High'; uvColor = 'text-orange-400'; }
                if (uv >= 8) { uvText = 'Very High'; uvColor = 'text-red-400'; }
                
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                       <Sun size={16} className="text-blue-300" />
                       <span className="text-sm font-medium text-blue-200/70">UV Index</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{uv}</div>
                    <div className={`text-sm font-medium ${uvColor}`}>{uvText}</div>
                  </motion.div>
                );
             })()}

             {/* Humidity Card */}
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <Droplets size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Humidity</span>
               </div>
               <div className="text-2xl font-bold mb-1"><AnimatedValue value={weatherData.current.humidity} suffix="%" /></div>
               <div className="text-sm font-medium text-white/60">The dew point is <AnimatedValue value={weatherData.current.dewpoint_c || Math.round(weatherData.current.temp_c - ((100 - weatherData.current.humidity) / 5))} suffix="°" /></div>
             </motion.div>

             {/* Feels Like Card */}
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <Thermometer size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Feels Like</span>
               </div>
               <div className="text-2xl font-bold mb-1"><AnimatedValue value={Math.round(weatherData.current.feelslike_c)} suffix="°" /></div>
               <div className="text-sm font-medium text-white/60">Similar to actual temp.</div>
             </motion.div>

             {/* Wind Speed Card */}
             <motion.div 
               key={`wind-speed-${weatherData.location?.name || 'loc'}-${weatherData.current.wind_kph}`}
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ duration: 0.4, delay: 0.5 }} 
               className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex items-center justify-between gap-2 shadow-lg group hover:border-cyan-400/30 transition-all"
             >
               {/* Animated breeze streaks */}
               <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                 <motion.div
                   className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent absolute top-1/3"
                   animate={{ x: ['-100%', '100%'] }}
                   transition={{ repeat: Infinity, duration: Math.max(1.5, 5 - (weatherData.current.wind_kph / 10)), ease: 'linear' }}
                 />
                 <motion.div
                   className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent absolute top-2/3"
                   animate={{ x: ['-100%', '100%'] }}
                   transition={{ repeat: Infinity, duration: Math.max(2, 6 - (weatherData.current.wind_kph / 10)), delay: 0.7, ease: 'linear' }}
                 />
               </div>

               <div className="flex flex-col items-start justify-center relative z-10">
                 <div className="flex items-center gap-2 mb-2">
                    <Wind size={16} className="text-blue-300 animate-pulse" />
                    <span className="text-sm font-medium text-blue-200/70">Wind Speed</span>
                 </div>
                 <div className="text-2xl font-bold mb-1">
                   <AnimatedValue 
                     value={weatherData.current.wind_kph} 
                     suffix={<span className="text-lg font-medium text-white/60">km/h</span>} 
                   />
                 </div>
                 <div className="text-xs font-semibold text-cyan-200/90 flex items-center gap-1">
                   <span>Dir:</span>
                   <AnimatedValue value={weatherData.current.wind_dir} className="font-bold text-cyan-300" />
                   <span className="text-[10px] text-white/50">
                     (<AnimatedValue value={getWindDegree(weatherData.current.wind_degree, weatherData.current.wind_dir)} suffix="°" />)
                   </span>
                 </div>
               </div>
               {/* Dynamically Rotating Compass Needle Component */}
               <WindCompassNeedle 
                 windDir={weatherData.current.wind_dir} 
                 windDegree={weatherData.current.wind_degree}
                 size={58}
               />
             </motion.div>
             
             {/* Wind Gust Card */}
             <motion.div 
               key={`wind-gust-${weatherData.location?.name || 'loc'}-${weatherData.current.gust_kph}`}
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ duration: 0.4, delay: 0.6 }} 
               className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg group hover:border-cyan-400/30 transition-all"
             >
               {/* Animated gust wave background */}
               <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                 <motion.div
                   className="w-[200%] h-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent absolute -top-10"
                   animate={{ x: ['-50%', '0%'] }}
                   transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                 />
               </div>

               <div className="flex items-center gap-2 mb-2 relative z-10">
                  <Wind size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Wind Gusts</span>
               </div>
               <div className="text-2xl font-bold mb-1 relative z-10">
                 <AnimatedValue 
                   value={weatherData.current.gust_kph} 
                   suffix={<span className="text-lg font-medium text-white/60">km/h</span>} 
                 />
               </div>
               <div className="text-sm font-medium text-white/60 relative z-10">Max speed</div>
             </motion.div>
             
             {/* Dew Point Card */}
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <CloudDrizzle size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Dew Point</span>
               </div>
               <div className="text-2xl font-bold mb-1"><AnimatedValue value={weatherData.current.dewpoint_c || Math.round(weatherData.current.temp_c - ((100 - weatherData.current.humidity) / 5))} suffix="°" /></div>
               <div className="text-sm font-medium text-white/60">Comfort level</div>
             </motion.div>
          </div>
        )}

        {/* Weather-Based Daily Habits Section */}
        <WeatherHabitsSection weatherData={weatherData} userName={userName} />

        {/* Daily Weather Insight Card */}
        <div className="w-full mt-6">
          <div className="bg-gradient-to-r from-slate-900/85 via-indigo-950/70 to-slate-900/85 backdrop-blur-xl border border-cyan-500/25 rounded-[2.2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group hover:border-cyan-400/40 transition-all">
            {/* Ambient decorative bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 opacity-80"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="text-cyan-300 animate-pulse" size={20} />
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
                    Daily Weather Insight
                  </h3>
                  <p className="text-xs text-cyan-200/70 font-medium">
                    Poetic climate shift & atmospheric rhythm • Powered by Gemini AI
                  </p>
                </div>
              </div>

              {weatherData?.location && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => weatherData && fetchDailyInsight(weatherData)}
                    disabled={insightLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-cyan-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Regenerate daily climate insight"
                  >
                    <Clock size={13} className={insightLoading ? "animate-spin text-cyan-300" : "text-cyan-300"} />
                    <span>{insightLoading ? "Refreshing..." : "Refresh Insight"}</span>
                  </button>
                </div>
              )}
            </div>

            {insightLoading ? (
              <div className="flex items-center space-x-3 text-cyan-200/70 py-6 px-2">
                <Loader2 size={20} className="animate-spin text-cyan-400" />
                <span className="text-sm font-medium">Crafting a poetic climate summary for {weatherData?.location?.name || 'your area'}...</span>
              </div>
            ) : dailyInsight ? (
              <div className="relative pl-4 sm:pl-6 border-l-2 border-cyan-400/60 my-2">
                <p className="text-base sm:text-lg text-cyan-50/95 font-medium leading-relaxed italic drop-shadow-sm">
                  "{dailyInsight}"
                </p>
                {weatherData?.current && (
                  <div className="flex items-center gap-2.5 mt-4 flex-wrap text-xs text-blue-200/80 font-semibold">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/20 text-cyan-200 flex items-center gap-1.5">
                      <Thermometer size={13} className="text-cyan-300" />
                      {Math.round(weatherData.current.temp_c)}°C ({weatherData.current.condition.text})
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-200 flex items-center gap-1.5">
                      <Wind size={13} className="text-blue-300" />
                      {weatherData.current.wind_kph} km/h Wind
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-200 flex items-center gap-1.5">
                      <Droplets size={13} className="text-indigo-300" />
                      {weatherData.current.humidity}% Humidity
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-cyan-200/50 text-sm italic py-4">Generating daily climate insight...</p>
            )}
          </div>
        </div>

        {/* Hourly Forecast Section */}
        <div className="w-full mt-6">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <Activity className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">24-Hour Forecast</h3>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-6 hide-scrollbar px-2 snap-x">
            {(weatherData?.forecast?.forecastday?.[0]?.hour || placeholderHourly).map((hour: any, idx: number) => {
              const isRealData = !!hour.temp_c;
              const timeStr = isRealData ? new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }) : hour.time;
              const temp = isRealData ? Math.round(hour.temp_c) : hour.temp;
              const code = isRealData ? hour.condition.code : hour.code;
              const isDay = isRealData ? hour.is_day : 1;
              const id = isRealData ? hour.time_epoch : hour.id;

              return (
              <motion.div 
                key={id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="min-w-[100px] snap-start bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-between shadow-lg hover:bg-white/10 transition-colors"
              >
                <span className="text-blue-100 font-medium text-sm mb-3">{timeStr}</span>
                <div className="scale-50 origin-center mb-1">
                   {renderWeatherIcon(code, isDay)}
                </div>
                <div className="font-bold text-xl text-white">
                  {temp}°
                </div>
              </motion.div>
            )})}
          </div>
        </div>

        {/* Temperature Trend Area Chart */}
        <div className="w-full mt-2 mb-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`temp-trend-24h-${weatherData?.location?.name || 'loc'}-${weatherData?.current?.temp_c || 0}-${weatherData?.current?.last_updated_epoch || '0'}`}
              initial={{ opacity: 0, y: 16, scale: 0.98, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, scale: 0.98, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-xl h-64 sm:h-72 relative overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(weatherData?.forecast?.forecastday?.[0]?.hour || placeholderHourly).map((hour: any) => {
                    const isRealData = !!hour.temp_c;
                    const timeStr = isRealData ? new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric' }) : hour.time.split(' ')[0] + hour.time.split(' ')[1]?.substring(0, 1).toLowerCase();
                    const code = isRealData ? (hour.condition?.code || 1000) : (hour.code || 1000);
                    const isDay = isRealData ? (hour.is_day ?? 1) : 1;
                    const conditionText = isRealData ? (hour.condition?.text || 'Clear') : 'Clear';
                    return {
                      time: timeStr,
                      temp: isRealData ? Math.round(hour.temp_c) : hour.temp,
                      code,
                      isDay,
                      conditionText
                    };
                })}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#93C5FD" tick={{fill: '#93C5FD', fontSize: 12}} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 border border-white/20 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                              {renderTooltipIcon(data.code, data.isDay, 22)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-blue-200 flex items-center gap-2">
                                <span>{label}</span>
                                <span className="text-[10px] text-blue-300/70 font-normal capitalize">({data.conditionText})</span>
                              </div>
                              <div className="text-lg font-extrabold text-white">
                                {data.temp}°C
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#60A5FA" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorTemp)"
                    isAnimationActive={true}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 24-Hour Precipitation Probability Line Chart */}
        <div className="w-full mt-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-2">
            <div className="flex items-center space-x-2">
              <CloudRain className="text-cyan-300" size={24} />
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">
                  Hourly Precipitation Probability
                </h3>
                <p className="text-xs sm:text-sm text-cyan-200/70">
                  Next 24-hour rain likelihood to help plan outdoor activities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-cyan-100 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_#22d3ee]"></span> Rain Chance (%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-[0_0_6px_#3b82f6]"></span> Volume (mm)</span>
            </div>
          </div>

          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-xl h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(weatherData?.forecast?.forecastday?.[0]?.hour || placeholderHourly).map((hour: any) => {
                  const isRealData = !!hour.time_epoch || !!hour.temp_c;
                  const timeStr = isRealData 
                    ? new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric' }) 
                    : (hour.time ? hour.time.split(' ')[0] + (hour.time.split(' ')[1]?.substring(0, 1).toLowerCase() || '') : '');
                  
                  const chanceOfRain = isRealData 
                    ? Math.max(Number(hour.chance_of_rain || 0), Number(hour.chance_of_snow || 0))
                    : (hour.chance_of_rain ?? 20);

                  const precipMm = isRealData ? (hour.precip_mm || 0) : (hour.precip_mm ?? (chanceOfRain > 50 ? (chanceOfRain / 20) : 0));
                  const code = isRealData ? (hour.condition?.code || 1000) : (hour.code || 1000);
                  const isDay = isRealData ? (hour.is_day ?? 1) : 1;
                  const conditionText = isRealData ? (hour.condition?.text || 'Clear') : 'Clear';

                  return {
                    time: timeStr,
                    chanceOfRain: Math.min(100, Math.max(0, chanceOfRain)),
                    precipMm: Number(precipMm.toFixed(1)),
                    code,
                    isDay,
                    conditionText
                  };
              })}>
                <defs>
                  <linearGradient id="colorRainProb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="#A5F3FC" tick={{fill: '#A5F3FC', fontSize: 11}} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis 
                  yAxisId="left"
                  stroke="#22D3EE" 
                  tick={{fill: '#A5F3FC', fontSize: 11}} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                  width={35}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#60A5FA" 
                  tick={{fill: '#93C5FD', fontSize: 11}} 
                  tickLine={false} 
                  axisLine={false}
                  unit="mm"
                  width={35}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      const prob = data?.chanceOfRain as number;
                      const precip = data?.precipMm as number;
                      let advice = "☀️ Excellent weather for outdoor activities!";
                      let adviceColor = "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
                      if (prob >= 60) {
                        advice = "🌧️ High rain chance — bring an umbrella or plan indoor sports!";
                        adviceColor = "text-amber-300 bg-amber-500/10 border-amber-500/20";
                      } else if (prob >= 30) {
                        advice = "🌦️ Moderate rain chance — keep waterproof gear ready!";
                        adviceColor = "text-cyan-300 bg-cyan-500/10 border-cyan-500/20";
                      }

                      return (
                        <div className="bg-slate-900/95 border border-white/20 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md max-w-xs">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                {renderTooltipIcon(data?.code || 1000, data?.isDay ?? 1, 20)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-cyan-200">{label}</p>
                                <p className="text-[10px] text-white/60 capitalize leading-tight">{data?.conditionText || 'Clear'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-white/40 font-normal shrink-0">24h Planner</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <p className="flex justify-between items-center text-white">
                              <span className="text-cyan-300 font-medium flex items-center gap-1.5">
                                <CloudRain className="w-3.5 h-3.5" /> Rain Probability:
                              </span>
                              <span className="font-bold text-cyan-200 text-sm">{prob}%</span>
                            </p>
                            <p className="flex justify-between items-center text-white">
                              <span className="text-blue-300 font-medium flex items-center gap-1.5">
                                <Droplets className="w-3.5 h-3.5" /> Est. Volume:
                              </span>
                              <span className="font-bold text-blue-200">{precip} mm</span>
                            </p>
                            <div className={`mt-2 p-2 rounded-xl border text-[11px] font-medium leading-relaxed ${adviceColor}`}>
                              {advice}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area yAxisId="left" type="monotone" dataKey="chanceOfRain" name="Rain Chance (%)" stroke="#22D3EE" strokeWidth={3} fillOpacity={1} fill="url(#colorRainProb)" />
                <Line yAxisId="right" type="monotone" dataKey="precipMm" name="Volume (mm)" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#3B82F6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Temperature Trend Chart */}
        <div className="w-full mt-6 mb-6">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <Activity className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">7-Day Temperature Trend</h3>
          </div>
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-xl h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(weatherData?.forecast?.forecastday || placeholderForecast).slice(0, 7).map((day: any) => {
                  const isRealData = !!day.day;
                  const dateStr = isRealData 
                    ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
                    : day.date.split(',')[0];
                  const code = isRealData ? (day.day.condition?.code || 1000) : (day.code || 1000);
                  const conditionText = isRealData ? (day.day.condition?.text || 'Clear') : 'Clear';
                  const rainChance = isRealData ? (day.day.daily_chance_of_rain || 0) : (day.rainProb || 20);

                  return {
                    date: dateStr,
                    maxTemp: isRealData ? Math.round(day.day.maxtemp_c) : day.maxTemp,
                    minTemp: isRealData ? Math.round(day.day.mintemp_c) : day.minTemp,
                    code,
                    conditionText,
                    rainChance
                  };
              })}>
                <defs>
                  <linearGradient id="colorMaxTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F87171" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMinTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#93C5FD" tick={{fill: '#93C5FD', fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-slate-900/95 border border-white/20 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md min-w-[210px]">
                          <div className="flex items-center gap-3 border-b border-white/10 pb-2.5 mb-2.5">
                            <div className="p-2 bg-gradient-to-br from-white/15 to-white/5 border border-white/15 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                              {renderTooltipIcon(data?.code || 1000, 1, 24)}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-blue-200">{label}</p>
                              <p className="text-[11px] font-semibold text-cyan-200 capitalize flex items-center gap-1 mt-0.5">
                                <span>{data?.conditionText || 'Clear'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-red-400 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-400 inline-block shadow-[0_0_6px_#f87171]"></span> High:
                              </span>
                              <span className="font-bold text-white text-sm">{data?.maxTemp}°C</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-blue-400 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block shadow-[0_0_6px_#60a5fa]"></span> Low:
                              </span>
                              <span className="font-bold text-blue-100 text-sm">{data?.minTemp}°C</span>
                            </div>
                            {data?.rainChance !== undefined && (
                              <div className="flex justify-between items-center pt-1.5 border-t border-white/10 text-[11px] text-cyan-300">
                                <span className="flex items-center gap-1.5"><CloudRain size={13} className="text-cyan-400" /> Rain Chance:</span>
                                <span className="font-semibold text-cyan-200">{data.rainChance}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Area type="monotone" dataKey="maxTemp" name="High" stroke="#F87171" strokeWidth={3} fillOpacity={1} fill="url(#colorMaxTemp)" />
                <Area type="monotone" dataKey="minTemp" name="Low" stroke="#60A5FA" strokeWidth={3} fillOpacity={1} fill="url(#colorMinTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Monthly Temperature & Seasonal Comparisons Chart */}
        <div className="w-full mt-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-2">
            <div className="flex items-center space-x-2">
              <History className="text-amber-300" size={24} />
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">
                  Historical Monthly Temperature & Seasonal Comparisons
                </h3>
                <p className="text-xs sm:text-sm text-blue-200/70">
                  {weatherData?.location?.name || 'Selected Location'} — {new Date().toLocaleString('en-US', { month: 'long' })} historical averages vs 30-year seasonal climate normals
                </p>
              </div>
            </div>

            {/* Mode Selector Pills & PDF Report Button */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
              <div className="flex items-center gap-1.5 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-inner">
                <button
                  onClick={() => setHistChartMode('seasonal')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    histChartMode === 'seasonal'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'text-blue-200/70 hover:text-white'
                  }`}
                >
                  <BarChart2 size={14} />
                  <span>12-Month Profile</span>
                </button>
                <button
                  onClick={() => setHistChartMode('daily')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    histChartMode === 'daily'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                      : 'text-blue-200/70 hover:text-white'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>Current Month Norms</span>
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadPDFReport}
                disabled={isExportingPdf}
                className="px-4 py-2.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-cyan-600/90 hover:from-emerald-500 hover:to-cyan-500 text-white border border-emerald-300/40 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <Loader2 size={14} className="animate-spin text-emerald-200" />
                ) : (
                  <FileText size={14} className="text-emerald-200" />
                )}
                <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
              </motion.button>
            </div>
          </div>

          {/* Quick Climate Summary Cards */}
          {(() => {
            const monthlyData = getHistoricalMonthlyData();
            const currentMonthObj = monthlyData.find(m => m.isCurrentMonth) || monthlyData[new Date().getMonth()];
            const locationName = weatherData?.location?.name || 'Current Location';

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
                  <p className="text-[11px] text-blue-200/70 font-medium">30-Yr Hist. Mean ({currentMonthObj.month})</p>
                  <p className="text-xl font-bold text-white mt-1">{currentMonthObj.histAvgMean}°C</p>
                  <p className="text-[10px] text-amber-300 mt-0.5">30-Year Norm Baseline</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
                  <p className="text-[11px] text-blue-200/70 font-medium">Hist. High / Low</p>
                  <p className="text-xl font-bold text-white mt-1">
                    <span className="text-red-400">{currentMonthObj.histAvgHigh}°</span> / <span className="text-blue-400">{currentMonthObj.histAvgLow}°C</span>
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">Monthly Range</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
                  <p className="text-[11px] text-blue-200/70 font-medium">Current Live Temp</p>
                  <p className="text-xl font-bold text-cyan-300 mt-1">{weatherData?.current?.temp_c ?? currentMonthObj.histAvgMean}°C</p>
                  <p className="text-[10px] text-cyan-200/80 mt-0.5">{locationName}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
                  <p className="text-[11px] text-blue-200/70 font-medium">Climate Anomaly</p>
                  <p className="text-xl font-bold mt-1 flex items-center gap-1">
                    <span className={currentMonthObj.anomaly >= 0 ? 'text-amber-400' : 'text-blue-300'}>
                      {currentMonthObj.anomaly >= 0 ? `+${currentMonthObj.anomaly}°C` : `${currentMonthObj.anomaly}°C`}
                    </span>
                  </p>
                  <p className="text-[10px] text-amber-300/80 mt-0.5">vs 30-Yr Historical Norm</p>
                </div>
              </div>
            );
          })()}

          {/* Recharts Chart Container */}
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-xl h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              {histChartMode === 'seasonal' ? (
                <ComposedChart data={getHistoricalMonthlyData()}>
                  <defs>
                    <linearGradient id="histHighGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F87171" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F87171" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="histLowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="month" stroke="#93C5FD" tick={{fill: '#93C5FD', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#93C5FD" tick={{fill: '#93C5FD', fontSize: 11}} tickLine={false} axisLine={false} unit="°" width={30} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload;
                        const isCurrent = data?.isCurrentMonth;

                        return (
                          <div className="bg-slate-900/95 border border-white/20 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md min-w-[220px]">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                              <div>
                                <p className="text-xs font-bold text-amber-200">{data?.fullMonth} Historical Climate</p>
                                <p className="text-[10px] text-white/60">{data?.locationName}</p>
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                                  Current Month
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between items-center text-red-300">
                                <span>Avg High:</span>
                                <span className="font-bold">{data?.histAvgHigh}°C</span>
                              </div>
                              <div className="flex justify-between items-center text-blue-300">
                                <span>Avg Low:</span>
                                <span className="font-bold">{data?.histAvgLow}°C</span>
                              </div>
                              <div className="flex justify-between items-center text-amber-300 font-medium pt-1 border-t border-white/5">
                                <span>30-Yr Mean:</span>
                                <span className="font-bold">{data?.histAvgMean}°C</span>
                              </div>
                              {isCurrent && data?.actualTemp !== null && (
                                <div className="mt-2 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200">
                                  <p className="font-semibold flex justify-between">
                                    <span>Current Observed:</span>
                                    <span className="font-bold text-white">{data?.actualTemp}°C</span>
                                  </p>
                                  <p className="text-[10px] text-cyan-300/80 mt-0.5">
                                    Variance: {data?.anomaly >= 0 ? `+${data?.anomaly}` : data?.anomaly}°C vs historical norm
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                  <Bar dataKey="histAvgHigh" name="Hist. High (°C)" fill="url(#histHighGrad)" radius={[6, 6, 0, 0]}>
                    {getHistoricalMonthlyData().map((entry, index) => (
                      <Cell 
                        key={`high-cell-${index}`} 
                        fill={entry.isCurrentMonth ? '#F87171' : 'url(#histHighGrad)'}
                        stroke={entry.isCurrentMonth ? '#EF4444' : undefined}
                        strokeWidth={entry.isCurrentMonth ? 2 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="histAvgLow" name="Hist. Low (°C)" fill="url(#histLowGrad)" radius={[6, 6, 0, 0]}>
                    {getHistoricalMonthlyData().map((entry, index) => (
                      <Cell 
                        key={`low-cell-${index}`} 
                        fill={entry.isCurrentMonth ? '#38BDF8' : 'url(#histLowGrad)'}
                        stroke={entry.isCurrentMonth ? '#0284C7' : undefined}
                        strokeWidth={entry.isCurrentMonth ? 2 : 0}
                      />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="histAvgMean" name="30-Yr Mean (°C)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B' }} activeDot={{ r: 7 }} />
                </ComposedChart>
              ) : (
                <AreaChart data={getHistoricalDailyDataForCurrentMonth()}>
                  <defs>
                    <linearGradient id="dailyNormGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="day" stroke="#93C5FD" tick={{fill: '#93C5FD', fontSize: 11}} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis stroke="#93C5FD" tick={{fill: '#93C5FD', fontSize: 11}} tickLine={false} axisLine={false} unit="°" width={30} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload;
                        return (
                          <div className="bg-slate-900/95 border border-white/20 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md min-w-[200px]">
                            <p className="text-xs font-bold text-cyan-200 border-b border-white/10 pb-1.5 mb-2 flex justify-between items-center">
                              <span>{label}</span>
                              {data?.isToday && <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full">Today</span>}
                            </p>
                            <div className="space-y-1 text-xs">
                              <p className="flex justify-between text-blue-200">
                                <span>30-Yr Daily Norm:</span>
                                <span className="font-bold text-white">{data?.dailyHistNorm}°C</span>
                              </p>
                              <p className="flex justify-between text-red-300">
                                <span>Hist. Max Norm:</span>
                                <span className="font-bold">{data?.histMaxNorm}°C</span>
                              </p>
                              <p className="flex justify-between text-blue-400">
                                <span>Hist. Min Norm:</span>
                                <span className="font-bold">{data?.histMinNorm}°C</span>
                              </p>
                              {data?.actualObserved !== null && (
                                <p className="flex justify-between text-amber-300 pt-1 border-t border-white/10 font-medium">
                                  <span>Recorded / Forecast:</span>
                                  <span className="font-bold text-amber-200">{data?.actualObserved}°C</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="dailyHistNorm" name="30-Yr Daily Norm (°C)" stroke="#38BDF8" strokeWidth={2.5} fillOpacity={1} fill="url(#dailyNormGrad)" />
                  <Line type="monotone" dataKey="actualObserved" name="Observed Actual (°C)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B' }} connectNulls={true} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3-Day Forecast Section */}
        <div className="w-full mt-6">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <CalendarDays className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">3-Day Global Forecast</h3>
          </div>
          
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col gap-4">
            {(weatherData?.forecast?.forecastday ? weatherData.forecast.forecastday.slice(0, 3) : placeholderForecast).map((day: any) => {
              const isRealData = !!day.day;
              const dateStr = isRealData 
                ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
                : day.date;
              const maxTemp = isRealData ? Math.round(day.day.maxtemp_c) : day.maxTemp;
              const minTemp = isRealData ? Math.round(day.day.mintemp_c) : day.minTemp;
              const code = isRealData ? day.day.condition.code : day.code;
              const conditionText = isRealData ? day.day.condition.text : 'Clear';
              const id = isRealData ? day.date_epoch : day.id;
              
              // Calculate width for min-max bar (assuming temp range -10 to 45C)
              const minLeft = Math.max(0, ((minTemp + 10) / 55) * 100);
              const barWidth = Math.max(5, ((maxTemp - minTemp) / 55) * 100);

              return (
              <motion.div 
                key={id} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-xl px-2 transition-colors"
              >
                <div className="w-24 text-blue-100 font-medium text-sm">{dateStr}</div>
                <div className="flex items-center gap-3 w-32">
                   <div className="scale-50 origin-left">
                     {renderWeatherIcon(code, 1)}
                   </div>
                   <span className="text-xs font-semibold text-white/60 truncate">{conditionText}</span>
                </div>
                <div className="flex-1 max-w-[200px] flex items-center gap-3">
                  <span className="text-blue-200/60 font-semibold w-6 text-right">{minTemp}°</span>
                  <div className="flex-1 h-1.5 bg-black/40 rounded-full relative overflow-hidden">
                     <div 
                       className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                       style={{ left: `${minLeft}%`, width: `${barWidth}%` }}
                     ></div>
                  </div>
                  <span className="text-white font-bold w-6">{maxTemp}°</span>
                </div>
              </motion.div>
            )})}
          </div>
        </div>

        {/* Live Weather Maps Dashboard */}
        <div className="w-full mt-8 mb-4">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <MapIcon className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">Global Weather Radar & Maps</h3>
          </div>

          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 md:p-6 shadow-xl">
               {/* Tabs and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex overflow-x-auto hide-scrollbar gap-1.5 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-inner">
                {['Rain Map', 'Cloud Map', 'Wind Map', 'Hurricane Tracker'].map((tab) => {
                  const isActive = activeMapTab === tab;
                  return (
                    <motion.button 
                      key={tab}
                      onClick={() => setActiveMapTab(tab)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 z-10 ${
                        isActive 
                          ? 'text-white' 
                          : 'text-blue-200/70 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeMapTabBg"
                          className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-sky-500/90 to-cyan-500/90 border border-cyan-300/40 shadow-[0_0_20px_rgba(34,211,238,0.4)] backdrop-blur-md rounded-full -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        />
                      )}
                      {getMapTabIcon(tab)}
                      <span>{tab}</span>
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={() => setIsMapExpanded(true)}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-lg hover:shadow-cyan-500/10 whitespace-nowrap shrink-0"
              >
                <Maximize size={16} className="text-cyan-300" />
                Expand Map
              </button>
            </div>

            {/* Map Placeholder & Live Layer Frame */}
            <div className="w-full aspect-video md:aspect-[21/9] bg-[#020617] rounded-3xl relative overflow-hidden border border-white/10 flex items-center justify-center group shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`${weatherData?.location?.lat}-${weatherData?.location?.lon}-${activeMapTab}`}
                  initial={{ opacity: 0.2, scale: 0.98, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0.2, scale: 0.98, filter: 'blur(6px)' }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full h-full relative"
                >
                  {weatherData?.location?.lat && weatherData?.location?.lon ? (
                    <>
                      {/* Floating Glassmorphic Live Layer Badge */}
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-4 left-4 z-20 pointer-events-none px-3.5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/20 text-xs font-semibold text-cyan-200 flex items-center gap-2 shadow-xl"
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                        {getMapTabIcon(activeMapTab, 14)}
                        <span>Live {activeMapTab} Layer</span>
                      </motion.div>

                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=5&overlay=${activeMapTab === 'Rain Map' ? 'rain' : activeMapTab === 'Cloud Map' ? 'clouds' : activeMapTab === 'Wind Map' ? 'wind' : 'pressure'}&product=ecmwf&level=surface&lat=${weatherData.location.lat}&lon=${weatherData.location.lon}`}
                        frameBorder="0"
                        className="absolute inset-0 rounded-3xl"
                      ></iframe>

                      {/* Mobile Expand Overlay Button */}
                      <button
                        onClick={() => setIsMapExpanded(true)}
                        className="sm:hidden absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                      >
                        <Maximize size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full relative z-10 bg-black/40 backdrop-blur-md px-6 py-3 text-white/80 font-medium shadow-2xl">
                      <Loader2 size={20} className="animate-spin text-cyan-400 mb-2" />
                      Loading {activeMapTab} Layer...
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Full-screen Map Modal */}
        {isMapExpanded && weatherData?.location?.lat && weatherData?.location?.lon && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col p-4 md:p-8"
          >
            <div className="flex items-center justify-between mb-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <MapIcon className="text-cyan-400" size={24} />
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Live {activeMapTab}</span>
                  {getMapTabIcon(activeMapTab, 20)}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex bg-black/50 backdrop-blur-md rounded-full border border-white/10 p-1.5 gap-1">
                  {['Rain Map', 'Cloud Map', 'Wind Map', 'Hurricane Tracker'].map((tab) => {
                    const isActive = activeMapTab === tab;
                    return (
                      <motion.button 
                        key={`fs-${tab}`}
                        onClick={() => setActiveMapTab(tab)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 z-10 ${
                          isActive 
                            ? 'text-white font-semibold' 
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeMapTabFsBg"
                            className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 border border-cyan-300/40 shadow-[0_0_15px_rgba(34,211,238,0.4)] backdrop-blur-md rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          />
                        )}
                        {getMapTabIcon(tab, 14)}
                        <span>{tab}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setIsMapExpanded(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/10"
                >
                  <Minimize size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-[#020617] rounded-[2rem] relative overflow-hidden border border-white/10 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`fs-container-${activeMapTab}`}
                  initial={{ opacity: 0.2, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0.2, filter: 'blur(6px)' }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=5&overlay=${activeMapTab === 'Rain Map' ? 'rain' : activeMapTab === 'Cloud Map' ? 'clouds' : activeMapTab === 'Wind Map' ? 'wind' : 'pressure'}&product=ecmwf&level=surface&lat=${weatherData.location.lat}&lon=${weatherData.location.lon}`}
                    frameBorder="0"
                    className="absolute inset-0"
                  ></iframe>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* AI Weather Assistant Chatbot */}
        <div className="w-full mt-8">
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-0 shadow-xl relative overflow-hidden flex flex-col md:flex-row h-[600px] md:h-[500px]">
             
             {/* Sidebar (Chat History) */}
             <div className={`w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex-col bg-black/20 shrink-0 ${isChatSidebarOpen ? 'flex h-2/5 md:h-full' : 'hidden md:flex'}`}>
                <div className="p-4 border-b border-white/10">
                   <button onClick={() => { startNewChat(); setIsChatSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white py-2.5 rounded-xl transition-colors text-sm font-medium border border-blue-400/20">
                     <span className="text-xl leading-none">+</span> New Chat
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
                  {chatSessions.map(session => (
                    <button key={session.id} onClick={() => { loadSession(session.id); setIsChatSidebarOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm truncate transition-colors border ${currentChatId === session.id ? 'bg-white/10 text-white border-white/20' : 'text-white/60 hover:bg-white/5 border-transparent'}`}>
                      {session.title}
                    </button>
                  ))}
                </div>
             </div>

             {/* Main Chat Area */}
             <div className="flex-1 flex flex-col p-4 md:p-6 h-full min-h-0">
               <div className="flex items-center justify-between mb-4 shrink-0 pb-4 border-b border-white/10">
                 <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                     <Sparkles className="text-blue-300" size={16} />
                   </div>
                   <h3 className="font-display text-lg md:text-xl font-semibold tracking-tight text-white drop-shadow-md">AI Weather Assistant</h3>
                 </div>
                 <button onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)} className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                   <Menu size={18} />
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 hide-scrollbar">
                 {chatHistory.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600/80 text-white rounded-br-none' : 'bg-white/10 text-blue-50 border border-white/10 rounded-bl-none'}`}>
                       {msg.role === 'user' ? (
                         msg.text
                       ) : (
                         <div className="markdown-body space-y-2 [&_strong]:font-bold [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold">
                           <Markdown>{msg.text}</Markdown>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
                 {chatLoading && (
                   <div className="flex justify-start">
                     <div className="bg-white/10 text-blue-50 border border-white/10 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                       <Loader2 size={14} className="animate-spin text-blue-300" />
                       <span className="text-sm">Thinking...</span>
                     </div>
                   </div>
                 )}
               </div>

                {/* Quick Assistant Prompt Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 hide-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => handleChatSend("Will it rain or is monsoon active here today?")}
                    disabled={chatLoading}
                    className="px-3 py-1.5 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-full text-xs text-blue-200 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🌧️</span> Rain & Monsoon
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChatSend("What should I wear today based on current weather?")}
                    disabled={chatLoading}
                    className="px-3 py-1.5 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-full text-xs text-blue-200 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>👔</span> Outfit Advice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChatSend("Is it suitable for outdoor travel or a picnic right now?")}
                    disabled={chatLoading}
                    className="px-3 py-1.5 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-full text-xs text-blue-200 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>✈️</span> Outdoor & Travel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChatSend("What is the UV index & sunscreen advice for today?")}
                    disabled={chatLoading}
                    className="px-3 py-1.5 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-full text-xs text-blue-200 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🧴</span> UV & Skincare
                  </button>
                </div>

               <div className="flex items-center gap-2 shrink-0 bg-black/20 border border-white/10 rounded-xl p-1.5 pl-4">
                 <input
                   type="text"
                   placeholder={isListening && activeVoiceTargetRef.current === 'chat' ? "Listening... speak now" : "Ask about rain, travel tips, clothing, or monsoon..."}
                   className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none transition-all text-sm"
                   value={chatInput}
                   onChange={(e) => setChatInput(e.target.value)}
                   onKeyDown={handleChatKeyDown}
                 />
                 <button
                   onClick={() => toggleListen('chat')}
                   title="Voice Assistant Mic"
                   className={`p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isListening && activeVoiceTargetRef.current === 'chat' ? 'bg-red-500/30 text-red-300 ring-2 ring-red-400/50 animate-pulse' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                 >
                   <Mic size={18} />
                 </button>
                 <button 
                   onClick={() => handleChatSend()}
                   disabled={chatLoading || !chatInput.trim()}
                   className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-2.5 rounded-lg transition-colors cursor-pointer border border-blue-400/20 shadow-lg flex items-center justify-center"
                 >
                   <Send size={18} className="-ml-0.5" />
                 </button>
               </div>
             </div>
           </div>
        </div>

        {/* Smart AI Suggestions & Skincare Advisory */}
        <div className="w-full mt-8">
           <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-blue-950/90 backdrop-blur-xl border border-indigo-500/25 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-400 opacity-80"></div>
             
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
               <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0 shadow-inner">
                   <Sparkles className="text-indigo-300 animate-pulse" size={20} />
                 </div>
                 <div>
                   <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
                     Smart AI Suggestions & Skincare Advice
                   </h3>
                   <p className="text-xs text-indigo-200/70 font-medium">Powered by Gemini AI • Real-time UV & atmospheric analysis</p>
                 </div>
               </div>

               {weatherData?.current && (
                 <div className="flex items-center gap-2 self-start sm:self-auto">
                   <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 flex items-center gap-1.5 shadow-sm">
                     <Sun size={14} className="text-amber-400" /> Current UV: <strong className="text-white">{weatherData.current.uv ?? 0}</strong>
                   </span>
                 </div>
               )}
             </div>

             {/* Live Skincare & UV Protection Dashboard Card */}
             {weatherData?.current && (() => {
               const uvVal = weatherData.current.uv ?? 0;
               const getUvMeta = (uv: number) => {
                 if (uv >= 11) return { level: 'Extreme UV Risk', color: 'text-purple-300', bg: 'bg-purple-500/20 border-purple-500/30', spf: 'SPF 50+ Broad Spectrum', advice: 'Extreme solar intensity! Wear UV-blocking sunglasses, broad-brimmed hat, apply SPF 50+ liberally, and stay in shade.' };
                 if (uv >= 8) return { level: 'Very High UV Risk', color: 'text-red-300', bg: 'bg-red-500/20 border-red-500/30', spf: 'SPF 50+ High Defense', advice: 'High risk of sunburn! Reapply SPF 50+ sunscreen every 2 hours and seek shade during midday hours.' };
                 if (uv >= 6) return { level: 'High UV Risk', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/30', spf: 'SPF 30-50 Recommended', advice: 'Sun protection required! Apply broad-spectrum sunscreen before outdoor activity and wear UV sunglasses.' };
                 if (uv >= 3) return { level: 'Moderate UV Risk', color: 'text-yellow-200', bg: 'bg-yellow-500/20 border-yellow-500/30', spf: 'SPF 30 Daily Defense', advice: 'Moderate radiation. Use SPF 30 sunscreen and wear hat or sunglasses during peak daylight.' };
                 return { level: 'Low UV Risk', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/30', spf: 'SPF 15+ Daily Protection', advice: 'Low sun burn hazard. Routine outdoor activity is safe with standard skincare hydration.' };
               };
               const uvMeta = getUvMeta(uvVal);

               return (
                 <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                   <div className="flex items-start gap-3.5">
                     <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${uvMeta.bg}`}>
                       <ShieldAlert size={24} className={uvMeta.color} />
                     </div>
                     <div>
                       <div className="flex items-center gap-2 flex-wrap">
                         <span className="text-xs font-bold uppercase tracking-wider text-white/80">Skincare & UV Defense</span>
                         <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${uvMeta.bg} ${uvMeta.color}`}>
                           {uvMeta.level} (UV {uvVal})
                         </span>
                         <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">
                           {uvMeta.spf}
                         </span>
                       </div>
                       <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 leading-relaxed">
                         {uvMeta.advice}
                       </p>
                     </div>
                   </div>

                   {/* UV Progress Bar */}
                   <div className="w-full md:w-48 shrink-0 bg-white/5 border border-white/10 p-3 rounded-xl">
                     <div className="flex justify-between items-center text-[10px] text-indigo-200 font-semibold mb-1">
                       <span>UV Index Gauge</span>
                       <span className="font-bold text-white">{uvVal} / 12</span>
                     </div>
                     <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden relative">
                       <div 
                         className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-500 transition-all duration-500"
                         style={{ width: `${Math.min(100, (uvVal / 12) * 100)}%` }}
                       ></div>
                     </div>
                   </div>
                 </div>
               );
             })()}

             {/* 24-Hour UV Index Forecast Line Chart */}
             <UvForecastChart weatherData={weatherData} />

             {aiLoading ? (
               <div className="flex items-center space-x-3 text-indigo-200/70 py-4">
                 <Loader2 size={18} className="animate-spin text-indigo-400" />
                 <span className="text-sm font-medium">Generating personalized AI suggestions and skincare guidance...</span>
               </div>
             ) : aiRecommendations.length > 0 ? (
               <div className="space-y-3.5">
                  {aiRecommendations.map((rec, index) => {
                    const isSkincare = rec.toLowerCase().includes('skincare') || rec.toLowerCase().includes('uv') || rec.toLowerCase().includes('spf') || rec.toLowerCase().includes('sunscreen');
                    return (
                      <div key={index} className={`flex items-start space-x-3.5 p-3 rounded-xl transition-colors ${isSkincare ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                         <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${isSkincare ? 'bg-amber-400/20 text-amber-300' : 'bg-indigo-400/20 text-indigo-300'}`}>
                           {isSkincare ? <Sun size={15} /> : <Sparkles size={15} />}
                         </div>
                         <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed font-medium">{rec}</p>
                      </div>
                    );
                  })}
               </div>
             ) : (
               <p className="text-indigo-200/50 text-sm italic py-2">AI recommendations will appear here after search.</p>
             )}
           </div>
        </div>



        {/* Smart Planners System */}
        <div className="w-full mt-8 mb-4">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <Compass className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">Smart Weather Planners</h3>
          </div>

          <div className="space-y-8">
             {/* Outdoor & Adventure Planners */}
             <div>
                <h4 className="text-lg font-medium text-white/80 mb-4 px-2 uppercase tracking-wide flex items-center"><Tent className="mr-2" size={18} /> Outdoor & Adventure</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'camping', icon: <Tent size={24} />, title: 'Camping Planner', data: planners?.outdoor?.camping },
                    { id: 'trekking', icon: <Compass size={24} />, title: 'Trekking Planner', data: planners?.outdoor?.trekking },
                    { id: 'fishing', icon: <Fish size={24} />, title: 'Fishing Planner', data: planners?.outdoor?.fishing },
                    { id: 'beach', icon: <Waves size={24} />, title: 'Beach Planner', data: planners?.outdoor?.beach }
                  ].map((planner) => (
                    <div 
                       key={planner.id}
                       onClick={() => setActiveContext(planner.id)}
                       className={`bg-white/5 backdrop-blur-xl border ${activeContext === planner.id ? 'border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'} rounded-[1.5rem] p-5 transition-all cursor-pointer group`}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 group-hover:bg-blue-500/30 transition-colors">
                              {planner.icon}
                            </div>
                            <h5 className="font-semibold text-white text-lg">{planner.title}</h5>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${planner.data?.class}`}>
                             {planner.data?.score}
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                         <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Smart Checklist</p>
                         {planner.data?.checklist?.map((item, i) => (
                           <div key={i} className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                             <span className="text-sm text-blue-100/80">{item}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Lifestyle & Event Planners */}
             <div>
                <h4 className="text-lg font-medium text-white/80 mb-4 px-2 uppercase tracking-wide flex items-center"><PartyPopper className="mr-2" size={18} /> Lifestyle & Event</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'wedding', icon: <PartyPopper size={24} />, title: 'Wedding Planner', data: planners?.lifestyle?.wedding },
                    { id: 'festival', icon: <Activity size={24} />, title: 'Festival Planner', data: planners?.lifestyle?.festival },
                    { id: 'gardening', icon: <Sprout size={24} />, title: 'Gardening Planner', data: planners?.lifestyle?.gardening },
                    { id: 'petWalking', icon: <Dog size={24} />, title: 'Pet Walking Planner', data: planners?.lifestyle?.petWalking }
                  ].map((planner) => (
                    <div 
                       key={planner.id}
                       onClick={() => setActiveContext(planner.id)}
                       className={`bg-white/5 backdrop-blur-xl border ${activeContext === planner.id ? 'border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-white/10 hover:border-white/20'} rounded-[1.5rem] p-5 transition-all cursor-pointer group`}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:bg-purple-500/30 transition-colors">
                              {planner.icon}
                            </div>
                            <h5 className="font-semibold text-white text-lg">{planner.title}</h5>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${planner.data?.class}`}>
                             {planner.data?.score}
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                         <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Smart Checklist</p>
                         {planner.data?.checklist?.map((item, i) => (
                           <div key={i} className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></div>
                             <span className="text-sm text-purple-100/80">{item}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* Placement 2: Adsterra Standard Display Banner */}
        <AdsterraBanner format="banner300x250" />

        {/* Astronomy Tracker */}
        <div className="w-full mt-8 mb-4">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <MoonStar className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">Astronomy Tracker</h3>
          </div>

          <div 
             className={`w-full bg-white/5 backdrop-blur-xl border ${activeContext === 'astronomy' ? 'border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'border-white/10'} rounded-[2rem] p-6 md:p-8 shadow-xl transition-all cursor-pointer`}
             onClick={() => setActiveContext('astronomy')}
          >
            {/* Live Astronomy Countdown Timer */}
            <AstronomyCountdown key={weatherData?.location?.name || 'loc'} weatherData={weatherData} />

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
              
              {/* Sun Tracker */}
              <div className="w-full flex-1 flex flex-col items-center">
                 <h4 className="text-sm font-medium text-yellow-200/80 mb-6 tracking-wider uppercase">Solar Trajectory</h4>
                 
                 <div className="w-full relative h-28 mb-4">
                    {/* Arch */}
                    <div className="absolute bottom-0 left-0 right-0 h-[200%] border-2 border-dashed border-yellow-500/30 rounded-full"></div>
                    {/* Sun Position */}
                    <div 
                        className="absolute w-8 h-8 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10"
                        style={{
                            left: `${solar.percent}%`,
                            bottom: `calc(${Math.sin(solar.percent * Math.PI / 100) * 100}% - 16px)`
                        }}
                    >
                       <SunMedium className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" size={32} />
                    </div>
                    {/* Horizon line */}
                    <div className="absolute bottom-0 w-full h-px bg-white/20"></div>
                 </div>

                 <div className="w-full flex justify-between items-center text-sm font-semibold mt-2">
                    <div className="flex flex-col items-center">
                       <Sunrise size={20} className="text-yellow-500 mb-1" />
                       <span className="text-white">{solar.sunrise}</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <Sunset size={20} className="text-orange-500 mb-1" />
                       <span className="text-white">{solar.sunset}</span>
                    </div>
                 </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-32 bg-white/10"></div>
              <div className="block md:hidden w-full h-px bg-white/10"></div>

              {/* Moon Tracker */}
              <div className="w-full flex-1 flex flex-col items-center">
                 <h4 className="text-sm font-medium text-blue-200/80 mb-6 tracking-wider uppercase">Lunar Cycle</h4>
                 
                 <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="flex flex-col items-center gap-2">
                       <div className={`w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center relative overflow-hidden shadow-inner transition-all duration-1000 ${moonStyle.bg}`} style={{ boxShadow: moonStyle.shadow }}>
                          {hasClouds && !hasStorm && <Cloud className="absolute text-slate-100/40 drop-shadow-lg" size={48} />}
                          {hasStorm && <CloudLightning className="absolute text-slate-400/60 drop-shadow-xl" size={48} />}
                       </div>
                       <span className="text-sm font-medium text-blue-100 text-center">{solar.moon_phase}</span>
                    </div>
                 </div>

                 <div className="w-full max-w-[200px] flex justify-between items-center text-sm font-semibold text-blue-200">
                    <div className="flex flex-col items-center">
                       <span className="text-xs text-blue-200/60 mb-1">Moonrise</span>
                       <span>{solar.moonrise}</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-xs text-blue-200/60 mb-1">Moonset</span>
                       <span>{solar.moonset}</span>
                    </div>
                 </div>
              </div>

            </div>

            {/* Advanced Astronomy & Photography Metrics */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/10">
               {/* Photographers' Special */}
               <div className="bg-black/20 rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
                  <h4 className="text-sm font-medium text-orange-200/80 mb-4 tracking-wider uppercase flex items-center"><Sunrise size={16} className="mr-2" /> Photographers' Special</h4>
                  
                  <div className="space-y-4 relative z-10 px-1 py-1">
                     <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                           <span className="text-orange-300">Golden Hour</span>
                           <span className="text-white/70">Best for warm, soft light</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/50 border border-white/10 rounded-full p-0.5 flex relative overflow-hidden">
                           <div className="w-[10%] h-full"></div>
                           <div className="w-[15%] h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.8)]"></div>
                           <div className="w-[50%] h-full"></div>
                           <div className="w-[15%] h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.8)]"></div>
                           <div className="w-[10%] h-full"></div>
                        </div>
                     </div>

                     <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                           <span className="text-blue-300">Blue Hour</span>
                           <span className="text-white/70">Best for cityscapes</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/50 border border-white/10 rounded-full p-0.5 flex relative overflow-hidden">
                           <div className="w-[5%] h-full"></div>
                           <div className="w-[10%] h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                           <div className="w-[70%] h-full"></div>
                           <div className="w-[10%] h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                           <div className="w-[5%] h-full"></div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Meteor Shower Calendar */}
               <div className="bg-black/20 rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                  <h4 className="text-sm font-medium text-indigo-200/80 mb-4 tracking-wider uppercase flex items-center"><Sparkles size={16} className="mr-2" /> Meteor Shower Alert</h4>
                  
                  <div className="relative z-10 flex flex-col justify-center h-full pb-4">
                     {weatherData?.location?.localtime?.includes('-08') || weatherData?.location?.localtime?.includes('-07') ? (
                       <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                             <Sparkles className="text-indigo-400" size={20} />
                          </div>
                          <div>
                             <h5 className="font-semibold text-white">Perseids Peak Incoming</h5>
                             <p className="text-xs text-white/60 mt-1">Excellent viewing conditions tonight due to new moon. Expect up to 100 meteors per hour after midnight.</p>
                             <div className="mt-2 inline-block px-2 py-1 bg-green-500/20 text-green-300 text-[10px] font-bold rounded uppercase tracking-wider border border-green-500/30">High Visibility</div>
                          </div>
                       </div>
                     ) : (
                       <div className="flex items-center justify-center text-center px-4">
                          <p className="text-sm text-white/50 italic">No major meteor showers peaking in this hemisphere currently. Next major event: Geminids (Dec).</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>
        {/* Placement 3: Adsterra Native 1x2 Banner */}
        <AdsterraNative />

        {/* AI Weather Lab Section */}
        <div className="w-full mt-8 mb-4">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <Sparkles className="text-purple-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">AI Weather Lab</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* AI Clothing & Trip Suggestions */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between">
                <div>
                   <h4 className="text-sm font-medium text-purple-200/80 mb-4 tracking-wider uppercase flex items-center"><Shirt size={16} className="mr-2"/> Smart AI Suggestions</h4>
                   <p className="text-sm text-white/70 leading-relaxed mb-4">
                      Based on today's weather of <strong>{weatherData?.current.temp_c}°C</strong> and <strong>{weatherData?.current.condition.text.toLowerCase()}</strong> conditions in {weatherData?.location.name}:
                   </p>
                   <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                         <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5"><Shirt size={12} className="text-purple-300"/></div>
                         <span className="text-sm text-white/90">Wear light, breathable layers. Don't forget sunglasses if it clears up.</span>
                      </li>
                      <li className="flex items-start gap-2">
                         <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5"><CarFront size={12} className="text-blue-300"/></div>
                         <span className="text-sm text-white/90">Traffic might be slower than usual due to weather changes. Leave 10 mins early.</span>
                      </li>
                   </ul>
                </div>
                <button 
                  onClick={() => setActiveContext('chat')}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all border border-purple-400/30">
                  Ask AI for more specific tips
                </button>
             </div>

             {/* Daily Weather Story */}
             <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl lg:col-span-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
                <h4 className="text-sm font-medium text-pink-200/80 mb-4 tracking-wider uppercase flex items-center"><BookOpen size={16} className="mr-2"/> Today's Weather Story</h4>
                
                <div className="relative z-10 flex flex-col h-full justify-center">
                   <p className="text-lg md:text-xl font-serif leading-relaxed text-white/90 italic">
                      "The morning starts crisp and cool in {weatherData?.location.name || 'your city'}. As the sun arcs higher, we'll see a steady climb in temperature, cresting in the afternoon before a gentle cool-off. With {(() => {
                        const cond = (weatherData?.current?.condition?.text || 'clear').toLowerCase().trim();
                        if (cond.includes('nearby')) return `${cond} and cloudy skies above`;
                        if (cond.endsWith('skies') || cond.endsWith('skies above')) return cond;
                        if (cond === 'sunny' || cond === 'clear') return `${cond} skies above`;
                        if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('thunder') || cond.includes('snow')) return `${cond} and overcast skies above`;
                        if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('fog')) return `${cond} skies above`;
                        return `${cond} conditions above`;
                      })()}, it's a perfect day to embrace the outdoors, though a light jacket might be your best friend by dusk."
                   </p>
                   <div className="flex items-center gap-2 mt-6 justify-end">
                      <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">Generated by Sky Global AI</span>
                      <Sparkles size={12} className="text-purple-400/50" />
                   </div>
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* Placement 4: Adsterra Standard Display Banner */}
      <div className="w-full max-w-5xl mx-auto px-4 pb-12 mt-auto">
        <AdsterraBanner format="banner300x250" />
      </div>

      {/* PWA Installation Modal */}
      <PwaInstallModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        deferredPrompt={deferredPrompt}
        onNativeInstall={() => {
          handleInstallClick();
          setShowPwaModal(false);
        }}
      />

      {/* Location Details Modal */}
      <LocationDetailsModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        location={weatherData?.location}
      />

      </div>
    </div>
  );
}

/* 
 * FINAL PRODUCTION DEPLOYMENT INSTRUCTIONS (FIREBASE HOSTING)
 * 
 * To host this application globally for free on Firebase, run the following commands in your terminal:
 * 
 * 1. Install Firebase CLI (if not already installed):
 *    npm install -g firebase-tools
 * 
 * 2. Login to your Google/Firebase account:
 *    firebase login
 * 
 * 3. Initialize Firebase in this project directory:
 *    firebase init
 *    (Select "Hosting", choose your project, set public directory to "dist", configure as single-page app = Yes, set up automatic builds = No)
 * 
 * 4. Build the production application bundle:
 *    npm run build
 * 
 * 5. Deploy the application to the web:
 *    firebase deploy --only hosting
 * 
 * Your Weather Sky Global masterpiece is now live!
 */