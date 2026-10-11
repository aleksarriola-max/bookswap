import { Link } from 'react-router-dom';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { getPalette, GENRES, getUserStats, getRepBadge } from '../store';

const CONDITION_COLORS = {
  'Like new': 'bg-sage-100 text-sage-700',
  'Good':     'bg-warm-100 text-warm-700',
  'Worn':     'bg-amber-100 text-amber-700',
};

export function BookCover({ book, size = 'md' }) {
  const [brokenUrl, setBrokenUrl] = useState(null);
  const dims = size === 'shelf' ? 'w-28 h-40 sm:w-32 sm:h-48' : size === 'lg' ? 'w-24 h-36' : 'w-14 h-20';

  if (book.imageDataUrl && brokenUrl !== book.imageDataUrl) {
    return (
      <div className={`${dims} rounded-xl overflow-hidden flex-shrink-0 shadow-md`}>
        <img src={book.imageDataUrl} alt={book.title} className="w-full h-full object-cover" loading="lazy" onError={() => setBrokenUrl(book.imageDataUrl)} />
      </div>
    );
  }

  const palette = getPalette(book.title);
  const shortTitle = book.title.length > 18 ? book.title.slice(0, 16) + '…' : book.title;
  const shortAuthor = book.author.split(' ').slice(-1)[0];

  return (
    <div className={`${dims} rounded-xl flex-shrink-0 shadow-md flex flex-col justify-between overflow-hidden relative`}
      style={{ backgroundColor: palette.bg }}>
      <div className="absolute left-0 top-0 bottom-0 w-2 opacity-20" style={{ backgroundColor: palette.accent }} />
      <div className="px-2 pt-2">
        <div className="h-0.5 rounded-full opacity-40 mb-1" style={{ backgroundColor: palette.accent }} />
        <div className="h-0.5 rounded-full opacity-20 w-3/4" style={{ backgroundColor: palette.accent }} />
      </div>
      <div className="px-2 flex-1 flex items-center justify-center">
        <p className="text-center leading-tight font-bold"
          style={{ color: palette.text, fontSize: size === 'shelf' ? '0.9rem' : size === 'lg' ? '0.65rem' : '0.5rem' }}>
          {shortTitle}
        </p>
      </div>
      <div className="px-2 pb-1.5">
        <div className="h-px opacity-30 mb-1" style={{ backgroundColor: palette.accent }} />
        <p className="text-center opacity-80 truncate" style={{ color: palette.text, fontSize: '0.42rem' }}>
          {shortAuthor}
        </p>
      </div>
    </div>
  );
}

export default function BookCard({ book, distance, layout = 'list' }) {
  const stats = getUserStats(book.ownerId);
  const badge = getRepBadge(stats.total);
  const genreObj = GENRES.find((g) => g.id === book.genre);
  const grid = layout === 'grid';

  return (
    <Link to={`/book/${book.id}`}
      className={`card book-card group flex ${grid ? 'flex-col overflow-hidden' : 'gap-3.5 p-3.5'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-600 focus-visible:ring-offset-2`}>
      <div className={grid ? 'shelf-cover flex justify-center items-center relative py-5' : ''}>
        <BookCover book={book} size={grid ? 'shelf' : 'md'} />
        {grid && book.isDemo && <span className="absolute top-2 left-2 badge text-[10px] bg-white/90 text-blue-700">Demo</span>}
      </div>

      <div className={`flex-1 min-w-0 ${grid ? 'p-3 flex flex-col' : 'py-0.5'}`}>
        <div className="flex flex-wrap gap-1 mb-2">
          <span className={`badge text-[10px] ${book.exchangeMode === 'loan' ? 'bg-blue-50 text-blue-800' : 'bg-sage-100 text-sage-700'}`}>{book.exchangeMode === 'loan' ? `Borrow · ${book.loanDays || 14} days` : 'Free to keep'}</span>
          {book.bundleItems?.length > 0 && <span className="badge text-[10px] bg-amber-50 text-amber-800">{book.bundleItems.length}-book bundle</span>}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2"
            style={{ fontFamily: 'Lora, Georgia, serif' }}>
            {book.title}
          </h3>
          {book.status !== 'available' && (
            <span className={`badge flex-shrink-0 text-[10px] ${book.status === 'requested' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {book.status === 'requested' ? 'Pending' : book.status === 'lent' ? 'On loan' : 'Passed on'}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-0.5 italic">{book.author}</p>

        {!grid && book.note && (
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">"{book.note}"</p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {!grid && book.isDemo && <span className="badge text-[10px] bg-blue-50 text-blue-700">Demo</span>}
          <span className={`badge text-[10px] ${CONDITION_COLORS[book.condition] || 'bg-gray-100 text-gray-500'}`}>
            {book.condition}
          </span>
          {genreObj && genreObj.id !== 'other' && (
            <span className="text-xs">{genreObj.emoji}</span>
          )}
          <span className={`flex items-center gap-1 text-xs text-gray-500 ${grid ? 'w-full pt-1' : ''}`}>
            {book.ownerName}
            {badge && <span className="text-[11px]">{badge.emoji}</span>}
          </span>
          {distance !== undefined && (
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
              <MapPin className="w-3 h-3 text-warm-400" />
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
