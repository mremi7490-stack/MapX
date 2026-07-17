// ===== MAP INIT =====
const map = L.map('map').setView([30.3753, 69.3451], 6);

const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
});

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  maxZoom: 19
});

lightTiles.addTo(map);
let isDark = false;

// ===== CLICK FOR COORDINATES =====
const coordBox = document.getElementById('coord-box');
map.on('click', function (e) {
  const lat = e.latlng.lat.toFixed(5);
  const lng = e.latlng.lng.toFixed(5);
  coordBox.textContent = `Latitude: ${lat}, Longitude: ${lng}`;
});

// ===== SEARCH (Nominatim) =====
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
let searchMarker = null;

async function searchLocation() {
  const query = searchInput.value.trim();
  if (!query) return;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const results = await response.json();
    if (results.length === 0) { alert('Location not found.'); return; }
    const place = results[0];
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([lat, lon]).addTo(map).bindPopup(place.display_name).openPopup();
    map.flyTo([lat, lon], 13);
  } catch (error) {
    alert('Search failed.');
    console.error(error);
  }
}
searchBtn.addEventListener('click', searchLocation);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchLocation(); });

// ===== DARK / LIGHT MODE TOGGLE =====
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  document.body.classList.toggle('dark-mode', isDark);
  if (isDark) {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
    themeToggle.textContent = '☀️';
  } else {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
    themeToggle.textContent = '🌙';
  }
});

// ===== CUSTOM ICON MARKERS FOR FAMOUS PLACES =====
const famousPlaces = [
  { name: "Badshahi Mosque", lat: 31.5881, lng: 74.3096, icon: "🕌", desc: "Historic Mughal-era mosque in Lahore" },
  { name: "Minar-e-Pakistan", lat: 31.5925, lng: 74.3105, icon: "🗼", desc: "National monument in Lahore" },
  { name: "Faisal Mosque", lat: 33.7295, lng: 73.0374, icon: "🕌", desc: "Iconic mosque in Islamabad" },
  { name: "Mohenjo-daro", lat: 27.3294, lng: 68.1378, icon: "🏛️", desc: "Ancient Indus Valley civilization site" },
  { name: "Khyber Pass", lat: 34.0972, lng: 71.0783, icon: "⛰️", desc: "Historic mountain pass" },
  { name: "Karachi Port", lat: 24.8467, lng: 66.9836, icon: "⚓", desc: "Pakistan's largest seaport" }
];

