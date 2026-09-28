// サービス名（D-003で決定）。
export const SITE_NAME = '16タイプ星座診断〜ほしのかたち〜';
// 各ページの <title> の後ろにつける名前。検索で「16タイプ星座診断」が見えるように、説明的な名前を先に置く。
export const TITLE_SUFFIX = '16タイプ星座診断｜ほしのかたち';

// 公式SNS（D-007）。
export const SOCIAL_LINKS = [
  { label: 'X', handle: '@hoshinokatachi0', url: 'https://x.com/hoshinokatachi0' },
  { label: 'TikTok', handle: '@hoshino.katachi', url: 'https://www.tiktok.com/@hoshino.katachi' },
];

// サイトのURLは astro.config.mjs の site（https://16type-seiza.com）。

// 問い合わせ先。
export const CONTACT_EMAIL = 'hoshino.katachi.unei@gmail.com';

// OGP画像のパス（src/pages/og/ で生成する）。
export const DEFAULT_OG_IMAGE = '/og/default.png';
/** 相性診断の共通のOGP画像（招待ページ・相性ページ） */
export const AISHO_OG_IMAGE = '/og/aisho/default.png';
/** 結果カードの横長（1200×630、OGP） */
export function resultOgImage(slug: string): string {
  return `/og/result/${slug}.png`;
}
/** 結果カードの縦長（1080×1920、保存・ストーリーズ用） */
export function resultStoryImage(slug: string): string {
  return `/og/result/${slug}-story.png`;
}
/** 縦長の結果カードを表示して保存・シェアするページ */
export function sharePage(slug: string): string {
  return `/share/${slug}/`;
}

/** シェアの文面につけるハッシュタグ */
export const HASHTAG = '#ほしのかたち';
/** シェアの文面：「私は『しし座の いきもの3』でした！ #ほしのかたち」 */
export function shareText(title: string): string {
  return `私は『${title}』でした！ ${HASHTAG}`;
}

/** ヘッダー・フッター・トップに並べる、読みものまわりのページ（D-019） */
export const SECTION_LINKS = [
  { label: '図鑑', href: '/zukan/' },
  { label: '相性早見表', href: '/aisho/' },
  { label: '読みもの', href: '/column/' },
  { label: '用語集', href: '/glossary/' },
] as const;
