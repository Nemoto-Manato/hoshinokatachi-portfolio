# 16タイプ星座診断〜ほしのかたち〜（コード公開版）

The source code of "Hoshino Katachi", a live Japanese personality-type × zodiac web service (https://16type-seiza.com).
It is a static Astro site on Cloudflare Workers: scoring and zodiac detection run entirely in the browser, and share cards are rendered at build time.
This repository contains the code only; all texts and character art are replaced with dummy data and placeholder images.

---

## このリポジトリについて

**16タイプ星座診断〜ほしのかたち〜** は、20問の性格診断で決まる16タイプと、生年月日から判定する12星座を組み合わせて、192通りの結果（16の「星のいきもの」×12星座）を出す診断サイトです。

- 公開中のサイト：https://16type-seiza.com
- このリポジトリは**コードだけ**を公開しています。本番の文章（診断の設問、192通りの結果文、解説記事など）とキャラクターのイラスト・ロゴは含めていません。
  - 文章は、同じ形式の**ダミーデータ**（`sample-data/`。「サンプルの文章です。」のような仮の文）に置き換えています。キャラ名は「いきもの1」〜「いきもの16」です。
  - 画像は、`scripts/placeholder-assets.mjs` で作った**単色の丸などのプレースホルダー**です。
- ダミーデータのまま `npm test` / `npm run check` / `npm run build` がすべて通ります。ダミーが無い部分（組み合わせ文言の190件など）は、本番と同じ「制作中」表示・非表示の仕組みで扱われます。

## 技術構成

| 項目 | 内容 |
| --- | --- |
| フレームワーク | [Astro](https://astro.build/) 7（静的サイト生成。ページは約430、結果カード画像は約650枚をビルド時に生成） |
| 言語 | TypeScript（strict）、ブラウザ側は素の TypeScript（UIフレームワークなし） |
| 配信 | Cloudflare Workers の静的アセット配信（`wrangler.jsonc`。サーバー側のコードは持たない） |
| 画像生成 | [satori](https://github.com/vercel/satori)（JSX風のツリー → SVG）→ [resvg](https://github.com/yisibl/resvg-js)（SVG → PNG）→ [sharp](https://sharp.pixelplumbing.com/)（減色して軽量化）。フォントは Noto Sans JP（OFL） |
| 星座判定 | 太陽が各星座に入る日時（日本時間）の表を Python で計算して JSON に（`tools/gen_sun_ingress.py`）。国立天文台「暦要項」（2024年）の二十四節気と照合し、星座の切り替わる12節気すべてで日付が一致することを確認 |
| テスト | [Vitest](https://vitest.dev/)（12ファイル・122テスト）、`astro check`（型チェック） |
| 文言の検証 | Python の検証ツール（`tools/validate_*.py`）。文字数、使ってはいけない表現（商標・断定・不安をあおる表現など）を全件チェック |

### 個人情報を送らない設計

- 診断の**採点と星座の判定は、すべてブラウザの中**で行います（`src/lib/quiz.ts`、`src/lib/zodiac.ts`）。回答や生年月日はサーバーに送らず、保存もしません。そもそも受け取るサーバーがありません。
- 結果ページの URL は `/result/{いきもの}-{星座}/`（例：`/result/sun-leo/`）で、**生年月日や回答は URL に入りません**。192通りの結果はすべてビルド時に作った静的ページです。
- 友だちとの相性診断（`/aisho/match/?a=…&b=…`）も、URL に入るのは結果の種類（いきもの×星座）だけです。
- 誕生日が星座の境目にあたる日（その日のうちに星座が切り替わる日）は、生まれた時刻を聞く代わりに、2つの星座から本人に選んでもらいます。

## ディレクトリ構成

```text
.
├── src/
│   ├── pages/          ページ（診断、結果192通り、タイプ・星座の解説、図鑑、相性、読みもの、用語集、規約など）
│   │   └── og/         結果カード・相性カードのPNG（ビルド時に生成するエンドポイント）
│   ├── components/     Astro コンポーネント
│   ├── layouts/        共通レイアウト
│   ├── lib/            ロジックとデータの読み込み（*.test.ts がテスト）
│   │   ├── quiz.ts, zodiac.ts, birthday-form.ts   … 診断の採点・星座判定（ブラウザ側）
│   │   ├── characters.ts, content.ts, articles.ts … 文章データの読み込み（ビルド時）
│   │   ├── og.ts, og-aisho.ts, og-text.ts          … 結果カードの描画と、日本語の改行処理
│   │   ├── match.ts, match-data.ts                 … 相性診断
│   │   └── paths.ts                                … 文章データ・フォント・画像の場所
│   ├── data/sun_ingress_jst.json   太陽が各星座に入る日時の表（計算で生成）
│   └── assets/fonts/   Noto Sans JP（結果カード用。OFL）
├── sample-data/        ダミーの文章データ（本番の文章データと同じ形式）
├── public/             プレースホルダー画像、robots.txt
├── scripts/
│   ├── placeholder-assets.mjs   プレースホルダー画像の生成（このリポジトリ用）
│   └── sync-assets.mjs          本番用：デザイン素材を public/ にコピーし、favicon を生成
├── tools/
│   ├── gen_sun_ingress.py       星座の切り替わり日時の表を生成
│   ├── validate_combinations.py 結果文言（192通り）の検証
│   └── validate_articles.py     解説記事・図鑑・相性表などの検証
├── astro.config.mjs
└── wrangler.jsonc      Cloudflare Workers の設定（静的アセットのみ）
```

## 動かし方

Node.js 22.12 以上が必要です。

```sh
npm install
npm test          # Vitest
npm run check     # 型チェック（astro check）
npm run build     # dist/ に静的サイトを出力（結果カードの生成を含むので1〜2分かかります）
npm run dev       # 開発サーバー（http://localhost:4321）
```

そのほか：

```sh
npm run placeholder-assets             # プレースホルダー画像を作り直す
python3 tools/gen_sun_ingress.py       # 星座の切り替わり日時の表を作り直す
python3 tools/validate_combinations.py # 結果文言の検証（ダミーデータは文字数の基準を満たさないため ERROR になります）
python3 tools/validate_articles.py     # 記事などの検証（同上）
```

## 主な設計判断

- **サーバーを持たない**：必要なのは「192通りの結果を見せること」で、ユーザーごとのデータを保存する必要がありません。静的サイトにすることで、個人情報を扱わずに済み、運用費はほぼゼロ、攻撃を受ける面も小さくなります。採点・星座判定はブラウザで行い、結果は静的ページへの遷移で表示します。
- **データとコードを分ける**：文章はコンテンツ担当が JSON / Markdown で書き、アプリはビルド時に読み込むだけにしています（`src/lib/paths.ts` で場所を一元管理）。文章の追加・修正でコードを触る必要がありません。
- **制作途中でもビルドを止めない**：文章データが無い・壊れている・項目が足りない場合は、警告を出して「制作中」表示や非表示にします。段階的に文章を増やしながら公開できるようにするためで、このリポジトリがダミーデータだけでビルドできるのもこの仕組みによります。一方、URL がぶつかる読みものの slug の重複などは、ビルドを止めます。
- **URL に個人情報を入れない**：結果や相性のURLには、いきもの×星座の種類だけを入れます。シェアされた URL から生年月日や回答は分かりません。
- **結果カードはビルド時に生成する**：シェア用の画像（横長の OGP 用と、縦長のストーリーズ用）を全組み合わせ分、事前に PNG にしています。実行時の画像生成サーバーが不要になり、表示も速くなります。日本語の改行（句読点やかっこの禁則、文節で折る）は自前で実装しています（`src/lib/og-text.ts`）。
- **星座の判定は日付の早見表に頼らない**：「3/21〜4/19 はおひつじ座」のような固定の区切りは年によって1日ずれるため、天文計算で各年の切り替わり時刻を求めた表を使い、境目の日は本人に選んでもらいます。
- **表現のルールをコードで守る**：商標や他サービスのタイプ名、断定・不安をあおる表現などを、検証ツールで全件チェックしています。

## 開発体制

コードの大部分は Claude Code（AI コーディングエージェント）で作成し、設計の方針決定・レビュー・動作確認を本人が行いました。

## ライセンス

コードは閲覧用に公開しています（All rights reserved。無断での転用・再配布を禁じます）。詳しくは [LICENSE](LICENSE) を見てください。フォント（Noto Sans JP）は SIL Open Font License 1.1 です。
