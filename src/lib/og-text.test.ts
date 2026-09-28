import { describe, expect, it } from 'vitest';
import { fitFontSize, splitPhrases, textUnits, wrapJapanese } from './og-text';

describe('OGP画像の改行', () => {
  it('文字の幅を数える（全角1、半角0.6、空白0.3）', () => {
    expect(textUnits('彗星')).toBe(2);
    expect(textUnits('16')).toBeCloseTo(1.2);
    expect(textUnits('月 × かに座')).toBeCloseTo(5.6);
  });

  it('1行に収まる文字サイズを上限・下限の範囲で選ぶ', () => {
    expect(fitFontSize('月 × かに座', 700, 80, 56)).toBe(80);
    expect(fitFontSize('オーロラ × みずがめ座', 708, 80, 56)).toBe(66);
    expect(fitFontSize('あ'.repeat(40), 708, 80, 56)).toBe(56);
  });

  it('句読点・閉じかっこは前の文節に、開きかっこは次の文節につける', () => {
    const phrases = splitPhrases('ふと「サンプル」と書いたら、もう読み始めている。');
    expect(phrases.some((p) => /^[、。」]/.test(p))).toBe(false);
    expect(phrases.some((p) => /「$/.test(p))).toBe(false);
    expect(phrases.join('')).toBe('ふと「サンプル」と書いたら、もう読み始めている。');
    expect(phrases).toContain('読み始めている。');
  });

  it('文節の間で折り、最後の行に1〜2文字だけ残さない', () => {
    const text = 'サンプルの文章を読んで、誰にも見せない「ひみつ」を大切にする人。';
    const lines = wrapJapanese(text, 20);
    expect(lines.join('')).toBe(text);
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(textUnits(line)).toBeLessThanOrEqual(20);
    expect(Math.min(...lines.map((l) => [...l].length))).toBeGreaterThan(10);
    for (const line of lines.slice(1)) expect(line).not.toMatch(/^[、。」）！？]/);
  });

  it('カタカナ語・複合動詞・閉じかっこのあとの助詞は切らない', () => {
    const phrases = splitPhrases('「なるほど！」と思ったら、ゼロからでも地図を書き上げて、すっかり考え込む人。');
    expect(phrases).toContain('「なるほど！」と');
    expect(phrases.some((p) => p.includes('ゼロ'))).toBe(true);
    expect(phrases.some((p) => p.includes('書き上げて'))).toBe(true);
    expect(phrases.some((p) => p.includes('考え込む'))).toBe(true);
    expect(splitPhrases('気づけばサンプルの主役')).toEqual(['気づけば', 'サンプルの', '主役']);
  });

  it('1行に収まらない長い語は文字の途中で折る', () => {
    const lines = wrapJapanese('あ'.repeat(5) + '漢'.repeat(30), 10);
    expect(lines.join('')).toBe('あ'.repeat(5) + '漢'.repeat(30));
    for (const line of lines) expect(textUnits(line)).toBeLessThanOrEqual(10);
  });

  it('短い文は1行のまま', () => {
    expect(wrapJapanese('サンプルのかたまり。', 20)).toEqual(['サンプルのかたまり。']);
  });
});
