// store.js — simple localStorage-backed state management
// All data lives in localStorage under 'bookswap_*' keys.

const KEYS = {
  user: 'bookswap_user',
  books: 'bookswap_books',
  requests: 'bookswap_requests',
  messages: 'bookswap_messages',
};

// ── helpers ──────────────────────────────────────────────────────────────────
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ── Haversine distance (km) ───────────────────────────────────────────────────
export const distanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── User ─────────────────────────────────────────────────────────────────────
export const getUser = () => read(KEYS.user, null);
export const saveUser = (user) => write(KEYS.user, user);
export const createUser = ({ name, lat, lng }) => {
  const user = { id: uid(), name, lat, lng, joinedAt: Date.now() };
  saveUser(user);
  return user;
};
export const clearUser = () => localStorage.removeItem(KEYS.user);

// ── Books ─────────────────────────────────────────────────────────────────────
export const getBooks = () => read(KEYS.books, []);

export const addBook = ({ title, author, condition, note, imageDataUrl, ownerId, ownerName, lat, lng }) => {
  const books = getBooks();
  const book = {
    id: uid(),
    title,
    author,
    condition, // 'Like new' | 'Good' | 'Worn'
    note: note || '',
    imageDataUrl: imageDataUrl || null,
    ownerId,
    ownerName,
    lat,
    lng,
    status: 'available', // 'available' | 'requested' | 'gone'
    createdAt: Date.now(),
  };
  write(KEYS.books, [book, ...books]);
  return book;
};

export const updateBookStatus = (bookId, status) => {
  const books = getBooks().map((b) => (b.id === bookId ? { ...b, status } : b));
  write(KEYS.books, books);
};

export const deleteBook = (bookId) => {
  write(KEYS.books, getBooks().filter((b) => b.id !== bookId));
  // also remove related requests/messages
  write(KEYS.requests, getRequests().filter((r) => r.bookId !== bookId));
};

export const getNearbyBooks = (lat, lng, radiusKm = 5) =>
  getBooks().filter(
    (b) =>
      b.status !== 'gone' &&
      distanceKm(lat, lng, b.lat, b.lng) <= radiusKm
  ).sort((a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng));

// ── Requests ──────────────────────────────────────────────────────────────────
export const getRequests = () => read(KEYS.requests, []);

export const createRequest = ({ bookId, bookTitle, requesterId, requesterName, ownerId }) => {
  const requests = getRequests();
  // prevent duplicate
  if (requests.find((r) => r.bookId === bookId && r.requesterId === requesterId)) return null;
  const req = {
    id: uid(),
    bookId,
    bookTitle,
    requesterId,
    requesterName,
    ownerId,
    status: 'pending', // 'pending' | 'accepted' | 'declined' | 'done'
    createdAt: Date.now(),
  };
  write(KEYS.requests, [req, ...requests]);
  updateBookStatus(bookId, 'requested');
  return req;
};

export const updateRequestStatus = (requestId, status) => {
  const requests = getRequests().map((r) =>
    r.id === requestId ? { ...r, status } : r
  );
  write(KEYS.requests, requests);
  if (status === 'done') {
    const req = requests.find((r) => r.id === requestId);
    if (req) updateBookStatus(req.bookId, 'gone');
  }
  if (status === 'declined') {
    const req = requests.find((r) => r.id === requestId);
    if (req) updateBookStatus(req.bookId, 'available');
  }
};

export const getRequestsForUser = (userId) =>
  getRequests().filter((r) => r.ownerId === userId || r.requesterId === userId);

// ── Messages ──────────────────────────────────────────────────────────────────
export const getMessages = () => read(KEYS.messages, []);

export const sendMessage = ({ requestId, senderId, senderName, text }) => {
  const msgs = getMessages();
  const msg = {
    id: uid(),
    requestId,
    senderId,
    senderName,
    text,
    sentAt: Date.now(),
  };
  write(KEYS.messages, [...msgs, msg]);
  return msg;
};

export const getMessagesForRequest = (requestId) =>
  getMessages().filter((m) => m.requestId === requestId);

// ── Seed demo data ─────────────────────────────────────────────────────────────
export const seedDemoData = (userLat, userLng) => {
  if (getBooks().length > 0) return; // already seeded
  const demos = [
    { title: 'Project Hail Mary', author: 'Andy Weir', condition: 'Like new', note: 'Great sci-fi, loved it!', lat: userLat + 0.008, lng: userLng + 0.005, ownerName: 'Jiaxin', ownerId: 'demo1' },
    { title: 'Atomic Habits', author: 'James Clear', condition: 'Good', note: 'Some highlights inside', lat: userLat - 0.004, lng: userLng + 0.011, ownerName: 'Rafaella', ownerId: 'demo2' },
    { title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', condition: 'Worn', note: 'Classic, well-read copy', lat: userLat + 0.012, lng: userLng - 0.007, ownerName: 'Francisco', ownerId: 'demo3' },
    { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', condition: 'Good', note: '', lat: userLat - 0.007, lng: userLng - 0.003, ownerName: 'Jiaxin', ownerId: 'demo1' },
    { title: 'Un Negocio Llamado Mente', author: 'Rafael Ayala', condition: 'Like new', note: 'Spanish language', lat: userLat + 0.003, lng: userLng + 0.015, ownerName: 'Aleks', ownerId: 'demo4' },
  ];
  const books = demos.map((d) => ({
    id: uid(), ...d, imageDataUrl: null, status: 'available', createdAt: Date.now() - Math.random() * 86400000 * 3,
  }));
  write(KEYS.books, books);
};
