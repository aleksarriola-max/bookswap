import { useStoreVersion, runAction } from '../lib/cloud';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LogOut, BookOpen } from 'lucide-react';
import { getBooks, deleteBook, clearUser, getUserStats, getRepBadge } from '../store';
import BookCard from '../components/BookCard';

export default function MyBooks({ user, onLogout }) {
  const dataVersion = useStoreVersion();
  const navigate = useNavigate();
  const [myBooks, setMyBooks] = useState([]);
  const [stats, setStats] = useState({ shared: 0, received: 0, active: 0, total: 0 });

  const load = () => {
    setMyBooks(getBooks().filter((b) => b.ownerId === user.id));
    setStats(getUserStats(user.id));
  };
  useEffect(() => { load(); }, [user.id, dataVersion]);

  const badge = getRepBadge(stats.total);

  const handleLogout = async () => {
    if (window.confirm('Sign out of Ctrl+Us?')) {
      const signedOut = await runAction(async () => { await clearUser(); return true; });
      if (signedOut) onLogout();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Profile hero */}
      <div className="px-4 pt-5 pb-4 border-b border-warm-100" style={{ background: 'linear-gradient(160deg, #fdf6ec, #f5ead6)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-warm-200 flex items-center justify-center text-3xl shadow-sm">
              🧑‍🤝‍🧑
            </div>
            <div>
              <h1 className="text-lg font-bold text-warm-900" style={{ fontFamily: 'Lora, Georgia, serif' }}>
                {user.name}
              </h1>
              {badge ? (
                <span className={`badge text-xs mt-0.5 ${badge.color}`}>{badge.emoji} {badge.label}</span>
              ) : (
                <span className="text-xs text-gray-400">New to BookSwap</span>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost text-xs flex items-center gap-1 text-gray-400 mt-1">
            <LogOut className="w-3.5 h-3.5" /> Out
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: stats.active,   label: 'Listed',   emoji: '📖' },
            { value: stats.shared,   label: 'Shared',   emoji: '🎁' },
            { value: stats.received, label: 'Received', emoji: '✅' },
          ].map(({ value, label, emoji }) => (
            <div key={label} className="bg-white/70 rounded-2xl p-3 text-center border border-warm-100">
              <div className="text-xl">{emoji}</div>
              <div className="text-lg font-bold text-warm-800 leading-tight">{value}</div>
              <div className="text-[10px] text-warm-500 font-medium uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Progress to next badge */}
        {stats.total < 15 && (
          <div className="mt-3">
            {(() => {
              const thresholds = [3, 7, 15];
              const next = thresholds.find((t) => t > stats.total) || 15;
              const prev = thresholds[thresholds.indexOf(next) - 1] || 0;
              const pct = Math.round(((stats.total - prev) / (next - prev)) * 100);
              const nextBadge = getRepBadge(next);
              return (
                <div>
                  <div className="flex justify-between text-xs text-warm-500 mb-1">
                    <span>{stats.total} exchanges</span>
                    <span>{next - stats.total} more → {nextBadge?.emoji} {nextBadge?.label}</span>
                  </div>
                  <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
                    <div className="h-full bg-warm-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {stats.total >= 15 && (
          <div className="mt-3 text-center text-xs text-amber-600 font-semibold">🏆 You've reached the top badge!</div>
        )}
      </div>

      {/* Book listings */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Post CTA */}
        <Link to="/post"
          className="card p-4 flex items-center gap-3 border-dashed border-2 border-warm-200 hover:border-warm-400 hover:bg-warm-50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center">
            <Plus className="w-5 h-5 text-warm-600" />
          </div>
          <div>
            <p className="font-semibold text-warm-700 text-sm">Share a new book</p>
            <p className="text-xs text-gray-400">Help someone discover their next read</p>
          </div>
        </Link>

        {myBooks.length === 0 ? (
          <div className="text-center py-10 text-warm-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-25" />
            <p className="text-sm">No active listings yet.</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide">My listings</p>
            {myBooks.map((book) => <BookCard key={book.id} book={book} />)}
          </>
        )}
      </div>
    </div>
  );
}
