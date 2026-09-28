// 相性診断（D-019c）の、ブラウザでも使う部分（ファイルを読まない。診断・/select・/aisho/ のスクリプトから import する）。
//
// 流れ：
//   1. 結果ページの「友達との相性を見る」→ 招待リンク /aisho/invite/?from={自分の結果} をシェアする
//   2. 友達が招待リンクを開く →「診断して相性を見る」（/shindan/?with=…）か「タイプを知っている」（/select/?with=…）
//   3. 友達が送信すると、自分の結果ページではなく /aisho/match/?a={招待した人}&b={友達} に進む
// URL に入れるのは結果の slug（sun-leo など）だけ。生年月日などの個人情報は入れない（法務判断書 #4）。
// クエリはだれでも書き換えられるので、読むときは必ず parseResultSlug で確かめ、不正なものは無視する。

import { SIGNS } from './signs';
import { TYPES } from './types';

/** 結果（いきもの×星座）の参照。slug は combinationSlug と同じ「{typeSlug}-{signId}」 */
export interface ResultRef {
  slug: string;
  typeSlug: string;
  signId: string;
}

export const INVITE_PATH = '/aisho/invite/';
export const MATCH_PATH = '/aisho/match/';

const TYPE_ORDER = new Map(TYPES.map((t, i) => [t.slug, i]));
const SIGN_ORDER = new Map<string, number>(SIGNS.map((s, i) => [s.id, i]));

/**
 * 結果の slug を確かめて分解する。いきもの・星座のどちらかが実在しなければ undefined。
 * いきものの slug にはハイフンが入る（milky-way など）ので、星座（ハイフンなし）を後ろから切り出す。
 */
export function parseResultSlug(value: unknown): ResultRef | undefined {
  if (typeof value !== 'string' || value.length > 40 || !/^[a-z]+(?:-[a-z]+)+$/.test(value)) return undefined;
  const cut = value.lastIndexOf('-');
  const typeSlug = value.slice(0, cut);
  const signId = value.slice(cut + 1);
  if (!TYPE_ORDER.has(typeSlug) || !SIGN_ORDER.has(signId)) return undefined;
  return { slug: value, typeSlug, signId };
}

function params(search: string | URLSearchParams): URLSearchParams {
  return typeof search === 'string' ? new URLSearchParams(search) : search;
}

/** 招待リンクのパス：/aisho/invite/?from=sun-leo */
export function invitePath(from: string): string {
  return `${INVITE_PATH}?from=${encodeURIComponent(from)}`;
}

/** 招待リンク（絶対URL）。origin はサイトのURL（https://16type-seiza.com）かブラウザの location.origin */
export function inviteUrl(from: string, origin: string | URL): string {
  return new URL(invitePath(from), origin).href;
}

