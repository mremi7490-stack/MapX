// Initialize the map, centered on Pakistan
const map = L.map('map').setView([30.3753, 69.3451], 6);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

// Show coordinates when the map is clicked
const coordBox = document.getElementById('coord-box');

map.on('click', function (e) {
  const lat = e.latlng.lat.toFixed(5);
  const lng = e.latlng.lng.toFixed(5);
  coordBox.textContent = `Latitude: ${lat}, Longitude: ${lng}`;
});
