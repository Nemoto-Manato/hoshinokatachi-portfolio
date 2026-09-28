// ビルド時にファイルを読むためのパス（サーバー側でだけ使う。ブラウザ用のコードから import しないこと）。
//
// 本番ではコンテンツ部の原本（別リポジトリの 02_content/）を読む。この公開用リポジトリでは、
// 文章をダミーに置き換えた sample-data/ を同じ形式で置き、そこを読む。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** アプリ（このリポジトリのルート）の絶対パス。ビルド時は astro.config.mjs が埋め込んだ値、テスト時はこのファイルの位置から求める。 */
export const APP_DIR: string =
  typeof __APP_DIR__ === 'string' ? __APP_DIR__ : fileURLToPath(new URL('../..', import.meta.url));

/** 文章データのディレクトリ（本番の 02_content/ に相当。ここではダミーの sample-data/）。 */
export const CONTENT_DIR = path.resolve(APP_DIR, 'sample-data');

/** コンテンツ部の組み合わせ文言（本番の 02_content/combinations/*.json）。 */
export const COMBINATIONS_DIR = path.resolve(CONTENT_DIR, 'combinations');

/** OGP画像用のフォント（Noto Sans JP、OFL）。 */
export const FONTS_DIR = path.resolve(APP_DIR, 'src/assets/fonts');

/** キャラクターのSVG（public/characters/。原本は 03_design/assets/characters-v2/（無ければ characters/）、npm run sync-assets でコピー）。OGP画像に埋め込む。 */
export const CHARACTERS_DIR = path.resolve(APP_DIR, 'public/characters');

/** コンテンツ部のキャラクター（D-011）：名前・動物・コンセプト・あるある（02_content/06_キャラクター.json）。 */
export const CHARACTERS_JSON = path.resolve(CONTENT_DIR, '06_キャラクター.json');

/** コンテンツ部のタイプ概要文（02_content/05_タイプ概要_draft.md）。「### キャラ名（INTJ）― 守護星：…」の次の段落を概要文として読む。 */
export const TYPE_SUMMARY_MD = path.resolve(CONTENT_DIR, '05_タイプ概要_draft.md');

/** コンテンツ部の相性診断の文言（02_content/13_相性診断.json）。/aisho/match/ で使う。 */
export const MATCH_JSON = path.resolve(CONTENT_DIR, '13_相性診断.json');

/** デザイン部のテーマカラー（本番は 03_design/assets/theme-colors.json。ここでは sample-data/theme-colors.json）。無ければ src/lib/characters.ts の仮の色を使う。 */
export const THEME_COLORS_JSON = path.resolve(CONTENT_DIR, 'theme-colors.json');

/** コンテンツ部のタイプ解説の本文（02_content/07_タイプ解説.json）。無ければタイプ解説ページは概要だけを表示する。 */
export const TYPE_ARTICLES_JSON = path.resolve(CONTENT_DIR, '07_タイプ解説.json');

/** コンテンツ部の星座解説の本文（02_content/08_星座解説.json）。無ければ星座解説ページは基本データだけを表示する。 */
export const SIGN_ARTICLES_JSON = path.resolve(CONTENT_DIR, '08_星座解説.json');

/** コンテンツ部の読みもの（02_content/09_読みもの.json）。/column と /column/{slug} になる。 */
export const COLUMNS_JSON = path.resolve(CONTENT_DIR, '09_読みもの.json');

/** 読みものの原本のファイル名（09_読みもの.json、09_読みもの_b.json …）。すべて読んで1つの一覧にする。 */
export const COLUMN_FILE_PATTERN = /^09_読みもの(?:_[a-z0-9]+)?\.json$/;

/** コンテンツ部の用語集（02_content/12_用語集.json）。/glossary になる。 */
export const GLOSSARY_JSON = path.resolve(CONTENT_DIR, '12_用語集.json');

/** コンテンツ部のいきもの図鑑（02_content/10_図鑑.json）。/type/{slug} の「図鑑」と /zukan になる。 */
export const ZUKAN_JSON = path.resolve(CONTENT_DIR, '10_図鑑.json');

/** コンテンツ部の16いきもの相性早見表（02_content/11_相性早見表.json）。/aisho になる。 */
export const AISHO_JSON = path.resolve(CONTENT_DIR, '11_相性早見表.json');

/** 表情違いのキャラ画像（public/characters/alt/{slug}.svg。原本は 03_design/assets/characters-v2/alt/、npm run sync-assets でコピー）。 */
export const CHARACTERS_ALT_DIR = path.resolve(APP_DIR, 'public/characters/alt');
