// トップ・タイプ・星座ページなどで共通に使うOGP画像（/og/default.png）。
import type { APIRoute } from 'astro';
import { renderDefaultPng } from '../../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderDefaultPng();
  return new Response(png as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'image/png' } });
};
