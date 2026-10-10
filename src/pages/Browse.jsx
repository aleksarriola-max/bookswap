import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search, SlidersHorizontal, Sparkles, Shuffle, BookHeart } from 'lucide-react';
import { getNearbyBooks, distanceKm, seedDemoData, GENRES } from '../store';
import BookCard from '../components/BookCard';

const CONDITIONS = ['All', 'Like new', 'Good', 'Worn'];

export default function Browse({ user }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('all');
  const [condition, setCondition] = useState('All');
  const [radius, setRadius] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [surpriseFlash, setSurpriseFlash] = useState(false);
  const genreScrollRef = useRef(null);

  useEffect(() => {
    seedDemoData(user.lat, user.lng);
    setBooks(getNearbyBooks(user.lat, user.lng, radius));
  }, [user, radius]);

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q);
    const matchGenre = genre === 'all' || b.genre === genre;
    const matchCond = condition === 'All' || b.condition === condition;
    return matchSearch && matchGenre && matchCond && b.ownerId !== user.id;
  });

  const handleSurprise = () => {
    const pool = books.filter((b) => b.ownerId !== user.id && b.status !== 'gone');
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSurpriseFlash(true);
    setTimeout(() => { setSurpriseFlash(false); navigate(`/book/${pick.id}`); }, 400);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Surprise flash overlay */}
      {surpriseFlash && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-7xl animate-bounce">🎲</div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: 'linear-gradient(180deg, #fdf6ec 85%, transparent 100%)' }}>
        <div className="px-4 pt-5 pb-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-warm-800" style={{ fontFamily: 'Lora, Georgia, serif' }}>
                Books near you ☕
              </h1>
              <p className="text-xs text-warm-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {filtered.length} available · {radius} km radius
              </p>
            </div>
            <div className="flex gap-2">
              {/* Surprise Me */}
              <button
                onClick={handleSurprise}
                title="Surprise me!"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-warm-200 bg-white text-warm-600 hover:bg-warm-50 transition-colors shadow-sm"
              >
                <Shuffle className="w-3.5 h-3.5" /> Surprise me
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                  showFilters ? 'bg-warm-600 text-white border-warm-600' : 'bg-white text-warm-700 border-warm-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              className="input pl-10 bg-white/90"
              placeholder="Search title, author, or person…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Genre chips — horizontal scroll */}
          <div ref={genreScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setGenre('all')}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                genre === 'all'
                  ? 'bg-warm-700 text-white border-warm-700'
                  : 'bg-white text-warm-700 border-warm-200 hover:border-warm-400'
              }`}
            >
              All
            </button>
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(genre === g.id ? 'all' : g.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  genre === g.id
                    ? 'bg-warm-700 text-white border-warm-700'
                    : 'bg-white text-warm-600 border-warm-200 hover:border-warm-400'
                }`}
              >
                {g.emoji} {g.label}
              </button>
            ))}
          </div>

          {/* Extra filters */}
          {showFilters && (
            <div className="mt-2 pt-3 border-t border-warm-100 space-y-3 pb-2">
              <div>
                <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide">Condition</label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {CONDITIONS.map((c) => (
                    <button key={c} onClick={() => setCondition(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        condition === c ? 'bg-warm-600 text-white border-warm-600' : 'bg-white text-gray-600 border-warm-200 hover:border-warm-400'
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide">Radius: {radius} km</label>
                <input type="range" min="1" max="20" value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full mt-1.5 accent-warm-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-warm-700" style={{ fontFamily: 'Lora, Georgia, serif' }}>
              {genre !== 'all' ? `No ${GENRES.find(g=>g.id===genre)?.label} books nearby` : 'No books found nearby'}
            </p>
            <p className="text-sm text-gray-400 mt-1">Try a wider radius or post the first one!</p>
            <div className="flex gap-2 justify-center mt-5">
              <Link to="/post" className="btn-primary text-sm">Share a book →</Link>
              <Link to="/wishlist" className="btn-secondary text-sm flex items-center gap-1.5">
                <BookHeart className="w-4 h-4" /> Add to wishlist
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mt-1 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-warm-400" />
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wide">
                {genre !== 'all' ? `${GENRES.find(g=>g.id===genre)?.emoji} ${GENRES.find(g=>g.id===genre)?.label}` : 'Recently added'}
              </span>
            </div>
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} distance={distanceKm(user.lat, user.lng, book.lat, book.lng)} />
            ))}
            {/* Wishlist CTA at bottom */}
            <Link to="/wishlist"
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-warm-200 bg-warm-50/60 hover:bg-warm-100 transition-colors mt-2"
            >
              <BookHeart className="w-5 h-5 text-warm-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warm-700">Can't find what you want?</p>
                <p className="text-xs text-warm-500">Add it to your wishlist — we'll notify you when it appears nearby.</p>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
