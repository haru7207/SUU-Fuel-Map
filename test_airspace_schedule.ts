import fetch from 'node-fetch';

async function testSchedule() {
    console.log("Fetching features from Airspace_Schedule...");
    const url = new URL("https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Airspace_Schedule/FeatureServer/0/query");
    url.searchParams.append('where', '1=1');
    url.searchParams.append('outFields', '*');
    url.searchParams.append('f', 'json');
    url.searchParams.append('resultRecordCount', '100');

    try {
        const res = await fetch(url.toString());
        const data: any = await res.json();
        if (data && data.features) {
            console.log("Total scheduled features:", data.features.length);
            if (data.features.length > 0) {
                console.log("Sample scheduled features attributes:");
                console.log(data.features.slice(0, 5).map((f: any) => f.attributes));
            }
        } else {
            console.log("No data:", data);
        }
    } catch (e) {
        console.error(e);
    }
}

testSchedule();
