import { useEffect, useRef, useState } from 'react';
import { findMeetupPlaces } from '../lib/discovery';

export default function MeetupPlaces({ user, onSelect }) {
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function load() {
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true); setStatus('');
    try {
      const found = await findMeetupPlaces(user.lat, user.lng, controller.current.signal);
      setPlaces(found); setStatus(found.length ? '' : 'No named cafés or libraries found within 3 km.');
    } catch (error) { if (error.name !== 'AbortError') setStatus('Nearby places couldn’t load. Try again or choose a suggested spot.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <button type="button" className="btn-secondary text-xs w-full" disabled={busy} onClick={load}>{busy ? 'Finding places…' : 'Find nearby cafés & libraries'}</button>
    {status && <p role="status" className="text-xs text-warm-600">{status}</p>}
    {places.map(place => <div key={place.id} className="rounded-xl border border-warm-200 p-2 text-xs">
      <button type="button" className="text-left text-warm-800 font-semibold w-full" onClick={() => onSelect(`${place.name} (${place.kind})`)}>{place.name} · {place.distance.toFixed(1)} km</button>
      <a className="block text-warm-500 underline mt-1" href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`} target="_blank" rel="noreferrer">View {place.kind} on map ↗</a>
    </div>)}
    {places.length > 0 && <p className="text-xs text-gray-400">© OpenStreetMap contributors · Check public access and opening hours before meeting.</p>}
  </div>;
}
