import { Link } from 'react-router-dom';
import { getMyWishes, getNearbyBooks } from '../store';
import { matchWish } from '../lib/community';
import { useStoreVersion } from '../lib/cloud';

export default function WishlistMatches({ user, radius = 5, showDemo = false }) {
  useStoreVersion();
  const wishes = getMyWishes(user.id);
  const matches = getNearbyBooks(user.lat, user.lng, radius).filter(book => book.ownerId !== user.id && Boolean(book.isDemo) === showDemo && wishes.some(wish => matchWish(wish, book)));
  if (!matches.length) return null;
  return <section className="card p-3 space-y-2 border-sage-200 bg-sage-50" aria-label="Wishlist matches">
    <h2 className="text-sm font-bold text-sage-700">💌 {matches.length} wishlist match{matches.length === 1 ? '' : 'es'} nearby</h2>
    {matches.map(book => <Link className="block text-sm text-warm-800 underline" to={`/book/${book.id}`} key={book.id}>{book.title} →</Link>)}
    <p className="text-xs text-sage-700">Matches within {radius} km, checked when you open or refresh Ctrl+Us.</p>
  </section>;
}
