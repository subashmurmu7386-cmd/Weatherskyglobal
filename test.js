import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function run(modelName) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'hi',
    });
    console.log(`Success ${modelName}`, response.text);
  } catch(e) {
    console.error(`Error generating ${modelName}`, e.message);
  }
}
async function main() {
  await run('gemini-flash-latest');
  await run('gemini-3.5-flash');
  await run('gemini-3-flash-preview');
}
main();
