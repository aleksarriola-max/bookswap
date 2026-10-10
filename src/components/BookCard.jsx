import { Link } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';

const CONDITION_COLORS = {
  'Like new': 'bg-green-100 text-green-700',
  'Good': 'bg-yellow-100 text-yellow-700',
  'Worn': 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS = {
  available: 'bg-green-100 text-green-700',
  requested: 'bg-yellow-100 text-yellow-700',
  gone: 'bg-gray-100 text-gray-500',
};

export default function BookCard({ book, distance, compact = false }) {
  return (
    <Link to={`/book/${book.id}`} className="card flex gap-3 p-3.5 hover:shadow-md transition-shadow block">
      {/* Cover placeholder or image */}
      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-100 to-indigo-200 flex items-center justify-center">
        {book.imageDataUrl ? (
          <img src={book.imageDataUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl select-none">
            {book.title.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{book.title}</h3>
          <span className={`badge flex-shrink-0 ${CONDITION_COLORS[book.condition] || 'bg-gray-100 text-gray-600'}`}>
            {book.condition}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>

        {book.note && (
          <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">"{book.note}"</p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" /> {book.ownerName}
          </span>
          {distance !== undefined && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" /> {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </span>
          )}
          <span className={`badge ml-auto ${STATUS_COLORS[book.status] || 'bg-gray-100 text-gray-500'}`}>
            {book.status === 'available' ? 'Free' : book.status === 'requested' ? 'Pending' : 'Gone'}
          </span>
        </div>
      </div>
    </Link>
  );
}
