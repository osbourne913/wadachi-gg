// Interaction checks that a still screenshot cannot show: in-page navigation,
// the sticky rail, the phone drawer, tooltips, the table view.
//   node scripts/check.mjs <html-file> <out-dir> [--scheme=light|dark] [--upload=<zip>]
import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {chromium} from './pw.mjs';

const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const outDir = path.resolve(args[1]);
const opt = name => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const scheme = opt('scheme') ?? 'light';
const upload = opt('upload');
mkdirSync(outDir, {recursive: true});

const browser = await chromium.launch();
const problems = [];

async function open(width, height, mobile) {
  const page = await browser.newPage({
    viewport: {width, height},
    colorScheme: scheme,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  });
  page.on('console', m => {
    if (['error', 'warning'].includes(m.type())) problems.push(`${width}: ${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', e => problems.push(`${width}: PAGEERROR: ${e.message.slice(0, 400)}`));
  await page.goto(`file://${file}`);
  await page.waitForTimeout(500);
  if (upload) {
    await page.setInputFiles('input[type=file]', upload);
    await page.waitForSelector('text=まとめ', {timeout: 20000});
  } else {
    await page.getByRole('button', {name: 'サンプルで試す'}).click();
  }
  await page.waitForTimeout(700);
  return page;
}

const shot = (page, name) => page.screenshot({path: path.join(outDir, `${name}.png`)});
const state = page =>
  page.evaluate(() => ({
    y: Math.round(scrollY),
    selected: [...document.querySelectorAll('[aria-current="page"]')].map(e => e.textContent),
    navH: getComputedStyle(document.documentElement).getPropertyValue('--app-nav-height'),
    scrollW: document.documentElement.scrollWidth,
  }));

// ---- desktop ----
{
  const page = await open(1280, 800, false);
  await page.getByRole('link', {name: '課金とストア'}).first().click();
  await page.waitForTimeout(900);
  console.log('desktop after nav click', JSON.stringify(await state(page)));
  await shot(page, 'd1-nav-spend');

  const headingTop = await page.evaluate(() => Math.round(document.getElementById('spend').getBoundingClientRect().top));
  console.log('  #spend heading top (should clear the nav):', headingTop);

  // rail stays in view while the page is scrolled
  const rail = await page.evaluate(() => {
    const el = document.querySelector('.rail-sticky');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {top: Math.round(r.top), height: Math.round(r.height), scrollable: el.scrollHeight > el.clientHeight};
  });
  console.log('  rail', JSON.stringify(rail));

  // tooltip on a bar
  const bar = page.locator('[data-viz-mark]').nth(140);
  await page.evaluate(() => window.scrollTo({top: 500, behavior: 'instant'}));
  await page.waitForTimeout(300);
  const cell = page.locator('.viz-cell[data-level="4"]').first();
  await cell.hover();
  await page.waitForTimeout(250);
  await shot(page, 'd2-tooltip-heat');

  // table view of the first chart
  await page.getByRole('radio', {name: '表'}).first().click();
  await page.waitForTimeout(300);
  await shot(page, 'd3-table-view');
  await page.getByRole('radio', {name: '図'}).first().click();

  // a finding jumps to its chart
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await page.waitForTimeout(200);
  await page.locator('.rail-sticky').getByText('課金の合計', {exact: false}).first().click({timeout: 5000}).catch(e => problems.push('finding click: ' + e.message.slice(0, 200)));
  await page.waitForTimeout(900);
  console.log('desktop after finding click', JSON.stringify(await state(page)));
  await shot(page, 'd4-after-finding');

  // back to the entry page
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await page.getByRole('button', {name: '別のファイルを読む'}).click();
  await page.waitForTimeout(500);
  console.log('desktop back on landing:', await page.getByRole('heading', {level: 1}).textContent());
  await page.getByRole('link', {name: 'よくある質問'}).first().click();
  await page.waitForTimeout(900);
  console.log('landing after faq click', JSON.stringify(await state(page)));
  await shot(page, 'd5-landing-faq');
  await page.close();
}

// ---- phone ----
{
  const page = await open(390, 844, true);
  await shot(page, 'm1-report-top');
  const menu = page.getByRole('button', {name: /メニュー|menu|ナビ|navigation/i}).first();
  console.log('phone menu button found:', await menu.count());
  await menu.tap().catch(async e => {
    problems.push('menu tap: ' + e.message.slice(0, 200));
  });
  await page.waitForTimeout(600);
  await shot(page, 'm2-drawer');
  const item = page.getByRole('link', {name: '直近の試合'}).first();
  console.log('phone drawer item found:', await item.count());
  await item.tap().catch(e => problems.push('drawer item tap: ' + e.message.slice(0, 200)));
  await page.waitForTimeout(1200);
  console.log('phone after drawer nav', JSON.stringify(await state(page)));
  console.log('  dialog still open:', await page.locator('[role="dialog"]:visible').count());
  await shot(page, 'm3-after-drawer-nav');

  // tap a heat cell for its tooltip
  await page.evaluate(() => document.getElementById('play').scrollIntoView({block: 'start', behavior: 'instant'}));
  await page.waitForTimeout(300);
  await page.locator('.viz-cell[data-level="4"]').first().tap();
  await page.waitForTimeout(250);
  await shot(page, 'm4-tooltip');
  console.log('phone scrollWidth', JSON.stringify(await state(page)));
  await page.close();
}

await browser.close();
if (problems.length) {
  console.log('problems:');
  for (const p of [...new Set(problems)]) console.log('  ' + p);
} else {
  console.log('no console problems');
}
