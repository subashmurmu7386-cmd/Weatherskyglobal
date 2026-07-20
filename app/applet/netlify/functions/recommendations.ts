import { GoogleGenAI } from '@google/genai';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { temperature, condition, rainChance, uvIndex, aqi, locationName } = JSON.parse(event.body || '{}');
    const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

    const prompt = `You are a smart weather assistant for the city of ${locationName}. The current weather is ${condition} with a temperature of ${temperature}°C.\nRain chance: ${rainChance}%. UV index: ${uvIndex}. AQI: ${aqi}.\nProvide a short, bulleted 3-line response in simple language covering:\n- Travel/Picnic suitability.\n- Rain/Laundry/Car wash planning advice.\n- Health/Farming quick tip.\nOnly provide the three bullet points. Make it concise and actionable.`;

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      responseText = response.text || "";
    } catch (aiError: any) {
      console.error('Gemini API Error:', aiError);
      console.warn('Gemini API Warning: Model unavailable or rate limited, using fallback.');
      responseText = `- Travel in ${locationName}: Consider current condition (${condition}) before heading out.\n- Planning: Stay prepared for sudden weather changes in the area.\n- Tip: Keep hydrated and stay safe out there!`;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: responseText })
    };
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate recommendations' }) };
  }
};
