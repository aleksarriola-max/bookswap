import { useStoreVersion } from '../lib/cloud';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { getRequestsForUser, getMessagesForRequest } from '../store';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
  done: 'bg-gray-100 text-gray-500', loaned:'bg-amber-100 text-amber-700', returned:'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  done: 'Done', loaned:'On loan', returned:'Returned',
};

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Inbox({ user }) {
  const dataVersion = useStoreVersion();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const reqs = getRequestsForUser(user.id);
    // attach last message preview
    const enriched = reqs.map((r) => {
      const msgs = getMessagesForRequest(r.id);
      return { ...r, lastMessage: msgs[msgs.length - 1] || null };
    });
    setRequests(enriched.sort((a, b) => b.createdAt - a.createdAt));
  }, [user.id, dataVersion]);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 text-gray-400">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-25" />
        <p className="font-medium text-gray-500">No messages yet</p>
        <p className="text-sm mt-1">When you request a book or someone requests yours, the conversation will appear here.</p>
        <Link to="/" className="btn-primary inline-block mt-5 text-sm">Browse books</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">Messages</h1>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {requests.map((req) => {
          const isMine = req.requesterId === user.id;
          const otherName = isMine ? req.ownerId.startsWith('demo') ? req.bookTitle.split(' ')[0] : 'Owner' : req.requesterName;
          return (
            <Link
              key={req.id}
              to={`/messages/${req.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-brand-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900 truncate">{req.bookTitle}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(req.lastMessage?.sentAt || req.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {isMine ? `You requested from owner` : `${req.requesterName} wants this book`}
                </p>
                {req.lastMessage && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {req.lastMessage.senderName === user.name ? 'You: ' : ''}{req.lastMessage.text}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className={`badge ${STATUS_STYLES[req.status]}`}>{STATUS_LABELS[req.status]}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
