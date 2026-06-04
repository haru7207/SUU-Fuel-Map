import fetch from 'node-fetch';

async function testTfrXml() {
    console.log("Fetching TFR XML feed from tfr.faa.gov...");
    const url = 'https://tfr.faa.gov/tfr2/list.xml';
    try {
        const res = await fetch(url);
        console.log("Status:", res.status, res.statusText);
        if (!res.ok) {
            console.log("Failed:", await res.text());
            return;
        }
        const text = await res.text();
        console.log("XML response snippet:");
        console.log(text.substring(0, 1000));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testTfrXml();
