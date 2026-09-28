// 相性カード（シェア画像、D-019c）をビルド時に生成する。いきもの同士の組み合わせ 136 組 × 縦長・横長。
//   - 縦長 1080×1920：/og/aisho/{a}-{b}-story.png（相性ページの「相性カードを保存・シェア」）
//   - 横長 1200×630 ：/og/aisho/{a}-{b}.png
// a・b は 06_キャラクター.json（TYPES）の並び順。載せるもの：2体のキャラ、早見表のラベル（アイコン・名前）と text、サービス名、URL。
// 星座は載せない（192×192 の組み合わせになり、事前に作れないため）。個人情報は載せない。
// 世界観は結果カード（og.ts）と同じ夜空パステル。「pittari」は結果カードの重なり星と同じキラカードにする。

import { themeFromMain } from './characters';
import type { AishoTable } from './aisho';
import { KIRA_LABEL } from './match';
import {
  background, CARD_DOMAIN, CARD_SIZE, characterDataUri, COLORS, el, frame, img, renderPng, serviceName, svgDataUri,
  type CardFormat, type OgNode,
} from './og';
import { fitFontSize, textUnits, wrapJapanese } from './og-text';
import type { ThemeColor, TypeCharacter } from './types';

export interface AishoCardSide {
  name: string;
  theme: ThemeColor;
  character?: string;
}

export interface AishoCard {
  a: AishoCardSide;
  b: AishoCardSide;
  label: { key: string; name: string; icon: string; color: string };
  text: string;
  /** 「pittari」はキラカード */
  kira: boolean;
}

/**
 * 相性カードの中身。早見表にその組が無ければ undefined（画像を作らない）。
 * characterOf には characters.ts の getCharacter を渡す。
 */
export function aishoCardFor(x: string, y: string, table: AishoTable, characterOf: (slug: string) => TypeCharacter): AishoCard | undefined {
  const r = table.get(x, y);
  if (!r) return undefined;
  const side = (slug: string): AishoCardSide => {
    const c = characterOf(slug);
    return { name: c.name, theme: c.theme, character: characterDataUri(slug) };
  };
  return {
    a: side(r.pair.a),
    b: side(r.pair.b),
    label: { key: r.label.key, name: r.label.name, icon: r.label.icon, color: r.label.color },
    text: r.pair.text,
    kira: r.label.key === KIRA_LABEL,
  };
}

// ---- ラベルのアイコン ----
// 早見表のアイコンは絵文字（🌟🧩⚡🌱🪞）。Noto Sans JP に絵文字は無いので、画像では SVG で描き直す。知らない絵文字は丸にする。

const ICON_SVG: Record<string, (c: string) => string> = {
  '🌟': () =>
    `<path d="M32 4l8.2 17.6 19.3 2.3-14.2 13.2 3.8 19.1L32 46.6 14.9 56.2l3.8-19.1L4.5 23.9l19.3-2.3z" fill="#f2d27a" stroke="#fff3c4" stroke-width="2" stroke-linejoin="round"/><circle cx="52" cy="10" r="3" fill="#fff6d6"/><circle cx="10" cy="50" r="2" fill="#fff6d6"/>`,
  '🧩': (c) =>
    `<path d="M10 18h12a6 6 0 1 1 12 0h12v12a6 6 0 1 1 0 12v12H34a6 6 0 1 0-12 0H10V42a6 6 0 1 0 0-12z" fill="${c}" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2" stroke-linejoin="round"/>`,
  '⚡': () => `<path d="M36 4L12 36h16l-4 24 26-34H34z" fill="#ffe27a" stroke="#fff6d6" stroke-width="2" stroke-linejoin="round"/>`,
  '🌱': () =>
    `<path d="M32 58V30" stroke="#7fcf8f" stroke-width="5" stroke-linecap="round"/><path d="M32 32C30 18 20 12 8 14c0 12 10 20 24 18z" fill="#a8e6a0"/><path d="M32 28c2-12 12-18 24-16 0 12-10 18-24 16z" fill="#7fd6a0"/><ellipse cx="32" cy="58" rx="16" ry="4" fill="#c8962e" opacity="0.7"/>`,
  '🪞': (c) =>
    `<ellipse cx="32" cy="28" rx="18" ry="22" fill="${c}"/><ellipse cx="32" cy="28" rx="13" ry="17" fill="#e8f4ff"/><path d="M24 20l8-6M24 28l14-10" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><path d="M32 50v8M22 60h20" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
};

export function labelIconUri(icon: string, color: string): string {
  const draw = ICON_SVG[icon.replace(/️/g, '')];
  const body = draw ? draw(color) : `<circle cx="32" cy="32" r="24" fill="${color}"/><circle cx="32" cy="32" r="10" fill="#ffffff" opacity="0.6"/>`;
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`);
}

