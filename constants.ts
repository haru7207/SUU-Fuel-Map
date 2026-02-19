import { Airport, CardType, FuelType } from './types';

// Coordinates are approximated for the prototype based on real airport locations.
export const AIRPORT_DATABASE: Airport[] = [
  {
    id: 'KCDC',
    name: 'Sphere One (Self-Serve)',
    city: 'Cedar City',
    state: 'UT',
    lat: 37.7009,
    lon: -113.0988,
    fbo: 'Sphere One',
    phone: '435-586-4556',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPhones: {
      [FuelType.LL100]: '435-586-4556', // Self-serve
      [FuelType.JETA]: '435-590-2565'   // Truck
    },
    fuelPrices: {
      [FuelType.LL100]: 5.15,
      [FuelType.JETA]: 4.85
    },
    runways: ['02/20', '08/26'],
    runwayLengths: {
      '02/20': 8653,
      '08/26': 4822
    },
    cardRules: {
      primary: CardType.WHITE_CARD,
      notes: 'White card only - DO NOT USE ANY CC',
      fuelingNotes: 'Verify grounding wire is attached. 100LL hose is on the north side of the pump island.',
      critical: true
    }
  },
  {
    id: '1L7',
    name: 'Escalante Municipal',
    city: 'Escalante',
    state: 'UT',
    lat: 37.7627,
    lon: -111.5796,
    fbo: 'Sphere One',
    phone: 'N/A',
    fuelTypes: [FuelType.LL100],
    fuelPrices: {
      [FuelType.LL100]: 5.95
    },
    runways: ['13/31'],
    runwayLengths: { '13/31': 3990 },
    weatherSource: 'KBCE', // Bryce Canyon
    cardRules: {
      primary: CardType.WHITE_CARD,
      notes: 'White card only - DO NOT USE ANY CC',
      critical: true
    }
  },
  {
    id: '1L8',
    name: 'General Dick Stout Field',
    city: 'Hurricane',
    state: 'UT',
    lat: 37.1764,
    lon: -113.3081,
    fbo: 'Hurricane City',
    phone: '435-635-4343',
    fuelTypes: [FuelType.LL100],
    fuelPrices: {
       [FuelType.LL100]: 5.65
    },
    runways: ['01/19'],
    runwayLengths: { '01/19': 3400 },
    weatherSource: 'KSGU', // St. George
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Self Serve 24/7',
      fuelingNotes: 'Ramp has a slight slope, chock wheels securely.'
    }
  },
  {
    id: '1L9',
    name: 'Parowan Airport',
    city: 'Parowan',
    state: 'UT',
    lat: 37.8606,
    lon: -112.8456,
    fbo: 'Parowan City',
    phone: '435-477-3331',
    fuelTypes: [FuelType.LL100],
    fuelPrices: {
       [FuelType.LL100]: 5.45
    },
    runways: ['04/22'],
    runwayLengths: { '04/22': 4900 },
    weatherSource: 'KCDC', // Cedar City
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Self Serve 24/7'
    }
  },
  {
    id: 'U52',
    name: 'Beaver Municipal',
    city: 'Beaver',
    state: 'UT',
    lat: 38.2372,
    lon: -112.6775,
    fbo: 'Beaver City',
    phone: '435-438-2451',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
       [FuelType.LL100]: 5.65,
       [FuelType.JETA]: 5.25
    },
    runways: ['07/25', '13/31'],
    runwayLengths: { '07/25': 4700, '13/31': 3200 },
    weatherSource: 'KMLF', // Milford
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Self Serve'
    }
  },
  {
    id: 'KFOM',
    name: 'Fillmore Municipal',
    city: 'Fillmore',
    state: 'UT',
    lat: 38.9613,
    lon: -112.3606,
    fbo: 'Fillmore City',
    phone: '435-743-5700',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
       [FuelType.LL100]: 5.75,
       [FuelType.JETA]: 5.35
    },
    runways: ['04/22'],
    runwayLengths: { '04/22': 5040 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Self Serve'
    }
  },
  {
    id: 'KMLF',
    name: 'Milford Municipal',
    city: 'Milford',
    state: 'UT',
    lat: 38.4292,
    lon: -113.0116,
    fbo: 'Milford',
    phone: '435-387-2711',
    fuelTypes: [FuelType.LL100],
    fuelPrices: {
       [FuelType.LL100]: 5.85
    },
    runways: ['16/34'],
    runwayLengths: { '16/34': 5000 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Self Serve'
    }
  },
  {
    id: 'KBMC',
    name: 'Brigham City Regional',
    city: 'Brigham City',
    state: 'UT',
    lat: 41.5531,
    lon: -112.0628,
    fbo: 'Brigham City Airport',
    phone: '(435) 723-5702',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 5.85,
      [FuelType.JETA]: 5.45
    },
    runways: ['17/35'],
    runwayLengths: { '17/35': 8900 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KCNY',
    name: 'Canyonlands Regional',
    city: 'Moab',
    state: 'UT',
    lat: 38.7549,
    lon: -109.7548,
    fbo: 'Canyonlands',
    phone: '(435) 259-7421',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 7.15,
      [FuelType.JETA]: 6.85
    },
    runways: ['03/21', '15/33'],
    runwayLengths: { '03/21': 7100, '15/33': 4060 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KPUC',
    name: 'Carbon County Regional',
    city: 'Price',
    state: 'UT',
    lat: 39.6094,
    lon: -110.7523,
    fbo: 'Carbon County',
    phone: '(435) 637-9556',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.25,
      [FuelType.JETA]: 5.95
    },
    runways: ['01/19', '08/26'],
    runwayLengths: { '01/19': 8300, '08/26': 4500 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KBCE',
    name: 'Bryce Canyon Airport',
    city: 'Bryce Canyon',
    state: 'UT',
    lat: 37.7063,
    lon: -112.1462,
    fbo: 'Bryce Canyon',
    phone: '(435) 834-5239',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.75,
      [FuelType.JETA]: 6.25
    },
    runways: ['03/21'],
    runwayLengths: { '03/21': 7400 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KSGU',
    name: 'St. George Regional',
    city: 'St. George',
    state: 'UT',
    lat: 37.0363,
    lon: -113.5103,
    fbo: 'Million Air',
    phone: '(435) 688-8009',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 7.45,
      [FuelType.JETA]: 6.95
    },
    runways: ['01/19'],
    runwayLengths: { '01/19': 9300 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KVGT',
    name: 'North Las Vegas',
    city: 'Las Vegas',
    state: 'NV',
    lat: 36.2107,
    lon: -115.1944,
    fbo: 'VGT Terminal',
    phone: '(702) 261-3806',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.85,
      [FuelType.JETA]: 6.45
    },
    runways: ['12L/30R', '12R/30L', '07/25'],
    runwayLengths: { '12L/30R': 5000, '12R/30L': 4200, '07/25': 4200 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Busy airspace. Standard cards.'
    }
  },
  {
    id: 'KHCR',
    name: 'Heber City Municipal',
    city: 'Heber',
    state: 'UT',
    lat: 40.4819,
    lon: -111.4296,
    fbo: 'OK3 Air',
    phone: 'N/A',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 9.85,
      [FuelType.JETA]: 8.95
    },
    runways: ['04/22', '13/31'],
    runwayLengths: { '04/22': 6900, '13/31': 4400 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'HIGH PRICE - AVOID. Landing fees apply. Special permission or emergency only. Black Avfuel Card.',
      warning: true
    }
  },
  {
    id: 'KBTF',
    name: 'Skypark Airport',
    city: 'Bountiful',
    state: 'UT',
    lat: 40.8719,
    lon: -111.8974,
    fbo: 'Skypark',
    phone: '(801) 295-3877',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.05,
      [FuelType.JETA]: 5.55
    },
    runways: ['16/34'],
    runwayLengths: { '16/34': 4700 },
    weatherSource: 'KSLC',
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KOGD',
    name: 'Ogden-Hinckley',
    city: 'Ogden',
    state: 'UT',
    lat: 41.1959,
    lon: -112.0118,
    fbo: 'Kemp Jet Services',
    phone: '(801) 627-0040',
    fuelTypes: [FuelType.LL100, FuelType.JETA, FuelType.JETA_PLUS],
    fuelPrices: {
      [FuelType.LL100]: 5.95,
      [FuelType.JETA]: 5.65,
      [FuelType.JETA_PLUS]: 5.75
    },
    runways: ['03/21', '17/35', '07/25'],
    runwayLengths: { '03/21': 8150, '17/35': 5200, '07/25': 4300 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KENV',
    name: 'Wendover Airport',
    city: 'Wendover',
    state: 'UT',
    lat: 40.7187,
    lon: -114.0309,
    fbo: 'Wendover',
    phone: '(435) 843-3360',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.15,
      [FuelType.JETA]: 5.85
    },
    runways: ['08/26', '12/30'],
    runwayLengths: { '08/26': 10000, '12/30': 8000 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KRIF',
    name: 'Richfield Municipal',
    city: 'Richfield',
    state: 'UT',
    lat: 38.7369,
    lon: -112.1123,
    fbo: 'Richfield',
    phone: '(435) 896-9413',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 5.95,
      [FuelType.JETA]: 5.55
    },
    runways: ['01/19'],
    runwayLengths: { '01/19': 6600 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'New fuel system installed. Black Avfuel Card NO LONGER ACCEPTED. Use PCard.',
      warning: true
    },
    userNotes: [
        {
            id: 'note-krif-report',
            text: 'Fuel in Richfield did not accept the black fuel card. New fuel system installed. Use PCard.',
            date: '2025-05-20T12:00:00Z',
            author: 'Instructor Feedback',
            type: 'discrepancy'
        }
    ]
  },
  {
    id: 'KPGA',
    name: 'Page Municipal',
    city: 'Page',
    state: 'AZ',
    lat: 36.9261,
    lon: -111.4484,
    fbo: 'Million Air',
    phone: '(928) 645-2987',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 7.25,
      [FuelType.JETA]: 6.85
    },
    runways: ['15/33', '07/25'],
    runwayLengths: { '15/33': 5950, '07/25': 5500 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    },
    userNotes: [
      {
        id: 'note-kpga-2',
        text: 'Use Black card (8615) for this airport!',
        date: '2026-01-29T12:00:00Z',
        author: 'Instructor (Me)',
        type: 'discrepancy'
      },
      {
        id: 'note-kpga-1',
        text: 'Confirmed they accept the Black Avfuel Card (8615) as of today. Used it for the Seminole.',
        date: '2024-05-20T10:00:00Z',
        author: 'Instructor A',
        type: 'discrepancy'
      }
    ]
  },
  {
    id: 'KSLC',
    name: 'Salt Lake International',
    city: 'Salt Lake City',
    state: 'UT',
    lat: 40.7899,
    lon: -111.9791,
    fbo: 'Signature / Atlantic',
    phone: '(801) 359-2085',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPhones: {
        [FuelType.LL100]: '(801) 359-2085', // Signature
        [FuelType.JETA]: '(385) 715-7192'  // Atlantic
    },
    fuelPrices: {
      [FuelType.LL100]: 8.95,
      [FuelType.JETA]: 8.25
    },
    runways: ['16L/34R', '16R/34L', '17/35', '14/32'],
    runwayLengths: { '16L/34R': 12000, '16R/34L': 12000, '17/35': 9600, '14/32': 4900 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Different cards for different fuels/FBOs. Check fuel type.',
      warning: true,
      byFuelType: {
          [FuelType.LL100]: CardType.PCARD,
          [FuelType.JETA]: CardType.AVFUEL
      }
    }
  },
  {
    id: 'KHND',
    name: 'Henderson Executive',
    city: 'Henderson',
    state: 'NV',
    lat: 35.9729,
    lon: -115.1344,
    fbo: 'Henderson Exec',
    phone: '(702) 261-4800',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 7.85,
      [FuelType.JETA]: 7.35
    },
    runways: ['17R/35L', '17L/35R'],
    runwayLengths: { '17R/35L': 6500, '17L/35R': 5000 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'PCard for 100LL, Black Avfuel for Jet A',
      warning: true,
      byFuelType: {
        [FuelType.LL100]: CardType.PCARD,
        [FuelType.JETA]: CardType.AVFUEL
      }
    }
  },
  {
    id: 'KPVU',
    name: 'Provo Municipal',
    city: 'Provo',
    state: 'UT',
    lat: 40.2192,
    lon: -111.7232,
    fbo: 'Signature Aviation',
    phone: '(801) 852-6715',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 7.35,
      [FuelType.JETA]: 6.95
    },
    runways: ['13/31', '18/36'],
    runwayLengths: { '13/31': 8600, '18/36': 6600 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Standard Cards Accepted'
    }
  },
  {
    id: 'KLGU',
    name: 'Logan-Cache Airport',
    city: 'Logan',
    state: 'UT',
    lat: 41.7877,
    lon: -111.8532,
    fbo: 'Leading Edge Aviation',
    phone: '(435) 752-5955',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.15,
      [FuelType.JETA]: 5.75
    },
    runways: ['17/35', '10/28'],
    runwayLengths: { '17/35': 9000, '10/28': 5000 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Standard Cards Accepted'
    }
  },
  {
    id: 'U77',
    name: 'Spanish Fork Muni',
    city: 'Spanish Fork',
    state: 'UT',
    lat: 40.1417,
    lon: -111.6601,
    fbo: 'Spanish Fork',
    phone: '(801) 804-4593',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.05,
      [FuelType.JETA]: 5.65
    },
    runways: ['12/30'],
    runwayLengths: { '12/30': 6500 },
    weatherSource: 'KPVU', // Provo
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Self Serve 24/7'
    }
  },
  {
    id: 'KTVY',
    name: 'Tooele Valley',
    city: 'Tooele',
    state: 'UT',
    lat: 40.6128,
    lon: -112.3831,
    fbo: 'Tooele FBO',
    phone: '(435) 843-3440',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 5.95,
      [FuelType.JETA]: 5.45
    },
    runways: ['17/35'],
    runwayLengths: { '17/35': 5500 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Standard Cards Accepted'
    }
  },
  {
    id: 'KEVW',
    name: 'Evanston-Uinta',
    city: 'Evanston',
    state: 'WY',
    lat: 41.2750,
    lon: -111.0290,
    fbo: 'Uinta Aviation',
    phone: '(307) 789-9477',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    fuelPrices: {
      [FuelType.LL100]: 6.25,
      [FuelType.JETA]: 5.85
    },
    runways: ['05/23', '16/34'],
    runwayLengths: { '05/23': 7300, '16/34': 3900 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'High Elevation operation'
    }
  },
  {
    id: 'KBDG',
    name: 'Blanding Municipal',
    city: 'Blanding',
    state: 'UT',
    lat: 37.5833,
    lon: -109.4833,
    fbo: 'Freedom Fuels',
    phone: '(801) 828-7211',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    runways: ['17/35'],
    runwayLengths: { '17/35': 5800 },
    weatherSource: 'KCNY',
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'U14',
    name: 'Nephi Municipal',
    city: 'Nephi',
    state: 'UT',
    lat: 39.7333,
    lon: -111.8667,
    fbo: 'Nephi Jet Center',
    phone: '(435) 262-9669',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    runways: ['17/35'],
    runwayLengths: { '17/35': 6400 },
    weatherSource: 'KPVU',
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'U96',
    name: 'Cal Black Memorial',
    city: 'Halls Crossing',
    state: 'UT',
    lat: 37.4,
    lon: -110.5,
    fbo: 'Roughrock Aviation',
    phone: '(435) 684-2419',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    runways: ['01/19'],
    runwayLengths: { '01/19': 5700 },
    weatherSource: 'KPGA',
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KIFP',
    name: 'Bullhead International',
    city: 'Bullhead City',
    state: 'AZ',
    lat: 35.15,
    lon: -114.55,
    fbo: 'Signature',
    phone: '(928) 754-3020',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    runways: ['16/34'],
    runwayLengths: { '16/34': 8500 },
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: '67L',
    name: 'Mesquite Airport',
    city: 'Mesquite',
    state: 'NV',
    lat: 36.83,
    lon: -114.06,
    fbo: 'City of Mesquite',
    phone: '(702) 346-2841',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    runways: ['01/19'],
    runwayLengths: { '01/19': 5100 },
    weatherSource: 'KIFP',
    cardRules: {
      primary: CardType.AVFUEL,
      notes: 'Black Avfuel Card (8615) Accepted'
    }
  },
  {
    id: 'KGCN',
    name: 'Grand Canyon National Park',
    city: 'Grand Canyon',
    state: 'AZ',
    lat: 35.9524,
    lon: -112.1469,
    fbo: 'Wiseman Aviation',
    phone: '(928) 638-2359',
    fuelTypes: [FuelType.LL100, FuelType.JETA],
    runways: ['03/21'],
    runwayLengths: { '03/21': 9000 },
    cardRules: {
      primary: CardType.PCARD,
      notes: 'Standard Cards Accepted. High tourist traffic.'
    }
  }
];
