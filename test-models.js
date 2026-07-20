import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run(modelName) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'hi',
    });
    console.log(`Success ${modelName}`);
  } catch(e) {
    console.error(`Error generating ${modelName}:`, e.message.substring(0, 100));
  }
}
async function main() {
  await run('gemini-3.1-flash-lite-preview');
  await run('gemini-2.5-flash-lite');
  await run('gemini-flash-lite-latest');
  await run('gemini-3.5-flash');
}
main();
