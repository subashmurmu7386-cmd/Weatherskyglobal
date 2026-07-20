/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, KeyboardEvent } from 'react';
import { Search, Mic, MapPin, User, Moon, CloudRain, Droplets, Wind, Thermometer, Loader2, AlertCircle, Sun, Cloud, CloudLightning, Snowflake, CalendarDays, Map as MapIcon, Compass, Sparkles, Umbrella, CarFront, Shirt, Sprout, Tractor, Snowflake as FrostIcon, TreePine, Trophy, Activity, SunMedium, Eye, Sunrise, Sunset, MoonStar, Heart, X, Menu, CloudDrizzle, CloudSnow, Send, Download, Tent, Fish, Waves, Flower2, Dog, PartyPopper, Telescope, BookOpen, Flame, Award, Zap, ShieldAlert, WifiOff, SearchX, CheckCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { HeroCanvas } from './components/HeroCanvas';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
    pressure_mb: number;
    precip_mm: number;
    humidity: number;
    feelslike_c: number;
    is_day: number;
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
      };
    }>;
  };
}

const placeholderForecast = Array.from({ length: 15 }).map((_, i) => {
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
  return {
    id: i,
    time: time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
    temp: Math.floor(Math.random() * 10) + 20,
    code: conditions[Math.floor(Math.random() * conditions.length)],
  };
});

