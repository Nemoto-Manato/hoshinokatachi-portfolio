// 16タイプのキャラクター（星のいきもの、D-011）をビルド時に組み立てる。サーバー側でだけ使う（ファイルを読むため）。
//   - キャラ名・動物・コンセプト・あるある：コンテンツ部の 02_content/06_キャラクター.json
//   - テーマカラー：デザイン部の 03_design/assets/theme-colors.json
// どちらも制作途中のことがあるので、無い・壊れている・項目が足りない場合はビルドを止めずに警告を出し、
// 開発部の仮の値（このファイルの PLACEHOLDER_ARUARU / FALLBACK_THEME）を使う。
// 組み合わせ文言（combination-texts.ts / content.ts）と同じ流儀。

import fs from 'node:fs';
import { CHARACTERS_JSON, THEME_COLORS_JSON, TYPE_SUMMARY_MD } from './paths';
import { TYPES, type PersonalityType, type ThemeColor, type TypeCharacter } from './types';

/** あるあるの数 */
export const ARUARU_COUNT = 3;

/**
 * 仮のあるある（コンテンツ部の原本がそろうまでの代わり）。原本に3つそろったタイプは原本を使う。
 * （公開用リポジトリではダミーの文に置き換えている）
 */
export const PLACEHOLDER_ARUARU: Record<string, string[]> = {
  polaris: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  nebula: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  sun: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  uranus: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  neptune: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  'milky-way': ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  'first-star': ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  comet: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  saturn: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  moon: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  jupiter: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  venus: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  mercury: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  aurora: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  mars: ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
  'meteor-shower': ['サンプルのあるある1', 'サンプルのあるある2', 'サンプルのあるある3'],
};

/** 仮のテーマカラー（デザイン部の theme-colors.json がそろうまでの代わり）。夜空パステルに合う明るめの色 */
export const FALLBACK_THEME: Record<string, string> = {
  polaris: '#9fb4ff',
  nebula: '#c3a6ff',
  sun: '#ffc46b',
  uranus: '#7fe3e0',
  neptune: '#6fa8ff',
  'milky-way': '#e3b8ff',
  'first-star': '#ffe58f',
  comet: '#ff9fc6',
  saturn: '#e0bf94',
  moon: '#dcd8ff',
  jupiter: '#f2a97c',
  venus: '#ffb3c7',
  mercury: '#9fe0c8',
  aurora: '#a8f0b0',
  mars: '#ff8f80',
  'meteor-shower': '#c6f07a',
};

/** 夜空の色（Base.astro の --night-deep）。テーマカラーの dark を作るときに混ぜる */
const NIGHT_DEEP = '#11142a';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(c: string): string {
  const h = c.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}

