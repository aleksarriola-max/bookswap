import { useEffect, useRef, useState } from 'react';
import BookCard from './BookCard';
import { distanceKm } from '../store';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MeetupPlaces from './MeetupPlaces';

// Esri imagery is used for this noncommercial school project under:
// https://www.esri.com/en-us/legal/terms/web-site-service
const LAYERS = {
  satellite: {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxNativeZoom: 19,
  },
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
};

export default function NeighborhoodMap({ user, books, radius }) {
  const container = useRef(null);
  const map = useRef(null);
  const [layer, setLayer] = useState('satellite');
  const [tileError, setTileError] = useState(false);
  const [selected, setSelected] = useState([]);
  const [meetupSpot, setMeetupSpot] = useState('');

  useEffect(() => {
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([user.lat, user.lng], 14);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, [user.lat, user.lng]);

  useEffect(() => {
    const { url, ...options } = LAYERS[layer];
    const tiles = L.tileLayer(url, { ...options, maxZoom: 19 }).addTo(map.current);
    const failed = () => setTileError(true);
    tiles.on('tileerror', failed);
    return () => { tiles.off('tileerror', failed); tiles.remove(); };
  }, [layer, user.lat, user.lng]);

  useEffect(() => {
    const group = L.layerGroup().addTo(map.current);
    const area = L.circle([user.lat, user.lng], {
      radius: radius * 1000, color: '#f4a261', weight: 2, fillOpacity: 0.06,
    }).addTo(group);
    L.circleMarker([user.lat, user.lng], {
      radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
    }).bindTooltip('Your neighborhood').addTo(group);
    const markers = L.layerGroup().addTo(group);
    const renderMarkers = () => {
      markers.clearLayers();
      const clusters = new Map();
      books.filter(book => Number.isFinite(book.lat) && Number.isFinite(book.lng)).forEach(book => {
        const point = map.current.project([book.lat, book.lng]);
        const key = `${Math.floor(point.x / 56)}:${Math.floor(point.y / 56)}`;
        const cluster = clusters.get(key) || []; cluster.push(book); clusters.set(key, cluster);
      });
      clusters.forEach(items => {
        const lat = items.reduce((sum,b) => sum+b.lat,0)/items.length;
        const lng = items.reduce((sum,b) => sum+b.lng,0)/items.length;
        const multiple = items.length > 1;
        const marker = L.marker([lat,lng], {
          icon: L.divIcon({ className: `book-map-marker ${multiple ? 'book-map-cluster' : ''}`, html: multiple ? `<span>${items.length}</span>` : '<span aria-hidden="true">📖</span>', iconSize: [40,40], iconAnchor: [20,20] }),
          title: multiple ? `${items.length} books — show previews` : items[0].title,
        }).addTo(markers);
        const label = document.createElement('span');
        label.textContent = multiple ? `${items.length} books here · tap to browse` : items[0].title;
        marker.bindTooltip(label).on('click', () => setSelected(items.map(item=>item.id)));
      });
    };
    map.current.fitBounds(area.getBounds(), { padding: [20, 20], maxZoom: 15 });
    renderMarkers(); map.current.on('zoomend',renderMarkers);
    const instance = map.current;
    return () => { instance.off('zoomend',renderMarkers); group.remove(); };
  }, [books, radius, user.lat, user.lng]);

  const previews = books.filter(item => selected.includes(item.id));
  return (
    <section className="space-y-2" aria-label="Neighborhood book map">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-warm-700">Explore your neighborhood</h2>
        <div className="flex rounded-xl border border-warm-200 bg-white p-1" aria-label="Map background">
          {['street', 'satellite'].map(value => (
            <button key={value} aria-pressed={layer === value} onClick={() => { setTileError(false); setLayer(value); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${layer === value ? 'bg-warm-700 text-white' : 'text-warm-600'}`}>
              {value === 'street' ? 'Street' : 'Satellite'}
            </button>
          ))}
        </div>
      </div>
      <div ref={container} className="neighborhood-map" aria-label="Interactive map of nearby books" />
      {tileError && <p role="status" className="text-xs text-warm-700">Some map images couldn’t load. Check your connection or try the other map background.</p>}
      <div className="flex flex-wrap gap-2 text-xs text-warm-700 bg-warm-50 rounded-xl p-3"><span>📖 Book</span><span>● Number: grouped books</span><span className="text-blue-700">● Your neighborhood</span><span className="ml-auto">Within {radius} km</span></div>
      <p className="text-xs text-warm-500">Tap a marker for cover previews. Zoom in to separate nearby groups. Locations are approximate.</p>
      {previews.length > 0 && <div className="space-y-2" aria-live="polite"><div className="flex justify-between items-center"><h3 className="text-sm font-bold text-warm-800">{previews.length} {previews.length === 1 ? 'book' : 'books'} at this marker</h3><button className="btn-ghost text-xs" onClick={()=>setSelected([])}>Clear selection</button></div>{previews.map(book=><BookCard key={book.id} book={book} distance={distanceKm(user.lat,user.lng,book.lat,book.lng)} />)}</div>}
      {books.length === 0 && <p className="text-sm text-warm-600">No books match these filters. Try a wider radius or another genre.</p>}
      <div className="card p-3 space-y-2">
        <h3 className="text-sm font-semibold text-warm-700">Places to meet</h3>
        <MeetupPlaces user={user} onSelect={setMeetupSpot} />
        {meetupSpot && <p className="text-xs text-warm-600">Suggested spot: {meetupSpot}. Confirm it with the other reader in chat.</p>}
      </div>
    </section>
  );
}
