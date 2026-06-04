import fetch from 'node-fetch';

async function listUniqueTypes() {
    console.log("Fetching unique airspace types...");
    const url = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Airspace/FeatureServer/0/query";
    const params = new URLSearchParams({
        where: "1=1",
        outFields: "LOCALTYPE_TXT,TYPE_CODE",
        returnGeometry: "false",
        f: "json",
        resultRecordCount: "2000"
    });

    try {
        const res = await fetch(`${url}?${params.toString()}`);
        const data: any = await res.json();
        if (data && data.features) {
            const types = new Set<string>();
            const codes = new Set<string>();
            data.features.forEach((f: any) => {
                if (f.attributes.LOCALTYPE_TXT) types.add(f.attributes.LOCALTYPE_TXT);
                if (f.attributes.TYPE_CODE) codes.add(f.attributes.TYPE_CODE);
            });
            console.log("Unique LOCALTYPE_TXT:", Array.from(types));
            console.log("Unique TYPE_CODE:", Array.from(codes));
        } else {
            console.log("No data returned:", data);
        }
    } catch (e) {
        console.error(e);
    }
}

listUniqueTypes();
