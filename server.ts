import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // API Route for Weather proxy to prevent client-side CORS issues and key exposure
  app.get('/api/weather', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      
      const apiKey = process.env.WEATHER_API_KEY || 'f6f975bfbd7e4d4c9ea72207260707';
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=15&aqi=yes`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('WeatherAPI error details:', errorText);
        return res.status(response.status).json({ error: `Weather service error: ${response.statusText}` });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching weather data from proxy:', error);
      res.status(500).json({ error: 'Internal server error while fetching weather data' });
    }
  });

  // API Route for AI Recommendations
  app.post('/api/recommendations', async (req, res) => {
    try {
      const { temperature, condition, rainChance, uvIndex, aqi, locationName } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY  });

      const prompt = `You are a smart weather assistant for the city of ${locationName}. 
The current weather is ${condition} with a temperature of ${temperature}°C.
Rain chance: ${rainChance}%. UV index: ${uvIndex}. AQI: ${aqi}.

Provide a short, bulleted 3-line response in simple language covering:
- Travel/Picnic suitability.
- Rain/Laundry/Car wash planning advice.
- Health/Farming quick tip, including monsoon insights.

Only provide the three bullet points. Make it concise and actionable.`;

      let responseText = "";
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: prompt,
        });
        responseText = response.text || "";
      } catch (aiError: any) {
        console.error('Gemini API Error:', aiError);
        console.warn('Gemini API Warning: Model unavailable or rate limited, using fallback.');
        // Fallback response when model is unavailable or errors
        responseText = `- Travel in ${locationName}: Consider current condition (${condition}) before heading out.
- Planning: Stay prepared for sudden weather changes in the area.
- Tip: Keep hydrated and stay safe out there!`;
      }

      res.json({ text: responseText });
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // API Route for AI Chat Assistant
  app.post('/api/chat', async (req, res) => {
    try {
      const { history, message, locationData } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY  });

      const systemInstruction = `You are a friendly, expert global weather assistant. You discuss real-time weather conditions, clothes suggestions, travel alerts, farming ideas, and real-time monsoon details based on the user's questions. Keep responses concise. Current location data: ${JSON.stringify(locationData)}`;

      // Build the conversation history
      const contents = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents,
        config: {
          systemInstruction,
        }
      });

      res.json({ text: response.text });
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
