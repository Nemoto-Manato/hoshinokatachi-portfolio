// 結果カードの縦長（1080×1920、ストーリーズ・保存用）：/og/result/{slug}-story.png（192枚）。
// 結果ページの「画像を保存してシェア」（/share/{slug}）で表示する。
import type { APIRoute, GetStaticPaths } from 'astro';
import { COMBINATIONS, type Combination } from '../../../lib/combination';
import { getCharacter } from '../../../lib/characters';
import { getCombinationText } from '../../../lib/content';
import { renderResultPng, resultCardFor } from '../../../lib/og';

export const getStaticPaths = (() => COMBINATIONS.map((c) => ({ params: { slug: c.slug }, props: { c } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { c } = props as { c: Combination };
  const png = await renderResultPng(resultCardFor(c, getCharacter, getCombinationText(c.slug)), 'story');
  return new Response(png as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'image/png' } });
};
