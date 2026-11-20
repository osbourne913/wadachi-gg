// Screenshot helper for visual checks.
//   node scripts/shot.mjs <html-file> <out-prefix> [--w=1280,390] [--scheme=light,dark] [--full] [--hash=#x] [--theme=dark]
//                         [--click="text"] [--upload=<zip>] [--wait=ms] [--clip=h] [--query=?a=b]
import path from 'node:path';
import {chromium} from './pw.mjs';

const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const prefix = args[1];
const opt = name => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const widths = (opt('w') ?? '1280,390').split(',').map(Number);
const schemes = (opt('scheme') ?? 'light').split(',');
const full = args.includes('--full');
const wait = Number(opt('wait') ?? 600);
const clicks = args.filter(a => a.startsWith('--click=')).map(a => a.slice(8));
const upload = opt('upload');
const hash = opt('hash') ?? '';
const query = opt('query') ?? '';
const dataTheme = opt('theme');
const clip = opt('clip');
const height = Number(opt('h') ?? 900);

const browser = await chromium.launch();
for (const w of widths) {
  for (const scheme of schemes) {
    const page = await browser.newPage({
      viewport: {width: w, height},
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
    page.on('requestfailed', r => problems.push(`REQFAILED: ${r.url().slice(0, 120)}`));
    const external = [];
    page.on('request', r => {
      if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url());
    });
    await page.goto(`file://${file}${query}${hash}`);
    if (dataTheme) {
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), dataTheme);
    }
    await page.waitForTimeout(wait);
    if (upload) {
      await page.setInputFiles('input[type=file]', upload);
      await page.waitForTimeout(wait + 1200);
    }
    for (const c of clicks) {
      await page.getByText(c, {exact: false}).first().click();
      await page.waitForTimeout(wait);
    }
    const out = `${prefix}-${w}-${scheme}.png`;
    if (clip) {
      await page.screenshot({path: out, clip: {x: 0, y: 0, width: w, height: Number(clip)}});
    } else {
      await page.screenshot({path: out, fullPage: full, animations: full ? 'disabled' : 'allow'});
    }
    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
      scrollH: document.documentElement.scrollHeight,
      bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 80),
      bodyBg: getComputedStyle(document.body).backgroundColor,
    }));
    console.log(out, JSON.stringify(metrics), external.length ? `EXTERNAL REQUESTS: ${external.slice(0, 5).join(' ')}` : 'no external requests');
    if (problems.length) console.log('  problems:', [...new Set(problems)].slice(0, 12));
    await page.close();
  }
}
await browser.close();
