import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Comprehensive mapping for states, regions, and provinces to their primary capital/regional city hub
const STATE_CAPITAL_MAP: Record<string, string> = {
  // Indian States & Union Territories
  'odisha': 'Bhubaneswar',
  'orissa': 'Bhubaneswar',
  'maharashtra': 'Mumbai',
  'karnataka': 'Bengaluru',
  'tamil nadu': 'Chennai',
  'telangana': 'Hyderabad',
  'andhra pradesh': 'Visakhapatnam',
  'kerala': 'Thiruvananthapuram',
  'west bengal': 'Kolkata',
  'gujarat': 'Ahmedabad',
  'rajasthan': 'Jaipur',
  'uttar pradesh': 'Lucknow',
  'madhya pradesh': 'Bhopal',
  'punjab': 'Chandigarh',
  'haryana': 'Chandigarh',
  'bihar': 'Patna',
  'assam': 'Guwahati',
  'goa': 'Panaji',
  'delhi': 'New Delhi',
  'jammu and kashmir': 'Srinagar',
  'jammu & kashmir': 'Srinagar',
  'ladakh': 'Leh',
  'jharkhand': 'Ranchi',
  'chhattisgarh': 'Raipur',
  'uttarakhand': 'Dehradun',
  'himachal pradesh': 'Shimla',
  'manipur': 'Imphal',
  'meghalaya': 'Shillong',
  'mizoram': 'Aizawl',
  'nagaland': 'Kohima',
  'tripura': 'Agartala',
  'sikkim': 'Gangtok',
  'arunachal pradesh': 'Itanagar',
  'puducherry': 'Pondicherry',
  'pondicherry': 'Pondicherry',
  'andaman and nicobar': 'Port Blair',
  'andaman': 'Port Blair',

  // US States
  'california': 'Los Angeles',
  'texas': 'Houston',
  'florida': 'Miami',
  'new york state': 'New York',
  'illinois': 'Chicago',
  'pennsylvania': 'Philadelphia',
  'ohio': 'Columbus',
  'georgia': 'Atlanta',
  'north carolina': 'Charlotte',
  'michigan': 'Detroit',
  'washington state': 'Seattle',
  'massachusetts': 'Boston',
  'arizona': 'Phoenix',
  'colorado': 'Denver',
  'virginia': 'Virginia Beach',
  'tennessee': 'Nashville',

  // Canadian & Australian
  'ontario': 'Toronto',
  'quebec': 'Montreal',
  'british columbia': 'Vancouver',
  'alberta': 'Calgary',
  'new south wales': 'Sydney',
  'victoria': 'Melbourne',
  'queensland': 'Brisbane',
  'western australia': 'Perth',
  'south australia': 'Adelaide',
  'tasmania': 'Hobart',

  // Other Global Regions
  'bavaria': 'Munich',
  'scotland': 'Edinburgh',
  'wales': 'Cardiff',
  'northern ireland': 'Belfast',
  'catalonia': 'Barcelona',
  'bali': 'Denpasar',
  'hawaii': 'Honolulu'
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Search Autocomplete
  app.get('/api/search-autocomplete', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const apiKey = process.env.WEATHER_API_KEY || 'f6f975bfbd7e4d4c9ea72207260707';
      const rawQuery = query.trim();

      const results: Array<{ id?: number; name: string; region: string; country: string; subtitle: string; query: string }> = [];

      // Call WeatherAPI search endpoint directly with raw user query input
      const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(rawQuery)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData)) {
          searchData.forEach((item: any) => {
            // Build target query using coordinates if present for exact micro-location weather lookup
            const targetQuery = (item.lat !== undefined && item.lon !== undefined)
              ? `${item.lat},${item.lon}`
              : (item.url || `${item.name}, ${item.region || item.country}`);

            const regionStr = item.region || '';
            const countryStr = item.country || '';
            const subtitle = [regionStr, countryStr].filter(Boolean).join(', ');

            if (!results.some(r => r.name.toLowerCase() === item.name.toLowerCase() && r.subtitle.toLowerCase() === subtitle.toLowerCase())) {
              results.push({
                id: item.id,
                name: item.name, // Primary Title: Village / Town / City Name
                region: regionStr,
                country: countryStr,
                subtitle, // Subtitle: District/City, State, Country
                query: targetQuery,
              });
            }
          });
        }
      }

      // Fallback check state/region capital map if results are scarce
      if (results.length < 3) {
        const trimmed = rawQuery.toLowerCase();
        for (const [stateName, capital] of Object.entries(STATE_CAPITAL_MAP)) {
          if (stateName.startsWith(trimmed) || stateName.includes(trimmed)) {
            const formattedState = stateName.charAt(0).toUpperCase() + stateName.slice(1);
            if (!results.some(r => r.name.toLowerCase() === capital.toLowerCase())) {
              results.push({
                name: capital,
                region: formattedState,
                country: 'State / Regional Hub',
                subtitle: `${formattedState}, State / Regional Hub`,
                query: capital,
              });
            }
            break;
          }
        }
      }

      res.json(results.slice(0, 8));
    } catch (error) {
      console.error('Search autocomplete error:', error);
      res.json([]);
    }
  });

  // API Route for Weather proxy with enhanced location resolution & village fallback
  app.get('/api/weather', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      
      const apiKey = process.env.WEATHER_API_KEY || 'f6f975bfbd7e4d4c9ea72207260707';
      const trimmedQuery = query.trim();
      const lowerQuery = trimmedQuery.toLowerCase();
      const cleanLowerQuery = lowerQuery.replace(/,\s*(india|usa|us|uk|canada|australia|state)?$/i, '').trim();
      
      let targetQuery = trimmedQuery;

      // Resolve state / region names to their main capital city
      if (STATE_CAPITAL_MAP[lowerQuery]) {
        targetQuery = STATE_CAPITAL_MAP[lowerQuery];
      } else if (STATE_CAPITAL_MAP[cleanLowerQuery]) {
        targetQuery = STATE_CAPITAL_MAP[cleanLowerQuery];
      } else {
        for (const [key, capital] of Object.entries(STATE_CAPITAL_MAP)) {
          if (
            lowerQuery === key || 
            lowerQuery === `${key} state` || 
            lowerQuery === `state of ${key}` ||
            cleanLowerQuery === key
          ) {
            targetQuery = capital;
            break;
          }
        }
      }

      const isCoord = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(trimmedQuery);
      let safeQuery = encodeURIComponent(targetQuery);
      
      if (isCoord) {
        const parts = trimmedQuery.split(',');
        const lat = parseFloat(parts[0]).toFixed(4);
        const lon = parseFloat(parts[1]).toFixed(4);
        safeQuery = `${lat},${lon}`;
      }

      // Try primary forecast query
      let url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${safeQuery}&days=15&aqi=yes&alerts=yes`;
      let response = await fetch(url);

      // Attempt 1: If primary query failed, call WeatherAPI autocomplete search to find nearest village/town match
      if (!response.ok) {
        const searchCandidates = [
          trimmedQuery,
          cleanLowerQuery,
          `${trimmedQuery}, India`,
          `${trimmedQuery}, Jharkhand`,
          trimmedQuery.split(',')[0],
        ];

        let foundMatchQuery: string | null = null;
        let matchedItemName: string | null = null;

        for (const candidate of searchCandidates) {
          if (!candidate) continue;
          const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(candidate)}`;
          const searchRes = await fetch(searchUrl);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData) && searchData.length > 0) {
              const topMatch = searchData[0];
              foundMatchQuery = (topMatch.lat !== undefined && topMatch.lon !== undefined)
                ? `${topMatch.lat},${topMatch.lon}`
                : (topMatch.url || topMatch.name);
              matchedItemName = topMatch.name;
              break;
            }
          }
        }

        if (foundMatchQuery) {
          url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(foundMatchQuery)}&days=15&aqi=yes&alerts=yes`;
          response = await fetch(url);
        }
      }

      // Attempt 2: Ultimate Fallback to nearest regional/district hub or default city if location is extremely remote
      if (!response.ok) {
        const defaultFallback = 'New Delhi, India';
        url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(defaultFallback)}&days=15&aqi=yes&alerts=yes`;
        response = await fetch(url);
      }

      if (!response.ok) {
        return res.status(500).json({ error: 'Unable to fetch weather at this moment.' });
      }
      
      const data = await response.json();

      // If user searched for a specific village name (e.g., "Basukinath"), keep user query as location name display if needed
      if (data && data.location && !isCoord && trimmedQuery.length > 2) {
        const origCityName = data.location.name;
        if (!origCityName.toLowerCase().includes(trimmedQuery.toLowerCase()) && !trimmedQuery.toLowerCase().includes(origCityName.toLowerCase())) {
          // Store display hint for small villages attached to nearest weather station
          data.location.requestedQuery = trimmedQuery;
        }
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching weather data from proxy:', error);
      res.status(500).json({ error: 'Internal server error while fetching weather data' });
    }
  });

  // API Route for AI Recommendations
  app.post('/api/weather-tips', async (req, res) => {
    try {
      const { temperature, condition, rainChance, uvIndex, aqi, locationName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const getUvTip = (uv: number) => {
        if (uv >= 11) return "Extreme UV Index! Apply SPF 50+ broad-spectrum sunscreen, wear UV-blocking sunglasses & a wide-brim hat, and avoid sun exposure between 10 AM - 4 PM.";
        if (uv >= 8) return "Very High UV Index! Use SPF 50+ broad-spectrum sunscreen, reapply every 2 hours, and seek shade during peak sunlight.";
        if (uv >= 6) return "High UV Index! Apply SPF 30-50 sunscreen, protect skin with lightweight long sleeves, and limit direct midday sun.";
        if (uv >= 3) return "Moderate UV Index! Apply SPF 30+ sunscreen before stepping outside and wear protective sunglasses.";
        return "Low UV Index (0-2): Minimal sun protection needed for brief outings. Enjoy the outdoors safely!";
      };

      const fallbackText = `- Travel in ${locationName || 'your city'}: Consider current condition (${condition || 'current conditions'}) before heading out.
- Planning: Stay prepared for sudden weather changes in the area.
- Personalized Skincare & UV Protection: ${getUvTip(uvIndex || 4)}
- Tip: Keep hydrated and stay safe out there!`;

      if (!apiKey) {
        return res.json({ text: fallbackText });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are a smart weather assistant for the city of ${locationName}. 
The current weather is ${condition} with a temperature of ${temperature}°C.
Rain chance: ${rainChance}%. UV index: ${uvIndex}. AQI: ${aqi}.

Provide a concise bulleted response in simple language covering:
- Travel/Picnic suitability.
- Rain/Laundry/Car wash planning advice.
- Personalized Skincare & UV Protection advice tailored strictly to the current UV Index of ${uvIndex} (including recommended SPF level e.g. SPF 30+/50+, reapplication frequency, sunglasses/hat advice, and skin sun-burn safety).
- Health/Farming quick tip, including monsoon insights.

Only provide bullet points. Make each point clear, friendly, concise, and highly actionable.`;

      let responseText = "";
      const modelsToTry = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (aiError: any) {
          // Silent fallback on rate limit / model quota
          console.info(`Model ${modelName} fallback triggered.`);
        }
      }

      res.json({ text: responseText || fallbackText });
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.json({ text: `- Travel in ${req.body?.locationName || 'your city'}: Enjoy your day and check conditions before heading out.\n- Personalized Skincare & UV Protection: Apply sunscreen according to daily UV index.\n- Tip: Stay hydrated and stay safe!` });
    }
  });

  // API Route for AI Chat Assistant
  app.post('/api/chat', async (req, res) => {
    try {
      const { history, message, locationData } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const city = locationData?.name || 'your area';
      const temp = locationData?.temp ? `${locationData.temp}°C` : 'the current temperature';
      const condition = locationData?.condition || 'the current conditions';

      if (!apiKey) {
        return res.json({ 
          text: `Looking at ${city}, it's currently ${temp} and ${condition}. I suggest you dress appropriately for this weather and stay safe! Let me know if there's anything else I can help with.` 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are a friendly, expert global weather assistant. You discuss real-time weather conditions, clothes suggestions, travel alerts, farming ideas, and real-time monsoon details based on the user's questions. Keep responses concise. Current location data: ${JSON.stringify(locationData)}`;

      // Build the conversation history
      const contents = (history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      let responseText = "";
      const modelsToTry = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
            }
          });
          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (aiError: any) {
          // Silent fallback on rate limit / model quota
          console.info(`Chat Model ${modelName} fallback triggered.`);
        }
      }

      if (responseText) {
        return res.json({ text: responseText });
      }

      // Fallback if all models failed
      res.json({ 
        text: `Looking at ${city}, it's currently ${temp} and ${condition}. I suggest you dress appropriately for this weather and stay safe! Let me know if there's anything else I can help with.` 
      });
    } catch (error: any) {
      console.error('Error generating AI chat response:', error);
      
      const { locationData } = req.body;
      const city = locationData?.name || 'your area';
      const temp = locationData?.temp ? `${locationData.temp}°C` : 'the current temperature';
      const condition = locationData?.condition || 'the current conditions';

      // Fallback for quota limits or API errors
      res.json({ 
        text: `Sorry, I'm currently receiving too many requests. However, looking at ${city}, it's currently ${temp} and ${condition}. I suggest you dress appropriately for this weather and stay safe! Let me know if there's anything else I can help with later.` 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
