async function test() {
  const urls = [
    'https://notams.aim.faa.gov/notamSearch/search?searchType=0&locators=KCDC',
    'https://nfdc.faa.gov/xfs/rest/notams?location=KCDC',
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u);
      console.log(u, res.status);
      const text = await res.text();
      console.log(text.slice(0, 100));
    } catch(e) { console.log(e); }
  }
}
test();
