// 結果カード（シェア画像）とOGP画像をビルド時に生成する。satori でSVGを作り、resvg でPNGにする。
// デザインは 01_planning/03_キャラクター刷新の提案.md の「シェア画像（結果カード）のデザイン方針」（D-011）：
//   - 縦長 1080×1920（主役。/og/result/{slug}-story.png）と横長 1200×630（OGP。/og/result/{slug}.png）を同じデザインで作る
//   - 星座＋キャラ名を大きく太く、キャラクターは大きく（縦長では画面の高さの半分）
//   - あるある3つを ✓ つきのチェックリストで、相性のいいキャラを小さく1体、守護星、サービス名とURL
//   - 重なり星（11通り）はキラカード風（金の枠と光の演出）
//   - タイプごとのテーマカラー（TypeCharacter.theme）。夜空パステル（D-004）の世界観は保つ
// 生年月日などの個人情報は載せない（法務判断書 #4）。
// デザイン部の見本（03_design/assets/card/）ができたら、寸法と配色をそちらに合わせる。

import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { Combination } from './combination';
import type { CombinationText } from './combination-texts';
import { resultTitle } from './characters';
import { CHARACTERS_DIR, FONTS_DIR } from './paths';
import { getSign } from './signs';
import { SITE_NAME } from './site';
import { fitFontSize, textUnits, wrapJapanese } from './og-text';
import type { ThemeColor, TypeCharacter } from './types';

/** 横長（OGP） */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** 縦長（ストーリーズ・保存用） */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type CardFormat = 'landscape' | 'story';
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  landscape: { width: OG_WIDTH, height: OG_HEIGHT },
  story: { width: STORY_WIDTH, height: STORY_HEIGHT },
};

/** サイトのドメイン（カードに載せる） */
export const CARD_DOMAIN = '16type-seiza.com';

/** Base.astro の :root と同じ値 */
export const COLORS = {
  night: '#1b1f3b',
  nightDeep: '#11142a',
  text: '#f1efff',
  muted: '#b9b6d8',
  lavender: '#c9b8ff',
  mint: '#a8e6cf',
  gold: '#f2d27a',
  goldDeep: '#c8962e',
  border: 'rgba(201, 184, 255, 0.22)',
};

// ---- キャラクター画像 ----

const characterCache = new Map<string, string | undefined>();

/**
 * キャラクターのSVGを data URI にする（satori の img に渡す）。ファイルが無ければ undefined（画像なしで生成する）。
 * satori は data:image/svg+xml を <image> としてSVGに埋め込み、resvg がそのままベクターで描く。
 */
export function characterDataUri(slug: string): string | undefined {
  if (!characterCache.has(slug)) {
    const file = path.join(CHARACTERS_DIR, `${slug}.svg`);
    characterCache.set(slug, fs.existsSync(file) ? svgDataUri(fs.readFileSync(file, 'utf8')) : undefined);
  }
  return characterCache.get(slug);
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** チェックリストの ✓（フォントに頼らず、SVGで描く） */
function checkIcon(theme: ThemeColor): string {
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill="${theme.main}"/><path d="M6.5 12.5l3.6 3.6 7.4-8.2" fill="none" stroke="${theme.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
}

/** キラカードの光（4方向に光る星） */
export function sparkleIcon(color: string): string {
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" fill="${color}"/></svg>`,
  );
}

// ---- カードの中身 ----

export interface CardPartner {
  /** 「しし座の いきもの8」 */
  label: string;
  character?: string;
}

export interface ResultCard {
  signName: string;
  name: string;
  guardian: string;
  aruaru: string[];
  theme: ThemeColor;
  /** 重なり星（キラカード） */
  overlap: boolean;
  character?: string;
  partner?: CardPartner;
}

/**
 * 結果カードの中身。相性のいいキャラは、その組み合わせの compatible[0] の相手（文言が無ければ載せない）。
 * characterOf には characters.ts の getCharacter を渡す（テストでは差し替える）。
 */
