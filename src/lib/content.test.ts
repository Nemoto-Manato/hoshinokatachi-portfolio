import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COMBINATIONS } from './combination';
import { loadCombinationTexts, parseCombinationFile } from './combination-texts';
import { COMBINATIONS_DIR } from './paths';

const entry = (sign: string, overrides: Record<string, unknown> = {}) => ({
  sign,
  nickname: 'サンプルの呼び名',
  hitokoto: '一度決めた目標は、誰にも言わずにたどり着く人。',
  basic: '基本の性格',
  love: '恋愛',
  work: '仕事',
  relationships: '人間関係',
  compatible: [
    { type: 'comet', sign: 'leo', reason: '理由1' },
    { type: 'moon', sign: 'cancer', reason: '理由2' },
    { type: 'milky-way', sign: 'pisces', reason: '理由3' },
  ],
  growth: '伸びしろ',
  ...overrides,
});

describe('parseCombinationFile', () => {
  it('無料部分・広告部分・相性TOP3を変換する', () => {
    const { texts, warnings } = parseCombinationFile({ type: 'polaris', combinations: [entry('scorpio')] }, 'polaris.json');
    expect(warnings).toEqual([]);
    const t = texts.get('polaris-scorpio')!;
    expect(t.nickname).toBe('サンプルの呼び名');
    expect(t.basic).toBe('基本の性格');
    expect(t.growth).toBe('伸びしろ');
    expect(t.compatible).toEqual([
      { slug: 'comet-leo', typeSlug: 'comet', signId: 'leo', label: 'しし座の 彗星', reason: '理由1' },
      { slug: 'moon-cancer', typeSlug: 'moon', signId: 'cancer', label: 'かに座の 月', reason: '理由2' },
      { slug: 'milky-way-pisces', typeSlug: 'milky-way', signId: 'pisces', label: 'うお座の 天の川', reason: '理由3' },
    ]);
  });

  it('相性の相手の表示名は labelOf で変えられる（ビルドではキャラ名）', () => {
    const { texts } = parseCombinationFile({ type: 'polaris', combinations: [entry('scorpio')] }, 'polaris.json', (t, s) => `${s.name}の ${t.slug}!`);
    expect(texts.get('polaris-scorpio')!.compatible[0].label).toBe('しし座の comet!');
  });

  it('制作途中（項目が足りない）の組み合わせは読み飛ばし、他は使う', () => {
    const { texts, warnings } = parseCombinationFile(
      { type: 'comet', combinations: [entry('aries'), entry('taurus', { love: '' }), { sign: 'gemini', nickname: 'だけ' }] },
      'comet.json',
    );
    expect([...texts.keys()]).toEqual(['comet-aries']);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('love');
  });

  it('不正な相性の相手は除き、件数が3件でなければ警告する', () => {
    const { texts, warnings } = parseCombinationFile(
      { type: 'comet', combinations: [entry('leo', { compatible: [{ type: 'pluto', sign: 'leo', reason: 'x' }, { type: 'sun', sign: 'aries', reason: 'ok' }] })] },
      'comet.json',
    );
    expect(texts.get('comet-leo')!.compatible.map((m) => m.slug)).toEqual(['sun-aries']);
    expect(warnings.some((w) => w.includes('1 件'))).toBe(true);
  });

  it('type が不正・ファイル名と不一致・星座の重複', () => {
    expect(parseCombinationFile({ type: 'pluto', combinations: [] }, 'pluto.json').texts.size).toBe(0);
    expect(parseCombinationFile({ type: 'comet', combinations: [entry('leo')] }, 'moon.json').texts.size).toBe(0);
    expect(parseCombinationFile([], 'comet.json').warnings).toHaveLength(1);
    const dup = parseCombinationFile({ type: 'comet', combinations: [entry('leo'), entry('leo', { nickname: '2つ目' })] }, 'comet.json');
    expect(dup.texts.get('comet-leo')!.nickname).toBe('サンプルの呼び名');
    expect(dup.warnings).toHaveLength(1);
  });
});

describe('loadCombinationTexts', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'combinations-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('ディレクトリ内のJSONをまとめて読み、壊れたファイルは警告して読み飛ばす', () => {
    fs.writeFileSync(path.join(dir, 'comet.json'), JSON.stringify({ type: 'comet', combinations: [entry('leo')] }));
    fs.writeFileSync(path.join(dir, 'moon.json'), JSON.stringify({ type: 'moon', combinations: [entry('cancer')] }));
    fs.writeFileSync(path.join(dir, 'sun.json'), '{ "type": "sun", "combinations": [');
    fs.writeFileSync(path.join(dir, 'README.md'), '# not json');
    const { texts, warnings } = loadCombinationTexts(dir);
    expect([...texts.keys()].sort()).toEqual(['comet-leo', 'moon-cancer']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('sun.json');
  });

  it('ディレクトリが無ければ空（ビルドを止めない）', () => {
    const { texts, warnings } = loadCombinationTexts(path.join(dir, 'missing'));
    expect(texts.size).toBe(0);
    expect(warnings).toHaveLength(1);
  });

  it('実際の文章データの置き場（sample-data/combinations）を指していて、読み込みで例外が起きない', () => {
    expect(COMBINATIONS_DIR.endsWith(path.join('sample-data', 'combinations'))).toBe(true);
    const { texts } = loadCombinationTexts(COMBINATIONS_DIR);
    const slugs = new Set(COMBINATIONS.map((c) => c.slug));
    for (const slug of texts.keys()) expect(slugs.has(slug)).toBe(true);
  });
});

