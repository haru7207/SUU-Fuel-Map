import { fetchAllWeather } from './services/aviationService';

async function run() {
  const weatherMap = await fetchAllWeather(['KCDC', 'K1L8']);
  console.log('WeatherMap:', JSON.stringify(weatherMap, null, 2));
}
run();
