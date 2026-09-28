// ビルド時に使う文言の入口。組み合わせ文言を1回だけ読み込み、警告をビルドログに出す。
import { loadCombinationTexts, type CombinationText } from './combination-texts';
import { getCharacter, resultTitle } from './characters';
import { COMBINATIONS_DIR } from './paths';

let cache: Map<string, CombinationText> | undefined;

function texts(): Map<string, CombinationText> {
  if (!cache) {
    const result = loadCombinationTexts(COMBINATIONS_DIR, (type, sign) => resultTitle(getCharacter(type.slug), sign.name));
    for (const w of result.warnings) console.warn(`[combinations] ${w}`);
    console.info(`[combinations] ${result.texts.size}/192 件の文言を読み込みました（${COMBINATIONS_DIR}）`);
    cache = result.texts;
  }
  return cache;
}

/** 組み合わせの文言。まだ無ければ undefined（ページには「制作中」と表示する）。 */
export function getCombinationText(slug: string): CombinationText | undefined {
  return texts().get(slug);
}
