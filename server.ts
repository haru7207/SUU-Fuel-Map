import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // 1. Logging Middleware for APIs
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[Server] ${req.method} ${req.path}`);
    }
    next();
  });

  // 1.5 Gemini API Proxy Routes
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

  // 2. AWC Weather & TFR Proxy Route
  app.get('/api/awc/*all', async (req: express.Request, res: express.Response) => {
    const subPath = Array.isArray(req.params.all) ? req.params.all.join('/') : req.params.all; // e.g. "metar" or "taf"
    
    // Strip _cb parameter to prevent busting NOAA's edge cache which can cause 504s
    const queryParams = new URLSearchParams(req.query as any);
    queryParams.delete('_cb');
    const queryString = queryParams.toString();
    
    const targetUrl = `https://aviationweather.gov/api/data/${subPath}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SUUFuelMap/3.0 (admin@suu.edu)',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!response.ok) {
        console.error(`[AWC Proxy] NOAA Error: ${response.status} for URL: ${targetUrl}`);
        return res.status(response.status).send(`NOAA Error: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      // Read as text to safely forward either JSON or XML/GeoJSON
      const bodyText = await response.text();
      res.send(bodyText);
    } catch (error) {
      console.error(`[AWC Proxy] Failed to proxy ${targetUrl}:`, error);
      res.status(500).send('Error proxying request to NOAA AWC');
    }
  });

  // 3. Simple API health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // 3.5 TheMealDB Proxy Route
  app.get('/api/dinner', async (req: express.Request, res: express.Response) => {
    try {
      const ingredients = req.query.ingredients as string;
      if (!ingredients) {
         return res.status(400).json({ error: 'Missing ingredients' });
      }
      
      // TheMealDB free tier mainly supports searching by a single main ingredient.
      // We will take the first ingredient provided by the user.
      const mainIngredient = ingredients.split(',')[0].trim();

      const url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIngredient)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TheMealDB API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Map TheMealDB format to the format expected by our frontend
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

  // 4. Vite middleware for development or Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Initializing Vite dev server middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Serving production static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Critical startup failure:', err);
  process.exit(1);
});