export function resultCardFor(
  c: Combination,
  characterOf: (slug: string) => TypeCharacter,
  text?: CombinationText,
): ResultCard {
  const ch = characterOf(c.type.slug);
  const m = text?.compatible[0];
  const mSign = m ? getSign(m.signId) : undefined;
  return {
    signName: c.sign.name,
    name: ch.name,
    guardian: ch.guardian,
    aruaru: ch.aruaru,
    theme: ch.theme,
    overlap: c.overlap,
    character: characterDataUri(c.type.slug),
    partner: m && mSign ? { label: resultTitle(characterOf(m.typeSlug), mSign.name), character: characterDataUri(m.typeSlug) } : undefined,
  };
}

// ---- satori の要素 ----

// satori に渡す要素（React要素と同じ形）。JSXを使わずに組み立てる。
export interface OgNode {
  type: string;
  props: { style?: Record<string, unknown>; children?: OgNode | string | (OgNode | string)[]; [key: string]: unknown };
}

export function el(type: string, style: Record<string, unknown>, children?: OgNode['props']['children'], extra: Record<string, unknown> = {}): OgNode {
  return { type, props: { style, children, ...extra } };
}

export function img(src: string, size: number, style: Record<string, unknown> = {}): OgNode {
  return el('img', { width: size, height: size, flexShrink: 0, ...style }, undefined, { src, width: size, height: size });
}

/** 背景の星（%で位置、px で大きさ） */
export const STARS: [x: number, y: number, size: number, color: string][] = [
  [12, 18, 4, '#ffffffaa'], [72, 9, 4, '#ffffffbb'], [38, 88, 6, '#f2d27acc'], [88, 36, 4, '#ffffff99'],
  [2, 71, 3, '#ffffff88'], [64, 83, 6, '#c9b8ffcc'], [93, 67, 4, '#ffffff99'], [5, 45, 3, '#ffffff77'],
  [52, 6, 3, '#ffffff99'], [80, 92, 3, '#ffffff77'], [96, 12, 5, '#f2d27aaa'], [30, 4, 3, '#c9b8ffaa'],
  [22, 58, 3, '#ffffff66'], [84, 52, 3, '#ffffff66'], [46, 96, 4, '#ffffff88'], [8, 94, 4, '#c9b8ff99'],
];

/**
 * キラカードの光の位置（%）と大きさ（カードの短い辺に対する割合）。
 * 文字に重ならないように、金の枠の上と、キャラクターのまわりだけに置く。
 */
type Sparkle = [x: number, y: number, scale: number, color: string];
const SPARKLES: Record<CardFormat, Sparkle[]> = {
  landscape: [
    [2.4, 9, 0.09, '#fff6d6'], [50, 4.2, 0.045, '#ffffff'], [97.6, 24, 0.055, '#fff6d6'], [97.6, 72, 0.04, '#f2d27a'],
    [2.4, 58, 0.04, '#ffffff'], [12, 95.8, 0.07, '#f2d27a'], [72, 95.8, 0.04, '#ffffff'], [97.6, 95.8, 0.08, '#fff6d6'],
    [38, 18, 0.035, '#fff6d6'], [9, 72, 0.03, '#ffffff'],
  ],
  story: [
    [3.5, 5, 0.08, '#fff6d6'], [96.5, 9, 0.06, '#f2d27a'], [3.5, 50, 0.035, '#ffffff'], [96.5, 44, 0.06, '#fff6d6'],
    [3.5, 89, 0.05, '#f2d27a'], [96.5, 97.8, 0.075, '#fff6d6'], [50, 2, 0.035, '#ffffff'],
    [16, 33, 0.03, '#fff6d6'], [84, 30, 0.03, '#ffffff'], [18, 66, 0.028, '#fff6d6'],
  ],
};

/** 枠の色と、キラカードにするか（結果カードは重なり星、相性カードは「pittari」） */
export type FrameStyle = Pick<ResultCard, 'overlap' | 'theme'>;

