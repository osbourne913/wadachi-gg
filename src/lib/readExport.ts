// Reads what the visitor dropped: the export zip, or JSON files taken out of it.
// Everything happens in memory in this tab. Nothing is uploaded.

import {strFromU8, unzipSync} from 'fflate';
import type {ExportFile} from './riot/types';

/** Refuse archives that expand past this, so a bad zip cannot freeze the tab. */
const MAX_TOTAL_BYTES = 800 * 1024 * 1024;
const MAX_FILE_BYTES = 300 * 1024 * 1024;

export class ReadError extends Error {}

function parse(path: string, text: string): {data: unknown; error?: string} {
  try {
    // Some exports start with a byte-order mark.
    return {data: JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)};
  } catch {
    return {data: undefined, error: `${path} をJSONとして読めませんでした`};
  }
}

// Loose JSON files have lost their folder; put the well-known ones back so the
// analysis can find them.
const HOMES: Record<string, string> = {
  'account_info.json': 'riotAccount',
  'atlas_login_event_uc.json': 'riotAccount',
  'account_audit_events_v1_uc.json': 'riotAccount',
  'account_audit_events_v2_uc.json': 'riotAccount',
  'penalty_history.json': 'penalties',
  'store_transactions_uc.json': 'leagueoflegends',
  'rp_purchase_history_uc.json': 'leagueoflegends',
  'grouped_reports.json': 'leagueoflegends',
  'summoner.json': 'leagueoflegends',
  'clash.json': 'leagueoflegends',
  'zendesk_tickets.json': 'zendesk',
};

function homeFor(name: string, data: unknown): string {
  const lower = name.toLowerCase();
  if (HOMES[lower]) {
    return `${HOMES[lower]}/${name}`;
  }
  if (typeof data === 'object' && data !== null && 'chat_logs' in data && 'game_id' in data) {
    return `leagueoflegends/chat_logs_v2_uc/successes/${name}`;
  }
  for (const game of ['valorant', 'wildrift', 'lor', '2xko', 'tft']) {
    if (lower.startsWith(`${game}_`)) {
      const folder = {valorant: 'valorant', wildrift: 'wildrift', lor: 'legendsofruneterra', '2xko': '2XKO', tft: 'teamfighttactics'}[game];
      return `${folder}/${name}`;
    }
  }
  return name;
}

function isZip(file: File): boolean {
  return /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

async function readZip(file: File): Promise<ExportFile[]> {
  let entries: Record<string, Uint8Array>;
  let total = 0;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    entries = unzipSync(bytes, {
      filter: entry => {
        if (entry.name.endsWith('/') || entry.name.startsWith('__MACOSX/')) {
          return false;
        }
        total += entry.originalSize;
        if (entry.originalSize > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES) {
          throw new ReadError('ファイルが大きすぎて、このブラウザでは開けません。');
        }
        return true;
      },
    });
  } catch (e) {
    if (e instanceof ReadError) {
      throw e;
    }
    throw new ReadError('zipを開けませんでした。Riotから届いたファイルをそのまま選んでください。');
  }
  const out: ExportFile[] = [];
  for (const [path, bytes] of Object.entries(entries)) {
    if (/\.json$/i.test(path)) {
      out.push({path, size: bytes.length, ...parse(path, strFromU8(bytes))});
    } else {
      out.push({path, size: bytes.length, data: undefined});
    }
  }
  return out;
}

/** Turn the dropped files into the list the analysis reads. */
export async function readExport(input: File | File[]): Promise<ExportFile[]> {
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) {
    throw new ReadError('ファイルが選ばれていません。');
  }
  const out: ExportFile[] = [];
  for (const file of list) {
    if (isZip(file)) {
      out.push(...(await readZip(file)));
    } else if (/\.json$/i.test(file.name)) {
      const parsed = parse(file.name, await file.text());
      out.push({path: homeFor(file.name, parsed.data), size: file.size, ...parsed});
    }
  }
  if (out.length === 0) {
    throw new ReadError('zip か JSON のファイルを選んでください。');
  }
  return out;
}
