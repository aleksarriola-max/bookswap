import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, XCircle, Package } from 'lucide-react';
import {
  getRequests, getMessagesForRequest, sendMessage, updateRequestStatus,
} from '../store';

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ChatThread({ user }) {
  const { id: requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const load = () => {
    const req = getRequests().find((r) => r.id === requestId);
    setRequest(req || null);
    setMessages(getMessagesForRequest(requestId));
  };

  useEffect(() => {
    load();
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!request) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Conversation not found.</p>
        <Link to="/messages" className="btn-primary inline-block mt-4 text-sm">Back to messages</Link>
      </div>
    );
  }

  const isOwner = request.ownerId === user.id;
  const otherName = isOwner ? request.requesterName : 'Owner';

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage({ requestId, senderId: user.id, senderName: user.name, text: text.trim() });
    setText('');
    load();
  };

  const handleAccept = () => {
    updateRequestStatus(requestId, 'accepted');
    load();
  };
  const handleDecline = () => {
    updateRequestStatus(requestId, 'declined');
    load();
  };
  const handleDone = () => {
    if (window.confirm('Mark this exchange as done? The book will be removed from listings.')) {
      updateRequestStatus(requestId, 'done');
      load();
    }
  };

  const STATUS_BANNERS = {
    pending: isOwner ? (
      <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-3">
        <p className="text-sm text-yellow-800 font-medium mb-2">
          {request.requesterName} wants your book "{request.bookTitle}"
        </p>
        <div className="flex gap-2">
          <button onClick={handleAccept} className="flex-1 btn-primary flex items-center justify-center gap-1.5 text-sm py-2">
            <CheckCircle className="w-4 h-4" /> Accept
          </button>
          <button onClick={handleDecline} className="flex-1 btn-secondary flex items-center justify-center gap-1.5 text-sm py-2 text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="w-4 h-4" /> Decline
          </button>
        </div>
      </div>
    ) : (
      <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2.5 text-sm text-yellow-800">
        ⏳ Waiting for the owner to respond to your request…
      </div>
    ),
    accepted: (
      <div className="bg-green-50 border-b border-green-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-green-800 font-medium">✅ Request accepted — arrange pickup!</span>
        {isOwner && (
          <button onClick={handleDone} className="text-xs text-green-700 underline font-semibold flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Mark as done
          </button>
        )}
      </div>
    ),
    declined: (
      <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 text-sm text-red-700">
        ❌ This request was declined.
      </div>
    ),
    done: (
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 text-sm text-gray-600">
        📦 Exchange complete! Hope you enjoy the book.
      </div>
    ),
  };

  const isClosed = request.status === 'declined' || request.status === 'done';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
        <button onClick={() => navigate('/messages')} className="btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate text-sm">{request.bookTitle}</p>
          <p className="text-xs text-gray-400">with {isOwner ? request.requesterName : 'the owner'}</p>
        </div>
        <Link to={`/book/${request.bookId}`} className="text-xs text-brand-600 font-semibold hover:underline">
          View book
        </Link>
      </div>

      {/* Status banner */}
      {STATUS_BANNERS[request.status]}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* System message */}
        <div className="text-center text-xs text-gray-400 py-2">
          {request.requesterName} requested "{request.bookTitle}" · {timeAgo(request.createdAt)}
        </div>

        {messages.length === 0 && !isClosed && (
          <div className="text-center text-sm text-gray-400 py-4">
            {isOwner
              ? `Say hi to ${request.requesterName} and arrange a pickup!`
              : 'Send a message to start coordinating pickup.'}
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                {!isMe && <p className="text-xs font-semibold mb-0.5 text-brand-600">{msg.senderName}</p>}
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>{timeAgo(msg.sentAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isClosed && (
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" disabled={!text.trim()} className="btn-primary px-3">
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
