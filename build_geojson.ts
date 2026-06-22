import fs from 'fs';
import { AIRPORT_DATABASE } from './constants';

const airportsData = [
  {"airportcode":"KCDC","fboprovider":"Sphere One ","fueltype":"White card only","contact":"","cardtype":"White (Sphere One)","note":""},
  {"airportcode":"1L7","fboprovider":"Sphere One ","fueltype":"White card only","contact":"","cardtype":"White (Sphere One)","note":""},
  {"airportcode":"KBMC","fboprovider":"Brigham City Regional Airport","fueltype":"100LL & Jet A ","contact":"(435) 723-5702","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KCNY","fboprovider":"Canyonlands Regional Airport","fueltype":"100LL & Jet A ","contact":"(435) 259-7421","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KPUC","fboprovider":"Carbon County Regional Airport","fueltype":"100LL & Jet A ","contact":"(435) 637-9556","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KBCE","fboprovider":"Bryce Canyon Airport","fueltype":"100LL & Jet A ","contact":"(435) 834-5239","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KSGU","fboprovider":"Million Air","fueltype":"100LL & Jet A ","contact":"(435) 688-8009","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KBDG","fboprovider":"Blanding Municipal Airport - Freedom Fuels Blanding Air Support","fueltype":"100LL & Jet A ","contact":"(801) 828-7211","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KHCR","fboprovider":"Heber City Municipal","fueltype":"","contact":"","cardtype":"Black AVFuel Card (8615)","note":"*High Price, w/ special permission only, Avoid due to landing fee and high-priced fuel  w/special permission or emergency"},
  {"airportcode":"KBTF","fboprovider":"Skypark Airport","fueltype":"100LL & Jet A ","contact":"(801) 295-3877","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KOGD","fboprovider":"Ogden-Hinckley Airport - Kemp Jet Services","fueltype":"100LL & Jet A & Jet A+ ","contact":"(801)627-0040","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KENV","fboprovider":"Wendover Airport","fueltype":"100LL & Jet A","contact":"(435) 843-3360","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KRIF","fboprovider":"Richfield Municipal Airport","fueltype":"100LL & Jet A ","contact":"(435) 896-9413","cardtype":"Black AVFuel Card (8615)","note":"New fuel system installed. Use PCard if the Black Card is denied"},
  {"airportcode":"U14","fboprovider":"Nephi Municipal Airport - Nephi Jet Center","fueltype":"100LL & Jet A ","contact":"(435) 262-9669","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"U96","fboprovider":"Roughrock Aviation","fueltype":"100LL & Jet A ","contact":"(435) 684-2419","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KPGA","fboprovider":"Page Municipal Airport - Million Air","fueltype":"100LL & Jet A ","contact":"(928) 645-2987","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KIFP","fboprovider":"Bullhead International Airport - Signature","fueltype":"100LL & Jet A ","contact":"(928) 754-3020","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"K67L","fboprovider":"Mesquite Airport - City of Mesquite","fueltype":"100LL & Jet A ","contact":"(702) 346-2841","cardtype":"Black AVFuel Card (8615)","note":""},
  {"airportcode":"KKNB","fboprovider":"Kanab Municipal Airport - City of Kanab","fueltype":"100LL & Jet A ","contact":"(435) 644-2299","cardtype":"PCard","note":""},
  {"airportcode":"KLGU","fboprovider":"Logan-Cache Airport - Leading Edge Aviation","fueltype":"100LL & Jet A ","contact":"(435) 752-5955","cardtype":"PCard","note":""},
  {"airportcode":"U64","fboprovider":"Monticello Airport","fueltype":"100LL & Jet A ","contact":"(435) 587-2271","cardtype":"PCard","note":""},
  {"airportcode":"1L9","fboprovider":"Parowan Airport - Parowan Aviation","fueltype":"100LL & Jet A ","contact":"(435) 867-0278","cardtype":"PCard","note":""},
  {"airportcode":"KSPK","fboprovider":"Utah Aviation-Spanish Fork","fueltype":"100LL & Jet A ","contact":"(801) 804-4593","cardtype":"PCard","note":""},
  {"airportcode":"KDTA","fboprovider":"Delta Municipal Airport","fueltype":"100LL & Jet A ","contact":"(435) 864-2759","cardtype":"PCard","note":""},
  {"airportcode":"KFOM","fboprovider":"Fillmore Municipal Airport","fueltype":"100LL & Jet A ","contact":"(435) 743-6150","cardtype":"PCard","note":""},
  {"airportcode":"1L8","fboprovider":"General Dick Stout Field Airport","fueltype":"100LL & Jet A ","contact":"(435) 635-2811","cardtype":"PCard","note":""},
  {"airportcode":"41U","fboprovider":"Manti-Ephraim Airport","fueltype":"100LL & Jet A ","contact":"(435) 283-4631","cardtype":"PCard","note":""},
  {"airportcode":"KMLF","fboprovider":"Milford Municipal","fueltype":"100LL & Jet A ","contact":"(435) 463-9565","cardtype":"PCard","note":""},
  {"airportcode":"U52","fboprovider":"Beaver Airport","fueltype":"100LL & Jet A ","contact":"(435) 438-2451","cardtype":"PCard","note":""},
  {"airportcode":"KPVU","fboprovider":"Signature Aviation","fueltype":"100LL & Jet A ","contact":"(801) 852-6715","cardtype":"PCard","note":""},
  {"airportcode":"KSLC","fboprovider":"Atlantic Aviation","fueltype":"100LL & Jet A ","contact":"(385) 715-7192","cardtype":"PCard","note":"Answers Radio's at night"},
  {"airportcode":"KSLC","fboprovider":"SLC International Airport - Signature","fueltype":"100LL & Jet A ","contact":"(801) 359-2085","cardtype":"PCard","note":""},
  {"airportcode":"IGM","fboprovider":"Kingman Airport","fueltype":"100LL & Jet A ","contact":"(928) 757-2134","cardtype":"PCard","note":""},
  {"airportcode":"KAZC","fboprovider":"West Wing Aviation - Colorado City","fueltype":"100LL & Jet A ","contact":"(702) 578-3348","cardtype":"PCard","note":""},
  {"airportcode":"KGCN","fboprovider":"Grand Canyon National Park Airport - Grand Canyon Airlines","fueltype":"100LL & Jet A ","contact":"(928) 638-7117","cardtype":"PCard","note":""},
  {"airportcode":"KBDU","fboprovider":"Boulder Municipal","fueltype":"100LL & Jet A ","contact":"(801) 359-2086","cardtype":"PCard","note":""},
  {"airportcode":"KVGT","fboprovider":"North Las Vegas Airport","fueltype":"100LL & Jet A ","contact":"(702) 261-3801","cardtype":"PCard","note":""},
  {"airportcode":"KHND","fboprovider":"Henderson Executive Airport","fueltype":"100LL & Jet A","contact":"(702) 261-4800","cardtype":"PCard","note":"Black AVFuel card for JET A"},
  {"airportcode":"KTVY","fboprovider":"Toole Valley Airport - SLC Department of Airports","fueltype":"100LL Only ","contact":"(801) 575-2401 (Airport Owner's)\n(801) 209-1571 (Airport Manager's)","cardtype":"PCard","note":""}
];

