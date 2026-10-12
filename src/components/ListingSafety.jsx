import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityAction } from '../store';
import { runAction } from '../lib/cloud';

export default function ListingSafety({ book }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Misleading listing');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return <section className="card p-3 space-y-3">
    <div className="flex gap-2"><button className="btn-secondary text-xs flex-1" onClick={() => setOpen(!open)}>Report listing</button>
      <button className="btn-secondary text-xs flex-1" disabled={busy} onClick={async () => {
        if (!window.confirm(`Block ${book.ownerName}? Their listings will be hidden and new contact will stop.`)) return;
        setBusy(true); const saved = await runAction(() => communityAction('blockUser', { targetId: book.ownerId, targetName: book.ownerName })); setBusy(false); if (saved) navigate('/');
      }}>Block reader</button></div>
    {open && <form className="space-y-2" onSubmit={async e => {
      e.preventDefault(); setBusy(true); const saved = await runAction(() => communityAction('reportBook', { bookId: book.id, reason, details })); setBusy(false);
      if (saved) { setStatus('Report submitted for administrator review.'); setOpen(false); }
    }}>
      <select className="input" aria-label="Report reason" value={reason} onChange={e => setReason(e.target.value)}>{['Misleading listing', 'Inappropriate content', 'Spam', 'Other'].map(value => <option key={value}>{value}</option>)}</select>
      <textarea className="input" aria-label="Report details" maxLength={500} placeholder="Details (optional)" value={details} onChange={e => setDetails(e.target.value)} />
      <button className="btn-primary text-xs" disabled={busy}>Submit report</button>
    </form>}
    {status && <p role="status" className="text-xs text-warm-600">{status}</p>}
  </section>;
}
