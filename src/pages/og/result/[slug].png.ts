// 結果カードの横長（1200×630、OGP）：/og/result/{slug}.png（192枚）。ビルド時に静的なPNGとして出力する。
import type { APIRoute, GetStaticPaths } from 'astro';
import { COMBINATIONS, type Combination } from '../../../lib/combination';
import { getCharacter } from '../../../lib/characters';
import { getCombinationText } from '../../../lib/content';
import { renderResultPng, resultCardFor } from '../../../lib/og';

export const getStaticPaths = (() => COMBINATIONS.map((c) => ({ params: { slug: c.slug }, props: { c } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { c } = props as { c: Combination };
  const png = await renderResultPng(resultCardFor(c, getCharacter, getCombinationText(c.slug)), 'landscape');
  return new Response(png as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'image/png' } });
};