famousPlaces.forEach(place => {
  const customIcon = L.divIcon({
    className: 'custom-emoji-icon',
    html: `<div class="emoji-marker">${place.icon}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
  L.marker([place.lat, place.lng], { icon: customIcon })
    .addTo(map)
    .bindPopup(`<b>${place.name}</b><br>${place.desc}`);
});

// ===== EMERGENCY SOS: FIND NEAREST HOSPITAL + ROUTE =====
const sosBtn = document.getElementById('sos-btn');
let sosRouteLayer = null;
let sosMarker = null;

sosBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }

  sosBtn.textContent = '🔎 Locating...';

  navigator.geolocation.getCurrentPosition(async (position) => {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    map.setView([userLat, userLng], 14);
    if (sosMarker) map.removeLayer(sosMarker);
    sosMarker = L.marker([userLat, userLng]).addTo(map).bindPopup('You are here').openPopup();

    try {
      // Find nearby hospitals using Overpass API
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="hospital"](around:5000,${userLat},${userLng});out;`;
      const res = await fetch(overpassUrl);
      const data = await res.json();

      if (!data.elements || data.elements.length === 0) {
        alert('No hospitals found nearby within 5km.');
        sosBtn.textContent = '🚨 SOS';
        return;
      }

      // Pick the nearest hospital (simple distance comparison)
      let nearest = data.elements[0];
      let minDist = Infinity;
      data.elements.forEach(el => {
        const d = Math.hypot(el.lat - userLat, el.lon - userLng);
        if (d < minDist) { minDist = d; nearest = el; }
      });

      const hospitalName = nearest.tags && nearest.tags.name ? nearest.tags.name : 'Nearest Hospital';

      L.marker([nearest.lat, nearest.lon]).addTo(map)
        .bindPopup(`<b>${hospitalName}</b><br>Nearest hospital`).openPopup();

      // Get route via OSRM
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${nearest.lon},${nearest.lat}?overview=full&geometries=geojson`;
      const routeRes = await fetch(routeUrl);
      const routeData = await routeRes.json();

      if (sosRouteLayer) map.removeLayer(sosRouteLayer);

      const coords = routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      sosRouteLayer = L.polyline(coords, { color: 'red', weight: 5 }).addTo(map);
      map.fitBounds(sosRouteLayer.getBounds());

    } catch (error) {
      alert('Could not find route to hospital.');
      console.error(error);
    }

    sosBtn.textContent = '🚨 SOS';
  }, () => {
    alert('Could not get your location.');
    sosBtn.textContent = '🚨 SOS';
  });
});

// ===== AI TRAVEL ASSISTANT (keyword-based, no API key needed) =====
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiChatLog = document.getElementById('ai-chat-log');

function getAIResponse(question) {
  const q = question.toLowerCase();
  if (q.includes('mosque') || q.includes('religious')) {
    return "Pakistan has beautiful mosques like Badshahi Mosque in Lahore and Faisal Mosque in Islamabad — both marked on the map!";
  } else if (q.includes('food') || q.includes('eat')) {
    return "Try searching for 'restaurants' near your location using the search bar — I'll help you find great food spots!";
  } else if (q.includes('weather')) {
    return "For weather, search your destination first, then I can guide you on what to expect seasonally.";
  } else if (q.includes('hospital') || q.includes('emergency')) {
    return "Tap the 🚨 SOS button — it'll find the nearest hospital and draw a route to it instantly.";
  } else if (q.includes('hi') || q.includes('hello')) {
    return "Hello! Ask me about places to visit, food, weather, or emergency help.";
  } else {
    return "I'm a simple travel assistant — try asking about mosques, food, weather, or hospitals nearby!";
  }
}

function askAI() {
  const question = aiInput.value.trim();
  if (!question) return;
  aiChatLog.innerHTML += `<p><b>You:</b> ${question}</p>`;
  const reply = getAIResponse(question);
  aiChatLog.innerHTML += `<p><b>MapX AI:</b> ${reply}</p>`;
  aiInput.value = '';
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

aiSendBtn.addEventListener('click', askAI);
aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') askAI(); });
// ===== LANGUAGE TRANSLATION =====
const translations = {
  en: {
    searchPlaceholder: "Search a place...",
    searchBtn: "Search",
    sosBtn: "🚨 SOS",
    aiGreeting: "Hi! Ask me about places, food, weather, or hospitals nearby.",
    aiPlaceholder: "Ask me anything...",
    askBtn: "Ask",
    coordDefault: "Click the map to see coordinates"
  },
  ur: {
    searchPlaceholder: "کوئی جگہ تلاش کریں...",
    searchBtn: "تلاش کریں",
    sosBtn: "🚨 ایمرجنسی",
    aiGreeting: "السلام علیکم! مجھ سے جگہوں، کھانے، موسم یا ہسپتالوں کے بارے میں پوچھیں۔",
    aiPlaceholder: "کچھ بھی پوچھیں...",
    askBtn: "پوچھیں",
    coordDefault: "نقاط دیکھنے کے لیے نقشے پر کلک کریں"
  },
  ar: {
    searchPlaceholder: "ابحث عن مكان...",
    searchBtn: "بحث",
    sosBtn: "🚨 طوارئ",
    aiGreeting: "مرحباً! اسألني عن الأماكن أو الطعام أو الطقس أو المستشفيات القريبة.",
    aiPlaceholder: "اسألني أي شيء...",
    askBtn: "اسأل",
    coordDefault: "انقر على الخريطة لرؤية الإحداثيات"
  },
  fr: {
    searchPlaceholder: "Rechercher un lieu...",
    searchBtn: "Rechercher",
    sosBtn: "🚨 SOS",
    aiGreeting: "Bonjour! Demandez-moi des lieux, de la nourriture, la météo ou des hôpitaux à proximité.",
    aiPlaceholder: "Demandez-moi n'importe quoi...",
    askBtn: "Demander",
    coordDefault: "Cliquez sur la carte pour voir les coordonnées"
  },
  es: {
    searchPlaceholder: "Buscar un lugar...",
    searchBtn: "Buscar",
    sosBtn: "🚨 SOS",
    aiGreeting: "¡Hola! Pregúntame sobre lugares, comida, clima u hospitales cercanos.",
    aiPlaceholder: "Pregúntame lo que sea...",
    askBtn: "Preguntar",
    coordDefault: "Haz clic en el mapa para ver las coordenadas"
  },
  zh: {
    searchPlaceholder: "搜索地点...",
    searchBtn: "搜索",
    sosBtn: "🚨 紧急求助",
    aiGreeting: "你好！可以问我关于地点、美食、天气或附近医院的问题。",
    aiPlaceholder: "问我任何问题...",
    askBtn: "提问",
    coordDefault: "点击地图查看坐标"
  }
};

const langSelect = document.getElementById('lang-select');

function applyLanguage(lang) {
  const t = translations[lang];
  document.getElementById('search-input').placeholder = t.searchPlaceholder;
  document.getElementById('search-btn').textContent = t.searchBtn;
  document.getElementById('sos-btn').textContent = t.sosBtn;
  document.getElementById('ai-input').placeholder = t.aiPlaceholder;
  document.getElementById('ai-send-btn').textContent = t.askBtn;
  document.getElementById('coord-box').textContent = t.coordDefault;
  aiChatLog.innerHTML = `<p><b>MapX AI:</b> ${t.aiGreeting}</p>`;
}

langSelect.addEventListener('change', (e) => {
  applyLanguage(e.target.value);
});
