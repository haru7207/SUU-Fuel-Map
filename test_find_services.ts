import fetch from 'node-fetch';

async function listAllFaaServices() {
    console.log("Listing all FAA ArcGIS services...");
    const url = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services?f=json';
    try {
        const res = await fetch(url);
        console.log("Status:", res.status, res.statusText);
        if (!res.ok) {
            console.log(await res.text());
            return;
        }
        const data: any = await res.json();
        if (data.services) {
            console.log("Total services found:", data.services.length);
            const serviceNames = data.services.map((s: any) => `${s.name} (${s.type})`);
            console.log("Services list:");
            console.log(serviceNames);
            
            // Search for "tfr" or "flight" or "restriction" in service names
            const filtered = serviceNames.filter((name: string) => 
                name.toLowerCase().includes('tfr') || 
                name.toLowerCase().includes('flight') || 
                name.toLowerCase().includes('restrict') ||
                name.toLowerCase().includes('temp')
            );
            console.log("\nServices matching keywords (tfr, flight, restrict, temp):");
            console.log(filtered);
        } else {
            console.log("No services array:", data);
        }
    } catch (e) {
        console.error("Failed to list services:", e);
    }
}

listAllFaaServices();
