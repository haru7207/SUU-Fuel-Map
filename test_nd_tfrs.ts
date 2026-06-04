import fetch from 'node-fetch';

async function testAllNdTfrs() {
    console.log("Fetching all features from National_Defense_Airspace_TFR_Areas...");
    const url = new URL("https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/National_Defense_Airspace_TFR_Areas/FeatureServer/0/query");
    url.searchParams.append('where', '1=1');
    url.searchParams.append('outFields', '*');
    url.searchParams.append('outSR', '4326');
    url.searchParams.append('f', 'json'); // Keep it compact
    url.searchParams.append('returnGeometry', 'true');

    try {
        const res = await fetch(url.toString());
        const data: any = await res.json();
        if (data && data.features) {
            console.log("Total features:", data.features.length);
            const items = data.features.map((f: any) => ({
                id: f.attributes.OBJECTID,
                name: f.attributes.NAME,
                type: f.attributes.TYPE_CODE,
                localType: f.attributes.LOCAL_TYPE,
                city: f.attributes.CITY,
                state: f.attributes.STATE,
                wkhrRm: f.attributes.WKHR_RMK
            }));
            
            console.log("All features in layer:");
            console.log(JSON.stringify(items, null, 2));

            // Check if any is near Salt Lake City, Utah, or UT
            const utah = items.filter((x: any) => 
                (x.name && x.name.toLowerCase().includes('salt')) ||
                (x.city && x.city.toLowerCase().includes('salt')) ||
                (x.state && x.state === 'UT')
            );
            console.log("Utah features count:", utah.length);
            console.log("Utah features:", utah);
        } else {
            console.log("Response does not contain features:", data);
        }
    } catch (e) {
        console.error(e);
    }
}

testAllNdTfrs();
