import fetch from 'node-fetch';

async function testQuery() {
    const services = [
        'Airspace',
        'Special_Use_Airspace',
        'National_Defense_Airspace_TFR_Areas',
        'Stadiums',
        'Prohibited_Areas'
    ];

    for (const service of services) {
        console.log(`\n================== ${service} ==================`);
        const queryUrl = `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/${service}/FeatureServer/0/query`;
        
        // 1. Get count first
        try {
            const countParams = new URLSearchParams({
                where: '1=1',
                returnCountOnly: 'true',
                f: 'json'
            });
            const cRes = await fetch(`${queryUrl}?${countParams}`);
            const cData: any = await cRes.json();
            console.log(`Count of records:`, cData.count);
        } catch (e) {
            console.error(`Count failed for ${service}:`, e);
        }

        // 2. Get samples
        try {
            const sampleParams = new URLSearchParams({
                where: '1=1',
                outFields: '*',
                resultRecordCount: '3',
                f: 'json'
            });
            const sRes = await fetch(`${queryUrl}?${sampleParams}`);
            const sData: any = await sRes.json();
            if (sData.features && sData.features.length > 0) {
                console.log(`Sample feature attributes:`);
                console.log(JSON.stringify(sData.features.map((f: any) => f.attributes), null, 2));
            } else {
                console.log(`No features in response:`, sData);
            }
        } catch (e) {
            console.error(`Query failed for ${service}:`, e);
        }
    }
}

testQuery();
