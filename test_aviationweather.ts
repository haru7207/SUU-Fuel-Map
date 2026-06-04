import fetch from 'node-fetch';

async function testAirSigmet() {
    console.log("Fetching /api/data/airsigmet...");
    const url = 'https://aviationweather.gov/api/data/airsigmet?format=geojson';
    try {
        const res = await fetch(url);
        console.log("Status:", res.status, res.statusText);
        if (!res.ok) {
            console.log(await res.text());
            return;
        }
        const data: any = await res.json();
        console.log("AirSigmet features count:", data.features?.length);
        if (data.features && data.features.length > 0) {
            console.log("Keys in properties of first feature:", Object.keys(data.features[0].properties || {}));
            console.log("First feature props:", JSON.stringify(data.features[0].properties, null, 2));
            const types = new Set(data.features.map((f: any) => f.properties?.type));
            console.log("Unique types:", Array.from(types));
        }
    } catch (e) {
        console.error(e);
    }
}

testAirSigmet();
