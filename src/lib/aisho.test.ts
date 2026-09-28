import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AishoTable, getAisho, PAIR_COUNT, pairAnchor, pairKey, parseAisho, typeAnchor } from './aisho';
import { AISHO_JSON } from './paths';
import { TYPES } from './types';

const labels = {
  best: { name: '最高の相棒', icon: '★', description: 'いっしょにいると楽しい' },
  diff: { name: 'ちがいを楽しむ', icon: '◇', description: '', color: '#123456' },
};

describe('相性早見表', () => {
  it('136組（同じいきもの同士を含む）', () => {
    expect(PAIR_COUNT).toBe(136);
  });

  it('ペアは順不同で引ける。ラベルの色は原本か、無ければ並び順で', () => {
    const { entries, warnings } = parseAisho({
      labels,
      pairs: [
        { a: 'polaris', b: 'sun', label: 'best', text: 'T1' },
        { a: 'mars', b: 'nebula', label: 'diff', text: 'T2' }, // 逆順でも読む
        { a: 'polaris', b: 'polaris', label: 'diff', text: 'T3' },
      ],
    });
    expect(warnings).toHaveLength(1); // 3/136 組
    const t = new AishoTable(entries);
    expect(t.get('sun', 'polaris')?.pair.text).toBe('T1');
    expect(t.get('nebula', 'mars')?.pair).toMatchObject({ a: 'nebula', b: 'mars' });
    expect(t.get('polaris', 'polaris')?.label.name).toBe('ちがいを楽しむ');
    expect(t.get('polaris', 'mars')).toBeUndefined();
    expect(entries.labels[0].color).toMatch(/^#/);
    expect(entries.labels[1].color).toBe('#123456');
  });

  it('不明な slug・ラベル・text なし・重複は警告して読み飛ばす', () => {
    const { entries, warnings } = parseAisho({
      labels,
      pairs: [
        { a: 'pluto', b: 'sun', label: 'best', text: 'x' },
        { a: 'sun', b: 'moon', label: 'nope', text: 'x' },
        { a: 'sun', b: 'moon', label: 'best' },
        { a: 'sun', b: 'moon', label: 'best', text: 'ok' },
        { a: 'moon', b: 'sun', label: 'best', text: 'dup' },
      ],
    });
    expect(entries.pairs).toHaveLength(1);
    expect(warnings.length).toBeGreaterThanOrEqual(4);
  });

  it('形が違えば空の表（ビルドは止めない）', () => {
    expect(new AishoTable(parseAisho('broken').entries).isEmpty).toBe(true);
    expect(() => getAisho()).not.toThrow();
  });

  it('アンカーとキー', () => {
    expect(pairKey('sun', 'polaris')).toBe('polaris|sun');
    expect(pairAnchor('sun', 'polaris')).toBe('p-sun-polaris');
    expect(typeAnchor('milky-way')).toBe('aisho-milky-way');
  });
});

// 公開用リポジトリの sample-data/ はダミーで、一部のペアだけ（本番の原本では136組すべてがそろうことを確かめている）。
describe.runIf(fs.existsSync(AISHO_JSON))('11_相性早見表.json（サンプルデータ）', () => {
  it('ラベルとペアが読め、ペアは順不同で引ける。無いペアは undefined', () => {
    const { entries } = parseAisho(JSON.parse(fs.readFileSync(AISHO_JSON, 'utf-8')));
    const t = new AishoTable(entries);
    expect(entries.labels.length).toBeGreaterThan(0);
    expect(entries.pairs.length).toBeGreaterThan(0);
    for (const p of entries.pairs) {
      expect(t.get(p.a, p.b), `${p.a}×${p.b}`).toBeDefined();
      expect(t.get(p.b, p.a), `${p.b}×${p.a}`).toBeDefined();
    }
    if (entries.pairs.length < PAIR_COUNT) {
      const missing = TYPES.flatMap((x) => TYPES.map((y) => [x.slug, y.slug])).find(([x, y]) => !t.get(x, y));
      expect(missing).toBeDefined();
    }
  });
});
