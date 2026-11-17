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

app.get('/api/dinner', async (req: express.Request, res: express.Response) => {
    try {
        const ingredients = req.query.ingredients as string;
        if (!ingredients) {
            return res.status(400).json({ error: 'Missing ingredients' });
        }
        
        const mainIngredient = ingredients.split(',')[0].trim();
        const url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIngredient)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TheMealDB API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        const results = (data.meals || []).slice(0, 5).map((meal: any) => ({
            id: meal.idMeal,
            title: meal.strMeal,
            image: meal.strMealThumb
        }));

        res.json({ results });
    } catch (error: any) {
        console.error("[Dinner API Proxy] Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const awcCache = new Map<string, { status: number; contentType: string; body: string; timestamp: number }>();
const AWC_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const handleAwcProxy = async (req: express.Request, res: express.Response) => {
    const rawAll = (req.params as any)?.all || req.query.path;
    let subPath = Array.isArray(rawAll) ? rawAll.join('/') : String(rawAll || '');
    if (!subPath && req.path.startsWith('/api/awc/')) {
        subPath = req.path.replace(/^\/api\/awc\//, '');
    }
    subPath = subPath.replace(/^\/+/, '');

    // Strip internal/rewrite/cache-buster parameters (_cb, path, all) because
    // NOAA AWC strictly validates query params and returns HTTP 400 if extra params like `path=metar` are present.
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
        if (key === '_cb' || key === 'path' || key === 'all' || key === '...path') continue;
        if (typeof value === 'string') {
            queryParams.set(key, value);
        } else if (Array.isArray(value) && value.length > 0) {
            queryParams.set(key, String(value[0]));
        }
    }
    const queryString = queryParams.toString();

    const targetUrl = `https://aviationweather.gov/api/data/${subPath}${queryString ? '?' + queryString : ''}`;

    const cached = awcCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < AWC_CACHE_TTL_MS) {
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        res.setHeader('X-AWC-Cache', 'HIT');
        return res.status(cached.status).send(cached.body);
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'SUUFuelMap/3.0 (admin@suu.edu)',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        if (response.status === 204) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
            return res.status(200).send('[]');
        }

        if (!response.ok) {
            console.error(`[AWC Proxy] NOAA Error: ${response.status} for URL: ${targetUrl}`);
            return res.status(response.status).send(`NOAA Error: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'application/json';
        const bodyText = (await response.text()) || '[]';

        awcCache.set(targetUrl, {
            status: 200,
            contentType,
            body: bodyText,
            timestamp: Date.now()
        });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        res.setHeader('X-AWC-Cache', 'MISS');
        res.send(bodyText);
    } catch (error) {
        console.error(`[AWC Proxy] Failed to proxy ${targetUrl}:`, error);
        if (cached) {
            res.setHeader('Content-Type', cached.contentType);
            return res.status(cached.status).send(cached.body);
        }
        res.status(500).send('Error proxying request to NOAA AWC');
    }
};

app.get('/api/awc/*all', handleAwcProxy);
app.get('/api/index.ts', (req, res, next) => {
    if (req.query.path) return handleAwcProxy(req, res);
    next();
});
app.get('/api/index', (req, res, next) => {
    if (req.query.path) return handleAwcProxy(req, res);
    next();
});

export default app;