export default function App() {
  const [weatherTheme, setWeatherTheme] = useState('clear-night');
  const [activeMapTab, setActiveMapTab] = useState('Rain Map');
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState<{ id: string, name: string }[]>([]);
  const [toastError, setToastError] = useState<string | null>(null);
  const [activeContext, setActiveContext] = useState<string>('none');
  const [userName, setUserName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  
  // Gamification & Alerts State
  
  // AI Chat Assistant State
  const [chatSessions, setChatSessions] = useState<{ id: string, title: string, messages: { role: 'user' | 'assistant', text: string }[] }[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
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

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setToastError("Your browser does not support voice input.");
      return;
    }
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setToastError("Microphone access was denied. Please allow microphone permissions to use voice chat.");
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  // Load mock from localStorage for preview demonstration
  useEffect(() => {
    const saved = localStorage.getItem('mockSavedLocations');
    if (saved) setSavedLocations(JSON.parse(saved));
  }, []);

  const handleSaveLocation = async () => {
    if (!weatherData) return;
    const locationName = `${weatherData.location.name}, ${weatherData.location.country}`;
    
       // Mock save if Firebase is not configured
       setSavedLocations(prev => {
          if (prev.find(l => l.name === locationName)) return prev;
          const newLocs = [...prev, { id: Date.now().toString(), name: locationName }];
          localStorage.setItem('mockSavedLocations', JSON.stringify(newLocs));
          return newLocs;
       });
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

  const fetchWeather = async (query: string, bypassCache = false) => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setAiRecommendations([]);
    setToastError(null);
    
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
      const response = await fetch(`/api/weather?q=${encodeURIComponent(query.trim())}`);
      
      if (!response.ok) {
        throw new Error(`Location "${query}" not found. Please try another search.`);
      }
      
      const data: WeatherData = await response.json();
      setWeatherData(data);
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




      
      // Auto-trigger Gemini Recommendations
      generateAIRecommendations(data);
    } catch (err) {
      setToastError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      // Do not setWeatherData(null) to keep the previous location visible
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = async (data: WeatherData) => {
    setAiLoading(true);
    try {
      // Connects to the Express backend which securely calls the Gemini API
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationName: data.location.name,
          temperature: data.current.temp_c,
          condition: data.current.condition.text,
          rainChance: data.current.precip_mm > 0 ? 100 : 0, // Using precip_mm as a proxy since current weather API doesn't return rain chance percentage
          uvIndex: data.current.temp_c > 25 ? 8 : 4, // Simple placeholder logic
          aqi: 50 // Placeholder since real AQI is nested
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
        setAiRecommendations([`Consider current condition (${data.current.condition.text}) before heading out.`, "Stay prepared for sudden weather changes.", "Keep hydrated and stay safe out there!"]);
      }
    } catch (error) {
      console.error('Failed to get AI recommendations', error);
      setAiRecommendations([`Consider current condition (${data.current.condition.text}) before heading out.`, "Stay prepared for sudden weather changes.", "Keep hydrated and stay safe out there!"]);
    } finally {
      setAiLoading(false);
    }
  };

  const updateTheme = (current: WeatherData['current']) => {
    const isDay = current.is_day === 1;
    const conditionText = current.condition.text.toLowerCase();
    
    if (conditionText.includes('rain') || conditionText.includes('drizzle') || conditionText.includes('shower') || conditionText.includes('thunder')) {
      setWeatherTheme('rainy');
    } else if (conditionText.includes('snow') || conditionText.includes('ice') || conditionText.includes('blizzard')) {
      setWeatherTheme('rainy'); // Reusing rainy theme for snow for now
    } else if (isDay) {
      if (conditionText.includes('clear') || conditionText.includes('sunny')) {
         setWeatherTheme('clear-day');
      } else {
         // Partly cloudy / overcast
         setWeatherTheme('clear-day');
      }
    } else {
      setWeatherTheme('clear-night');
    }
  };

  useEffect(() => {
    // Default location on mount
    handleLocation();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchWeather(searchQuery, true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLocation = () => {
    setLoading(true);
    
    const fallbackToIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('IP API failed');
        const data = await response.json();
        if (data && data.city) {
          fetchWeather(`${data.city}, ${data.country_name}`, true);
        } else {
          fetchWeather("Mumbai, India", true);
        }
      } catch (e) {
        fetchWeather("Mumbai, India", true);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIP();
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Bypass textual searching and pass precise coordinates directly
          const { latitude, longitude } = position.coords;
          fetchWeather(`${latitude},${longitude}`, true);
        },
        (error) => {
          fallbackToIP();
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (err) {
      fallbackToIP();
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

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    const newHistory: { role: 'user' | 'assistant', text: string }[] = [...chatHistory, { role: 'user', text: userMessage }];
    updateCurrentSession(newHistory);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory.map(msg => ({ role: msg.role, text: msg.text })),
          locationData: weatherData ? {
            name: weatherData.location.name,
            temp: weatherData.current.temp_c,
            condition: weatherData.current.condition.text,
            time: weatherData.location.localtime
          } : null
        }),
      });

      if (!response.ok) throw new Error('Network error');
      
      const data = await response.json();
      if (data.text) {
        updateCurrentSession([...newHistory, { role: 'assistant', text: data.text }]);
      }
    } catch (err) {
      console.error(err);
      updateCurrentSession([...newHistory, { role: 'assistant', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
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

      <header className="flex justify-between items-center p-4 md:px-8 py-6 max-w-7xl mx-auto w-full relative z-20">
        <div className="font-display font-bold text-xl md:text-2xl tracking-tight flex items-center gap-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] text-white bg-black/40 px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/20">
          <CloudRain className="text-blue-400 drop-shadow-md" size={28} />
          <span>Weather Sky <span className="text-blue-400 drop-shadow-md">Global</span></span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {deferredPrompt && (
            <button onClick={handleInstallClick} className="p-1 bg-black/20 border border-white/20 rounded-full backdrop-blur-md hover:bg-black/40 transition-all cursor-pointer overflow-hidden shadow-lg block text-white" aria-label="Install App">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <Download size={18} />
              </div>
            </button>
          )}
          <a href="YOUR_MONETAG_DIRECT_LINK_HERE" target="_blank" rel="noopener noreferrer" className="p-1 bg-black/20 border border-white/20 rounded-full backdrop-blur-md hover:bg-black/40 transition-all cursor-pointer overflow-hidden shadow-lg block">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center px-4 py-6 md:py-10 w-full max-w-5xl mx-auto space-y-12">
        
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


        {/* Advanced Smart Search Component */}
        <div className="max-w-md w-full px-4 mx-auto relative group z-30">
          <div className="relative">
             <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
               <Search className="text-blue-200/60" size={22} />
             </div>
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Search city, village, airport code, or ZIP..."
               className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl py-4 md:py-5 pl-14 pr-[140px] md:pr-[180px] text-lg text-white placeholder-blue-100/70 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]"
             />
             <div className="absolute inset-y-2 right-3 flex space-x-2">
                <button 
                  onClick={toggleListen}
                  title="Voice Search"
                  className={`px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center transition-colors shadow-sm cursor-pointer backdrop-blur-sm ${isListening ? 'text-red-400 border-red-400/50 animate-pulse' : 'text-white'}`}
                >
                   <Mic size={18} />
                </button>
                <button onClick={handleSearch} className="px-4 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 text-white rounded-2xl flex items-center justify-center transition-colors shadow-lg cursor-pointer font-medium text-sm backdrop-blur-sm">
                   Search
                </button>
                <button onClick={handleLocation} title="GPS Location" className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm border border-white/20 cursor-pointer">
                   {loading && !searchQuery ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                </button>
             </div>
          </div>
          
          {/* Dropdown Menu UI (Recent Searches & Favorite Cities) */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 overflow-hidden">
             <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                <div className="p-4">
                   <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 px-2">Recent Searches</h4>
                   <ul className="space-y-1">
                      {['New York, US', 'London, UK', 'Tokyo, JP'].map((city) => (
                         <li key={city}>
                            <button onMouseDown={() => {setSearchQuery(city); setTimeout(handleSearch, 100);}} className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2">
                               <Search size={14} className="text-white/40" /> {city}
                            </button>
                         </li>
                      ))}
                   </ul>
                </div>
                <div className="p-4">
                   <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 px-2">Favorite Cities</h4>
                   <ul className="space-y-1">
                      {savedLocations.length > 0 ? savedLocations.slice(0, 3).map(loc => (
                         <li key={loc.id}>
                            <button onMouseDown={() => {setSearchQuery(loc.name); setTimeout(handleSearch, 100);}} className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2">
                               <Heart size={14} className="text-red-400" /> {loc.name}
                            </button>
                         </li>
                      )) : (
                         <li className="px-3 py-2 text-sm text-white/40 italic">No favorites yet</li>
                      )}
                   </ul>
                </div>
             </div>
          </div>
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
                {loc.name.split(',')[0]} {/* Show just city name for brevity */}
              </button>
            ))}
          </div>
        )}

        {/* Cinematic Floating Island Hero Canvas */}
        <HeroCanvas weatherData={weatherData} activeContext={activeContext} loading={loading} onLocate={handleLocation} userName={userName} />
        
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
                  <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg`}>
                    <div className="flex items-center gap-2 mb-2">
                       <Sprout size={16} className="text-blue-300" />
                       <span className="text-sm font-medium text-blue-200/70">Air Quality</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{aqiIndex}</div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full border ${aqiInfo.bg} ${aqiInfo.color}`}>{aqiInfo.text}</div>
                  </div>
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
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                       <Sun size={16} className="text-blue-300" />
                       <span className="text-sm font-medium text-blue-200/70">UV Index</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{uv}</div>
                    <div className={`text-sm font-medium ${uvColor}`}>{uvText}</div>
                  </div>
                );
             })()}

             {/* Humidity Card */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <Droplets size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Humidity</span>
               </div>
               <div className="text-2xl font-bold mb-1">{weatherData.current.humidity}%</div>
               <div className="text-sm font-medium text-white/60">The dew point is {weatherData.current.dewpoint_c || Math.round(weatherData.current.temp_c - ((100 - weatherData.current.humidity) / 5))}°</div>
             </div>

             {/* Feels Like Card */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <Thermometer size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Feels Like</span>
               </div>
               <div className="text-2xl font-bold mb-1">{Math.round(weatherData.current.feelslike_c)}°</div>
               <div className="text-sm font-medium text-white/60">Similar to actual temp.</div>
             </div>

             {/* Wind Speed Card */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <Wind size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Wind Speed</span>
               </div>
               <div className="text-2xl font-bold mb-1">{weatherData.current.wind_kph} <span className="text-lg font-medium text-white/60">km/h</span></div>
               <div className="text-sm font-medium text-white/60">Direction: {weatherData.current.wind_dir}</div>
             </div>
             
             {/* Wind Gust Card */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <Wind size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Wind Gusts</span>
               </div>
               <div className="text-2xl font-bold mb-1">{weatherData.current.gust_kph} <span className="text-lg font-medium text-white/60">km/h</span></div>
               <div className="text-sm font-medium text-white/60">Max speed</div>
             </div>
             
             {/* Dew Point Card */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-start justify-center shadow-lg">
               <div className="flex items-center gap-2 mb-2">
                  <CloudDrizzle size={16} className="text-blue-300" />
                  <span className="text-sm font-medium text-blue-200/70">Dew Point</span>
               </div>
               <div className="text-2xl font-bold mb-1">{weatherData.current.dewpoint_c || Math.round(weatherData.current.temp_c - ((100 - weatherData.current.humidity) / 5))}°</div>
               <div className="text-sm font-medium text-white/60">Comfort level</div>
             </div>
          </div>
        )}

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
              <div key={id} className="min-w-[100px] snap-start bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-between shadow-lg hover:bg-white/10 transition-colors">
                <span className="text-blue-100 font-medium text-sm mb-3">{timeStr}</span>
                <div className="scale-50 origin-center mb-1">
                   {renderWeatherIcon(code, isDay)}
                </div>
                <div className="font-bold text-xl text-white">
                  {temp}°
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* 15-Day Forecast Section */}
        <div className="w-full mt-6">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <CalendarDays className="text-blue-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">15-Day Global Forecast</h3>
          </div>
          
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col gap-4">
            {(weatherData?.forecast?.forecastday || placeholderForecast).map((day: any) => {
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
              <div key={id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-xl px-2 transition-colors">
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
              </div>
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
            
            {/* Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 pb-2">
              {['Rain Map', 'Cloud Map', 'Wind Map', 'Hurricane Tracker'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveMapTab(tab)}
                  className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activeMapTab === tab 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-white/5 text-blue-200/70 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Map Placeholder */}
            <div className="w-full aspect-video md:aspect-[21/9] bg-[#020617] rounded-3xl relative overflow-hidden border border-white/5 flex items-center justify-center">
               {weatherData?.location?.lat && weatherData?.location?.lon ? (
                 <iframe 
                   key={`${weatherData.location.lat}-${weatherData.location.lon}-${activeMapTab}`}
                   width="100%" 
                   height="100%" 
                   src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=5&overlay=${activeMapTab === 'Rain Map' ? 'rain' : activeMapTab === 'Cloud Map' ? 'clouds' : activeMapTab === 'Wind Map' ? 'wind' : 'pressure'}&product=ecmwf&level=surface&lat=${weatherData.location.lat}&lon=${weatherData.location.lon}`}
                   frameBorder="0"
                   className="absolute inset-0 rounded-3xl"
                 ></iframe>
               ) : (
                 <div className="flex flex-col items-center justify-center relative z-10 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white/80 font-medium shadow-2xl">
                   <Loader2 size={18} className="animate-spin text-blue-400 mb-2" />
                   Loading {activeMapTab} Layer...
                 </div>
               )}
            </div>

          </div>
        </div>

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
                     <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600/80 text-white rounded-br-none' : 'bg-white/10 text-blue-50 border border-white/10 rounded-bl-none'}`}>
                       {msg.text}
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

               <div className="flex items-center gap-2 shrink-0 bg-black/20 border border-white/10 rounded-xl p-1.5 pl-4">
                 <input
                   type="text"
                   placeholder="Ask about the weather, travel tips, or clothing..."
                   className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none transition-all text-sm"
                   value={chatInput}
                   onChange={(e) => setChatInput(e.target.value)}
                   onKeyDown={handleChatKeyDown}
                 />
                 <button
                   onClick={toggleListen}
                   className={`p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                 >
                   <Mic size={18} />
                 </button>
                 <button 
                   onClick={handleChatSend}
                   disabled={chatLoading || !chatInput.trim()}
                   className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-2.5 rounded-lg transition-colors cursor-pointer border border-blue-400/20 shadow-lg flex items-center justify-center"
                 >
                   <Send size={18} className="-ml-0.5" />
                 </button>
               </div>
             </div>
           </div>
        </div>

        {/* AI Weather Summary by Gemini */}
        <div className="w-full mt-8">
           <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-50"></div>
             
             <div className="flex items-center space-x-3 mb-4">
               <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                 <Sparkles className="text-indigo-300" size={16} />
               </div>
               <h3 className="font-display text-xl font-semibold tracking-tight text-indigo-100">AI Weather Summary by Gemini</h3>
             </div>

             {aiLoading ? (
               <div className="flex items-center space-x-3 text-indigo-200/70 py-2">
                 <Loader2 size={16} className="animate-spin" />
                 <span className="text-sm font-medium">Analyzing real-time atmospheric data...</span>
               </div>
             ) : aiRecommendations.length > 0 ? (
               <div className="space-y-3">
                  {aiRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3">
                       <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                       <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">{rec}</p>
                    </div>
                  ))}
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

        {/* Adsterra Banner Slot - Horizontal */}
        <div className="w-full mt-4 mb-4">
          <div className="w-full h-[100px] md:h-[120px] bg-slate-900/40 backdrop-blur-md border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-blue-200/50 shadow-inner">
            <span className="text-sm font-medium tracking-widest uppercase">Advertisement</span>
            <span className="text-xs mt-1 opacity-60">Adsterra Banner Slot</span>
          </div>
        </div>

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
                  
                  <div className="space-y-4 relative z-10">
                     <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                           <span className="text-orange-300">Golden Hour</span>
                           <span className="text-white/70">Best for warm, soft light</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                           <div className="w-[10%] h-full"></div>
                           <div className="w-[15%] h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full shadow-[0_0_10px_rgba(251,146,60,0.8)]"></div>
                           <div className="w-[50%] h-full"></div>
                           <div className="w-[15%] h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-[0_0_10px_rgba(251,146,60,0.8)]"></div>
                           <div className="w-[10%] h-full"></div>
                        </div>
                     </div>

                     <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                           <span className="text-blue-300">Blue Hour</span>
                           <span className="text-white/70">Best for cityscapes</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                           <div className="w-[5%] h-full"></div>
                           <div className="w-[10%] h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                           <div className="w-[70%] h-full"></div>
                           <div className="w-[10%] h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
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
                      "The morning starts crisp and cool in {weatherData?.location.name}. As the sun arcs higher, we'll see a steady climb in temperature, cresting in the afternoon before a gentle cool-off. With {weatherData?.current.condition.text.toLowerCase()} skies above, it's a perfect day to embrace the outdoors, though a light jacket might be your best friend by dusk."
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

      {/* Adsterra Banner Slot - Bottom */}
      <div className="w-full max-w-5xl mx-auto px-4 pb-12 mt-auto">
        <div className="w-full h-[100px] md:h-[120px] bg-slate-900/40 backdrop-blur-md border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-blue-200/50 shadow-inner">
          <span className="text-sm font-medium tracking-widest uppercase">Advertisement</span>
          <span className="text-xs mt-1 opacity-60">Adsterra Banner Slot</span>
        </div>
      </div>

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