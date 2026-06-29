import { fetchSafe } from './services/aviationService';
fetch('https://aviationweather.gov/api/data/notam?ids=KCDC').then(r => r.text()).then(t => console.log(t.substring(0, 500)));
