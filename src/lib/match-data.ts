// 相性診断（D-019c）のデータをビルド時に組み立てる（サーバー側だけ。ファイルを読むため）。
// 相性ページ（/aisho/match/）は静的な1ページで、クエリ（?a=…&b=…）をブラウザで読んで表示するので、
// 必要なデータ（いきもの・星座の名前、早見表、13_相性診断.json）を JSON にしてページに埋め込む（gzip で十数KB）。
//
// 原本：
//   - いきもの同士：02_content/11_相性早見表.json（lib/aisho.ts）
//   - 星座同士・アドバイス・説明文：02_content/13_相性診断.json（コンテンツ部が作成中）
//       { signPairs: [{ a, b, relation, title, text }], relations: { key: { name, description } },
//         advice: { label: { friend, love, work } }, intro: { invite, waiting } }
//     signPairs は同じ星座同士を含めて 12×13/2＝78 組（a・b は順不同で読む）。advice のキーは早見表のラベル（pittari など）。
// 無い・壊れている・途中でもビルドを止めずに警告し、無い部分はページに出さない。

import { getAisho, type AishoTable } from './aisho';
import { readJson } from './articles';
import { getCharacters } from './characters';
import { signPairKey, typePairKey, type MatchAdvice, type MatchData } from './match';
import { MATCH_JSON } from './paths';
import { SIGNS } from './signs';
import type { TypeCharacter } from './types';

export const SIGN_PAIR_COUNT = (SIGNS.length * (SIGNS.length + 1)) / 2;

export type MatchContent = Pick<MatchData, 'signPairs' | 'relations' | 'advice' | 'intro'>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

const SIGN_IDS = new Set<string>(SIGNS.map((s) => s.id));

export function emptyMatchContent(): MatchContent {
  return { signPairs: {}, relations: {}, advice: {}, intro: {} };
}

/** 13_相性診断.json（パース済み）を読む。labelKeys は早見表のラベル（advice のキーの確認に使う） */
export function parseMatchContent(data: unknown, labelKeys: string[] = [], label = '13_相性診断.json'): { entries: MatchContent; warnings: string[] } {
  const warnings: string[] = [];
  const entries = emptyMatchContent();
  if (!isRecord(data)) {
    warnings.push(`${label}: オブジェクトではない`);
    return { entries, warnings };
  }

  if (isRecord(data.relations)) {
    for (const [key, v] of Object.entries(data.relations)) {
      if (key.startsWith('_')) continue;
      const name = isRecord(v) ? str(v.name) : str(v);
      if (!name) {
        warnings.push(`${label}: relations.${key} に name がない（読み飛ばす）`);
        continue;
      }
      entries.relations[key] = { name, description: isRecord(v) ? str(v.description) : undefined };
    }
  } else if (data.relations !== undefined) {
    warnings.push(`${label}: relations がオブジェクトではない`);
  }

  if (Array.isArray(data.signPairs)) {
    data.signPairs.forEach((p, i) => {
      const a = isRecord(p) ? str(p.a) : undefined;
      const b = isRecord(p) ? str(p.b) : undefined;
      if (!a || !b || !SIGN_IDS.has(a) || !SIGN_IDS.has(b)) {
        warnings.push(`${label}: signPairs[${i}] の a / b が不正（${String(a)} / ${String(b)}）`);
        return;
      }
      const text = str((p as Record<string, unknown>).text);
      if (!text) {
        warnings.push(`${label}: ${a}×${b} に text がない（読み飛ばす）`);
        return;
      }
      const key = signPairKey(a, b);
      if (entries.signPairs[key]) {
        warnings.push(`${label}: ${a}×${b} が重複している（最初のものを使う）`);
        return;
      }
      let relation = str((p as Record<string, unknown>).relation);
      if (relation && !entries.relations[relation]) {
        warnings.push(`${label}: ${a}×${b} の relation「${relation}」が relations に無い（関係の名前は出さない）`);
        relation = undefined;
      }
      entries.signPairs[key] = { relation, title: str((p as Record<string, unknown>).title), text };
    });
    const n = Object.keys(entries.signPairs).length;
    if (n < SIGN_PAIR_COUNT) warnings.push(`${label}: signPairs ${n}/${SIGN_PAIR_COUNT} 組（無い組み合わせは星座の相性を出さない）`);
  } else {
    warnings.push(`${label}: signPairs が配列ではない`);
  }

  if (isRecord(data.advice)) {
    for (const [key, v] of Object.entries(data.advice)) {
      if (key.startsWith('_')) continue;
      if (labelKeys.length > 0 && !labelKeys.includes(key)) warnings.push(`${label}: advice.${key} は早見表のラベルに無い`);
      if (!isRecord(v)) {
        warnings.push(`${label}: advice.${key} がオブジェクトではない`);
        continue;
      }
      const a: MatchAdvice = { friend: str(v.friend), love: str(v.love), work: str(v.work) };
      if (!a.friend && !a.love && !a.work) {
        warnings.push(`${label}: advice.${key} に friend / love / work がない`);
        continue;
      }
      entries.advice[key] = a;
    }
    for (const k of labelKeys) if (!entries.advice[k]) warnings.push(`${label}: advice.${k} が無い（アドバイスは出さない）`);
  } else {
    warnings.push(`${label}: advice がオブジェクトではない`);
  }

  if (isRecord(data.intro)) {
    entries.intro = { invite: str(data.intro.invite), waiting: str(data.intro.waiting) };
  }
  return { entries, warnings };
}

/** ページに埋め込むデータを組み立てる（テスト用に公開） */
export function buildMatchData(characters: TypeCharacter[], table: AishoTable, content: MatchContent): MatchData {
  return {
    types: Object.fromEntries(characters.map((c) => [c.slug, { name: c.name, main: c.theme.main, sub: c.theme.sub }])),
    signs: Object.fromEntries(SIGNS.map((s) => [s.id, s.name])),
    labels: Object.fromEntries(table.labels.map((l) => [l.key, { name: l.name, icon: l.icon, description: l.description, color: l.color }])),
    pairs: Object.fromEntries(table.pairs.map((p) => [typePairKey(p.a, p.b), { label: p.label, text: p.text }])),
    ...content,
  };
}

let contentCache: MatchContent | undefined;

/** 13_相性診断.json。無ければ空 */
export function getMatchContent(): MatchContent {
  if (contentCache) return contentCache;
  const { data, warning } = readJson(MATCH_JSON, '13_相性診断.json');
  if (warning) {
    console.warn(`[match] ${warning.replace('本文なしで表示する', '星座の相性・アドバイスは出さない')}`);
    contentCache = emptyMatchContent();
    return contentCache;
  }
  const result = parseMatchContent(data, getAisho().labels.map((l) => l.key));
  for (const w of result.warnings) console.warn(`[match] ${w}`);
  const e = result.entries;
  console.info(
    `[match] 13_相性診断.json から 星座の組み合わせ ${Object.keys(e.signPairs).length}/${SIGN_PAIR_COUNT}、関係 ${Object.keys(e.relations).length} 種、アドバイス ${Object.keys(e.advice).length} 種を読み込みました`,
  );
  contentCache = e;
  return contentCache;
}

let dataCache: MatchData | undefined;

/** 相性ページ・招待ページに埋め込むデータ */
export function getMatchData(): MatchData {
  dataCache ??= buildMatchData(getCharacters(), getAisho(), getMatchContent());
  return dataCache;
}
