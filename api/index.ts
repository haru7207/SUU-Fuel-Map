import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/api/gemini/receipt', async (req, res) => {
    try {
        const { base64Data, mimeType } = req.body;
        if (!base64Data || !mimeType) {
            return res.status(400).json({ error: 'Missing base64Data or mimeType' });
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: [
                { inlineData: { data: base64Data, mimeType } },
                "Extract the following information from this fuel receipt. Return ONLY a JSON object with these exact keys: 'airport' (ICAO code, e.g. KCDC), 'tailNumber' (e.g. N12345), 'gallons' (number as string), 'usedCard' (one of: 'PCard', 'AVFuel', 'White Card', or 'Unknown'). If you can't find a value, leave it as an empty string."
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        airport: { type: Type.STRING },
                        tailNumber: { type: Type.STRING },
                        gallons: { type: Type.STRING },
                        usedCard: { type: Type.STRING }
                    }
                }
            }
        });
        
        if (response.text) {
            res.json(JSON.parse(response.text));
        } else {
            res.status(500).json({ error: 'Empty response from Gemini' });
        }
    } catch (error: any) {
        console.error("Gemini receipt parsing error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/gemini/format-notes', async (req, res) => {
    try {
        const { notes } = req.body;
        if (!notes) return res.status(400).json({ error: 'Missing notes' });
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `Format the following pilot notes to be professional, clear, and concise. Fix any typos. Notes: "${notes}"`
        });
        
        res.json({ formattedNotes: response.text });
    } catch (error: any) {
        console.error("Gemini notes formatting error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default app;
