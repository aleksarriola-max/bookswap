import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function JourneyMap({ book }) {
  const container = useRef(null);
  useEffect(() => {
    const points = [{ lat: book.originLat ?? book.lat, lng: book.originLng ?? book.lng, userName: 'First neighborhood' }, ...(book.journey || [])].filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (!points.length) return;
    const map = L.map(container.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    const locations = points.map(point => [point.lat, point.lng]);
    L.polyline(locations, { color: '#b86620', weight: 3, dashArray: '6 6' }).addTo(map);
    points.forEach((point, i) => {
      const label = document.createElement('span'); label.textContent = `${i + 1}. ${point.userName} (approximate neighborhood)`;
      L.marker([point.lat, point.lng], {icon:L.divIcon({className:'book-map-marker book-map-cluster',html:`<span>${i+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).bindTooltip(label).addTo(map);
    });
    map.fitBounds(L.latLngBounds(locations).pad(0.2), { maxZoom: 13 });
    const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [book]);
  return <section className="card p-3 space-y-2"><h3 className="font-bold text-sm text-warm-800">This book’s journey 🗺️</h3><div className="neighborhood-map" style={{ height: 240 }} ref={container} /><p className="text-xs text-warm-500">Neighborhoods are approximate. Older handoffs without a location stay in the written history.</p></section>;
}
