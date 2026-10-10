import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, BookOpen, Star, SlidersHorizontal } from 'lucide-react';
import { getNearbyBooks, distanceKm, seedDemoData } from '../store';
import BookCard from '../components/BookCard';

const CONDITIONS = ['All', 'Like new', 'Good', 'Worn'];

export default function Browse({ user }) {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('All');
  const [radius, setRadius] = useState(5);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    seedDemoData(user.lat, user.lng);
    setBooks(getNearbyBooks(user.lat, user.lng, radius));
  }, [user, radius]);

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q);
    const matchCond = condition === 'All' || b.condition === condition;
    const isOwn = b.ownerId === user.id;
    return matchSearch && matchCond && !isOwn;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Nearby Books</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Within {radius} km · {filtered.length} available
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost flex items-center gap-1.5 text-sm ${showFilters ? 'bg-brand-50 text-brand-600' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filter
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search title, author, or person…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      condition === c
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Radius: {radius} km
              </label>
              <input
                type="range" min="1" max="20" value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full mt-1 accent-brand-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No books found nearby</p>
            <p className="text-sm mt-1">Try widening the radius or be the first to post one!</p>
            <Link to="/post" className="btn-primary inline-block mt-4 text-sm">Post a book</Link>
          </div>
        ) : (
          filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              distance={distanceKm(user.lat, user.lng, book.lat, book.lng)}
            />
          ))
        )}
      </div>
    </div>
  );
}
