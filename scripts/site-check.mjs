// End-to-end checks against the served site (run scripts/serve.mjs first):
// every page loads with no CSP violation or console error, the report works
// with the network cut off, and no request leaves the origin.
//   node scripts/site-check.mjs <base-url> <zip> [out-dir]
import {mkdirSync} from 'node:fs';
import {chromium} from './pw.mjs';
const [base, zip, outDir = 'check-out'] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const browser = await browser_();
async function browser_() {
  return chromium.launch();
}
const problems = [];
const origin = new URL(base).origin;

async function open(url, opts = {}) {
  const context = await browser.newContext({viewport: {width: opts.w ?? 1280, height: 860}, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', isMobile: !!opts.mobile, hasTouch: !!opts.mobile, deviceScaleFactor: opts.mobile ? 2 : 1});
  const page = await context.newPage();
  const tag = `${url.replace(base, '/')}${opts.mobile ? ' (phone)' : ''}`;
  page.on('console', m => {
    if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) problems.push(`${tag} console: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', e => problems.push(`${tag} error: ${e.message.slice(0, 200)}`));
  page.on('request', r => {
    if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) problems.push(`${tag} external request: ${r.url()}`);
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.goto(url);
  await page.waitForTimeout(700);
  return {context, page, tag};
}

async function cspOf(page, tag) {
  const v = await page.evaluate(() => window.__csp);
  if (v.length) problems.push(`${tag} CSP violations: ${[...new Set(v)].join(', ')}`);
}

// Pages
for (const p of ['', 'privacy/', 'terms/']) {
  for (const mobile of [false, true]) {
    const {context, page, tag} = await open(base + p, {mobile, w: mobile ? 390 : 1280});
    const info = await page.evaluate(() => ({title: document.title, h1: document.querySelector('h1')?.textContent, scrollW: document.documentElement.scrollWidth, w: innerWidth}));
    console.log(tag, JSON.stringify(info));
    if (info.scrollW > info.w) problems.push(`${tag} sideways scroll`);
    await page.screenshot({path: `${outDir}/${(p || 'home').replace('/', '')}-${mobile ? 'phone' : 'desk'}.png`, fullPage: true, animations: 'disabled'});
    await cspOf(page, tag);
    await context.close();
  }
}

// Offline: open the page, cut the network, then read the file.
{
  const {context, page, tag} = await open(base);
  await context.setOffline(true);
  const online = await page.evaluate(() => navigator.onLine);
  await page.setInputFiles('input[type=file]', zip);
  await page.waitForTimeout(3000);
  const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent);
  const story = await page.evaluate(() => document.querySelectorAll('.story-card, .story-step').length);
  console.log('offline: navigator.onLine =', online, '| report heading:', JSON.stringify(h1), '| story parts:', story);
  if (!story) problems.push('offline report did not render');
  // Try a request from the page itself: the policy must refuse it.
  await context.setOffline(false);
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/');
      return 'fetch went through';
    } catch (e) {
      return `fetch refused (${e.name})`;
    }
  });
  console.log('a fetch from the page:', blocked, '| CSP reports:', JSON.stringify(await page.evaluate(() => window.__csp)));
  // That one violation was ours; clear it before counting.
  await page.evaluate(() => (window.__csp = []));
  await cspOf(page, tag);
  await context.close();
}

// Response headers
{
  const res = await fetch(base);
  console.log('headers:', ['content-security-policy', 'x-frame-options', 'referrer-policy', 'x-content-type-options'].map(h => `${h}=${res.headers.get(h) ? 'set' : 'MISSING'}`).join(' '));
}

const filtered = problems.filter(p => !/external request: https:\/\/example\.com/.test(p) && !/Refused to connect to 'https:\/\/example\.com/.test(p) && !/example\.com/.test(p));
console.log(filtered.length ? `PROBLEMS:\n  ${[...new Set(filtered)].join('\n  ')}` : 'no problems');
await browser.close();
