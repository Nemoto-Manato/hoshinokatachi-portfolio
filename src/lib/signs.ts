// 12星座のマスターデータ。文言の原本は 02_content/04_星座データ_draft.md。

import type { Planet } from './types';

export type SignId =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export interface Sign {
  id: SignId;
  name: string;
  period: string;
  element: '火' | '地' | '風' | '水';
  modality: '活動' | '不動' | '柔軟';
  ruler: Planet;
  rulerName: string;
  keywords: string[];
}

export const SIGNS: Sign[] = [
  { id: 'aries', name: 'おひつじ座', period: '3/21〜4/19', element: '火', modality: '活動', ruler: 'mars', rulerName: '火星', keywords: ['始まり', '勇気', 'まっすぐ'] },
  { id: 'taurus', name: 'おうし座', period: '4/20〜5/20', element: '地', modality: '不動', ruler: 'venus', rulerName: '金星', keywords: ['安定', '五感', 'マイペース'] },
  { id: 'gemini', name: 'ふたご座', period: '5/21〜6/21', element: '風', modality: '柔軟', ruler: 'mercury', rulerName: '水星', keywords: ['好奇心', '会話', '軽やかさ'] },
  { id: 'cancer', name: 'かに座', period: '6/22〜7/22', element: '水', modality: '活動', ruler: 'moon', rulerName: '月', keywords: ['共感', '身内', '守る'] },
  { id: 'leo', name: 'しし座', period: '7/23〜8/22', element: '火', modality: '不動', ruler: 'sun', rulerName: '太陽', keywords: ['自己表現', '華やかさ', '誇り'] },
  { id: 'virgo', name: 'おとめ座', period: '8/23〜9/22', element: '地', modality: '柔軟', ruler: 'mercury', rulerName: '水星', keywords: ['分析', '丁寧さ', '役に立つこと'] },
  { id: 'libra', name: 'てんびん座', period: '9/23〜10/23', element: '風', modality: '活動', ruler: 'venus', rulerName: '金星', keywords: ['バランス', '美意識', '人とのつながり'] },
  { id: 'scorpio', name: 'さそり座', period: '10/24〜11/22', element: '水', modality: '不動', ruler: 'pluto', rulerName: '冥王星', keywords: ['深さ', '集中', '一途'] },
  { id: 'sagittarius', name: 'いて座', period: '11/23〜12/21', element: '火', modality: '柔軟', ruler: 'jupiter', rulerName: '木星', keywords: ['自由', '冒険', '探究'] },
  { id: 'capricorn', name: 'やぎ座', period: '12/22〜1/19', element: '地', modality: '活動', ruler: 'saturn', rulerName: '土星', keywords: ['目標', '責任', '積み重ね'] },
  { id: 'aquarius', name: 'みずがめ座', period: '1/20〜2/18', element: '風', modality: '不動', ruler: 'uranus', rulerName: '天王星', keywords: ['独創性', '仲間', '未来'] },
  { id: 'pisces', name: 'うお座', period: '2/19〜3/20', element: '水', modality: '柔軟', ruler: 'neptune', rulerName: '海王星', keywords: ['想像力', 'やさしさ', '感受性'] },
];

export function getSign(id: string): Sign | undefined {
  return SIGNS.find((s) => s.id === id);
}
