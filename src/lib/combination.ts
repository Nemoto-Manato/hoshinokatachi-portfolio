// 16タイプ（星のいきもの）× 星座の組み合わせ（192通り）。

import { SIGNS, type Sign } from './signs';
import { TYPES, type PersonalityType } from './types';

export interface Combination {
  slug: string;
  type: PersonalityType;
  sign: Sign;
  /** 重なり星：タイプの守護星と星座の支配星が同じ天体（D-006） */
  overlap: boolean;
}

export function combinationSlug(typeSlug: string, signId: string): string {
  return `${typeSlug}-${signId}`;
}

export function makeCombination(type: PersonalityType, sign: Sign): Combination {
  return {
    slug: combinationSlug(type.slug, sign.id),
    type,
    sign,
    overlap: type.planet !== undefined && type.planet === sign.ruler,
  };
}

export const COMBINATIONS: Combination[] = TYPES.flatMap((type) => SIGNS.map((sign) => makeCombination(type, sign)));
