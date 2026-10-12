import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, BookOpen, ArrowLeft, X } from 'lucide-react';
import { addBook, GENRES, getJoinedGroups } from '../store';
import BookLookup from '../components/BookLookup';
import { runAction } from '../lib/cloud';
import { conditionFromChecks, getPriceGuide } from '../lib/bookGuidance';

const CONDITIONS = ['Like new', 'Good', 'Worn'];
const CHECKS = [
  ['writing', 'Writing or highlighting inside'],
  ['coverWear', 'Visible cover wear'],
  ['spineWear', 'Creased spine'],
  ['looseBinding', 'Loose or damaged binding'],
  ['waterDamage', 'Water damage or staining'],
  ['missingPages', 'Missing pages'],
  ['odor', 'Strong or musty odor'],
];

export default function PostBook({ user }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [format, setFormat] = useState('');
  const [condition, setCondition] = useState('Good');
  const [conditionChecks, setConditionChecks] = useState({});
  const [genre, setGenre] = useState('other');
  const [note, setNote] = useState('');
  const [catalogCoverUrl, setCatalogCoverUrl] = useState(null);
  const [sellerPhotos, setSellerPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [exchangeMode, setExchangeMode] = useState('sale');
  const [askPrice, setAskPrice] = useState('');
  const [exchangeWanted, setExchangeWanted] = useState('');
  const [bundle, setBundle] = useState('');
  const [groupId, setGroupId] = useState('');
  const priceGuide = useMemo(() => getPriceGuide({ isbn, format, condition }), [isbn, format, condition]);

  const readPhotos = async files => Promise.all(Array.from(files).map(file => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choose image files.'));
    if (file.size > 5 * 1024 * 1024) return reject(new Error('Each photo must be under 5 MB.'));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        image.onerror = () => reject(new Error('Could not process that photo.'));
        image.src = reader.result;
      } catch { reject(new Error('Could not process that photo.')); }
    };
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.readAsDataURL(file);
  })));
  const handlePhotos = async e => {
    try {
      const photos = await readPhotos(e.target.files);
      setSellerPhotos(previous => [...previous, ...photos].slice(0, 4));
      setErrors(previous => ({ ...previous, photos: '' }));
    } catch (error) { setErrors(previous => ({ ...previous, photos: error.message })); }
    e.target.value = '';
  };
  const removePhoto = index => {
    setSellerPhotos(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!author.trim()) errs.author = 'Author is required';
    if (exchangeMode === 'sale' && (!Number.isFinite(Number(askPrice)) || Number(askPrice) <= 0 || !Number.isInteger(Number(askPrice) * 100))) errs.askPrice = 'Enter a price greater than $0 with up to two decimal places.';
    if (exchangeMode === 'exchange' && !exchangeWanted.trim()) errs.exchangeWanted = 'Say what you would like to receive.';
    if (bundle.split('\n').filter(line => line.trim()).length > 10) errs.bundle = 'A bundle can contain up to 10 books.';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    const saved = await runAction(async () => {
      await addBook({
        title: title.trim(), author: author.trim(), isbn: isbn.replace(/[^0-9X]/gi, '').slice(0, 13), format,
        condition, conditionChecks, genre, note: note.trim(), imageDataUrl: sellerPhotos[0] || catalogCoverUrl, photoUrls: sellerPhotos.slice(1),
        exchangeMode, askPrice: exchangeMode === 'sale' ? Number(askPrice) : null,
        exchangeWanted: exchangeMode === 'exchange' ? exchangeWanted.trim() : '',
        groupId: groupId || null, bundleItems: bundle.split('\n').map(line => line.trim()).filter(Boolean),
        ownerId: user.id, ownerName: user.name,
        lat: user.lat + (Math.random() - 0.5) * 0.002, lng: user.lng + (Math.random() - 0.5) * 0.002,
      });
      return true;
    });
    setSaving(false);
    if (saved) navigate('/my-books');
  };

  return <div className="flex flex-col h-full">
    <div className="px-4 py-3 flex items-center gap-2 sticky top-0 z-10 border-b border-warm-100" style={{ background: '#fdf6ec' }}>
      <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
      <span className="font-bold text-warm-800" style={{ fontFamily: 'Lora, Georgia, serif' }}>List a book</span>
    </div>
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <BookLookup onSelect={book => { setTitle(book.title); setAuthor(book.author); setIsbn(book.isbn || ''); setCatalogCoverUrl(book.cover || null); setErrors({}); }} />
      <div className="card p-4 space-y-4">
        <div><label className="block text-sm font-semibold text-warm-700 mb-1.5">Book title *</label><input className="input" placeholder="e.g. Project Hail Mary" value={title} onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }} />{errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}</div>
        <div><label className="block text-sm font-semibold text-warm-700 mb-1.5">Author *</label><input className="input" placeholder="e.g. Andy Weir" value={author} onChange={e => { setAuthor(e.target.value); setErrors(p => ({ ...p, author: '' })); }} />{errors.author && <p className="text-red-500 text-xs mt-1">{errors.author}</p>}</div>
        <div><label className="block text-sm font-semibold text-warm-700 mb-2">Genre</label><div className="flex gap-1.5 flex-wrap">{GENRES.map(item => <button key={item.id} type="button" aria-pressed={genre === item.id} onClick={() => setGenre(item.id)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${genre === item.id ? 'bg-warm-700 text-white border-warm-700' : 'bg-white text-warm-600 border-warm-200'}`}>{item.emoji} {item.label}</button>)}</div></div>
      </div>
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-warm-700">What are you offering?</h2>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Offer type">
          {[['sale', 'Sell'], ['exchange', 'Exchange']].map(([value, label]) => <button key={value} type="button" aria-pressed={exchangeMode === value} onClick={() => setExchangeMode(value)} className={`py-2 rounded-xl border text-sm font-semibold ${exchangeMode === value ? 'bg-warm-700 text-white border-warm-700' : 'bg-white text-warm-700 border-warm-200'}`}>{label}</button>)}
        </div>
        {exchangeMode === 'sale' ? <label className="block text-sm text-warm-700">Asking price (USD)<input className="input mt-1" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="e.g. 8.00" value={askPrice} onChange={e => setAskPrice(e.target.value)} />{errors.askPrice && <span className="block text-xs text-red-600 mt-1">{errors.askPrice}</span>}<span className="block text-xs text-warm-500 mt-1">Arrange payment and the handoff in your messages.</span></label> : <label className="block text-sm text-warm-700">What would you like in exchange?<textarea className="input mt-1" rows={2} placeholder="A mystery novel, or make me an offer" value={exchangeWanted} onChange={e => setExchangeWanted(e.target.value)} maxLength={200} />{errors.exchangeWanted && <span className="block text-xs text-red-600 mt-1">{errors.exchangeWanted}</span>}</label>}
        <label className="block text-sm text-warm-700">Bundle titles (optional, one per line)<textarea className="input mt-1" placeholder="List every included book" rows={2} value={bundle} onChange={e => setBundle(e.target.value)} /></label>
        {errors.bundle && <p role="alert" className="text-xs text-red-600">{errors.bundle}</p>}
        <label className="block text-sm text-warm-700">Share with<select className="input mt-1" value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Everyone nearby</option>{getJoinedGroups().map(group => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
      </div>

      <div className="card p-4 space-y-3">
        <div><h2 className="text-sm font-semibold text-warm-700">Book edition</h2><p className="text-xs text-warm-500 mt-1">Edition details help match comparable prices.</p></div>
        <label className="block text-sm text-warm-700">ISBN<input className="input mt-1" inputMode="numeric" maxLength={17} placeholder="13-digit ISBN, if available" value={isbn} onChange={e => setIsbn(e.target.value)} /></label>
        <label className="block text-sm text-warm-700">Format<select className="input mt-1" value={format} onChange={e => setFormat(e.target.value)}><option value="">Choose format</option><option value="hardcover">Hardcover</option><option value="softcover">Paperback</option><option value="other">Other</option></select></label>
        {exchangeMode === 'sale' && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{priceGuide.status === 'sample' ? <><p className="font-semibold">Research guide: ${priceGuide.low.toFixed(2)}–${priceGuide.high.toFixed(2)}</p><p className="text-xs mt-1">Middle half of {priceGuide.sellerCount} active {priceGuide.formatLabel} offers in {condition} condition. Asking prices, not completed sales. Snapshot: {priceGuide.retrievedAt}. <a className="underline" href={priceGuide.sourceUrl} target="_blank" rel="noreferrer">See source</a>.</p>{Number(askPrice) > priceGuide.high * 1.5 && <p role="status" className="mt-2 text-xs font-semibold text-amber-900">Your asking price is well above this small research range. Double-check the edition and condition.</p>}</> : <><p className="font-semibold">No reliable match yet</p><p className="text-xs mt-1">We need at least five same-edition offers in the same format and condition before showing a range. Current research is limited to a few ISBNs.</p></>}</div>}
      </div>

      <div className="card p-4 space-y-3">
        <div><h2 className="text-sm font-semibold text-warm-700">Condition check</h2><p className="text-xs text-warm-500 mt-1">Answer honestly, then confirm the suggested grade.</p></div>
        <div className="space-y-2">{CHECKS.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-warm-700"><input type="checkbox" checked={!!conditionChecks[key]} onChange={e => setConditionChecks(previous => ({ ...previous, [key]: e.target.checked }))} />{label}</label>)}</div>
        <div className="rounded-xl bg-sage-50 p-3 text-sm text-sage-800">Suggested from your answers: <strong>{conditionFromChecks(conditionChecks)}</strong>. Your selected condition below is what buyers and traders will see.</div>
        <div role="group" aria-label="Choose condition" className="flex gap-2">{CONDITIONS.map(value => <button key={value} type="button" aria-pressed={condition === value} onClick={() => setCondition(value)} className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${condition === value ? 'bg-warm-700 text-white border-warm-700' : 'bg-white text-gray-600 border-warm-200'}`}>{value}</button>)}</div>
        <p className="text-xs text-warm-500">This is a guided self-check, not an automatic photo diagnosis. Clear photos let people inspect the book before meeting.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div><h2 className="text-sm font-semibold text-warm-700">Photos of your copy (up to 4)</h2><p className="text-xs text-warm-500 mt-1">Show the cover, spine, and any marks or damage. Catalog art is kept separate.</p></div>
        <div className="flex flex-wrap gap-2">{sellerPhotos.map((photo, index) => <div className="relative w-20 h-28" key={`${index}-${photo.slice(0, 20)}`}><img src={photo} alt={`Book condition photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)} className="absolute -right-1.5 -top-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></div>)}
          {sellerPhotos.length < 4 && <label className="flex flex-col items-center justify-center w-20 h-28 border-2 border-dashed border-warm-200 rounded-xl cursor-pointer"><Camera className="w-6 h-6 text-warm-400" /><span className="text-xs text-warm-500">Add photos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotos} /></label>}</div>
        {!sellerPhotos.length && catalogCoverUrl && <p className="text-xs text-warm-500">Catalog cover selected. Add photos of the physical copy so its condition is visible.</p>}
        {errors.photos && <p role="alert" className="text-xs text-red-600">{errors.photos}</p>}
      </div>

      <div className="card p-4 space-y-4">
        <div><label className="block text-sm font-semibold text-warm-700 mb-1.5">Extra details (optional)</label><textarea className="input resize-none" rows={2} placeholder="Mention anything the checklist missed" value={note} onChange={e => setNote(e.target.value)} maxLength={200} /><p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/200</p></div>
      </div>
      <p className="text-xs text-warm-400 text-center">📍 Your book appears within ~5 km of your location. Exact address is never shared.</p>
    </form>
    <div className="p-4 border-t border-warm-100" style={{ background: '#fdf6ec' }}><button onClick={handleSubmit} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"><BookOpen className="w-4 h-4" />{saving ? 'Posting…' : 'Post listing'}</button></div>
  </div>;
}
