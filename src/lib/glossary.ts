// 用語集（/glossary）。原本はコンテンツ部の 02_content/12_用語集.json：
//   { "terms": [{ "term": "守護星", "reading": "しゅごせい", "body": "…", "related": ["guardian-and-ruler"] }] }
// 制作途中のことがあるので、無い・壊れている・項目が足りない場合はビルドを止めずに警告を出し、その用語を読み飛ばす
// （articles.ts と同じ流儀）。並びは reading の五十音順。各用語のアンカーは用語そのもの（/glossary#守護星）。

import { readJson, toParagraphs, type Parsed } from './articles';
import { GLOSSARY_JSON } from './paths';

export interface GlossaryTerm {
  term: string;
  /** ひらがな（五十音順の並びと、行の見出しに使う） */
  reading: string;
  /** 本文の段落 */
  paragraphs: string[];
  /** 関連する読みものの slug（ページ側で、実在する記事だけリンクにする） */
  related: string[];
  /** ページ内アンカー（#守護星） */
  anchor: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** カタカナをひらがなに（並び替え用） */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const ROWS: [string, string][] = [
  ['あ', 'あいうえおぁぃぅぇぉゔ'],
  ['か', 'かきくけこがぎぐげごゕゖ'],
  ['さ', 'さしすせそざじずぜぞ'],
  ['た', 'たちつてとだぢづでどっ'],
  ['な', 'なにぬねの'],
  ['は', 'はひふへほばびぶべぼぱぴぷぺぽ'],
  ['ま', 'まみむめも'],
  ['や', 'やゆよゃゅょ'],
  ['ら', 'らりるれろ'],
  ['わ', 'わをんゎ'],
];

/** 読みの頭の文字から行（あ・か・さ…）。かなで始まらなければ「英数」 */
export function kanaRow(reading: string): string {
  const c = toHiragana(reading.trim()).charAt(0);
  for (const [row, chars] of ROWS) if (chars.includes(c)) return `${row}行`;
  return '英数';
}

/** アンカー用の id（空白はハイフンに） */
export function termAnchor(term: string): string {
  return term.trim().replace(/\s+/g, '-');
}

const collator = new Intl.Collator('ja');

/** 読みの五十音順（同じ読みなら用語の順） */
export function compareTerms(a: Pick<GlossaryTerm, 'term' | 'reading'>, b: Pick<GlossaryTerm, 'term' | 'reading'>): number {
  return collator.compare(toHiragana(a.reading), toHiragana(b.reading)) || collator.compare(a.term, b.term);
}

/** 12_用語集.json（パース済み）を読む。term・body が無いもの、重複は読み飛ばす。reading が無ければ term で並べる */
export function parseGlossary(data: unknown, label = '12_用語集.json'): Parsed<GlossaryTerm[]> {
  const entries: GlossaryTerm[] = [];
  const warnings: string[] = [];
  const list = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.terms) ? data.terms : undefined;
  if (!list) {
    warnings.push(`${label}: terms が配列ではない`);
    return { entries, warnings };
  }
  list.forEach((t, i) => {
    const term = isRecord(t) ? str(t.term) : undefined;
    const body = isRecord(t) ? str(t.body) : undefined;
    if (!isRecord(t) || !term || !body) {
      warnings.push(`${label}: [${i}] に term / body がない（読み飛ばす）`);
      return;
    }
    if (entries.some((e) => e.term === term)) {
      warnings.push(`${label}: 用語「${term}」が重複している（最初のものを使う）`);
      return;
    }
    let reading = str(t.reading);
    if (!reading) {
      warnings.push(`${label}: ${term} に reading がない（用語で並べる）`);
      reading = term;
    }
    const related = Array.isArray(t.related) ? t.related.map(str).filter((r): r is string => r !== undefined) : [];
    entries.push({ term, reading: toHiragana(reading), paragraphs: toParagraphs(body), related, anchor: termAnchor(term) });
  });
  entries.sort(compareTerms);
  return { entries, warnings };
}

/** 行（あ行・か行…）ごとに分ける。並びは entries の順（五十音順） */
export function groupByRow(terms: GlossaryTerm[]): { row: string; terms: GlossaryTerm[] }[] {
  const groups: { row: string; terms: GlossaryTerm[] }[] = [];
  for (const t of terms) {
    const row = kanaRow(t.reading);
    const last = groups[groups.length - 1];
    if (last && last.row === row) last.terms.push(t);
    else groups.push({ row, terms: [t] });
  }
  return groups;
}

let cache: GlossaryTerm[] | undefined;

/** 用語集（五十音順）。無ければ空配列 */
export function getGlossary(): GlossaryTerm[] {
  if (cache) return cache;
  const { data, warning } = readJson(GLOSSARY_JSON, '12_用語集.json');
  if (warning) {
    console.warn(`[glossary] ${warning}`);
    cache = [];
    return cache;
  }
  const result = parseGlossary(data);
  for (const w of result.warnings) console.warn(`[glossary] ${w}`);
  console.info(`[glossary] 12_用語集.json から ${result.entries.length} 語を読み込みました`);
  cache = result.entries;
  return cache;
}
