import JourneyTimeline from '../components/JourneyTimeline';
import {getPersonal,toggleFavorite} from '../lib/personal';
import ListingSafety from '../components/ListingSafety';
import { communityAction, canSeeBook } from '../store';
const JourneyMap = lazy(() => import('../components/JourneyMap'));
import { useStoreVersion, runAction } from '../lib/cloud';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, BookOpen, Trash2, Heart, ShieldCheck, StickyNote } from 'lucide-react';
import { getBooks, distanceKm, createRequest, getRequests, deleteBook, getUserStats, getRepBadge, addStickyNote } from '../store';
import { BookCover } from '../components/BookCard';

const CONDITION_INFO = {
  'Like new': { label: 'Like new ✨', color: 'bg-sage-100 text-sage-700' },
  'Good':     { label: 'Good condition 👍', color: 'bg-warm-100 text-warm-700' },
  'Worn':     { label: 'Well-loved 📖', color: 'bg-amber-100 text-amber-700' },
};

export default function BookDetail({ user }) {
  const dataVersion = useStoreVersion();
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requesterOffer, setRequesterOffer] = useState('');
  const [stickyText, setStickyText] = useState('');
  const [showStickyForm, setShowStickyForm] = useState(false);

  useEffect(() => {
    const b = getBooks().find((b) => b.id === id);
    setBook(b && canSeeBook(b) ? b : null);
    if (b) {
      setAlreadyRequested(!!getRequests().find((r) => r.bookId === b.id && r.requesterId === user.id));
    }
  }, [id, user.id, dataVersion]);

  if (!book) return (
    <div className="p-6 text-center text-gray-400">
      <div className="text-5xl mb-3">🕵️</div>
      <p>Book not found.</p>
      <Link to="/" className="btn-primary inline-block mt-4 text-sm">Back to browse</Link>
    </div>
  );

  const isOwner = book.ownerId === user.id;
  const distance = distanceKm(user.lat, user.lng, book.lat, book.lng);
  const condInfo = CONDITION_INFO[book.condition] || { label: book.condition, color: 'bg-gray-100 text-gray-600' };

  const handleRequest = async () => {
    setRequesting(true);
    const req = await runAction(() => createRequest({
      bookId: book.id, bookTitle: book.title,
      requesterId: user.id, requesterName: user.name, ownerId: book.ownerId,
      requesterOffer: requesterOffer.trim(),
    }));
      setRequesting(false);
      if (req) navigate(`/messages/${req.id}`);
  };

  const handleDelete = async () => {
    if (window.confirm(`Remove "${book.title}" from your listings?`)) {
      const removed = await runAction(async () => { await deleteBook(book.id); return true; });
      if (removed) navigate('/my-books');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back nav */}
      <div className="px-4 py-3 flex items-center gap-2 sticky top-0 z-10 bg-cream/90 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-warm-800 truncate text-sm">{book.title}</span>
        {isOwner && (
          <button onClick={handleDelete} className="ml-auto text-red-300 hover:text-red-500 p-1.5 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {book.isDemo && <div className="rounded-2xl p-4 bg-blue-50 text-blue-800 text-sm">Demo listing · This book and its fictional sharer are here to preview the app. No physical book is offered.</div>}
        {/* Hero: large cover + title */}
        <div className="flex gap-2"><button className="btn-secondary flex-1 text-sm" aria-pressed={getPersonal(user.id).favorites.includes(book.id)} onClick={()=>runAction(()=>toggleFavorite(user.id,book.id))}>{getPersonal(user.id).favorites.includes(book.id)?'♥ Saved to favorites':'♡ Save to favorites'}</button><Link className="btn-ghost text-sm" to="/reading">My shelf →</Link></div>
        <div className="card p-5 flex gap-5 items-start">
          <BookCover book={book} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-warm-900 text-xl leading-tight" style={{ fontFamily: 'Lora, Georgia, serif' }}>
              {book.title}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5 italic">{book.author}</p>

            <span className={`badge mt-3 text-xs ${condInfo.color}`}>{condInfo.label}</span>

            {book.note && (
              <div className="mt-3 p-3 bg-warm-50 rounded-xl border border-warm-100">
                <p className="text-sm text-warm-700 leading-relaxed italic">"{book.note}"</p>
              </div>
            )}
          </div>
        </div>

        {(book.photoUrls || []).length > 0 && <div className="card p-4"><h3 className="font-semibold text-sm text-warm-800 mb-3">More photos</h3><div className="flex gap-2 overflow-x-auto">{book.photoUrls.map((photo, index) => <img key={photo} src={photo} alt={`Book condition detail ${index + 1}`} className="w-24 h-32 object-cover rounded-xl flex-shrink-0" loading="lazy" />)}</div></div>}

        <div className="card p-4 space-y-2">
          <p className="text-sm font-semibold text-warm-700">{book.exchangeMode === 'sale' ? `For sale · $${Number(book.askPrice || 0).toFixed(2)}` : 'Book exchange'}</p>
          {book.exchangeMode === 'exchange' && <p className="text-sm text-warm-600">Looking for: {book.exchangeWanted || 'Open to book offers'}</p>}
          {book.isbn && <p className="text-xs text-warm-500">ISBN {book.isbn}{book.format ? ` · ${book.format}` : ''}</p>}
          {book.conditionChecks && <div className="text-xs text-warm-600"><p className="font-semibold">Condition details</p><p>{Object.entries(book.conditionChecks).filter(([, value]) => value).map(([key]) => ({ writing:'Writing/highlights',coverWear:'Cover wear',spineWear:'Creased spine',looseBinding:'Loose binding',waterDamage:'Water damage',missingPages:'Missing pages',odor:'Strong or musty odor' }[key])).filter(Boolean).join(' · ') || 'No issues reported'}</p></div>}
          {book.bundleItems?.length > 0 && <><h3 className="text-sm font-bold">Included in this bundle</h3><ul className="text-sm text-warm-600 list-disc pl-5">{book.bundleItems.map((title,i)=><li key={i}>{title}</li>)}</ul></>}
        </div>
        {book.journey?.length > 0 && <Suspense fallback={<p>Loading journey map…</p>}><JourneyMap book={book} /></Suspense>}
        {book.status === 'gone' && getRequests().some(r => r.bookId === book.id && r.requesterId === user.id && r.status === 'done' && r.completedAt === book.lastHandoffAt) && <button className="btn-primary w-full" onClick={() => runAction(() => communityAction('relistBook', {bookId:book.id,lat:user.lat,lng:user.lng}))}>List this book for sale or exchange →</button>}
        {!isOwner && <ListingSafety book={book} />}
        {/* Owner card with reputation */}
        {(() => {
          const stats = getUserStats(book.ownerId);
          const badge = getRepBadge(stats.total);
          return (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-warm-100 flex items-center justify-center text-xl flex-shrink-0">
                  👤
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-800 text-sm">{book.ownerName}</p>
                    <ShieldCheck className="w-3.5 h-3.5 text-sage-500" title="Community member" />
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-warm-400" />
                    {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
                  </p>
                </div>
                {book.status === 'available' && !isOwner && (
                  <div className="flex items-center gap-1 text-xs text-sage-600 font-semibold bg-sage-50 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse inline-block" />
                    Available
                  </div>
                )}
              </div>

              {/* Rep stats row */}
              <div className="flex gap-2 pt-1 border-t border-warm-50">
                {badge && (
                  <span className={`badge text-xs ${badge.color}`}>{badge.emoji} {badge.label}</span>
                )}
                {stats.shared > 0 && (
                  <span className="badge text-xs bg-warm-100 text-warm-700">📚 {stats.shared} shared</span>
                )}
                {stats.received > 0 && (
                  <span className="badge text-xs bg-sage-100 text-sage-700">✅ {stats.received} received</span>
                )}
                {stats.total === 0 && (
                  <span className="text-xs text-gray-400 italic">New to BookSwap</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* How it works */}
        {!book.isDemo && !isOwner && book.status === 'available' && !alreadyRequested && (
          <div className="card p-4 space-y-2.5" style={{ background: 'linear-gradient(135deg, #fdf6ec, #f5ead6)' }}>
            <p className="font-semibold text-warm-800 text-sm" style={{ fontFamily: 'Lora, Georgia, serif' }}>
              How it works 🤝
            </p>
            {[
              { icon: '📩', text: book.exchangeMode === 'sale' ? `Message ${book.ownerName} about buying this book` : `Offer a book to ${book.ownerName}` },
              { icon: '💬', text: book.exchangeMode === 'sale' ? 'Agree on the price and a meetup in chat' : 'Confirm the offered book and choose a meetup' },
              { icon: '📖', text: 'Meet up and complete the exchange' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-warm-700">
                <span className="text-base">{s.icon}</span> {s.text}
              </div>
            ))}
          </div>
        )}

        {book.journey?.length > 0 && <JourneyTimeline book={book} />}

        {/* Sticky notes */}
        {book.stickyNotes && book.stickyNotes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <StickyNote className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-warm-800 text-sm" style={{ fontFamily: 'Lora, Georgia, serif' }}>
                Notes from previous readers
              </h3>
            </div>
            {book.stickyNotes.map((n) => (
              <div key={n.id} className="rounded-2xl p-3.5 border border-amber-100 space-y-1"
                style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
                <p className="text-sm text-amber-900 italic">"{n.text}"</p>
                <p className="text-xs text-amber-500">— anonymous reader</p>
              </div>
            ))}
          </div>
        )}

        {/* Leave a sticky note (only if book is gone or user has it) */}
        {book.status !== 'available' && (
          <div className="card p-4 space-y-3">
            {!showStickyForm ? (
              <button onClick={() => setShowStickyForm(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-amber-700 font-semibold py-2 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors">
                <StickyNote className="w-4 h-4" /> Leave a note for the next reader
              </button>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide block">
                  Your anonymous note 📝
                </label>
                <textarea
                  className="w-full border border-warm-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-400 resize-none"
                  placeholder="What did you love about this book? A thought, a quote…"
                  rows={3} value={stickyText} onChange={(e) => setStickyText(e.target.value)} maxLength={200}
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowStickyForm(false); setStickyText(''); }}
                    className="btn-secondary flex-1 text-sm">Cancel</button>
                  <button
                    disabled={!stickyText.trim()}
                    onClick={async () => {
                      const saved = await runAction(async () => { await addStickyNote(book.id, { userId: user.id, userName: user.name, text: stickyText.trim() }); return true; });
                      if (!saved) return;
                      setStickyText(''); setShowStickyForm(false);
                      setBook(getBooks().find((b) => b.id === id) || book);
                    }}
                    className="btn-primary flex-1 text-sm">Post note 📌</button>
                </div>
              </div>
            )}
          </div>
        )}

        {book.status === 'gone' && !(book.stickyNotes?.length) && !(book.journey?.length) && (
          <div className="card p-4 text-center text-gray-400">
            <div className="text-3xl mb-1">📦</div>
            <p className="text-sm">This book has already been picked up.</p>
          </div>
        )}

        {book.status === 'requested' && !isOwner && !alreadyRequested && (
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-800 border border-amber-100">
            ⏳ Someone already requested this — but you can still ask! If they back out, the owner may choose you.
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="p-4 bg-cream border-t border-warm-100">
        {book.isDemo ? <p className="text-center text-sm text-warm-600">Preview only · Requests are available on real listings.</p> : isOwner ? (
          <Link to="/my-books" className="btn-secondary w-full flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" /> Manage my listings
          </Link>
        ) : alreadyRequested ? (
          <div className="flex items-center justify-center gap-2 text-sage-600 font-semibold py-2.5">
            <CheckCircle className="w-5 h-5" /> Request sent — check Messages
          </div>
        ) : book.status === 'gone' ? null : (
          <>
          {book.exchangeMode !== 'sale' && <label className="block text-xs font-semibold text-warm-700 mb-2">What book can you offer?<textarea className="input mt-1" rows={2} maxLength={200} placeholder="Book title, author, or a short offer" value={requesterOffer} onChange={event => setRequesterOffer(event.target.value)} /></label>}
          <button
            onClick={handleRequest}
            disabled={requesting || (book.exchangeMode !== 'sale' && !requesterOffer.trim())}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            <Heart className="w-4 h-4" />
            {requesting ? 'Sending…' : book.exchangeMode === 'sale' ? `Message about buying · $${Number(book.askPrice || 0).toFixed(2)}` : `Offer an exchange to ${book.ownerName}`}
          </button>
          </>
        )}
      </div>
    </div>
  );
}

