import { useStoreVersion, runAction } from '../lib/cloud';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Send, CheckCircle, XCircle, QrCode, CalendarDays, MapPin,
} from 'lucide-react';
import {
  getRequests, getMessagesForRequest, sendMessage, updateRequestStatus,
  setRequestAvailability, confirmSlot, SLOT_LABELS, MEETUP_SPOTS,
} from '../store';
import Confetti from '../components/Confetti';
import MeetupPlaces from '../components/MeetupPlaces';

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Mini QR visual (CSS-only, no library needed) ──────────────────────────────
function FakeQR({ value }) {
  // Deterministic pixel grid from string hash
  const grid = [];
  let h = 0;
  for (let i = 0; i < value.length; i++) h = value.charCodeAt(i) + ((h << 5) - h);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const on = ((h >> ((r * 9 + c) % 31)) & 1) === 1;
      // Force finder patterns (corners)
      const corner =
        (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      grid.push(corner || on);
    }
  }
  return (
    <div className="inline-grid gap-px p-2 bg-white rounded-xl shadow-lg border border-warm-100"
      style={{ gridTemplateColumns: 'repeat(9, 12px)' }}>
      {grid.map((on, i) => (
        <div key={i} className={`w-3 h-3 rounded-sm ${on ? 'bg-gray-900' : 'bg-white'}`} />
      ))}
    </div>
  );
}

