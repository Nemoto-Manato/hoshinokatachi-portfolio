// いきもの図鑑（/type/{slug} の「図鑑」ブロックと /zukan）。原本はコンテンツ部の 02_content/10_図鑑.json：
//   { slug: { habitat, likes: [3], dislikes: [3], kuchiguse, recovery, buddy: { slug, reason }, trivia } }
// 制作途中のことがあるので、無い・壊れている・項目が足りない場合はビルドを止めずに警告を出す。
// 足りない項目は表示しない（そのいきものの項目が1つも無ければ図鑑ブロックごと出さない）。
// 表情違いの画像（public/characters/alt/{slug}.svg。npm run sync-assets がデザイン部の characters-v2/alt/ からコピー）は、
// あるときだけ図鑑ブロックに出す。

import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './articles';
import { CHARACTERS_ALT_DIR, ZUKAN_JSON } from './paths';
import { TYPES } from './types';

export interface ZukanEntry {
  /** すみか */
  habitat?: string;
  /** 好きなもの */
  likes: string[];
  /** 苦手なもの */
  dislikes: string[];
  /** 口ぐせ */
  kuchiguse?: string;
  /** 落ち込んだときの回復法 */
  recovery?: string;
  /** 相棒のいきもの */
  buddy?: { slug: string; reason?: string };
  /** 豆知識 */
  trivia?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}
function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter((s): s is string => s !== undefined) : [];
}

const SLUGS = TYPES.map((t) => t.slug);

/** 表示できる項目があるか */
export function hasZukanContent(e: ZukanEntry | undefined): e is ZukanEntry {
  return !!e && !!(e.habitat || e.likes.length || e.dislikes.length || e.kuchiguse || e.recovery || e.buddy || e.trivia);
}

/** 10_図鑑.json（パース済み）を slug → 図鑑にする */
export function parseZukan(data: unknown, label = '10_図鑑.json'): { entries: Map<string, ZukanEntry>; warnings: string[] } {
  const entries = new Map<string, ZukanEntry>();
  const warnings: string[] = [];
  if (!isRecord(data)) {
    warnings.push(`${label}: オブジェクトではない`);
    return { entries, warnings };
  }
  for (const [slug, v] of Object.entries(data)) {
    if (slug.startsWith('_') || slug.startsWith('$')) continue;
    if (!SLUGS.includes(slug)) {
      warnings.push(`${label}: 不明な slug「${slug}」`);
      continue;
    }
    if (!isRecord(v)) {
      warnings.push(`${label}: ${slug} がオブジェクトではない`);
      continue;
    }
    const e: ZukanEntry = {
      habitat: str(v.habitat),
      likes: strList(v.likes),
      dislikes: strList(v.dislikes),
      kuchiguse: str(v.kuchiguse),
      recovery: str(v.recovery),
      trivia: str(v.trivia),
    };
    if (isRecord(v.buddy)) {
      const b = str(v.buddy.slug);
      if (b && SLUGS.includes(b) && b !== slug) e.buddy = { slug: b, reason: str(v.buddy.reason) };
      else warnings.push(`${label}: ${slug} の buddy.slug「${String(v.buddy.slug)}」が不正（相棒を出さない）`);
    }
    const missing: string[] = (['habitat', 'kuchiguse', 'recovery', 'trivia'] as const).filter((k) => !e[k]);
    if (!e.buddy) missing.push('buddy');
    if (e.likes.length === 0) missing.push('likes');
    if (e.dislikes.length === 0) missing.push('dislikes');
    if (missing.length > 0) warnings.push(`${label}: ${slug} に ${missing.join('・')} がない（その項目は出さない）`);
    if (hasZukanContent(e)) entries.set(slug, e);
  }
  for (const slug of SLUGS) if (!entries.has(slug)) warnings.push(`${label}: ${slug} がない（図鑑ブロックを出さない）`);
  return { entries, warnings };
}

let cache: Map<string, ZukanEntry> | undefined;

function all(): Map<string, ZukanEntry> {
  if (cache) return cache;
  const { data, warning } = readJson(ZUKAN_JSON, '10_図鑑.json');
  if (warning) {
    console.warn(`[zukan] ${warning}`);
    cache = new Map();
    return cache;
  }
  const result = parseZukan(data);
  for (const w of result.warnings) console.warn(`[zukan] ${w}`);
  console.info(`[zukan] 10_図鑑.json から ${result.entries.size}/16 体の図鑑を読み込みました`);
  cache = result.entries;
  return cache;
}

/** そのいきものの図鑑。無ければ undefined */
export function getZukan(slug: string): ZukanEntry | undefined {
  return all().get(slug);
}

/** 表情違いの画像の URL。public/characters/alt/{slug}.svg が無ければ undefined */
export function altCharacterSrc(slug: string, dir = CHARACTERS_ALT_DIR): string | undefined {
  return fs.existsSync(path.join(dir, `${slug}.svg`)) ? `/characters/alt/${slug}.svg` : undefined;
}
