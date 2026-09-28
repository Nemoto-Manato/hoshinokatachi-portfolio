// 相性診断の共通のOGP画像（/og/aisho/default.png）。招待ページ・相性ページで使う（どちらもクエリで中身が変わる静的な1ページのため）。
import type { APIRoute } from 'astro';
import { renderAishoDefaultPng } from '../../../lib/og-aisho';

export const GET: APIRoute = async () => {
  const png = await renderAishoDefaultPng();
  return new Response(png as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'image/png' } });
};
