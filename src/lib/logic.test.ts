import { describe, expect, it } from 'vitest';
import { COMBINATIONS } from './combination';
import { QUESTIONS, DISPLAY_ORDER, scoreTypeCode } from './quiz';
import { SIGNS } from './signs';
import { TYPES } from './types';
import { MAX_YEAR, MIN_YEAR, zodiacFromDate } from './zodiac';

describe('zodiacFromDate', () => {
  it('判定が確定する日', () => {
    expect(zodiacFromDate(2024, 3, 21)).toEqual({ kind: 'fixed', sign: 'aries' });
    expect(zodiacFromDate(1990, 11, 1)).toEqual({ kind: 'fixed', sign: 'scorpio' });
    expect(zodiacFromDate(2000, 7, 1)).toEqual({ kind: 'fixed', sign: 'cancer' });
  });

  it('1月前半は前年から続くやぎ座', () => {
    expect(zodiacFromDate(1990, 1, 1)).toEqual({ kind: 'fixed', sign: 'capricorn' });
    expect(zodiacFromDate(MIN_YEAR, 1, 5)).toEqual({ kind: 'fixed', sign: 'capricorn' });
  });

  it('12月後半はやぎ座', () => {
    expect(zodiacFromDate(MAX_YEAR, 12, 31)).toEqual({ kind: 'fixed', sign: 'capricorn' });
  });

  it('境目の日は候補を2つ返す（2024年春分は12:03なので、提案はうお座）', () => {
    expect(zodiacFromDate(2024, 3, 20)).toEqual({
      kind: 'cusp', before: 'pisces', after: 'aries', suggested: 'pisces', changesAt: '12:03',
    });
  });

  it('範囲外や存在しない日付は null', () => {
    expect(zodiacFromDate(MIN_YEAR - 1, 6, 1)).toBeNull();
    expect(zodiacFromDate(MAX_YEAR + 1, 6, 1)).toBeNull();
    expect(zodiacFromDate(2023, 2, 29)).toBeNull();
    expect(zodiacFromDate(2024, 13, 1)).toBeNull();
  });

  it('全期間で判定でき、境目の日は約3%', () => {
    let days = 0;
    let cusps = 0;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= 31; d++) {
          const r = zodiacFromDate(y, m, d);
          if (r === null) continue;
          days++;
          if (r.kind === 'cusp') cusps++;
        }
      }
    }
    expect(cusps / days).toBeGreaterThan(0.03);
    expect(cusps / days).toBeLessThan(0.035);
  });
});

describe('scoreTypeCode', () => {
  const answerAll = (f: (pole: string) => number) =>
    Object.fromEntries(QUESTIONS.map((q) => [q.id, f(q.pole)]));

  it('すべて「とてもそう思う」なら、設問数の多い側（ESTJ）', () => {
    expect(scoreTypeCode(answerAll(() => 2))).toBe('ESTJ');
  });

  it('I・N・F・Pの設問にだけ同意すると INFP', () => {
    expect(scoreTypeCode(answerAll((p) => ('INFP'.includes(p) ? 2 : -2)))).toBe('INFP');
  });

  it('すべて「どちらでもない」なら＋側', () => {
    expect(scoreTypeCode(answerAll(() => 0))).toBe('ESTJ');
  });

  it('16タイプすべてに到達できる', () => {
    for (const t of TYPES) {
      expect(scoreTypeCode(answerAll((p) => (t.code.includes(p) ? 2 : -2)))).toBe(t.code);
    }
  });

  it('未回答があるとエラー', () => {
    expect(() => scoreTypeCode({ 1: 2 })).toThrow();
  });

  it('表示順はすべての設問を1回ずつ含む', () => {
    expect([...DISPLAY_ORDER].sort((a, b) => a - b)).toEqual(QUESTIONS.map((q) => q.id));
  });
});

describe('マスターデータと組み合わせ', () => {
  it('16タイプ・12星座・192通り、slugの重複なし', () => {
    expect(TYPES).toHaveLength(16);
    expect(SIGNS).toHaveLength(12);
    expect(COMBINATIONS).toHaveLength(192);
    expect(new Set(COMBINATIONS.map((c) => c.slug)).size).toBe(192);
    expect(new Set(TYPES.map((t) => t.code)).size).toBe(16);
  });

  it('重なり星は11通り（D-006）', () => {
    const overlaps = COMBINATIONS.filter((c) => c.overlap).map((c) => c.slug);
    expect(overlaps).toHaveLength(11);
    expect(overlaps).toContain('mars-aries');
    expect(overlaps).toContain('moon-cancer');
    expect(overlaps).toContain('mercury-gemini');
    expect(overlaps).toContain('mercury-virgo');
  });
});
