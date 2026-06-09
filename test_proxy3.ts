async function run() {
  const url = "https://aviationweather.gov/api/data/metar?ids=KCDC&format=json";
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  const text = await res.text();
  console.log(text.substring(0, 100));
}
run();
