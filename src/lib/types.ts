// 16タイプのマスターデータ。文言の原本は 02_content/01_タイプ名一覧_draft.md と 05_タイプ概要_draft.md。
// （公開用リポジトリでは catchphrase・summary をダミーの文に置き換えている）
// 4文字コードは内部の判定だけに使い、画面には出さない（/select だけで表示する。D-002の法務確認が済むまで）。
//
// D-011 で、16タイプのキャラクターは「天体」から「星のいきもの（動物キャラ）」に変わった。
//   - 今までの「性格の星」（北極星、太陽…）は、キャラの守護星（guardian）として残す。重なり星の判定（planet）もそのまま
//   - キャラ名・動物・あるあるは 02_content/06_キャラクター.json、テーマカラーは 03_design/assets/theme-colors.json を
//     ビルド時に読み込んで TypeCharacter にする（src/lib/characters.ts。ファイルを読むのでサーバー側だけで使う）
// このファイルはブラウザ用のコード（診断・/select の送信処理）からも import するので、ファイルを読む処理は入れないこと。
// URL（slug）は変えない。

export type Planet =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

export interface PersonalityType {
  code: string;
  /** URLに使う（/type/polaris、/result/polaris-leo）。変えない */
  slug: string;
  /** 守護星（D-011 以前の「性格の星」の名前。北極星、太陽…） */
  guardian: string;
  catchphrase: string;
  /** 守護星が星座の支配星になる天体のとき（重なり星の判定に使う） */
  planet?: Planet;
  /**
   * 概要文。ここにあるのは D-011 以前（天体時代）の文章で、原本が読めないときの代わり。
   * 画面では characters.ts が 02_content/05_タイプ概要_draft.md（キャラ名が主語の新しい文章）に差し替えた TypeCharacter.summary を使う。
   */
  summary: string;
}

/**
 * タイプのテーマカラー（カード・結果ページのアクセント）。原本は 03_design/assets/theme-colors.json（main / sub / ink）。
 * main：テーマ色（帯・アクセント）、sub：main を薄めた色（夜空の上の文字・光にも使う）、ink：main の上に載せる文字色。
 * dark は開発側で main と夜空の色を混ぜて作る（カードの背景のグラデーション）。
 */
export interface ThemeColor {
  main: string;
  sub: string;
  ink: string;
  dark: string;
}

/** 16タイプ＋キャラクター（星のいきもの、D-011）。src/lib/characters.ts が組み立てる */
export interface TypeCharacter extends PersonalityType {
  /** キャラ名（例：いきもの3） */
  name: string;
  /** 動物（例：どうぶつ3） */
  animal: string;
  /** どんな人か（ひとこと） */
  concept: string;
  /** あるある3つ */
  aruaru: string[];
  /** あるあるがコンテンツ部の原本にまだ無く、開発部の仮の文言を使っているとき true */
  aruaruPlaceholder: boolean;
  theme: ThemeColor;
}

export const TYPES: PersonalityType[] = [
  {
    code: 'INTJ', slug: 'polaris', guardian: '北極星', catchphrase: 'サンプルのキャッチコピー1',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'INTP', slug: 'nebula', guardian: '星雲', catchphrase: 'サンプルのキャッチコピー2',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ENTJ', slug: 'sun', guardian: '太陽', catchphrase: 'サンプルのキャッチコピー3', planet: 'sun',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ENTP', slug: 'uranus', guardian: '天王星', catchphrase: 'サンプルのキャッチコピー4', planet: 'uranus',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'INFJ', slug: 'neptune', guardian: '海王星', catchphrase: 'サンプルのキャッチコピー5', planet: 'neptune',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'INFP', slug: 'milky-way', guardian: '天の川', catchphrase: 'サンプルのキャッチコピー6',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ENFJ', slug: 'first-star', guardian: '一番星', catchphrase: 'サンプルのキャッチコピー7',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ENFP', slug: 'comet', guardian: '彗星', catchphrase: 'サンプルのキャッチコピー8',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ISTJ', slug: 'saturn', guardian: '土星', catchphrase: 'サンプルのキャッチコピー9', planet: 'saturn',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ISFJ', slug: 'moon', guardian: '月', catchphrase: 'サンプルのキャッチコピー10', planet: 'moon',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ESTJ', slug: 'jupiter', guardian: '木星', catchphrase: 'サンプルのキャッチコピー11', planet: 'jupiter',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ESFJ', slug: 'venus', guardian: '金星', catchphrase: 'サンプルのキャッチコピー12', planet: 'venus',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ISTP', slug: 'mercury', guardian: '水星', catchphrase: 'サンプルのキャッチコピー13', planet: 'mercury',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ISFP', slug: 'aurora', guardian: 'オーロラ', catchphrase: 'サンプルのキャッチコピー14',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ESTP', slug: 'mars', guardian: '火星', catchphrase: 'サンプルのキャッチコピー15', planet: 'mars',
    summary: 'サンプルの概要文です。',
  },
  {
    code: 'ESFP', slug: 'meteor-shower', guardian: '流星群', catchphrase: 'サンプルのキャッチコピー16',
    summary: 'サンプルの概要文です。',
  },
];

export function getTypeByCode(code: string): PersonalityType | undefined {
  return TYPES.find((t) => t.code === code);
}

export function getTypeBySlug(slug: string): PersonalityType | undefined {
  return TYPES.find((t) => t.slug === slug);
}
