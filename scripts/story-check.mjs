// Interaction checks for the story: the fixed card follows the note being read,
// a day on the calendar answers to hover and to tap, and the nav link lands on it.
//   node scripts/story-check.mjs <html-file> <out-dir> [--upload=<zip>]
import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {chromium} from './pw.mjs';

const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const outDir = path.resolve(args[1]);
const upload = args.find(a => a.startsWith('--upload='))?.slice(9);
mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch();
const problems = [];

async function open(width, height, mobile) {
  const page = await browser.newPage({
    viewport: {width, height},
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  });
  page.on('pageerror', e => problems.push(`PAGEERROR ${e.message.slice(0, 300)}`));
  page.on('console', m => {
    if (m.type() === 'error') problems.push(`console ${m.text().slice(0, 300)}`);
  });
  await page.goto(`file://${file}`);
  await page.waitForTimeout(400);
  if (upload) {
    await page.setInputFiles('input[type=file]', upload);
    await page.waitForTimeout(2200);
  } else {
    await page.getByText('サンプルで試す').first().click();
    await page.waitForTimeout(900);
  }
  return page;
}

// ---- wide
{
  const page = await open(1280, 800, false);
  const count = await page.evaluate(() => document.querySelectorAll('.story-step').length);
  const seen = [];
  for (let i = 0; i < count; i++) {
    await page.evaluate(i => {
      const el = document.querySelectorAll('.story-step')[i];
      scrollTo({top: el.getBoundingClientRect().top + scrollY - innerHeight * 0.45, behavior: 'instant'});
    }, i);
    await page.waitForTimeout(700);
    seen.push(
      await page.evaluate(() => {
        const r = document.querySelector('.story-stage').getBoundingClientRect();
        return {
          step: document.querySelector('.story-step[data-active="true"] h3')?.textContent,
          card: document.querySelector('.story-stage .story-year')?.textContent,
          figure: document.querySelector('.story-stage .story-figure')?.textContent,
          top: Math.round(r.top),
          fits: r.bottom <= innerHeight,
        };
      }),
    );
  }
  console.log('wide: steps', count);
  for (const s of seen) console.log('  ', JSON.stringify(s));
  if (seen.some(s => s.step !== s.card)) problems.push('stage year differs from the active step');
  if (seen.slice(1).some(s => !s.fits)) problems.push('stage does not fit the window');

  // Hover a lit day.
  const cell = page.locator('.story-stage .viz-cal-cell[data-level="2"]').first();
  await cell.hover();
  await page.waitForTimeout(200);
  console.log('wide: hover tip', JSON.stringify(await page.locator('.story-stage .viz-tip').first().textContent().catch(() => null)));
  await page.screenshot({path: path.join(outDir, 'wide-hover.png')});
  // Hover a skin icon.
  const icon = page.locator('.story-stage .viz-dex-cell').first();
  if (await icon.count()) {
    await icon.hover();
    await page.waitForTimeout(200);
    console.log('wide: icon tip', JSON.stringify(await page.locator('.story-stage .viz-tip').first().textContent().catch(() => null)));
  }

  // Past the story, the card lets go.
  await page.evaluate(() => {
    const el = document.getElementById('play');
    scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior: 'instant'});
  });
  await page.waitForTimeout(400);
  console.log('wide: stage bottom after the story (should be above the window top or near it)', await page.evaluate(() => Math.round(document.querySelector('.story-stage').getBoundingClientRect().bottom)));
  await page.screenshot({path: path.join(outDir, 'wide-after.png')});

  // The nav link.
  await page.getByRole('link', {name: '年表'}).first().click().catch(async () => page.getByText('年表', {exact: true}).first().click());
  await page.waitForTimeout(900);
  console.log('wide: after nav click, story heading top', await page.evaluate(() => Math.round(document.getElementById('story').getBoundingClientRect().top)));
  await page.close();
}

// ---- narrow
{
  const page = await open(390, 800, true);
  const first = page.locator('.story-card').first();
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const cell = page.locator('.story-card .viz-cal-cell[data-level="2"]').first();
  await cell.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await cell.tap();
  await page.waitForTimeout(250);
  console.log('narrow: tap tip', JSON.stringify(await page.locator('.story-card .viz-tip').first().textContent().catch(() => null)));
  await page.screenshot({path: path.join(outDir, 'narrow-tap.png')});
  // Tap elsewhere closes it.
  await page.locator('.story-year').first().tap();
  await page.waitForTimeout(200);
  console.log('narrow: tips open after tapping elsewhere', await page.locator('.story-card .viz-tip').count());
  // A card further down starts held back and plays when reached.
  const last = page.locator('.story-card').last();
  console.log('narrow: last card before reaching it', JSON.stringify(await last.locator('.story-figure').first().textContent()), await last.locator('.viz-cal-weeks').first().getAttribute('data-play'));
  await last.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  console.log('narrow: last card after reaching it', JSON.stringify(await last.locator('.story-figure').first().textContent()), await last.locator('.viz-cal-weeks').first().getAttribute('data-play'));
  console.log('narrow: scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth));
  await page.close();
}

console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no problems');
await browser.close();
