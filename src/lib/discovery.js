import { distanceKm } from '../store';

const bookCache = new Map();
const placeCache = new Map();

export async function searchBooks(query, signal) {
  const q = query.trim();
  if (q.length < 3) return [];
  if (bookCache.has(q)) return bookCache.get(q);
  const params = new URLSearchParams({ q, limit: '6', fields: 'key,title,author_name,cover_i,first_publish_year,isbn,edition_key' });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new Error('Book lookup is unavailable. You can still enter the details yourself.');
  const data = await response.json();
  const results = (data.docs || []).map(book => ({
    id: book.key, title: book.title, author: (book.author_name || []).join(', '),
    year: book.first_publish_year,
    isbn: (book.isbn || []).find(value => /^\d{13}$/.test(value)) || '',
    cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg?default=false` : null,
  }));
  bookCache.set(q, results);
  return results;
}

export async function findMeetupPlaces(lat, lng, signal) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Choose a neighborhood first.');
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = placeCache.get(key);
  if (cached && Date.now() - cached.time < 3600000) return cached.places;
  const query = `[out:json][timeout:20];nwr(around:3000,${lat},${lng})[amenity~"^(library|cafe)$"][name];out center;`;
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
  });
  if (!response.ok) throw new Error('Nearby places are unavailable. You can still choose a suggested spot.');
  const data = await response.json();
  const places = (data.elements || []).map(place => ({
    id: `${place.type}/${place.id}`, name: place.tags.name,
    kind: place.tags.amenity, lat: place.lat ?? place.center?.lat, lng: place.lon ?? place.center?.lon,
  })).filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .map(place => ({ ...place, distance: distanceKm(lat, lng, place.lat, place.lng) }))
    .sort((a, b) => a.distance - b.distance).slice(0, 6);
  placeCache.set(key, { time: Date.now(), places });
  return places;
}
