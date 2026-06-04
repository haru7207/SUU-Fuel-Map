import fetch from 'node-fetch';

async function testLayers() {
    const services = [
        'Airspace',
        'Special_Use_Airspace',
        'Airspace_Schedule',
        'National_Defense_Airspace_TFR_Areas',
        'Stadiums',
        'Prohibited_Areas'
    ];

    for (const service of services) {
        console.log(`\n--- SERVICE: ${service} ---`);
        const url = `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/${service}/FeatureServer?f=json`;
        try {
            const res = await fetch(url);
            const data: any = await res.json();
            if (data.layers) {
                console.log("Layers:", data.layers.map((l: any) => `${l.id}: ${l.name}`));
            } else {
                console.log("No layers:", data);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

testLayers();
