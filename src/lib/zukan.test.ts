import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { altCharacterSrc, getZukan, parseZukan } from './zukan';
import { ZUKAN_JSON } from './paths';

const full = {
  habitat: '夜の森',
  likes: ['本', '計画', '静けさ'],
  dislikes: ['行列', '騒音', '急な予定'],
  kuchiguse: 'つまり、こういうこと',
  recovery: 'ひとりで散歩',
  buddy: { slug: 'sun', reason: '決めたらすぐ動いてくれる' },
  trivia: '夜のほうが元気',
};

describe('いきもの図鑑', () => {
  it('slug ごとに読む。_note は無視', () => {
    const { entries } = parseZukan({ _note: 'x', polaris: full });
    expect(entries.get('polaris')).toMatchObject({ habitat: '夜の森', likes: full.likes, buddy: { slug: 'sun' } });
  });

  it('不明な slug・自分や不明な相棒は警告して出さない。項目が一部でも読める', () => {
    const { entries, warnings } = parseZukan({
      pluto: full,
      nebula: { kuchiguse: 'なんで？', buddy: { slug: 'nebula' } },
      sun: { buddy: { slug: 'xxx' } },
    });
    expect(entries.has('pluto')).toBe(false);
    expect(entries.get('nebula')).toMatchObject({ kuchiguse: 'なんで？', likes: [] });
    expect(entries.get('nebula')?.buddy).toBeUndefined();
    expect(entries.has('sun')).toBe(false); // 表示できる項目が無い
    expect(warnings.some((w) => w.includes('pluto'))).toBe(true);
  });

  it('形が違えば空（ビルドは止めない）', () => {
    expect(parseZukan([]).entries.size).toBe(0);
    expect(() => getZukan('polaris')).not.toThrow();
  });

  it('表情違いの画像はファイルがあるときだけ URL を返す', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alt-'));
    fs.writeFileSync(path.join(dir, 'polaris.svg'), '<svg/>');
    expect(altCharacterSrc('polaris', dir)).toBe('/characters/alt/polaris.svg');
    expect(altCharacterSrc('nebula', dir)).toBeUndefined();
    fs.rmSync(dir, { recursive: true });
  });
});

// 公開用リポジトリの sample-data/ はダミーで、数体分だけ（本番の原本では16体すべてを確かめている）。
describe.runIf(fs.existsSync(ZUKAN_JSON))('10_図鑑.json（サンプルデータ）', () => {
  it('書かれているいきものは全項目が読め、無いいきものは「ない」とだけ警告する', () => {
    const { entries, warnings } = parseZukan(JSON.parse(fs.readFileSync(ZUKAN_JSON, 'utf-8')));
    expect(entries.size).toBeGreaterThan(0);
    for (const w of warnings) expect(w).toMatch(/がない（図鑑ブロックを出さない）$/);
    expect(warnings).toHaveLength(16 - entries.size);
  });
});
