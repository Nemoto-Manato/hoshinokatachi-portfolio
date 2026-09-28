// 解説ページの本文（タイプ解説・星座解説・読みもの）をビルド時に読み込む。サーバー側でだけ使う（ファイルを読むため）。
//   - タイプ解説：02_content/07_タイプ解説.json  { slug: { sections: [{ heading, body }] } }
//   - 星座解説：02_content/08_星座解説.json     { signId: { sections: [...] } }
//   - 読みもの：02_content/09_読みもの*.json    [{ slug, title, description, sections }]
//     （09_読みもの.json、09_読みもの_b.json … をすべて読み、ファイル名の順につなげる。slug の重複はビルドを止める）
// 制作途中のことがあるので、無い・壊れている・項目が足りない場合はビルドを止めずに警告を出し、
// 本文なし（今までの表示のまま）にする。characters.ts・content.ts と同じ流儀。
// body は改行で段落に分ける（空行は無視）。

import fs from 'node:fs';
import path from 'node:path';
import { SIGNS } from './signs';
import { TYPES } from './types';
import { COLUMN_FILE_PATTERN, CONTENT_DIR, SIGN_ARTICLES_JSON, TYPE_ARTICLES_JSON } from './paths';

export interface ArticleSection {
  heading: string;
  /** 段落（body を改行で分けたもの） */
  paragraphs: string[];
}

export interface Column {
  slug: string;
  title: string;
  description: string;
  sections: ArticleSection[];
}

export interface Parsed<T> {
  entries: T;
  warnings: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** body を段落に分ける */
export function toParagraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

/** sections を読む。見出しか本文が無いものは読み飛ばす */
export function parseSections(v: unknown, where: string, warnings: string[]): ArticleSection[] {
  if (!Array.isArray(v)) {
    warnings.push(`${where}: sections が配列ではない`);
    return [];
  }
  const sections: ArticleSection[] = [];
  v.forEach((s, i) => {
    const heading = isRecord(s) ? str(s.heading) : undefined;
    const body = isRecord(s) ? str(s.body) : undefined;
    if (!heading || !body) {
      warnings.push(`${where}: sections[${i}] に heading / body がない（読み飛ばす）`);
      return;
    }
    sections.push({ heading, paragraphs: toParagraphs(body) });
  });
  return sections;
}

/** { key: { sections } } の形を読む（タイプ解説・星座解説）。validKeys にない key は警告して読み飛ばす */
export function parseSectionsByKey(data: unknown, validKeys: string[], label: string): Parsed<Map<string, ArticleSection[]>> {
  const entries = new Map<string, ArticleSection[]>();
  const warnings: string[] = [];
  if (!isRecord(data)) {
    warnings.push(`${label}: オブジェクトではない`);
    return { entries, warnings };
  }
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_') || key.startsWith('$')) continue; // _note など
    if (!validKeys.includes(key)) {
      warnings.push(`${label}: 不明なキー「${key}」`);
      continue;
    }
    const sections = parseSections(isRecord(value) ? value.sections : undefined, `${label} ${key}`, warnings);
    if (sections.length > 0) entries.set(key, sections);
  }
  for (const key of validKeys) {
    if (!entries.has(key)) warnings.push(`${label}: ${key} の本文がない（本文なしで表示する）`);
  }
  return { entries, warnings };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 読みものの slug の重複（URL がぶつかるので、ビルドを止める） */
export class DuplicateSlugError extends Error {
  constructor(slug: string, files: string[]) {
    super(`読みものの slug「${slug}」が重複しています（${files.join('、')}）。どちらかの slug を変えてください`);
    this.name = 'DuplicateSlugError';
  }
}

/** 読みもの（配列）を読む。slug が不正、title・sections が無いものは読み飛ばす。slug の重複は DuplicateSlugError */
export function parseColumns(data: unknown, label = '09_読みもの.json'): Parsed<Column[]> {
  const entries: Column[] = [];
  const warnings: string[] = [];
  const list = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.columns) ? data.columns : undefined;
  if (!list) {
    warnings.push(`${label}: 配列ではない`);
    return { entries, warnings };
  }
  list.forEach((c, i) => {
    const slug = isRecord(c) ? str(c.slug) : undefined;
    const title = isRecord(c) ? str(c.title) : undefined;
    if (!isRecord(c) || !slug || !SLUG.test(slug) || !title) {
      warnings.push(`${label}: [${i}] の slug（半角英小文字・数字・ハイフン）か title が不正（読み飛ばす）`);
      return;
    }
    if (entries.some((e) => e.slug === slug)) throw new DuplicateSlugError(slug, [label]);
    const sections = parseSections(c.sections, `${label} ${slug}`, warnings);
    if (sections.length === 0) {
      warnings.push(`${label}: ${slug} に本文がない（読み飛ばす）`);
      return;
    }
    const description = str(c.description) ?? sections[0].paragraphs[0].slice(0, 100);
    entries.push({ slug, title, description, sections });
  });
  return { entries, warnings };
}

