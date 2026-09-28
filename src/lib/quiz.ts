// 性格タイプ診断。設問の原本は 02_content/02_診断設問_draft.md。
// （公開用リポジトリでは設問の文をダミーに置き換えている。採点のしくみは本番と同じ）

export type Pole = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export interface Question {
  id: number;
  pole: Pole;
  text: string;
}

// 各軸の [＋側, −側]。合計が0以上なら＋側と判定する。
const AXES: [Pole, Pole][] = [
  ['E', 'I'],
  ['S', 'N'],
  ['T', 'F'],
  ['J', 'P'],
];

export const QUESTIONS: Question[] = [
  { id: 1, pole: 'E', text: 'サンプルの設問1です（E）' },
  { id: 2, pole: 'E', text: 'サンプルの設問2です（E）' },
  { id: 3, pole: 'E', text: 'サンプルの設問3です（E）' },
  { id: 4, pole: 'I', text: 'サンプルの設問4です（I）' },
  { id: 5, pole: 'I', text: 'サンプルの設問5です（I）' },
  { id: 6, pole: 'S', text: 'サンプルの設問6です（S）' },
  { id: 7, pole: 'S', text: 'サンプルの設問7です（S）' },
  { id: 8, pole: 'N', text: 'サンプルの設問8です（N）' },
  { id: 9, pole: 'N', text: 'サンプルの設問9です（N）' },
  { id: 10, pole: 'S', text: 'サンプルの設問10です（S）' },
  { id: 11, pole: 'T', text: 'サンプルの設問11です（T）' },
  { id: 12, pole: 'F', text: 'サンプルの設問12です（F）' },
  { id: 13, pole: 'T', text: 'サンプルの設問13です（T）' },
  { id: 14, pole: 'F', text: 'サンプルの設問14です（F）' },
  { id: 15, pole: 'T', text: 'サンプルの設問15です（T）' },
  { id: 16, pole: 'J', text: 'サンプルの設問16です（J）' },
  { id: 17, pole: 'J', text: 'サンプルの設問17です（J）' },
  { id: 18, pole: 'P', text: 'サンプルの設問18です（P）' },
  { id: 19, pole: 'P', text: 'サンプルの設問19です（P）' },
  { id: 20, pole: 'J', text: 'サンプルの設問20です（J）' },
];

// 表示順。同じ軸の設問が続かないように並べる。
export const DISPLAY_ORDER = [1, 6, 11, 16, 4, 8, 12, 18, 2, 7, 13, 17, 5, 9, 14, 19, 3, 10, 15, 20];

export const CHOICES = [
  { value: 2, label: 'とてもそう思う' },
  { value: 1, label: 'ややそう思う' },
  { value: 0, label: 'どちらでもない' },
  { value: -1, label: 'ややそう思わない' },
  { value: -2, label: 'まったくそう思わない' },
];

/** answers: 設問ID → 回答（-2〜2）。すべての設問に回答済みであること。 */
export function scoreTypeCode(answers: Record<number, number>): string {
  return AXES.map(([plus, minus]) => {
    let total = 0;
    for (const q of QUESTIONS) {
      if (q.pole !== plus && q.pole !== minus) continue;
      const value = answers[q.id];
      if (value === undefined) throw new Error(`question ${q.id} is unanswered`);
      total += q.pole === plus ? value : -value;
    }
    return total >= 0 ? plus : minus;
  }).join('');
}