/** 2色を混ぜる（t=0 で a、t=1 で b） */
export function mixHex(a: string, b: string, t: number): string {
  const pa = normalizeHex(a);
  const pb = normalizeHex(b);
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(ch(pa, i) * (1 - t) + ch(pb, i) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** main から sub / ink / dark を補う */
export function themeFromMain(main: string, sub?: string, ink?: string): ThemeColor {
  const m = normalizeHex(main);
  return {
    main: m,
    sub: sub ? normalizeHex(sub) : mixHex(m, '#ffffff', 0.55),
    ink: ink ? normalizeHex(ink) : NIGHT_DEEP,
    dark: mixHex(m, NIGHT_DEEP, 0.72),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}
function color(v: unknown): string | undefined {
  const s = str(v);
  return s && HEX.test(s) ? s : undefined;
}

// ---- 02_content/06_キャラクター.json ----

export interface CharacterEntry {
  name: string;
  animal: string;
  concept?: string;
  /** 3つそろっているときだけ入る */
  aruaru?: string[];
}

export interface Parsed<T> {
  entries: Map<string, T>;
  warnings: string[];
}

/** 06_キャラクター.json（パース済み）を slug → キャラクターにする */
export function parseCharactersFile(data: unknown): Parsed<CharacterEntry> {
  const entries = new Map<string, CharacterEntry>();
  const warnings: string[] = [];
  const list = isRecord(data) ? data.characters : undefined;
  if (!Array.isArray(list)) {
    warnings.push('characters が配列ではない');
    return { entries, warnings };
  }
  for (const c of list) {
    const slug = isRecord(c) ? str(c.slug) : undefined;
    const type = slug ? TYPES.find((t) => t.slug === slug) : undefined;
    if (!isRecord(c) || !type) {
      warnings.push(`slug が不正「${isRecord(c) ? String(c.slug) : '?'}」`);
      continue;
    }
    if (entries.has(type.slug)) {
      warnings.push(`${type.slug} が重複している（最初のものを使う）`);
      continue;
    }
    if (c.code !== undefined && c.code !== type.code) warnings.push(`${type.slug} の code「${String(c.code)}」が ${type.code} と一致しない`);
    if (c.guardian !== undefined && c.guardian !== type.guardian) warnings.push(`${type.slug} の guardian「${String(c.guardian)}」が ${type.guardian} と一致しない`);
    const name = str(c.name);
    const animal = str(c.animal);
    if (!name || !animal) {
      warnings.push(`${type.slug} に name / animal がない`);
      continue;
    }
    const aruaruRaw = Array.isArray(c.aruaru) ? c.aruaru.map(str).filter((a): a is string => a !== undefined) : [];
    let aruaru: string[] | undefined;
    if (aruaruRaw.length >= ARUARU_COUNT) {
      aruaru = aruaruRaw.slice(0, ARUARU_COUNT);
      if (aruaruRaw.length > ARUARU_COUNT) warnings.push(`${type.slug} の aruaru が ${aruaruRaw.length} 件（先頭の${ARUARU_COUNT}件を使う）`);
    } else {
      warnings.push(`${type.slug} の aruaru が ${aruaruRaw.length}/${ARUARU_COUNT} 件（仮のあるあるを使う）`);
    }
    entries.set(type.slug, { name, animal, concept: str(c.concept), aruaru });
  }
  return { entries, warnings };
}

// ---- 03_design/assets/theme-colors.json ----

// デザイン部の形式は { main, sub, ink }（2026-09-27 に確認）。ほかの名前でも読めるようにしておく。
const MAIN_KEYS = ['main', 'primary', 'color', 'base', 'accent', 'theme'];
const SUB_KEYS = ['sub', 'light', 'secondary', 'highlight'];
const INK_KEYS = ['ink', 'text', 'onMain', 'on'];

function pick(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const c = color(o[k]);
    if (c) return c;
  }
  return undefined;
}

/**
 * theme-colors.json（パース済み）を slug → テーマカラーにする。形式が決まる前なので、次のどれでも読む：
 *   { "polaris": "#9fb4ff" }
 *   { "polaris": { "main": "#…", "sub": "#…", "ink": "#…" } }（デザイン部の形式。sub・ink は省略可）
 *   { "colors" | "types" | "themes": 上のどちらか、または [{ "slug": "polaris", "main": "#…" }] }
 */
export function parseThemeColorsFile(data: unknown): Parsed<ThemeColor> {
  const entries = new Map<string, ThemeColor>();
  const warnings: string[] = [];
  let root: unknown = data;
  if (isRecord(root)) {
    for (const k of ['colors', 'types', 'themes', 'characters']) {
      if (root[k] !== undefined && (isRecord(root[k]) || Array.isArray(root[k]))) {
        root = root[k];
        break;
      }
    }
  }
  const pairs: [string, unknown][] = Array.isArray(root)
    ? root.map((v) => [isRecord(v) ? String(v.slug ?? v.type ?? '') : '', v])
    : isRecord(root)
      ? Object.entries(root)
      : [];
  if (pairs.length === 0) warnings.push('テーマカラーが読み取れない形式');
  for (const [slug, v] of pairs) {
    if (slug.startsWith('_') || slug.startsWith('$')) continue; // _note など
    if (!TYPES.some((t) => t.slug === slug)) {
      warnings.push(`不明な slug「${slug}」`);
      continue;
    }
    const main = color(v) ?? (isRecord(v) ? pick(v, MAIN_KEYS) : undefined);
    if (!main) {
      warnings.push(`${slug} の色が読み取れない（#rrggbb の形で書く）`);
      continue;
    }
    entries.set(slug, isRecord(v) ? themeFromMain(main, pick(v, SUB_KEYS), pick(v, INK_KEYS)) : themeFromMain(main));
  }
  return { entries, warnings };
}

// ---- 02_content/05_タイプ概要_draft.md ----

/**
 * タイプ概要文の Markdown から、4文字コード → 概要文 を取り出す。
 * 形式：「### いきもの1（INTJ）― 守護星：北極星」の見出しの次の、空行までの段落（複数行はつなげる）。
 */
export function parseSummaryMarkdown(md: string): Parsed<string> {
  const entries = new Map<string, string>();
  const warnings: string[] = [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^###\s+.*?[（(]([EI][NS][TF][JP])[）)]/.exec(lines[i]);
    if (!m) continue;
    const code = m[1];
    const body: string[] = [];
    for (let j = i + 1; j < lines.length && !lines[j].startsWith('#'); j++) {
      const l = lines[j].trim();
      if (l === '' || l === '---') {
        if (body.length > 0) break;
        continue;
      }
      body.push(l);
    }
    if (body.length === 0) warnings.push(`${code} の概要文が空`);
    else if (entries.has(code)) warnings.push(`${code} が重複している（最初のものを使う）`);
    else entries.set(code, body.join(''));
  }
  return { entries, warnings };
}

// ---- まとめる ----

function readJson(file: string, label: string, warnings: string[]): unknown {
  if (!fs.existsSync(file)) {
    warnings.push(`${label}: ${file} がない（仮の値を使う）`);
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    warnings.push(`${label}: JSONとして読めない（${(e as Error).message}）`);
    return undefined;
  }
}

function readText(file: string, label: string, warnings: string[]): string | undefined {
  if (!fs.existsSync(file)) {
    warnings.push(`${label}: ${file} がない（旧い概要文を使う）`);
    return undefined;
  }
  return fs.readFileSync(file, 'utf-8');
}

export interface CharacterSources {
  characters?: unknown;
  themeColors?: unknown;
  /** 05_タイプ概要_draft.md の中身（無ければ types.ts の旧い概要文を使う） */
  summaries?: string;
}

export interface BuildResult {
  characters: TypeCharacter[];
  warnings: string[];
  /** 原本のあるあるを使えたタイプ数、原本のテーマカラーを使えたタイプ数 */
  stats: { names: number; aruaru: number; themes: number; summaries: number };
}

/** タイプとキャラクター・テーマカラーの原本を合わせる（テスト用に公開） */
export function buildCharacters(sources: CharacterSources, baseWarnings: string[] = []): BuildResult {
  const warnings = [...baseWarnings];
  const chars = sources.characters === undefined ? undefined : parseCharactersFile(sources.characters);
  const themes = sources.themeColors === undefined ? undefined : parseThemeColorsFile(sources.themeColors);
  warnings.push(...(chars?.warnings.map((w) => `06_キャラクター.json: ${w}`) ?? []));
  warnings.push(...(themes?.warnings.map((w) => `theme-colors.json: ${w}`) ?? []));
  const summaries = sources.summaries === undefined ? undefined : parseSummaryMarkdown(sources.summaries);
  warnings.push(...(summaries?.warnings.map((w) => `05_タイプ概要_draft.md: ${w}`) ?? []));
  const stats = { names: 0, aruaru: 0, themes: 0, summaries: 0 };

  const characters = TYPES.map((t: PersonalityType): TypeCharacter => {
    const c = chars?.entries.get(t.slug);
    const theme = themes?.entries.get(t.slug);
    if (!c) warnings.push(`06_キャラクター.json: ${t.slug} が無い（仮に「${t.guardian}」を名前にする）`);
    if (themes && !theme) warnings.push(`theme-colors.json: ${t.slug} が無い（仮の色を使う）`);
    if (c) stats.names++;
    if (c?.aruaru) stats.aruaru++;
    if (theme) stats.themes++;
    const summary = summaries?.entries.get(t.code);
    if (summaries && !summary) warnings.push(`05_タイプ概要_draft.md: ${t.code} が無い（旧い概要文を使う）`);
    if (summary) stats.summaries++;
    return {
      ...t,
      summary: summary ?? t.summary,
      name: c?.name ?? t.guardian,
      animal: c?.animal ?? '',
      concept: c?.concept ?? t.catchphrase,
      aruaru: c?.aruaru ?? PLACEHOLDER_ARUARU[t.slug],
      aruaruPlaceholder: !c?.aruaru,
      theme: theme ?? themeFromMain(FALLBACK_THEME[t.slug]),
    };
  });
  return { characters, warnings, stats };
}

let cache: Map<string, TypeCharacter> | undefined;

function all(): Map<string, TypeCharacter> {
  if (!cache) {
    const warnings: string[] = [];
    const result = buildCharacters(
      {
        characters: readJson(CHARACTERS_JSON, '06_キャラクター.json', warnings),
        themeColors: readJson(THEME_COLORS_JSON, 'theme-colors.json', warnings),
        summaries: readText(TYPE_SUMMARY_MD, '05_タイプ概要_draft.md', warnings),
      },
      warnings,
    );
    for (const w of result.warnings) console.warn(`[characters] ${w}`);
    const { names, aruaru, themes, summaries } = result.stats;
    console.info(`[characters] キャラ名 ${names}/16、あるある ${aruaru}/16、テーマカラー ${themes}/16、概要文 ${summaries}/16 を原本から読み込みました`);
    cache = new Map(result.characters.map((c) => [c.slug, c]));
  }
  return cache;
}

/** 16タイプ＋キャラクター（TYPES と同じ順） */
export function getCharacters(): TypeCharacter[] {
  return [...all().values()];
}

/** slug からキャラクター。無い slug は例外（ページの生成は TYPES の slug だけで行うので、起きたらバグ） */
export function getCharacter(slug: string): TypeCharacter {
  const c = all().get(slug);
  if (!c) throw new Error(`不明なタイプ: ${slug}`);
  return c;
}

/** 結果のタイトル：「しし座の いきもの3」 */
export function resultTitle(character: Pick<TypeCharacter, 'name'>, signName: string): string {
  return `${signName}の ${character.name}`;
}
