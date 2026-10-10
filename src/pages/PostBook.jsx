import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, BookOpen, ArrowLeft } from 'lucide-react';
import { addBook } from '../store';

const CONDITIONS = ['Like new', 'Good', 'Worn'];

export default function PostBook({ user }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [condition, setCondition] = useState('Good');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    setTimeout(() => {
      addBook({
        title: title.trim(),
        author: author.trim(),
        condition,
        note: note.trim(),
        imageDataUrl,
        ownerId: user.id,
        ownerName: user.name,
        lat: user.lat + (Math.random() - 0.5) * 0.002, // slight fuzz for privacy
        lng: user.lng + (Math.random() - 0.5) * 0.002,
      });
      setSaving(false);
      navigate('/my-books');
    }, 400);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-800">Post a book</span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Photo */}
        <div className="card p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Cover photo (optional)</label>
          {imageDataUrl ? (
            <div className="relative w-24 h-32">
              <img src={imageDataUrl} alt="cover" className="w-full h-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setImageDataUrl(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-24 h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-400 transition-colors">
              <Camera className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">Add photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          )}
        </div>

        {/* Fields */}
        <div className="card p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Book title *</label>
            <input
              className="input"
              placeholder="e.g. Project Hail Mary"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })); }}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Author *</label>
            <input
              className="input"
              placeholder="e.g. Andy Weir"
              value={author}
              onChange={(e) => { setAuthor(e.target.value); setErrors((p) => ({ ...p, author: '' })); }}
            />
            {errors.author && <p className="text-red-500 text-xs mt-1">{errors.author}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Condition *</label>
            <div className="flex gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                    condition === c
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              className="input resize-none"
              placeholder="e.g. 'Some highlights inside' or 'Great read, passing it on!'"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/200</p>
          </div>
        </div>

        {/* Location note */}
        <p className="text-xs text-gray-400 text-center">
          📍 Your book will appear within ~5 km of your current location. Exact address is never shared.
        </p>
      </form>

      {/* Submit */}
      <div className="p-4 bg-white border-t border-gray-100">
        <button
          type="submit"
          form="post-form"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          {saving ? 'Posting…' : 'Post book'}
        </button>
      </div>
    </div>
  );
}