/** 背景・枠・光の演出（中身の後ろと前に重ねる） */
export function frame(card: FrameStyle, format: CardFormat, inset: number, radius: number): { back: OgNode[]; front: OgNode[] } {
  const { width, height } = CARD_SIZE[format];
  const short = Math.min(width, height);
  const stars = STARS.map(([x, y, size, color]) =>
    el('div', { position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: size, backgroundColor: color }),
  );
  if (!card.overlap) {
    return {
      back: [
        ...stars,
        el('div', { position: 'absolute', left: inset, top: inset, right: inset, bottom: inset, border: `3px solid ${card.theme.main}88`, borderRadius: radius }),
      ],
      front: [],
    };
  }
  // キラカード：金のグラデーションの太い枠、内側の細い金線、斜めの光の帯、光の粒
  const goldWidth = Math.round(short * 0.018);
  return {
    back: [
      el('div', {
        position: 'absolute', left: inset, top: inset, right: inset, bottom: inset, borderRadius: radius,
        backgroundImage: `linear-gradient(135deg, #fff3c4 0%, ${COLORS.gold} 22%, ${COLORS.goldDeep} 40%, #fff6d6 52%, ${COLORS.gold} 68%, ${COLORS.goldDeep} 84%, #fff3c4 100%)`,
      }),
      el('div', {
        position: 'absolute', left: inset + goldWidth, top: inset + goldWidth, right: inset + goldWidth, bottom: inset + goldWidth,
        borderRadius: radius - goldWidth / 2,
        backgroundColor: COLORS.nightDeep,
        backgroundImage: `radial-gradient(ellipse at 50% 45%, ${COLORS.gold}40 0%, transparent 60%), linear-gradient(180deg, #2a2440 0%, ${COLORS.nightDeep} 100%)`,
      }),
      el('div', {
        position: 'absolute', left: inset + goldWidth * 2, top: inset + goldWidth * 2, right: inset + goldWidth * 2, bottom: inset + goldWidth * 2,
        borderRadius: radius - goldWidth, border: `2px solid ${COLORS.gold}99`,
      }),
      ...stars,
    ],
    front: [
      // ホログラムのような斜めの光の帯
      el('div', {
        position: 'absolute', left: inset + goldWidth, top: inset + goldWidth, right: inset + goldWidth, bottom: inset + goldWidth,
        borderRadius: radius - goldWidth / 2,
        backgroundImage: 'linear-gradient(120deg, transparent 18%, rgba(255,246,214,0.10) 24%, rgba(255,255,255,0.20) 27%, rgba(255,246,214,0.10) 30%, transparent 36%, transparent 62%, rgba(201,184,255,0.10) 68%, rgba(255,255,255,0.14) 71%, rgba(168,230,207,0.10) 74%, transparent 80%)',
      }),
      ...SPARKLES[format].map(([x, y, scale, color]) => {
        const size = Math.round(short * scale);
        return img(sparkleIcon(color), size, { position: 'absolute', left: `${x}%`, top: `${y}%`, marginLeft: -size / 2, marginTop: -size / 2 });
      }),
    ],
  };
}

export function background(card: Pick<ResultCard, 'theme'>, width: number, height: number, children: OgNode[]): OgNode {
  return el(
    'div',
    {
      position: 'relative', display: 'flex', width, height, fontFamily: 'Noto Sans JP',
      backgroundColor: COLORS.nightDeep,
      backgroundImage: `radial-gradient(ellipse at 50% -10%, #2d2a5e 0%, transparent 60%), linear-gradient(180deg, ${COLORS.night} 0%, ${card.theme.dark} 100%)`,
    },
    children,
  );
}

/** キャラクター（後ろにテーマカラーの光の円）。画像が無ければ光だけ */
function characterBlock(card: ResultCard, size: number): OgNode {
  const glow = card.overlap ? COLORS.gold : card.theme.main;
  return el('div', { display: 'flex', position: 'relative', width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }, [
    el('div', {
      position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size,
      backgroundImage: `radial-gradient(circle at 50% 50%, ${glow}66 0%, ${glow}22 45%, transparent 70%)`,
    }),
    ...(card.character ? [img(card.character, size)] : []),
  ]);
}

function guardianPill(card: ResultCard, fontSize: number): OgNode {
  return el(
    'div',
    {
      display: 'flex', fontSize, fontWeight: 700, color: card.theme.sub, lineHeight: 1.3,
      padding: `${Math.round(fontSize * 0.2)}px ${Math.round(fontSize * 0.8)}px`, borderRadius: 999,
      border: `2px solid ${card.theme.main}`, backgroundColor: `${card.theme.main}2e`,
    },
    `守護星：${card.guardian}`,
  );
}

