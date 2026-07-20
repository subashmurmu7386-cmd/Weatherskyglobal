import { GoogleGenAI } from '@google/genai';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { history, message, locationData } = JSON.parse(event.body || '{}');
    // Using VITE_GEMINI_API_KEY as requested, falling back to standard GEMINI_API_KEY if needed
    const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

    const systemInstruction = `You are a friendly, expert global weather assistant. You discuss real-time weather conditions, clothes suggestions, travel alerts, or farming ideas based on the user's questions. Keep responses concise. Current location data: ${JSON.stringify(locationData)}`;

    const contents = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text })
    };
  } catch (error: any) {
    console.error('Error generating AI chat response:', error);
    
    const { locationData } = JSON.parse(event.body || '{}');
    const city = locationData?.name || 'your area';
    const temp = locationData?.temp ? `${locationData.temp}°C` : 'the current temperature';
    const condition = locationData?.condition || 'the current conditions';

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: `Sorry, I'm currently receiving too many requests. However, looking at ${city}, it's currently ${temp} and ${condition}. I suggest you dress appropriately for this weather and stay safe! Let me know if there's anything else I can help with later.`
      })
    };
  }
};
