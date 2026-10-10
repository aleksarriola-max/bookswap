import { Link } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';
import { getPalette, GENRES } from '../store';

const CONDITION_COLORS = {
  'Like new': 'bg-sage-100 text-sage-700',
  'Good':     'bg-warm-100 text-warm-700',
  'Worn':     'bg-amber-100 text-amber-700',
};

function BookCover({ book, size = 'md' }) {
  const dims = size === 'lg'
    ? 'w-24 h-36'
    : 'w-14 h-20';

  if (book.imageDataUrl) {
    return (
      <div className={`${dims} rounded-xl overflow-hidden flex-shrink-0 shadow-md`}>
        <img src={book.imageDataUrl} alt={book.title} className="w-full h-full object-cover" />
      </div>
    );
  }

  const palette = getPalette(book.title);
  // Shorten title for display on cover
  const shortTitle = book.title.length > 18 ? book.title.slice(0, 16) + '…' : book.title;
  const shortAuthor = book.author.split(' ').slice(-1)[0]; // last name only

  return (
    <div
      className={`${dims} rounded-xl flex-shrink-0 shadow-md flex flex-col justify-between overflow-hidden relative`}
      style={{ backgroundColor: palette.bg }}
    >
      {/* Spine stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-2 opacity-20" style={{ backgroundColor: palette.accent }} />
      {/* Top decoration */}
      <div className="px-2 pt-2">
        <div className="h-0.5 rounded-full opacity-40 mb-1" style={{ backgroundColor: palette.accent }} />
        <div className="h-0.5 rounded-full opacity-20 w-3/4" style={{ backgroundColor: palette.accent }} />
      </div>
      {/* Title */}
      <div className="px-2 flex-1 flex items-center justify-center">
        <p
          className="text-center leading-tight font-bold"
          style={{
            color: palette.text,
            fontSize: size === 'lg' ? '0.65rem' : '0.5rem',
          }}
        >
          {shortTitle}
        </p>
      </div>
      {/* Author bar */}
      <div className="px-2 pb-1.5">
        <div className="h-px opacity-30 mb-1" style={{ backgroundColor: palette.accent }} />
        <p
          className="text-center opacity-80 truncate"
          style={{ color: palette.text, fontSize: '0.42rem' }}
        >
          {shortAuthor}
        </p>
      </div>
    </div>
  );
}

export { BookCover };

export default function BookCard({ book, distance }) {
  return (
    <Link
      to={`/book/${book.id}`}
      className="card flex gap-3.5 p-3.5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 block"
    >
      <BookCover book={book} size="md" />

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            {book.title}
          </h3>
          {book.status !== 'available' && (
            <span className={`badge flex-shrink-0 text-[10px] ${book.status === 'requested' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {book.status === 'requested' ? 'Pending' : 'Gone'}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-0.5 italic">{book.author}</p>

        {book.note && (
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">"{book.note}"</p>
        )}

        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
          <span className={`badge text-[10px] ${CONDITION_COLORS[book.condition] || 'bg-gray-100 text-gray-500'}`}>
            {book.condition}
          </span>
          {book.genre && book.genre !== 'other' && (
            <span className="text-xs">{GENRES.find(g => g.id === book.genre)?.emoji}</span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <User className="w-3 h-3" /> {book.ownerName}
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
