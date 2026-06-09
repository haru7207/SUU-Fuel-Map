import { fetchWeather } from './services/aviationService';

async function run() {
  console.log('Fetching KCDC weather...');
  try {
      const weather = await fetchWeather('KCDC');
      console.log('Weather:', JSON.stringify(weather, null, 2));
  } catch (e) {
      console.error(e);
  }
}
run();
