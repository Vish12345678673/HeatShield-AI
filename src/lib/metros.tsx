import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface MetroClimate {
  base: number;
  swing: number;
  humidity: number;
}

export interface MetroBox {
  north: number;
  south: number;
  west: number;
  east: number;
}

export interface RouteBox {
  latMin: number;
  latSpan: number;
  lngMin: number;
  lngSpan: number;
}

export interface Metro {
  id: string;
  city: string;
  state: string;
  label: string;
  lat: number;
  lng: number;
  timezone: string;
  climate: MetroClimate;
  box: MetroBox;
  districts: string[];
  waypoints: {
    start: string;
    dest: string;
    corridor: string;
  };
}

function makeBox(
  lat: number,
  lng: number,
  latSpan: number,
  lngSpan: number,
): MetroBox {
  return {
    north: lat + latSpan / 2,
    south: lat - latSpan / 2,
    west: lng - lngSpan / 2,
    east: lng + lngSpan / 2,
  };
}

export const METROS: Metro[] = [
  {
    id: "las-vegas",
    city: "Las Vegas",
    state: "NV",
    label: "Las Vegas, NV",
    lat: 36.1699,
    lng: -115.1398,
    timezone: "America/Los_Angeles",
    climate: {
      base: 29.5,
      swing: 11.5,
      humidity: 18,
    },
    box: {
      north: 36.4,
      south: 35.9,
      west: -115.42,
      east: -114.9,
    },
    districts: [
      "The Strip",
      "Downtown",
      "Summerlin",
      "Henderson",
      "Spring Valley",
      "Paradise",
      "Enterprise",
      "North Las Vegas",
      "Sunrise Manor",
      "Winchester",
      "Charleston",
      "Rancho",
      "Desert Shores",
      "Centennial Hills",
      "Aliante",
      "Anthem",
      "Green Valley",
      "Silverado Ranch",
      "Mountains Edge",
      "Southern Highlands",
      "Whitney Ranch",
      "The Lakes",
      "Tule Springs",
      "Inspirada",
    ],
    waypoints: {
      start: "UNLV Campus",
      dest: "Downtown Transit Center",
      corridor: "Wash corridor",
    },
  },

  {
    id: "phoenix",
    city: "Phoenix",
    state: "AZ",
    label: "Phoenix, AZ",
    lat: 33.4484,
    lng: -112.074,
    timezone: "America/Phoenix",
    climate: {
      base: 31,
      swing: 10.5,
      humidity: 15,
    },
    box: makeBox(33.4484, -112.074, 0.5, 0.56),
    districts: [
      "Downtown Phoenix",
      "Scottsdale",
      "Tempe",
      "Mesa",
      "Chandler",
      "Glendale",
      "Gilbert",
      "Peoria",
      "Surprise",
      "Avondale",
      "Goodyear",
      "Buckeye",
      "Fountain Hills",
      "Paradise Valley",
      "Ahwatukee",
      "Arcadia",
    ],
    waypoints: {
      start: "Arizona State University",
      dest: "Phoenix City Hall",
      corridor: "Salt River greenway",
    },
  },

  {
    id: "houston",
    city: "Houston",
    state: "TX",
    label: "Houston, TX",
    lat: 29.7604,
    lng: -95.3698,
    timezone: "America/Chicago",
    climate: {
      base: 28,
      swing: 6.5,
      humidity: 72,
    },
    box: makeBox(29.7604, -95.3698, 0.5, 0.6),
    districts: [
      "Downtown Houston",
      "Midtown",
      "Montrose",
      "The Heights",
      "Galleria",
      "Energy Corridor",
      "Katy",
      "Sugar Land",
      "Cypress",
      "Spring",
      "Pearland",
      "Pasadena",
      "Baytown",
      "Clear Lake",
      "Kingwood",
      "Memorial",
    ],
    waypoints: {
      start: "Rice University",
      dest: "Discovery Green",
      corridor: "Buffalo Bayou greenway",
    },
  },

  {
    id: "miami",
    city: "Miami",
    state: "FL",
    label: "Miami, FL",
    lat: 25.7617,
    lng: -80.1918,
    timezone: "America/New_York",
    climate: {
      base: 28,
      swing: 4.5,
      humidity: 74,
    },
    box: makeBox(25.7617, -80.1918, 0.38, 0.42),
    districts: [
      "Downtown Miami",
      "Brickell",
      "Wynwood",
      "Little Havana",
      "Miami Beach",
      "Coral Gables",
      "Coconut Grove",
      "Doral",
      "Hialeah",
      "Kendall",
      "Aventura",
      "North Miami",
      "Homestead",
      "Key Biscayne",
      "Overtown",
      "Allapattah",
    ],
    waypoints: {
      start: "Wynwood",
      dest: "Bayfront Park",
      corridor: "Biscayne corridor",
    },
  },

  {
    id: "los-angeles",
    city: "Los Angeles",
    state: "CA",
    label: "Los Angeles, CA",
    lat: 34.0522,
    lng: -118.2437,
    timezone: "America/Los_Angeles",
    climate: {
      base: 23.5,
      swing: 6.5,
      humidity: 55,
    },
    box: makeBox(34.0522, -118.2437, 0.5, 0.65),
    districts: [
      "Downtown LA",
      "Hollywood",
      "Santa Monica",
      "Beverly Hills",
      "Pasadena",
      "Long Beach",
      "Glendale",
      "Burbank",
      "Culver City",
      "Inglewood",
      "Koreatown",
      "Echo Park",
      "Venice",
      "Westwood",
      "Van Nuys",
      "San Fernando Valley",
    ],
    waypoints: {
      start: "Union Station",
      dest: "Santa Monica Pier",
      corridor: "LA River greenway",
    },
  },

  {
    id: "dallas",
    city: "Dallas",
    state: "TX",
    label: "Dallas, TX",
    lat: 32.7767,
    lng: -96.797,
    timezone: "America/Chicago",
    climate: {
      base: 29,
      swing: 8,
      humidity: 55,
    },
    box: makeBox(32.7767, -96.797, 0.5, 0.65),
    districts: [
      "Downtown Dallas",
      "Uptown",
      "Deep Ellum",
      "Oak Lawn",
      "Bishop Arts",
      "Plano",
      "Frisco",
      "Irving",
      "Garland",
      "Richardson",
      "Arlington",
      "Fort Worth",
      "Mesquite",
      "McKinney",
      "Denton",
      "Carrollton",
    ],
    waypoints: {
      start: "Deep Ellum",
      dest: "Klyde Warren Park",
      corridor: "Katy Trail",
    },
  },

  {
    id: "atlanta",
    city: "Atlanta",
    state: "GA",
    label: "Atlanta, GA",
    lat: 33.749,
    lng: -84.388,
    timezone: "America/New_York",
    climate: {
      base: 26,
      swing: 7,
      humidity: 65,
    },
    box: makeBox(33.749, -84.388, 0.5, 0.6),
    districts: [
      "Downtown Atlanta",
      "Midtown",
      "Buckhead",
      "Virginia-Highland",
      "Decatur",
      "Sandy Springs",
      "Marietta",
      "Roswell",
      "Alpharetta",
      "Smyrna",
      "East Point",
      "College Park",
      "Dunwoody",
      "Brookhaven",
      "Grant Park",
      "West End",
    ],
    waypoints: {
      start: "Georgia Tech",
      dest: "Centennial Olympic Park",
      corridor: "BeltLine corridor",
    },
  },

  {
    id: "new-york",
    city: "New York",
    state: "NY",
    label: "New York, NY",
    lat: 40.7128,
    lng: -74.006,
    timezone: "America/New_York",
    climate: {
      base: 24,
      swing: 7,
      humidity: 62,
    },
    box: makeBox(40.7128, -74.006, 0.5, 0.55),
    districts: [
      "Manhattan",
      "Brooklyn",
      "Queens",
      "The Bronx",
      "Staten Island",
      "Harlem",
      "Williamsburg",
      "Long Island City",
      "Astoria",
      "Flushing",
      "Jersey City",
      "Hoboken",
      "Yonkers",
      "White Plains",
      "Newark",
      "Stamford",
    ],
    waypoints: {
      start: "Bryant Park",
      dest: "Brooklyn Bridge Park",
      corridor: "Hudson River greenway",
    },
  },

  {
    id: "chicago",
    city: "Chicago",
    state: "IL",
    label: "Chicago, IL",
    lat: 41.8781,
    lng: -87.6298,
    timezone: "America/Chicago",
    climate: {
      base: 23,
      swing: 7,
      humidity: 60,
    },
    box: makeBox(41.8781, -87.6298, 0.5, 0.6),
    districts: [
      "The Loop",
      "Lincoln Park",
      "Wicker Park",
      "Hyde Park",
      "Logan Square",
      "River North",
      "Gold Coast",
      "Evanston",
      "Oak Park",
      "Naperville",
      "Schaumburg",
      "Aurora",
      "Joliet",
      "Cicero",
      "Skokie",
      "Gary",
    ],
    waypoints: {
      start: "Millennium Park",
      dest: "United Center",
      corridor: "606 trail",
    },
  },

  {
    id: "denver",
    city: "Denver",
    state: "CO",
    label: "Denver, CO",
    lat: 39.7392,
    lng: -104.9903,
    timezone: "America/Denver",
    climate: {
      base: 24,
      swing: 9.5,
      humidity: 32,
    },
    box: makeBox(39.7392, -104.9903, 0.55, 0.65),
    districts: [
      "Downtown Denver",
      "Capitol Hill",
      "Cherry Creek",
      "Highlands",
      "Aurora",
      "Boulder",
      "Lakewood",
      "Arvada",
      "Westminster",
      "Centennial",
      "Littleton",
      "Golden",
      "Fort Collins",
      "Colorado Springs",
      "Greeley",
      "Longmont",
    ],
    waypoints: {
      start: "Union Station",
      dest: "City Park",
      corridor: "Cherry Creek trail",
    },
  },

  {
    id: "seattle",
    city: "Seattle",
    state: "WA",
    label: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    timezone: "America/Los_Angeles",
    climate: {
      base: 18,
      swing: 6,
      humidity: 66,
    },
    box: makeBox(47.6062, -122.3321, 0.55, 0.7),
    districts: [
      "Downtown Seattle",
      "Capitol Hill",
      "Ballard",
      "Fremont",
      "Queen Anne",
      "Bellevue",
      "Redmond",
      "Kirkland",
      "Tacoma",
      "Everett",
      "Renton",
      "Kent",
      "Auburn",
      "Shoreline",
      "Bremerton",
      "Olympia",
    ],
    waypoints: {
      start: "Pike Place Market",
      dest: "Gas Works Park",
      corridor: "Burke-Gilman trail",
    },
  },

  {
    id: "san-francisco",
    city: "San Francisco",
    state: "CA",
    label: "San Francisco, CA",
    lat: 37.7749,
    lng: -122.4194,
    timezone: "America/Los_Angeles",
    climate: {
      base: 17,
      swing: 4,
      humidity: 70,
    },
    box: makeBox(37.7749, -122.4194, 0.45, 0.55),
    districts: [
      "SoMa",
      "Mission District",
      "Nob Hill",
      "Richmond District",
      "Sunset District",
      "Oakland",
      "Berkeley",
      "San Jose",
      "Palo Alto",
      "Mountain View",
      "Daly City",
      "Sausalito",
      "Fremont",
      "Walnut Creek",
      "Santa Clara",
      "Marin",
    ],
    waypoints: {
      start: "Ferry Building",
      dest: "Golden Gate Park",
      corridor: "Embarcadero waterfront",
    },
  },
];

