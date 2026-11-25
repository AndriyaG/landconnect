export type LatLng = { lat: number; lng: number };

export type MapMode = "pick" | "browse" | "view";

export type MapOptions = { mode: MapMode; center: LatLng; zoom: number; pin?: LatLng | null; color: string };

export const BENGALURU: LatLng = { lat: 12.9716, lng: 77.5946 };
export const INDIA: LatLng = { lat: 20.5937, lng: 78.9629 };

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4";

const MODE_SCRIPT: Record<MapMode, string> = {
  pick: `
  var marker = null;
  function report() { var p = marker.getLatLng(); send({ type: "pick", lat: p.lat, lng: p.lng }); }
  function place(lat, lng) {
    if (marker) { marker.setLatLng([lat, lng]); return; }
    marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
    marker.on("dragend", report);
  }
  window.setPosition = function (lat, lng) { place(lat, lng); map.setView([lat, lng], Math.max(map.getZoom(), 15)); };
  map.on("click", function (e) { place(e.latlng.lat, e.latlng.lng); report(); });
  if (opts.pin) place(opts.pin.lat, opts.pin.lng);`,
  browse: `
  var layer = L.layerGroup().addTo(map);
  function clamp(v, max) { return Math.max(-max, Math.min(max, v)).toFixed(4); }
  function reportBounds() {
    var b = map.getBounds();
    send({ type: "bounds", bbox: [clamp(b.getWest(), 180), clamp(b.getSouth(), 90), clamp(b.getEast(), 180), clamp(b.getNorth(), 90)].join(",") });
  }
  window.setMarkers = function (items) {
    layer.clearLayers();
    items.forEach(function (it) {
      var el = document.createElement("div");
      el.className = "price";
      el.textContent = it.label;
      var icon = L.divIcon({ className: "price-icon", html: el, iconSize: [0, 0], iconAnchor: [0, 0] });
      L.marker([it.lat, it.lng], { icon: icon, title: it.label }).on("click", function () { send({ type: "open", id: it.id }); }).addTo(layer);
    });
  };
  window.setView = function (lat, lng, zoom) { map.setView([lat, lng], zoom); };
  map.on("moveend", reportBounds);
  reportBounds();`,
  view: `
  if (opts.pin) L.marker([opts.pin.lat, opts.pin.lng], { icon: pinIcon, interactive: false }).addTo(map);`,
};

export function leafletHtml(opts: MapOptions): string {
  const interactive = opts.mode !== "view";
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${CDN}/leaflet.css"
  integrity="sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w==" crossorigin="anonymous" referrerpolicy="no-referrer">
<script src="${CDN}/leaflet.js"
  integrity="sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<style>
html, body, #map { height: 100%; margin: 0; }
.pin { width: 22px; height: 22px; border-radius: 50%; background: ${opts.color}; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.5); box-sizing: border-box; }
.price { position: absolute; transform: translate(-50%, -100%); margin-top: -6px; white-space: nowrap; padding: 3px 8px; border-radius: 12px; background: #fff; color: ${opts.color}; border: 2px solid ${opts.color}; font: 700 12px sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,.35); }
.price::after { content: ""; position: absolute; left: 50%; bottom: -7px; margin-left: -5px; border: 5px solid transparent; border-top-color: ${opts.color}; border-bottom: 0; }
</style>
</head><body>
<div id="map"></div>
<script>
  function send(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  if (!window.L) { send({ type: "error" }); } else {
  var opts = ${JSON.stringify(opts)};
  var map = L.map("map", {
    zoomControl: ${interactive}, dragging: ${interactive}, touchZoom: ${interactive}, doubleClickZoom: ${interactive},
    scrollWheelZoom: ${interactive}, boxZoom: ${interactive}, keyboard: ${interactive}
  }).setView([opts.center.lat, opts.center.lng], opts.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  var pinIcon = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  ${MODE_SCRIPT[opts.mode]}
  send({ type: "ready" });
  }
</script>
</body></html>`;
}
