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

  // ── Onboard quickly ──────────────────────────────────────────────────────
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

  // ── Inject a fake accepted request with offered availability into localStorage ──
  await page.evaluate(() => {
    const uid = () => Math.random().toString(36).slice(2, 10);
    const books = JSON.parse(localStorage.getItem('bookswap_books') || '[]');
    const firstBook = books[0];
    if (!firstBook) return;

    const reqId = uid();
    const req = {
      id: reqId,
      bookId: firstBook.id,
      bookTitle: firstBook.title,
      requesterId: 'demo_requester',
      requesterName: 'Jiaxin',
      ownerId: JSON.parse(localStorage.getItem('bookswap_user')).id,
      status: 'accepted',
      offeredSlots: ['mon_pm', 'tue_am', 'sat'],
      createdAt: Date.now() - 60000,
    };
    const existing = JSON.parse(localStorage.getItem('bookswap_requests') || '[]');
    localStorage.setItem('bookswap_requests', JSON.stringify([req, ...existing]));

    // a couple messages
    const msgs = [
      { id: uid(), requestId: reqId, senderId: 'demo_requester', senderName: 'Jiaxin', text: 'Hi! Really want to read this one 📖', sentAt: Date.now() - 50000 },
      { id: uid(), requestId: reqId, senderId: JSON.parse(localStorage.getItem('bookswap_user')).id, senderName: 'Aleks', text: 'Great, it\'s yours! When works for you?', sentAt: Date.now() - 40000 },
      { id: uid(), requestId: reqId, senderId: 'demo_requester', senderName: 'Jiaxin', text: '📅 I\'m free: Mon evening, Tue lunchtime, Sat anytime', sentAt: Date.now() - 30000 },
    ];
    const existingMsgs = JSON.parse(localStorage.getItem('bookswap_messages') || '[]');
    localStorage.setItem('bookswap_messages', JSON.stringify([...existingMsgs, ...msgs]));

    window.__testReqId = reqId;
  });

  const reqId = await page.evaluate(() => window.__testReqId);

  // ── Chat thread — accepted with availability ──────────────────────────────
  await page.goto(`http://localhost:5173/messages/${reqId}`, { waitUntil: 'networkidle0' });
  await wait(600);
  await page.screenshot({ path: path.join(OUT, 's2_01_chat_accepted.png') });
  console.log('s2_01_chat_accepted');

  // ── Open availability picker (tap calendar button) ────────────────────────
  const calBtns = await page.$$('button');
  for (const b of calBtns) {
    const title = await b.evaluate(el => el.title);
    if (title && title.includes('availability')) { await b.click(); break; }
  }
  // fallback: click Confirm time button
  await wait(400);
  // click "Confirm time" in the banner
  const allBtns2 = await page.$$('button');
  for (const b of allBtns2) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.includes('Confirm time')) { await b.click(); await wait(400); break; }
  }
  await page.screenshot({ path: path.join(OUT, 's2_02_slot_confirm_modal.png') });
  console.log('s2_02_slot_confirm_modal');

  // Close modal
  const closeBtns = await page.$$('button');
  for (const b of closeBtns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.trim() === '×') { await b.click(); break; }
  }
  await wait(300);

  // ── QR handoff — inject confirmed state ───────────────────────────────────
  await page.evaluate((rId) => {
    const reqs = JSON.parse(localStorage.getItem('bookswap_requests') || '[]');
    const updated = reqs.map(r => r.id === rId ? { ...r, confirmedSlot: 'sat', confirmedSpot: 'Building lobby' } : r);
    localStorage.setItem('bookswap_requests', JSON.stringify(updated));
  }, reqId);

  await page.goto(`http://localhost:5173/messages/${reqId}`, { waitUntil: 'networkidle0' });
  await wait(600);
  await page.screenshot({ path: path.join(OUT, 's2_03_chat_confirmed.png') });
  console.log('s2_03_chat_confirmed');

  // Open QR modal
  const qrBtns = await page.$$('button');
  for (const b of qrBtns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.includes('Handoff QR')) { await b.click(); await wait(400); break; }
  }
  await page.screenshot({ path: path.join(OUT, 's2_04_qr_handoff.png') });
  console.log('s2_04_qr_handoff');

  // ── Wishlist with items ───────────────────────────────────────────────────
  await page.evaluate(() => {
    const uid = () => Math.random().toString(36).slice(2, 10);
    const user = JSON.parse(localStorage.getItem('bookswap_user'));
    const wishes = [
      { id: uid(), title: 'Dune', author: 'Frank Herbert', genre: 'scifi', userId: user.id, userName: user.name, createdAt: Date.now() - 86400000 },
      { id: uid(), title: 'Normal People', author: 'Sally Rooney', genre: 'fiction', userId: user.id, userName: user.name, createdAt: Date.now() - 3600000 },
    ];
    localStorage.setItem('bookswap_wishlist', JSON.stringify(wishes));
  });
  await page.goto('http://localhost:5173/wishlist', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, 's2_05_wishlist_items.png') });
  console.log('s2_05_wishlist_items');

  // ── Browse with genre filter ──────────────────────────────────────────────
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await wait(600);
  await page.screenshot({ path: path.join(OUT, 's2_06_browse.png') });
  console.log('s2_06_browse');

  await browser.close();
  console.log('DONE');
})();
