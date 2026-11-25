export type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };

export function locationPickerHtml(initial: LatLng | null, color: string): string {
  const center = initial ?? DEFAULT_CENTER;
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>
html, body, #map { height: 100%; margin: 0; }
.pin { width: 22px; height: 22px; border-radius: 50%; background: ${color}; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.5); box-sizing: border-box; }
</style>
</head><body>
<div id="map"></div>
<script>
  function send(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  if (!window.L) { send({ type: "error" }); }
  var map = L.map("map", { zoomControl: true }).setView([${center.lat}, ${center.lng}], ${initial ? 15 : 5});
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  var icon = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  var marker = null;
  function report() { var p = marker.getLatLng(); send({ type: "pick", lat: p.lat, lng: p.lng }); }
  function place(lat, lng) {
    if (marker) { marker.setLatLng([lat, lng]); return; }
    marker = L.marker([lat, lng], { draggable: true, icon: icon }).addTo(map);
    marker.on("dragend", report);
  }
  window.setPosition = function (lat, lng) { place(lat, lng); map.setView([lat, lng], Math.max(map.getZoom(), 15)); };
  map.on("click", function (e) { place(e.latlng.lat, e.latlng.lng); report(); });
  ${initial ? `place(${initial.lat}, ${initial.lng});` : ""}
</script>
</body></html>`;
}
