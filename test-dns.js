import https from 'https';
https.get('https://api.aviationapi.com/v1/charts?apt=KLAX', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('success', data.slice(0, 100)));
}).on('error', err => console.log('error', err));