function overlapBadge(fontSize: number, text: string): OgNode {
  return el(
    'div',
    {
      display: 'flex', fontSize, fontWeight: 700, color: COLORS.nightDeep, lineHeight: 1.3,
      padding: `${Math.round(fontSize * 0.2)}px ${Math.round(fontSize * 0.8)}px`, borderRadius: 999,
      backgroundImage: `linear-gradient(90deg, #fff3c4 0%, ${COLORS.gold} 45%, ${COLORS.goldDeep} 100%)`,
    },
    text,
  );
}

/** あるあるのチェックリスト。1行に収まらない文は、文節で2行に折る */
function checklist(card: ResultCard, width: number, opts: { max: number; min: number; icon: number; gap: number; padding: number }): OgNode {
  const textWidth = width - opts.padding * 2 - opts.icon - opts.gap;
  const size = Math.min(...card.aruaru.map((a) => fitFontSize(a, textWidth, opts.max, opts.min)));
  const icon = checkIcon(card.theme);
  return el(
    'div',
    {
      display: 'flex', flexDirection: 'column', width, gap: Math.round(size * 0.35),
      padding: `${opts.padding * 0.8}px ${opts.padding}px`, borderRadius: opts.padding,
      backgroundColor: 'rgba(255, 255, 255, 0.07)', border: `2px solid ${card.overlap ? `${COLORS.gold}66` : `${card.theme.main}55`}`,
    },
    card.aruaru.map((a) => {
      const lines = textUnits(a) * size <= textWidth ? [a] : wrapJapanese(a, Math.floor(textWidth / size));
      return el('div', { display: 'flex', alignItems: 'flex-start', gap: opts.gap }, [
        img(icon, opts.icon, { marginTop: Math.round((size * 1.45 - opts.icon) / 2) }),
        el(
          'div',
          { display: 'flex', flexDirection: 'column', fontSize: size, fontWeight: 700, color: COLORS.text, lineHeight: 1.45 },
          lines.map((l) => el('div', { display: 'flex', whiteSpace: 'nowrap' }, l)),
        ),
      ]);
    }),
  );
}

function partnerBlock(partner: CardPartner, width: number, opts: { image: number; label: number; name: number }): OgNode {
  const textWidth = width - opts.image - 16;
  return el('div', { display: 'flex', alignItems: 'center', gap: 16, width }, [
    ...(partner.character ? [img(partner.character, opts.image)] : []),
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { display: 'flex', fontSize: opts.label, color: COLORS.muted, lineHeight: 1.3 }, '相性のいいキャラ'),
      el(
        'div',
        { display: 'flex', fontSize: fitFontSize(partner.label, textWidth, opts.name, Math.round(opts.name * 0.7)), fontWeight: 700, color: COLORS.text, lineHeight: 1.3, whiteSpace: 'nowrap' },
        partner.label,
      ),
    ]),
  ]);
}

export function serviceName(fontSize: number, color = COLORS.lavender): OgNode {
  return el('div', { display: 'flex', fontSize, fontWeight: 700, color, lineHeight: 1.3 }, [
    el('span', { color: COLORS.gold, marginRight: Math.round(fontSize * 0.4) }, '★'),
    SITE_NAME,
  ]);
}

// ---- 横長（1200×630、OGP） ----

const L = { inset: 20, radius: 32, padLeft: 36, padTop: 34, padRight: 44, padBottom: 30, character: 470, gap: 24 } as const;

