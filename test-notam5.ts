async function test() {
  try {
    const res = await fetch('https://aviationweather.gov/api/data/notam?icao=KCDC');
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log(text.slice(0, 500));
  } catch (e) {
    console.log(e);
  }
}
test();
