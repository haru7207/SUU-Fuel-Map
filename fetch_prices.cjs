const fs = require('fs');

async function updateConstants() {
  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbwLYchReDkCKVkVdNs2G6RfXV8M2DmInbwsYtFnCRrdI-wiyAoTwGoeCdsZluMwJtK5/exec');
    const data = await res.json();
    fs.writeFileSync('fuel_data_preview.json', JSON.stringify(data, null, 2));
    console.log("Written data!");
  } catch (err) {
    console.error(err);
  }
}
updateConstants();
