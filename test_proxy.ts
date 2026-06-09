async function run() {
  const url = "https://aviationweather.gov/api/data/metar?ids=KCDC&format=json";
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  const text = await res.text();
  console.log(text.substring(0, 100));
}
run();
