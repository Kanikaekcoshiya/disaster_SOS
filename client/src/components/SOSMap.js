import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SOSMap = ({ sosList, volunteerPos, focusSosId }) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!leafletMapRef.current && mapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, { center: [28.6139, 77.209], zoom: 5 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMapRef.current);
      setTimeout(() => leafletMapRef.current?.invalidateSize(), 300);
    }

    const map = leafletMapRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m) => map.hasLayer(m) && map.removeLayer(m));
    markersRef.current = {};
    const bounds = [];

    // Volunteer marker
    if (volunteerPos?.latitude && volunteerPos?.longitude) {
      const m = L.marker([volunteerPos.latitude, volunteerPos.longitude], {
        icon: L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      }).bindPopup("Your Location").addTo(map);
      markersRef.current["volunteer"] = m;
      bounds.push([volunteerPos.latitude, volunteerPos.longitude]);
    }

    // SOS markers
    (sosList || []).forEach((sos) => {
      if (sos.latitude && sos.longitude) {
        const focused = sos._id === focusSosId;
        const m = L.marker([sos.latitude, sos.longitude], {
          icon: L.icon({
            iconUrl: focused
              ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
              : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        })
          .bindPopup(`<b>${sos.name || "Anonymous"}</b><br>${sos.message || ""}<br>Address: ${sos.userProvidedAddress || "N/A"}<br>Status: ${sos.status}`)
          .addTo(map);
        markersRef.current[sos._id] = m;
        bounds.push([sos.latitude, sos.longitude]);
      }
    });

    // Zoom/focus with delay
    setTimeout(() => {
      if (focusSosId && markersRef.current[focusSosId]) {
        map.setView(markersRef.current[focusSosId].getLatLng(), 15);
        markersRef.current[focusSosId].openPopup();
      } else if (bounds.length) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (volunteerPos) {
        map.setView([volunteerPos.latitude, volunteerPos.longitude], 10);
      } else {
        map.setView([28.6139, 77.209], 5);
      }
      map.invalidateSize();
    }, 200);

  }, [sosList, volunteerPos, focusSosId]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: 320 }} />;
};

export default SOSMap;
