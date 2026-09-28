// ブラウザ側：リンクのシェア（招待リンクなど）。Web Share API があればそれを使い、
// 無ければクリップボードにコピーして、Xでポストするリンクを出す。
import { xIntentUrl } from './match';

export interface ShareFallback {
  /** Web Share が無いときに表示する箱（hidden を外す） */
  box: HTMLElement;
  /** 「コピーしました」などを出す場所 */
  status: HTMLElement;
  /** Xでポストするリンク */
  x: HTMLAnchorElement;
}

export async function shareLink(text: string, url: string, fallback: ShareFallback): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return;
    } catch (e) {
      // キャンセルされたら何もしない。それ以外の失敗はコピーに切り替える
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  fallback.x.href = xIntentUrl(text, url);
  fallback.box.hidden = false;
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    fallback.status.textContent = 'リンクをコピーしました。LINEやDMに貼りつけて送ってね。';
  } catch {
    fallback.status.textContent = '下のリンクをコピーして、友達に送ってね。';
  }
}
