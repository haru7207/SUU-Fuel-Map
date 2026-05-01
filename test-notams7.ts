async function test() {
  try {
    const res = await fetch('https://notams.aim.faa.gov/notamSearch/search', {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "searchType=0&locators=KCDC"
    });
    console.log(res.status);
    const text = await res.text();
    // Maybe the actual data is loaded over AJAX later?
    console.log("HTML:", text.includes('notamData'));
  } catch(e) {}
}
test();
