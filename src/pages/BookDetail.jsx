import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, User, MessageCircle, CheckCircle, BookOpen, Trash2 } from 'lucide-react';
import { getBooks, distanceKm, createRequest, getRequests, deleteBook } from '../store';

const CONDITION_COLORS = {
  'Like new': 'bg-green-100 text-green-700',
  'Good': 'bg-yellow-100 text-yellow-700',
  'Worn': 'bg-orange-100 text-orange-700',
};

export default function BookDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const b = getBooks().find((b) => b.id === id);
    setBook(b || null);
    if (b) {
      const reqs = getRequests();
      setAlreadyRequested(!!reqs.find((r) => r.bookId === b.id && r.requesterId === user.id));
    }
  }, [id, user.id]);

  if (!book) {
    return (
      <div className="p-6 text-center text-gray-500">
        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Book not found.</p>
        <Link to="/" className="btn-primary inline-block mt-4 text-sm">Back to browse</Link>
      </div>
    );
  }

  const isOwner = book.ownerId === user.id;
  const distance = distanceKm(user.lat, user.lng, book.lat, book.lng);

  const handleRequest = () => {
    setRequesting(true);
    const req = createRequest({
      bookId: book.id,
      bookTitle: book.title,
      requesterId: user.id,
      requesterName: user.name,
      ownerId: book.ownerId,
    });
    setTimeout(() => {
      setRequesting(false);
      if (req) {
        setDone(true);
        setAlreadyRequested(true);
        navigate(`/messages/${req.id}`);
      } else {
        setAlreadyRequested(true);
      }
    }, 600);
  };

  const handleDelete = () => {
    if (window.confirm(`Remove "${book.title}" from your listings?`)) {
      deleteBook(book.id);
      navigate('/my-books');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-800 truncate">{book.title}</span>
        {isOwner && (
          <button onClick={handleDelete} className="ml-auto text-red-400 hover:text-red-600 p-1.5">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Book cover + title */}
        <div className="card p-5 flex gap-4">
          <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-100 to-indigo-200 flex items-center justify-center">
            {book.imageDataUrl ? (
              <img src={book.imageDataUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl select-none">{book.title.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{book.title}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{book.author}</p>
            <span className={`badge mt-2 ${CONDITION_COLORS[book.condition] || 'bg-gray-100 text-gray-600'}`}>
              {book.condition}
            </span>
            {book.note && (
              <p className="text-sm text-gray-600 mt-3 italic">"{book.note}"</p>
            )}
          </div>
        </div>

        {/* Owner + distance */}
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <User className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{book.ownerName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
            </p>
          </div>
        </div>

        {/* How it works */}
        {!isOwner && book.status === 'available' && (
          <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-800">
            <p className="font-semibold mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-brand-700">
              <li>Request the book</li>
              <li>Chat with {book.ownerName} to arrange a pickup</li>
              <li>Meet nearby and enjoy your next read</li>
            </ol>
          </div>
        )}

        {/* Status banner for gone/requested */}
        {book.status === 'gone' && (
          <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500 text-sm">
            This book has already been picked up.
          </div>
        )}
        {book.status === 'requested' && !isOwner && !alreadyRequested && (
          <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-800">
            Someone has already requested this book. You can still request it — if they back out, the owner may accept yours.
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="p-4 bg-white border-t border-gray-100">
        {isOwner ? (
          <Link to="/my-books" className="btn-secondary w-full flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" /> Manage my listings
          </Link>
        ) : alreadyRequested ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-semibold py-2.5">
            <CheckCircle className="w-5 h-5" /> Request sent — check Messages
          </div>
        ) : book.status === 'gone' ? null : (
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {requesting ? 'Sending request…' : `Request from ${book.ownerName}`}
          </button>
        )}
      </div>
    </div>
  );
}
