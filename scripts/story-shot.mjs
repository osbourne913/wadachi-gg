// Screenshots of the story at the top of the report.
//   node scripts/story-shot.mjs <html-file> <out-prefix> [--w=1280] [--h=800] [--scheme=light] [--upload=<zip>] [--steps=0,4,9]
// Wide: one viewport shot per listed step, with that step being read.
// Narrow: scrolls the whole feed into view first, then takes one full-page shot.
import path from 'node:path';
import {chromium} from './pw.mjs';

const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const prefix = args[1];
const opt = name => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const w = Number(opt('w') ?? 1280);
const h = Number(opt('h') ?? 800);
const scheme = opt('scheme') ?? 'light';
const upload = opt('upload');
const steps = (opt('steps') ?? '0,4,9').split(',').map(Number);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: {width: w, height: h},
  colorScheme: scheme,
  deviceScaleFactor: w < 600 ? 2 : 1,
  isMobile: w < 600,
  hasTouch: w < 600,
  locale: 'ja-JP',
  timezoneId: 'Asia/Tokyo',
});
const problems = [];
page.on('console', m => {
  if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text().slice(0, 400)}`);
});
page.on('pageerror', e => problems.push(`PAGEERROR: ${e.message.slice(0, 600)}`));
await page.goto(`file://${file}`);
await page.waitForTimeout(500);
if (upload) {
  await page.setInputFiles('input[type=file]', upload);
  await page.waitForTimeout(2200);
} else {
  await page.getByText('サンプルで試す').first().click();
  await page.waitForTimeout(900);
}

const wide = await page.evaluate(() => !!document.querySelector('.story-scrolly'));
if (wide) {
  for (const i of steps) {
    const ok = await page.evaluate(i => {
      const el = document.querySelectorAll('.story-step')[i];
      if (!el) return false;
      const top = el.getBoundingClientRect().top + scrollY;
      scrollTo({top: top - innerHeight * 0.4, behavior: 'instant'});
      return true;
    }, i);
    if (!ok) continue;
    await page.waitForTimeout(1300);
    await page.screenshot({path: `${prefix}-${w}x${h}-${scheme}-step${i}.png`});
    const info = await page.evaluate(() => {
      const stage = document.querySelector('.story-stage');
      const r = stage.getBoundingClientRect();
      return {
        active: document.querySelector('.story-step[data-active="true"] h3')?.textContent,
        year: document.querySelector('.story-stage .story-year')?.textContent,
        stageTop: Math.round(r.top),
        stageBottom: Math.round(r.bottom),
        viewport: innerHeight,
      };
    });
    console.log(`step ${i}`, JSON.stringify(info));
  }
} else {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let yy = 0; yy < total; yy += Math.round(h * 0.6)) {
    await page.evaluate(v => scrollTo({top: v, behavior: 'instant'}), yy);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(900);
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await page.waitForTimeout(200);
  // A full-page capture shrinks the window to 1x1 for a moment, which replays entrances; skip to their end.
  await page.screenshot({path: `${prefix}-${w}x${h}-${scheme}-feed.png`, fullPage: true, animations: 'disabled'});
  const info = await page.evaluate(() => ({
    cards: document.querySelectorAll('.story-card').length,
    heights: [...document.querySelectorAll('.story-card')].map(c => Math.round(c.getBoundingClientRect().height)),
    scrollW: document.documentElement.scrollWidth,
    innerW: innerWidth,
  }));
  console.log('feed', JSON.stringify(info));
}
if (problems.length) console.log('problems:', [...new Set(problems)].slice(0, 12));
await browser.close();
