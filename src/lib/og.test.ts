import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMBINATIONS } from './combination';
import { buildCharacters, getCharacter } from './characters';
import { parseCombinationFile } from './combination-texts';
import {
  buildDefaultTree, buildResultTree, CARD_DOMAIN, characterDataUri, OG_HEIGHT, OG_WIDTH, renderDefaultPng, renderResultPng,
  resultCardFor, STORY_HEIGHT, STORY_WIDTH, type OgNode,
} from './og';
import { FONTS_DIR } from './paths';
import { TYPES } from './types';

const text = parseCombinationFile(
  {
    type: 'sun',
    combinations: [{
      sign: 'leo', nickname: 'n', hitokoto: 'h', basic: 'b', love: 'l', work: 'w', relationships: 'r', growth: 'g',
      compatible: [{ type: 'comet', sign: 'aries', reason: '1' }, { type: 'moon', sign: 'cancer', reason: '2' }, { type: 'venus', sign: 'libra', reason: '3' }],
    }],
  },
  'sun.json',
).texts.get('sun-leo')!;

const sunLeo = COMBINATIONS.find((c) => c.slug === 'sun-leo')!;
const marsAries = COMBINATIONS.find((c) => c.slug === 'mars-aries')!; // 重なり星
const polarisLeo = COMBINATIONS.find((c) => c.slug === 'polaris-leo')!;

/** 木の中の文字をすべて集める */
function texts(node: OgNode | string | undefined): string[] {
  if (node === undefined) return [];
  if (typeof node === 'string') return [node];
  const c = node.props.children;
  return (Array.isArray(c) ? c : [c]).flatMap((n) => texts(n as OgNode | string | undefined));
}
function imgs(node: OgNode | string | undefined): OgNode[] {
  if (node === undefined || typeof node === 'string') return [];
  const c = node.props.children;
  return [...(node.type === 'img' ? [node] : []), ...(Array.isArray(c) ? c : [c]).flatMap((n) => imgs(n as OgNode | undefined))];
}

describe('結果カードの中身', () => {
  it('星座＋キャラ名・守護星・あるある3つ・相性のいいキャラ（compatible[0]）', () => {
    const card = resultCardFor(sunLeo, getCharacter, text);
    const sun = getCharacter('sun');
    expect(card.signName).toBe('しし座');
    expect(card.name).toBe(sun.name);
    expect(card.guardian).toBe('太陽');
    expect(card.aruaru).toEqual(sun.aruaru);
    expect(card.overlap).toBe(true); // 太陽×しし座は重なり星
    expect(card.character).toBe(characterDataUri('sun'));
    expect(card.partner).toEqual({ label: `おひつじ座の ${getCharacter('comet').name}`, character: characterDataUri('comet') });
  });

  it('文言が無ければ相性のいいキャラは載せない', () => {
    expect(resultCardFor(polarisLeo, getCharacter).partner).toBeUndefined();
  });

  it('16タイプすべてのキャラクターがSVGのdata URIになる（public/characters/ にある）', () => {
    for (const t of TYPES) {
      const uri = characterDataUri(t.slug);
      expect(uri, t.slug).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(Buffer.from(uri!.split(',')[1], 'base64').toString('utf8')).toContain('<svg');
    }
    expect(characterDataUri('no-such-type')).toBeUndefined();
  });
});

describe('カードの描画内容', () => {
  const normal = resultCardFor(polarisLeo, getCharacter);
  const kira = resultCardFor(marsAries, getCharacter, undefined);

  for (const format of ['landscape', 'story'] as const) {
    it(`${format}：名前・守護星・あるある・URL・サービス名を載せ、個人情報の欄は無い`, () => {
      const all = texts(buildResultTree({ ...normal, partner: { label: 'おひつじ座の テスト', character: normal.character } }, format)).join('\n');
      expect(all).toContain('しし座の');
      expect(all).toContain(normal.name);
      expect(all).toContain(`守護星：${normal.guardian}`);
      for (const a of normal.aruaru) expect(all).toContain(a.slice(0, 4));
      expect(all).toContain(CARD_DOMAIN);
      expect(all).toContain('ほしのかたち');
      expect(all).toContain('相性のいいキャラ');
      expect(all).not.toMatch(/生年月日|\d{4}年|\d{1,2}月\d{1,2}日/);
    });

    it(`${format}：重なり星だけキラカード（バッジと光）`, () => {
      expect(texts(buildResultTree(kira, format)).join()).toContain('重なり星');
      expect(texts(buildResultTree(normal, format)).join()).not.toContain('重なり星');
      // 光の粒（img）の数が増える
      expect(imgs(buildResultTree(kira, format)).length).toBeGreaterThan(imgs(buildResultTree(normal, format)).length);
    });
  }

  it('縦長では、キャラクターを画面の高さの半分以上の大きさにする', () => {
    const chars = imgs(buildResultTree(normal, 'story')).filter((i) => i.props.src === normal.character);
    expect(chars).toHaveLength(1);
    expect(chars[0].props.height as number).toBeGreaterThanOrEqual(STORY_HEIGHT / 2);
  });

  it('キャラ画像が無くても組み立てられる（フォールバック）', () => {
    const { characters } = buildCharacters({});
    const card = resultCardFor(polarisLeo, (slug) => characters.find((c) => c.slug === slug)!);
    expect(() => buildResultTree({ ...card, character: undefined }, 'story')).not.toThrow();
  });

  it('共通のOGP画像', () => {
    expect(texts(buildDefaultTree()).join()).toContain('星のいきもの');
  });
});

const hasFonts = fs.existsSync(path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf'));
function pngSize(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  expect([...png.slice(1, 4)].map((b) => String.fromCharCode(b)).join('')).toBe('PNG');
  return [view.getUint32(16), view.getUint32(20)];
}

describe.runIf(hasFonts)('PNGの生成', () => {
  it('横長 1200×630・縦長 1080×1920・共通画像', async () => {
    const card = resultCardFor(sunLeo, getCharacter, text);
    expect(pngSize(await renderResultPng(card, 'landscape'))).toEqual([OG_WIDTH, OG_HEIGHT]);
    expect(pngSize(await renderResultPng(card, 'story'))).toEqual([STORY_WIDTH, STORY_HEIGHT]);
    expect(pngSize(await renderDefaultPng())).toEqual([OG_WIDTH, OG_HEIGHT]);
  }, 60_000);
});