/** 相性ページのパス。a は招待した人、b は招待された人（いま診断した人） */
export function matchPath(a: string, b: string): string {
  return `${MATCH_PATH}?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
}

/** 招待された人が診断するページ（/shindan/?with=sun-leo）。with が無ければふつうの診断 */
export function shindanPath(withSlug?: string): string {
  return withSlug ? `/shindan/?with=${encodeURIComponent(withSlug)}` : '/shindan/';
}
export function selectPath(withSlug?: string): string {
  return withSlug ? `/select/?with=${encodeURIComponent(withSlug)}` : '/select/';
}

/** ?from=…（招待ページ） */
export function readFrom(search: string | URLSearchParams): ResultRef | undefined {
  return parseResultSlug(params(search).get('from'));
}

/** ?with=…（診断・/select） */
export function readWith(search: string | URLSearchParams): ResultRef | undefined {
  return parseResultSlug(params(search).get('with'));
}

/** ?a=…&b=…（相性ページ）。不正なほうは undefined */
export function readMatchQuery(search: string | URLSearchParams): { a?: ResultRef; b?: ResultRef } {
  const p = params(search);
  return { a: parseResultSlug(p.get('a')), b: parseResultSlug(p.get('b')) };
}

/** 診断・/select の送信先。招待されていれば相性ページ、そうでなければ自分の結果ページ */
export function destinationAfterDiagnosis(mySlug: string, withRef?: ResultRef): string {
  return withRef ? matchPath(withRef.slug, mySlug) : `/result/${mySlug}/`;
}

/** 2体のいきものを TYPES（06_キャラクター.json）の並び順にする（相性カードの画像名・早見表のキーに使う） */
export function orderTypes(x: string, y: string): [string, string] {
  return (TYPE_ORDER.get(x) ?? 0) <= (TYPE_ORDER.get(y) ?? 0) ? [x, y] : [y, x];
}
/** 2つの星座を SIGNS（おひつじ座から）の並び順にする */
export function orderSigns(x: string, y: string): [string, string] {
  return (SIGN_ORDER.get(x) ?? 0) <= (SIGN_ORDER.get(y) ?? 0) ? [x, y] : [y, x];
}

/** いきもの同士のキー（並び順で先のほうを前に）。aisho.ts の pairKey と同じ */
export function typePairKey(x: string, y: string): string {
  return orderTypes(x, y).join('|');
}
export function signPairKey(x: string, y: string): string {
  return orderSigns(x, y).join('|');
}

/** 相性カードの画像名（並び順で先のいきもの-後のいきもの。例：polaris-sun） */
export function aishoCardSlug(x: string, y: string): string {
  return orderTypes(x, y).join('-');
}
/** 相性カード：横長 1200×630 /og/aisho/{a}-{b}.png、縦長 1080×1920 /og/aisho/{a}-{b}-story.png */
export function aishoCardImage(x: string, y: string, format: 'landscape' | 'story'): string {
  return `/og/aisho/${aishoCardSlug(x, y)}${format === 'story' ? '-story' : ''}.png`;
}

/** すべてのいきものの組み合わせ（同じいきもの同士を含む 136 組。並び順で先のほうが a） */
export function allTypePairs(): [string, string][] {
  return TYPES.flatMap((t, i) => TYPES.slice(i).map((u): [string, string] => [t.slug, u.slug]));
}

// ---- 相性ページに埋め込むデータ（ビルド時に match-data.ts が作る） ----

export interface MatchLabel {
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface MatchAdvice {
  friend?: string;
  love?: string;
  work?: string;
}

export interface MatchData {
  /** slug → キャラ名・テーマカラー */
  types: Record<string, { name: string; main: string; sub: string }>;
  /** 星座 id → 星座名 */
  signs: Record<string, string>;
  /** 11_相性早見表.json のラベル */
  labels: Record<string, MatchLabel>;
  /** typePairKey → 早見表のラベルと text */
  pairs: Record<string, { label: string; text: string }>;
  /** signPairKey → 13_相性診断.json の星座同士の関係 */
  signPairs: Record<string, { relation?: string; title?: string; text: string }>;
  /** 星座同士の関係の種類（13_相性診断.json の relations） */
  relations: Record<string, { name: string; description?: string }>;
  /** ラベル → 2人へのアドバイス（13_相性診断.json の advice） */
  advice: Record<string, MatchAdvice>;
  /**
   * 13_相性診断.json の intro。invite：招待リンクをシェアするときの誘いの言葉（送る人の言葉）、
   * waiting：招待ページで、招かれた友達に見せる説明
   */
  intro: { invite?: string; waiting?: string };
}

export interface MatchPerson {
  ref: ResultRef;
  name: string;
  signName: string;
  /** 「しし座の いきもの3」 */
  title: string;
  main: string;
  sub: string;
}

export interface MatchView {
  a: MatchPerson;
  b: MatchPerson;
  /** いきもの同士（早見表）。無ければ undefined */
  animal?: { key: string; label: MatchLabel; text: string };
  /** 星座同士（13_相性診断.json）。無ければ undefined */
  sign?: { relation?: { name: string; description?: string }; title?: string; text: string };
  /** 2人へのアドバイス（ラベルに対応するもの）。無ければ undefined */
  advice?: MatchAdvice;
  /** 相性カード。「pittari」はキラカード */
  card: { story: string; landscape: string; kira: boolean };
}

/** キラカードにするラベル */
export const KIRA_LABEL = 'pittari';

function person(data: MatchData, ref: ResultRef): MatchPerson {
  const t = data.types[ref.typeSlug];
  const signName = data.signs[ref.signId] ?? ref.signId;
  const name = t?.name ?? ref.typeSlug;
  return { ref, name, signName, title: `${signName}の ${name}`, main: t?.main ?? '#c9b8ff', sub: t?.sub ?? '#f1efff' };
}

/** 2人の相性の中身を組み立てる（データが欠けている部分は undefined にして、ページでは出さない） */
export function buildMatchView(data: MatchData, a: ResultRef, b: ResultRef): MatchView {
  const pair = data.pairs[typePairKey(a.typeSlug, b.typeSlug)];
  const label = pair && data.labels[pair.label];
  const sp = data.signPairs[signPairKey(a.signId, b.signId)];
  const advice = pair && data.advice[pair.label];
  const hasAdvice = advice && (advice.friend || advice.love || advice.work);
  return {
    a: person(data, a),
    b: person(data, b),
    animal: pair && label ? { key: pair.label, label, text: pair.text } : undefined,
    sign: sp ? { relation: sp.relation ? data.relations[sp.relation] : undefined, title: sp.title, text: sp.text } : undefined,
    advice: hasAdvice ? advice : undefined,
    card: {
      story: aishoCardImage(a.typeSlug, b.typeSlug, 'story'),
      landscape: aishoCardImage(a.typeSlug, b.typeSlug, 'landscape'),
      kira: pair?.label === KIRA_LABEL,
    },
  };
}

/** 招待リンクをシェアするときの誘いの言葉（13_相性診断.json の intro.invite が無いとき） */
export const DEFAULT_INVITE_MESSAGE = 'あなたはどの星のいきもの？ 20問に答えて、2人の相性を見てみよう';

/** 招待リンクをシェアするときの文面。message は 13_相性診断.json の intro.invite（送る人の言葉） */
export function inviteText(myTitle: string, message: string = DEFAULT_INVITE_MESSAGE): string {
  return `私は『${myTitle}』でした。${message} #ほしのかたち`;
}

/** 相性をシェアするときの文面 */
export function matchShareText(view: Pick<MatchView, 'a' | 'b' | 'animal'>): string {
  const rel = view.animal ? `は「${view.animal.label.name}」` : '';
  return `${view.a.title} × ${view.b.title} の相性${rel}でした！ #ほしのかたち #ほしのかたち相性`;
}

/** Xのポスト画面のURL */
export function xIntentUrl(text: string, url: string): string {
  const intent = new URL('https://x.com/intent/post');
  intent.searchParams.set('text', text);
  intent.searchParams.set('url', url);
  return intent.href;
}

/** JSON を <script type="application/json"> に安全に埋め込む（</script> で閉じられないように < をエスケープ） */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
