// 広告部分の「チラ見せ」。冒頭だけを読めるようにし、続きはぼかして表示する（components/RewardGate.astro）。

export interface Teaser {
  /** そのまま読める冒頭 */
  visible: string;
  /** ぼかして見せる続き */
  blurred: string;
}

/**
 * 冒頭の1文を読める部分にする。1文が長すぎるときは maxVisible 文字で切る。
 * 続きが短すぎると「ぼかしの意味がない」ので、そのときも maxVisible で切る。
 */
export function makeTeaser(text: string, maxVisible = 60, minBlurred = 40): Teaser {
  const end = text.indexOf('。');
  let cut = end >= 0 && end + 1 <= maxVisible ? end + 1 : maxVisible;
  if (text.length - cut < minBlurred) cut = Math.max(0, Math.min(cut, text.length - minBlurred));
  return { visible: text.slice(0, cut), blurred: text.slice(cut) };
}
