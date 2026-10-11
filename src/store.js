import { cloudEnabled, cloudCache, cloudUserId, cloudAction, uploadCover, notifyStore, supabase } from './lib/cloud';

// store.js — localStorage-backed state

const KEYS = {
  user: 'bookswap_user',
  books: 'bookswap_books',
  requests: 'bookswap_requests',
  messages: 'bookswap_messages',
  wishlist: 'bookswap_wishlist',
  groups: 'bookswap_groups', group_members: 'bookswap_members', blocks: 'bookswap_blocks', reports: 'bookswap_reports',
};

const read = (key, fallback) => {
  if (cloudEnabled && key !== KEYS.user) return cloudCache[Object.keys(KEYS).find(name => KEYS[name] === key)] || fallback;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
};
const write = (key, val) => { localStorage.setItem(key, JSON.stringify(val)); notifyStore(); };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ── Genres ────────────────────────────────────────────────────────────────────
export const GENRES = [
  { id: 'fiction',    label: 'Fiction',      emoji: '🌙' },
  { id: 'scifi',      label: 'Sci-Fi',       emoji: '🚀' },
  { id: 'nonfiction', label: 'Non-Fiction',  emoji: '🧠' },
  { id: 'selfhelp',   label: 'Self-Help',    emoji: '💪' },
  { id: 'history',    label: 'History',      emoji: '📜' },
  { id: 'romance',    label: 'Romance',      emoji: '💕' },
  { id: 'mystery',    label: 'Mystery',      emoji: '🔍' },
  { id: 'kids',       label: 'Kids',         emoji: '🧸' },
  { id: 'classics',   label: 'Classics',     emoji: '🏛️' },
  { id: 'other',      label: 'Other',        emoji: '📚' },
];

// ── Haversine ─────────────────────────────────────────────────────────────────
export const distanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── User ──────────────────────────────────────────────────────────────────────
export const getUser = () => read(KEYS.user, null);
export const saveUser = (u) => write(KEYS.user, u);
export const createUser = ({ name, lat, lng }) => {
  const user = { id: cloudEnabled ? cloudUserId() : uid(), name, lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100, joinedAt: Date.now() };
  saveUser(user);
  return user;
};
export const clearUser = async () => { if (cloudEnabled) { const { error } = await supabase.auth.signOut(); if (error) throw error; } localStorage.removeItem(KEYS.user); };

// ── Books ─────────────────────────────────────────────────────────────────────
export const getBooks = () => read(KEYS.books, []);

const localaddBook = ({ title, author, condition, genre, note, imageDataUrl, ownerId, ownerName, lat, lng, ...options }) => {
  const book = {
    id: uid(), title, author,
    condition,                     // 'Like new' | 'Good' | 'Worn'
    genre: genre || 'other',
    note: note || '',
    imageDataUrl: imageDataUrl || null,
    ownerId, ownerName, lat, lng,
    ...options,
    status: 'available',           // 'available' | 'requested' | 'gone'
    createdAt: Date.now(),
  };
  write(KEYS.books, [book, ...getBooks()]);
  return book;
};

export const updateBookStatus = (bookId, status) =>
  write(KEYS.books, getBooks().map((b) => b.id === bookId ? { ...b, status } : b));

const localdeleteBook = (bookId) => {
  write(KEYS.books, getBooks().filter((b) => b.id !== bookId));
  write(KEYS.requests, getRequests().filter((r) => r.bookId !== bookId));
};

export const getNearbyBooks = (lat, lng, radiusKm = 5) =>
  getBooks()
    .filter((b) => ['available','requested'].includes(b.status) && canSeeBook(b) && distanceKm(lat, lng, b.lat, b.lng) <= radiusKm)
    .sort((a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng));

