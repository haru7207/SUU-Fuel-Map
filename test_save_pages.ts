import fetch from 'node-fetch';

async function testSavePages() {
    const urls = [
        "https://tfr.faa.gov/save_pages/list.xml",
        "https://tfr.faa.gov/save_pages/national_defense.xml",
        "https://tfr.faa.gov/save_pages/list.json",
        "https://tfr.faa.gov/save_pages/detail_3_1234.xml"
    ];
    for (const url of urls) {
        console.log(`\nTesting: ${url}`);
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            console.log("Status:", res.status, res.statusText);
            if (res.status === 200) {
                const text = await res.text();
                console.log("First 200 chars:", text.substring(0, 200));
            }
        } catch (e) {
            console.error("Error fetching:", url, e);
        }
    }
}

testSavePages();
