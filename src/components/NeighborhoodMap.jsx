import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [selected, setSelected] = useState(null);
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
    books.filter(book => Number.isFinite(book.lat) && Number.isFinite(book.lng)).forEach(book => {
      const marker = L.marker([book.lat, book.lng], {
        icon: L.divIcon({ className: 'book-map-marker', html: '<span aria-hidden="true">📚</span>', iconSize: [36, 36], iconAnchor: [18, 18] }),
        title: book.title,
      }).addTo(group);
      // Plain text keeps user-provided titles out of Leaflet's HTML rendering.
      const label = document.createElement('span');
      label.textContent = book.title;
      marker.bindTooltip(label).on('click', () => setSelected(book.id));
    });
    map.current.fitBounds(area.getBounds(), { padding: [20, 20], maxZoom: 15 });
    return () => group.remove();
  }, [books, radius, user.lat, user.lng]);

  const book = books.find(item => item.id === selected);
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
      <p className="text-xs text-warm-500">📚 Tap a book to see details · Blue dot: your neighborhood</p>
      {book && <Link to={`/book/${book.id}`} className="block card p-3">
        <p className="text-sm font-bold text-warm-800">{book.title} →</p>
        <p className="text-xs text-warm-500">{book.author} · {book.ownerName} · {book.condition}</p>
      </Link>}
      {books.length === 0 && <p className="text-sm text-warm-600">No books match these filters. Try a wider radius or another genre.</p>}
      <div className="card p-3 space-y-2">
        <h3 className="text-sm font-semibold text-warm-700">Places to meet</h3>
        <MeetupPlaces user={user} onSelect={setMeetupSpot} />
        {meetupSpot && <p className="text-xs text-warm-600">Suggested spot: {meetupSpot}. Confirm it with the other reader in chat.</p>}
      </div>
    </section>
  );
}
