import { useStoreVersion } from '../lib/cloud';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { getRequestsForUser, getMessagesForRequest, getBooks } from '../store';
import { BookCover } from '../components/BookCard';

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
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');

  useEffect(() => {
    const reqs = getRequestsForUser(user.id);
    // attach last message preview
    const enriched = reqs.map((r) => {
      const msgs = getMessagesForRequest(r.id);
      return { ...r, lastMessage: msgs[msgs.length - 1] || null };
    });
    setRequests(enriched.sort((a, b) => (b.lastMessage?.sentAt || b.createdAt) - (a.lastMessage?.sentAt || a.createdAt)));
  }, [user.id, dataVersion]);

  if (requests.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4"><div className="community-hero rounded-3xl p-5 text-white"><h1 className="text-2xl font-bold">Your conversations</h1><p className="text-sm text-white/80 mt-2">A good book is just the start.</p></div><div className="card mt-4 flex flex-col items-center justify-center text-center p-6 text-warm-500">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-25" />
        <p className="font-medium text-gray-500">No messages yet</p>
        <p className="text-sm mt-1">When you request a book or someone requests yours, the conversation will appear here.</p>
        <Link to="/" className="btn-primary inline-block mt-5 text-sm">Browse books</Link>
      </div></div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 space-y-3">
        <h1 className="text-xl font-bold text-warm-900">Your conversations</h1>
        <p className="text-xs text-warm-500">Plan a handoff, keep in touch, return a borrowed read.</p>
        <input className="input" aria-label="Search conversations" placeholder="Search books or readers" value={search} onChange={e=>setSearch(e.target.value)} />
        <div className="flex gap-2">{['all','active','completed'].map(value=><button key={value} aria-pressed={filter===value} className={`flex-1 text-xs ${filter===value?'btn-primary':'btn-secondary'}`} onClick={()=>setFilter(value)}>{value==='all'?'All':value==='active'?'Active':'History'}</button>)}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {!requests.some(req=>(filter==='all' || (filter==='active' ? ['pending','accepted','loaned'].includes(req.status) : ['done','returned','declined'].includes(req.status))) && `${req.bookTitle} ${req.requesterName}`.toLowerCase().includes(search.toLowerCase())) && <p className="card p-5 text-sm text-warm-600">No conversations match these filters.</p>}
        {requests.filter(req=>(filter==='all' || (filter==='active' ? ['pending','accepted','loaned'].includes(req.status) : ['done','returned','declined'].includes(req.status))) && `${req.bookTitle} ${req.requesterName}`.toLowerCase().includes(search.toLowerCase())).map((req) => {
          const isMine = req.requesterId === user.id;
          const book=getBooks().find(book=>book.id===req.bookId);
          return (
            <Link
              key={req.id}
              to={`/messages/${req.id}`}
              className="card flex items-center gap-3 p-3.5 hover:bg-warm-50 transition-colors"
            >
              {/* Avatar */}
              {book ? <BookCover book={book} /> : <div className="w-11 h-11 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-brand-600" />
              </div>}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900 truncate">{req.bookTitle}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(req.lastMessage?.sentAt || req.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {isMine ? `From ${book?.ownerName || 'the owner'}` : `${req.requesterName} requested this book`}
                </p>
                {req.lastMessage && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {req.lastMessage.senderName === user.name ? 'You: ' : ''}{req.lastMessage.text}
                  </p>
                )}
                {req.status==='loaned' && req.dueAt && <p className="text-xs text-amber-700 mt-1">Return due {new Date(req.dueAt).toLocaleDateString()}</p>}
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
