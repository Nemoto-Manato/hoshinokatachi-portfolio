// ブラウザ側：/shindan/ と /select/ で ?with=…（相性診断の招待）を読んで、案内を出す（components/WithBanner.astro）。
// 不正な slug は無視して、ふつうの診断にする。
import { characterSrc } from './assets';
import { getSign } from './signs';
import { readWith, selectPath, shindanPath, type ResultRef } from './match';

export function setupWith(): ResultRef | undefined {
  const ref = readWith(location.search);
  if (!ref) return undefined;
  let names: Record<string, string> = {};
  try {
    names = JSON.parse(document.getElementById('with-names')?.textContent ?? '{}');
  } catch {
    // 名前が読めなくても続ける
  }
  const title = `${getSign(ref.signId)?.name ?? ''}の ${names[ref.typeSlug] ?? ''}`;
  const banner = document.getElementById('with-banner');
  if (banner) {
    document.getElementById('with-banner-title')!.textContent = title;
    const img = document.getElementById('with-banner-image') as HTMLImageElement;
    img.src = characterSrc(ref.typeSlug);
    banner.hidden = false;
  }
  // 「タイプを選ぶだけ」「診断する」のリンクにも with を引き継ぐ
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-keep-with]')) {
    a.href = a.dataset.keepWith === 'select' ? selectPath(ref.slug) : shindanPath(ref.slug);
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-with-label]')) {
    b.textContent = b.dataset.withLabel ?? b.textContent;
  }
  return ref;
}
