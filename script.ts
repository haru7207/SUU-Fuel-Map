import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const airportIds = [
  "KCDC", "1L7", "1L8", "1L9", "U52", "KFOM", "KMLF", "KBCE", "KSGU", "KSLC",
  "KPVU", "KHND", "KVGT", "KOGD", "KPGA", "KGCN", "KKNB", "KBDG", "KCNY", "KPUC",
  "KBMC", "KBTF", "KENV", "KRIF", "KAZC", "KBDU", "KHCR", "KLGU", "U77", "KTVY",
  "KEVW", "U14", "U96", "KIFP", "U64", "KSPK", "KDTA", "41U", "IGM", "K67L"
];

async function run() {
  const prompt = `You are an aviation data expert. Provide the official FAA Airport Remarks (Form 5010) for the following US airports:
${airportIds.join(', ')}

Format the output strictly as a JSON object where the keys are the airport IDs and the values are an array of strings representing the remarks. Do not include markdown code block syntax. Only output the raw JSON. Provide highly accurate Form 5010 remarks. Make them realistic and detailed for each airport.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  
  const text = typeof response.text === 'function' ? response.text() : response.text;
  const data = JSON.parse(text);
  
  const fileContent = `export const REMARKS_DATABASE: Record<string, string[]> = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync('components/remarksDb.ts', fileContent);
  console.log('Successfully updated remarksDb.ts');
}

run().catch(console.error);
