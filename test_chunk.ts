async function run() {
  const url = "https://aviationweather.gov/api/data/metar?ids=KCDC,1L7,1L8,1L9,U52&format=json";
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  console.log(res.status, res.statusText);
  const text = await res.text();
  console.log(text.substring(0, 100));
}
run();