export function buildLandscapeTree(card: ResultCard): OgNode {
  const contentWidth = OG_WIDTH - L.inset * 2 - L.padLeft - L.padRight;
  const textWidth = contentWidth - L.character - L.gap;
  const { back, front } = frame(card, 'landscape', L.inset, L.radius);

  const textColumn = el('div', { display: 'flex', flexDirection: 'column', width: textWidth, flexShrink: 0, height: '100%', justifyContent: 'space-between' }, [
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
      serviceName(20),
      ...(card.overlap ? [overlapBadge(20, '★ 重なり星')] : []),
    ]),
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { display: 'flex', fontSize: 38, fontWeight: 700, color: card.overlap ? COLORS.gold : card.theme.sub, lineHeight: 1.25 }, `${card.signName}の`),
      el('div', { display: 'flex', fontSize: fitFontSize(card.name, textWidth, 72, 44), fontWeight: 700, color: COLORS.text, lineHeight: 1.2, whiteSpace: 'nowrap' }, card.name),
      el('div', { display: 'flex', marginTop: 10 }, [guardianPill(card, 22)]),
    ]),
    checklist(card, textWidth, { max: 28, min: 20, icon: 28, gap: 12, padding: 18 }),
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, [
      card.partner ? partnerBlock(card.partner, textWidth - 230, { image: 64, label: 18, name: 24 }) : el('div', { display: 'flex', fontSize: 22, color: COLORS.muted }, 'あなたはどの星のいきもの？'),
      el('div', { display: 'flex', fontSize: 22, fontWeight: 700, color: COLORS.mint, lineHeight: 1.3 }, CARD_DOMAIN),
    ]),
  ]);

  const content = el(
    'div',
    {
      display: 'flex', position: 'absolute', alignItems: 'center', gap: L.gap,
      left: L.inset + L.padLeft, top: L.inset + L.padTop, right: L.inset + L.padRight, bottom: L.inset + L.padBottom,
    },
    [characterBlock(card, L.character), textColumn],
  );
  return background(card, OG_WIDTH, OG_HEIGHT, [...back, content, ...front]);
}

// ---- 縦長（1080×1920、ストーリーズ・保存用） ----

const S = { inset: 28, radius: 56, pad: 44, character: 960 } as const;

export function buildStoryTree(card: ResultCard): OgNode {
  const contentWidth = STORY_WIDTH - (S.inset + S.pad) * 2; // 936
  const { back, front } = frame(card, 'story', S.inset, S.radius);

  const content = el(
    'div',
    {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'absolute',
      left: S.inset + S.pad, top: S.inset + S.pad, right: S.inset + S.pad, bottom: S.inset + S.pad - 8,
    },
    [
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }, [
        serviceName(30),
        ...(card.overlap ? [overlapBadge(32, '★ 重なり星　192通りのうち11通り')] : []),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
        el('div', { display: 'flex', fontSize: 64, fontWeight: 700, color: card.overlap ? COLORS.gold : card.theme.sub, lineHeight: 1.2 }, `${card.signName}の`),
        el('div', { display: 'flex', fontSize: fitFontSize(card.name, contentWidth, 112, 72), fontWeight: 700, color: COLORS.text, lineHeight: 1.2, whiteSpace: 'nowrap' }, card.name),
        el('div', { display: 'flex', marginTop: 14 }, [guardianPill(card, 34)]),
      ]),
      // キャラクターは画面の高さの半分（960px）。SVGの余白の分だけ、上下の要素に少し重ねる
      el('div', { display: 'flex', marginTop: -36, marginBottom: -36 }, [characterBlock(card, S.character)]),
      checklist(card, contentWidth, { max: 46, min: 34, icon: 44, gap: 18, padding: 32 }),
      el('div', { display: 'flex', width: contentWidth, justifyContent: 'space-between', alignItems: 'center' }, [
        card.partner
          ? partnerBlock(card.partner, contentWidth - 320, { image: 120, label: 26, name: 36 })
          : el('div', { display: 'flex', fontSize: 32, color: COLORS.muted }, 'あなたはどの星のいきもの？'),
        el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }, [
          el('div', { display: 'flex', fontSize: 24, color: COLORS.muted, lineHeight: 1.4 }, '3分で診断'),
          el('div', { display: 'flex', fontSize: 34, fontWeight: 700, color: COLORS.mint, lineHeight: 1.3 }, CARD_DOMAIN),
        ]),
      ]),
    ],
  );
  return background(card, STORY_WIDTH, STORY_HEIGHT, [...back, content, ...front]);
}

export function buildResultTree(card: ResultCard, format: CardFormat): OgNode {
  return format === 'story' ? buildStoryTree(card) : buildLandscapeTree(card);
}

// ---- 共通のOGP画像（トップ・タイプ・星座ページなど） ----

/** 共通画像に並べるキャラクター */
const DEFAULT_CHARACTERS = ['sun', 'milky-way', 'comet', 'polaris'];

