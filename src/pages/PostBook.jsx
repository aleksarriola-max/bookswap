import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, BookOpen, ArrowLeft } from 'lucide-react';
import { addBook, GENRES } from '../store';
import BookLookup from '../components/BookLookup';
import { runAction } from '../lib/cloud';

const CONDITIONS = ['Like new', 'Good', 'Worn'];

export default function PostBook({ user }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [condition, setCondition] = useState('Good');
  const [genre, setGenre] = useState('other');
  const [note, setNote] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!author.trim()) errs.author = 'Author is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    const saved = await runAction(async () => {
      await addBook({
        title: title.trim(), author: author.trim(), condition, genre,
        note: note.trim(), imageDataUrl,
        ownerId: user.id, ownerName: user.name,
        lat: user.lat + (Math.random() - 0.5) * 0.002,
        lng: user.lng + (Math.random() - 0.5) * 0.002,
      });
      return true;
    });
    setSaving(false);
    if (saved) navigate('/my-books');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 sticky top-0 z-10 border-b border-warm-100" style={{ background: '#fdf6ec' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-warm-800" style={{ fontFamily: 'Lora, Georgia, serif' }}>Share a book 📖</span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <BookLookup onSelect={book => { setTitle(book.title); setAuthor(book.author); if (book.cover) setImageDataUrl(book.cover); setErrors({}); }} />
        {/* Photo */}
        <div className="card p-4">
          <label className="text-sm font-semibold text-warm-700 mb-2 block">Cover photo (optional)</label>
          {imageDataUrl ? (
            <div className="relative w-24 h-32">
              <img src={imageDataUrl} alt="cover" className="w-full h-full object-cover rounded-xl shadow-md" />
              <button type="button" onClick={() => setImageDataUrl(null)}
                className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-24 h-32 border-2 border-dashed border-warm-200 rounded-xl cursor-pointer hover:border-warm-400 hover:bg-warm-50 transition-colors">
              <Camera className="w-6 h-6 text-warm-400" />
              <span className="text-xs text-warm-400 mt-1">Add photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          )}
        </div>

        {/* Fields */}
        <div className="card p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-warm-700 mb-1.5">Book title *</label>
            <input className="input" placeholder="e.g. Project Hail Mary" value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })); }} />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-warm-700 mb-1.5">Author *</label>
            <input className="input" placeholder="e.g. Andy Weir" value={author}
              onChange={(e) => { setAuthor(e.target.value); setErrors((p) => ({ ...p, author: '' })); }} />
            {errors.author && <p className="text-red-400 text-xs mt-1">{errors.author}</p>}
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm font-semibold text-warm-700 mb-2">Genre</label>
            <div className="flex gap-1.5 flex-wrap">
              {GENRES.map((g) => (
                <button key={g.id} type="button" onClick={() => setGenre(g.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    genre === g.id ? 'bg-warm-600 text-white border-warm-600' : 'bg-white text-warm-600 border-warm-200 hover:border-warm-400'
                  }`}
                >{g.emoji} {g.label}</button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-semibold text-warm-700 mb-2">Condition *</label>
            <div className="flex gap-2">
              {CONDITIONS.map((c) => (
                <button key={c} type="button" onClick={() => setCondition(c)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                    condition === c ? 'bg-warm-600 text-white border-warm-600' : 'bg-white text-gray-600 border-warm-200 hover:border-warm-400'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-warm-700 mb-1.5">
              Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea className="input resize-none" rows={2}
              placeholder="e.g. 'Some highlights inside' or 'Great read, passing it on!'"
              value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            <p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/200</p>
          </div>
        </div>

        <p className="text-xs text-warm-400 text-center">
          📍 Your book appears within ~5 km of your location. Exact address is never shared.
        </p>
      </form>

      <div className="p-4 border-t border-warm-100" style={{ background: '#fdf6ec' }}>
        <button onClick={handleSubmit} disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
          <BookOpen className="w-4 h-4" />
          {saving ? 'Posting…' : 'Post book'}
        </button>
      </div>
    </div>
  );
}
