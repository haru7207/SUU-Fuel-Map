async function test() {
  try {
    const res = await fetch('https://aviationapi.com/v1/notams?apt=KCDC');
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log(text.slice(0, 500));
  } catch (e) {
    console.log(e);
  }
}
test();
