import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { communityAction } from '../store';
import { runAction } from '../lib/cloud';

export default function HandoffQR({ request, onClose }) {
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    runAction(async () => {
      const updated = await communityAction('mintHandoff', { requestId: request.id });
      const link = `${window.location.origin}/handoff/${request.id}?code=${encodeURIComponent(updated.handoffCode)}`;
      const png = await QRCode.toDataURL(link, { width: 240, margin: 4, errorCorrectionLevel: 'M' });
      if (active) { setUrl(link); setImage(png); }
    }).then(result => { if (active && result === null) setError('The handoff code couldn’t load. Close this window and try again.'); });
    return () => { active = false; };
  }, [request.id]);
  return <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-5">
    <div role="dialog" aria-modal="true" aria-label="Handoff QR" className="card p-5 max-w-sm text-center space-y-3">
      <h2 className="font-bold text-warm-800">Handoff QR 📦</h2>
      <p className="text-sm text-warm-600">{request.requesterName} scans this with their phone camera, signs in, and confirms receipt.</p>
      {image ? <img className="mx-auto" src={image} alt="Scan to confirm receiving this book" width={240} height={240} /> : <p role="status">{error || 'Generating code…'}</p>}
      {url && <><label className="block text-xs text-warm-500">Or share this link with the recipient<input aria-label="Handoff link" className="input mt-1 text-xs" readOnly value={url} onFocus={e => e.target.select()} /></label><p className="text-xs text-warm-500">Expires after 24 hours. Only the intended recipient can confirm once.</p></>}
      <button className="btn-secondary w-full" onClick={onClose}>Close</button>
    </div>
  </div>;
}