// ── Availability picker modal ─────────────────────────────────────────────────
function AvailabilityPicker({ onSend, onClose }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="w-full bg-white rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-warm-800 text-base" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            When are you free? 📅
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500">Pick all the slots that work for you — the other person picks one.</p>
        <div className="grid grid-cols-2 gap-2">
          {SLOT_LABELS.map((s) => (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors text-left ${
                selected.includes(s.id)
                  ? 'bg-warm-600 text-white border-warm-600'
                  : 'bg-warm-50 text-warm-700 border-warm-200 hover:border-warm-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          disabled={selected.length === 0}
          onClick={async () => { if (await onSend(selected)) onClose(); }}
          className="btn-primary w-full py-3"
        >
          Share my availability ({selected.length} slot{selected.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

// ── Slot confirmation picker ───────────────────────────────────────────────────
function SlotConfirm({ slots, onConfirm, onClose, user }) {
  const [chosenSlot, setChosenSlot] = useState('');
  const [chosenSpot, setChosenSpot] = useState(MEETUP_SPOTS[0]);

  const slotLabels = SLOT_LABELS.filter((s) => slots.includes(s.id));

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="w-full bg-white rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-warm-800 text-base" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            Confirm the meetup 📍
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-2 block">Pick a time</label>
          <div className="grid grid-cols-2 gap-2">
            {slotLabels.map((s) => (
              <button key={s.id} onClick={() => setChosenSlot(s.id)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  chosenSlot === s.id
                    ? 'bg-warm-600 text-white border-warm-600'
                    : 'bg-warm-50 text-warm-700 border-warm-200'
                }`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-2 block">
            <MapPin className="w-3 h-3 inline mr-1" />Suggested meetup spot
          </label>
          <div className="space-y-1.5">
            <MeetupPlaces user={user} onSelect={setChosenSpot} />
            <p className="text-xs text-warm-600">Selected: {chosenSpot}</p>
            {MEETUP_SPOTS.map((sp) => (
              <button key={sp} onClick={() => setChosenSpot(sp)}
                className={`w-full py-2 px-3 rounded-xl text-sm text-left border transition-colors ${
                  chosenSpot === sp
                    ? 'bg-warm-600 text-white border-warm-600'
                    : 'bg-warm-50 text-warm-700 border-warm-200'
                }`}
              >{sp}</button>
            ))}
          </div>
        </div>

        <button
          disabled={!chosenSlot}
          onClick={async () => { if (await onConfirm(chosenSlot, chosenSpot)) onClose(); }}
          className="btn-primary w-full py-3"
        >
          Confirm meetup ✅
        </button>
      </div>
    </div>
  );
}

// ── QR handoff modal ──────────────────────────────────────────────────────────
function QRHandoff({ request, onDone, onClose }) {
  const [note, setNote] = useState('');
  const code = `bookswap:handoff:${request.id}`;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4">
        <h3 className="font-bold text-warm-800 text-lg" style={{ fontFamily: 'Lora, Georgia, serif' }}>
          Handoff QR 📦
        </h3>
        <p className="text-sm text-gray-500">
          Show this to <strong>{request.requesterName}</strong> when you meet.
        </p>
        <div className="flex justify-center">
          <FakeQR value={code} />
        </div>
        <textarea
          className="w-full border border-warm-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-400 resize-none"
          placeholder="Leave a note for the next reader… (optional)"
          rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={async () => { if (await onDone(note)) onClose(); }} className="btn-primary flex-1 text-sm">
            ✅ Confirm done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatThread ───────────────────────────────────────────────────────────
export default function ChatThread({ user }) {
  const dataVersion = useStoreVersion();
  const { id: requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showAvail, setShowAvail] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    const req = getRequests().find((r) => r.id === requestId);
    setRequest(req || null);
    setMessages(getMessagesForRequest(requestId));
  };

  useEffect(() => { load(); }, [requestId, dataVersion]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!request) return (
    <div className="p-6 text-center text-gray-500">
      <p>Conversation not found.</p>
      <Link to="/messages" className="btn-primary inline-block mt-4 text-sm">Back to messages</Link>
    </div>
  );

  const isOwner = request.ownerId === user.id;
  const isClosed = request.status === 'declined' || request.status === 'done';

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await runAction(async () => {
      await sendMessage({ requestId, senderId: user.id, senderName: user.name, text: text.trim() });
      setText(''); load();
    });
  };
  const handleSendAvailability = slots => runAction(async () => {
    await setRequestAvailability(requestId, slots);
    const labels = slots.map(id => SLOT_LABELS.find(s => s.id === id)?.label).join(', ');
    await sendMessage({ requestId, senderId: user.id, senderName: user.name, text: '📅 I am free: ' + labels });
    load(); return true;
  });
  const handleConfirmSlot = (slot, spot) => runAction(async () => {
    await confirmSlot(requestId, slot, spot);
    const label = SLOT_LABELS.find(s => s.id === slot)?.label;
    await sendMessage({ requestId, senderId: user.id, senderName: user.name, text: '✅ Confirmed: ' + label + ' at ' + spot });
    load(); return true;
  });
  const handleDone = (journeyNote = '') => runAction(async () => {
    await updateRequestStatus(requestId, 'done', journeyNote);
    setShowConfetti(true); load(); return true;
  });
  const handleAccept = () => runAction(async () => { await updateRequestStatus(requestId, 'accepted'); load(); });
  const handleDecline = () => runAction(async () => { await updateRequestStatus(requestId, 'declined'); load(); });

  const hasAvailability = request.offeredSlots && request.offeredSlots.length > 0;
  const isConfirmed = !!(request.confirmedSlot && request.confirmedSpot);

  return (
    <div className="flex flex-col h-full relative">
      {/* Confetti */}
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Modals */}
      {showAvail && <AvailabilityPicker onSend={handleSendAvailability} onClose={() => setShowAvail(false)} />}
      {showConfirm && hasAvailability && (
        <SlotConfirm user={user} slots={request.offeredSlots} onConfirm={handleConfirmSlot} onClose={() => setShowConfirm(false)} />
      )}
      {showQR && <QRHandoff request={request} onDone={handleDone} onClose={() => setShowQR(false)} />}

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 sticky top-0 z-10 border-b border-warm-100" style={{ background: '#fdf6ec' }}>
        <button onClick={() => navigate('/messages')} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-warm-800 truncate text-sm" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            {request.bookTitle}
          </p>
          <p className="text-xs text-warm-400">with {isOwner ? request.requesterName : 'the owner'}</p>
        </div>
        <Link to={`/book/${request.bookId}`} className="text-xs text-warm-600 font-semibold hover:underline">
          Book →
        </Link>
      </div>

      {/* Status banners */}
      {request.status === 'pending' && (
        isOwner ? (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
            <p className="text-sm text-amber-800 font-medium mb-2">
              {request.requesterName} wants your book 📖
            </p>
            <div className="flex gap-2">
              <button onClick={handleAccept} className="flex-1 btn-primary flex items-center justify-center gap-1.5 text-sm py-2">
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button onClick={handleDecline} className="flex-1 btn-secondary flex items-center justify-center gap-1.5 text-sm py-2 text-red-500 border-red-200">
                <XCircle className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-sm text-amber-700">
            ⏳ Waiting for the owner to respond…
          </div>
        )
      )}

      {request.status === 'accepted' && (
        <div className="border-b border-warm-100 px-4 py-2.5" style={{ background: '#f0faf2' }}>
          {isConfirmed ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">📍 Meetup confirmed!</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {SLOT_LABELS.find(s => s.id === request.confirmedSlot)?.label} · {request.confirmedSpot}
                </p>
              </div>
              {isOwner && (
                <button onClick={() => setShowQR(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-warm-700 bg-warm-100 px-3 py-1.5 rounded-xl">
                  <QrCode className="w-3.5 h-3.5" /> Handoff QR
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-800 font-medium">✅ Accepted — arrange pickup</span>
              <button
                onClick={() => !isOwner ? setShowAvail(true) : (hasAvailability ? setShowConfirm(true) : null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-warm-700 bg-warm-100 px-3 py-1.5 rounded-xl"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {!isOwner ? 'My availability' : hasAvailability ? 'Confirm time' : 'Waiting…'}
              </button>
            </div>
          )}
        </div>
      )}

      {request.status === 'declined' && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 text-sm text-red-600">❌ Request declined.</div>
      )}
      {request.status === 'done' && (
        <div className="border-b border-warm-100 px-4 py-2.5 text-sm text-gray-500" style={{ background: '#fdf6ec' }}>
          📦 Exchange complete — enjoy the book!
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-center text-xs text-gray-400 py-1">
          {request.requesterName} requested · {timeAgo(request.createdAt)}
        </div>

        {messages.length === 0 && !isClosed && (
          <div className="text-center text-sm text-warm-400 py-6">
            {isOwner
              ? `Say hi to ${request.requesterName} and arrange a pickup!`
              : 'Send a message to start coordinating.'}
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          const isSystem = msg.text.startsWith('📅') || msg.text.startsWith('✅ Confirmed:');
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-warm-100 text-warm-700 text-xs px-3 py-1.5 rounded-full font-medium max-w-[80%] text-center">
                  {msg.text}
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                isMe
                  ? 'text-white rounded-br-md'
                  : 'bg-white border border-warm-100 text-gray-800 rounded-bl-md shadow-sm'
              }`} style={isMe ? { background: '#b86620' } : {}}>
                {!isMe && <p className="text-xs font-semibold mb-0.5 text-warm-600">{msg.senderName}</p>}
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 ${isMe ? 'opacity-60' : 'text-gray-400'}`}>{timeAgo(msg.sentAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {!isClosed && (
        <div className="px-3 py-3 border-t border-warm-100 flex gap-2 items-center" style={{ background: '#fdf6ec' }}>
          {/* Availability shortcut */}
          {request.status === 'accepted' && !isConfirmed && (
            <button
              onClick={() => !isOwner ? setShowAvail(true) : (hasAvailability ? setShowConfirm(true) : null)}
              title={!isOwner ? 'Share availability' : 'Confirm time'}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-warm-600 hover:bg-warm-200 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          )}
          <form onSubmit={handleSend} className="flex gap-2 flex-1">
            <input className="input flex-1 text-sm" placeholder="Message…"
              value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit" disabled={!text.trim()} className="btn-primary px-3">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
