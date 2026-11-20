// Draws the social card (public/og.png, 1200x630) from the sample's year card.
// Run against the served site:  node scripts/og.mjs http://localhost:4173/
import {writeFileSync, readFileSync} from 'node:fs';
import {chromium} from './pw.mjs';
const base = process.argv[2] ?? 'http://localhost:4173/';
const ICON = readFileSync('public/favicon.svg', 'utf8').replace('<svg ', '<svg width="48" height="48" ');
const browser = await chromium.launch();

// 1. The sample's year card, without the champion icons (Riot's artwork stays out of the card).
const page = await browser.newPage({viewport: {width: 1280, height: 900}, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'ja-JP', timezoneId: 'Asia/Tokyo'});
await page.goto(base);
await page.waitForTimeout(1500);
await page.addStyleTag({content: '.story-card .story-skins, .story-card .story-skins + *, .story-card [class*="story-skins"] { display: none !important; }'});
await page.evaluate(() => {
  const card = document.querySelector('.story-card');
  // Drop the skins block: the label above the icons, and the icons.
  card.querySelectorAll('.story-skins').forEach(el => el.parentElement?.remove());
  card.scrollIntoView({block: 'center'});
});
await page.waitForTimeout(1200);
const card = await page.locator('.story-card').first().screenshot({animations: 'disabled'});
await page.close();

// 2. The card on the social image, with the name and one line.
const og = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
const src = `data:image/png;base64,${card.toString('base64')}`;
await og.setContent(`<!doctype html><html lang="ja"><body style="margin:0">
<div style="width:1200px;height:630px;box-sizing:border-box;padding:64px;display:flex;gap:48px;align-items:center;
  background:radial-gradient(120% 90% at 0% 0%, rgba(1,113,227,.35), transparent 55%),radial-gradient(90% 80% at 100% 100%, rgba(107,30,253,.3), transparent 60%),#0e0f12;
  font-family:'Hiragino Sans','Noto Sans CJK JP','Noto Sans JP',sans-serif;color:#fff">
  <div style="flex:0 0 430px;display:flex;flex-direction:column;gap:22px">
    <div style="display:flex;align-items:center;gap:14px">
      ${ICON}
      <div style="font-size:44px;font-weight:800;letter-spacing:-.01em">Wadachi.gg</div>
    </div>
    <div style="font-size:34px;font-weight:700;line-height:1.35">データ請求で届いた<br>ファイルを、<br>年表と図で読む。</div>
    <div style="font-size:21px;color:#b9bec8;line-height:1.5">zipを置くだけ。<br>ファイルはどこにも送信しません。</div>
  </div>
  <div style="flex:1;display:flex;justify-content:center;align-items:center;min-width:0">
    <img src="${src}" style="max-width:100%;max-height:502px;border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,.5)">
  </div>
</div></body></html>`);
await og.waitForTimeout(400);
writeFileSync('public/og.png', await og.screenshot({type: 'png'}));
// 3. The touch icon, from the same SVG.
const icon = await browser.newPage({viewport: {width: 180, height: 180}});
await icon.setContent(`<body style="margin:0;background:transparent">${readFileSync('public/favicon.svg', 'utf8').replace('<svg ', '<svg width="180" height="180" ')}</body>`);
writeFileSync('public/apple-touch-icon.png', await icon.screenshot({omitBackground: true}));
await browser.close();
console.log('public/og.png and public/apple-touch-icon.png written');
