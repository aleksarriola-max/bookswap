const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT = 'C:/Users/aleks/.kiro/crew/scratch/bookswap_screenshots';
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // ── Onboard ──────────────────────────────────────────────────────────────
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder="Your first name"]', 'Aleks');
  await page.click('button[type="submit"]');
  await wait(600);
  const btns = await page.$$('button');
  for (const b of btns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.includes('Skip')) { await b.click(); break; }
  }
  await wait(1200);

  // ── Browse — rep badges on cards ─────────────────────────────────────────
  await page.screenshot({ path: path.join(OUT, 's3_01_browse_with_badges.png') });
  console.log('s3_01_browse_with_badges');

  // ── Book detail — owner rep card ─────────────────────────────────────────
  const links = await page.$$('a[href^="/book/"]');
  if (links[1]) { await links[1].click(); await wait(600); }
  await page.screenshot({ path: path.join(OUT, 's3_02_book_detail_rep.png') });
  console.log('s3_02_book_detail_rep');

  // ── My Books — profile with stats ────────────────────────────────────────
  await page.goto('http://localhost:5173/my-books', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, 's3_03_my_profile_stats.png') });
  console.log('s3_03_my_profile_stats');

  // Inject some done books to show a filled progress bar
  await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem('bookswap_user'));
    const uid = () => Math.random().toString(36).slice(2, 10);
    const doneBooks = [
      { id: uid(), title: 'Past Book A', author: 'Auth A', genre: 'fiction', condition: 'Good', note: '', imageDataUrl: null, ownerId: user.id, ownerName: user.name, lat: 42.36, lng: -71.06, status: 'gone', createdAt: Date.now() - 200000 },
      { id: uid(), title: 'Past Book B', author: 'Auth B', genre: 'scifi', condition: 'Like new', note: '', imageDataUrl: null, ownerId: user.id, ownerName: user.name, lat: 42.36, lng: -71.06, status: 'gone', createdAt: Date.now() - 100000 },
    ];
    const existing = JSON.parse(localStorage.getItem('bookswap_books') || '[]');
    localStorage.setItem('bookswap_books', JSON.stringify([...existing, ...doneBooks]));
    // Also add a done request to simulate received
    const req = { id: uid(), bookId: 'x', bookTitle: 'Some Book', requesterId: user.id, requesterName: user.name, ownerId: 'demo1', status: 'done', createdAt: Date.now() - 50000 };
    const reqs = JSON.parse(localStorage.getItem('bookswap_requests') || '[]');
    localStorage.setItem('bookswap_requests', JSON.stringify([...reqs, req]));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);
  await page.screenshot({ path: path.join(OUT, 's3_04_profile_with_stats.png') });
  console.log('s3_04_profile_with_stats');

  // ── Post book — with genre picker ─────────────────────────────────────────
  await page.goto('http://localhost:5173/post', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, 's3_05_post_book_genre.png') });
  console.log('s3_05_post_book_genre');

  await browser.close();
  console.log('DONE');
})();
