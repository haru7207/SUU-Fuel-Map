import fetch from 'node-fetch';

async function viewFeatureSpec() {
    console.log("Analyzing /api/data/feature parameter details...");
    const url = 'https://aviationweather.gov/data/schema/openapi.yaml';
    try {
        const res = await fetch(url);
        if (!res.ok) { return; }
        const text = await res.text();
        const lines = text.split('\n');
        
        let inFeatureBlock = false;
        let pCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('/api/data/feature:')) {
                inFeatureBlock = true;
            }
            if (inFeatureBlock) {
                console.log(line);
                pCount++;
                if (pCount > 40) break; // Print first 40 lines of the feature section
            }
        }
    } catch (e) {
        console.error(e);
    }
}

viewFeatureSpec();
