async function run() {
  const url = "https://aviationweather.gov/api/data/metar?ids=KCDC&format=json";
  const res = await fetch(url, { method: 'OPTIONS' });
  res.headers.forEach((value, key) => console.log(`${key}: ${value}`));
}
run();