export function buildDefaultTree(): OgNode {
  const chars = DEFAULT_CHARACTERS.map(characterDataUri).filter((c): c is string => c !== undefined);
  return el(
    'div',
    {
      position: 'relative', display: 'flex', width: OG_WIDTH, height: OG_HEIGHT, fontFamily: 'Noto Sans JP',
      backgroundColor: COLORS.nightDeep,
      backgroundImage: `radial-gradient(ellipse at 50% -10%, #2d2a5e 0%, transparent 60%), linear-gradient(180deg, ${COLORS.night} 0%, ${COLORS.nightDeep} 100%)`,
    },
    [
      ...STARS.map(([x, y, size, color]) =>
        el('div', { position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: size, backgroundColor: color }),
      ),
      el('div', { position: 'absolute', left: 20, top: 20, right: 20, bottom: 20, border: `2px solid ${COLORS.border}`, borderRadius: 32 }),
      el('div', { display: 'flex', position: 'absolute', left: 64, top: 56, right: 56, bottom: 48, alignItems: 'center', gap: 24 }, [
        el('div', { display: 'flex', flexDirection: 'column', width: 600, flexShrink: 0, gap: 14 }, [
          el('div', { display: 'flex', fontSize: 30, fontWeight: 700, color: COLORS.lavender }, '16タイプ星座診断'),
          el('div', { display: 'flex', fontSize: 84, fontWeight: 700, color: COLORS.text, lineHeight: 1.15 }, 'ほしのかたち'),
          el('div', { display: 'flex', flexDirection: 'column', fontSize: 36, fontWeight: 700, color: COLORS.gold, lineHeight: 1.45, marginTop: 8 }, [
            el('div', { display: 'flex' }, 'あなたはどの'),
            el('div', { display: 'flex' }, '「星のいきもの」？'),
          ]),
          el('div', { display: 'flex', fontSize: 26, color: COLORS.muted, marginTop: 8 }, '16タイプ×12星座、192通りの取扱説明書'),
          el('div', { display: 'flex', fontSize: 26, fontWeight: 700, color: COLORS.mint, marginTop: 12 }, CARD_DOMAIN),
        ]),
        el('div', { display: 'flex', flexWrap: 'wrap', width: 456, gap: 16 }, chars.map((c) => img(c, 220))),
      ]),
    ],
  );
}

// ---- 描画 ----

let fonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | undefined;

function loadFonts() {
  // フォントの解析結果は satori が同じ配列について使い回すので、1回だけ読み込む。
  fonts ??= [
    { name: 'Noto Sans JP', data: fs.readFileSync(path.join(FONTS_DIR, 'NotoSansJP-Regular.ttf')), weight: 400, style: 'normal' },
    { name: 'Noto Sans JP', data: fs.readFileSync(path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  ];
  return fonts;
}

export async function renderSvg(tree: OgNode, width: number, height: number): Promise<string> {
  // satori の型は ReactNode を要求するが、同じ形のオブジェクトなら動く。
  return satori(tree as unknown as Parameters<typeof satori>[0], { width, height, fonts: loadFonts() });
}

/**
 * PNGを256色のパレットに減色する（sharp＝libimagequant、ディザーあり）。
 * フルカラーのままだと縦長が1枚約1MB（384枚で約216MB）になるため。見た目の差はほぼ無く、約4分の1になる。
 * 環境変数 OG_FULL_COLOR=1 で減色しない（見比べる用）。
 */
async function quantize(png: Uint8Array): Promise<Uint8Array> {
  if (process.env.OG_FULL_COLOR === '1') return png;
  return new Uint8Array(await sharp(png).png({ palette: true, colours: 256, dither: 1, effort: 7, compressionLevel: 9 }).toBuffer());
}

export async function renderPng(tree: OgNode, width: number, height: number): Promise<Uint8Array> {
  const svg = await renderSvg(tree, width, height);
  return quantize(new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng());
}

export async function renderResultPng(card: ResultCard, format: CardFormat): Promise<Uint8Array> {
  const { width, height } = CARD_SIZE[format];
  return renderPng(buildResultTree(card, format), width, height);
}

export async function renderDefaultPng(): Promise<Uint8Array> {
  return renderPng(buildDefaultTree(), OG_WIDTH, OG_HEIGHT);
}
