// 読みもの（/column）のカテゴリ。記事の slug から決める（原本の JSON にはカテゴリを持たせない）。
// 新しい記事を足したら、ここの COLUMN_CATEGORY_BY_SLUG に slug を足す。
// 対応表に無い slug は、slug に含まれる語（KEYWORD_RULES）で推測し、それでも決まらなければ「その他」。

export interface ColumnCategory {
  id: string;
  name: string;
  description: string;
}

/** 一覧に並べる順 */
export const COLUMN_CATEGORIES: ColumnCategory[] = [
  { id: 'start', name: 'はじめての方へ', description: '診断のしくみと、結果の読み方' },
  { id: 'zodiac', name: '星座とエレメント', description: '12星座の決まり方、エレメント、星座どうしの関係' },
  { id: 'axes', name: '4つの軸', description: '性格の16タイプを形づくる4つのものさし' },
  { id: 'ikimono', name: 'いきものと守護星', description: '星のいきもの、守護星、重なり星のお話' },
  { id: 'other', name: 'その他', description: 'そのほかの読みもの' },
];

export const OTHER_CATEGORY = 'other';

/** slug → カテゴリ id */
export const COLUMN_CATEGORY_BY_SLUG: Record<string, string> = {
  'about-16types': 'start',
  'result-changed': 'start',
  'enjoy-with-friends': 'start',
  'zodiac-cusp': 'zodiac',
  'four-elements': 'zodiac',
  'element-compatibility': 'zodiac',
  'three-modalities': 'zodiac',
  'libra-scorpio-season': 'zodiac',
  'axis-energy': 'axes',
  'axis-perception': 'axes',
  'axis-judgment': 'axes',
  'axis-lifestyle': 'axes',
  'creatures-guide': 'ikimono',
  'overlap-star': 'ikimono',
  'guardian-and-ruler': 'ikimono',
};

/** 対応表に無い slug の推測（上から順に見る） */
const KEYWORD_RULES: [RegExp, string][] = [
  [/(^|-)(beginner|start|first|how-to|guide|faq|result|about|shindan)(-|$)/, 'start'],
  [/(^|-)(zodiac|sign|signs|element|elements|fire|earth|air|water|season|cusp|modality|quality|seiza)(-|$)/, 'zodiac'],
  [/(^|-)(axis|axes|energy|perception|judgment|judging|lifestyle|introvert|extrovert|intuition|sensing|thinking|feeling)(-|$)/, 'axes'],
  [/(^|-)(ikimono|character|characters|animal|animals|guardian|overlap|planet|planets|star|creature|creatures|zukan)(-|$)/, 'ikimono'],
];

export function columnCategoryId(slug: string): string {
  const mapped = COLUMN_CATEGORY_BY_SLUG[slug];
  if (mapped) return mapped;
  for (const [re, id] of KEYWORD_RULES) if (re.test(slug)) return id;
  return OTHER_CATEGORY;
}

/** 記事をカテゴリごとに分ける（COLUMN_CATEGORIES の順、記事の無いカテゴリは除く。各カテゴリの中は元の順） */
export function groupColumns<T extends { slug: string }>(columns: T[]): { category: ColumnCategory; columns: T[] }[] {
  return COLUMN_CATEGORIES.map((category) => ({
    category,
    columns: columns.filter((c) => columnCategoryId(c.slug) === category.id),
  })).filter((g) => g.columns.length > 0);
}