/** 本文の文字数（見出しと段落。空白を除く） */
export function countChars(sections: ArticleSection[]): number {
  return sections.reduce((n, s) => n + (s.heading + s.paragraphs.join('')).replace(/\s/g, '').length, 0);
}

// ---- ファイルから読む（キャッシュする） ----

/** JSON を読む。無い・壊れているときは warning（ビルドは止めない） */
export function readJson(file: string, label: string): { data?: unknown; warning?: string } {
  if (!fs.existsSync(file)) return { warning: `${label}: ${file} がない（本文なしで表示する）` };
  try {
    return { data: JSON.parse(fs.readFileSync(file, 'utf-8')) };
  } catch (e) {
    return { warning: `${label}: JSONとして読めない（${(e as Error).message}）` };
  }
}

function load<T>(file: string, label: string, parse: (data: unknown) => Parsed<T>, empty: T, count: (t: T) => number): T {
  const { data, warning } = readJson(file, label);
  if (warning) {
    console.warn(`[articles] ${warning}`);
    return empty;
  }
  const result = parse(data);
  for (const w of result.warnings) console.warn(`[articles] ${w}`);
  console.info(`[articles] ${label} から ${count(result.entries)} 件の本文を読み込みました`);
  return result.entries;
}

let typeCache: Map<string, ArticleSection[]> | undefined;
let signCache: Map<string, ArticleSection[]> | undefined;
let columnCache: Column[] | undefined;

/** タイプ解説の本文。無ければ空配列 */
export function getTypeArticle(slug: string): ArticleSection[] {
  typeCache ??= load(TYPE_ARTICLES_JSON, '07_タイプ解説.json', (d) => parseSectionsByKey(d, TYPES.map((t) => t.slug), '07_タイプ解説.json'), new Map(), (m) => m.size);
  return typeCache.get(slug) ?? [];
}

/** 星座解説の本文。無ければ空配列 */
export function getSignArticle(id: string): ArticleSection[] {
  signCache ??= load(SIGN_ARTICLES_JSON, '08_星座解説.json', (d) => parseSectionsByKey(d, SIGNS.map((s) => s.id), '08_星座解説.json'), new Map(), (m) => m.size);
  return signCache.get(id) ?? [];
}

/** 読みもののファイル名の並び：09_読みもの.json を先に、あとはファイル名の順 */
export function sortColumnFiles(names: string[]): string[] {
  return names.filter((n) => COLUMN_FILE_PATTERN.test(n)).sort((a, b) => a.length - b.length || a.localeCompare(b));
}

/** 複数ファイルの読みものをつなげる。ファイルをまたいだ slug の重複は DuplicateSlugError */
export function mergeColumnFiles(files: { label: string; data: unknown }[]): Parsed<Column[]> {
  const entries: Column[] = [];
  const warnings: string[] = [];
  const from = new Map<string, string>();
  for (const { label, data } of files) {
    const r = parseColumns(data, label);
    warnings.push(...r.warnings);
    for (const c of r.entries) {
      const prev = from.get(c.slug);
      if (prev) throw new DuplicateSlugError(c.slug, [prev, label]);
      from.set(c.slug, label);
      entries.push(c);
    }
  }
  return { entries, warnings };
}

/** 読みもの（09_読みもの*.json をファイル名の順につなげたもの）。無ければ空配列 */
export function getColumns(): Column[] {
  if (columnCache) return columnCache;
  const names = fs.existsSync(CONTENT_DIR) ? sortColumnFiles(fs.readdirSync(CONTENT_DIR)) : [];
  const files: { label: string; data: unknown }[] = [];
  for (const name of names) {
    const { data, warning } = readJson(path.join(CONTENT_DIR, name), name);
    if (warning) console.warn(`[articles] ${warning}`);
    else files.push({ label: name, data });
  }
  if (files.length === 0) console.warn('[articles] 09_読みもの*.json がない（読みものなし）');
  const result = mergeColumnFiles(files);
  for (const w of result.warnings) console.warn(`[articles] ${w}`);
  console.info(`[articles] ${files.map((f) => f.label).join('・') || '09_読みもの*.json'} から ${result.entries.length} 件の読みものを読み込みました`);
  columnCache = result.entries;
  return columnCache;
}
