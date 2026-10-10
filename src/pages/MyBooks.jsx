import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, LogOut } from 'lucide-react';
import { getBooks, deleteBook, clearUser } from '../store';
import BookCard from '../components/BookCard';

export default function MyBooks({ user, onLogout }) {
  const navigate = useNavigate();
  const [myBooks, setMyBooks] = useState([]);

  const load = () => setMyBooks(getBooks().filter((b) => b.ownerId === user.id));
  useEffect(() => { load(); }, [user.id]);

  const handleDelete = (book) => {
    if (window.confirm(`Remove "${book.title}" from your listings?`)) {
      deleteBook(book.id);
      load();
    }
  };

  const handleLogout = () => {
    if (window.confirm('Sign out and clear your local data? This removes your books and messages from this device.')) {
      clearUser();
      onLogout();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Books</h1>
            <p className="text-xs text-gray-500">{user.name} · {myBooks.length} listing{myBooks.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost text-xs flex items-center gap-1.5 text-gray-400">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Post CTA */}
        <Link to="/post" className="card p-4 flex items-center gap-3 border-dashed border-2 border-brand-200 hover:border-brand-400 hover:bg-brand-50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <Plus className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-brand-700 text-sm">Post a new book</p>
            <p className="text-xs text-gray-400">Share a book you're done with</p>
          </div>
        </Link>

        {myBooks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-25" />
            <p className="text-sm">You haven't posted any books yet.</p>
          </div>
        ) : (
          myBooks.map((book) => (
            <div key={book.id} className="relative">
              <BookCard book={book} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