// ---- 部品 ----

/** カードの枠の色とキラ。枠・背景はラベルの色から作る */
function style(card: AishoCard) {
  return { overlap: card.kira, theme: themeFromMain(card.label.color) };
}

/** キャラクター（後ろにテーマカラーの光の円） */
function characterWithGlow(side: AishoCardSide, size: number, kira: boolean): OgNode {
  const glow = kira ? COLORS.gold : side.theme.main;
  return el('div', { display: 'flex', position: 'relative', width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }, [
    el('div', {
      position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size,
      backgroundImage: `radial-gradient(circle at 50% 50%, ${glow}66 0%, ${glow}22 45%, transparent 70%)`,
    }),
    ...(side.character ? [img(side.character, size)] : []),
  ]);
}

/** ラベル（アイコン＋名前） */
function labelPill(card: AishoCard, fontSize: number): OgNode {
  const icon = Math.round(fontSize * 1.15);
  return el(
    'div',
    {
      display: 'flex', alignItems: 'center', gap: Math.round(fontSize * 0.3),
      padding: `${Math.round(fontSize * 0.18)}px ${Math.round(fontSize * 0.6)}px ${Math.round(fontSize * 0.18)}px ${Math.round(fontSize * 0.4)}px`,
      borderRadius: 999,
      border: `3px solid ${card.kira ? COLORS.gold : card.label.color}`,
      backgroundColor: card.kira ? `${COLORS.gold}26` : `${card.label.color}2e`,
    },
    [
      img(labelIconUri(card.label.icon, card.label.color), icon),
      el('div', { display: 'flex', fontSize, fontWeight: 700, color: card.kira ? COLORS.gold : COLORS.text, lineHeight: 1.25, whiteSpace: 'nowrap' }, card.label.name),
    ],
  );
}

/** 早見表の text。文節で折る */
function textBox(card: AishoCard, width: number, opts: { size: number; padding: number }): OgNode {
  const inner = width - opts.padding * 2;
  const lines = textUnits(card.text) * opts.size <= inner ? [card.text] : wrapJapanese(card.text, Math.floor(inner / opts.size));
  return el(
    'div',
    {
      display: 'flex', flexDirection: 'column', width, padding: `${Math.round(opts.padding * 0.8)}px ${opts.padding}px`, borderRadius: opts.padding,
      backgroundColor: 'rgba(255, 255, 255, 0.07)', border: `2px solid ${card.kira ? `${COLORS.gold}66` : `${card.label.color}66`}`,
    },
    lines.map((l) => el('div', { display: 'flex', fontSize: opts.size, fontWeight: 700, color: COLORS.text, lineHeight: 1.55, whiteSpace: 'nowrap' }, l)),
  );
}

function nameText(name: string, width: number, max: number, min: number, color: string): OgNode {
  return el('div', { display: 'flex', justifyContent: 'center', width, fontSize: fitFontSize(name, width, max, min), fontWeight: 700, color, lineHeight: 1.3, whiteSpace: 'nowrap' }, name);
}

function times(size: number): OgNode {
  return el('div', { display: 'flex', fontSize: size, fontWeight: 700, color: COLORS.lavender, lineHeight: 1 }, '×');
}

// ---- 縦長（1080×1920） ----

const S = { inset: 28, radius: 56, pad: 44, character: 440 } as const;

