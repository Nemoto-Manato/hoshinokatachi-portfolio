// デザイン部の素材（03_design/assets/）をアプリの public/ にコピーする。
//
// ※ 公開用リポジトリにはデザイン素材を含めていない。素材の場所を環境変数 DESIGN_ASSETS_DIR で渡したときだけ動く。
//   素材が無いときは npm run placeholder-assets（scripts/placeholder-assets.mjs）で仮の画像を作る。
//   npm run sync-assets            … コピーする（デザインが更新されたら実行する）
//   npm run sync-assets -- --check … コピーせず、差分があるかだけ調べる（差分があれば終了コード1）
//
// コピー元 → コピー先
//   03_design/assets/characters-v2/{slug}.svg → public/characters/{slug}.svg（16体、星のいきもの。D-011）
//     characters-v2/ にまだ無いタイプは、今までの 03_design/assets/characters/{slug}.svg（天体）を使う
//   （URL は /characters/{slug}.svg のまま。サイトとOGP・結果カードはここを見る）
//   03_design/assets/characters-v2/alt/{slug}.svg → public/characters/alt/{slug}.svg（表情違い。あるものだけ。図鑑ブロックに出す）
//   03_design/assets/logo/logo.svg         → public/brand/logo.svg（ヘッダーのロゴ）
//   03_design/assets/logo/symbol.svg       → public/brand/symbol.svg
// あわせて次を生成する（生成元は public/favicon.svg と public/brand/symbol.svg）
//   public/favicon.ico（16px＋32px）、public/apple-touch-icon.png（180px、背景つき）
//
// public/favicon.svg は開発側で作った簡略版（symbol.svg からミントの小さな✦と点を省き、星を中央に寄せたもの）。
// このスクリプトでは上書きしない。シンボルの形や色が変わったら、手で合わせる。
//
// 素材のディレクトリは読むだけ。書き込むのは public/ だけ。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const APP_DIR = fileURLToPath(new URL('..', import.meta.url));
const SRC = process.env.DESIGN_ASSETS_DIR;
if (!SRC) {
  console.error('DESIGN_ASSETS_DIR（デザイン素材の assets/ ディレクトリ）を指定してください。素材が無い場合は npm run placeholder-assets を使います');
  process.exit(1);
}
const PUBLIC = path.join(APP_DIR, 'public');
const CHECK = process.argv.includes('--check');

// src/lib/types.ts の slug と同じ16体。
const SLUGS = [
  'polaris', 'nebula', 'sun', 'uranus', 'neptune', 'milky-way', 'first-star', 'comet',
  'saturn', 'moon', 'jupiter', 'venus', 'mercury', 'aurora', 'mars', 'meteor-shower',
];

/** 新しいキャラ（characters-v2）があればそれ、無ければ今までの天体キャラ */
function characterSource(slug) {
  const v2 = `characters-v2/${slug}.svg`;
  return fs.existsSync(path.join(SRC, v2)) ? v2 : `characters/${slug}.svg`;
}
const v2Count = SLUGS.filter((s) => characterSource(s).startsWith('characters-v2/')).length;

/** 表情違いのキャラ（characters-v2/alt/{slug}.svg）。あるものだけコピーする（無くてもよい） */
const altCopies = SLUGS.filter((s) => fs.existsSync(path.join(SRC, `characters-v2/alt/${s}.svg`))).map((s) => [
  `characters-v2/alt/${s}.svg`,
  `characters/alt/${s}.svg`,
]);

const copies = [
  ...SLUGS.map((s) => [characterSource(s), `characters/${s}.svg`]),
  ...altCopies,
  ['logo/logo.svg', 'brand/logo.svg'],
  ['logo/symbol.svg', 'brand/symbol.svg'],
];

let changed = 0;
let missing = 0;
for (const [from, to] of copies) {
  const src = path.join(SRC, from);
  const dest = path.join(PUBLIC, to);
  if (!fs.existsSync(src)) {
    console.error(`見つからない: ${src}`);
    missing++;
    continue;
  }
  const data = fs.readFileSync(src);
  const same = fs.existsSync(dest) && fs.readFileSync(dest).equals(data);
  if (same) continue;
  changed++;
  if (CHECK) {
    console.log(`差分あり: ${from} → public/${to}`);
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
    console.log(`コピー: ${from} → public/${to}`);
  }
}

console.log(`キャラクター：新しい星のいきもの ${v2Count}/16 体（残りは今までの天体キャラ）、表情違い ${altCopies.length}/16 体`);

if (CHECK) {
  console.log(changed || missing ? `差分 ${changed} 件、見つからない ${missing} 件` : '素材は最新です');
  process.exit(changed || missing ? 1 : 0);
}

// ---- favicon.ico と apple-touch-icon.png ----
const renderPng = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

/** PNGをそのまま入れたICO（Windows Vista以降・主要ブラウザが対応） */
function toIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.png)]);
}

const favicon = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'), 'utf8');
fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), toIco([16, 32].map((size) => ({ size, png: renderPng(favicon, size) }))));

// iOSのホーム画面用。透過だと黒背景になるので、夜空の色で塗った正方形にシンボルを重ねる。
const symbol = fs.readFileSync(path.join(PUBLIC, 'brand/symbol.svg'), 'utf8');
const symbolDataUri = `data:image/svg+xml;base64,${Buffer.from(symbol).toString('base64')}`;
const touch = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 180 180" width="180" height="180">
<rect width="180" height="180" fill="#1b1f3b"/><image x="14" y="14" width="152" height="152" xlink:href="${symbolDataUri}"/></svg>`;
fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), renderPng(touch, 180));

console.log(`${changed} 件をコピーし、favicon.ico と apple-touch-icon.png を生成しました（コピー元：${SRC}）`);
if (missing) process.exit(1);
