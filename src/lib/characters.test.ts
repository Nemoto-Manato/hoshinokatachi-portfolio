import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildCharacters, FALLBACK_THEME, getCharacter, getCharacters, mixHex, parseCharactersFile, parseSummaryMarkdown, parseThemeColorsFile,
  PLACEHOLDER_ARUARU, resultTitle, themeFromMain,
} from './characters';
import { characterAlt } from './assets';
import { CHARACTERS_JSON, TYPE_SUMMARY_MD } from './paths';
import { TYPES } from './types';

const HEX6 = /^#[0-9a-f]{6}$/;
const sample = (overrides: Record<string, unknown> = {}) => ({
  slug: 'sun', code: 'ENTJ', name: 'いきもの3', animal: 'どうぶつ3', guardian: '太陽',
  concept: 'サンプルのコンセプト', aruaru: ['サンプルのあるある', 'b', 'c'], ...overrides,
});

describe('parseCharactersFile（02_content/06_キャラクター.json）', () => {
  it('名前・動物・あるあるを読む', () => {
    const { entries, warnings } = parseCharactersFile({ characters: [sample()] });
    expect(warnings).toEqual([]);
    expect(entries.get('sun')).toEqual({ name: 'いきもの3', animal: 'どうぶつ3', concept: 'サンプルのコンセプト', aruaru: ['サンプルのあるある', 'b', 'c'] });
  });

  it('あるあるが3つ未満なら入れない（仮のあるあるを使う）。4つ以上なら先頭3つ', () => {
    expect(parseCharactersFile({ characters: [sample({ aruaru: [] })] }).entries.get('sun')!.aruaru).toBeUndefined();
    expect(parseCharactersFile({ characters: [sample({ aruaru: ['a', ' ', 'b'] })] }).entries.get('sun')!.aruaru).toBeUndefined();
    expect(parseCharactersFile({ characters: [sample({ aruaru: ['a', 'b', 'c', 'd'] })] }).entries.get('sun')!.aruaru).toEqual(['a', 'b', 'c']);
  });

  it('不正な slug・名前なし・code の不一致は警告する', () => {
    const r = parseCharactersFile({ characters: [sample({ slug: 'pluto' }), sample({ slug: 'moon', name: '' }), sample({ code: 'INTJ' })] });
    expect([...r.entries.keys()]).toEqual(['sun']);
    expect(r.warnings.some((w) => w.includes('pluto'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('moon'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('code'))).toBe(true);
    expect(parseCharactersFile([]).warnings).toHaveLength(1);
  });
});

describe('parseThemeColorsFile（03_design/assets/theme-colors.json）', () => {
  it('デザイン部の形式 { slug: { main, sub, ink } } を読む', () => {
    const { entries, warnings } = parseThemeColorsFile({ _note: 'x', sun: { main: '#FFAA00', sub: '#ffe0a0', ink: '#222222' } });
    expect(warnings).toEqual([]);
    expect(entries.get('sun')).toMatchObject({ main: '#ffaa00', sub: '#ffe0a0', ink: '#222222' });
    expect(entries.get('sun')!.dark).toMatch(HEX6);
  });

  it('色だけ・配列・入れ子の形式も読み、足りない色は補う', () => {
    expect(parseThemeColorsFile({ sun: '#fa0' }).entries.get('sun')!.main).toBe('#ffaa00');
    expect(parseThemeColorsFile({ colors: [{ slug: 'moon', primary: '#112233' }] }).entries.get('moon')!.main).toBe('#112233');
    const t = parseThemeColorsFile({ types: { comet: { main: '#ff9fc6' } } }).entries.get('comet')!;
    expect(t.sub).toMatch(HEX6);
    expect(t.ink).toMatch(HEX6);
  });

  it('不明な slug・色でない値は警告して読み飛ばす', () => {
    const r = parseThemeColorsFile({ pluto: '#ffffff', sun: 'orange' });
    expect(r.entries.size).toBe(0);
    expect(r.warnings).toHaveLength(2);
  });
});

describe('buildCharacters', () => {
  it('原本が無ければ、守護星の名前・仮のあるある・仮の色にフォールバックする（ビルドを止めない）', () => {
    const { characters, warnings, stats } = buildCharacters({});
    expect(characters).toHaveLength(16);
    expect(stats).toEqual({ names: 0, aruaru: 0, themes: 0, summaries: 0 });
    expect(warnings.length).toBeGreaterThan(0);
    const sun = characters.find((c) => c.slug === 'sun')!;
    expect(sun.name).toBe('太陽');
    expect(sun.aruaru).toEqual(PLACEHOLDER_ARUARU.sun);
    expect(sun.aruaruPlaceholder).toBe(true);
    expect(sun.theme.main).toBe(FALLBACK_THEME.sun);
  });

  it('原本があれば使う', () => {
    const { characters, stats } = buildCharacters({ characters: { characters: [sample()] }, themeColors: { sun: { main: '#123456' } } });
    const sun = characters.find((c) => c.slug === 'sun')!;
    expect(sun.name).toBe('いきもの3');
    expect(sun.aruaruPlaceholder).toBe(false);
    expect(sun.theme.main).toBe('#123456');
    expect(stats).toEqual({ names: 1, aruaru: 1, themes: 1, summaries: 0 });
  });

  it('仮のあるある・仮の色は16タイプすべてにある', () => {
    for (const t of TYPES) {
      expect(PLACEHOLDER_ARUARU[t.slug], t.slug).toHaveLength(3);
      expect(FALLBACK_THEME[t.slug], t.slug).toMatch(HEX6);
    }
  });
});

describe('実際の文章データ（sample-data/）から組み立てたキャラクター', () => {
  it('16タイプ・slug は変わらず、あるある3つとテーマカラーを持つ', () => {
    const chars = getCharacters();
    expect(chars.map((c) => c.slug)).toEqual(TYPES.map((t) => t.slug));
    for (const c of chars) {
      expect(c.aruaru, c.slug).toHaveLength(3);
      expect(c.theme.main, c.slug).toMatch(HEX6);
      expect(c.guardian).toBe(TYPES.find((t) => t.slug === c.slug)!.guardian);
    }
  });

  it.runIf(fs.existsSync(CHARACTERS_JSON))('06_キャラクター.json の名前を使う（sun＝いきもの3、守護星は太陽）', () => {
    const sun = getCharacter('sun');
    expect(sun.name).toBe('いきもの3');
    expect(sun.animal).toBe('どうぶつ3');
    expect(sun.guardian).toBe('太陽');
    expect(resultTitle(sun, 'しし座')).toBe('しし座の いきもの3');
    expect(characterAlt(sun)).toBe('いきもの3のキャラクター');
  });

  it('知らない slug は例外', () => {
    expect(() => getCharacter('pluto')).toThrow();
  });
});

describe('色の計算', () => {
  it('mixHex / themeFromMain', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(themeFromMain('#abc').main).toBe('#aabbcc');
  });
});

describe('タイプ概要文（02_content/05_タイプ概要_draft.md）', () => {
  const md = [
    '# 16タイプの概要文', '', '説明', '', '---', '',
    '### いきもの3（ENTJ）― 守護星：太陽', 'サンプルの概要文の1行目、', '2行目です。', '',
    '### いきもの1（INTJ）― 守護星：北極星', '', 'サンプルの概要文です。', '',
    '### 空（ISFJ）', '',
  ].join('\n');

  it('見出しの4文字コードと次の段落を読む（複数行はつなげる）', () => {
    const { entries, warnings } = parseSummaryMarkdown(md);
    expect(entries.get('ENTJ')).toBe('サンプルの概要文の1行目、2行目です。');
    expect(entries.get('INTJ')).toBe('サンプルの概要文です。');
    expect(warnings).toEqual(['ISFJ の概要文が空']);
  });

  it('あるタイプは新しい概要文、無いタイプは types.ts の旧い概要文', () => {
    const { characters, stats, warnings } = buildCharacters({ summaries: md });
    expect(characters.find((c) => c.slug === 'sun')!.summary).toBe('サンプルの概要文の1行目、2行目です。');
    expect(characters.find((c) => c.slug === 'moon')!.summary).toBe(TYPES.find((t) => t.slug === 'moon')!.summary);
    expect(stats.summaries).toBe(2);
    expect(warnings).toContain('05_タイプ概要_draft.md: ISFJ が無い（旧い概要文を使う）');
  });

  it.skipIf(!fs.existsSync(TYPE_SUMMARY_MD))('文章データから16タイプすべての概要文が読め、キャラ名が入っている', () => {
    const { entries, warnings } = parseSummaryMarkdown(fs.readFileSync(TYPE_SUMMARY_MD, 'utf-8'));
    expect(warnings).toEqual([]);
    for (const t of TYPES) {
      expect(entries.get(t.code), t.code).toBeTruthy();
      expect(getCharacter(t.slug).summary).toBe(entries.get(t.code));
    }
    expect(getCharacter('sun').summary).toContain('いきもの3');
  });
});
