import fs from 'node:fs';
import { getColumns } from './articles';
import { GLOSSARY_JSON } from './paths';
import { describe, expect, it } from 'vitest';
import { getGlossary, groupByRow, kanaRow, parseGlossary, termAnchor, toHiragana } from './glossary';

describe('用語集', () => {
  it('五十音順に並べ、アンカーは用語そのもの', () => {
    const { entries, warnings } = parseGlossary({
      terms: [
        { term: '守護星', reading: 'しゅごせい', body: 'A\nB', related: ['guardian-and-ruler'] },
        { term: 'エレメント', reading: 'エレメント', body: 'C' },
        { term: '重なり星', reading: 'かさなりぼし', body: 'D', related: [] },
      ],
    });
    expect(warnings).toEqual([]);
    expect(entries.map((t) => t.term)).toEqual(['エレメント', '重なり星', '守護星']);
    expect(entries[2]).toMatchObject({ anchor: '守護星', paragraphs: ['A', 'B'], related: ['guardian-and-ruler'] });
    expect(entries[0].reading).toBe('えれめんと');
  });

  it('term・body が無いもの、重複は警告して読み飛ばす。形が違えば空', () => {
    const { entries, warnings } = parseGlossary({
      terms: [{ term: 'A', reading: 'えー', body: 'x' }, { term: 'A', reading: 'えー', body: 'y' }, { term: 'B' }],
    });
    expect(entries).toHaveLength(1);
    expect(warnings).toHaveLength(2);
    expect(parseGlossary('broken').entries).toEqual([]);
  });

  it('行の見出し（濁音・小さい字・カタカナも）', () => {
    expect(kanaRow('ぎょうざ')).toBe('か行');
    expect(kanaRow('ぱ')).toBe('は行');
    expect(kanaRow('ヴィ')).toBe('あ行');
    expect(kanaRow('ABC')).toBe('英数');
    expect(toHiragana('シュゴセイ')).toBe('しゅごせい');
    expect(termAnchor('境目 の日')).toBe('境目-の日');
  });

  it('行ごとに分ける', () => {
    const { entries } = parseGlossary({
      terms: [
        { term: 'い', reading: 'い', body: 'x' },
        { term: 'あ', reading: 'あ', body: 'x' },
        { term: 'か', reading: 'か', body: 'x' },
      ],
    });
    expect(groupByRow(entries).map((g) => [g.row, g.terms.length])).toEqual([['あ行', 2], ['か行', 1]]);
  });

  it('原本が無くても・あっても例外にならない', () => {
    expect(Array.isArray(getGlossary())).toBe(true);
  });
});

describe.runIf(fs.existsSync(GLOSSARY_JSON))('12_用語集.json（サンプルデータ）', () => {
  it('警告なしで読め、関連記事はすべて実在する読みもの', () => {
    const { entries, warnings } = parseGlossary(JSON.parse(fs.readFileSync(GLOSSARY_JSON, 'utf-8')));
    expect(warnings).toEqual([]);
    expect(entries.length).toBeGreaterThan(0);
    const slugs = new Set(getColumns().map((c) => c.slug));
    for (const t of entries) for (const r of t.related) expect(slugs.has(r), `${t.term} → ${r}`).toBe(true);
  });
});
