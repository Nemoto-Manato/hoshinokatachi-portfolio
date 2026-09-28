import { describe, expect, it } from 'vitest';
import { makeTeaser } from './teaser';

describe('makeTeaser', () => {
  const long = 'あ'.repeat(200);

  it('冒頭の1文だけを読める部分にする', () => {
    const text = `恋愛では慎重なタイプです。${long}`;
    expect(makeTeaser(text)).toEqual({ visible: '恋愛では慎重なタイプです。', blurred: long });
  });

  it('1文が長すぎるときは maxVisible 文字で切る', () => {
    const t = makeTeaser(long, 60);
    expect(t.visible).toHaveLength(60);
    expect(t.visible + t.blurred).toBe(long);
  });

  it('続きが短すぎるときは、ぼかす部分を minBlurred 文字残す', () => {
    const text = `${'い'.repeat(50)}。${'う'.repeat(10)}`;
    const t = makeTeaser(text, 60, 40);
    expect(t.blurred.length).toBe(40);
    expect(t.visible + t.blurred).toBe(text);
  });

  it('実際の文言の長さ（210〜290字）では、冒頭は60字以内・続きは150字以上', () => {
    const text = `${'か'.repeat(30)}。${'き'.repeat(220)}`;
    const t = makeTeaser(text);
    expect(t.visible.length).toBeLessThanOrEqual(60);
    expect(t.blurred.length).toBeGreaterThanOrEqual(150);
  });
});
