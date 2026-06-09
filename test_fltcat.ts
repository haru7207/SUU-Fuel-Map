async function run() {
  const url = "https://aviationweather.gov/api/data/metar?ids=KCDC&format=json";
  const res = await fetch(url);
  const json = await res.json();
  console.log(json[0].fltcat);
  console.log(Object.keys(json[0]));
}
run();