// Fallback lookup if not in AIRPORT_DATABASE
async function geocode(airportcode: string) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${airportcode}+airport+usa&format=json&limit=1`, { headers: { 'User-Agent': 'ais-studio (dev)' } });
    const data = await res.json();
    if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
}

async function run() {
    const geojson = {
        type: "FeatureCollection",
        features: [] as any[]
    };
    
    // We want unique by FBO + Airport code if KSLC has 2
    const added = new Set<string>();

    for (const record of airportsData) {
        let code = record.airportcode.trim();
        
        let dbAirport = AIRPORT_DATABASE.find(a => a.id === code || a.id === 'K' + code);
        let lat, lon;
        
        if (dbAirport) {
            lat = dbAirport.lat;
            lon = dbAirport.lon;
        } else {
            console.log("Missing " + code + ", trying geocode");
            const geo = await geocode(code);
            if (geo) {
                lat = geo.lat;
                lon = geo.lon;
            } else {
                console.log("Failed to find coord for " + code);
                continue;
            }
        }
        
        let cardBase = record.cardtype.split(' ')[0].replace('Card', '').trim();
        if (cardBase.toLowerCase() === 'pcard' || cardBase.toLowerCase() === 'p') cardBase = 'PCard';
        else if (cardBase.toLowerCase() === 'white') cardBase = 'White Card';
        else if (cardBase.toLowerCase() === 'black') cardBase = 'Black Card';
        else cardBase += ' Card';
        
        const title = `${record.airportcode}_${cardBase}`;
        
        const uid = title + '_' + record.fboprovider;
        if (added.has(uid)) continue;
        added.add(uid);
        
        // Add minimal variance for identical duplicates (like KSLC)
        if (geojson.features.find(f => f.geometry.coordinates[0] === lon && f.geometry.coordinates[1] === lat)) {
             lat += (Math.random() - 0.5) * 0.005;
             lon += (Math.random() - 0.5) * 0.005;
        }

        geojson.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lon, lat]
            },
            properties: {
                name: title,
                title: title,
                CardType: record.cardtype,
                FBOProvider: record.fboprovider,
                FuelType: record.fueltype,
                Contact: record.contact,
                Note: record.note
            }
        });
    }
    
    fs.writeFileSync('output.geojson', JSON.stringify(geojson, null, 2));
    console.log("DONE!");
}

run();
