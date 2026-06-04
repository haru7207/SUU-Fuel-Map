import fetch from 'node-fetch';

async function testXml() {
    console.log("Fetching list.xml programmatically...");
    const url = "https://tfr.faa.gov/tfr2/list.xml";
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'manual' // Inspect redirect
        });
        console.log("Response Status:", res.status, res.statusText);
        console.log("Response Headers:", JSON.stringify(res.headers.raw(), null, 2));
        if (res.status >= 300 && res.status < 400) {
            console.log("Redirect location:", res.headers.get('location'));
            // Follow redirect and print out first few characters
            const redirectUrl = res.headers.get('location');
            if (redirectUrl) {
                const followUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).toString();
                console.log("Following redirect to:", followUrl);
                const res2 = await fetch(followUrl);
                console.log("Redirect Response Status:", res2.status);
                const text = await res2.text();
                console.log("First 300 chars of redirect response:");
                console.log(text.substring(0, 300));
            }
        } else {
            const text = await res.text();
            console.log("First 300 chars of direct response:");
            console.log(text.substring(0, 300));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testXml();