export function buildAishoStoryTree(card: AishoCard): OgNode {
  const contentWidth = CARD_SIZE.story.width - (S.inset + S.pad) * 2; // 936
  const colWidth = (contentWidth - 56) / 2; // 440
  const { back, front } = frame(style(card), 'story', S.inset, S.radius);
  const content = el(
    'div',
    {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'absolute',
      left: S.inset + S.pad, top: S.inset + S.pad, right: S.inset + S.pad, bottom: S.inset + S.pad + 12,
    },
    [
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, [
        serviceName(30),
        el('div', { display: 'flex', fontSize: 44, fontWeight: 700, color: COLORS.text, lineHeight: 1.3, marginTop: 24 }, 'いきもの相性カード'),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }, [
        el('div', { display: 'flex', alignItems: 'center', width: contentWidth, justifyContent: 'space-between' }, [
          characterWithGlow(card.a, S.character, card.kira),
          times(64),
          characterWithGlow(card.b, S.character, card.kira),
        ]),
        el('div', { display: 'flex', width: contentWidth, justifyContent: 'space-between' }, [
          nameText(card.a.name, colWidth, 50, 34, card.a.theme.sub),
          nameText(card.b.name, colWidth, 50, 34, card.b.theme.sub),
        ]),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }, [
        el('div', { display: 'flex', fontSize: 34, color: COLORS.muted, lineHeight: 1.3 }, '2体の関係は…'),
        labelPill(card, 84),
      ]),
      textBox(card, contentWidth, { size: 44, padding: 40 }),
      el('div', { display: 'flex', width: contentWidth, justifyContent: 'space-between', alignItems: 'flex-end' }, [
        el('div', { display: 'flex', flexDirection: 'column' }, [
          el('div', { display: 'flex', fontSize: 34, fontWeight: 700, color: COLORS.gold, lineHeight: 1.4 }, 'あなたと友達の相性は？'),
          el('div', { display: 'flex', fontSize: 26, color: COLORS.muted, lineHeight: 1.4 }, '星座もふくめた相性は、サイトで'),
        ]),
        el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }, [
          el('div', { display: 'flex', fontSize: 24, color: COLORS.muted, lineHeight: 1.4 }, '3分で診断'),
          el('div', { display: 'flex', fontSize: 34, fontWeight: 700, color: COLORS.mint, lineHeight: 1.3 }, CARD_DOMAIN),
        ]),
      ]),
    ],
  );
  return background(style(card), CARD_SIZE.story.width, CARD_SIZE.story.height, [...back, content, ...front]);
}

// ---- 横長（1200×630） ----

const L = { inset: 20, radius: 32, padLeft: 28, padTop: 30, padRight: 44, padBottom: 28, character: 260, gap: 20 } as const;

