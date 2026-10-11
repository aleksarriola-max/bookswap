import { useRef, useState, useEffect } from 'react';
import { searchBooks } from '../lib/discovery';

export default function BookLookup({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setStatus(''); setResults([]);
    try {
      const found = await searchBooks(query, request.signal);
      setResults(found);
      if (!found.length) setStatus('No matches. Try a title, author, or ISBN, or enter details below.');
    } catch (error) { if (error.name !== 'AbortError') setStatus('Book lookup couldn’t load. Enter the details below or try again.'); }
    finally { if (controller.current === request) setBusy(false); }
  }
  return <div className="card p-4 space-y-3">
    <label htmlFor="book-lookup" className="block text-sm font-semibold text-warm-700">Find your book</label>
    <div className="flex gap-2">
      <input id="book-lookup" className="input min-w-0" placeholder="Title, author, or ISBN" value={query} onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (query.trim().length >= 3 && !busy) search(); } }} />
      <button type="button" className="btn-primary text-sm" disabled={query.trim().length < 3 || busy} onClick={search}>{busy ? 'Finding…' : 'Find'}</button>
    </div>
    {status && <p role="status" className="text-xs text-warm-600">{status}</p>}
    {results.map(book => <button type="button" key={book.id} onClick={() => { onSelect(book); setResults([]); setStatus('Details added. Check them and choose the condition below.'); }}
      className="flex items-center gap-3 w-full rounded-xl border border-warm-100 p-2 text-left hover:bg-warm-50">
      {book.cover && <img src={book.cover} alt="" className="w-8 h-12 object-cover rounded" onError={e => { e.currentTarget.style.display = 'none'; }} />}
      <span className="min-w-0"><span className="block text-sm font-semibold text-warm-800">{book.title}</span><span className="block text-xs text-gray-500">{book.author}{book.year ? ` · ${book.year}` : ''}</span></span>
    </button>)}
    <p className="text-xs text-warm-400">Book data and covers from <a className="underline" href="https://openlibrary.org" target="_blank" rel="noreferrer">Open Library</a>. You can edit any details.</p>
  </div>;
}
