// 相性カードの横長（1200×630）：/og/aisho/{a}-{b}.png（いきもの同士 136 組）。a・b は TYPES の並び順（lib/match.ts の aishoCardSlug）。
import type { APIRoute, GetStaticPaths } from 'astro';
import { getAisho } from '../../../lib/aisho';
import { getCharacter } from '../../../lib/characters';
import { aishoCardSlug, allTypePairs } from '../../../lib/match';
import { aishoCardFor, renderAishoPng, type AishoCard } from '../../../lib/og-aisho';

export const getStaticPaths = (() =>
  allTypePairs().flatMap(([a, b]) => {
    const card = aishoCardFor(a, b, getAisho(), getCharacter);
    return card ? [{ params: { pair: aishoCardSlug(a, b) }, props: { card } }] : [];
  })) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderAishoPng((props as { card: AishoCard }).card, 'landscape');
  return new Response(png as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'image/png' } });
};
