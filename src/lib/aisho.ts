// 16いきもの相性早見表（/aisho）。原本はコンテンツ部の 02_content/11_相性早見表.json：
//   { "labels": { key: { name, icon, description, color? } }, "pairs": [{ a, b, label, text }] }
// pairs は同じいきもの同士を含めて 16×17/2＝136 組。a は 06_キャラクター.json（＝TYPES）の並び順で先のほう
// （逆でも読む）。ペアごとの個別ページは作らない（中身の薄いページを量産しないため）。
// 制作途中のことがあるので、無い・壊れている・項目が足りない場合はビルドを止めずに警告を出し、そのペアは表で「－」にする。

import { readJson } from './articles';
import { AISHO_JSON } from './paths';
import { TYPES } from './types';

export interface AishoLabel {
  key: string;
  name: string;
  icon: string;
  description: string;
  /** セルの色（原本に color があればそれ、無ければ並び順で PALETTE から） */
  color: string;
}

export interface AishoPair {
  /** TYPES の並びで先のほう */
  a: string;
  b: string;
  label: string;
  text: string;
}

export interface AishoData {
  labels: AishoLabel[];
  pairs: AishoPair[];
}

/** ラベルの色（夜空パステルに合う色。Base.astro の変数に近いもの） */
export const LABEL_PALETTE = ['#f2d27a', '#ffc8a8', '#a8e6cf', '#c9b8ff', '#9fd4ff', '#ffb3c7', '#d6e68a', '#b9b6d8'];

export const PAIR_COUNT = (TYPES.length * (TYPES.length + 1)) / 2;

const ORDER = new Map(TYPES.map((t, i) => [t.slug, i]));

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** ペアのキー（並び順で先のほうを前に） */
export function pairKey(x: string, y: string): string {
  return (ORDER.get(x) ?? 0) <= (ORDER.get(y) ?? 0) ? `${x}|${y}` : `${y}|${x}`;
}

/** ページ内アンカー：行のいきもの row から見た col との関係（#p-polaris-sun） */
export function pairAnchor(row: string, col: string): string {
  return `p-${row}-${col}`;
}
/** いきもの別の一覧のアンカー（#aisho-polaris） */
export function typeAnchor(slug: string): string {
  return `aisho-${slug}`;
}

export function parseAisho(data: unknown, label = '11_相性早見表.json'): { entries: AishoData; warnings: string[] } {
  const warnings: string[] = [];
  const entries: AishoData = { labels: [], pairs: [] };
  if (!isRecord(data)) {
    warnings.push(`${label}: オブジェクトではない`);
    return { entries, warnings };
  }
  if (isRecord(data.labels)) {
    for (const [key, v] of Object.entries(data.labels)) {
      if (key.startsWith('_')) continue;
      const name = isRecord(v) ? str(v.name) : undefined;
      if (!isRecord(v) || !name) {
        warnings.push(`${label}: labels.${key} に name がない（読み飛ばす）`);
        continue;
      }
      const c = str(v.color);
      entries.labels.push({
        key,
        name,
        icon: str(v.icon) ?? '●',
        description: str(v.description) ?? '',
        color: c && /^#[0-9a-f]{6}$/i.test(c) ? c : LABEL_PALETTE[entries.labels.length % LABEL_PALETTE.length],
      });
    }
  } else {
    warnings.push(`${label}: labels がオブジェクトではない`);
  }
  const labelKeys = new Set(entries.labels.map((l) => l.key));
  const seen = new Set<string>();
  if (Array.isArray(data.pairs)) {
    data.pairs.forEach((p, i) => {
      const a = isRecord(p) ? str(p.a) : undefined;
      const b = isRecord(p) ? str(p.b) : undefined;
      const lab = isRecord(p) ? str(p.label) : undefined;
      const text = isRecord(p) ? str(p.text) : undefined;
      if (!a || !b || !ORDER.has(a) || !ORDER.has(b)) {
        warnings.push(`${label}: pairs[${i}] の a / b が不正（${String(a)} / ${String(b)}）`);
        return;
      }
      if (!lab || !labelKeys.has(lab) || !text) {
        warnings.push(`${label}: ${a}×${b} の label（${String(lab)}）か text が不正（読み飛ばす）`);
        return;
      }
      const key = pairKey(a, b);
      if (seen.has(key)) {
        warnings.push(`${label}: ${a}×${b} が重複している（最初のものを使う）`);
        return;
      }
      seen.add(key);
      const [first, second] = key.split('|');
      entries.pairs.push({ a: first, b: second, label: lab, text });
    });
  } else {
    warnings.push(`${label}: pairs が配列ではない`);
  }
  if (entries.pairs.length > 0 && entries.pairs.length < PAIR_COUNT) {
    warnings.push(`${label}: ${entries.pairs.length}/${PAIR_COUNT} 組（足りないペアは表で「－」にする）`);
  }
  return { entries, warnings };
}

/** 表を引くための道具 */
export class AishoTable {
  readonly labels: AishoLabel[];
  readonly pairs: AishoPair[];
  private byKey: Map<string, AishoPair>;
  private labelByKey: Map<string, AishoLabel>;

  constructor(data: AishoData) {
    this.labels = data.labels;
    this.pairs = data.pairs;
    this.byKey = new Map(data.pairs.map((p) => [pairKey(p.a, p.b), p]));
    this.labelByKey = new Map(data.labels.map((l) => [l.key, l]));
  }

  get isEmpty(): boolean {
    return this.pairs.length === 0;
  }

  /** x と y の関係（順不同）。無ければ undefined */
  get(x: string, y: string): { pair: AishoPair; label: AishoLabel } | undefined {
    const pair = this.byKey.get(pairKey(x, y));
    const label = pair && this.labelByKey.get(pair.label);
    return pair && label ? { pair, label } : undefined;
  }
}

let cache: AishoTable | undefined;

/** 相性早見表。無ければ空の表 */
export function getAisho(): AishoTable {
  if (cache) return cache;
  const { data, warning } = readJson(AISHO_JSON, '11_相性早見表.json');
  if (warning) {
    console.warn(`[aisho] ${warning}`);
    cache = new AishoTable({ labels: [], pairs: [] });
    return cache;
  }
  const result = parseAisho(data);
  for (const w of result.warnings) console.warn(`[aisho] ${w}`);
  console.info(`[aisho] 11_相性早見表.json から ラベル ${result.entries.labels.length} 種、${result.entries.pairs.length}/${PAIR_COUNT} 組を読み込みました`);
  cache = new AishoTable(result.entries);
  return cache;
}
