import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AishoTable, getAisho, pairKey } from './aisho';
import { getCharacter, getCharacters } from './characters';
import { COMBINATIONS } from './combination';
import {
  aishoCardImage, aishoCardSlug, allTypePairs, buildMatchView, destinationAfterDiagnosis, invitePath, inviteText, inviteUrl, jsonForScript,
  matchPath, matchShareText, orderSigns, orderTypes, parseResultSlug, readFrom, readMatchQuery, readWith, selectPath, shindanPath,
  signPairKey, typePairKey, xIntentUrl, type MatchData,
} from './match';
import { buildMatchData, emptyMatchContent, getMatchData, parseMatchContent, SIGN_PAIR_COUNT } from './match-data';
import { aishoCardFor, buildAishoTree, labelIconUri, renderAishoDefaultPng, renderAishoPng } from './og-aisho';
import { CARD_DOMAIN, OG_HEIGHT, OG_WIDTH, STORY_HEIGHT, STORY_WIDTH, type OgNode } from './og';
import { FONTS_DIR, MATCH_JSON } from './paths';
import { SIGNS } from './signs';
import { TYPES } from './types';

const SITE = 'https://16type-seiza.com';

describe('結果の slug の確かめ（クエリの検証）', () => {
  it('192通りすべてを分解できる（ハイフン入りのいきものも）', () => {
    for (const c of COMBINATIONS) expect(parseResultSlug(c.slug), c.slug).toEqual({ slug: c.slug, typeSlug: c.type.slug, signId: c.sign.id });
    expect(parseResultSlug('milky-way-cancer')).toEqual({ slug: 'milky-way-cancer', typeSlug: 'milky-way', signId: 'cancer' });
    expect(parseResultSlug('meteor-shower-pisces')?.typeSlug).toBe('meteor-shower');
  });

  it('不正な値は undefined（無視する）', () => {
    for (const v of [
      null, undefined, 1, '', 'sun', 'leo', 'sun-', '-leo', 'sun-leo-', 'foo-leo', 'sun-foo', 'SUN-LEO', 'sun_leo', 'sun-leo ', ' sun-leo',
      '../sun-leo', 'sun-leo<script>', 'sun-leo&x=1', 'javascript:alert(1)', 'milky-cancer', `${'a-'.repeat(30)}leo`,
    ]) {
      expect(parseResultSlug(v), String(v)).toBeUndefined();
    }
  });

  it('?from・?with・?a&b を読み、不正なほうは無視する', () => {
    expect(readFrom('?from=sun-leo')?.slug).toBe('sun-leo');
    expect(readFrom('?from=evil')).toBeUndefined();
    expect(readFrom('')).toBeUndefined();
    expect(readWith('?with=moon-cancer')?.typeSlug).toBe('moon');
    expect(readWith(new URLSearchParams({ with: 'x-y' }))).toBeUndefined();
    expect(readMatchQuery('?a=sun-leo&b=moon-cancer')).toEqual({
      a: { slug: 'sun-leo', typeSlug: 'sun', signId: 'leo' },
      b: { slug: 'moon-cancer', typeSlug: 'moon', signId: 'cancer' },
    });
    expect(readMatchQuery('?a=sun-leo&b=%3Cscript%3E')).toEqual({ a: { slug: 'sun-leo', typeSlug: 'sun', signId: 'leo' }, b: undefined });
    expect(readMatchQuery('?b=sun-leo')).toEqual({ a: undefined, b: { slug: 'sun-leo', typeSlug: 'sun', signId: 'leo' } });
  });
});

