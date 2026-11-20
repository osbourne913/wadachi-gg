// Loads odd exports to make sure nothing crashes and nothing overflows.
//   node scripts/edge.mjs <html-file> <out-dir> <zip> [<zip> ...]
import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {chromium} from './pw.mjs';
const [html, outDir, ...zips] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch();
for (const zip of zips) {
  for (const width of [1280, 390]) {
    const mobile = width < 600;
    const page = await browser.newPage({viewport: {width, height: 860}, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'ja-JP', timezoneId: 'Asia/Tokyo'});
    const problems = [];
    page.on('pageerror', e => problems.push('PAGEERROR ' + e.message.slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error') problems.push('console ' + m.text().slice(0, 300)); });
    await page.goto(`file://${path.resolve(html)}`);
    await page.waitForTimeout(400);
    await page.setInputFiles('input[type=file]', zip);
    await page.waitForTimeout(1800);
    const state = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent,
      sections: [...document.querySelectorAll('h2')].map(h => h.textContent),
      cards: document.querySelectorAll('.astryx-card').length,
      scrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
      alert: [...document.querySelectorAll('[aria-live]')].map(e => e.textContent).filter(Boolean),
      rootEmpty: document.getElementById('root').children.length === 0,
    }));
    const name = path.basename(zip, '.zip');
    await page.screenshot({path: path.join(outDir, `${name}-${width}.png`), fullPage: true});
    console.log(name, width, JSON.stringify(state), problems.length ? problems : 'ok');
    await page.close();
  }
}
await browser.close();