export const getSurpriseBook = (lat, lng, userId, radiusKm = 5) => {
  const pool = getNearbyBooks(lat, lng, radiusKm).filter((b) => b.ownerId !== userId);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ── Requests ──────────────────────────────────────────────────────────────────
export const getRequests = () => read(KEYS.requests, []);

const localcreateRequest = ({ bookId, bookTitle, requesterId, requesterName, ownerId }) => {
  const existing = getRequests().find((r) => r.bookId === bookId && r.requesterId === requesterId);
  if (existing) {
    if (existing.status === 'returned') {
      const renewed = { ...existing, status: 'pending', createdAt: Date.now() };
      ['confirmedSlot','confirmedSpot','offeredSlots','completedAt','dueAt','returnedAt'].forEach(key => delete renewed[key]);
      write(KEYS.requests, getRequests().map(r => r.id === renewed.id ? renewed : r));
      updateBookStatus(bookId, 'requested'); return renewed;
    }
    return existing;
  }
  const req = {
    id: uid(), bookId, bookTitle, requesterId, requesterName, ownerId,
    exchangeMode: getBooks().find(b => b.id === bookId)?.exchangeMode || 'gift',
    loanDays: getBooks().find(b => b.id === bookId)?.loanDays || 14,
    status: 'pending', createdAt: Date.now(),
  };
  write(KEYS.requests, [req, ...getRequests()]);
  updateBookStatus(bookId, 'requested');
  return req;
};

const localupdateRequestStatus = (requestId, status, journeyNote = '') => {
  const requests = getRequests().map((r) => r.id === requestId ? { ...r, status } : r);
  write(KEYS.requests, requests);
  const req = requests.find((r) => r.id === requestId);
  if (req) {
    if (status === 'done') {
      updateBookStatus(req.bookId, 'gone');
      // record journey for the receiver
      addJourneyEntry(req.bookId, { userId: req.requesterId, userName: req.requesterName, note: journeyNote });
    }
    if (status === 'declined') updateBookStatus(req.bookId, 'available');
  }
};

export const getRequestsForUser = (userId) =>
  getRequests().filter((r) => r.ownerId === userId || r.requesterId === userId);

// ── Messages ──────────────────────────────────────────────────────────────────
export const getMessages = () => read(KEYS.messages, []);

const localsendMessage = ({ requestId, senderId, senderName, text }) => {
  const msg = { id: uid(), requestId, senderId, senderName, text, sentAt: Date.now() };
  write(KEYS.messages, [...getMessages(), msg]);
  return msg;
};

export const getMessagesForRequest = (requestId) =>
  getMessages().filter((m) => m.requestId === requestId);

// ── Availability & meetup ─────────────────────────────────────────────────────
// Stored inside the request object itself once set.

export const SLOT_LABELS = [
  { id: 'mon_am',  label: 'Mon morning' },
  { id: 'mon_pm',  label: 'Mon evening' },
  { id: 'tue_am',  label: 'Tue lunchtime' },
  { id: 'tue_pm',  label: 'Tue evening' },
  { id: 'wed_am',  label: 'Wed morning' },
  { id: 'wed_pm',  label: 'Wed evening' },
  { id: 'thu_am',  label: 'Thu lunchtime' },
  { id: 'thu_pm',  label: 'Thu evening' },
  { id: 'fri_am',  label: 'Fri morning' },
  { id: 'fri_pm',  label: 'Fri afternoon' },
  { id: 'sat',     label: 'Sat anytime' },
  { id: 'sun',     label: 'Sun anytime' },
];

// Generic community meetup spots (real-feeling; in a real app these come from the map)
export const MEETUP_SPOTS = [
  'Building lobby',
  'Campus main entrance',
  'Nearest café',
  'Library entrance',
  'Park bench nearby',
  'Co-working common area',
];

const localsetRequestAvailability = (requestId, slots) => {
  const requests = getRequests().map((r) =>
    r.id === requestId ? { ...r, offeredSlots: slots } : r
  );
  write(KEYS.requests, requests);
};

const localconfirmSlot = (requestId, slot, spot) => {
  const requests = getRequests().map((r) =>
    r.id === requestId ? { ...r, confirmedSlot: slot, confirmedSpot: spot } : r
  );
  write(KEYS.requests, requests);
};

// ── Journey / sticky notes ────────────────────────────────────────────────────
// Each book carries a `journey` array: [{ userId, userName, note, ts }]
// added when a handoff is marked done.

export const addJourneyEntry = (bookId, { userId, userName, note }) => {
  const books = getBooks().map((b) => {
    if (b.id !== bookId) return b;
    const journey = b.journey || [];
    return { ...b, journey: [...journey, { userId, userName, note: note || '', ts: Date.now() }] };
  });
  write(KEYS.books, books);
};

const localaddStickyNote = (bookId, { userId, userName, text }) => {
  const books = getBooks().map((b) => {
    if (b.id !== bookId) return b;
    const notes = b.stickyNotes || [];
    return { ...b, stickyNotes: [...notes, { id: uid(), userId, userName, text, ts: Date.now() }] };
  });
  write(KEYS.books, books);
};

// ── Community stats ───────────────────────────────────────────────────────────
export const getCommunityStats = (lat, lng, radiusKm = 5) => {
  const nearby = getBooks().filter((b) => distanceKm(lat, lng, b.lat, b.lng) <= radiusKm);
  const shared = nearby.filter((b) => b.status === 'gone').length;
  const available = nearby.filter((b) => b.status === 'available').length;
  const people = new Set(nearby.map((b) => b.ownerId)).size;
  return { shared, available, people };
};

// ── Reputation ────────────────────────────────────────────────────────────────
export const getUserStats = (userId) => {
  const books = getBooks();
  const requests = getRequests();
  const shared   = books.filter((b) => b.ownerId === userId && b.status === 'gone').length;
  const received = requests.filter((r) => r.requesterId === userId && r.status === 'done').length;
  const active   = books.filter((b) => b.ownerId === userId && b.status === 'available').length;
  return { shared, received, active, total: shared + received };
};

export const getRepBadge = (total) => {
  if (total === 0) return null;
  if (total < 3)  return { label: 'New sharer',    emoji: '🌱', color: 'bg-green-100 text-green-700' };
  if (total < 7)  return { label: 'Book lover',    emoji: '📖', color: 'bg-blue-100 text-blue-700' };
  if (total < 15) return { label: 'Community star',emoji: '⭐', color: 'bg-yellow-100 text-yellow-700' };
  return            { label: 'Legend',             emoji: '🏆', color: 'bg-amber-100 text-amber-700' };
};

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const getWishlist = () => read(KEYS.wishlist, []);

const localaddWish = ({ title, author, genre, userId, userName }) => {
  const wish = { id: uid(), title, author: author || '', genre: genre || 'other', userId, userName, createdAt: Date.now() };
  write(KEYS.wishlist, [wish, ...getWishlist()]);
  return wish;
};

const localremoveWish = (wishId) =>
  write(KEYS.wishlist, getWishlist().filter((w) => w.id !== wishId));

export const getMyWishes = (userId) => getWishlist().filter((w) => w.userId === userId);

// Check if a newly added book matches any wishlist items (returns matched wishes)
export const checkWishlistMatches = (book) =>
  getWishlist().filter((w) =>
    w.userId !== book.ownerId &&
    (w.title.toLowerCase().includes(book.title.toLowerCase()) ||
     book.title.toLowerCase().includes(w.title.toLowerCase()) ||
     w.genre === book.genre)
  );

// ── Cover palettes ────────────────────────────────────────────────────────────
export const COVER_PALETTES = [
  { bg: '#c8553d', text: '#fdf6ec', accent: '#f4a261' },
  { bg: '#2d6a4f', text: '#fdf6ec', accent: '#95d5b2' },
  { bg: '#3a405a', text: '#fdf6ec', accent: '#9ab0c8' },
  { bg: '#8b5cf6', text: '#fdf6ec', accent: '#ddd6fe' },
  { bg: '#b5451b', text: '#fdf6ec', accent: '#fbbf24' },
  { bg: '#1e6091', text: '#fdf6ec', accent: '#90e0ef' },
  { bg: '#6b4226', text: '#fdf6ec', accent: '#e9c46a' },
  { bg: '#4a4e69', text: '#fdf6ec', accent: '#c9ada7' },
  { bg: '#606c38', text: '#fdf6ec', accent: '#dda15e' },
  { bg: '#780000', text: '#fdf6ec', accent: '#e9c46a' },
];

export const getPalette = (title) => {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h);
  return COVER_PALETTES[Math.abs(h) % COVER_PALETTES.length];
};

