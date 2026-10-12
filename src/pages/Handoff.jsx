import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getRequests, communityAction } from '../store';
import { useStoreVersion, runAction } from '../lib/cloud';
import Confetti from '../components/Confetti';

export default function Handoff({ user }) {
  useStoreVersion();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [note, setNote] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const request = getRequests().find(item => item.id === id);
  const allowed = request?.requesterId === user.id && request.status === 'accepted' && Boolean(params.get('code'));
  return <div className="p-5 space-y-4 overflow-y-auto">
    {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    <Link to="/messages" className="text-sm text-warm-600">← Messages</Link>
    <h1 className="text-xl font-bold text-warm-800">Confirm book handoff 📦</h1>
    {done ? <div className="card p-4 space-y-2"><p className="font-bold text-sage-700">Receipt confirmed!</p><p className="text-sm text-warm-600">Your book’s journey is updated.</p><Link className="btn-primary inline-block" to={`/book/${request.bookId}`}>See the book’s journey →</Link></div> : allowed ? <form className="card p-4 space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      const saved = await runAction(() => communityAction('completeHandoff', {requestId:id, code:params.get('code'), note, lat:user.lat, lng:user.lng, agreedPrice: request.exchangeMode === 'sale' ? Number(agreedPrice) : null}));
      setBusy(false); if (saved) { setDone(true); setCelebrating(true); window.history.replaceState(null, '', `/handoff/${id}`); }
    }}>
      <p className="font-bold text-warm-800">{request.bookTitle}</p>
      <p className="text-sm text-warm-600">Confirm after the buyer and seller complete their handoff. This records the transaction for your book history.</p>
      {request.exchangeMode === 'sale' && <label className="block text-sm text-warm-700">Agreed sale price (USD)<input className="input mt-1" type="number" min="0.01" step="0.01" value={agreedPrice} onChange={event => setAgreedPrice(event.target.value)} placeholder={`Asking $${Number(request.askPrice || 0).toFixed(2)}`} required /></label>}
      <textarea className="input" aria-label="Journey note" placeholder="A note for the book’s journey (optional)" maxLength={120} value={note} onChange={e => setNote(e.target.value)} />
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Confirming…' : 'I received the book'}</button>
    </form> : <p className="card p-4 text-sm text-warm-600">This code is unavailable, already used, or intended for another account. Ask the owner for a fresh code and sign in as the requester.</p>}
  </div>;
}
