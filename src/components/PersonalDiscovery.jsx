import { Link } from 'react-router-dom';
import { getPersonal, recommendBooks } from '../lib/personal';
import { BookCover } from './BookCard';
export default function PersonalDiscovery({books,user}) {
  const personal=getPersonal(user.id);
  const picks=recommendBooks(books,personal,user.id);
  if(!picks.length) return null;
  const personalized=personal.favorites.length>0 || personal.reading.length>0;
  return <section className="card p-4 space-y-3" aria-label="Book discovery"><div className="flex justify-between gap-2"><h2 className="font-bold text-warm-800 text-sm">{personalized?'Picked for your bookshelf':'Start exploring'}</h2><Link className="text-xs text-warm-600" to="/reading">My shelf →</Link></div><p className="text-xs text-warm-500">{personalized?'Genres from your favorites and reading tracker guide these picks.':'Save favorites or track your reads to shape your recommendations.'}</p><div className="flex gap-4 overflow-x-auto pb-2">{picks.map(({book,score})=><Link className="w-24 flex-shrink-0 space-y-1" key={book.id} to={`/book/${book.id}`}><BookCover book={book} size="lg" /><p className="text-xs font-semibold text-warm-800 line-clamp-2">{book.title}</p><p className="text-[10px] text-warm-500">{book.isDemo?'Demo · ':''}{score?'A genre you enjoy':'Explore something new'}</p></Link>)}</div></section>;
}
