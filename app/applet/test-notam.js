async function test() {
  try {
    const res = await fetch('https://notams.aim.faa.gov/notamSearch/search', {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "searchType=0&locators=KCDC"
    });
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}
test();
