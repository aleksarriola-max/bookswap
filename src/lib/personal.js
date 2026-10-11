import { notifyStore } from './cloud';

// Personal reading preferences stay on this device, isolated by account.
const key = userId => `ctrl-us-personal:${userId}`;
export function getPersonal(userId) {
  try { return { favorites:[], reading:[], ...JSON.parse(localStorage.getItem(key(userId)) || '{}') }; }
  catch { return {favorites:[],reading:[]}; }
}
function save(userId,data) { localStorage.setItem(key(userId),JSON.stringify(data)); notifyStore(); }
export function toggleFavorite(userId,bookId) {
  const data=getPersonal(userId);
  data.favorites=data.favorites.includes(bookId) ? data.favorites.filter(id=>id!==bookId) : [...data.favorites,bookId];
  save(userId,data);
}
export function saveReading(userId,entry) {
  const data=getPersonal(userId);
  const title=entry.title.trim(); if (!title) throw new Error('Enter a book title.');
  if (!['want','reading','finished'].includes(entry.status)) throw new Error('Choose a reading status.');
  const pages=Math.max(0,Math.floor(Number(entry.pages)||0));
  const total=Math.max(0,Math.floor(Number(entry.total)||0));
  if (total && pages>total) throw new Error('Pages read cannot exceed the total pages.');
  const item={...entry,id:entry.id || crypto.randomUUID(),title,pages,total,updatedAt:Date.now()};
  save(userId,{...data,reading:[item,...data.reading.filter(book=>book.id!==item.id)]});
}
export function removeReading(userId,id) { const data=getPersonal(userId); save(userId,{...data,reading:data.reading.filter(book=>book.id!==id)}); }
export function recommendBooks(books,personal,userId) {
  const favorites=books.filter(book=>personal.favorites.includes(book.id));
  const genres=new Set([...favorites,...personal.reading].map(book=>book.genre).filter(Boolean));
  return books.filter(book=>book.ownerId!==userId && book.status==='available' && !personal.favorites.includes(book.id))
    .map(book=>({book,score:genres.has(book.genre)?1:0}))
    .sort((a,b)=>b.score-a.score || b.book.createdAt-a.book.createdAt).slice(0,4);
}
