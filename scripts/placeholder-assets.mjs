// 公開用リポジトリ向けの、仮の画像素材を public/ に生成する。
//   npm run placeholder-assets
//
// 本番ではデザイン部の素材（キャラクター・ロゴ）を scripts/sync-assets.mjs で public/ にコピーしている。
// このリポジトリにはデザイン素材を含めないので、同じファイル名・同じ大きさの「単色の丸」などで代用する。
// 生成するもの
//   public/characters/{slug}.svg   … 16体。タイプの仮のテーマカラーの丸（512×512、背景透過）
//   public/brand/logo.svg          … ヘッダーのロゴ（1094×300）
//   public/brand/symbol.svg        … シンボル（正方形）
//   public/favicon.svg / favicon.ico（16px＋32px）/ apple-touch-icon.png（180px）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const APP_DIR = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = path.join(APP_DIR, 'public');

// src/lib/types.ts の slug と、src/lib/characters.ts の FALLBACK_THEME（開発部の仮の色）
const COLORS = {
  polaris: '#9fb4ff', nebula: '#c3a6ff', sun: '#ffc46b', uranus: '#7fe3e0',
  neptune: '#6fa8ff', 'milky-way': '#e3b8ff', 'first-star': '#ffe58f', comet: '#ff9fc6',
  saturn: '#e0bf94', moon: '#dcd8ff', jupiter: '#f2a97c', venus: '#ffb3c7',
  mercury: '#9fe0c8', aurora: '#a8f0b0', mars: '#ff8f80', 'meteor-shower': '#c6f07a',
};

const STAR = '#f2d27a';

function write(rel, data) {
  const file = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log(`生成: public/${rel}`);
}

/** キャラクターの代わり：テーマカラーの丸に、白い目を2つ */
const character = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<circle cx="256" cy="256" r="200" fill="${color}"/>
<circle cx="206" cy="236" r="18" fill="#11142a"/><circle cx="306" cy="236" r="18" fill="#11142a"/>
</svg>
`;

/** 4本の光の星（シンボル・favicon 用） */
const star = (cx, cy, r) =>
  `<path d="M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z" fill="${STAR}"/>`;

const symbol = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
${star(50, 50, 44)}
</svg>
`;

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1094 300" width="1094" height="300">
${star(150, 150, 110)}
<rect x="310" y="105" width="720" height="90" rx="45" fill="#f4f1ff" opacity="0.85"/>
</svg>
`;

for (const [slug, color] of Object.entries(COLORS)) write(`characters/${slug}.svg`, character(color));
write('brand/symbol.svg', symbol);
write('brand/logo.svg', logo);
write('favicon.svg', symbol);

// ---- favicon.ico と apple-touch-icon.png（scripts/sync-assets.mjs と同じ作り方） ----
const renderPng = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

/** PNGをそのまま入れたICO */
function toIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size, o);
    dir.writeUInt8(size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.png)]);
}

write('favicon.ico', toIco([16, 32].map((size) => ({ size, png: renderPng(symbol, size) }))));
const touch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
<rect width="180" height="180" fill="#1b1f3b"/>${star(90, 90, 70)}</svg>`;
write('apple-touch-icon.png', renderPng(touch, 180));
