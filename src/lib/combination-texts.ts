// 組み合わせごとの文言（コンテンツ部の 02_content/combinations/{typeSlug}.json）をビルド時に読み込む。
// 形式は 02_content/tools/validate_combinations.py を参照。文字数や表現のチェックはそちらで行い、
// ここでは「ページを作るのに必要な項目がそろっているか」だけを見る。
// 制作途中のファイルでビルドを止めないよう、不正なファイルや項目は警告を出して読み飛ばす（その組み合わせは「制作中」になる）。

import fs from 'node:fs';
import path from 'node:path';
import { combinationSlug } from './combination';
import { getSign, type Sign } from './signs';
import { getTypeBySlug, type PersonalityType } from './types';

/** 相性のいい組み合わせ（相性TOP3の1件） */
export interface CompatibleMatch {
  slug: string;
  typeSlug: string;
  signId: string;
  /** 表示名。ビルドでは「しし座の いきもの8」（content.ts が labelOf を渡す） */
  label: string;
  reason: string;
}

/** 相性の相手の表示名を作る関数。省略時は「しし座の 彗星」（守護星の名前） */
export type LabelOf = (type: PersonalityType, sign: Sign) => string;
const defaultLabel: LabelOf = (type, sign) => `${sign.name}の ${type.guardian}`;

export interface CombinationText {
  /** 無料部分 */
  nickname: string;
  hitokoto: string;
  basic: string;
  /** 広告部分 */
  love: string;
  work: string;
  relationships: string;
  compatible: CompatibleMatch[];
  growth: string;
}

export interface ParseResult {
  /** 組み合わせのslug（例：comet-leo）→ 文言 */
  texts: Map<string, CombinationText>;
  warnings: string[];
}

const TEXT_FIELDS = ['nickname', 'hitokoto', 'basic', 'love', 'work', 'relationships', 'growth'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** 1ファイル分のJSON（パース済み）を文言に変換する。fileName は警告の表示と、type との照合に使う。 */
export function parseCombinationFile(data: unknown, fileName: string, labelOf: LabelOf = defaultLabel): ParseResult {
  const texts = new Map<string, CombinationText>();
  const warnings: string[] = [];
  const warn = (msg: string) => warnings.push(`${fileName}: ${msg}`);

  if (!isRecord(data)) {
    warn('JSONの中身がオブジェクトではない');
    return { texts, warnings };
  }
  const type = typeof data.type === 'string' ? getTypeBySlug(data.type) : undefined;
  if (!type) {
    warn(`type が不正「${String(data.type)}」`);
    return { texts, warnings };
  }
  if (path.basename(fileName, '.json') !== type.slug) {
    warn(`ファイル名と type「${type.slug}」が一致しない`);
    return { texts, warnings };
  }
  if (!Array.isArray(data.combinations)) {
    warn('combinations が配列ではない');
    return { texts, warnings };
  }

  for (const entry of data.combinations) {
    if (!isRecord(entry)) {
      warn('combinations にオブジェクトでない要素がある');
      continue;
    }
    const sign = typeof entry.sign === 'string' ? getSign(entry.sign) : undefined;
    if (!sign) {
      warn(`sign が不正「${String(entry.sign)}」`);
      continue;
    }
    const where = `${type.slug}×${sign.id}`;
    const slug = combinationSlug(type.slug, sign.id);
    if (texts.has(slug)) {
      warn(`${where} が重複している（最初のものを使う）`);
      continue;
    }

    const fields: Partial<Record<(typeof TEXT_FIELDS)[number], string>> = {};
    const missing: string[] = [];
    for (const f of TEXT_FIELDS) {
      const v = text(entry[f]);
      if (v === undefined) missing.push(f);
      else fields[f] = v;
    }
    if (missing.length > 0) {
      warn(`${where} に ${missing.join(', ')} がない（制作中として扱う）`);
      continue;
    }

    const compatible: CompatibleMatch[] = [];
    for (const m of Array.isArray(entry.compatible) ? entry.compatible : []) {
      const mType = isRecord(m) && typeof m.type === 'string' ? getTypeBySlug(m.type) : undefined;
      const mSign = isRecord(m) && typeof m.sign === 'string' ? getSign(m.sign) : undefined;
      const reason = isRecord(m) ? text(m.reason) : undefined;
      if (!mType || !mSign || !reason) {
        warn(`${where} の compatible に不正な要素がある（読み飛ばす）`);
        continue;
      }
      compatible.push({ slug: combinationSlug(mType.slug, mSign.id), typeSlug: mType.slug, signId: mSign.id, label: labelOf(mType, mSign), reason });
    }
    if (compatible.length !== 3) warn(`${where} の compatible が ${compatible.length} 件（3件の想定）`);

    texts.set(slug, { ...(fields as Required<typeof fields>), compatible });
  }
  return { texts, warnings };
}

/** ディレクトリ内の *.json をすべて読み込む。ディレクトリがなければ空。 */
export function loadCombinationTexts(dir: string, labelOf: LabelOf = defaultLabel): ParseResult {
  const texts = new Map<string, CombinationText>();
  const warnings: string[] = [];
  if (!fs.existsSync(dir)) return { texts, warnings: [`${dir} がない（すべて制作中として扱う）`] };

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    } catch (e) {
      warnings.push(`${file}: JSONとして読めない（${(e as Error).message}）`);
      continue;
    }
    const result = parseCombinationFile(data, file, labelOf);
    for (const [slug, t] of result.texts) texts.set(slug, t);
    warnings.push(...result.warnings);
  }
  return { texts, warnings };
}
