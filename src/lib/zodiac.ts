// 生年月日から太陽星座を判定する。すべてブラウザ内で計算し、生年月日を外部に送らない（法務判断書 #4）。
// 表は tools/gen_sun_ingress.py で生成する（各年の星座の開始日時、JST）。

import table from '../data/sun_ingress_jst.json';
import type { SignId } from './signs';

type IngressTable = Record<string, [SignId, string][]>;
// JSONの型推論では [星座, 日時] の組がstring[]になるので、明示的に変換する。
const INGRESS = table as unknown as IngressTable;

export const MIN_YEAR = 1920;
export const MAX_YEAR = 2030;

export type ZodiacResult =
  | { kind: 'fixed'; sign: SignId }
  // その日のうちに星座が切り替わる（境目の日）。ユーザーに選んでもらう。
  | { kind: 'cusp'; before: SignId; after: SignId; suggested: SignId; changesAt: string };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isValidDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function zodiacFromDate(year: number, month: number, day: number): ZodiacResult | null {
  if (year < MIN_YEAR || year > MAX_YEAR || !isValidDate(year, month, day)) return null;

  // 1月の前半はやぎ座（前年12月に始まる）なので、前年の表も合わせて見る。
  const entries = [...INGRESS[String(year - 1)], ...INGRESS[String(year)]];
  const date = `${year}-${pad(month)}-${pad(day)}`;

  const idx = entries.findIndex(([, at]) => at.startsWith(date));
  if (idx > 0) {
    const before = entries[idx - 1][0];
    const [after, at] = entries[idx];
    const time = at.slice(11);
    // 切り替わりが正午より前なら、その日の大半は新しい星座にいる。
    return { kind: 'cusp', before, after, suggested: time < '12:00' ? after : before, changesAt: time };
  }

  const startOfDay = `${date}T00:00`;
  let current = entries[0][0];
  for (const [sign, at] of entries) {
    if (at >= startOfDay) break;
    current = sign;
  }
  return { kind: 'fixed', sign: current };
}
