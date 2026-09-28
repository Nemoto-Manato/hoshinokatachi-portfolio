// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';

// アプリのディレクトリ（このリポジトリのルート）の絶対パス。
// ビルド時はコードが1つのファイルにまとめられて import.meta.url が変わるので、ここで確定させて埋め込む。
// 組み合わせ文言（sample-data/combinations）やフォントの場所は src/lib/paths.ts でこれを基準に決める。
const APP_DIR = fileURLToPath(new URL('.', import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://16type-seiza.com',
  // 検索エンジンとAdSenseの審査向けのページ一覧。画像保存用の /share/ と、クエリで中身が変わる相性診断の
  // /aisho/match/・/aisho/invite/（D-019c）は検索に出さないので含めない。
  integrations: [
    sitemap({ filter: (page) => !page.includes('/share/') && !page.includes('/aisho/match/') && !page.includes('/aisho/invite/') }),
  ],
  build: {
    // 結果カード・相性カード（PNG 658枚）の減色（sharp）は別スレッドで動くので、ページを並行して作ると速くなる。
    concurrency: 4,
  },
  vite: {
    define: {
      __APP_DIR__: JSON.stringify(APP_DIR),
    },
  },
});
