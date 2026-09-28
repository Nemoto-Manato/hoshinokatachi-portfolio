// OGP画像の日本語の改行を決める（satori は日本語をどの文字の間でも折り返すため、語の途中や「。」の前で折れたり、
// 最後の行に1〜2文字だけ残ったりする）。ここで行を決めてから、1行ずつ描く。
//   1. Intl.Segmenter で語に分け、ひらがな（助詞・送りがな）や句読点・閉じかっこを前の語に、開きかっこを次の語につなげて「文節」にする
//   2. 文節の間だけで改行し、行数が最少になる中で、いちばん長い行が最も短くなる切り方を選ぶ（行の長さをそろえる）
// 文字の幅は「全角1文字＝1」として数える（textUnits）。Noto Sans JP のかな・漢字は全角なので、日本語ではほぼ正確。

/** 文字の幅（全角＝1、半角英数字・記号＝0.6、空白＝0.3）。× などは安全側に全角で数える。 */
export function textUnits(text: string): number {
  let units = 0;
  for (const ch of text) {
    if (ch === ' ') units += 0.3;
    else if (/[\x21-\x7e]/.test(ch)) units += 0.6;
    else units += 1;
  }
  return units;
}

/** 1行に収まる文字サイズ（max を上限、min を下限）。 */
export function fitFontSize(text: string, width: number, max: number, min: number): number {
  return Math.max(min, Math.min(max, Math.floor(width / textUnits(text))));
}

// 行の先頭に来てはいけない文字（句読点・閉じかっこ・長音・小書きのかななど）
const NO_START = /^[、。，．！？!?）」』】〉》”’…‥ー〜ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ・：；]+$/;
// 行の末尾に来てはいけない文字（開きかっこ）
const NO_END = /^[（「『【〈《“‘]+$/;
const HIRAGANA = /^[ぁ-ゟ]+$/;
// 連体詞（その場、この人…）は、開きかっこと同じく次の語につなげる
const ADNOMINAL = /^(その|この|あの|どの|そんな|こんな|あんな|どんな)$/;
// 読点・句点のあとのひらがな（「もう」など）は新しい文節にする。閉じかっこのあと（「好き」を）はつなげる
const ENDS_WITH_BREAK = /[、。，．！？!?]$/;
const KATAKANA = /^[\u30a0-\u30ffー]+$/;
// 複合動詞（走り出す、切り開く、のめり込む など）は切らない：
//   「漢字＋い段のかな」だけの語のあとに漢字が続くとき、または、い段のかなのあとに「込・出・切…」が続くとき
const VERB_STEM = /^[\u4e00-\u9fff]+[いきぎしじちにひびぴみり]$/;
const ENDS_WITH_I = /[いきぎしじちにひびぴみり]$/;
const KANJI_HEAD = /^[\u4e00-\u9fff]/;
const VERB_AUX_HEAD = /^[込出切上合続始抜返直付]/;

let segmenter: Intl.Segmenter | undefined;

/** 文を文節（改行してよい単位）に分ける。 */
export function splitPhrases(text: string): string[] {
  segmenter ??= new Intl.Segmenter('ja', { granularity: 'word' });
  const phrases: string[] = [];
  let pending = ''; // 開きかっこ・連体詞（次の語の頭につける）
  for (const { segment } of segmenter.segment(text)) {
    const last = phrases.length - 1;
    if (NO_END.test(segment) || ADNOMINAL.test(segment)) {
      pending += segment;
    } else if (last >= 0 && !pending && NO_START.test(segment)) {
      phrases[last] += segment;
    } else if (last >= 0 && !pending && KATAKANA.test(segment) && /[\u30a0-\u30ffー]$/.test(phrases[last])) {
      // ICU がカタカナ語を途中で分けることがある（ゼ|ロ）
      phrases[last] += segment;
    } else if (
      last >= 0 && !pending
      && ((VERB_STEM.test(phrases[last]) && KANJI_HEAD.test(segment)) || (ENDS_WITH_I.test(phrases[last]) && VERB_AUX_HEAD.test(segment)))
    ) {
      phrases[last] += segment;
    } else if (last >= 0 && !pending && HIRAGANA.test(segment) && !ENDS_WITH_BREAK.test(phrases[last])) {
      // 助詞・送りがな・「ている」など。ただし読点や句点のあとのひらがな（「もう」など）は新しい文節にする
      phrases[last] += segment;
    } else {
      phrases.push(pending + segment);
      pending = '';
    }
  }
  if (pending) phrases.push(pending);
  return phrases;
}

/**
 * 文節の間で改行して、maxUnits（全角何文字ぶんか）に収まる行に分ける。
 * 行数を最少にし、その中でいちばん長い行ができるだけ短くなるように切る（最後の行だけが極端に短くならない）。
 * 1つの文節が1行に収まらないときは、その文節を文字の途中で切る。
 */
export function wrapJapanese(text: string, maxUnits: number): string[] {
  // 1行に収まらない文節は、先に文字単位で分けておく
  const phrases = splitPhrases(text).flatMap((p) => (textUnits(p) <= maxUnits ? [p] : [...p]));
  const n = phrases.length;
  const widths = phrases.map(textUnits);
  const lineWidth = (i: number, j: number) => widths.slice(i, j).reduce((a, b) => a + b, 0);

  // best[i] = phrases[i..] を並べるときの [行数, いちばん長い行の幅, 次の改行位置]
  const best: [lines: number, longest: number, next: number][] = new Array(n + 1);
  best[n] = [0, 0, n];
  for (let i = n - 1; i >= 0; i--) {
    let choice: [number, number, number] | undefined;
    for (let j = i + 1; j <= n; j++) {
      const w = lineWidth(i, j);
      if (w > maxUnits && j > i + 1) break;
      const [lines, longest] = best[j];
      const cand: [number, number, number] = [lines + 1, Math.max(w, longest), j];
      if (!choice || cand[0] < choice[0] || (cand[0] === choice[0] && cand[1] < choice[1])) choice = cand;
    }
    best[i] = choice!;
  }

  const lines: string[] = [];
  for (let i = 0; i < n; i = best[i][2]) lines.push(phrases.slice(i, best[i][2]).join(''));
  return lines;
}
