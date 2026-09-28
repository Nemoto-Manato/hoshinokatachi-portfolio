// デザイン部の素材（ロゴ・キャラクター）のURL。ファイルは public/ にあり、ビルドでそのまま配信される。
// 原本は 03_design/assets/。デザインが更新されたら `npm run sync-assets` で public/ にコピーし直す（scripts/sync-assets.mjs）。
import type { TypeCharacter } from './types';

/** ヘッダーのロゴ（原本：03_design/assets/logo/logo.svg、1094×300） */
export const LOGO = { src: '/brand/logo.svg', width: 1094, height: 300 } as const;

/** キャラクターのSVG（原本：03_design/assets/characters-v2/{slug}.svg。無ければ characters/{slug}.svg。正方形、背景透過） */
export const CHARACTER_SIZE = 512;

export function characterSrc(slug: string): string {
  return `/characters/${slug}.svg`;
}

/** 「いきもの3のキャラクター」 */
export function characterAlt(character: Pick<TypeCharacter, 'name'>): string {
  return `${character.name}のキャラクター`;
}
