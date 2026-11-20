// Node check: print the year-by-year story for an extracted export directory, or for the sample.
//   npm run story -- <export-dir | --sample>
import * as fs from 'node:fs';
import * as path from 'node:path';
import {analyze} from '../src/lib/riot/analyze';
import {makeSampleExport} from '../src/lib/riot/sample';
import type {ExportFile} from '../src/lib/riot/types';

function walk(dir: string, base = dir): ExportFile[] {
  const out: ExportFile[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, base));
    } else {
      const rel = path.relative(base, full).split(path.sep).join('/');
      let data: unknown;
      if (rel.toLowerCase().endsWith('.json')) {
        try {
          data = JSON.parse(fs.readFileSync(full, 'utf8'));
        } catch {
          data = undefined;
        }
      }
      out.push({path: rel, size: stat.size, data});
    }
  }
  return out;
}

const arg = process.argv[2];
const report = arg === '--sample' ? analyze(makeSampleExport(), {isSample: true}) : analyze(walk(arg));
const story = report.story;
if (!story) {
  console.log('no story');
} else {
  const d = (t: number) => new Date(t).toLocaleDateString('sv-SE');
  for (const y of story.years) {
    console.log(
      `\n${y.year}${y.partial ? '*' : ''} [${y.tag}] days=${y.days} cum=${y.cumulative} night=${y.nightShare == null ? '-' : Math.round(y.nightShare * 100) + '%'} spend=${y.spend} skins=${y.skins?.total ?? '-'} top=${y.skins?.top.map(t => `${t.name}x${t.count}`).join(',') ?? ''}`,
    );
    for (const line of y.lines) {
      console.log('   ' + line);
    }
    for (const m of y.marks) {
      console.log(`   mark ${m.kind} ${d(m.from)}${m.to !== m.from ? '..' + d(m.to) : ''} "${m.label}"`);
    }
  }
}
