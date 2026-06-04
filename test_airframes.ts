import fetch from 'node-fetch';

async function testAirframes() {
    console.log("Fetching TFRs from airframesio/data raw GitHub URL...");
    // Let's try master or main branch
    const url = 'https://raw.githubusercontent.com/airframesio/data/master/json/faa/tfrs.geojson';
    try {
        const res = await fetch(url);
        console.log("Status:", res.status, res.statusText);
        if (!res.ok) {
            console.log("Failed to fetch from master, trying main branch...");
            const urlMain = 'https://raw.githubusercontent.com/airframesio/data/main/json/faa/tfrs.geojson';
            const resMain = await fetch(urlMain);
            console.log("Status (main):", resMain.status, resMain.statusText);
            if (!resMain.ok) {
                console.log("Failed on both branches.");
                return;
            }
            const dataMain: any = await resMain.json();
            console.log("Features count:", dataMain.features?.length);
            return;
        }
        
        const data: any = await res.json();
        console.log("GeoJSON format validated:", data.type);
        console.log("Features count:", data.features?.length);
        if (data.features && data.features.length > 0) {
            console.log("Sample feature properties:");
            console.log(JSON.stringify(data.features[0].properties, null, 2));
            
            // Search if any contains UT or Salt Lake
            const utah = data.features.filter((f: any) => {
                const text = JSON.stringify(f.properties || {}).toLowerCase();
                return text.includes('ut') || text.includes('salt lake') || text.includes('slc') || text.includes('utah');
            });
            console.log("Utah features found:", utah.length);
            if (utah.length > 0) {
                console.log("First Utah feature properties:");
                console.log(JSON.stringify(utah[0].properties, null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    }
}

testAirframes();
