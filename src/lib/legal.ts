// 利用規約・プライバシーポリシー・運営者情報の未決定の項目（原本は 05_legal/03・04 のドラフト）。
// 決まったらここを埋める。null のあいだは、画面に「【未定：…】」と目立つ形で表示する（components/Undecided.astro）。
export const LEGAL = {
  /** 運営者名（個人名・屋号・法人名） */
  operatorName: 'ほしのかたち運営事務局' as string | null,
  /** 利用規約の制定日（例：2026年10月1日） */
  termsEnactedOn: '2026年9月28日' as string | null,
  /** プライバシーポリシーの制定日 */
  privacyEnactedOn: '2026年9月28日' as string | null,
  /** 利用規約 第9条の専属的合意管轄裁判所（例：東京地方裁判所） */
  court: '東京地方裁判所' as string | null,
};

/** 代表者（D-020：運営者情報ページだけに、名前だけを載せる。リンク・住所・電話番号は載せない） */
export const REPRESENTATIVE = {
  name: '根本愛都',
};

/** ホスティング事業者（プライバシーポリシーの外部送信の表） */
export const HOSTING = {
  company: 'Cloudflare, Inc.',
  service: 'Cloudflare Workers（ホスティング）',
  policyUrl: 'https://www.cloudflare.com/ja-jp/privacypolicy/',
};
