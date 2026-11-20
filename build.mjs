// Builds the site into dist/: the pages (index.html, privacy/, terms/), the
// bundle (assets/app.js, assets/app.css) and the static files from public/.
// No network at runtime: the fonts are inlined into the stylesheet.
//   node build.mjs            production build
//   node build.mjs --dev      unminified, with source maps
import {build} from 'esbuild';
import {cpSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import path from 'node:path';

const dev = process.argv.includes('--dev');
const entry = process.argv.find(a => a.startsWith('--entry='))?.slice(8) ?? 'src/main.tsx';
const outdir = process.argv.find(a => a.startsWith('--out='))?.slice(6) ?? 'dist';
// The theme is one module; swapping the alias swaps the whole look.
const themeName = process.argv.find(a => a.startsWith('--theme='))?.slice(8) ?? 'neutral';

rmSync(outdir, {recursive: true, force: true});
mkdirSync(`${outdir}/assets`, {recursive: true});

const result = await build({
  entryPoints: {app: entry},
  bundle: true,
  outdir: `${outdir}/assets`,
  format: 'iife',
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  loader: {'.woff2': 'dataurl', '.woff': 'empty', '.ttf': 'empty'},
  alias: {'#theme': path.resolve(`src/themes/${themeName}.ts`)},
  define: {'process.env.NODE_ENV': dev ? '"development"' : '"production"'},
  metafile: true,
  logLevel: 'warning',
});

// ---- The pages. One app, served at several addresses: the entry page at /, and
// each policy page at /<id>/ with <body data-page="<id>">. The head (title,
// description, social card) is filled in from src/site.ts.
const siteModule = await build({entryPoints: ['src/site.ts'], bundle: true, write: false, format: 'esm', logLevel: 'warning'});
const {SITE, PAGES} = await import(`data:text/javascript;base64,${Buffer.from(siteModule.outputFiles[0].text).toString('base64')}`);

/** Only the page's own files; no server may be contacted (connect-src 'none'). */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const template = readFileSync('src/index.html', 'utf8').replace('data-astryx-theme="neutral"', `data-astryx-theme="${themeName}"`);
const description = `Riot Gamesのデータ請求で届いたzipを置くだけで、ログインの年表、課金、ストア、直近の試合を図と文章のレポートにします。ファイルはどこにも送信しません。`;
const pages = [
  {path: '', page: '', title: `${SITE.name} — ${SITE.tagline.replace(/。$/, '')}`},
  ...PAGES.map(p => ({path: `${p.id}/`, page: p.id, title: `${p.label}｜${SITE.name}`})),
];
for (const p of pages) {
  const fill = {
    CSP,
    TITLE: p.title,
    NAME: SITE.name,
    DESCRIPTION: description,
    URL: `${SITE.url}/${p.path}`,
    ORIGIN: SITE.url,
    BASE: p.path ? '../' : '',
    PAGE: p.page,
  };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeAttr(String(fill[key] ?? '')));
  mkdirSync(`${outdir}/${p.path}`, {recursive: true});
  writeFileSync(`${outdir}/${p.path}index.html`, html);
}

// ---- Static files served as they are: icons, the social card, response headers.
cpSync('public', outdir, {recursive: true});

for (const [file, info] of Object.entries(result.metafile.outputs)) {
  console.log(`${file}  ${(info.bytes / 1024).toFixed(0)} KB`);
}