describe('招待リンクと行き先の組み立て', () => {
  it('招待リンク：/aisho/invite/?from={自分の結果}（個人情報は入らない）', () => {
    expect(invitePath('sun-leo')).toBe('/aisho/invite/?from=sun-leo');
    expect(inviteUrl('sun-leo', SITE)).toBe('https://16type-seiza.com/aisho/invite/?from=sun-leo');
    expect(inviteUrl('milky-way-cancer', new URL(SITE))).toBe('https://16type-seiza.com/aisho/invite/?from=milky-way-cancer');
    // 組み立てたリンクをそのまま読み戻せる
    expect(readFrom(new URL(inviteUrl('meteor-shower-pisces', SITE)).search)?.slug).toBe('meteor-shower-pisces');
  });

  it('診断・/select への引き継ぎ', () => {
    expect(shindanPath('sun-leo')).toBe('/shindan/?with=sun-leo');
    expect(selectPath('sun-leo')).toBe('/select/?with=sun-leo');
    expect(shindanPath()).toBe('/shindan/');
    expect(selectPath()).toBe('/select/');
  });

  it('送信先：招かれていれば /aisho/match/?a={招いた人}&b={自分}、そうでなければ自分の結果ページ', () => {
    expect(destinationAfterDiagnosis('moon-cancer', parseResultSlug('sun-leo'))).toBe('/aisho/match/?a=sun-leo&b=moon-cancer');
    expect(destinationAfterDiagnosis('moon-cancer')).toBe('/result/moon-cancer/');
    expect(matchPath('sun-leo', 'moon-cancer')).toBe('/aisho/match/?a=sun-leo&b=moon-cancer');
    expect(readMatchQuery(new URL(matchPath('sun-leo', 'moon-cancer'), SITE).search).b?.slug).toBe('moon-cancer');
  });

  it('シェアの文面に点数（◯%）や生年月日を入れない', () => {
    expect(inviteText('しし座の いきもの3')).toContain('しし座の いきもの3');
    const text = matchShareText({
      a: { title: 'しし座の A' } as never, b: { title: 'かに座の B' } as never,
      animal: { key: 'pittari', label: { name: 'ラベルA', icon: '🌟', description: '', color: '#fff' }, text: '' },
    });
    expect(text).toBe('しし座の A × かに座の B の相性は「ラベルA」でした！ #ほしのかたち #ほしのかたち相性');
    for (const t of [text, inviteText('x')]) expect(t).not.toMatch(/%|％|点|\d{4}年|生年月日/);
    expect(xIntentUrl('あ', 'https://16type-seiza.com/')).toBe('https://x.com/intent/post?text=%E3%81%82&url=https%3A%2F%2F16type-seiza.com%2F');
  });

  it('JSON を script に埋め込んでも </script> で閉じない', () => {
    expect(jsonForScript({ t: '</script><b>' })).not.toContain('<');
    expect(JSON.parse(jsonForScript({ t: '</script>' }))).toEqual({ t: '</script>' });
  });
});

describe('ペアの並べ替え', () => {
  it('いきものは TYPES の並び順（順不同で同じキー・同じ画像）', () => {
    expect(orderTypes('sun', 'polaris')).toEqual(['polaris', 'sun']);
    expect(orderTypes('polaris', 'sun')).toEqual(['polaris', 'sun']);
    expect(typePairKey('sun', 'polaris')).toBe(typePairKey('polaris', 'sun'));
    expect(aishoCardSlug('meteor-shower', 'milky-way')).toBe('milky-way-meteor-shower');
    expect(aishoCardImage('sun', 'polaris', 'story')).toBe('/og/aisho/polaris-sun-story.png');
    expect(aishoCardImage('sun', 'polaris', 'landscape')).toBe('/og/aisho/polaris-sun.png');
    expect(aishoCardImage('sun', 'sun', 'landscape')).toBe('/og/aisho/sun-sun.png');
  });

  it('早見表（aisho.ts）の pairKey と同じ', () => {
    for (const x of TYPES) for (const y of TYPES) expect(typePairKey(x.slug, y.slug)).toBe(pairKey(x.slug, y.slug));
  });

  it('星座は SIGNS の並び順', () => {
    expect(orderSigns('leo', 'aries')).toEqual(['aries', 'leo']);
    expect(signPairKey('pisces', 'cancer')).toBe('cancer|pisces');
  });

  it('いきものの組み合わせは136組、画像名は重ならない', () => {
    const pairs = allTypePairs();
    expect(pairs).toHaveLength(136);
    expect(new Set(pairs.map(([a, b]) => aishoCardSlug(a, b))).size).toBe(136);
    for (const [a, b] of pairs) expect(orderTypes(a, b)).toEqual([a, b]);
  });
});

// ---- 13_相性診断.json ----

const labels = ['pittari', 'oginau'];
const sample = {
  relations: { same: { name: '同じ星座', description: 'd' }, fire: { name: '火どうし' } },
  signPairs: [
    { a: 'leo', b: 'cancer', relation: 'same', title: 't', text: '星座の文' },
    { a: 'aries', b: 'aries', relation: 'nope', text: 'おひつじ同士' },
    { a: 'leo', b: 'cancer', text: '重複' },
    { a: 'leo', b: 'xxx', text: '不正' },
    { a: 'virgo', b: 'libra' },
  ],
  advice: { pittari: { friend: 'f', love: 'l', work: 'w' }, other: { friend: 'x' } },
  intro: { invite: '招待の文', waiting: '待つ文' },
};

