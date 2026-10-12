import { useStoreVersion, runAction } from '../lib/cloud';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookHeart, Trash2, Plus, Bell } from 'lucide-react';
import { getMyWishes, addWish, removeWish, GENRES } from '../store';
import WishlistMatches from '../components/WishlistMatches';

export default function Wishlist({ user }) {
  const dataVersion = useStoreVersion();
  const navigate = useNavigate();
  const [wishes, setWishes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('other');
  const [error, setError] = useState('');

  const load = () => setWishes(getMyWishes(user.id));
  useEffect(() => { load(); }, [user.id, dataVersion]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('Please enter a book title.');
    const saved = await runAction(async () => { await addWish({ title: title.trim(), author: author.trim(), genre, userId: user.id, userName: user.name }); return true; });
    if (!saved) return;
    setTitle(''); setAuthor(''); setGenre('other'); setError('');
    setShowForm(false);
    load();
  };

  const handleRemove = async (id) => { await runAction(() => removeWish(id)); load(); };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 sticky top-0 z-10 border-b border-warm-100" style={{ background: '#fdf6ec' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-warm-800 flex-1" style={{ fontFamily: 'Lora, Georgia, serif' }}>
          My Wishlist 💌
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <WishlistMatches user={user} />
        {/* How it works */}
        <div className="rounded-2xl p-4 flex gap-3 items-start text-sm"
          style={{ background: 'linear-gradient(135deg, #fdf6ec, #f5ead6)', border: '1px solid #e9d8bb' }}>
          <Bell className="w-4 h-4 text-warm-500 flex-shrink-0 mt-0.5" />
          <p className="text-warm-700 leading-relaxed">
            Add books you're looking for. Check here for nearby matches when you open or refresh Ctrl+Us.
          </p>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="card p-4 space-y-3 border-warm-200">
            <h3 className="font-semibold text-warm-800 text-sm" style={{ fontFamily: 'Lora, Georgia, serif' }}>
              What are you looking for?
            </h3>
            <div>
              <input className="input" placeholder="Book title *" value={title}
                onChange={(e) => { setTitle(e.target.value); setError(''); }} autoFocus />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
            <input className="input" placeholder="Author (optional)" value={author}
              onChange={(e) => setAuthor(e.target.value)} />
            <div>
              <label className="text-xs font-semibold text-warm-600 mb-1.5 block">Genre</label>
              <div className="flex gap-1.5 flex-wrap">
                {GENRES.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGenre(g.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      genre === g.id ? 'bg-warm-600 text-white border-warm-600' : 'bg-white text-warm-600 border-warm-200'
                    }`}
                  >{g.emoji} {g.label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1 text-sm py-2">Save to wishlist</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        )}

        {/* Wish list */}
        {wishes.length === 0 && !showForm ? (
          <div className="text-center py-12 text-warm-400">
            <BookHeart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-warm-600" style={{ fontFamily: 'Lora, Georgia, serif' }}>Your wishlist is empty</p>
            <p className="text-sm mt-1 text-gray-400">Add a book and we'll watch for it nearby.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add your first wish
            </button>
          </div>
        ) : (
          wishes.map((wish) => {
            const g = GENRES.find((x) => x.id === wish.genre);
            return (
              <div key={wish.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center text-xl flex-shrink-0">
                  {g?.emoji || '📚'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate" style={{ fontFamily: 'Lora, Georgia, serif' }}>
                    {wish.title}
                  </p>
                  {wish.author && <p className="text-xs text-gray-400 italic">{wish.author}</p>}
                  <p className="text-xs text-warm-500 mt-0.5">{g?.label || 'Other'} · watching nearby…</p>
                </div>
                <button onClick={() => handleRemove(wish.id)} className="text-red-300 hover:text-red-500 p-1.5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