export const DEFAULT_METRO_ID = "las-vegas";

export function getMetro(id: string): Metro {
  return METROS.find((metro) => metro.id === id) ??
    METROS.find((metro) => metro.id === DEFAULT_METRO_ID)!;
}

export function routeBoxFor(metro: Metro): RouteBox {
  const latSpan = metro.box.north - metro.box.south;
  const lngSpan = metro.box.east - metro.box.west;

  return {
    latMin: metro.box.south + latSpan * 0.3,
    latSpan: latSpan * 0.22,
    lngMin: metro.box.west + lngSpan * 0.22,
    lngSpan: lngSpan * 0.26,
  };
}

const STORAGE_KEY = "heatshield:metro";

interface MetroContextValue {
  metro: Metro;
  setMetroId: (id: string) => void;
}

const MetroContext = createContext<MetroContextValue | null>(null);

export function MetroProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [metroId, setMetroId] = useState(DEFAULT_METRO_ID);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved && METROS.some((metro) => metro.id === saved)) {
        setMetroId(saved);
      }
    } catch {
      // localStorage may be unavailable.
    }
  }, []);

  const setAndPersist = (id: string) => {
    if (!METROS.some((metro) => metro.id === id)) return;

    setMetroId(id);

    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore storage failures.
    }
  };

  const value = useMemo(
    () => ({
      metro: getMetro(metroId),
      setMetroId: setAndPersist,
    }),
    [metroId],
  );

  return (
    <MetroContext.Provider value={value}>
      {children}
    </MetroContext.Provider>
  );
}

export function useMetro(): MetroContextValue {
  const context = useContext(MetroContext);

  if (!context) {
    throw new Error("useMetro must be used inside MetroProvider");
  }

  return context;
}