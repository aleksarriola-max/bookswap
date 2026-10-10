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

  // Onboarding
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT, '01_onboarding.png') });
  console.log('01_onboarding');

  // Enter name + skip location
  await page.type('input[placeholder="Your first name"]', 'Aleks');
  await page.click('button[type="submit"]');
  await wait(600);
  const btns = await page.$$('button');
  for (const b of btns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.includes('Skip')) { await b.click(); break; }
  }
  await wait(1200);

  // Browse — default
  await page.screenshot({ path: path.join(OUT, '02_browse.png') });
  console.log('02_browse');

  // Browse — click Sci-Fi genre chip
  const chips = await page.$$('button');
  for (const c of chips) {
    const t = await c.evaluate(el => el.textContent);
    if (t && t.includes('Sci-Fi')) { await c.click(); await wait(400); break; }
  }
  await page.screenshot({ path: path.join(OUT, '03_browse_genre_filter.png') });
  console.log('03_browse_genre_filter');

  // Book detail
  const bookLinks = await page.$$('a[href^="/book/"]');
  if (bookLinks[0]) {
    // reset genre first
    const allBtn = await page.$('button');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await wait(600);
    const links = await page.$$('a[href^="/book/"]');
    if (links[0]) { await links[0].click(); await wait(500); }
  }
  await page.screenshot({ path: path.join(OUT, '04_book_detail.png') });
  console.log('04_book_detail');

  // Post a book
  await page.goto('http://localhost:5173/post', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '05_post_book.png') });
  console.log('05_post_book');

  // Wishlist
  await page.goto('http://localhost:5173/wishlist', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '06_wishlist_empty.png') });
  console.log('06_wishlist_empty');

  // Wishlist with form open
  const addBtns = await page.$$('button');
  for (const b of addBtns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.trim().includes('Add')) { await b.click(); await wait(400); break; }
  }
  await page.screenshot({ path: path.join(OUT, '07_wishlist_form.png') });
  console.log('07_wishlist_form');

  // Messages
  await page.goto('http://localhost:5173/messages', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '08_messages.png') });
  console.log('08_messages');

  // My books
  await page.goto('http://localhost:5173/my-books', { waitUntil: 'networkidle0' });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '09_my_books.png') });
  console.log('09_my_books');

  await browser.close();
  console.log('DONE');
})();
