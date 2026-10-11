export const normalizeTitle = text => text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function matchWish(wish, book) {
  const wanted = normalizeTitle(wish.title);
  const titles = [book.title, ...(book.bundleItems || [])].map(normalizeTitle);
  const titleMatch = wanted && titles.some(title => title === wanted || (wanted.length >= 5 && (` ${title} `).includes(` ${wanted} `)));
  const authorMatch = !(wish.author || '').trim() || normalizeTitle(book.author).includes(normalizeTitle(wish.author));
  return Boolean(titleMatch && authorMatch);
}
export function monthlyHandoffs(books, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return books.reduce((total, book) => total + (book.journey || []).filter(entry => entry.ts >= start && entry.ts < end).length, 0);
}
