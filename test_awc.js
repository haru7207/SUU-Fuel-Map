const fetch = require('node-fetch');

async function test() {
    const res = await fetch("https://aviationweather.gov/api/data/metar?ids=KCDC&format=json&taf=true&_cb=123");
    console.log(res.status, res.statusText);
}
test();