// ── Seed demo data ────────────────────────────────────────────────────────────
export const seedDemoData = (userLat, userLng) => {
  if (cloudEnabled || getBooks().length > 0) return;
  const demos = [
    { title: 'Project Hail Mary', author: 'Andy Weir', genre: 'scifi', condition: 'Like new', note: '🚀 Great sci-fi — loved it! Perfect condition.', lat: userLat + 0.008, lng: userLng + 0.005, ownerName: 'Jiaxin', ownerId: 'demo1' },
    { title: 'Atomic Habits', author: 'James Clear', genre: 'selfhelp', condition: 'Good', note: 'Some highlights & margin notes inside 📝', lat: userLat - 0.004, lng: userLng + 0.011, ownerName: 'Rafaella', ownerId: 'demo2' },
    { title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', genre: 'classics', condition: 'Worn', note: 'Classic — well-loved copy 🌹', lat: userLat + 0.012, lng: userLng - 0.007, ownerName: 'Francisco', ownerId: 'demo3' },
    { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'nonfiction', condition: 'Good', note: 'Mind-blowing read. No writing inside.', lat: userLat - 0.007, lng: userLng - 0.003, ownerName: 'Jiaxin', ownerId: 'demo1' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'history', condition: 'Like new', note: 'Read once, nearly perfect condition 📖', lat: userLat + 0.003, lng: userLng + 0.015, ownerName: 'Aleks', ownerId: 'demo4' },
    { title: 'The Alchemist', author: 'Paulo Coelho', genre: 'fiction', condition: 'Good', note: 'Beautifully written. Passing the magic on ✨', lat: userLat - 0.010, lng: userLng + 0.006, ownerName: 'Rafaella', ownerId: 'demo2' },
    { title: 'Educated', author: 'Tara Westover', genre: 'nonfiction', condition: 'Like new', note: 'Incredible memoir. Will change how you think.', lat: userLat + 0.006, lng: userLng - 0.012, ownerName: 'Kay', ownerId: 'demo5' },
  ];
  write(KEYS.books, demos.map((d) => ({ id: uid(), ...d, imageDataUrl: null, status: 'available', createdAt: Date.now() - Math.random() * 86400000 * 3 })));

  // Seed some "done" books so demo owners show reputation badges
  const doneBooks = [
    { title: 'Old Book 1', author: 'Author A', genre: 'fiction', condition: 'Good', note: '', lat: userLat, lng: userLng, ownerName: 'Jiaxin', ownerId: 'demo1', status: 'gone' },
    { title: 'Old Book 2', author: 'Author B', genre: 'nonfiction', condition: 'Worn', note: '', lat: userLat, lng: userLng, ownerName: 'Jiaxin', ownerId: 'demo1', status: 'gone' },
    { title: 'Old Book 3', author: 'Author C', genre: 'scifi', condition: 'Good', note: '', lat: userLat, lng: userLng, ownerName: 'Rafaella', ownerId: 'demo2', status: 'gone' },
    { title: 'Old Book 4', author: 'Author D', genre: 'selfhelp', condition: 'Like new', note: '', lat: userLat, lng: userLng, ownerName: 'Rafaella', ownerId: 'demo2', status: 'gone' },
    { title: 'Old Book 5', author: 'Author E', genre: 'history', condition: 'Good', note: '', lat: userLat, lng: userLng, ownerName: 'Rafaella', ownerId: 'demo2', status: 'gone' },
  ];
  const existing = read(KEYS.books, []);
  write(KEYS.books, [...existing, ...doneBooks.map((d) => ({ id: uid(), ...d, imageDataUrl: null, createdAt: Date.now() - Math.random() * 86400000 * 10 }))]);
};

// Shared mode uses atomic server actions; demo mode retains its existing local store.
export const addBook = async args => {
  if (!cloudEnabled) {
    if (args.exchangeMode==='loan' && (!Number.isInteger(args.loanDays) || args.loanDays<1 || args.loanDays>90)) throw new Error('Choose a loan length of 1–90 days.');
    return localaddBook(args);
  }
  return cloudAction('addBook', { ...args, imageDataUrl: await uploadCover(args.imageDataUrl) });
};
export const deleteBook = async bookId => cloudEnabled ? cloudAction('deleteBook', { bookId }) : localdeleteBook(bookId);
export const createRequest = async args => { if (cloudEnabled) return cloudAction('createRequest', args); const book=getBooks().find(b=>b.id===args.bookId); if (book?.isDemo) throw new Error('This is a demo listing. Fictional readers cannot receive requests.'); if (!book || !canSeeBook(book) || !['available','requested'].includes(book.status)) throw new Error('This listing is unavailable.'); return localcreateRequest(args); };
export const updateRequestStatus = async (requestId, status, journeyNote = '') => cloudEnabled ? cloudAction('updateRequestStatus', { requestId, status, journeyNote }) : localupdateRequestStatus(requestId, status, journeyNote);
export const sendMessage = async args => { if (cloudEnabled) return cloudAction('sendMessage', args); const req=getRequests().find(r=>r.id===args.requestId); if (!req || [req.ownerId,req.requesterId].some(id=>isBlocked(id))) throw new Error('Contact is blocked.'); return localsendMessage(args); };
export const setRequestAvailability = async (requestId, slots) => cloudEnabled ? cloudAction('setRequestAvailability', { requestId, slots }) : localsetRequestAvailability(requestId, slots);
export const confirmSlot = async (requestId, slot, spot) => cloudEnabled ? cloudAction('confirmSlot', { requestId, slot, spot }) : localconfirmSlot(requestId, slot, spot);
export const addStickyNote = async (bookId, args) => cloudEnabled ? cloudAction('addStickyNote', { bookId, ...args }) : localaddStickyNote(bookId, args);
export const addWish = async args => cloudEnabled ? cloudAction('addWish', args) : localaddWish(args);
export const removeWish = async wishId => cloudEnabled ? cloudAction('removeWish', { wishId }) : localremoveWish(wishId);

export const getGroups = () => read(KEYS.groups, []);
export const getMemberships = () => read(KEYS.group_members, []);
export const getBlocks = () => read(KEYS.blocks, []).filter(block => block.userId === getUser()?.id);
export const getReports = () => read(KEYS.reports, []).filter(report => report.reporterId === getUser()?.id);
export const getJoinedGroups = () => getGroups().filter(group => getMemberships().some(member => member.groupId === group.id && member.userId === getUser()?.id));
export const isBlocked = targetId => getBlocks().some(block => block.userId === getUser()?.id && block.targetId === targetId);
export const canSeeBook = book => !isBlocked(book.ownerId) && (book.ownerId === getUser()?.id || !book.groupId || getJoinedGroups().some(group => group.id === book.groupId));
export async function communityAction(action, args = {}) {
  if (cloudEnabled) return cloudAction(action, args);
  const user = getUser();
  if (!user) throw new Error('Sign in first.');
  const now = Date.now();
  const request = getRequests().find(item => item.id === args.requestId);
  const book = getBooks().find(item => item.id === (args.bookId || request?.bookId));
  const saveRequest = changes => write(KEYS.requests, getRequests().map(item => item.id === request.id ? {...item,...changes} : item));
  const saveBook = changes => write(KEYS.books, getBooks().map(item => item.id === book.id ? {...item,...changes} : item));
  if (action === 'createGroup') {
    const group = {id:uid(),name:args.name.trim(),creatorId:user.id,createdAt:now};
    write(KEYS.groups,[...getGroups(),group]);
    write(KEYS.group_members,[...getMemberships(),{groupId:group.id,userId:user.id}]); return group;
  }
  if (action === 'joinGroup' || action === 'leaveGroup') {
    const rest=getMemberships().filter(item => !(item.groupId===args.groupId && item.userId===user.id));
    write(KEYS.group_members,action==='joinGroup' ? [...rest,{groupId:args.groupId,userId:user.id}] : rest); return true;
  }
  if (action === 'blockUser' || action === 'unblockUser') {
    const rest=getBlocks().filter(item => !(item.targetId===args.targetId && item.userId===user.id));
    write(KEYS.blocks,action==='blockUser' ? [...rest,{...args,userId:user.id,createdAt:now}] : rest); return true;
  }
  if (action === 'reportBook') {
    const report={...args,id:uid(),bookTitle:book.title,reporterId:user.id,status:'submitted',createdAt:now};
    write(KEYS.reports,[report,...getReports()]); return report;
  }
  if (action === 'relistBook') {
    if (!book || book.status!=='gone' || !getRequests().some(r=>r.bookId===book.id && r.requesterId===user.id && r.completedAt===book.lastHandoffAt)) throw new Error('Only the latest gift recipient can pass this book on.');
    saveBook({status:'available',ownerId:user.id,ownerName:user.name,lat:user.lat,lng:user.lng,groupId:null,createdAt:now}); return true;
  }
  if (!request || ![request.ownerId,request.requesterId].includes(user.id)) throw new Error('Conversation not found.');
  if (action === 'mintHandoff') {
    if (user.id!==request.ownerId || request.status!=='accepted' || !request.confirmedSlot) throw new Error('Confirm the meetup first.');
    if (request.handoffExpiresAt > now && request.handoffCode) return request;
    const updated={...request,handoffCode:crypto.randomUUID(),handoffExpiresAt:now+86400000}; saveRequest(updated); return updated;
  }
  if (action === 'completeHandoff') {
    if (user.id!==request.requesterId || request.status!=='accepted' || args.code!==request.handoffCode || request.handoffExpiresAt<now) throw new Error('Invalid or expired handoff code.');
    const loan=request.exchangeMode==='loan';
    saveRequest({status:loan?'loaned':'done',completedAt:now,dueAt:loan?now+request.loanDays*86400000:null,handoffCode:null,handoffExpiresAt:null});
    saveBook({status:loan?'lent':'gone',originLat:book.originLat??book.lat,originLng:book.originLng??book.lng,lastHandoffAt:now,handoffCount:(book.handoffCount||0)+1,journey:[...(book.journey||[]),{userId:user.id,userName:user.name,note:args.note||'',lat:user.lat,lng:user.lng,ts:now}]});
    write(KEYS.requests,getRequests().map(r=>r.bookId===book.id && r.id!==request.id && r.status==='pending'?{...r,status:'declined'}:r)); return true;
  }
  if (action === 'returnLoan') {
    if (user.id!==request.ownerId || request.status!=='loaned') throw new Error('Only the lender can confirm a return.');
    saveRequest({status:'returned',returnedAt:now});saveBook({status:'available'}); return true;
  }
  throw new Error('Unknown community action.');
}