describe('parseMatchContent（02_content/13_相性診断.json）', () => {
  it('星座のペアは順不同で読み、壊れた項目は読み飛ばして警告する', () => {
    const { entries, warnings } = parseMatchContent(sample, labels);
    expect(entries.signPairs['cancer|leo']).toEqual({ relation: 'same', title: 't', text: '星座の文' });
    expect(entries.signPairs['aries|aries']).toEqual({ relation: undefined, title: undefined, text: 'おひつじ同士' });
    expect(Object.keys(entries.signPairs)).toHaveLength(2);
    expect(entries.relations.fire).toEqual({ name: '火どうし', description: undefined });
    expect(entries.advice.pittari).toEqual({ friend: 'f', love: 'l', work: 'w' });
    expect(entries.intro).toEqual({ invite: '招待の文', waiting: '待つ文' });
    expect(warnings.join('\n')).toMatch(/relation「nope」/);
    expect(warnings.join('\n')).toMatch(/重複/);
    expect(warnings.join('\n')).toMatch(/signPairs\[3\]/);
    expect(warnings.join('\n')).toMatch(/virgo×libra に text がない/);
    expect(warnings.join('\n')).toMatch(/advice\.other は早見表のラベルに無い/);
    expect(warnings.join('\n')).toMatch(/advice\.oginau が無い/);
    expect(warnings.join('\n')).toMatch(`signPairs 2/${SIGN_PAIR_COUNT}`);
  });

  it('オブジェクトでなければ空（ビルドは止めない）', () => {
    expect(parseMatchContent(null).entries).toEqual(emptyMatchContent());
    expect(parseMatchContent([]).warnings).toHaveLength(1);
    expect(SIGN_PAIR_COUNT).toBe(78);
  });
});

// ---- データの組み合わせ ----

const table = new AishoTable({
  labels: [
    { key: 'pittari', name: 'ラベルA', icon: '🌟', description: 'ラベルAの説明', color: '#f2d27a' },
    { key: 'oginau', name: 'ラベルB', icon: '🧩', description: '', color: '#ffc8a8' },
  ],
  pairs: [
    { a: 'sun', b: 'moon', label: 'oginau', text: 'どうぶつ3とどうぶつ10' },
    { a: 'polaris', b: 'uranus', label: 'pittari', text: 'どうぶつ1とどうぶつ4' },
  ],
});
const data: MatchData = buildMatchData(getCharacters(), table, parseMatchContent(sample, labels).entries);
const ref = (s: string) => parseResultSlug(s)!;

describe('相性ページの中身（buildMatchView）', () => {
  it('2人の名前・いきもの同士・星座同士・アドバイス・相性カードをまとめる', () => {
    const view = buildMatchView(data, ref('uranus-leo'), ref('polaris-cancer'));
    expect(view.a.title).toBe(`しし座の ${getCharacter('uranus').name}`);
    expect(view.b.title).toBe(`かに座の ${getCharacter('polaris').name}`);
    expect(view.a.main).toBe(getCharacter('uranus').theme.main);
    expect(view.animal).toEqual({ key: 'pittari', label: { name: 'ラベルA', icon: '🌟', description: 'ラベルAの説明', color: '#f2d27a' }, text: 'どうぶつ1とどうぶつ4' });
    expect(view.sign).toEqual({ relation: { name: '同じ星座', description: 'd' }, title: 't', text: '星座の文' });
    expect(view.advice).toEqual({ friend: 'f', love: 'l', work: 'w' });
    expect(view.card).toEqual({ story: '/og/aisho/polaris-uranus-story.png', landscape: '/og/aisho/polaris-uranus.png', kira: true });
  });

  it('a・b が逆でも同じ関係（表示の順は a・b のまま）', () => {
    const x = buildMatchView(data, ref('sun-leo'), ref('moon-cancer'));
    const y = buildMatchView(data, ref('moon-cancer'), ref('sun-leo'));
    expect(x.animal).toEqual(y.animal);
    expect(x.sign).toEqual(y.sign);
    expect(x.card).toEqual(y.card);
    expect(x.a.ref.typeSlug).toBe('sun');
    expect(y.a.ref.typeSlug).toBe('moon');
    expect(x.card.kira).toBe(false);
    expect(x.advice).toBeUndefined(); // oginau のアドバイスは無い
  });

  it('データが無い部分は undefined（ページでは出さない）', () => {
    const empty = buildMatchData(getCharacters(), new AishoTable({ labels: [], pairs: [] }), emptyMatchContent());
    const view = buildMatchView(empty, ref('sun-leo'), ref('moon-virgo'));
    expect(view.animal).toBeUndefined();
    expect(view.sign).toBeUndefined();
    expect(view.advice).toBeUndefined();
    expect(view.a.title).toBe(`しし座の ${getCharacter('sun').name}`);
  });

  it('早見表がそろっていれば、192×192 のどの2人でもいきもの同士の関係が引ける', () => {
    const real = getMatchData();
    if (getAisho().pairs.length < 136) return;
    for (const a of COMBINATIONS) {
      for (const b of [COMBINATIONS[0], COMBINATIONS[100], COMBINATIONS[191], a]) {
        const view = buildMatchView(real, ref(a.slug), ref(b.slug));
        expect(view.animal, `${a.slug}×${b.slug}`).toBeDefined();
      }
    }
    // ページに埋め込む JSON の大きさ（gzip 前）
    expect(jsonForScript(real).length).toBeLessThan(200_000);
  });

  // 公開用リポジトリの sample-data/ はダミーで、星座の組み合わせは一部だけ（本番の原本では78組すべてを確かめている）。
  it.skipIf(!fs.existsSync(MATCH_JSON))('13_相性診断.json（サンプルデータ）：星座の組み合わせは順不同で引け、アドバイスがそろっている', () => {
    const real = getMatchData();
    const keys = Object.keys(real.signPairs);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(SIGN_PAIR_COUNT);
    for (const k of keys) {
      const [x, y] = k.split('|');
      expect(real.signPairs[signPairKey(y, x)], k).toBeDefined();
    }
    for (const l of getAisho().labels) expect(real.advice[l.key], l.key).toBeDefined();
  });
});