export function buildAishoLandscapeTree(card: AishoCard): OgNode {
  const contentWidth = CARD_SIZE.landscape.width - L.inset * 2 - L.padLeft - L.padRight; // 1088
  const charsWidth = L.character * 2 - 20; // 2体を少し重ねる
  const textWidth = contentWidth - charsWidth - L.gap;
  const { back, front } = frame(style(card), 'landscape', L.inset, L.radius);

  const chars = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: charsWidth, flexShrink: 0 }, [
    el('div', { display: 'flex', alignItems: 'center', position: 'relative', width: charsWidth }, [
      characterWithGlow(card.a, L.character, card.kira),
      el('div', { display: 'flex', marginLeft: -20 }, [characterWithGlow(card.b, L.character, card.kira)]),
      el('div', { display: 'flex', position: 'absolute', left: charsWidth / 2 - 20, top: L.character / 2 - 26 }, [times(52)]),
    ]),
    el('div', { display: 'flex', width: charsWidth, justifyContent: 'space-between' }, [
      nameText(card.a.name, L.character - 24, 26, 18, card.a.theme.sub),
      nameText(card.b.name, L.character - 24, 26, 18, card.b.theme.sub),
    ]),
  ]);

  const column = el('div', { display: 'flex', flexDirection: 'column', width: textWidth, flexShrink: 0, height: '100%', justifyContent: 'space-between' }, [
    el('div', { display: 'flex', flexDirection: 'column', gap: 6 }, [
      serviceName(20),
      el('div', { display: 'flex', fontSize: 26, fontWeight: 700, color: COLORS.muted, lineHeight: 1.3 }, 'いきもの相性カード'),
    ]),
    el('div', { display: 'flex' }, [labelPill(card, 56)]),
    textBox(card, textWidth, { size: 26, padding: 22 }),
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, [
      el('div', { display: 'flex', fontSize: 22, fontWeight: 700, color: COLORS.gold, lineHeight: 1.3 }, 'あなたと友達の相性は？'),
      el('div', { display: 'flex', fontSize: 22, fontWeight: 700, color: COLORS.mint, lineHeight: 1.3 }, CARD_DOMAIN),
    ]),
  ]);

  const content = el(
    'div',
    {
      display: 'flex', position: 'absolute', alignItems: 'center', gap: L.gap,
      left: L.inset + L.padLeft, top: L.inset + L.padTop, right: L.inset + L.padRight, bottom: L.inset + L.padBottom,
    },
    [chars, column],
  );
  return background(style(card), CARD_SIZE.landscape.width, CARD_SIZE.landscape.height, [...back, content, ...front]);
}

export function buildAishoTree(card: AishoCard, format: CardFormat): OgNode {
  return format === 'story' ? buildAishoStoryTree(card) : buildAishoLandscapeTree(card);
}

export async function renderAishoPng(card: AishoCard, format: CardFormat): Promise<Uint8Array> {
  const { width, height } = CARD_SIZE[format];
  return renderPng(buildAishoTree(card, format), width, height);
}

// ---- 相性診断の共通のOGP画像（招待ページ・相性ページ。/og/aisho/default.png） ----

export function buildAishoDefaultTree(left?: string, right?: string): OgNode {
  const theme = themeFromMain('#c9b8ff');
  const { back } = frame({ overlap: false, theme }, 'landscape', 20, 32);
  const side = (character?: string): AishoCardSide => ({ name: '', theme, character });
  return background({ theme }, CARD_SIZE.landscape.width, CARD_SIZE.landscape.height, [
    ...back,
    el('div', { display: 'flex', position: 'absolute', left: 60, top: 50, right: 56, bottom: 46, alignItems: 'center', gap: 24 }, [
      el('div', { display: 'flex', flexDirection: 'column', width: 560, flexShrink: 0, gap: 12 }, [
        serviceName(24),
        el('div', { display: 'flex', fontSize: 80, fontWeight: 700, color: COLORS.text, lineHeight: 1.15, marginTop: 8 }, '相性診断'),
        el('div', { display: 'flex', flexDirection: 'column', fontSize: 36, fontWeight: 700, color: COLORS.gold, lineHeight: 1.45 }, [
          el('div', { display: 'flex' }, 'あなたと友達は'),
          el('div', { display: 'flex' }, 'どんな2体？'),
        ]),
        el('div', { display: 'flex', fontSize: 24, color: COLORS.muted, marginTop: 4 }, '20問に答えて、2人の相性を見てみよう'),
        el('div', { display: 'flex', fontSize: 26, fontWeight: 700, color: COLORS.mint, marginTop: 8 }, CARD_DOMAIN),
      ]),
      el('div', { display: 'flex', alignItems: 'center', position: 'relative', width: 500 }, [
        characterWithGlow(side(left), 260, false),
        el('div', { display: 'flex', marginLeft: -20 }, [characterWithGlow(side(right), 260, false)]),
        el('div', { display: 'flex', position: 'absolute', left: 230, top: 104 }, [times(52)]),
      ]),
    ]),
  ]);
}

export async function renderAishoDefaultPng(): Promise<Uint8Array> {
  return renderPng(buildAishoDefaultTree(characterDataUri('comet'), characterDataUri('moon')), CARD_SIZE.landscape.width, CARD_SIZE.landscape.height);
}
