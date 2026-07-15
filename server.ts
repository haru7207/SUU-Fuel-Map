import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Logging Middleware for APIs
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[Server] ${req.method} ${req.path}`);
    }
    next();
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SUUFuelMap/2.7.0'
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