// ---- 相性カード ----

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

describe('相性カード（og-aisho.ts）', () => {
  it('中身：並び順で a・b、ラベル、text。「pittari」はキラ', () => {
    const card = aishoCardFor('uranus', 'polaris', table, getCharacter)!;
    expect(card.a.name).toBe(getCharacter('polaris').name);
    expect(card.b.name).toBe(getCharacter('uranus').name);
    expect(card.label.name).toBe('ラベルA');
    expect(card.text).toBe('どうぶつ1とどうぶつ4');
    expect(card.kira).toBe(true);
    expect(aishoCardFor('sun', 'moon', table, getCharacter)!.kira).toBe(false);
    expect(aishoCardFor('sun', 'sun', table, getCharacter)).toBeUndefined();
  });

  for (const format of ['landscape', 'story'] as const) {
    it(`${format}：2体の名前・ラベル・text・URL・サービス名を載せ、星座・点数・個人情報は載せない`, () => {
      const card = aishoCardFor('sun', 'moon', table, getCharacter)!;
      const all = texts(buildAishoTree(card, format)).join('\n');
      expect(all).toContain(getCharacter('sun').name);
      expect(all).toContain(getCharacter('moon').name);
      expect(all).toContain('ラベルB');
      expect(all).toContain('どうぶつ3とどうぶつ10');
      expect(all).toContain(CARD_DOMAIN);
      expect(all).toContain('ほしのかたち');
      for (const s of SIGNS) expect(all).not.toContain(s.name);
      expect(all).not.toMatch(/%|％|生年月日|\d{4}年/);
    });

    it(`${format}：「pittari」だけ光の粒が増える`, () => {
      const kira = aishoCardFor('polaris', 'uranus', table, getCharacter)!;
      const normal = aishoCardFor('sun', 'moon', table, getCharacter)!;
      expect(imgs(buildAishoTree(kira, format)).length).toBeGreaterThan(imgs(buildAishoTree(normal, format)).length);
    });
  }

  it('ラベルのアイコンは絵文字の代わりに SVG で描く（知らない絵文字は丸）', () => {
    for (const icon of ['🌟', '🧩', '⚡', '🌱', '🪞', '？']) {
      const svg = Buffer.from(labelIconUri(icon, '#ffffff').split(',')[1], 'base64').toString('utf8');
      expect(svg).toContain('<svg');
    }
    expect(labelIconUri('？', '#ffffff')).not.toBe(labelIconUri('🌟', '#ffffff'));
  });
});

const hasFonts = fs.existsSync(path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf'));
function pngSize(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

describe.runIf(hasFonts)('相性カードのPNG', () => {
  it('横長 1200×630・縦長 1080×1920・共通画像', async () => {
    const card = aishoCardFor('polaris', 'uranus', table, getCharacter)!;
    expect(pngSize(await renderAishoPng(card, 'landscape'))).toEqual([OG_WIDTH, OG_HEIGHT]);
    expect(pngSize(await renderAishoPng(card, 'story'))).toEqual([STORY_WIDTH, STORY_HEIGHT]);
    expect(pngSize(await renderAishoDefaultPng())).toEqual([OG_WIDTH, OG_HEIGHT]);
  }, 60_000);
});
