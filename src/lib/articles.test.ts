import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { countChars, DuplicateSlugError, getColumns, mergeColumnFiles, parseColumns, parseSectionsByKey, sortColumnFiles, toParagraphs } from './articles';
import { COLUMNS_JSON, SIGN_ARTICLES_JSON, TYPE_ARTICLES_JSON } from './paths';
import { SIGNS } from './signs';
import { TYPES } from './types';

const TYPE_SLUGS = TYPES.map((t) => t.slug);
const SIGN_IDS = SIGNS.map((s) => s.id);

describe('toParagraphs', () => {
  it('改行で段落に分け、空行は捨てる', () => {
    expect(toParagraphs('一つめ。\n\n二つめ。\n  \n三つめ。')).toEqual(['一つめ。', '二つめ。', '三つめ。']);
  });
});

describe('parseSectionsByKey', () => {
  it('slug ごとの見出しと段落にする。_note は無視する', () => {
    const { entries, warnings } = parseSectionsByKey(
      { _note: 'メモ', polaris: { sections: [{ heading: 'どんないきもの？', body: 'A\nB' }] } },
      ['polaris'],
      'x.json',
    );
    expect(warnings).toEqual([]);
    expect(entries.get('polaris')).toEqual([{ heading: 'どんないきもの？', paragraphs: ['A', 'B'] }]);
  });

  it('不明なキー・欠けた見出し・本文の無い slug は警告して読み飛ばす', () => {
    const { entries, warnings } = parseSectionsByKey(
      { pluto: { sections: [] }, polaris: { sections: [{ heading: '', body: 'A' }, { heading: '見出し', body: 'B' }] } },
      ['polaris', 'nebula'],
      'x.json',
    );
    expect(entries.get('polaris')).toEqual([{ heading: '見出し', paragraphs: ['B'] }]);
    expect(entries.has('nebula')).toBe(false);
    expect(warnings).toHaveLength(3);
  });

  it('オブジェクトでなければ空（ビルドは止めない）', () => {
    expect(parseSectionsByKey([], ['polaris'], 'x.json').entries.size).toBe(0);
  });
});

describe('parseColumns', () => {
  it('slug・title・description・本文を読む。description が無ければ本文の冒頭を使う', () => {
    const { entries, warnings } = parseColumns([
      { slug: 'about-16types', title: 'タイトル', description: '説明', sections: [{ heading: 'H', body: '本文' }] },
      { slug: 'no-desc', title: 'T2', sections: [{ heading: 'H', body: '冒頭の段落' }] },
    ]);
    expect(warnings).toEqual([]);
    expect(entries.map((c) => c.slug)).toEqual(['about-16types', 'no-desc']);
    expect(entries[1].description).toBe('冒頭の段落');
  });

  it('不正な slug・本文なしは読み飛ばす', () => {
    const ok = { heading: 'H', body: 'B' };
    const { entries, warnings } = parseColumns([
      { slug: 'Bad Slug', title: 'T', sections: [ok] },
      { slug: 'a', title: 'T', sections: [ok] },
      { slug: 'b', title: 'T', sections: [] },
    ]);
    expect(entries.map((c) => c.slug)).toEqual(['a']);
    expect(warnings).toHaveLength(2);
  });

  it('slug の重複はエラー（URL がぶつかるのでビルドを止める）', () => {
    const ok = { heading: 'H', body: 'B' };
    expect(() => parseColumns([{ slug: 'a', title: 'T', sections: [ok] }, { slug: 'a', title: 'T', sections: [ok] }])).toThrow(
      DuplicateSlugError,
    );
  });
});

describe('複数ファイルの読みもの', () => {
  const ok = [{ heading: 'H', body: 'B' }];

  it('09_読みもの.json を先に、あとはファイル名の順。ほかのファイルは無視する', () => {
    expect(sortColumnFiles(['09_読みもの_c.json', '10_図鑑.json', '09_読みもの.json', '09_読みもの_b.json', '09_読みもの.bak'])).toEqual([
      '09_読みもの.json',
      '09_読みもの_b.json',
      '09_読みもの_c.json',
    ]);
  });

  it('ファイルの順につなげる。壊れたファイルは警告して読み飛ばす', () => {
    const { entries, warnings } = mergeColumnFiles([
      { label: '09.json', data: [{ slug: 'a', title: 'A', sections: ok }] },
      { label: '09_b.json', data: 'broken' },
      { label: '09_c.json', data: [{ slug: 'b', title: 'B', sections: ok }] },
    ]);
    expect(entries.map((c) => c.slug)).toEqual(['a', 'b']);
    expect(warnings).toHaveLength(1);
  });

  it('ファイルをまたいだ slug の重複はエラー（どのファイルかを出す）', () => {
    expect(() =>
      mergeColumnFiles([
        { label: '09.json', data: [{ slug: 'a', title: 'A', sections: ok }] },
        { label: '09_b.json', data: [{ slug: 'a', title: 'A2', sections: ok }] },
      ]),
    ).toThrow(/09\.json、09_b\.json/);
  });

  it('実際の文章データ（sample-data/）から読める（重複なし）', () => {
    expect(() => getColumns()).not.toThrow();
  });
});

// 文章データ（公開用リポジトリではダミーの sample-data/）。ファイルがあるときだけ、形を確かめる。
// 本番の原本では、見出しの数と文字数（タイプ・星座は1,300字以上、読みものは1,500字以上）もここで確かめている。
describe.runIf(fs.existsSync(TYPE_ARTICLES_JSON))('07_タイプ解説.json（サンプルデータ）', () => {
  it('書かれているタイプは見出しと段落が読め、無いタイプは本文なし', () => {
    const { entries } = parseSectionsByKey(JSON.parse(fs.readFileSync(TYPE_ARTICLES_JSON, 'utf-8')), TYPE_SLUGS, '07');
    expect(entries.size).toBeGreaterThan(0);
    for (const [slug, sections] of entries) {
      expect(sections.length, slug).toBeGreaterThan(0);
      for (const s of sections) expect(s.paragraphs.length, slug).toBeGreaterThan(0);
    }
  });
});

describe.runIf(fs.existsSync(SIGN_ARTICLES_JSON))('08_星座解説.json（サンプルデータ）', () => {
  it('書かれている星座は本文が読める', () => {
    const { entries } = parseSectionsByKey(JSON.parse(fs.readFileSync(SIGN_ARTICLES_JSON, 'utf-8')), SIGN_IDS, '08');
    expect(entries.size).toBeGreaterThan(0);
    for (const [id, sections] of entries) expect(countChars(sections), id).toBeGreaterThan(0);
  });
});

describe.runIf(fs.existsSync(COLUMNS_JSON))('09_読みもの.json（サンプルデータ）', () => {
  it('読みものが警告なしで読める', () => {
    const { entries, warnings } = parseColumns(JSON.parse(fs.readFileSync(COLUMNS_JSON, 'utf-8')));
    expect(warnings).toEqual([]);
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe('09_読みもの*.json（すべてのファイル）', () => {
  it('slug が重複せず、どの記事にも本文がある', () => {
    const columns = getColumns();
    expect(new Set(columns.map((c) => c.slug)).size).toBe(columns.length);
    for (const c of columns) expect(countChars(c.sections), c.slug).toBeGreaterThan(0);
  });
});
